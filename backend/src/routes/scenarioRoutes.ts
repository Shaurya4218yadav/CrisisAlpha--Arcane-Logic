// ============================================================
// CrisisAlpha — Scenario Routes
// REST endpoints for scenario lifecycle
// ============================================================

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {
  createScenario,
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  resetSimulation,
  applyDecision,
  getScenarioState,
  getScenarioSummary,
} from '../services/simulationService';
import { loadGraph, serializeNodes, serializeEdges } from '../services/graphService';
import { generateSitRep } from '../services/aiService';

const router = Router();

// GET /api/graph — Get the base graph data (for map rendering)
router.get('/graph', (_req: Request, res: Response) => {
  try {
    const graph = loadGraph();
    res.json({
      nodes: serializeNodes(graph),
      edges: serializeEdges(graph),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load graph data' });
  }
});

// GET /api/presets — Get available scenario presets
router.get('/presets', (_req: Request, res: Response) => {
  try {
    const presetsPath = path.join(__dirname, '..', 'data', 'presets.json');
    const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load presets' });
  }
});

// GET /api/industries — Get industry profiles
router.get('/industries', (_req: Request, res: Response) => {
  try {
    const industriesPath = path.join(__dirname, '..', 'data', 'industries.json');
    const industries = JSON.parse(fs.readFileSync(industriesPath, 'utf-8'));
    res.json(industries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load industries' });
  }
});

// POST /api/scenario/create
router.post('/scenario/create', (req: Request, res: Response) => {
  try {
    const config = req.body;

    if (!config.originNodeId || !config.industry) {
      res.status(400).json({ error: 'originNodeId and industry are required' });
      return;
    }

    // Apply defaults
    const fullConfig = {
      originNodeId: config.originNodeId,
      industry: config.industry,
      conflictIntensity: config.conflictIntensity ?? 0.5,
      fuelShortage: config.fuelShortage ?? 0.5,
      policyRestriction: config.policyRestriction ?? 0.5,
      durationDays: config.durationDays ?? 14,
      userGoal: config.userGoal ?? 'balanced',
    };

    const session = createScenario(fullConfig);
    const state = getScenarioState(session.id);

    res.json({
      session: {
        id: session.id,
        status: session.status,
        config: session.config,
        currentTick: session.currentTick,
        maxTicks: session.maxTicks,
      },
      ...state,
    });
  } catch (err) {
    console.error('Error creating scenario:', err);
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

// POST /api/scenario/:id/start
router.post('/scenario/:id/start', (req: Request, res: Response) => {
  const io = req.app.get('io');
  const success = startSimulation(req.params.id, io);
  if (success) {
    res.json({ status: 'running' });
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

// POST /api/scenario/:id/pause
router.post('/scenario/:id/pause', (req: Request, res: Response) => {
  const success = pauseSimulation(req.params.id);
  if (success) {
    res.json({ status: 'paused' });
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

// POST /api/scenario/:id/resume
router.post('/scenario/:id/resume', (req: Request, res: Response) => {
  const success = resumeSimulation(req.params.id);
  if (success) {
    res.json({ status: 'running' });
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

// POST /api/scenario/:id/reset
router.post('/scenario/:id/reset', (req: Request, res: Response) => {
  const success = resetSimulation(req.params.id);
  if (success) {
    res.json({ status: 'reset' });
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

// POST /api/scenario/:id/decision
router.post('/scenario/:id/decision', (req: Request, res: Response) => {
  const { recommendationId } = req.body;
  if (!recommendationId) {
    res.status(400).json({ error: 'recommendationId is required' });
    return;
  }

  const success = applyDecision(req.params.id, recommendationId);
  if (success) {
    res.json({ status: 'applied' });
  } else {
    res.status(404).json({ error: 'Scenario or recommendation not found' });
  }
});

// GET /api/scenario/:id/state
router.get('/scenario/:id/state', (req: Request, res: Response) => {
  const state = getScenarioState(req.params.id);
  if (state) {
    res.json(state);
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

// GET /api/scenario/:id/summary
router.get('/scenario/:id/summary', (req: Request, res: Response) => {
  const summary = getScenarioSummary(req.params.id);
  if (summary) {
    res.json(summary);
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});

// GET /api/scenario/:id/ai-summary
router.get('/scenario/:id/ai-summary', async (req: Request, res: Response) => {
  try {
    const report = await generateSitRep(req.params.id);
    res.json({ report });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Failed to generate report' });
  }
});

export default router;
