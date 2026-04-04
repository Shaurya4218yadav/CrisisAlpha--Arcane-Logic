// ============================================================
// CrisisAlpha — Chat Routes
// REST API for AI chat assistant
// ============================================================

import { Router, Request, Response } from 'express';
import { quickAnalysis, isInferenceAvailable } from '../services/inferenceService';

const router = Router();

// POST /api/chat — AI chat endpoint
router.post('/', async (req: Request, res: Response) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Missing required field: message' });
  }

  // If LLM is available, use it
  if (isInferenceAvailable()) {
    try {
      const fullPrompt = context
        ? `${context}\n\nUser question: ${message}\n\nProvide a concise, actionable response (2-3 sentences max).`
        : message;

      const response = await quickAnalysis(fullPrompt);
      return res.json({ response });
    } catch (err) {
      console.error('[Chat] LLM error:', err);
    }
  }

  // Heuristic fallback — parse message and return contextual response
  const lowerMsg = message.toLowerCase();

  let response: string;

  if (lowerMsg.includes('status') || lowerMsg.includes('situation')) {
    response = 'The simulation is actively running. Check the event feed for the latest disruptions and the score panel for current network performance metrics.';
  } else if (lowerMsg.includes('recommend') || lowerMsg.includes('should') || lowerMsg.includes('action') || lowerMsg.includes('do')) {
    response = 'Review the Actions tab in the right panel for current recommendations. Rerouting through alternative corridors and pre-positioning inventory at safe hubs are typically the highest-impact actions.';
  } else if (lowerMsg.includes('score') || lowerMsg.includes('performance')) {
    response = 'Your performance score reflects risk avoidance, network efficiency, and demand served. Apply strategic decisions to improve your overall score before the simulation completes.';
  } else if (lowerMsg.includes('risk') || lowerMsg.includes('danger') || lowerMsg.includes('threat')) {
    response = 'Monitor the globe for red/orange markers indicating high-risk nodes. Nodes with risk above 60% require immediate attention — consider rerouting or activating backup suppliers.';
  } else if (lowerMsg.includes('route') || lowerMsg.includes('reroute') || lowerMsg.includes('path')) {
    response = 'When routes are disrupted, the system generates rerouting recommendations. Check the Actions tab and apply reroute decisions to redirect traffic through safer corridors.';
  } else if (lowerMsg.includes('chokepoint') || lowerMsg.includes('suez') || lowerMsg.includes('hormuz') || lowerMsg.includes('malacca')) {
    response = 'Strategic chokepoints amplify risk across all routes passing through them. When a chokepoint is disrupted, consider Cape of Good Hope alternatives for Suez, or overland routes for Strait of Malacca.';
  } else if (lowerMsg.includes('profit') || lowerMsg.includes('financial') || lowerMsg.includes('cost')) {
    response = 'Balance risk mitigation with financial performance. Pricing opportunities emerge when safe hubs are near disrupted zones — competitor capacity drops create market share opportunities.';
  } else if (lowerMsg.includes('help') || lowerMsg.includes('how')) {
    response = 'I can analyze risks, suggest actions, and explain simulation dynamics. Try asking: "What\'s the current risk situation?", "What should I do?", "How\'s my performance?", or "Which routes are at risk?"';
  } else {
    response = `I'm monitoring the active simulation. The event feed tracks disruptions in real-time, and I generate actionable recommendations as conditions evolve. Ask me about specific risks, chokepoints, or recommended actions.`;
  }

  res.json({ response });
});

export default router;
