// ============================================================
// CrisisAlpha — Graph Service (v2)
// Loads expanded data, builds graph, pathfinding, queries
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import {
  TradeHubNode, TradeRouteEdge, CountryNode, ChokepointNode, RegionNode,
  PoliticalRelation, GraphState,
  getNodeStatusFromRisk, getEdgeStatusFromRisk, clamp,
} from '../models/graph';

const DATA_DIR = path.join(__dirname, '..', 'data');

// ── Cached global base graph ────────────────────────────────

let cachedBaseGraph: GraphState | null = null;

export function loadGraph(): GraphState {
  if (cachedBaseGraph) return cachedBaseGraph;

  const hubsRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trade_hubs.json'), 'utf-8'));
  const routesRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trade_routes.json'), 'utf-8'));
  const chokepointsRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'chokepoints.json'), 'utf-8'));
  const relationsRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'political_relations.json'), 'utf-8'));

  const nodes = new Map<string, TradeHubNode>();
  const edges = new Map<string, TradeRouteEdge>();
  const adjacency = new Map<string, string[]>();
  const countries = new Map<string, CountryNode>();
  const chokepoints = new Map<string, ChokepointNode>();
  const regions = new Map<string, RegionNode>();
  const politicalRelations: PoliticalRelation[] = relationsRaw.relations || [];

  // Load hubs
  for (const h of hubsRaw.hubs) {
    const node: TradeHubNode = {
      id: h.id,
      name: h.name,
      type: h.type,
      lat: h.lat,
      lng: h.lng,
      countryId: h.countryId,
      regionId: h.regionId,
      annualThroughput: h.annualThroughput,
      industryWeights: h.industryWeights || {},
      gdpContribution: h.gdpContribution,
      infrastructureQuality: h.infrastructureQuality,
      alternativeRoutes: h.alternativeRoutes,
      inventoryBufferDays: h.inventoryBufferDays,
      resilienceScore: h.resilienceScore,
      baseDemand: h.baseDemand,
      baseSupply: h.baseSupply,
      currentRiskScore: 0,
      currentStatus: 'operational',
      activeDisruptions: [],
    };
    nodes.set(node.id, node);
    adjacency.set(node.id, []);

    // Auto-generate region entries
    if (!regions.has(h.regionId)) {
      regions.set(h.regionId, {
        id: h.regionId,
        name: h.regionId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        countries: [],
        primaryIndustries: [],
      });
    }
  }

  // Load routes
  for (const r of routesRaw.routes) {
    const edge: TradeRouteEdge = {
      id: r.id,
      sourceHubId: r.sourceHubId,
      targetHubId: r.targetHubId,
      transportType: r.transportType,
      capacity: r.capacity,
      baseCostPerUnit: r.baseCostPerUnit,
      baseTransitDays: r.baseTransitDays,
      fuelSensitivity: r.fuelSensitivity,
      policySensitivity: r.policySensitivity,
      weatherSensitivity: r.weatherSensitivity,
      geopoliticalSensitivity: r.geopoliticalSensitivity,
      riskTransmissionWeight: r.riskTransmissionWeight,
      passesThrough: r.passesThrough || [],
      currentRiskScore: 0,
      currentStatus: 'operational',
      currentCapacityPct: 1.0,
    };
    edges.set(edge.id, edge);

    // Build adjacency (bidirectional)
    const srcAdj = adjacency.get(edge.sourceHubId);
    if (srcAdj) srcAdj.push(edge.id);
    const tgtAdj = adjacency.get(edge.targetHubId);
    if (tgtAdj) tgtAdj.push(edge.id);
  }

  // Load chokepoints
  for (const c of chokepointsRaw.chokepoints) {
    const cp: ChokepointNode = {
      id: c.id,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      region: c.region,
      type: c.type,
      throughputPct: c.throughputPct,
      alternatives: c.alternatives || [],
      vulnerabilities: c.vulnerabilities || [],
      currentRiskScore: 0,
      currentStatus: 'operational',
    };
    chokepoints.set(cp.id, cp);
  }

  cachedBaseGraph = { nodes, edges, adjacency, countries, chokepoints, regions, politicalRelations };
  return cachedBaseGraph;
}

// ── Graph Cloning ───────────────────────────────────────────

export function cloneGraphState(state: GraphState): GraphState {
  const nodes = new Map<string, TradeHubNode>();
  const edges = new Map<string, TradeRouteEdge>();
  const adjacency = new Map<string, string[]>();
  const chokepoints = new Map<string, ChokepointNode>();

  for (const [id, node] of state.nodes) {
    nodes.set(id, { ...node, industryWeights: { ...node.industryWeights }, activeDisruptions: [...node.activeDisruptions] });
  }
  for (const [id, edge] of state.edges) {
    edges.set(id, { ...edge, passesThrough: [...edge.passesThrough] });
  }
  for (const [id, edgeIds] of state.adjacency) {
    adjacency.set(id, [...edgeIds]);
  }
  for (const [id, cp] of state.chokepoints) {
    chokepoints.set(id, { ...cp, alternatives: [...cp.alternatives], vulnerabilities: [...cp.vulnerabilities] });
  }

  return {
    nodes,
    edges,
    adjacency,
    countries: state.countries,
    chokepoints,
    regions: state.regions,
    politicalRelations: state.politicalRelations,
  };
}

// ── Graph Queries ───────────────────────────────────────────

