// ============================================================
// CrisisAlpha — Mock Data Service
// Fallback simulation data when backend is unavailable
// ============================================================

import { GraphNode, GraphEdge, SimulationEvent, Recommendation, ScoreSnapshot, TickPayload } from '@/types';

// ── Mock Graph Data ──────────────────────────────────────────

const MOCK_NODES: GraphNode[] = [
  { id: 'n1', name: 'Shanghai Port', lat: 31.23, lng: 121.47, country: 'China', region: 'Asia Pacific', type: 'port', riskScore: 0.2, status: 'safe', inventoryBuffer: 0.8, resilienceScore: 0.75 },
  { id: 'n2', name: 'Singapore Hub', lat: 1.35, lng: 103.82, country: 'Singapore', region: 'Asia Pacific', type: 'hub', riskScore: 0.15, status: 'safe', inventoryBuffer: 0.9, resilienceScore: 0.85 },
  { id: 'n3', name: 'Rotterdam Port', lat: 51.92, lng: 4.48, country: 'Netherlands', region: 'Europe', type: 'port', riskScore: 0.1, status: 'safe', inventoryBuffer: 0.85, resilienceScore: 0.8 },
  { id: 'n4', name: 'Dubai Hub', lat: 25.2, lng: 55.27, country: 'UAE', region: 'Middle East', type: 'hub', riskScore: 0.3, status: 'safe', inventoryBuffer: 0.7, resilienceScore: 0.7 },
  { id: 'n5', name: 'Los Angeles Port', lat: 33.74, lng: -118.27, country: 'USA', region: 'North America', type: 'port', riskScore: 0.12, status: 'safe', inventoryBuffer: 0.88, resilienceScore: 0.82 },
  { id: 'n6', name: 'Hamburg Port', lat: 53.55, lng: 9.99, country: 'Germany', region: 'Europe', type: 'port', riskScore: 0.18, status: 'safe', inventoryBuffer: 0.75, resilienceScore: 0.78 },
  { id: 'n7', name: 'Mumbai Port', lat: 19.08, lng: 72.88, country: 'India', region: 'Asia Pacific', type: 'port', riskScore: 0.25, status: 'safe', inventoryBuffer: 0.65, resilienceScore: 0.6 },
  { id: 'n8', name: 'Tokyo Hub', lat: 35.68, lng: 139.69, country: 'Japan', region: 'Asia Pacific', type: 'hub', riskScore: 0.1, status: 'safe', inventoryBuffer: 0.92, resilienceScore: 0.9 },
  { id: 'n9', name: 'Suez Canal', lat: 30.59, lng: 32.31, country: 'Egypt', region: 'Middle East', type: 'hub', riskScore: 0.35, status: 'safe', inventoryBuffer: 0.6, resilienceScore: 0.55 },
  { id: 'n10', name: 'Cape Town Port', lat: -33.92, lng: 18.42, country: 'South Africa', region: 'Africa', type: 'port', riskScore: 0.2, status: 'safe', inventoryBuffer: 0.7, resilienceScore: 0.65 },
  { id: 'n11', name: 'São Paulo Hub', lat: -23.55, lng: -46.63, country: 'Brazil', region: 'South America', type: 'city', riskScore: 0.22, status: 'safe', inventoryBuffer: 0.68, resilienceScore: 0.62 },
  { id: 'n12', name: 'Istanbul Hub', lat: 41.01, lng: 28.98, country: 'Turkey', region: 'Europe', type: 'hub', riskScore: 0.28, status: 'safe', inventoryBuffer: 0.72, resilienceScore: 0.68 },
];

