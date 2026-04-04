// ============================================================
// CrisisAlpha — AI Service
// Generates intelligence briefings for scenario outcomes
// ============================================================

import { getSession, getSessionGraph } from './simulationService';
import { calculateScore } from './scoreService';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateSitRep(simulationId: string): Promise<string> {
  const session = getSession(simulationId);
  const graph = getSessionGraph(simulationId);

  if (!session || !graph) {
    throw new Error('Simulation not found or data incomplete.');
  }

  const score = calculateScore(graph, session.config, session.decisions, session.currentTick);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'mock') {
    // Use highly realistic, dynamically generated offline intelligence reports instead of basic placeholder
    let severityStatus = "MODERATE";
    let analysisText = "";

    if (score.networkEfficiency >= 80) {
        severityStatus = "STABLE";
        analysisText = `The structural integrity of the **${session.config.industry}** network held firm. Cascading risks were largely absorbed by redundant secondary hubs. Anticipate a minor 2-3% inflationary impact on downstream pricing.`;
    } else if (score.networkEfficiency >= 50) {
        severityStatus = "ELEVATED";
        analysisText = `Major structural bottlenecks emerged across the **${session.config.industry}** supply chain. Primary transit chokepoints experienced significant delays, necessitating emergency rerouting. Recommend immediate inventory stockpiling.`;
    } else {
        severityStatus = "CRITICAL";
        analysisText = `The disruption caused complete systemic failure across the **${session.config.industry}** logistics grid. Critical infrastructure collapsed under the cascading risk factors, leading to massive profit hemorrhaging. Immediate government/international intervention required.`;
    }

    return `ALPHA-COMMAND POST-INCIDENT ANALYSIS

[ CORE NODE IDENTITY ]: ${simulationId.split('-')[0].toUpperCase()}
[ MONITORED SECTOR ]: ${session.config.industry.toUpperCase()}
[ THREAT ASSESSMENT ]: ${severityStatus}

--------------------------------------------------

[ POST-CRISIS METRICS ]
> Final System Score: ${score.overallScore}
> Logistical Efficiency: ${score.networkEfficiency}%
> Total Risks Avoided: ${score.riskAvoided}
> Profit Arbitrage Captured: $${score.profitGained.toLocaleString()}

[ STRATEGIC BREAKDOWN ]
${analysisText.replace(/\*\*/g, '')}`;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Compile simulation metrics
  const decisions = session.decisions.length;
  
  const prompt = `
Generate a professional, intelligence-style Situation Report (SitRep) for the conclusion of a supply chain crisis simulation.

Scenario Context:
- Industry: ${session.config.industry}
- Conflict Intensity: ${session.config.conflictIntensity}
- Fuel Shortage Level: ${session.config.fuelShortage}
- Policy Restrictions: ${session.config.policyRestriction}

Simulation Outcome:
- Total Ticks: ${session.currentTick}/${session.maxTicks}
- Overall Score: ${score.overallScore}
- Network Efficiency: ${score.networkEfficiency}%
- Risk Avoided: ${score.riskAvoided}
- Profit Gained: ${score.profitGained}
- Number of user interventions: ${decisions}

Instructions:
1. Write 2-3 concise paragraphs.
2. Adopt a serious, analytical tone (like a geopolitical intelligence briefing).
3. Do not mention that this is a simulation or a game. Treat it as a real logistical network analysis.
4. Do not include pleasantries or conversational filler. Output only the markdown report starting with a relevant title.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || 'Unable to generate report at this time.';
  } catch (err: any) {
    console.error('Failed to generate AI SitRep:', err);
    if (err.message && err.message.includes('404 Not Found')) {
        return `### ⚠️ API Model Error\n\nThe provided Gemini API Key could not access the \`gemini-1.5-flash\` model. Ensure the Google Generative Language API is enabled and available in your region.`;
    } else if (err.message && err.message.includes('429 Too Many Requests')) {
        return `### ⚠️ Quota Exceeded\n\nThe provided Gemini API Key has exceeded its free tier quota or billing is not enabled.`;
    }
    
    return `### ⚠️ Intelligence Service Down\n\nThe AI generation service is currently unreachable.\n\n**Error details:** ${err.message || 'Unknown error'}`;
  }
}
