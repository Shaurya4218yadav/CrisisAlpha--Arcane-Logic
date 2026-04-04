// ============================================================
// CrisisAlpha — Ingestion Service
// Simulated live event feed for base reality
// ============================================================

import { v4 as uuid } from 'uuid';
import type { WorldEvent, GraphMutation } from '../models/event';
import { LIVE_EVENT_SCENARIOS } from '../models/event';
import { appendEvent } from './eventStoreService';
import { loadGraph } from './graphService';
import { getNodeStatusFromRisk, clamp } from '../models/graph';

let ingestionInterval: NodeJS.Timeout | null = null;
let isRunning = false;
const INGESTION_INTERVAL_MS = 30_000; // one event every ~30 seconds
let eventCallbacks: Array<(event: WorldEvent) => void> = [];

// ── Start / Stop ────────────────────────────────────────────

export function startIngestion(): void {
  if (isRunning) return;
  isRunning = true;

  console.log('[Ingestion] 📡 Live event ingestion started');

  ingestionInterval = setInterval(() => {
    // Random chance to fire an event (60% probability per tick)
    if (Math.random() < 0.6) {
      const event = generateRandomEvent();
      const appended = appendEvent(event);

      // Apply mutations to base reality graph
      applyMutationsToBaseReality(appended);

      // Notify subscribers
      for (const cb of eventCallbacks) {
        cb(appended);
      }

      console.log(`[Ingestion] 🌍 ${appended.title} (${appended.severity})`);
    }
  }, INGESTION_INTERVAL_MS);
}

export function stopIngestion(): void {
  if (!isRunning) return;
  isRunning = false;

  if (ingestionInterval) {
    clearInterval(ingestionInterval);
    ingestionInterval = null;
  }
  console.log('[Ingestion] ⏹️  Live event ingestion stopped');
}

export function isIngestionRunning(): boolean {
  return isRunning;
}

// ── Subscribe to live events ────────────────────────────────

export function onLiveEvent(callback: (event: WorldEvent) => void): () => void {
  eventCallbacks.push(callback);
  return () => {
    eventCallbacks = eventCallbacks.filter(cb => cb !== callback);
  };
}

// ── Manual Event Injection ──────────────────────────────────

export function injectEvent(
  title: string,
  summary: string,
  category: WorldEvent['category'],
  severity: WorldEvent['severity'],
  affectedHubIds: string[],
  affectedCountries: string[],
  affectedChokepointIds: string[],
  mutations: GraphMutation[]
): WorldEvent {
  const event: WorldEvent = {
    id: `inj_${uuid().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    source: 'user',
    category,
    subcategory: 'manual_injection',
    severity,
    affectedCountries,
    affectedHubIds,
    affectedChokepointIds,
    affectedRegionIds: [],
    title,
    summary,
    graphMutations: mutations,
    branchId: 'base',
    isSynthetic: false,
  };

  const appended = appendEvent(event);
  applyMutationsToBaseReality(appended);

  for (const cb of eventCallbacks) {
    cb(appended);
  }

  return appended;
}

// ── Random Event Generation ─────────────────────────────────

function generateRandomEvent(): WorldEvent {
  const scenario = LIVE_EVENT_SCENARIOS[Math.floor(Math.random() * LIVE_EVENT_SCENARIOS.length)];

  // Vary severity slightly
  const severities: WorldEvent['severity'][] = ['low', 'medium', 'high', 'critical'];
  const baseSeverityIdx = severities.indexOf(scenario.severity);
  const variation = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  const newSeverityIdx = Math.max(0, Math.min(3, baseSeverityIdx + variation));

  // Scale mutations by severity ratio
  const severityScale = (newSeverityIdx + 1) / (baseSeverityIdx + 1);
  const scaledMutations: GraphMutation[] = scenario.mutations.map(m => ({
    ...m,
    value: typeof m.value === 'number' ? Math.round(m.value * severityScale * 100) / 100 : m.value,
  }));

  return {
    id: `live_${uuid().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    source: 'gdelt',
    category: scenario.category,
    subcategory: scenario.subcategory,
    severity: severities[newSeverityIdx],
    affectedCountries: scenario.affectedCountries,
    affectedHubIds: scenario.affectedHubIds,
    affectedChokepointIds: scenario.affectedChokepointIds,
    affectedRegionIds: [],
    title: scenario.title,
    summary: scenario.summary,
    graphMutations: scaledMutations,
    branchId: 'base',
    isSynthetic: false,
  };
}

// ── Apply Mutations to Base Reality ─────────────────────────

function applyMutationsToBaseReality(event: WorldEvent): void {
  const graph = loadGraph();

  for (const mutation of event.graphMutations) {
    if (mutation.targetType === 'node') {
      const node = graph.nodes.get(mutation.targetId);
      if (!node) continue;

      if (mutation.property === 'currentRiskScore') {
        if (mutation.operation === 'increment') {
          node.currentRiskScore = clamp(node.currentRiskScore + (mutation.value as number));
        } else if (mutation.operation === 'set') {
          node.currentRiskScore = clamp(mutation.value as number);
        } else if (mutation.operation === 'multiply') {
          node.currentRiskScore = clamp(node.currentRiskScore * (mutation.value as number));
        }
        node.currentStatus = getNodeStatusFromRisk(node.currentRiskScore);
      }
    } else if (mutation.targetType === 'chokepoint') {
      const cp = graph.chokepoints.get(mutation.targetId);
      if (!cp) continue;

      if (mutation.property === 'currentRiskScore') {
        if (mutation.operation === 'increment') {
          cp.currentRiskScore = clamp(cp.currentRiskScore + (mutation.value as number));
        } else if (mutation.operation === 'set') {
          cp.currentRiskScore = clamp(mutation.value as number);
        }
        cp.currentStatus = getNodeStatusFromRisk(cp.currentRiskScore);
      }
    }
  }

  // Natural decay toward stability for base reality
  for (const [, node] of graph.nodes) {
    if (node.currentRiskScore > 0) {
      node.currentRiskScore = clamp(node.currentRiskScore * 0.98); // 2% decay per tick
      node.currentStatus = getNodeStatusFromRisk(node.currentRiskScore);
    }
  }
  for (const [, cp] of graph.chokepoints) {
    if (cp.currentRiskScore > 0) {
      cp.currentRiskScore = clamp(cp.currentRiskScore * 0.98);
      cp.currentStatus = getNodeStatusFromRisk(cp.currentRiskScore);
    }
  }
}
