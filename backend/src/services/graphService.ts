// ============================================================
// CrisisAlpha — Graph Service
// Loads static data, builds adjacency lists, provides helpers
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { GraphNode, GraphEdge, GraphState, getStatusFromRisk } from '../models/graph';

const DATA_DIR = path.join(__dirname, '..', 'data');

interface CityFeature {
  properties: {
    id: string;
    name: string;
    country: string;
    region: string;
    nodeType: 'city' | 'port' | 'hub';
    industryWeights: Record<string, number>;
    baseDemand: number;
    baseSupply: number;
    inventoryBuffer: number;
    resilienceScore: number;
  };
  geometry: { coordinates: [number, number] };
}

interface RouteFeature {
  properties: {
    id: string;
    source: string;
    target: string;
    transportType: 'sea' | 'road' | 'rail' | 'air';
    capacity: number;
    baseCost: number;
    baseTransitTime: number;
    fuelSensitivity: number;
    policySensitivity: number;
    riskTransmissionWeight: number;
  };
  geometry: { coordinates: number[][] };
}

export function loadGraph(): GraphState {
  const citiesRaw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'cities.geojson'), 'utf-8')
  );
  const routesRaw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'routes.geojson'), 'utf-8')
  );

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const adjacency = new Map<string, string[]>();

  // Load nodes
  for (const feature of citiesRaw.features as CityFeature[]) {
    const p = feature.properties;
    const node: GraphNode = {
      id: p.id,
      name: p.name,
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      country: p.country,
      region: p.region,
      type: p.nodeType,
      industryWeights: p.industryWeights,
      baseDemand: p.baseDemand,
      baseSupply: p.baseSupply,
      inventoryBuffer: p.inventoryBuffer,
      resilienceScore: p.resilienceScore,
      riskScore: 0,
      status: 'safe',
    };
    nodes.set(node.id, node);
    adjacency.set(node.id, []);
  }

  // Load edges
  for (const feature of routesRaw.features as RouteFeature[]) {
    const p = feature.properties;
    const edge: GraphEdge = {
      id: p.id,
      sourceNodeId: p.source,
      targetNodeId: p.target,
      transportType: p.transportType,
      capacity: p.capacity,
      baseCost: p.baseCost,
      baseTransitTime: p.baseTransitTime,
      fuelSensitivity: p.fuelSensitivity,
      policySensitivity: p.policySensitivity,
      riskTransmissionWeight: p.riskTransmissionWeight,
      riskScore: 0,
      status: 'safe',
    };
    edges.set(edge.id, edge);

    // Bidirectional adjacency
    adjacency.get(edge.sourceNodeId)?.push(edge.id);
    adjacency.get(edge.targetNodeId)?.push(edge.id);
  }

  return { nodes, edges, adjacency };
}

export function cloneGraphState(state: GraphState): GraphState {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const adjacency = new Map<string, string[]>();

  for (const [id, node] of state.nodes) {
    nodes.set(id, { ...node, industryWeights: { ...node.industryWeights } });
  }
  for (const [id, edge] of state.edges) {
    edges.set(id, { ...edge });
  }
  for (const [id, edgeIds] of state.adjacency) {
    adjacency.set(id, [...edgeIds]);
  }

  return { nodes, edges, adjacency };
}

export function getNeighborNodes(graph: GraphState, nodeId: string): string[] {
  const edgeIds = graph.adjacency.get(nodeId) || [];
  const neighbors: string[] = [];
  for (const edgeId of edgeIds) {
    const edge = graph.edges.get(edgeId);
    if (!edge) continue;
    const neighbor = edge.sourceNodeId === nodeId ? edge.targetNodeId : edge.sourceNodeId;
    if (!neighbors.includes(neighbor)) neighbors.push(neighbor);
  }
  return neighbors;
}

export function getEdgeBetween(graph: GraphState, nodeA: string, nodeB: string): GraphEdge | undefined {
  const edgeIds = graph.adjacency.get(nodeA) || [];
  for (const edgeId of edgeIds) {
    const edge = graph.edges.get(edgeId);
    if (!edge) continue;
    if (
      (edge.sourceNodeId === nodeA && edge.targetNodeId === nodeB) ||
      (edge.sourceNodeId === nodeB && edge.targetNodeId === nodeA)
    ) {
      return edge;
    }
  }
  return undefined;
}

export function getNodesArray(graph: GraphState): GraphNode[] {
  return Array.from(graph.nodes.values());
}

export function getEdgesArray(graph: GraphState): GraphEdge[] {
  return Array.from(graph.edges.values());
}

// Serialize for frontend
export function serializeNodes(graph: GraphState) {
  return getNodesArray(graph).map(n => ({
    id: n.id,
    name: n.name,
    lat: n.lat,
    lng: n.lng,
    country: n.country,
    region: n.region,
    type: n.type,
    riskScore: Math.round(n.riskScore * 1000) / 1000,
    status: n.status,
    inventoryBuffer: n.inventoryBuffer,
    resilienceScore: n.resilienceScore,
  }));
}

export function serializeEdges(graph: GraphState) {
  return getEdgesArray(graph).map(e => ({
    id: e.id,
    sourceNodeId: e.sourceNodeId,
    targetNodeId: e.targetNodeId,
    transportType: e.transportType,
    riskScore: Math.round(e.riskScore * 1000) / 1000,
    status: e.status,
    capacity: e.capacity,
  }));
}
