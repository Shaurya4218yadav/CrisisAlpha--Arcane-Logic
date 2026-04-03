// ============================================================
// CrisisAlpha — User Context Service
// Profiles, attachment points, industry templates
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import type { UserProfile, AttachmentPoint, IndustryTemplate, PersonalizedImpactReport, ImpactProjection } from '../models/user';
import type { GraphState, TradeHubNode } from '../models/graph';

const DATA_DIR = path.join(__dirname, '..', 'data');

// In-memory user store
const users = new Map<string, UserProfile>();

let templatesCache: Record<string, any> | null = null;

function getTemplates(): Record<string, any> {
  if (!templatesCache) {
    templatesCache = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'industry_templates.json'), 'utf-8')
    ).templates;
  }
  return templatesCache!;
}

// ── Profile CRUD ────────────────────────────────────────────

export function createOrUpdateProfile(data: {
  id?: string;
  companyName: string;
  industry: string;
  headquartersCountry: string;
  profileTier?: 1 | 2 | 3;
}): UserProfile {
  const id = data.id || `user_${uuid().slice(0, 8)}`;
  const existing = users.get(id);

  const profile: UserProfile = {
    id,
    companyName: data.companyName,
    industry: data.industry,
    headquartersCountry: data.headquartersCountry,
    profileTier: data.profileTier || 1,
    attachmentPoints: existing?.attachmentPoints || [],
    savedSimulations: existing?.savedSimulations || [],
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Auto-generate Tier 1 attachment points if new user
  if (!existing && profile.profileTier === 1) {
    profile.attachmentPoints = generateTier1Attachments(data.industry);
  }

  users.set(id, profile);
  return profile;
}

export function getProfile(userId: string): UserProfile | null {
  return users.get(userId) || null;
}

export function deleteProfile(userId: string): boolean {
  return users.delete(userId);
}

// ── Attachment Point CRUD ───────────────────────────────────

export function addAttachmentPoint(userId: string, point: Omit<AttachmentPoint, 'id'>): AttachmentPoint | null {
  const profile = users.get(userId);
  if (!profile) return null;

  const attachment: AttachmentPoint = {
    id: `ap_${uuid().slice(0, 8)}`,
    ...point,
  };

  profile.attachmentPoints.push(attachment);
  profile.updatedAt = new Date().toISOString();
  return attachment;
}

export function removeAttachmentPoint(userId: string, attachmentId: string): boolean {
  const profile = users.get(userId);
  if (!profile) return false;

  const idx = profile.attachmentPoints.findIndex(ap => ap.id === attachmentId);
  if (idx === -1) return false;

  profile.attachmentPoints.splice(idx, 1);
  profile.updatedAt = new Date().toISOString();
  return true;
}

// ── Industry Templates ──────────────────────────────────────

export function getIndustryTemplate(industry: string): IndustryTemplate | null {
  const templates = getTemplates();
  const template = templates[industry];
  if (!template) return null;
  return template as IndustryTemplate;
}

function generateTier1Attachments(industry: string): AttachmentPoint[] {
  const template = getIndustryTemplate(industry);
  if (!template || !template.defaultAttachments) return [];

  return template.defaultAttachments.map((def: any) => ({
    id: `ap_${uuid().slice(0, 8)}`,
    hubId: def.hubId,
    relationship: def.relationship,
    goodsCategory: def.goodsCategory,
    dependencyStrength: def.dependencyStrength,
    hasAlternative: false,
  }));
}

// ── Relevant Nodes for User ─────────────────────────────────

export function getUserRelevantNodeIds(userId: string): string[] {
  const profile = users.get(userId);
  if (!profile) return [];
  return profile.attachmentPoints.map(ap => ap.hubId);
}

// ── Heuristic Impact Report (fallback when no LLM) ─────────

export function generateHeuristicImpactReport(
  userId: string,
  simulationId: string,
  graph: GraphState
): PersonalizedImpactReport | null {
  const profile = users.get(userId);
  if (!profile) return null;

  const projections: ImpactProjection[] = [];
  let overallSeverity: 'critical' | 'high' | 'moderate' | 'low' = 'low';

  for (const ap of profile.attachmentPoints) {
    const hub = graph.nodes.get(ap.hubId);
    if (!hub) continue;

    const riskScore = hub.currentRiskScore;
    let severity: ImpactProjection['severity'];
    let delayDays = 0;
    let bufferDepletionDay: number | null = null;
    let narrative = '';

    if (riskScore >= 0.8) {
      severity = 'critical';
      delayDays = Math.round(14 + riskScore * 10);
      bufferDepletionDay = hub.inventoryBufferDays;
      narrative = `🔴 CRITICAL: Your ${ap.goodsCategory} supply via ${hub.name} (dependency: ${ap.dependencyStrength.toUpperCase()}) is severely disrupted. Expected delay: ${delayDays} days. Buffer stock depletes by Day ${bufferDepletionDay}.`;
    } else if (riskScore >= 0.6) {
      severity = 'high';
      delayDays = Math.round(7 + riskScore * 8);
      bufferDepletionDay = hub.inventoryBufferDays + 5;
      narrative = `🟠 HIGH: ${hub.name} is experiencing significant disruption. Your ${ap.goodsCategory} shipments may face ${delayDays}-day delays. Current buffer covers ${hub.inventoryBufferDays} days.`;
    } else if (riskScore >= 0.3) {
      severity = 'moderate';
      delayDays = Math.round(2 + riskScore * 5);
      narrative = `🟡 MODERATE: Elevated risk at ${hub.name}. Minor delays of ${delayDays} days possible for ${ap.goodsCategory}. Monitor closely.`;
    } else {
      severity = riskScore >= 0.1 ? 'low' : 'unaffected';
      narrative = `🟢 ${severity === 'low' ? 'LOW' : 'UNAFFECTED'}: ${hub.name} operations ${severity === 'low' ? 'largely normal with minor concerns' : 'running normally'}. Your ${ap.goodsCategory} supply is ${severity === 'low' ? 'minimally affected' : 'unaffected'}.`;
    }

    // Cost estimates for Tier 3 users
    let costImpactUsd: number | null = null;
    if (profile.profileTier === 3 && ap.monthlyValueUsd) {
      costImpactUsd = Math.round(ap.monthlyValueUsd * riskScore * 0.5);
    }

    // Update overall severity
    if (severity === 'critical') overallSeverity = 'critical';
    else if (severity === 'high' && overallSeverity !== 'critical') overallSeverity = 'high';
    else if (severity === 'moderate' && overallSeverity !== 'critical' && overallSeverity !== 'high') overallSeverity = 'moderate';

    projections.push({
      attachmentPointId: ap.id,
      hubName: hub.name,
      relationship: ap.relationship,
      severity,
      delayDays,
      bufferDepletionDay,
      costImpactUsd,
      narrative,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3, unaffected: 4 };
  projections.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Build overall narrative
  const criticalCount = projections.filter(p => p.severity === 'critical' || p.severity === 'high').length;
  const overallNarrative = criticalCount > 0
    ? `⚠️ ${criticalCount} of your ${projections.length} supply chain attachment points are critically or highly impacted. Immediate action recommended to mitigate losses.`
    : `Your supply chain is ${overallSeverity === 'moderate' ? 'experiencing moderate disruptions' : 'largely unaffected'}. Continue monitoring.`;

  // Financial summary for Tier 3
  let financialSummary;
  if (profile.profileTier === 3) {
    const totalLoss = projections.reduce((sum, p) => sum + (p.costImpactUsd || 0), 0);
    financialSummary = {
      estimatedLoss: totalLoss,
      mitigatedLoss: Math.round(totalLoss * 0.4),
      timeHorizonDays: 30,
    };
  }

  // Recommendations
  const recommendations: string[] = [];
  for (const p of projections) {
    if (p.severity === 'critical') {
      recommendations.push(`Activate backup supplier for ${p.hubName} immediately. Expected to reduce delay from ${p.delayDays} days to ${Math.round(p.delayDays * 0.5)} days.`);
    } else if (p.severity === 'high') {
      recommendations.push(`Pre-position inventory at alternative hub to buffer against ${p.hubName} disruption.`);
    }
  }

  return {
    simulationId,
    userId,
    generatedAt: new Date().toISOString(),
    overallSeverity,
    projections,
    recommendations,
    financialSummary,
    narrative: overallNarrative,
  };
}

// ── Get all users (for admin/internal use) ──────────────────

export function getAllUsers(): UserProfile[] {
  return Array.from(users.values());
}
