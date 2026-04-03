// ============================================================
// CrisisAlpha — Simulation Service
// Orchestrates the tick loop, streams state to clients
// ============================================================

import { Server as SocketServer, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { GraphState } from '../models/graph';
import { ScenarioConfig, ScenarioSession, TickPayload, Decision, Recommendation } from '../models/scenario';
import { SimulationEvent } from '../models/event';
import { loadGraph, cloneGraphState, serializeNodes, serializeEdges } from './graphService';
import { applyInitialShock, propagateTick, applyDecisionEffect } from './propagationEngine';
import { detectEvents, initEventTracker, clearEventTracker } from './eventService';
import { generateRecommendations } from './recommendationService';
import { computeScore, getFinalLabel } from './scoreService';

// In-memory store for active sessions
const sessions = new Map<string, {
  session: ScenarioSession;
  graph: GraphState;
  baseGraph: GraphState;
  tickInterval: ReturnType<typeof setInterval> | null;
  allEvents: SimulationEvent[];
  allRecommendations: Recommendation[];
}>();

export function createScenario(config: ScenarioConfig): ScenarioSession {
  const baseGraph = loadGraph();
  const graph = cloneGraphState(baseGraph);

  const session: ScenarioSession = {
    id: `scn_${uuid().slice(0, 8)}`,
    config,
    currentTick: 0,
    maxTicks: config.durationDays,
    status: 'created',
    createdAt: Date.now(),
    decisions: [],
  };

  // Apply initial shock
  applyInitialShock(graph, config);
  initEventTracker(session.id);

  sessions.set(session.id, {
    session,
    graph,
    baseGraph,
    tickInterval: null,
    allEvents: [],
    allRecommendations: [],
  });

  return session;
}

export function startSimulation(scenarioId: string, io: SocketServer): boolean {
  const data = sessions.get(scenarioId);
  if (!data) return false;

  data.session.status = 'running';

  // Run tick loop with interval
  const TICK_INTERVAL_MS = 1500; // 1.5 sec per tick for smooth visual updates

  data.tickInterval = setInterval(() => {
    if (data.session.status !== 'running') return;

    data.session.currentTick++;
    const tick = data.session.currentTick;

    // 1. Propagate risk
    propagateTick(data.graph, data.session.config, tick);

    // 2. Detect events
    const events = detectEvents(data.graph, data.session.config, tick, scenarioId);
    data.allEvents.push(...events);

    // 3. Generate recommendations
    const recommendations = generateRecommendations(data.graph, data.session.config, tick);
    data.allRecommendations = recommendations;

    // 4. Compute score
    const score = computeScore(data.graph, data.session.config, data.session.decisions, tick, data.session.maxTicks);

    // 5. Check completion
    const isComplete = tick >= data.session.maxTicks;

    // 6. Build tick payload
    const payload: TickPayload = {
      scenarioId,
      tick,
      dayLabel: `Day ${tick}`,
      nodes: serializeNodes(data.graph) as any,
      edges: serializeEdges(data.graph) as any,
      events,
      recommendations,
      score,
      isComplete,
    };

    // 7. Stream to clients
    io.to(scenarioId).emit('tick', payload);

    // 8. End simulation if complete
    if (isComplete) {
      data.session.status = 'completed';
      if (data.tickInterval) {
        clearInterval(data.tickInterval);
        data.tickInterval = null;
      }
      const finalLabel = getFinalLabel(score, data.session.config);
      io.to(scenarioId).emit('simulation_complete', {
        scenarioId,
        finalScore: score,
        label: finalLabel,
        totalEvents: data.allEvents.length,
        totalDecisions: data.session.decisions.length,
      });
    }
  }, TICK_INTERVAL_MS);

  return true;
}

export function pauseSimulation(scenarioId: string): boolean {
  const data = sessions.get(scenarioId);
  if (!data) return false;
  data.session.status = 'paused';
  return true;
}

export function resumeSimulation(scenarioId: string): boolean {
  const data = sessions.get(scenarioId);
  if (!data) return false;
  data.session.status = 'running';
  return true;
}

export function resetSimulation(scenarioId: string): boolean {
  const data = sessions.get(scenarioId);
  if (!data) return false;

  if (data.tickInterval) {
    clearInterval(data.tickInterval);
    data.tickInterval = null;
  }

  // Reset graph to base state + initial shock
  data.graph = cloneGraphState(data.baseGraph);
  applyInitialShock(data.graph, data.session.config);
  clearEventTracker(scenarioId);
  initEventTracker(scenarioId);

  data.session.currentTick = 0;
  data.session.status = 'created';
  data.session.decisions = [];
  data.allEvents = [];
  data.allRecommendations = [];

  return true;
}

export function applyDecision(
  scenarioId: string,
  recommendationId: string
): boolean {
  const data = sessions.get(scenarioId);
  if (!data) return false;

  // Find the recommendation
  const rec = data.allRecommendations.find(r => r.id === recommendationId);
  if (!rec) return false;

  // Create decision record
  const decision: Decision = {
    id: `dec_${uuid().slice(0, 8)}`,
    tick: data.session.currentTick,
    type: rec.type,
    recommendationId,
    appliedAt: Date.now(),
  };
  data.session.decisions.push(decision);

  // Apply effect to graph
  applyDecisionEffect(data.graph, rec.type, rec.relatedNodeIds, rec.relatedEdgeIds);

  return true;
}

export function getScenarioState(scenarioId: string) {
  const data = sessions.get(scenarioId);
  if (!data) return null;

  return {
    session: {
      ...data.session,
    },
    nodes: serializeNodes(data.graph),
    edges: serializeEdges(data.graph),
    events: data.allEvents,
    recommendations: data.allRecommendations,
    score: computeScore(
      data.graph,
      data.session.config,
      data.session.decisions,
      data.session.currentTick,
      data.session.maxTicks
    ),
  };
}

export function getScenarioSummary(scenarioId: string) {
  const data = sessions.get(scenarioId);
  if (!data) return null;

  const score = computeScore(
    data.graph,
    data.session.config,
    data.session.decisions,
    data.session.currentTick,
    data.session.maxTicks
  );

  return {
    scenarioId,
    config: data.session.config,
    finalScore: score,
    label: getFinalLabel(score, data.session.config),
    totalTicks: data.session.currentTick,
    maxTicks: data.session.maxTicks,
    totalEvents: data.allEvents.length,
    totalDecisions: data.session.decisions.length,
    status: data.session.status,
  };
}

export function setupSocketHandlers(io: SocketServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on('join_scenario', (scenarioId: string) => {
      socket.join(scenarioId);
      console.log(`[WS] Client ${socket.id} joined scenario ${scenarioId}`);

      // Send current state
      const state = getScenarioState(scenarioId);
      if (state) {
        socket.emit('scenario_state', state);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });
}
