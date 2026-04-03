// ============================================================
// CrisisAlpha — API Client (v2)
// HTTP + Socket.IO connections to backend v2
// ============================================================

import { io, Socket } from 'socket.io-client';
import { ScenarioConfig, GraphNode, GraphEdge, TickPayload, SimulationComplete, Recommendation } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ---- REST API ----

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Data Normalizers ──────────────────────────────────────────
// Backend v2 returns richer data — we normalize to frontend types

function normalizeNode(raw: any): GraphNode {
  return {
    id: raw.id,
    name: raw.name,
    lat: raw.lat,
    lng: raw.lng,
    country: raw.country || raw.countryId || '',
    region: raw.region || raw.regionId || '',
    type: raw.type === 'manufacturing' || raw.type === 'city' ? 'city' : raw.type === 'port' ? 'port' : 'hub',
    riskScore: raw.riskScore ?? raw.currentRiskScore ?? 0,
    status: normalizeStatus(raw.status ?? raw.currentStatus ?? 'operational'),
    inventoryBuffer: raw.inventoryBuffer ?? normalizeBufferDays(raw.inventoryBufferDays ?? raw.inventoryBuffer ?? 14),
    resilienceScore: raw.resilienceScore ?? 0.5,
  };
}

function normalizeEdge(raw: any): GraphEdge {
  return {
    id: raw.id,
    sourceNodeId: raw.sourceNodeId ?? raw.sourceHubId ?? '',
    targetNodeId: raw.targetNodeId ?? raw.targetHubId ?? '',
    transportType: raw.transportType ?? 'sea',
    riskScore: raw.riskScore ?? raw.currentRiskScore ?? 0,
    status: normalizeStatus(raw.status ?? raw.currentStatus ?? 'operational'),
    capacity: raw.capacity ?? raw.capacityPct ? Math.round((raw.capacityPct ?? 1) * 100) : raw.capacity ?? 100,
  };
}

function normalizeStatus(status: string): 'safe' | 'stressed' | 'risky' | 'broken' {
  switch (status) {
    case 'operational': return 'safe';
    case 'degraded': return 'stressed';
    case 'disrupted': return 'risky';
    case 'critical':
    case 'broken':
    case 'offline': return 'broken';
    case 'safe': return 'safe';
    case 'stressed': return 'stressed';
    case 'risky': return 'risky';
    default: return 'safe';
  }
}

function normalizeBufferDays(days: number): number {
  // Convert buffer days (0-30) to a 0-1 scale
  return Math.min(1, Math.max(0, days / 30));
}

function normalizeRecommendation(raw: any): Recommendation {
  return {
    id: raw.id,
    type: raw.type ?? 'reroute',
    title: raw.title ?? '',
    description: raw.description ?? '',
    impact: {
      riskReduction: raw.impact?.riskReduction ?? 0,
      costIncrease: typeof raw.impact?.costIncrease === 'number'
        ? (raw.impact.costIncrease > 1 ? raw.impact.costIncrease / 100 : raw.impact.costIncrease)
        : 0,
      profitGain: typeof raw.impact?.profitGain === 'number'
        ? (raw.impact.profitGain > 1 ? raw.impact.profitGain / 100 : raw.impact.profitGain)
        : 0,
    },
    relatedNodeIds: raw.relatedNodeIds ?? [],
    relatedEdgeIds: raw.relatedEdgeIds ?? [],
  };
}

function normalizeTickPayload(raw: any): TickPayload {
  return {
    scenarioId: raw.simulationId ?? raw.scenarioId ?? '',
    tick: raw.tick ?? 0,
    dayLabel: raw.dayLabel ?? `Day ${raw.tick ?? 0}`,
    nodes: (raw.nodes ?? []).map(normalizeNode),
    edges: (raw.edges ?? []).map(normalizeEdge),
    events: (raw.events ?? []).map((e: any) => ({
      id: e.id,
      tick: e.tick,
      type: e.type,
      severity: e.severity === 'critical' ? 'high' : e.severity,
      title: e.title,
      message: e.message,
      relatedNodeIds: e.relatedNodeIds,
      relatedEdgeIds: e.relatedEdgeIds,
    })),
    recommendations: (raw.recommendations ?? []).map(normalizeRecommendation),
    score: {
      riskAvoided: raw.score?.riskAvoided ?? 100,
      profitGained: raw.score?.profitGained ?? 0,
      networkEfficiency: raw.score?.networkEfficiency ?? 100,
      demandServed: raw.score?.demandServed ?? 100,
      routeFailures: raw.score?.routeFailures ?? 0,
      overallScore: raw.score?.overallScore ?? 0,
    },
    isComplete: raw.isComplete ?? false,
  };
}

// ── API methods ──────────────────────────────────────────────

