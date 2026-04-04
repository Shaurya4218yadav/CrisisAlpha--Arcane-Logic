// ============================================================
// CrisisAlpha — Recommendation Service (v2)
// Attachment-aware, time-horizon recommendations
// ============================================================

import { v4 as uuid } from 'uuid';
import type { GraphState } from '../models/graph';
import type { SimulationConfig, Recommendation } from '../models/simulation';
import type { UserProfile } from '../models/user';
import { getNeighborNodes, findPathsBetween } from './graphService';
import { getProfile } from './userContextService';

// ── Generate Recommendations ────────────────────────────────

export function generateRecommendations(
  graph: GraphState,
  config: SimulationConfig,
  tick: number,
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const profile = getProfile(config.userId);

  // Rerouting recommendations for disrupted edges
  recommendations.push(...generateRerouteRecommendations(graph, config));

  // Inventory shift recommendations for at-risk nodes
  recommendations.push(...generateInventoryRecommendations(graph, config, profile));

  // Pricing recommendations for demand spikes
  recommendations.push(...generatePricingRecommendations(graph, config));

  // Backup activation for critical attachment points
  if (profile) {
    recommendations.push(...generateBackupRecommendations(graph, config, profile));
  }

  // Hedge recommendations
  recommendations.push(...generateHedgeRecommendations(graph, config, profile));

  return recommendations.slice(0, 5); // top 5 recommendations per tick
}

// ── Reroute Recommendations ─────────────────────────────────

function generateRerouteRecommendations(graph: GraphState, config: SimulationConfig): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const [, edge] of graph.edges) {
    if (edge.currentRiskScore < 0.5) continue;

    const sourceNode = graph.nodes.get(edge.sourceHubId);
    const targetNode = graph.nodes.get(edge.targetHubId);
    if (!sourceNode || !targetNode) continue;

    // Find alternative paths
    const altPaths = findPathsBetween(graph, edge.sourceHubId, edge.targetHubId, 4);
    const safePaths = altPaths.filter(path => {
      // Check if path avoids the disrupted edge
      for (let i = 0; i < path.length - 1; i++) {
        if (
          (path[i] === edge.sourceHubId && path[i + 1] === edge.targetHubId) ||
          (path[i] === edge.targetHubId && path[i + 1] === edge.sourceHubId)
        ) return false;
      }
      return true;
    });

    if (safePaths.length > 0) {
      const bestAlt = safePaths[0];
      const riskReduction = edge.currentRiskScore * 0.4;
      const costIncrease = (bestAlt.length - 2) * 15; // extra hops = extra cost

      recs.push({
        id: `rec_${uuid().slice(0, 8)}`,
        type: 'reroute',
        title: `Reroute: ${sourceNode.name} → ${targetNode.name}`,
        description: `Redirect ${config.industry} cargo via ${bestAlt.map(id => graph.nodes.get(id)?.name || id).join(' → ')} to avoid ${Math.round(edge.currentRiskScore * 100)}% risk zone.`,
        urgency: edge.currentRiskScore >= 0.7 ? 'immediate' : 'soon',
        timeHorizon: `Act within ${Math.max(1, Math.round(edge.baseTransitDays * 0.5))} days to avoid ${Math.round(edge.baseTransitDays * 1.5)}-day delays`,
        impact: {
          riskReduction: Math.round(riskReduction * 100) / 100,
          costIncrease: Math.round(costIncrease),
          profitGain: 0,
          delayReduction: Math.round(edge.baseTransitDays * 0.3),
        },
        relatedNodeIds: [edge.sourceHubId, edge.targetHubId],
        relatedEdgeIds: [edge.id],
        relatedAttachmentIds: [],
      });
    }
  }

  return recs.sort((a, b) => {
    const urgencyOrder = { immediate: 0, soon: 1, monitor: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  }).slice(0, 2);
}

// ── Inventory Recommendations ───────────────────────────────

function generateInventoryRecommendations(
  graph: GraphState,
  config: SimulationConfig,
  profile: UserProfile | null
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const [, node] of graph.nodes) {
    if (node.currentRiskScore < 0.4 || node.currentRiskScore >= 0.8) continue;

    // Only recommend for nodes relevant to user
    const isUserRelevant = profile?.attachmentPoints.some(ap => ap.hubId === node.id);
    const industrySensitivity = node.industryWeights[config.industry] || 0;

    if (!isUserRelevant && industrySensitivity < 0.5) continue;

    const bufferDays = node.inventoryBufferDays;
    const riskLevel = Math.round(node.currentRiskScore * 100);

    recs.push({
      id: `rec_${uuid().slice(0, 8)}`,
      type: 'inventory_shift',
      title: `Inventory Buffer: ${node.name}`,
      description: `${node.name} at ${riskLevel}% risk with ${bufferDays}-day buffer. Pre-position 3-5 days of additional ${config.industry} inventory at nearby safe hub.`,
      urgency: node.currentRiskScore >= 0.6 ? 'immediate' : 'soon',
      timeHorizon: `Buffer projected to deplete in ${bufferDays} days if disruption continues`,
      impact: {
        riskReduction: 0.15,
        costIncrease: 20,
        profitGain: 10,
        delayReduction: 3,
      },
      relatedNodeIds: [node.id],
      relatedEdgeIds: [],
      relatedAttachmentIds: profile?.attachmentPoints.filter(ap => ap.hubId === node.id).map(ap => ap.id) || [],
    });
  }

  return recs.slice(0, 2);
}

