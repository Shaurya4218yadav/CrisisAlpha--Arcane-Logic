// ============================================================
// CrisisAlpha — Score Service (v2)
// Per-simulation & per-attachment-point scoring
// ============================================================

import type { GraphState } from '../models/graph';
import type { SimulationConfig, ScoreSnapshot, Decision } from '../models/simulation';
import type { UserProfile } from '../models/user';
import { getProfile } from './userContextService';

// ── Calculate Score Snapshot ────────────────────────────────

export function calculateScore(
  graph: GraphState,
  config: SimulationConfig,
  decisions: Decision[],
  tick: number
): ScoreSnapshot {
  const nodes = Array.from(graph.nodes.values());
  const edges = Array.from(graph.edges.values());
  const chokepoints = Array.from(graph.chokepoints.values());

  // Risk metrics
  const avgNodeRisk = nodes.reduce((sum, n) => sum + n.currentRiskScore, 0) / nodes.length;
  const riskAvoided = Math.round((1 - avgNodeRisk) * 100);

  // Network efficiency
  const avgCapacity = edges.reduce((sum, e) => sum + e.currentCapacityPct, 0) / edges.length;
  const networkEfficiency = Math.round(avgCapacity * 100);

  // Route failures
  const routeFailures = edges.filter(e => e.currentStatus === 'broken').length;

  // Chokepoints affected
  const chokePointsAffected = chokepoints.filter(c => c.currentRiskScore > 0.3).length;

  // Demand served (how much demand can still be met given capacity)
  const totalDemand = nodes.reduce((sum, n) => sum + n.baseDemand, 0);
  const servableDemand = nodes.reduce((sum, n) => {
    const capacityFactor = 1 - n.currentRiskScore * 0.8;
    return sum + n.baseDemand * capacityFactor;
  }, 0);
  const demandServed = Math.round((servableDemand / totalDemand) * 100);

  // Profit gained (decisions that created profit opportunities)
  const profitDecisions = decisions.filter(d => d.type === 'pricing' || d.type === 'hedge').length;
  const profitGained = Math.min(100, profitDecisions * 15 + Math.max(0, (networkEfficiency - 60)));

  // Days until major impact
  const criticalNodes = nodes.filter(n => n.currentRiskScore > 0.6);
  let projectedImpactDays = config.durationDays;
  if (criticalNodes.length > 0) {
    const avgBufferDays = criticalNodes.reduce((sum, n) => sum + n.inventoryBufferDays, 0) / criticalNodes.length;
    projectedImpactDays = Math.max(1, Math.round(avgBufferDays * (1 - avgNodeRisk)));
  }

  // Overall composite score
  const overallScore = Math.round(
    riskAvoided * 0.3 +
    profitGained * 0.2 +
    networkEfficiency * 0.25 +
    demandServed * 0.25
  );

  return {
    riskAvoided,
    profitGained,
    networkEfficiency,
    demandServed,
    routeFailures,
    chokePointsAffected,
    overallScore,
    projectedImpactDays,
  };
}

// ── Per-Attachment-Point Scores ─────────────────────────────

export interface AttachmentScore {
  attachmentId: string;
  hubId: string;
  hubName: string;
  riskLevel: number;
  bufferDaysRemaining: number;
  impactSeverity: string;
}

export function calculateAttachmentScores(
  graph: GraphState,
  userId: string
): AttachmentScore[] {
  const profile = getProfile(userId);
  if (!profile) return [];

  return profile.attachmentPoints.map(ap => {
    const hub = graph.nodes.get(ap.hubId);
    const riskLevel = hub?.currentRiskScore || 0;
    const bufferDays = hub?.inventoryBufferDays || 0;
    const adjustedBuffer = Math.max(0, Math.round(bufferDays * (1 - riskLevel)));

    let impactSeverity: string;
    if (riskLevel >= 0.8) impactSeverity = 'critical';
    else if (riskLevel >= 0.6) impactSeverity = 'high';
    else if (riskLevel >= 0.3) impactSeverity = 'moderate';
    else impactSeverity = 'low';

    return {
      attachmentId: ap.id,
      hubId: ap.hubId,
      hubName: hub?.name || ap.hubId,
      riskLevel: Math.round(riskLevel * 100) / 100,
      bufferDaysRemaining: adjustedBuffer,
      impactSeverity,
    };
  });
}
