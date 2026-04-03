// ============================================================
// CrisisAlpha — Shadow Graph Service
// In-memory overlay architecture for simulations
// ============================================================

import type { GraphState, TradeHubNode, TradeRouteEdge, ChokepointNode } from '../models/graph';

// Per-simulation overlay storage
// Maps: simulationId -> nodeId -> partial overrides
const nodeOverlays = new Map<string, Map<string, Partial<TradeHubNode>>>();
const edgeOverlays = new Map<string, Map<string, Partial<TradeRouteEdge>>>();
const chokepointOverlays = new Map<string, Map<string, Partial<ChokepointNode>>>();

// ── Lifecycle ───────────────────────────────────────────────

export function createOverlay(simulationId: string): void {
  nodeOverlays.set(simulationId, new Map());
  edgeOverlays.set(simulationId, new Map());
  chokepointOverlays.set(simulationId, new Map());
}

export function deleteOverlay(simulationId: string): void {
  nodeOverlays.delete(simulationId);
  edgeOverlays.delete(simulationId);
  chokepointOverlays.delete(simulationId);
}

export function hasOverlay(simulationId: string): boolean {
  return nodeOverlays.has(simulationId);
}

// ── Node Overlays ───────────────────────────────────────────

export function setNodeOverride(simulationId: string, nodeId: string, overrides: Partial<TradeHubNode>): void {
  const overlay = nodeOverlays.get(simulationId);
  if (!overlay) return;

  const existing = overlay.get(nodeId) || {};
  overlay.set(nodeId, { ...existing, ...overrides });
}

export function getNodeValue<K extends keyof TradeHubNode>(
  simulationId: string,
  nodeId: string,
  property: K,
  baseGraph: GraphState
): TradeHubNode[K] | undefined {
  const overlay = nodeOverlays.get(simulationId);
  if (overlay) {
    const nodeOverride = overlay.get(nodeId);
    if (nodeOverride && property in nodeOverride) {
      return nodeOverride[property] as TradeHubNode[K];
    }
  }
  const baseNode = baseGraph.nodes.get(nodeId);
  return baseNode ? baseNode[property] : undefined;
}

// ── Edge Overlays ───────────────────────────────────────────

export function setEdgeOverride(simulationId: string, edgeId: string, overrides: Partial<TradeRouteEdge>): void {
  const overlay = edgeOverlays.get(simulationId);
  if (!overlay) return;

  const existing = overlay.get(edgeId) || {};
  overlay.set(edgeId, { ...existing, ...overrides });
}

// ── Chokepoint Overlays ─────────────────────────────────────

export function setChokepointOverride(simulationId: string, cpId: string, overrides: Partial<ChokepointNode>): void {
  const overlay = chokepointOverlays.get(simulationId);
  if (!overlay) return;

  const existing = overlay.get(cpId) || {};
  overlay.set(cpId, { ...existing, ...overrides });
}

// ── Merged View ─────────────────────────────────────────────

export function getMergedGraph(simulationId: string, baseGraph: GraphState): GraphState {
  const nOverlay = nodeOverlays.get(simulationId);
  const eOverlay = edgeOverlays.get(simulationId);
  const cOverlay = chokepointOverlays.get(simulationId);

  // Clone the base graph and apply overlays
  const mergedNodes = new Map<string, TradeHubNode>();
  for (const [id, node] of baseGraph.nodes) {
    const override = nOverlay?.get(id);
    if (override) {
      mergedNodes.set(id, { ...node, industryWeights: { ...node.industryWeights }, activeDisruptions: [...node.activeDisruptions], ...override });
    } else {
      mergedNodes.set(id, { ...node, industryWeights: { ...node.industryWeights }, activeDisruptions: [...node.activeDisruptions] });
    }
  }

  const mergedEdges = new Map<string, TradeRouteEdge>();
  for (const [id, edge] of baseGraph.edges) {
    const override = eOverlay?.get(id);
    if (override) {
      mergedEdges.set(id, { ...edge, passesThrough: [...edge.passesThrough], ...override });
    } else {
      mergedEdges.set(id, { ...edge, passesThrough: [...edge.passesThrough] });
    }
  }

  const mergedChokepoints = new Map<string, ChokepointNode>();
  for (const [id, cp] of baseGraph.chokepoints) {
    const override = cOverlay?.get(id);
    if (override) {
      mergedChokepoints.set(id, { ...cp, alternatives: [...cp.alternatives], vulnerabilities: [...cp.vulnerabilities], ...override });
    } else {
      mergedChokepoints.set(id, { ...cp, alternatives: [...cp.alternatives], vulnerabilities: [...cp.vulnerabilities] });
    }
  }

  // Clone adjacency
  const adjacency = new Map<string, string[]>();
  for (const [id, edgeIds] of baseGraph.adjacency) {
    adjacency.set(id, [...edgeIds]);
  }

  return {
    nodes: mergedNodes,
    edges: mergedEdges,
    adjacency,
    countries: baseGraph.countries,
    chokepoints: mergedChokepoints,
    regions: baseGraph.regions,
    politicalRelations: baseGraph.politicalRelations,
  };
}

// ── Write back to overlay from merged graph ─────────────────

export function writeBackToOverlay(simulationId: string, mergedGraph: GraphState, baseGraph: GraphState): void {
  for (const [id, node] of mergedGraph.nodes) {
    const baseNode = baseGraph.nodes.get(id);
    if (!baseNode) continue;

    // Only store if values differ from base
    if (node.currentRiskScore !== baseNode.currentRiskScore || node.currentStatus !== baseNode.currentStatus) {
      setNodeOverride(simulationId, id, {
        currentRiskScore: node.currentRiskScore,
        currentStatus: node.currentStatus,
        activeDisruptions: node.activeDisruptions,
      });
    }
  }

  for (const [id, edge] of mergedGraph.edges) {
    const baseEdge = baseGraph.edges.get(id);
    if (!baseEdge) continue;

    if (edge.currentRiskScore !== baseEdge.currentRiskScore || edge.currentStatus !== baseEdge.currentStatus) {
      setEdgeOverride(simulationId, id, {
        currentRiskScore: edge.currentRiskScore,
        currentStatus: edge.currentStatus,
        currentCapacityPct: edge.currentCapacityPct,
      });
    }
  }

  for (const [id, cp] of mergedGraph.chokepoints) {
    const baseCp = baseGraph.chokepoints.get(id);
    if (!baseCp) continue;

    if (cp.currentRiskScore !== baseCp.currentRiskScore || cp.currentStatus !== baseCp.currentStatus) {
      setChokepointOverride(simulationId, id, {
        currentRiskScore: cp.currentRiskScore,
        currentStatus: cp.currentStatus,
      });
    }
  }
}

// ── Stats ───────────────────────────────────────────────────

export function getOverlayStats(simulationId: string) {
  const nOverlay = nodeOverlays.get(simulationId);
  const eOverlay = edgeOverlays.get(simulationId);
  const cOverlay = chokepointOverlays.get(simulationId);

  return {
    overriddenNodes: nOverlay?.size || 0,
    overriddenEdges: eOverlay?.size || 0,
    overriddenChokepoints: cOverlay?.size || 0,
  };
}