// ── Pricing Recommendations ─────────────────────────────────

function generatePricingRecommendations(graph: GraphState, config: SimulationConfig): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const [, node] of graph.nodes) {
    if (node.currentRiskScore >= 0.2) continue;
    if (node.baseDemand < 60) continue;

    // Check if this node is a relative safe haven near disruptions
    const adjEdges = graph.adjacency.get(node.id) || [];
    let nearDisruption = false;
    for (const edgeId of adjEdges) {
      const edge = graph.edges.get(edgeId);
      if (edge && edge.currentRiskScore > 0.5) {
        nearDisruption = true;
        break;
      }
    }

    if (nearDisruption && node.industryWeights[config.industry] > 0.4) {
      recs.push({
        id: `rec_${uuid().slice(0, 8)}`,
        type: 'pricing',
        title: `Pricing Opportunity: ${node.name}`,
        description: `${node.name} is a safe hub near disrupted zones. Competitor capacity reduced — opportunity to increase market share or adjust pricing.`,
        urgency: 'monitor',
        timeHorizon: 'Opportunity window: 7-14 days while competitors are disrupted',
        impact: {
          riskReduction: 0,
          costIncrease: 0,
          profitGain: 25,
          delayReduction: 0,
        },
        relatedNodeIds: [node.id],
        relatedEdgeIds: [],
        relatedAttachmentIds: [],
      });
    }
  }

  return recs.slice(0, 1);
}

// ── Backup Activation ───────────────────────────────────────

function generateBackupRecommendations(
  graph: GraphState,
  config: SimulationConfig,
  profile: UserProfile
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const ap of profile.attachmentPoints) {
    const hub = graph.nodes.get(ap.hubId);
    if (!hub) continue;

    if (hub.currentRiskScore >= 0.6 && ap.dependencyStrength === 'critical' && ap.hasAlternative && ap.alternativeHubId) {
      const altHub = graph.nodes.get(ap.alternativeHubId);
      if (altHub && altHub.currentRiskScore < 0.3) {
        recs.push({
          id: `rec_${uuid().slice(0, 8)}`,
          type: 'activate_backup',
          title: `Activate Backup: ${hub.name} → ${altHub.name}`,
          description: `Your critical ${ap.goodsCategory} source at ${hub.name} is at ${Math.round(hub.currentRiskScore * 100)}% risk. Switch to backup at ${altHub.name} (${Math.round(altHub.currentRiskScore * 100)}% risk). Switch cost: ~${ap.switchCostDays || 5} days.`,
          urgency: 'immediate',
          timeHorizon: `Switch within ${ap.switchCostDays || 5} days to avoid supply chain break`,
          impact: {
            riskReduction: 0.4,
            costIncrease: 30,
            profitGain: 0,
            delayReduction: 5,
          },
          relatedNodeIds: [ap.hubId, ap.alternativeHubId],
          relatedEdgeIds: [],
          relatedAttachmentIds: [ap.id],
        });
      }
    }
  }

  return recs;
}

// ── Hedge Recommendations ───────────────────────────────────

function generateHedgeRecommendations(
  graph: GraphState,
  config: SimulationConfig,
  profile: UserProfile | null
): Recommendation[] {
  const recs: Recommendation[] = [];

  // If overall network risk is high, recommend hedging
  const avgRisk = Array.from(graph.nodes.values())
    .reduce((sum, n) => sum + n.currentRiskScore, 0) / graph.nodes.size;

  if (avgRisk > 0.3 && profile && profile.profileTier >= 2) {
    recs.push({
      id: `rec_${uuid().slice(0, 8)}`,
      type: 'hedge',
      title: 'Hedge: Commodity Futures',
      description: `Average network risk at ${Math.round(avgRisk * 100)}%. Consider hedging ${config.industry} commodity exposure through futures contracts to lock in current pricing.`,
      urgency: avgRisk > 0.5 ? 'soon' : 'monitor',
      timeHorizon: 'Lock in prices within 48 hours before market adjusts',
      impact: {
        riskReduction: 0.1,
        costIncrease: 5,
        profitGain: 15,
        delayReduction: 0,
      },
      relatedNodeIds: [],
      relatedEdgeIds: [],
      relatedAttachmentIds: [],
    });
  }

  return recs;
}
