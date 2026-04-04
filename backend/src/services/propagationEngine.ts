// ============================================================
// CrisisAlpha — Propagation Engine (v2)
// Enhanced risk propagation with chokepoints, political relations
// ============================================================

import type { GraphState, TradeHubNode, TradeRouteEdge, ChokepointNode } from '../models/graph';
import type { SimulationConfig } from '../models/simulation';
import { getNodeStatusFromRisk, getEdgeStatusFromRisk, clamp } from '../models/graph';
import { getNeighborNodes, getEdgeBetween, getPoliticalRelation, getRoutesThrough } from './graphService';

const DECAY_RATE = 0.02;
const BASE_PROPAGATION_RATE = 0.15;
const CHOKEPOINT_AMPLIFIER = 1.5;

// ── Main Propagation Tick ───────────────────────────────────

export function propagateTick(
  graph: GraphState,
  config: SimulationConfig,
  tick: number,
  industryWeights: Record<string, number>
): void {
  // Phase 1: Apply initial shock (first tick only)
  if (tick === 0) {
    applyInitialShock(graph, config, industryWeights);
  }

  // Phase 2: Propagate chokepoint disruptions to dependent routes
  propagateChokepointImpact(graph);

  // Phase 3: Propagate risk across edges
  propagateEdgeRisk(graph, config, industryWeights);

  // Phase 4: Apply political relation modifiers
  applyPoliticalModifiers(graph, config);

  // Phase 5: Natural decay toward stability
  applyDecay(graph);

  // Phase 6: Update all statuses
  updateStatuses(graph);
}

// ── Initial Shock ───────────────────────────────────────────

function applyInitialShock(graph: GraphState, config: SimulationConfig, industryWeights: Record<string, number>): void {
  // Apply to origin node
  const originNode = graph.nodes.get(config.originNodeId);
  if (originNode) {
    const industrySensitivity = originNode.industryWeights[config.industry] || 0.5;
    const shock = 0.5 +
      config.conflictIntensity * 0.3 +
      config.fuelShortage * 0.15 +
      config.policyRestriction * 0.15;

    originNode.currentRiskScore = clamp(originNode.currentRiskScore + shock * industrySensitivity);
    originNode.activeDisruptions.push(config.id);
  }

  // Apply to all affected hubs from hypothesis
  for (const hubId of config.hypothesis.affectedHubIds) {
    if (hubId === config.originNodeId) continue;
    const hub = graph.nodes.get(hubId);
    if (!hub) continue;

    const industrySensitivity = hub.industryWeights[config.industry] || 0.3;
    const shock = 0.3 +
      config.conflictIntensity * 0.2 +
      config.fuelShortage * 0.1 +
      config.policyRestriction * 0.1;

    hub.currentRiskScore = clamp(hub.currentRiskScore + shock * industrySensitivity);
    hub.activeDisruptions.push(config.id);
  }

  // Apply to affected chokepoints
  for (const cpId of config.hypothesis.affectedChokepoints) {
    const cp = graph.chokepoints.get(cpId);
    if (!cp) continue;

    cp.currentRiskScore = clamp(cp.currentRiskScore + config.conflictIntensity * 0.6 + config.policyRestriction * 0.2);
  }

  // Apply initial mutations from hypothesis
  for (const mutation of config.hypothesis.initialMutations) {
    if (mutation.targetType === 'node') {
      const node = graph.nodes.get(mutation.targetId);
      if (!node) continue;
      if (mutation.property === 'currentRiskScore') {
        if (mutation.operation === 'set') node.currentRiskScore = clamp(mutation.value as number);
        else if (mutation.operation === 'increment') node.currentRiskScore = clamp(node.currentRiskScore + (mutation.value as number));
      }
    } else if (mutation.targetType === 'edge') {
      const edge = graph.edges.get(mutation.targetId);
      if (!edge) continue;
      if (mutation.property === 'currentCapacityPct') {
        if (mutation.operation === 'set') edge.currentCapacityPct = clamp(mutation.value as number);
        else if (mutation.operation === 'multiply') edge.currentCapacityPct = clamp(edge.currentCapacityPct * (mutation.value as number));
      }
    }
  }
}

