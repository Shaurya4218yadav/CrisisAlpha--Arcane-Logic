// ============================================================
// CrisisAlpha — Graph Models (v2)
// Full type system aligned to ARCHITECTURE.md
// ============================================================

// ── Node Types ──────────────────────────────────────────────

export type NodeStatus = 'operational' | 'stressed' | 'disrupted' | 'shutdown';
export type EdgeStatus = 'operational' | 'stressed' | 'disrupted' | 'broken';
export type TransportType = 'sea' | 'road' | 'rail' | 'air' | 'pipeline';
export type HubType = 'port' | 'airport' | 'hub' | 'factory_zone' | 'city';

export interface TradeHubNode {
  id: string;
  name: string;
  type: HubType;
  lat: number;
  lng: number;
  countryId: string;
  regionId: string;

  // Economic properties
  annualThroughput: number;          // TEU or tons (relative scale 0-100)
  industryWeights: Record<string, number>;
  gdpContribution: number;          // relative economic importance 0-1

  // Resilience properties
  infrastructureQuality: number;    // 0-1
  alternativeRoutes: number;        // count of backup paths
  inventoryBufferDays: number;      // avg days of buffer stock
  resilienceScore: number;          // computed: 0-1

  // Demand/Supply
  baseDemand: number;               // 0-100 scale
  baseSupply: number;               // 0-100 scale

  // Dynamic state (updated by events & propagation)
  currentRiskScore: number;         // 0-1
  currentStatus: NodeStatus;
  activeDisruptions: string[];      // IDs of active events affecting this node
}

export interface CountryNode {
  id: string;                        // ISO 3166-1 alpha-2 code
  name: string;
  region: string;
  gdpBillions: number;
  population: number;
  majorIndustries: string[];
  tradeOpenness: number;             // 0-1
  politicalStability: number;        // 0-1
}

export interface ChokepointNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  type: 'canal' | 'strait' | 'passage';
  throughputPct: number;             // % of global trade that passes through
  alternatives: string[];            // IDs of alternative chokepoints/routes
  vulnerabilities: string[];         // e.g., "conflict", "weather", "infrastructure"
  currentRiskScore: number;
  currentStatus: NodeStatus;
}

export interface RegionNode {
  id: string;
  name: string;
  countries: string[];               // country IDs in this region
  primaryIndustries: string[];
}

// ── Edge Types ──────────────────────────────────────────────

export interface TradeRouteEdge {
  id: string;
  sourceHubId: string;
  targetHubId: string;
  transportType: TransportType;

  // Capacity & cost
  capacity: number;                  // units/day (0-100 scale)
  baseCostPerUnit: number;
  baseTransitDays: number;

  // Sensitivity factors (0-1)
  fuelSensitivity: number;
  policySensitivity: number;
  weatherSensitivity: number;
  geopoliticalSensitivity: number;

  // Propagation
  riskTransmissionWeight: number;    // how strongly risk spreads along this edge

  // Chokepoint dependency
  passesThrough: string[];           // chokepoint IDs this route depends on

  // Dynamic state
  currentRiskScore: number;
  currentStatus: EdgeStatus;
  currentCapacityPct: number;        // remaining capacity as % of base (0-1)
}

export interface PoliticalRelation {
  countryA: string;                  // country ID
  countryB: string;
  relationType: 'ally' | 'neutral' | 'rival' | 'hostile' | 'sanctioned';
  diplomaticScore: number;           // -1 (hostile) to +1 (strong ally)
  tradeAgreement: string | null;     // "RCEP", "EU Single Market", etc.
  activeSanctions: boolean;
  sanctionDetails?: {
    goodsAffected: string[];
    severity: 'partial' | 'full';
    since: string;                   // ISO date
  };
}

// ── Graph State Container ───────────────────────────────────

export interface GraphState {
  nodes: Map<string, TradeHubNode>;
  edges: Map<string, TradeRouteEdge>;
  adjacency: Map<string, string[]>;  // nodeId -> [edgeIds]
  countries: Map<string, CountryNode>;
  chokepoints: Map<string, ChokepointNode>;
  regions: Map<string, RegionNode>;
  politicalRelations: PoliticalRelation[];
}

// ── Utilities ───────────────────────────────────────────────

export function getNodeStatusFromRisk(risk: number): NodeStatus {
  if (risk >= 0.8) return 'shutdown';
  if (risk >= 0.6) return 'disrupted';
  if (risk >= 0.3) return 'stressed';
  return 'operational';
}

export function getEdgeStatusFromRisk(risk: number): EdgeStatus {
  if (risk >= 0.8) return 'broken';
  if (risk >= 0.6) return 'disrupted';
  if (risk >= 0.3) return 'stressed';
  return 'operational';
}

export function clamp(value: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}
