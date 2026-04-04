// ============================================================
// CrisisAlpha — Simulation Service (v2)
// Full lifecycle orchestrator: Create → Initialize → Run → Complete
// ============================================================

import { v4 as uuid } from 'uuid';
import type { Server } from 'socket.io';
import type { GraphState } from '../models/graph';
import type {
  SimulationConfig, SimulationSession, Decision,
  TickPayload, Recommendation, ScoreSnapshot,
} from '../models/simulation';
import type { SimulationEvent } from '../models/event';
import { loadGraph, cloneGraphState, serializeNodes, serializeEdges, serializeChokepoints } from './graphService';
import { createOverlay, deleteOverlay, getMergedGraph, writeBackToOverlay } from './shadowGraphService';
import { appendEvent, createSyntheticEvent } from './eventStoreService';
import { propagateTick, applyDecision } from './propagationEngine';
import { detectEvents, clearTracker } from './eventService';
import { generateRecommendations } from './recommendationService';
import { calculateScore } from './scoreService';
import { generateImpactReport } from './inferenceService';
import { getProfile } from './userContextService';
import * as fs from 'fs';
import * as path from 'path';

// ── Session Store ───────────────────────────────────────────

const sessions = new Map<string, SimulationSession>();
const sessionIntervals = new Map<string, NodeJS.Timeout>();
const sessionGraphs = new Map<string, GraphState>(); // merged working graph per session

// Industry weights cache
let industriesData: Record<string, any> | null = null;
function getIndustryWeights(industry: string): Record<string, number> {
  if (!industriesData) {
    const filePath = path.join(__dirname, '..', 'data', 'industries.json');
    industriesData = JSON.parse(fs.readFileSync(filePath, 'utf-8')).industries;
  }
  return industriesData![industry] || {};
}

// ── Create Simulation ───────────────────────────────────────

export function createSimulation(config: Partial<SimulationConfig>, userId: string = 'anonymous'): SimulationSession {
  const id = `sim_${uuid().slice(0, 8)}`;

  const fullConfig: SimulationConfig = {
    id,
    userId,
    createdAt: new Date().toISOString(),
    hypothesis: config.hypothesis || {
      title: `Crisis at ${config.originNodeId || 'unknown'}`,
      description: config.hypothesis?.description || 'Simulated crisis scenario',
      category: 'conflict',
      affectedHubIds: [config.originNodeId || ''],
      affectedCountries: [],
      affectedChokepoints: [],
      initialMutations: [],
    },
    axioms: config.axioms || [],
    originNodeId: config.originNodeId || 'suez',
    industry: config.industry || 'consumer_goods',
    conflictIntensity: config.conflictIntensity ?? 0.5,
    fuelShortage: config.fuelShortage ?? 0.3,
    policyRestriction: config.policyRestriction ?? 0.3,
    durationDays: config.durationDays || 14,
    tickIntervalHours: config.tickIntervalHours || 24,
    forkTimestamp: config.forkTimestamp || new Date().toISOString(),
  };

  const ticksPerDay = 24 / fullConfig.tickIntervalHours;
  const maxTicks = Math.round(fullConfig.durationDays * ticksPerDay);

  const session: SimulationSession = {
    id,
    config: fullConfig,
    currentTick: 0,
    maxTicks,
    status: 'created',
    createdAt: Date.now(),
    decisions: [],
  };

  sessions.set(id, session);

  // Create shadow graph overlay
  createOverlay(id);

  console.log(`[Sim] ✅ Simulation ${id} created: "${fullConfig.hypothesis.title}" (${maxTicks} ticks)`);
  return session;
}

// ── Start Simulation ────────────────────────────────────────

export function startSimulation(simulationId: string, io: Server): boolean {
  const session = sessions.get(simulationId);
  if (!session || session.status === 'running') return false;

  session.status = 'running';

  // Initialize working graph (clone base + apply overlay)
  const baseGraph = loadGraph();
  const workingGraph = getMergedGraph(simulationId, baseGraph);
  sessionGraphs.set(simulationId, workingGraph);

  console.log(`[Sim] ▶️  Simulation ${simulationId} started`);

  const interval = setInterval(async () => {
    const s = sessions.get(simulationId);
    if (!s || s.status !== 'running') {
      clearInterval(interval);
      sessionIntervals.delete(simulationId);
      return;
    }

    const graph = sessionGraphs.get(simulationId);
    if (!graph) return;

    // Run tick
    const tickPayload = await executeTick(s, graph, io);

    // Emit via WebSocket
    io.to(simulationId).emit('sim:tick', tickPayload);

    // Emit events individually
    for (const event of tickPayload.events) {
      io.to(simulationId).emit('sim:event', event);
    }

    // Emit recommendations
    for (const rec of tickPayload.recommendations) {
      io.to(simulationId).emit('sim:recommendation', rec);
    }

    // Generate AI impact report every 5 ticks
    if (s.currentTick % 5 === 0 && s.config.userId !== 'anonymous') {
      const report = await generateImpactReport(
        s.config.userId,
        simulationId,
        s.config,
        graph
      );
      if (report) {
        io.to(simulationId).emit('sim:impact', report);
      }
    }

    // Check completion
    if (s.currentTick >= s.maxTicks) {
      s.status = 'completed';
      clearInterval(interval);
      sessionIntervals.delete(simulationId);

      io.to(simulationId).emit('sim:complete', {
        simulationId,
        finalScore: tickPayload.score,
        totalTicks: s.currentTick,
        decisionsApplied: s.decisions.length,
      });

      console.log(`[Sim] ✅ Simulation ${simulationId} completed`);
    }
  }, 1500); // 1.5 second tick interval

  sessionIntervals.set(simulationId, interval);
  return true;
}

