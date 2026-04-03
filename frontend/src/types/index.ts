// ============================================================
// CrisisAlpha — TypeScript Types (shared frontend types)
// ============================================================

export type Industry = 'automotive' | 'energy' | 'pharma' | 'consumer_goods';
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
  relatedNodeIds?: string[];
  relatedEdgeIds?: string[];
}

export interface Recommendation {
  id: string;
  type: 'reroute' | 'inventory_shift' | 'pricing';
  title: string;
  description: string;
  impact: {
    riskReduction: number;
    costIncrease: number;
    profitGain: number;
  };
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
}

export interface ScoreSnapshot {
  riskAvoided: number;
  profitGained: number;
  networkEfficiency: number;
  demandServed: number;
  routeFailures: number;
  overallScore: number;
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
