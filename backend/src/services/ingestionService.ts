// ============================================================
// CrisisAlpha — Ingestion Service (v2)
// Kafka consumer with graceful fallback + event type handlers
// ============================================================

import { patchBaseGraphNode, patchBaseGraphEdge, loadGraph } from './graphService';
import type { WorldEvent, GraphMutation } from '../models/event';
import type { GraphState } from '../models/graph';
import { clamp } from '../models/graph';
import { appendEvent } from './eventStoreService';
import { registerDecay } from './riskDecayService';

// ── Event callback registry ────────────────────────────────

let eventCallbacks: Array<(event: any) => void> = [];

export function onLiveEvent(callback: (event: any) => void): () => void {
  eventCallbacks.push(callback);
  return () => { eventCallbacks = eventCallbacks.filter(cb => cb !== callback); };
}

let isRunning = false;
let kafkaAvailable = false;

// ── Apply Graph Mutations ──────────────────────────────────

function applyMutations(mutations: GraphMutation[]): void {
  let graph: GraphState;
  try {
    graph = loadGraph();
  } catch {
    return;
  }

  for (const m of mutations) {
    // Register decay timer for temporary effects
    if (m.durationHours && typeof m.value === 'number' && m.operation === 'increment') {
      registerDecay(m.targetType as any, m.targetId, m.value, m.durationHours);
    }

    if (m.targetType === 'node') {
      const node = graph.nodes.get(m.targetId);
      if (node && m.property === 'currentRiskScore') {
        if (m.operation === 'increment') {
          node.currentRiskScore = clamp(node.currentRiskScore + (m.value as number));
        } else if (m.operation === 'set') {
          node.currentRiskScore = clamp(m.value as number);
        } else if (m.operation === 'multiply') {
          node.currentRiskScore = clamp(node.currentRiskScore * (m.value as number));
        }
        // Update status based on risk
        if (node.currentRiskScore >= 0.8) node.currentStatus = 'shutdown';
        else if (node.currentRiskScore >= 0.6) node.currentStatus = 'disrupted';
        else if (node.currentRiskScore >= 0.3) node.currentStatus = 'stressed';
        else node.currentStatus = 'operational';
      }
    }

    if (m.targetType === 'chokepoint') {
      const cp = graph.chokepoints.get(m.targetId);
      if (cp && m.property === 'currentRiskScore') {
        if (m.operation === 'increment') {
          cp.currentRiskScore = clamp(cp.currentRiskScore + (m.value as number));
        } else if (m.operation === 'set') {
          cp.currentRiskScore = clamp(m.value as number);
        }
        if (cp.currentRiskScore >= 0.6) cp.currentStatus = 'disrupted';
        else if (cp.currentRiskScore >= 0.3) cp.currentStatus = 'stressed';
        else cp.currentStatus = 'operational';

        // Propagate to edges passing through this chokepoint
        for (const edge of graph.edges.values()) {
          if (edge.passesThrough.includes(m.targetId)) {
            edge.currentRiskScore = clamp(edge.currentRiskScore + (m.value as number) * 0.5);
            edge.currentCapacityPct = clamp(1.0 - edge.currentRiskScore * 0.5, 0.1, 1.0);
            edge.currentVolumeTEU = Math.round(edge.baseVolumeTEU * edge.currentCapacityPct);
          }
        }
      }
    }

    if (m.targetType === 'edge') {
      const edge = graph.edges.get(m.targetId);
      if (edge && m.property === 'currentRiskScore') {
        if (m.operation === 'increment') {
          edge.currentRiskScore = clamp(edge.currentRiskScore + (m.value as number));
        }
        edge.currentCapacityPct = clamp(1.0 - edge.currentRiskScore * 0.5, 0.1, 1.0);
        edge.currentVolumeTEU = Math.round(edge.baseVolumeTEU * edge.currentCapacityPct);
      }
    }
  }
}

// ── Event Type Handlers ────────────────────────────────────

function handleConflictEvent(event: WorldEvent): void {
  console.log(`[INGEST] Processing CONFLICT_EVENT: "${event.title}"`);
  applyMutations(event.graphMutations);

  // Also affect cross-border edges through political sensitivity
  try {
    const graph = loadGraph();
    for (const hubId of event.affectedHubIds) {
      const node = graph.nodes.get(hubId);
      if (!node) continue;
      // Raise risk on all edges connecting to affected node
      const edgeIds = graph.adjacency.get(hubId) || [];
      for (const eid of edgeIds) {
        const edge = graph.edges.get(eid);
        if (edge) {
          const riskDelta = edge.geopoliticalSensitivity * 0.1;
          edge.currentRiskScore = clamp(edge.currentRiskScore + riskDelta);
          edge.currentCapacityPct = clamp(1.0 - edge.currentRiskScore * 0.5, 0.1, 1.0);
          edge.currentVolumeTEU = Math.round(edge.baseVolumeTEU * edge.currentCapacityPct);
        }
      }
    }
  } catch {}
}

