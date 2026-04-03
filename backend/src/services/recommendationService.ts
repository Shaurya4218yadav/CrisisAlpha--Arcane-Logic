// ============================================================
// CrisisAlpha — Recommendation Service
// Generates heuristic-based action suggestions
// ============================================================

import { GraphState } from '../models/graph';
import { ScenarioConfig, Recommendation } from '../models/scenario';
import { getNeighborNodes, getNodesArray, getEdgesArray } from './graphService';
import { v4 as uuid } from 'uuid';

export function generateRecommendations(
  graph: GraphState,
  config: ScenarioConfig,
  tick: number
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Rerouting recommendations
  const brokenOrRiskyEdges = getEdgesArray(graph).filter(e => e.riskScore >= 0.6);
  const safeEdges = getEdgesArray(graph).filter(e => e.riskScore < 0.3);

  for (const riskyEdge of brokenOrRiskyEdges.slice(0, 2)) {
    const sourceNode = graph.nodes.get(riskyEdge.sourceNodeId);
    const targetNode = graph.nodes.get(riskyEdge.targetNodeId);

    // Find alternate paths through safer nodes
    const saferAlternatives = safeEdges.filter(se =>
      se.sourceNodeId === riskyEdge.sourceNodeId ||
      se.targetNodeId === riskyEdge.sourceNodeId ||
      se.sourceNodeId === riskyEdge.targetNodeId ||
      se.targetNodeId === riskyEdge.targetNodeId
    );

    if (saferAlternatives.length > 0) {
      const alt = saferAlternatives[0];
      const altSource = graph.nodes.get(alt.sourceNodeId);
      const altTarget = graph.nodes.get(alt.targetNodeId);

      recommendations.push({
        id: `rec_${uuid().slice(0, 8)}`,
        type: 'reroute',
        title: `Reroute via ${altTarget?.name || altSource?.name || 'safer corridor'}`,
        description: `Avoid the disrupted ${sourceNode?.name}–${targetNode?.name} route. Redirect through ${altTarget?.name || altSource?.name} corridor to reduce risk exposure.`,
        impact: {
          riskReduction: Math.round((riskyEdge.riskScore - alt.riskScore) * 100) / 100,
          costIncrease: Math.round((alt.baseCost / riskyEdge.baseCost - 1) * 100) / 100,
          profitGain: 0,
        },
        relatedNodeIds: [riskyEdge.sourceNodeId, riskyEdge.targetNodeId],
        relatedEdgeIds: [riskyEdge.id, alt.id],
      });
    }
  }

  // 2. Inventory shift recommendations
  const riskyNodes = getNodesArray(graph)
    .filter(n => n.riskScore >= 0.5)
    .sort((a, b) => b.riskScore - a.riskScore);

  const safeNodes = getNodesArray(graph)
    .filter(n => n.riskScore < 0.25 && n.baseDemand > 50)
    .sort((a, b) => a.riskScore - b.riskScore);

  if (riskyNodes.length > 0 && safeNodes.length > 0) {
    const fromNode = riskyNodes[0];
    const toNode = safeNodes[0];

    recommendations.push({
      id: `rec_${uuid().slice(0, 8)}`,
      type: 'inventory_shift',
      title: `Shift inventory to ${toNode.name}`,
      description: `Move critical inventory from ${fromNode.name} (risk: ${(fromNode.riskScore * 100).toFixed(0)}%) to ${toNode.name} (risk: ${(toNode.riskScore * 100).toFixed(0)}%) to maintain supply chain continuity.`,
      impact: {
        riskReduction: Math.round((fromNode.riskScore - toNode.riskScore) * 0.5 * 100) / 100,
        costIncrease: 0.08,
        profitGain: 0,
      },
      relatedNodeIds: [fromNode.id, toNode.id],
      relatedEdgeIds: [],
    });
  }

  // 3. Dynamic pricing recommendations
  const demandSpikes = getNodesArray(graph)
    .filter(n => n.riskScore < 0.3 && n.baseDemand > 60);

  const hasNearbyDisruption = demandSpikes.filter(n => {
    const neighbors = getNeighborNodes(graph, n.id);
    return neighbors.some(nId => {
      const neighbor = graph.nodes.get(nId);
      return neighbor && neighbor.riskScore >= 0.5;
    });
  });

  if (hasNearbyDisruption.length > 0) {
    const targetNode = hasNearbyDisruption[0];
    recommendations.push({
      id: `rec_${uuid().slice(0, 8)}`,
      type: 'pricing',
      title: `Increase pricing at ${targetNode.name}`,
      description: `Demand at ${targetNode.name} is rising due to nearby disruptions. Increase pricing to capture profit opportunity while supply routes remain operational.`,
      impact: {
        riskReduction: 0,
        costIncrease: 0,
        profitGain: Math.round((targetNode.baseDemand / 100) * 0.25 * 100) / 100,
      },
      relatedNodeIds: [targetNode.id],
      relatedEdgeIds: [],
    });
  }

  return recommendations.slice(0, 4); // Max 4 recommendations at a time
}