const MOCK_EDGES: GraphEdge[] = [
  { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', transportType: 'sea', riskScore: 0.15, status: 'safe', capacity: 100 },
  { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n4', transportType: 'sea', riskScore: 0.2, status: 'safe', capacity: 80 },
  { id: 'e3', sourceNodeId: 'n4', targetNodeId: 'n9', transportType: 'sea', riskScore: 0.3, status: 'safe', capacity: 90 },
  { id: 'e4', sourceNodeId: 'n9', targetNodeId: 'n3', transportType: 'sea', riskScore: 0.25, status: 'safe', capacity: 85 },
  { id: 'e5', sourceNodeId: 'n3', targetNodeId: 'n6', transportType: 'rail', riskScore: 0.1, status: 'safe', capacity: 60 },
  { id: 'e6', sourceNodeId: 'n1', targetNodeId: 'n5', transportType: 'sea', riskScore: 0.18, status: 'safe', capacity: 95 },
  { id: 'e7', sourceNodeId: 'n1', targetNodeId: 'n8', transportType: 'sea', riskScore: 0.08, status: 'safe', capacity: 110 },
  { id: 'e8', sourceNodeId: 'n7', targetNodeId: 'n4', transportType: 'sea', riskScore: 0.22, status: 'safe', capacity: 70 },
  { id: 'e9', sourceNodeId: 'n4', targetNodeId: 'n10', transportType: 'sea', riskScore: 0.2, status: 'safe', capacity: 65 },
  { id: 'e10', sourceNodeId: 'n5', targetNodeId: 'n11', transportType: 'air', riskScore: 0.12, status: 'safe', capacity: 40 },
  { id: 'e11', sourceNodeId: 'n3', targetNodeId: 'n12', transportType: 'road', riskScore: 0.15, status: 'safe', capacity: 55 },
  { id: 'e12', sourceNodeId: 'n12', targetNodeId: 'n9', transportType: 'sea', riskScore: 0.28, status: 'safe', capacity: 75 },
  { id: 'e13', sourceNodeId: 'n8', targetNodeId: 'n5', transportType: 'air', riskScore: 0.1, status: 'safe', capacity: 45 },
  { id: 'e14', sourceNodeId: 'n2', targetNodeId: 'n7', transportType: 'sea', riskScore: 0.2, status: 'safe', capacity: 80 },
  { id: 'e15', sourceNodeId: 'n6', targetNodeId: 'n12', transportType: 'rail', riskScore: 0.12, status: 'safe', capacity: 50 },
];

const MOCK_EVENTS: SimulationEvent[][] = [
  [
    { id: 'ev1', tick: 1, type: 'node_stressed', severity: 'low', title: 'Supply chain strain detected', message: 'Minor disruption in Shanghai Port operations', relatedNodeIds: ['n1'] },
  ],
  [
    { id: 'ev2', tick: 2, type: 'fuel_shortage_worsening', severity: 'medium', title: 'Fuel shortage escalating', message: 'Fuel costs rising across Middle East corridors', relatedNodeIds: ['n4', 'n9'] },
  ],
  [],
  [
    { id: 'ev3', tick: 4, type: 'route_broken', severity: 'high', title: 'Suez Canal blockage', message: 'Major disruption to Mediterranean shipping routes', relatedNodeIds: ['n9'], relatedEdgeIds: ['e3', 'e4'] },
  ],
  [
    { id: 'ev4', tick: 5, type: 'demand_spike_safe_zone', severity: 'medium', title: 'Demand spike in Europe', message: 'Rerouted goods creating bottleneck in Rotterdam', relatedNodeIds: ['n3', 'n6'] },
  ],
  [],
  [
    { id: 'ev5', tick: 7, type: 'cascade_spreading', severity: 'high', title: 'Cascade effect spreading', message: 'Risk propagation accelerating across Asian networks', relatedNodeIds: ['n1', 'n2', 'n7'] },
  ],
  [],
  [
    { id: 'ev6', tick: 9, type: 'policy_restriction_escalation', severity: 'medium', title: 'New trade restrictions', message: 'Policy changes affecting cross-border logistics', relatedNodeIds: ['n12'] },
  ],
  [],
  [
    { id: 'ev7', tick: 11, type: 'hub_critical', severity: 'high', title: 'Singapore Hub at capacity', message: 'Overflow conditions — considering emergency rerouting', relatedNodeIds: ['n2'] },
  ],
  [],
  [],
  [
    { id: 'ev8', tick: 14, type: 'node_stressed', severity: 'low', title: 'Simulation winding down', message: 'Final assessment cycle in progress', relatedNodeIds: [] },
  ],
];

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec1', type: 'reroute', title: 'Reroute via Cape of Good Hope',
    description: 'Bypass Suez blockage through southern African route',
    impact: { riskReduction: 0.35, costIncrease: 0.15, profitGain: -0.05 },
    relatedNodeIds: ['n9', 'n10'], relatedEdgeIds: ['e3', 'e4'],
  },
  {
    id: 'rec2', type: 'inventory_shift', title: 'Shift inventory to Rotterdam',
    description: 'Pre-position stock in European hub to buffer demand spike',
    impact: { riskReduction: 0.2, costIncrease: 0.08, profitGain: 0.1 },
    relatedNodeIds: ['n3', 'n6'], relatedEdgeIds: ['e4', 'e5'],
  },
  {
    id: 'rec3', type: 'pricing', title: 'Dynamic pricing adjustment',
    description: 'Increase margins on constrained routes to offset disruption costs',
    impact: { riskReduction: 0.05, costIncrease: 0, profitGain: 0.25 },
    relatedNodeIds: ['n1', 'n5'], relatedEdgeIds: ['e6'],
  },
];

// ── Mock Simulation Runner ───────────────────────────────────

/**
 * Simulate risk propagation for a single tick.
 * Mutates nodes/edges arrays in place for simplicity.
 */