// ── Execute Single Tick ─────────────────────────────────────

async function executeTick(session: SimulationSession, graph: GraphState, io: Server): Promise<TickPayload> {
  const config = session.config;
  const industryWeights = getIndustryWeights(config.industry);

  // 1. Propagate risk
  try {
    const response = await fetch('http://localhost:8000/predict/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (response.ok) {
      const data = await response.json();
      console.log(`[Sim] 🧠 Python Prediction Engine responded for tick ${session.currentTick}:`, data.message);
      // Fallback local propagation until nodes/edges are actually mapped from Python
      propagateTick(graph, config, session.currentTick, industryWeights);
    } else {
      propagateTick(graph, config, session.currentTick, industryWeights);
    }
  } catch (err) {
    // Prediction engine not available, use deterministic local engine
    propagateTick(graph, config, session.currentTick, industryWeights);
  }

  // 2. Detect events
  const events = detectEvents(graph, session.id, session.currentTick);

  // 3. Log simulation events to event store
  for (const event of events) {
    createSyntheticEvent(
      session.id,
      event.title,
      event.message,
      event.category || 'infrastructure',
      event.severity,
      event.relatedNodeIds || [],
      [],
      event.relatedChokepointIds || [],
      []
    );
  }

  // 4. Generate recommendations
  const recommendations = generateRecommendations(graph, config, session.currentTick);

  // 5. Calculate score
  const score = calculateScore(graph, config, session.decisions, session.currentTick);

  // 6. Write back changes to shadow overlay
  const baseGraph = loadGraph();
  writeBackToOverlay(session.id, graph, baseGraph);

  // 7. Build tick payload
  const dayNumber = Math.floor(session.currentTick * (config.tickIntervalHours / 24)) + 1;
  const payload: TickPayload = {
    simulationId: session.id,
    tick: session.currentTick,
    dayLabel: `Day ${dayNumber}`,
    nodes: serializeNodes(graph) as any,
    edges: serializeEdges(graph) as any,
    chokepoints: serializeChokepoints(graph) as any,
    events,
    recommendations,
    score,
    isComplete: session.currentTick >= session.maxTicks,
  };

  session.currentTick++;
  return payload;
}

// ── Apply Decision ──────────────────────────────────────────

export function applyUserDecision(
  simulationId: string,
  decisionType: string,
  recommendationId: string,
  relatedNodeIds: string[] = [],
  relatedEdgeIds: string[] = []
): Decision | null {
  const session = sessions.get(simulationId);
  if (!session || session.status !== 'running') return null;

  const graph = sessionGraphs.get(simulationId);
  if (!graph) return null;

  const decision: Decision = {
    id: `dec_${uuid().slice(0, 8)}`,
    tick: session.currentTick,
    type: decisionType as any,
    recommendationId,
    appliedAt: Date.now(),
  };

  session.decisions.push(decision);

  // Apply decision to working graph
  applyDecision(graph, decisionType, relatedNodeIds, relatedEdgeIds);

  console.log(`[Sim] 🎯 Decision applied: ${decisionType} on ${simulationId}`);
  return decision;
}

// ── Pause / Resume / Reset ──────────────────────────────────

export function pauseSimulation(simulationId: string): boolean {
  const session = sessions.get(simulationId);
  if (!session || session.status !== 'running') return false;

  session.status = 'paused';
  const interval = sessionIntervals.get(simulationId);
  if (interval) {
    clearInterval(interval);
    sessionIntervals.delete(simulationId);
  }
  console.log(`[Sim] ⏸️  Simulation ${simulationId} paused`);
  return true;
}

export function resumeSimulation(simulationId: string, io: Server): boolean {
  const session = sessions.get(simulationId);
  if (!session || session.status !== 'paused') return false;

  return startSimulation(simulationId, io);
}

export function resetSimulation(simulationId: string): boolean {
  const session = sessions.get(simulationId);
  if (!session) return false;

  // Clear interval
  const interval = sessionIntervals.get(simulationId);
  if (interval) {
    clearInterval(interval);
    sessionIntervals.delete(simulationId);
  }

  // Reset state
  session.currentTick = 0;
  session.status = 'created';
  session.decisions = [];

  // Reset shadow graph
  deleteOverlay(simulationId);
  createOverlay(simulationId);

  // Reset working graph
  sessionGraphs.delete(simulationId);

  // Clear event tracker
  clearTracker(simulationId);

  console.log(`[Sim] 🔄 Simulation ${simulationId} reset`);
  return true;
}

// ── Query ───────────────────────────────────────────────────

export function getSession(simulationId: string): SimulationSession | null {
  return sessions.get(simulationId) || null;
}

export function getSessionGraph(simulationId: string): GraphState | null {
  return sessionGraphs.get(simulationId) || null;
}

export function getAllSessions(): SimulationSession[] {
  return Array.from(sessions.values());
}

export function deleteSimulation(simulationId: string): boolean {
  pauseSimulation(simulationId);
  deleteOverlay(simulationId);
  sessionGraphs.delete(simulationId);
  clearTracker(simulationId);
  return sessions.delete(simulationId);
}
