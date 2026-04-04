// ============================================================
// CrisisAlpha — Simulation Models (v2)
// What-If engine types: hypothesis, axioms, sessions, scoring
// ============================================================

import type { SimulationEvent, GraphMutation } from './event';

// ── Industries ──────────────────────────────────────────────

export type Industry = 'automotive' | 'energy' | 'pharma' | 'consumer_goods' | 'semiconductors' | 'agriculture' | 'textiles';
export type UserGoal = 'resilience' | 'profit' | 'balanced';

// ── Simulation Configuration ────────────────────────────────

export interface SimulationConfig {
  id: string;
  userId: string;
  createdAt: string;

  // The hypothetical event
  hypothesis: SimulationHypothesis;

  // Axioms — immutable rules of this simulation
  axioms: SimulationAxiom[];

  // Crisis parameters (legacy compat + quick setup)
  originNodeId: string;
  industry: Industry;
  conflictIntensity: number;     // 0-1
  fuelShortage: number;          // 0-1
  policyRestriction: number;     // 0-1

  // Execution parameters
  durationDays: number;
  tickIntervalHours: number;     // simulated hours per tick
  forkTimestamp: string;         // ISO timestamp where sim diverges from reality
}

export interface SimulationHypothesis {
  title: string;                 // "War in South China Sea"
  description: string;           // detailed scenario description
  category: string;              // "conflict", "disaster", "policy", etc.
  affectedHubIds: string[];      // ground zero nodes
  affectedCountries: string[];
  affectedChokepoints: string[];
  initialMutations: GraphMutation[];
}

export interface SimulationAxiom {
  id: string;
  statement: string;             // "US and China are in active military conflict"
  type: 'block_category' | 'block_relationship' | 'enforce_state' | 'custom';

  // Structured axioms (faster Tier 1/2 filtering)
  blockedCountries?: string[];
  blockedCategories?: string[];
  enforcedStates?: Array<{
    targetId: string;
    property: string;
    value: any;
  }>;

  // For Tier 3 (LLM-evaluated)
  naturalLanguage: string;
}

// ── Simulation Session ──────────────────────────────────────

export type SimulationStatus = 'created' | 'running' | 'paused' | 'completed';

export interface SimulationSession {
  id: string;
  config: SimulationConfig;
  currentTick: number;
  maxTicks: number;
  status: SimulationStatus;
  createdAt: number;
  decisions: Decision[];
}

export interface Decision {
  id: string;
  tick: number;
  type: 'reroute' | 'inventory_shift' | 'pricing' | 'activate_backup' | 'hedge';
  recommendationId: string;
  appliedAt: number;
}

// ── Recommendations ─────────────────────────────────────────

export interface Recommendation {
  id: string;
  type: 'reroute' | 'inventory_shift' | 'pricing' | 'activate_backup' | 'hedge';
  title: string;
  description: string;
  urgency: 'immediate' | 'soon' | 'monitor';
  timeHorizon: string;           // "Act now to prevent X in 7 days"
  impact: {
    riskReduction: number;
    costIncrease: number;
    profitGain: number;
    delayReduction: number;      // days saved
  };
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  relatedAttachmentIds: string[];
}

// ── Scoring ─────────────────────────────────────────────────

export interface ScoreSnapshot {
  riskAvoided: number;           // 0-100
  profitGained: number;          // 0-100
  networkEfficiency: number;     // 0-100
  demandServed: number;          // 0-100
  routeFailures: number;        // count
  chokePointsAffected: number;  // count
  overallScore: number;          // 0-100
  projectedImpactDays: number;  // how many days until major impact
}

// ── Tick Payload (sent to frontend via WebSocket) ───────────

export interface TickPayload {
  simulationId: string;
  tick: number;
  dayLabel: string;
  nodes: Array<{
    id: string;
    riskScore: number;
    status: string;
    capacityPct?: number;
  }>;
  edges: Array<{
    id: string;
    riskScore: number;
    status: string;
    capacityPct?: number;
  }>;
  chokepoints: Array<{
    id: string;
    riskScore: number;
    status: string;
  }>;
  events: SimulationEvent[];
  recommendations: Recommendation[];
  score: ScoreSnapshot;
  isComplete: boolean;
}

// ── Causality Filter ────────────────────────────────────────

export type CausalityDecision = 'PASS' | 'MODIFY' | 'BLOCK';

export interface CausalityResult {
  decision: CausalityDecision;
  reason: string;
  modification?: string;
  tier: 1 | 2 | 3;
  confidence: number;            // 0-1
}

// ── Legacy compatibility (maps old ScenarioConfig to new) ───

export interface LegacyScenarioConfig {
  originNodeId: string;
  industry: Industry;
  conflictIntensity: number;
  fuelShortage: number;
  policyRestriction: number;
  durationDays: number;
  userGoal: UserGoal;
}

export function legacyToSimulationConfig(legacy: LegacyScenarioConfig, userId: string = 'anonymous'): SimulationConfig {
  return {
    id: '',
    userId,
    createdAt: new Date().toISOString(),
    hypothesis: {
      title: `Crisis at ${legacy.originNodeId}`,
      description: `Simulated crisis scenario at ${legacy.originNodeId} for ${legacy.industry} industry`,
      category: 'conflict',
      affectedHubIds: [legacy.originNodeId],
      affectedCountries: [],
      affectedChokepoints: [],
      initialMutations: [],
    },
    axioms: [],
    originNodeId: legacy.originNodeId,
    industry: legacy.industry,
    conflictIntensity: legacy.conflictIntensity,
    fuelShortage: legacy.fuelShortage,
    policyRestriction: legacy.policyRestriction,
    durationDays: legacy.durationDays,
    tickIntervalHours: 24,
    forkTimestamp: new Date().toISOString(),
  };
}