export const api = {
  // Graph — backend v2 serves at /api/graph/full
  getGraph: async () => {
    const data = await fetchJSON('/api/graph/full');
    return {
      nodes: (data.nodes ?? []).map(normalizeNode),
      edges: (data.edges ?? []).map(normalizeEdge),
      chokepoints: data.chokepoints ?? [],
      relations: data.relations ?? [],
      stats: data.stats ?? {},
    };
  },

  // Presets — backend v2 serves at /api/sim/presets
  getPresets: async () => {
    const data = await fetchJSON('/api/sim/presets');
    // Backend returns array directly
    const presets = Array.isArray(data) ? data : (data.presets ?? data);
    return {
      presets: presets.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        originNodeId: p.originNodeId,
        industry: p.industry,
        conflictIntensity: p.conflictIntensity,
        fuelShortage: p.fuelShortage,
        policyRestriction: p.policyRestriction,
        durationDays: p.durationDays,
        icon: p.icon ?? '⚡',
      })),
    };
  },

  getIndustries: () => fetchJSON('/api/user/industry-template/automotive'),

  // Create simulation — backend v2 at /api/sim/create
  createScenario: async (config: ScenarioConfig) => {
    const data = await fetchJSON('/api/sim/create', {
      method: 'POST',
      body: JSON.stringify({
        originNodeId: config.originNodeId,
        industry: config.industry,
        conflictIntensity: config.conflictIntensity,
        fuelShortage: config.fuelShortage,
        policyRestriction: config.policyRestriction,
        durationDays: config.durationDays,
        hypothesis: {
          title: `Crisis Simulation — ${config.industry}`,
          description: `User-initiated ${config.industry} crisis simulation at ${config.originNodeId}`,
          category: 'conflict',
          affectedHubIds: [config.originNodeId],
          affectedCountries: [],
          affectedChokepoints: [],
          initialMutations: [],
        },
      }),
    });
    return {
      session: { id: data.simulationId ?? data.session?.id },
      nodes: null,
      edges: null,
    };
  },

  // Lifecycle APIs — backend v2 at /api/sim/:id/...
  startScenario: (id: string) =>
    fetchJSON(`/api/sim/${id}/start`, { method: 'POST' }),

  pauseScenario: (id: string) =>
    fetchJSON(`/api/sim/${id}/pause`, { method: 'POST' }),

  resumeScenario: (id: string) =>
    fetchJSON(`/api/sim/${id}/resume`, { method: 'POST' }),

  resetScenario: (id: string) =>
    fetchJSON(`/api/sim/${id}/reset`, { method: 'POST' }),

  // Decision — backend v2 expects type + recommendationId + related IDs
  applyDecision: (id: string, recommendationId: string, type?: string, relatedNodeIds?: string[], relatedEdgeIds?: string[]) =>
    fetchJSON(`/api/sim/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        type: type ?? 'reroute',
        recommendationId,
        relatedNodeIds: relatedNodeIds ?? [],
        relatedEdgeIds: relatedEdgeIds ?? [],
      }),
    }),

  getState: async (id: string) => {
    const data = await fetchJSON(`/api/sim/${id}/state`);
    return {
      ...data,
      nodes: (data.nodes ?? []).map(normalizeNode),
      edges: (data.edges ?? []).map(normalizeEdge),
    };
  },

  getSummary: (id: string) => fetchJSON(`/api/sim/${id}/summary`),

  getImpactReport: (id: string) => fetchJSON(`/api/sim/${id}/impact`),

  // Feed APIs
  getFeed: () => fetchJSON('/api/feed/recent'),

  // Chat endpoint
  chat: (message: string, context: string) =>
    fetchJSON('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }),
};

// ---- WebSocket ----

let socket: Socket | null = null;

export function connectSocket(
  scenarioId: string,
  onTick: (payload: TickPayload) => void,
  onComplete: (data: SimulationComplete) => void
): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io(API_BASE, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[WS] Connected');
    // Backend v2 uses sim:join event name
    socket?.emit('sim:join', scenarioId);
  });

  // Backend v2 emits 'sim:tick' and 'sim:complete'
  socket.on('sim:tick', (raw: any) => {
    onTick(normalizeTickPayload(raw));
  });

  socket.on('sim:complete', (data: any) => {
    onComplete({
      scenarioId: data.simulationId ?? data.scenarioId ?? scenarioId,
      finalScore: {
        riskAvoided: data.finalScore?.riskAvoided ?? 0,
        profitGained: data.finalScore?.profitGained ?? 0,
        networkEfficiency: data.finalScore?.networkEfficiency ?? 0,
        demandServed: data.finalScore?.demandServed ?? 0,
        routeFailures: data.finalScore?.routeFailures ?? 0,
        overallScore: data.finalScore?.overallScore ?? 0,
      },
      label: (data.finalScore?.overallScore ?? 0) >= 60 ? 'Crisis Contained' : 'Severe Disruption',
      totalEvents: data.totalEvents ?? 0,
      totalDecisions: data.decisionsApplied ?? 0,
    });
  });

  // Also listen for legacy event names for compatibility
  socket.on('tick', (raw: any) => {
    onTick(normalizeTickPayload(raw));
  });

  socket.on('simulation_complete', (data: any) => {
    onComplete({
      scenarioId: data.simulationId ?? data.scenarioId ?? scenarioId,
      finalScore: data.finalScore ?? { riskAvoided: 0, profitGained: 0, networkEfficiency: 0, demandServed: 0, routeFailures: 0, overallScore: 0 },
      label: 'Simulation Complete',
      totalEvents: data.totalEvents ?? 0,
      totalDecisions: data.totalDecisions ?? 0,
    });
  });

  socket.on('disconnect', () => {
    console.log('[WS] Disconnected');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
