// ============================================================
// CrisisAlpha — TypeScript Types (shared frontend types)
// v2 — aligned with backend v2 API surface
// ============================================================

export type Industry = 'automotive' | 'energy' | 'pharma' | 'consumer_goods' | 'semiconductors' | 'agriculture';
export type UserGoal = 'resilience' | 'profit' | 'balanced';
export type NodeStatus = 'safe' | 'stressed' | 'risky' | 'broken';
export type TransportType = 'sea' | 'road' | 'rail' | 'air';

export interface ScenarioConfig {
  originNodeId: string;
  industry: Industry;
  conflictIntensity: number;
  fuelShortage: number;
  policyRestriction: number;
  durationDays: number;
  userGoal: UserGoal;
  // Advanced parameters
  riskSensitivity: number;
  propagationSpeed: number;
  demandVolatility: number;
}

export interface UserProfile {
  name: string;
  businessType: string;
  industry: string;
  regions: string[];
  product: string;
}

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  region: string;
  type: 'city' | 'port' | 'hub';
  riskScore: number;
  status: NodeStatus;
  inventoryBuffer: number;
  resilienceScore: number;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  transportType: TransportType;
  riskScore: number;
  status: NodeStatus;
  capacity: number;
}

export interface SimulationEvent {
  id: string;
  tick: number;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  category?: string;
  relatedNodeIds?: string[];
  relatedEdgeIds?: string[];
  relatedChokepointIds?: string[];
  timestamp?: string;
}

export interface Recommendation {
  id: string;
  type: 'reroute' | 'inventory_shift' | 'pricing' | 'activate_backup' | 'hedge';
  title: string;
  description: string;
  urgency?: 'immediate' | 'soon' | 'monitor';
  timeHorizon?: string;
  impact: {
    riskReduction: number;
    costIncrease: number;
    profitGain: number;
    delayReduction?: number;
  };
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  relatedAttachmentIds?: string[];
}

export interface ScoreSnapshot {
  riskAvoided: number;
  profitGained: number;
  networkEfficiency: number;
  demandServed: number;
  routeFailures: number;
  overallScore: number;
  chokePointsAffected?: number;
  projectedImpactDays?: number;
}

export interface TickPayload {
  scenarioId: string;
  tick: number;
  dayLabel: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  events: SimulationEvent[];
  recommendations: Recommendation[];
  score: ScoreSnapshot;
  isComplete: boolean;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  originNodeId: string;
  industry: Industry;
  conflictIntensity: number;
  fuelShortage: number;
  policyRestriction: number;
  durationDays: number;
  icon: string;
}

export interface SimulationComplete {
  scenarioId: string;
  finalScore: ScoreSnapshot;
  label: string;
  totalEvents: number;
  totalDecisions: number;
}

// ── Chokepoint (new in v2) ────────────────────────────────────

export interface Chokepoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  type: string;
  throughputPct: number;
  riskScore: number;
  status: string;
  alternatives: string[];
  vulnerabilities: string[];
}

// ── Impact Report (new in v2) ─────────────────────────────────

export interface ImpactProjection {
  attachmentPointId: string;
  hubName: string;
  severity: string;
  delayDays: number;
  narrative: string;
}

export interface PersonalizedImpactReport {
  simulationId: string;
  userId: string;
  overallSeverity: string;
  projections: ImpactProjection[];
  recommendations: string[];
  narrative: string;
}