// ── Chokepoint Impact Propagation ───────────────────────────

function propagateChokepointImpact(graph: GraphState): void {
  for (const [, cp] of graph.chokepoints) {
    if (cp.currentRiskScore <= 0.1) continue;

    // Find all routes passing through this chokepoint
    const affectedRoutes = getRoutesThrough(graph, cp.id);
    for (const route of affectedRoutes) {
      const edge = graph.edges.get(route.id);
      if (!edge) continue;

      // Chokepoint risk amplifies route risk
      const chokepointImpact = cp.currentRiskScore * CHOKEPOINT_AMPLIFIER * edge.geopoliticalSensitivity;
      edge.currentRiskScore = clamp(edge.currentRiskScore + chokepointImpact * 0.1);
      edge.currentCapacityPct = clamp(edge.currentCapacityPct - cp.currentRiskScore * 0.05, 0, 1);
    }
  }
}

// ── Edge-Based Risk Propagation ─────────────────────────────

function propagateEdgeRisk(graph: GraphState, config: SimulationConfig, industryWeights: Record<string, number>): void {
  // Collect deltas (don't modify during iteration)
  const nodeDeltas = new Map<string, number>();
  const edgeDeltas = new Map<string, number>();

  for (const [, edge] of graph.edges) {
    const sourceNode = graph.nodes.get(edge.sourceHubId);
    const targetNode = graph.nodes.get(edge.targetHubId);
    if (!sourceNode || !targetNode) continue;

    // Risk flows bidirectionally weighted by transmission weight
    const riskDiff = sourceNode.currentRiskScore - targetNode.currentRiskScore;
    const transmissionRate = edge.riskTransmissionWeight * BASE_PROPAGATION_RATE;

    // Source → Target
    if (riskDiff > 0.05) {
      const industrySensitivity = targetNode.industryWeights[config.industry] || 0.3;
      const crisisFactors = 1 +
        config.fuelShortage * edge.fuelSensitivity * 0.3 +
        config.policyRestriction * edge.policySensitivity * 0.3 +
        config.conflictIntensity * edge.geopoliticalSensitivity * 0.3;

      const resilienceDamper = 1 - targetNode.resilienceScore * 0.3;
      const delta = riskDiff * transmissionRate * industrySensitivity * crisisFactors * resilienceDamper;

      const existing = nodeDeltas.get(edge.targetHubId) || 0;
      nodeDeltas.set(edge.targetHubId, existing + delta);
    }

    // Target → Source (reverse propagation, weaker)
    if (riskDiff < -0.05) {
      const industrySensitivity = sourceNode.industryWeights[config.industry] || 0.3;
      const resilienceDamper = 1 - sourceNode.resilienceScore * 0.3;
      const delta = Math.abs(riskDiff) * transmissionRate * 0.5 * industrySensitivity * resilienceDamper;

      const existing = nodeDeltas.get(edge.sourceHubId) || 0;
      nodeDeltas.set(edge.sourceHubId, existing + delta);
    }

    // Edge risk is influenced by both endpoints
    const avgEndpointRisk = (sourceNode.currentRiskScore + targetNode.currentRiskScore) / 2;
    const edgeDelta = (avgEndpointRisk - edge.currentRiskScore) * 0.1;
    edgeDeltas.set(edge.id, edgeDelta);
  }

  // Apply deltas
  for (const [nodeId, delta] of nodeDeltas) {
    const node = graph.nodes.get(nodeId);
    if (node) {
      node.currentRiskScore = clamp(node.currentRiskScore + delta);
    }
  }

  for (const [edgeId, delta] of edgeDeltas) {
    const edge = graph.edges.get(edgeId);
    if (edge) {
      edge.currentRiskScore = clamp(edge.currentRiskScore + delta);
      // Capacity inversely proportional to risk
      edge.currentCapacityPct = clamp(1 - edge.currentRiskScore * 0.8, 0.05, 1);
    }
  }
}

// ── Political Relation Modifiers ────────────────────────────

