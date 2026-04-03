// ============================================================
// CrisisAlpha — Propagation Engine
// Spreads risk across the logistics graph using weighted formulas
// ============================================================

import { GraphState, getStatusFromRisk } from '../models/graph';
import { ScenarioConfig, Industry } from '../models/scenario';
import { getNeighborNodes, getEdgesArray, getNodesArray } from './graphService';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
let industriesData: any = null;

function getIndustries() {
  if (!industriesData) {
    industriesData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'industries.json'), 'utf-8')
    );
  }
  return industriesData.industries;
}

// Alpha: how strongly risk spreads between nodes
const ALPHA = 0.25;
// Beta: how strongly resilience dampens risk
const BETA = 0.15;
// Decay rate per tick for natural risk dissipation
const DECAY = 0.02;

export function applyInitialShock(
  graph: GraphState,
  config: ScenarioConfig
): void {
  const industries = getIndustries();
  const industryProfile = industries[config.industry];

  const originNode = graph.nodes.get(config.originNodeId);
  if (!originNode) return;

  // Direct shock to origin
  const shockIntensity =
    0.3 * config.conflictIntensity +
    0.3 * config.fuelShortage +
    0.4 * config.policyRestriction;

  originNode.riskScore = Math.min(1, 0.7 + shockIntensity * 0.3);
  originNode.status = getStatusFromRisk(originNode.riskScore);

  // Apply shock to nearby nodes (1-hop neighbors)
  const neighbors = getNeighborNodes(graph, config.originNodeId);
  for (const neighborId of neighbors) {
    const neighbor = graph.nodes.get(neighborId);
    if (!neighbor) continue;

    // Industry relevance modifies shock
    const industryWeight = neighbor.industryWeights[config.industry] || 0.3;
    const neighborShock = shockIntensity * 0.4 * industryWeight;
    neighbor.riskScore = Math.min(1, neighbor.riskScore + neighborShock);
    neighbor.status = getStatusFromRisk(neighbor.riskScore);
  }

  // Apply shock to edges connected to origin
  const edgeIds = graph.adjacency.get(config.originNodeId) || [];
  for (const edgeId of edgeIds) {
    const edge = graph.edges.get(edgeId);
    if (!edge) continue;

    const fuelFactor = 1 + config.fuelShortage * edge.fuelSensitivity;
    const policyFactor = 1 + config.policyRestriction * edge.policySensitivity;
    edge.riskScore = Math.min(1, shockIntensity * 0.6 * fuelFactor * policyFactor * 0.5);
    edge.status = getStatusFromRisk(edge.riskScore);
  }
}

export function propagateTick(
  graph: GraphState,
  config: ScenarioConfig,
  tick: number
): void {
  const industries = getIndustries();
  const industryProfile = industries[config.industry];

  // Store previous risk scores for computation
  const prevNodeRisks = new Map<string, number>();
  for (const [id, node] of graph.nodes) {
    prevNodeRisks.set(id, node.riskScore);
  }

  // 1. Update node risks based on neighbor propagation
  for (const [nodeId, node] of graph.nodes) {
    const prevRisk = prevNodeRisks.get(nodeId) || 0;
    const neighborIds = getNeighborNodes(graph, nodeId);

    // Sum of neighbor risk weighted by transmission
    let neighborRiskSum = 0;
    let weightSum = 0;
    for (const nId of neighborIds) {
      const nRisk = prevNodeRisks.get(nId) || 0;
      const edge = getEdgeBetweenFromGraph(graph, nodeId, nId);
      const transmissionWeight = edge ? edge.riskTransmissionWeight : 0.5;
      neighborRiskSum += nRisk * transmissionWeight;
      weightSum += transmissionWeight;
    }

    const avgNeighborRisk = weightSum > 0 ? neighborRiskSum / weightSum : 0;

    // Industry relevance multiplier
    const industryWeight = node.industryWeights[config.industry] || 0.3;

    // Crisis factor effects (modulated per tick)
    const localShock = nodeId === config.originNodeId
      ? 0.05 * (config.conflictIntensity + config.fuelShortage) * (1 - tick / (config.durationDays * 2))
      : 0;

    // Apply propagation formula
    const newRisk =
      prevRisk +
      localShock +
      ALPHA * avgNeighborRisk * industryWeight -
      BETA * node.resilienceScore * node.inventoryBuffer -
      DECAY;

    node.riskScore = Math.max(0, Math.min(1, newRisk));
    node.status = getStatusFromRisk(node.riskScore);
  }

  // 2. Update edge risks from connected node conditions
  for (const [edgeId, edge] of graph.edges) {
    const sourceNode = graph.nodes.get(edge.sourceNodeId);
    const targetNode = graph.nodes.get(edge.targetNodeId);
    if (!sourceNode || !targetNode) continue;

    const avgNodeRisk = (sourceNode.riskScore + targetNode.riskScore) / 2;

    // Transport type sensitivity
    const isCriticalTransport = industryProfile.criticalTransportTypes.includes(edge.transportType);
    const transportSensitivity = isCriticalTransport ? 1.3 : 0.8;

    const fuelFactor = 1 + config.fuelShortage * edge.fuelSensitivity * 0.5;
    const policyFactor = 1 + config.policyRestriction * edge.policySensitivity * 0.5;

    edge.riskScore = Math.max(0, Math.min(1,
      avgNodeRisk * transportSensitivity * fuelFactor * policyFactor * 0.7
    ));
    edge.status = getStatusFromRisk(edge.riskScore);
  }
}

function getEdgeBetweenFromGraph(graph: GraphState, nodeA: string, nodeB: string) {
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

// Apply a user decision that modifies graph state
export function applyDecisionEffect(
  graph: GraphState,
  decisionType: string,
  relatedNodeIds: string[],
  relatedEdgeIds: string[]
): void {
  switch (decisionType) {
    case 'reroute':
      // Reduce risk on related edges
      for (const edgeId of relatedEdgeIds) {
        const edge = graph.edges.get(edgeId);
        if (edge) {
          edge.riskScore = Math.max(0, edge.riskScore - 0.2);
          edge.status = getStatusFromRisk(edge.riskScore);
        }
      }
      break;
    case 'inventory_shift':
      // Boost resilience on target nodes
      for (const nodeId of relatedNodeIds) {
        const node = graph.nodes.get(nodeId);
        if (node) {
          node.inventoryBuffer = Math.min(1, node.inventoryBuffer + 0.2);
          node.riskScore = Math.max(0, node.riskScore - 0.15);
          node.status = getStatusFromRisk(node.riskScore);
        }
      }
      break;
    case 'pricing':
      // Increase profit potential by reducing demand pressure
      for (const nodeId of relatedNodeIds) {
        const node = graph.nodes.get(nodeId);
        if (node) {
          node.riskScore = Math.max(0, node.riskScore - 0.1);
          node.status = getStatusFromRisk(node.riskScore);
        }
      }
      break;
  }
}