function handlePolicyEvent(event: WorldEvent): void {
  console.log(`[INGEST] Processing POLICY_EVENT: "${event.title}"`);
  applyMutations(event.graphMutations);

  // Affect cross-border edges via policySensitivity
  try {
    const graph = loadGraph();
    for (const hubId of event.affectedHubIds) {
      const edgeIds = graph.adjacency.get(hubId) || [];
      for (const eid of edgeIds) {
        const edge = graph.edges.get(eid);
        if (edge) {
          const riskDelta = edge.policySensitivity * 0.12;
          edge.currentRiskScore = clamp(edge.currentRiskScore + riskDelta);
          edge.currentCapacityPct = clamp(1.0 - edge.currentRiskScore * 0.5, 0.1, 1.0);
          edge.currentVolumeTEU = Math.round(edge.baseVolumeTEU * edge.currentCapacityPct);
        }
      }
    }
  } catch {}
}

function handleWeatherEvent(event: WorldEvent): void {
  console.log(`[INGEST] Processing WEATHER_EVENT: "${event.title}"`);
  applyMutations(event.graphMutations);

  // Weather also reduces connected edge capacity via weatherSensitivity
  try {
    const graph = loadGraph();
    for (const hubId of event.affectedHubIds) {
      const edgeIds = graph.adjacency.get(hubId) || [];
      for (const eid of edgeIds) {
        const edge = graph.edges.get(eid);
        if (edge) {
          const riskDelta = edge.weatherSensitivity * 0.1;
          edge.currentRiskScore = clamp(edge.currentRiskScore + riskDelta);
          edge.currentCapacityPct = clamp(1.0 - edge.currentRiskScore * 0.5, 0.1, 1.0);
          edge.currentVolumeTEU = Math.round(edge.baseVolumeTEU * edge.currentCapacityPct);
        }
      }
    }
  } catch {}
}

// ── Process Incoming Event ─────────────────────────────────

export function processWorldEvent(event: WorldEvent): void {
  // Route to correct handler based on category
  switch (event.category) {
    case 'conflict':
      handleConflictEvent(event);
      break;
    case 'policy':
      handlePolicyEvent(event);
      break;
    case 'weather':
    case 'disaster':
      handleWeatherEvent(event);
      break;
    default:
      // Generic: just apply mutations
      applyMutations(event.graphMutations);
      break;
  }

  // Store in event store for feed API
  appendEvent(event);

  // Emit to all subscribers
  for (const cb of eventCallbacks) {
    cb(event);
  }
}

// ── Inject Event (manual / API) ────────────────────────────

export function injectEvent(
  title: string,
  summary: string,
  category: string,
  severity: string,
  affectedHubIds: string[],
  affectedCountries: string[],
  affectedChokepointIds: string[],
  mutations: GraphMutation[]
): WorldEvent {
  const { v4: uuidv4 } = require('uuid');
  const event: WorldEvent = {
    id: `inj_${uuidv4().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    source: 'user',
    category: category as any,
    subcategory: category,
    severity: severity as any,
    affectedCountries,
    affectedHubIds,
    affectedChokepointIds,
    affectedRegionIds: [],
    title,
    summary,
    graphMutations: mutations,
    branchId: 'base',
    isSynthetic: true,
  };

  processWorldEvent(event);
  return event;
}

// ── Kafka Ingestion (graceful) ─────────────────────────────

export async function startIngestion(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  console.log('[Ingestion] 📡 Attempting Kafka connection...');
  
  try {
    const { Kafka } = require('kafkajs');
    const kafka = new Kafka({
      clientId: 'crisisalpha-consumer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      connectionTimeout: 5000,
      requestTimeout: 5000,
      retry: { retries: 2 },
    });

    const consumer = kafka.consumer({ groupId: 'base-reality-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'base-reality.disruptions', fromBeginning: false });

    kafkaAvailable = true;
    console.log('[Ingestion] 🚀 Kafka connected — listening for disruptions');

    await consumer.run({
      eachMessage: async ({ message }: any) => {
        if (!message.value) return;
        const event = JSON.parse(message.value.toString());
        console.log(`[Ingestion] 📥 Kafka event: [${event.eventType || event.category}] → [${event.targetId || event.affectedHubIds?.join(',')}]`);

        // Handle legacy format from existing producers
        if (event.eventType === 'NODE_DISRUPTION') {
          patchBaseGraphNode(event.targetId, event.delta);
        } else if (event.eventType === 'ROUTE_CONSTRICTION') {
          patchBaseGraphEdge(event.targetId, event.delta);
        } else {
          // New WorldEvent format
          processWorldEvent(event);
        }
      },
    });
  } catch (err) {
    kafkaAvailable = false;
    console.log('[Ingestion] ⚠️ Kafka unavailable — using in-memory event pipeline only');
    console.log('[Ingestion] ✅ Backend continues with local producers (no Kafka required)');
  }
}

export async function stopIngestion(): Promise<void> {
  isRunning = false;
  console.log('[Ingestion] ⏹️ Ingestion stopped');
}

export function isIngestionRunning(): boolean {
  return isRunning;
}

export function isKafkaConnected(): boolean {
  return kafkaAvailable;
}
