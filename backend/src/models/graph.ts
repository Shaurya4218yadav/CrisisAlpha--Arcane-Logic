// ============================================================
// CrisisAlpha — Graph Models
// ============================================================

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  region: string;
  type: 'city' | 'port' | 'hub';
  industryWeights: Record<string, number>;
  baseDemand: number;
  baseSupply: number;
  inventoryBuffer: number;
  resilienceScore: number;
  // Dynamic state
  riskScore: number;
  status: 'safe' | 'stressed' | 'risky' | 'broken';
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  transportType: 'sea' | 'road' | 'rail' | 'air';
  capacity: number;
  baseCost: number;
  baseTransitTime: number;
  fuelSensitivity: number;
  policySensitivity: number;
  riskTransmissionWeight: number;
  // Dynamic state
  riskScore: number;
  status: 'safe' | 'stressed' | 'risky' | 'broken';
}

export interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  adjacency: Map<string, string[]>; // nodeId -> [edgeIds]
}

export function getStatusFromRisk(risk: number): 'safe' | 'stressed' | 'risky' | 'broken' {
  if (risk >= 0.8) return 'broken';
  if (risk >= 0.6) return 'risky';
  if (risk >= 0.3) return 'stressed';
  return 'safe';
}