export function getNeighborNodes(graph: GraphState, nodeId: string): string[] {
  const edgeIds = graph.adjacency.get(nodeId) || [];
  const neighbors: string[] = [];
  for (const edgeId of edgeIds) {
    const edge = graph.edges.get(edgeId);
    if (!edge) continue;
    const neighbor = edge.sourceHubId === nodeId ? edge.targetHubId : edge.sourceHubId;
    if (!neighbors.includes(neighbor)) neighbors.push(neighbor);
  }
  return neighbors;
}

export function getEdgeBetween(graph: GraphState, nodeA: string, nodeB: string): TradeRouteEdge | undefined {
  const edgeIds = graph.adjacency.get(nodeA) || [];
  for (const edgeId of edgeIds) {
    const edge = graph.edges.get(edgeId);
    if (!edge) continue;
    if (
      (edge.sourceHubId === nodeA && edge.targetHubId === nodeB) ||
      (edge.sourceHubId === nodeB && edge.targetHubId === nodeA)
    ) {
      return edge;
    }
  }
  return undefined;
}

export function getNodesArray(graph: GraphState): TradeHubNode[] {
  return Array.from(graph.nodes.values());
}

export function getEdgesArray(graph: GraphState): TradeRouteEdge[] {
  return Array.from(graph.edges.values());
}

// ── Shortest Hop Distance (BFS) — for Causality Filter Tier 1 ──

export function shortestHopDistance(graph: GraphState, startNodeId: string, targetNodeIds: Set<string>): number {
  if (targetNodeIds.has(startNodeId)) return 0;

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; hops: number }> = [{ nodeId: startNodeId, hops: 0 }];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const { nodeId, hops } = queue.shift()!;
    const neighbors = getNeighborNodes(graph, nodeId);

    for (const nId of neighbors) {
      if (targetNodeIds.has(nId)) return hops + 1;
      if (!visited.has(nId)) {
        visited.add(nId);
        queue.push({ nodeId: nId, hops: hops + 1 });
      }
    }
  }

  return Infinity; // unreachable
}

// ── Find all paths between two nodes (limited depth DFS) ────

export function findPathsBetween(
  graph: GraphState,
  fromId: string,
  toId: string,
  maxDepth: number = 5
): string[][] {
  const paths: string[][] = [];
  const dfs = (current: string, target: string, path: string[], depth: number) => {
    if (current === target) {
      paths.push([...path]);
      return;
    }
    if (depth >= maxDepth) return;

    const neighbors = getNeighborNodes(graph, current);
    for (const n of neighbors) {
      if (!path.includes(n)) {
        path.push(n);
        dfs(n, target, path, depth + 1);
        path.pop();
      }
    }
  };

  dfs(fromId, toId, [fromId], 0);
  return paths;
}

// ── Political Relation Lookup ───────────────────────────────

export function getPoliticalRelation(graph: GraphState, countryA: string, countryB: string): PoliticalRelation | undefined {
  return graph.politicalRelations.find(r =>
    (r.countryA === countryA && r.countryB === countryB) ||
    (r.countryA === countryB && r.countryB === countryA)
  );
}

// ── Chokepoint Impact ───────────────────────────────────────

export function getRoutesThrough(graph: GraphState, chokepointId: string): TradeRouteEdge[] {
  return getEdgesArray(graph).filter(e => e.passesThrough.includes(chokepointId));
}

// ── Serialization for Frontend ──────────────────────────────

export function serializeNodes(graph: GraphState) {
  return getNodesArray(graph).map(n => ({
    id: n.id,
    name: n.name,
    lat: n.lat,
    lng: n.lng,
    country: n.countryId,
    region: n.regionId,
    type: n.type,
    riskScore: Math.round(n.currentRiskScore * 1000) / 1000,
    status: n.currentStatus,
    inventoryBufferDays: n.inventoryBufferDays,
    resilienceScore: n.resilienceScore,
    annualThroughput: n.annualThroughput,
    industryWeights: n.industryWeights,
    baseDemand: n.baseDemand,
    baseSupply: n.baseSupply,
    activeDisruptions: n.activeDisruptions,
  }));
}

export function serializeEdges(graph: GraphState) {
  return getEdgesArray(graph).map(e => ({
    id: e.id,
    sourceNodeId: e.sourceHubId,
    targetNodeId: e.targetHubId,
    transportType: e.transportType,
    riskScore: Math.round(e.currentRiskScore * 1000) / 1000,
    status: e.currentStatus,
    capacity: e.capacity,
    capacityPct: Math.round(e.currentCapacityPct * 100) / 100,
    baseTransitDays: e.baseTransitDays,
    passesThrough: e.passesThrough,
  }));
}

export function serializeChokepoints(graph: GraphState) {
  return Array.from(graph.chokepoints.values()).map(c => ({
    id: c.id,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    region: c.region,
    type: c.type,
    throughputPct: c.throughputPct,
    riskScore: Math.round(c.currentRiskScore * 1000) / 1000,
    status: c.currentStatus,
    alternatives: c.alternatives,
    vulnerabilities: c.vulnerabilities,
  }));
}

export function serializePoliticalRelations(graph: GraphState) {
  return graph.politicalRelations.map(r => ({
    countryA: r.countryA,
    countryB: r.countryB,
    relationType: r.relationType,
    diplomaticScore: r.diplomaticScore,
    tradeAgreement: r.tradeAgreement,
    activeSanctions: r.activeSanctions,
  }));
}