function applyPoliticalModifiers(graph: GraphState, config: SimulationConfig): void {
  const originNode = graph.nodes.get(config.originNodeId);
  if (!originNode) return;

  for (const [, node] of graph.nodes) {
    if (node.id === config.originNodeId) continue;
    if (node.currentRiskScore < 0.05) continue;

    const relation = getPoliticalRelation(graph, originNode.countryId, node.countryId);
    if (!relation) continue;

    // Allied countries: risk dampened
    if (relation.diplomaticScore > 0.5) {
      node.currentRiskScore = clamp(node.currentRiskScore * (1 - relation.diplomaticScore * 0.05));
    }
    // Hostile countries: risk amplified
    else if (relation.diplomaticScore < -0.3) {
      node.currentRiskScore = clamp(node.currentRiskScore * (1 + Math.abs(relation.diplomaticScore) * 0.05));
    }

    // Active sanctions amplify risk further
    if (relation.activeSanctions) {
      node.currentRiskScore = clamp(node.currentRiskScore + config.policyRestriction * 0.02);
    }
  }
}

// ── Decay ───────────────────────────────────────────────────

function applyDecay(graph: GraphState): void {
  for (const [, node] of graph.nodes) {
    if (node.currentRiskScore > 0) {
      const decayRate = DECAY_RATE * node.resilienceScore;
      node.currentRiskScore = clamp(node.currentRiskScore - decayRate);
    }
  }

  for (const [, edge] of graph.edges) {
    if (edge.currentRiskScore > 0) {
      edge.currentRiskScore = clamp(edge.currentRiskScore - DECAY_RATE * 0.5);
    }
  }

  for (const [, cp] of graph.chokepoints) {
    if (cp.currentRiskScore > 0) {
      cp.currentRiskScore = clamp(cp.currentRiskScore - DECAY_RATE * 0.3);
    }
  }
}

// ── Status Updates ──────────────────────────────────────────

function updateStatuses(graph: GraphState): void {
  for (const [, node] of graph.nodes) {
    node.currentStatus = getNodeStatusFromRisk(node.currentRiskScore);
  }
  for (const [, edge] of graph.edges) {
    edge.currentStatus = getEdgeStatusFromRisk(edge.currentRiskScore);
  }
  for (const [, cp] of graph.chokepoints) {
    cp.currentStatus = getNodeStatusFromRisk(cp.currentRiskScore);
  }
}

// ── Decision Application ────────────────────────────────────

export function applyDecision(
  graph: GraphState,
  decisionType: string,
  relatedNodeIds: string[],
  relatedEdgeIds: string[]
): void {
  switch (decisionType) {
    case 'reroute': {
      for (const edgeId of relatedEdgeIds) {
        const edge = graph.edges.get(edgeId);
        if (edge) {
          edge.currentRiskScore = clamp(edge.currentRiskScore * 0.6);
          edge.currentCapacityPct = clamp(edge.currentCapacityPct + 0.2, 0, 1);
        }
      }
      break;
    }
    case 'inventory_shift': {
      for (const nodeId of relatedNodeIds) {
        const node = graph.nodes.get(nodeId);
        if (node) {
          node.currentRiskScore = clamp(node.currentRiskScore * 0.8);
          node.inventoryBufferDays += 3;
        }
      }
      break;
    }
    case 'pricing': {
      for (const nodeId of relatedNodeIds) {
        const node = graph.nodes.get(nodeId);
        if (node) {
          node.currentRiskScore = clamp(node.currentRiskScore * 0.9);
        }
      }
      break;
    }
    case 'activate_backup': {
      for (const nodeId of relatedNodeIds) {
        const node = graph.nodes.get(nodeId);
        if (node) {
          node.currentRiskScore = clamp(node.currentRiskScore * 0.5);
          node.resilienceScore = clamp(node.resilienceScore + 0.1, 0, 1);
        }
      }
      break;
    }
    case 'hedge': {
      for (const nodeId of relatedNodeIds) {
        const node = graph.nodes.get(nodeId);
        if (node) {
          node.currentRiskScore = clamp(node.currentRiskScore * 0.85);
        }
      }
      break;
    }
  }

  updateStatuses(graph);
}
