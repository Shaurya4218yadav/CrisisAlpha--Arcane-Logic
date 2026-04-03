// ============================================================
// CrisisAlpha — Scenario Models
// ============================================================

export type Industry = 'automotive' | 'energy' | 'pharma' | 'consumer_goods';
export type UserGoal = 'resilience' | 'profit' | 'balanced';

export interface ScenarioConfig {
  originNodeId: string;
  industry: Industry;
  conflictIntensity: number;  // 0 to 1
  fuelShortage: number;       // 0 to 1
  policyRestriction: number;  // 0 to 1
  durationDays: number;
  userGoal: UserGoal;
}

export interface ScenarioSession {
  id: string;
  config: ScenarioConfig;
  currentTick: number;
  maxTicks: number;
  status: 'created' | 'running' | 'paused' | 'completed';
  createdAt: number;
  decisions: Decision[];
}

export interface Decision {
  id: string;
  tick: number;
  type: 'reroute' | 'inventory_shift' | 'pricing';
  recommendationId: string;
  appliedAt: number;
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
  nodes: Array<{ id: string; riskScore: number; status: string }>;
  edges: Array<{ id: string; riskScore: number; status: string }>;
  events: import('./event').SimulationEvent[];
  recommendations: Recommendation[];
  score: ScoreSnapshot;
  isComplete: boolean;
}
