// ============================================================
// CrisisAlpha — Score Service
// Computes partial and final outcome metrics
// ============================================================

import { GraphState } from '../models/graph';
import { ScenarioConfig, ScoreSnapshot, Decision } from '../models/scenario';
import { getNodesArray, getEdgesArray } from './graphService';

export function computeScore(
  graph: GraphState,
  config: ScenarioConfig,
  decisions: Decision[],
  tick: number,
  maxTicks: number
): ScoreSnapshot {
  const nodes = getNodesArray(graph);
  const edges = getEdgesArray(graph);

  // Risk Avoided (100 - average risk %)
  const avgRisk = nodes.reduce((sum, n) => sum + n.riskScore, 0) / nodes.length;
  const riskAvoided = Math.round((1 - avgRisk) * 100);

  // Route Failures
  const routeFailures = edges.filter(e => e.status === 'broken').length;

  // Network Efficiency
  const totalCapacity = edges.reduce((sum, e) => sum + e.capacity, 0);
  const operationalCapacity = edges
    .filter(e => e.status !== 'broken')
    .reduce((sum, e) => sum + e.capacity * (1 - e.riskScore), 0);
  const networkEfficiency = Math.round((operationalCapacity / totalCapacity) * 100);

  // Demand Served (based on safe and stressed nodes)
  const totalDemand = nodes.reduce((sum, n) => sum + n.baseDemand, 0);
  const servedDemand = nodes
    .filter(n => n.status !== 'broken')
    .reduce((sum, n) => sum + n.baseDemand * (1 - n.riskScore * 0.5), 0);
  const demandServed = Math.round((servedDemand / totalDemand) * 100);

  // Profit Gained (from decisions + safe zones with high demand)
  const profitFromDecisions = decisions
    .filter(d => d.type === 'pricing')
    .length * 8;
  const safeHighDemandProfit = nodes
    .filter(n => n.status === 'safe' && n.baseDemand > 60)
    .reduce((sum, n) => sum + (n.baseDemand / 100) * 5, 0);
  const profitGained = Math.round(profitFromDecisions + safeHighDemandProfit);

  // Overall score
  const overallScore = Math.round(
    0.40 * riskAvoided +
    0.35 * profitGained +
    0.25 * networkEfficiency
  );

  return {
    riskAvoided,
    profitGained: Math.min(profitGained, 100),
    networkEfficiency,
    demandServed,
    routeFailures,
    overallScore: Math.min(overallScore, 100),
  };
}

export function getFinalLabel(score: ScoreSnapshot, config: ScenarioConfig): string {
  if (score.overallScore >= 80) return 'Crisis Commander';
  if (score.overallScore >= 60) return 'Balanced Strategist';
  if (score.riskAvoided > score.profitGained) return 'Operationally Resilient';
  if (score.profitGained > score.riskAvoided) return 'Profit Maximizer';
  return 'Reactive Manager';
}
