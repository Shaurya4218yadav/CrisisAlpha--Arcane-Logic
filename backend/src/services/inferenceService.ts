// ============================================================
// CrisisAlpha — AI Inference Service
// LLM-powered personalized impact reports
// Uses Google Gemini with heuristic fallback
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import type { GraphState } from '../models/graph';
import type { PersonalizedImpactReport, UserProfile } from '../models/user';
import type { SimulationConfig } from '../models/simulation';
import { getProfile, generateHeuristicImpactReport } from './userContextService';

let genAI: any = null;
let model: any = null;
let isAvailable = false;

// ── Initialize ──────────────────────────────────────────────

export async function initInference(): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[Inference] ⚠️  No GEMINI_API_KEY set — using heuristic fallback mode');
    return false;
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    isAvailable = true;
    console.log('[Inference] 🤖 Gemini AI initialized successfully');
    return true;
  } catch (err) {
    console.error('[Inference] ❌ Failed to initialize Gemini:', err);
    return false;
  }
}

export function isInferenceAvailable(): boolean {
  return isAvailable;
}

// ── Generate Impact Report ──────────────────────────────────

export async function generateImpactReport(
  userId: string,
  simulationId: string,
  simConfig: SimulationConfig,
  graph: GraphState,
): Promise<PersonalizedImpactReport | null> {
  const profile = getProfile(userId);
  if (!profile) return null;

  // Try LLM first
  if (isAvailable) {
    try {
      return await generateLLMReport(profile, simulationId, simConfig, graph);
    } catch (err) {
      console.error('[Inference] LLM report failed, falling back to heuristic:', err);
    }
  }

  // Fallback to heuristic
  return generateHeuristicImpactReport(userId, simulationId, graph);
}

// ── LLM-Powered Report ─────────────────────────────────────

async function generateLLMReport(
  profile: UserProfile,
  simulationId: string,
  simConfig: SimulationConfig,
  graph: GraphState,
): Promise<PersonalizedImpactReport> {
  // Build context prompt
  const attachmentContext = profile.attachmentPoints.map(ap => {
    const hub = graph.nodes.get(ap.hubId);
    return {
      hub: hub?.name || ap.hubId,
      relationship: ap.relationship,
      goods: ap.goodsCategory,
      dependency: ap.dependencyStrength,
      hubRisk: hub?.currentRiskScore || 0,
      hubStatus: hub?.currentStatus || 'unknown',
      bufferDays: hub?.inventoryBufferDays || 0,
    };
  });

  const disruptedNodes = Array.from(graph.nodes.values())
    .filter(n => n.currentRiskScore > 0.3)
    .map(n => ({ name: n.name, risk: Math.round(n.currentRiskScore * 100), status: n.currentStatus }));

  const disruptedChokepoints = Array.from(graph.chokepoints.values())
    .filter(c => c.currentRiskScore > 0.2)
    .map(c => ({ name: c.name, risk: Math.round(c.currentRiskScore * 100), status: c.currentStatus }));

  const prompt = `You are a supply chain risk analyst AI. Given the following simulation and user context, generate a personalized impact assessment.

## Simulation Context
- **Hypothesis**: ${simConfig.hypothesis.title}
- **Description**: ${simConfig.hypothesis.description}
- **Duration**: ${simConfig.durationDays} days
- **Industry Focus**: ${simConfig.industry}

## Current Disruptions
Disrupted Nodes: ${JSON.stringify(disruptedNodes, null, 2)}
Disrupted Chokepoints: ${JSON.stringify(disruptedChokepoints, null, 2)}

## User Context
- **Company**: ${profile.companyName}
- **Industry**: ${profile.industry}
- **HQ Country**: ${profile.headquartersCountry}
- **Tier**: ${profile.profileTier}

## User Supply Chain Attachment Points
${JSON.stringify(attachmentContext, null, 2)}

## Instructions
Generate a JSON response with this exact structure:
{
  "overallSeverity": "critical|high|moderate|low",
  "projections": [
    {
      "hubName": "string",
      "severity": "critical|high|moderate|low|unaffected",
      "delayDays": number,
      "narrative": "string (2-3 sentences)"
    }
  ],
  "recommendations": ["string"],
  "narrative": "string (executive summary, 3-4 sentences)"
}

Be specific about days, percentages, and actionable recommendations. Focus on the user's actual supply chain dependencies.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from LLM response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    simulationId,
    userId: profile.id,
    generatedAt: new Date().toISOString(),
    overallSeverity: parsed.overallSeverity || 'moderate',
    projections: (parsed.projections || []).map((p: any, i: number) => ({
      attachmentPointId: profile.attachmentPoints[i]?.id || `ap_${i}`,
      hubName: p.hubName,
      relationship: profile.attachmentPoints[i]?.relationship || 'unknown',
      severity: p.severity,
      delayDays: p.delayDays || 0,
      bufferDepletionDay: null,
      costImpactUsd: null,
      narrative: p.narrative,
    })),
    recommendations: parsed.recommendations || [],
    narrative: parsed.narrative || 'Impact assessment generated by AI.',
  };
}

// ── Quick One-shot Analysis ─────────────────────────────────

export async function quickAnalysis(prompt: string): Promise<string> {
  if (!isAvailable) {
    return 'AI inference not available. Set GEMINI_API_KEY environment variable.';
  }

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    return `AI analysis failed: ${(err as Error).message}`;
  }
}
