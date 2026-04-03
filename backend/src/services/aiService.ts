// ============================================================
// CrisisAlpha — AI Service
// Generates intelligence briefings for scenario outcomes
// ============================================================

import { getScenarioSummary, getScenarioState } from './simulationService';
import { GoogleGenAI } from '@google/genai';

export async function generateSitRep(scenarioId: string): Promise<string> {
  const summary = getScenarioSummary(scenarioId);
  const state = getScenarioState(scenarioId);

  if (!summary || !state) {
    throw new Error('Scenario not found or data incomplete.');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'mock') {
    // Fallback if no key is provided
    return `### 📊 Automated Situation Report\n\n**Scenario ${scenarioId}** for the **${summary.config.industry}** industry has concluded with a final score of **${summary.finalScore.networkEfficiency} efficiency**. The overarching status is: **${summary.label}**.\n\n*Note: To receive dynamic intelligence briefings, please configure your AI service credentials.*`;
  }

  const ai = new GoogleGenAI({ apiKey });

  // Compile scenario metrics
  const eventSubset = state.events.slice(-5).map((e) => `- ${e.title}: ${e.message}`).join('\n');
  const decisions = state.session.decisions.length;
  
  const prompt = `
Generate a professional, intelligence-style Situation Report (SitRep) for the conclusion of a supply chain crisis simulation.

Scenario Context:
- Industry: ${summary.config.industry}
- Conflict Intensity: ${summary.config.conflictIntensity}
- Fuel Shortage Level: ${summary.config.fuelShortage}
- Policy Restrictions: ${summary.config.policyRestriction}

Simulation Outcome:
- Status Label: ${summary.label}
- Network Efficiency: ${summary.finalScore.networkEfficiency}%
- Risk Avoided: ${summary.finalScore.riskAvoided}
- Profit Gained: ${summary.finalScore.profitGained}
- Number of user interventions: ${decisions}

Recent Critical Events:
${eventSubset || 'No major recent events.'}

Instructions:
1. Write 2-3 concise paragraphs.
2. Adopt a serious, analytical tone (like a geopolitical intelligence briefing).
3. Do not mention that this is a simulation or a game. Treat it as a real logistical network analysis.
4. Do not include pleasantries or conversational filler. Output only the markdown report.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || 'Unable to generate report at this time.';
  } catch (err) {
    console.error('Failed to generate AI SitRep:', err);
    return 'Error: The intelligence generation service is currently down.';
  }
}