function simulateTick(
  nodes: GraphNode[],
  edges: GraphEdge[],
  tick: number,
  originNodeId: string,
  config: { conflictIntensity: number; fuelShortage: number; policyRestriction: number }
): void {
  const crisisFactor = (config.conflictIntensity + config.fuelShortage + config.policyRestriction) / 3;
  const spreadRate = 0.04 + crisisFactor * 0.06;

  // Find origin and propagate outward
  nodes.forEach((node) => {
    // Base risk increase
    const distFromOrigin = node.id === originNodeId ? 0.1 : 0.02;
    node.riskScore = Math.min(1, node.riskScore + (spreadRate + distFromOrigin) * (0.5 + Math.random() * 0.5));

    // Some randomized recovery
    if (Math.random() > 0.85) {
      node.riskScore = Math.max(0, node.riskScore - 0.05);
    }

    // Update status
    if (node.riskScore >= 0.8) node.status = 'broken';
    else if (node.riskScore >= 0.6) node.status = 'risky';
    else if (node.riskScore >= 0.3) node.status = 'stressed';
    else node.status = 'safe';

    // Decay inventory buffer
    node.inventoryBuffer = Math.max(0.05, node.inventoryBuffer - (node.riskScore * 0.03));
  });

  // Propagate to edges
  edges.forEach((edge) => {
    const src = nodes.find((n) => n.id === edge.sourceNodeId);
    const tgt = nodes.find((n) => n.id === edge.targetNodeId);
    if (src && tgt) {
      edge.riskScore = Math.min(1, (src.riskScore + tgt.riskScore) / 2 + Math.random() * 0.05);
      if (edge.riskScore >= 0.8) edge.status = 'broken';
      else if (edge.riskScore >= 0.6) edge.status = 'risky';
      else if (edge.riskScore >= 0.3) edge.status = 'stressed';
      else edge.status = 'safe';
    }
  });
}

/**
 * Returns mock graph data for initial rendering.
 */
export function getMockGraphData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: MOCK_NODES.map((n) => ({ ...n })),
    edges: MOCK_EDGES.map((e) => ({ ...e })),
  };
}

/**
 * Returns mock presets.
 */
export function getMockPresets() {
  return {
    presets: [
      {
        id: 'p1', name: 'Suez Crisis', description: 'Major canal blockage disrupting EU-Asia trade',
        originNodeId: 'n9', industry: 'energy' as const,
        conflictIntensity: 0.7, fuelShortage: 0.8, policyRestriction: 0.4,
        durationDays: 14, icon: '🚢',
      },
      {
        id: 'p2', name: 'Pacific Storm', description: 'Typhoon disrupting trans-Pacific shipping lanes',
        originNodeId: 'n1', industry: 'consumer_goods' as const,
        conflictIntensity: 0.3, fuelShortage: 0.4, policyRestriction: 0.2,
        durationDays: 10, icon: '🌀',
      },
    ],
  };
}

/**
 * Run a complete mock simulation, returning tick payloads via callback.
 * This provides a smooth fallback when the backend is unavailable.
 */
export function runMockSimulation(
  config: {
    originNodeId: string;
    durationDays: number;
    conflictIntensity: number;
    fuelShortage: number;
    policyRestriction: number;
    industry: string;
    userGoal: string;
  },
  onTick: (payload: TickPayload) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete: (data: any) => void
): { stop: () => void } {
  const nodes = MOCK_NODES.map((n) => ({ ...n }));
  const edges = MOCK_EDGES.map((e) => ({ ...e }));
  const maxTicks = config.durationDays;
  let currentTick = 0;
  let stopped = false;

  const scenarioId = `mock_${Date.now()}`;

  const interval = setInterval(() => {
    if (stopped) return;

    currentTick++;

    // Simulate
    simulateTick(nodes, edges, currentTick, config.originNodeId, config);

    // Pick events for this tick
    const tickEvents = (MOCK_EVENTS[currentTick - 1] || []).map((e) => ({
      ...e,
      tick: currentTick,
    }));

    // Score
    const brokenNodes = nodes.filter((n) => n.status === 'broken').length;
    const brokenEdges = edges.filter((e) => e.status === 'broken').length;
    const totalRisk = nodes.reduce((sum, n) => sum + n.riskScore, 0) / nodes.length;

    const score: ScoreSnapshot = {
      riskAvoided: Math.max(0, Math.round((1 - totalRisk) * 100)),
      profitGained: Math.round(Math.random() * 20 - 5),
      networkEfficiency: Math.max(0, Math.round((1 - brokenEdges / edges.length) * 100)),
      demandServed: Math.max(0, Math.round((1 - brokenNodes / nodes.length) * 100)),
      routeFailures: brokenEdges,
      overallScore: Math.max(0, Math.round((1 - totalRisk) * 80)),
    };

    const isComplete = currentTick >= maxTicks;

    const payload: TickPayload = {
      scenarioId,
      tick: currentTick,
      dayLabel: `Day ${currentTick}`,
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
      events: tickEvents,
      recommendations: currentTick >= 3 ? MOCK_RECOMMENDATIONS : [],
      score,
      isComplete,
    };

    onTick(payload);

    if (isComplete) {
      clearInterval(interval);
      onComplete({
        scenarioId,
        finalScore: score,
        label: score.overallScore >= 60 ? 'Crisis Contained' : 'Severe Disruption',
        totalEvents: MOCK_EVENTS.flat().length,
        totalDecisions: 0,
      });
    }
  }, 1500);

  return {
    stop: () => {
      stopped = true;
      clearInterval(interval);
    },
  };
}
