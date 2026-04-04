// ============================================================
// CrisisAlpha — Risk Decay Service
// Automatically decays risk scores over time based on event durations
// ============================================================

import { loadGraph } from './graphService';
import { clamp } from '../models/graph';

// Active decay timers
interface ActiveDecay {
  targetType: 'node' | 'edge' | 'chokepoint';
  targetId: string;
  riskIncrement: number;       // how much was added
  durationMs: number;          // total duration
  startTime: number;           // when the effect started
  decayRate: number;           // risk decrement per tick
}

const activeDecays: ActiveDecay[] = [];
let decayTimer: ReturnType<typeof setInterval> | null = null;
const DECAY_TICK_MS = 60_000; // check every 60 seconds

// ── Register a timed risk effect ────────────────────────────

export function registerDecay(
  targetType: 'node' | 'edge' | 'chokepoint',
  targetId: string,
  riskIncrement: number,
  durationHours: number,
): void {
  const durationMs = durationHours * 60 * 60 * 1000;
  const totalTicks = durationMs / DECAY_TICK_MS;
  const decayRate = riskIncrement / Math.max(totalTicks, 1);

  activeDecays.push({
    targetType,
    targetId,
    riskIncrement,
    durationMs,
    startTime: Date.now(),
    decayRate,
  });
}

// ── Process decay tick ──────────────────────────────────────

function processDecayTick(): void {
  const now = Date.now();
  const expired: number[] = [];

  try {
    const graph = loadGraph();

    for (let i = 0; i < activeDecays.length; i++) {
      const decay = activeDecays[i];
      const elapsed = now - decay.startTime;

      if (elapsed >= decay.durationMs) {
        // Fully expired — remove remaining risk
        applyDecay(graph, decay.targetType, decay.targetId, decay.decayRate * 2);
        expired.push(i);
        continue;
      }

      // Apply gradual decay
      applyDecay(graph, decay.targetType, decay.targetId, decay.decayRate);
    }

    // Remove expired entries (reverse order to maintain indices)
    for (let i = expired.length - 1; i >= 0; i--) {
      activeDecays.splice(expired[i], 1);
    }
  } catch {
    // Graph not loaded yet
  }
}

function applyDecay(graph: any, targetType: string, targetId: string, amount: number): void {
  if (targetType === 'node') {
    const node = graph.nodes.get(targetId);
    if (node) {
      node.currentRiskScore = clamp(node.currentRiskScore - amount, 0, 1);
      // Update status
      if (node.currentRiskScore >= 0.8) node.currentStatus = 'shutdown';
      else if (node.currentRiskScore >= 0.6) node.currentStatus = 'disrupted';
      else if (node.currentRiskScore >= 0.3) node.currentStatus = 'stressed';
      else node.currentStatus = 'operational';
    }
  } else if (targetType === 'chokepoint') {
    const cp = graph.chokepoints.get(targetId);
    if (cp) {
      cp.currentRiskScore = clamp(cp.currentRiskScore - amount, 0, 1);
      if (cp.currentRiskScore >= 0.6) cp.currentStatus = 'disrupted';
      else if (cp.currentRiskScore >= 0.3) cp.currentStatus = 'stressed';
      else cp.currentStatus = 'operational';
    }
  } else if (targetType === 'edge') {
    const edge = graph.edges.get(targetId);
    if (edge) {
      edge.currentRiskScore = clamp(edge.currentRiskScore - amount, 0, 1);
      edge.currentCapacityPct = clamp(1.0 - edge.currentRiskScore * 0.5, 0.1, 1.0);
      edge.currentVolumeTEU = Math.round(edge.baseVolumeTEU * edge.currentCapacityPct);
    }
  }
}

// ── Start / Stop ───────────────────────────────────────────

export function startRiskDecay(): void {
  if (decayTimer) return;
  console.log('[RiskDecay] ⏳ Risk decay engine started (60s tick)');
  decayTimer = setInterval(processDecayTick, DECAY_TICK_MS);
}

export function stopRiskDecay(): void {
  if (decayTimer) {
    clearInterval(decayTimer);
    decayTimer = null;
  }
}

export function getActiveDecayCount(): number {
  return activeDecays.length;
}
