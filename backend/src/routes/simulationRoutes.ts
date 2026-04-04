// ============================================================
// CrisisAlpha — Simulation Routes
// REST API for What-If simulation lifecycle
// ============================================================

import { Router, Request, Response } from 'express';
import type { Server } from 'socket.io';
import {
  createSimulation, startSimulation, pauseSimulation,
  resumeSimulation, resetSimulation, applyUserDecision,
  getSession, getSessionGraph, getAllSessions, deleteSimulation,
} from '../services/simulationService';
import { generateImpactReport } from '../services/inferenceService';
import { calculateScore, calculateAttachmentScores } from '../services/scoreService';
import { serializeNodes, serializeEdges, serializeChokepoints, loadGraph } from '../services/graphService';
import { getMergedGraph } from '../services/shadowGraphService';
import { generateSitRep } from '../services/aiService';

import * as fs from 'fs';
import * as path from 'path';

// Load presets
const presetsPath = path.join(__dirname, '..', 'data', 'presets.json');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf-8')).presets;

export default function createSimulationRoutes(io: Server): Router {
  const router = Router();

  // GET /api/sim/presets — available scenario presets
  router.get('/presets', (req: Request, res: Response) => {
    res.json(presets);
  });

  // GET /api/sim/sessions — list all simulations
  router.get('/sessions', (req: Request, res: Response) => {
    const sessions = getAllSessions();
    res.json({
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.config.hypothesis.title,
        status: s.status,
        currentTick: s.currentTick,
        maxTicks: s.maxTicks,
        industry: s.config.industry,
        originNode: s.config.originNodeId,
        userId: s.config.userId,
        decisionsApplied: s.decisions.length,
      })),
    });
  });

  // POST /api/sim/create — create a simulation
  router.post('/create', (req: Request, res: Response) => {
    const {
      userId, presetId, hypothesis, axioms,
      originNodeId, industry, conflictIntensity,
      fuelShortage, policyRestriction, durationDays,
      tickIntervalHours,
    } = req.body;

    // If preset, use preset config
    let config: any = {};
    if (presetId) {
      const preset = presets.find((p: any) => p.id === presetId);
      if (!preset) {
        return res.status(400).json({ error: `Preset "${presetId}" not found` });
      }
      config = {
        originNodeId: preset.originNodeId,
        industry: preset.industry,
        conflictIntensity: preset.conflictIntensity,
        fuelShortage: preset.fuelShortage,
        policyRestriction: preset.policyRestriction,
        durationDays: preset.durationDays,
        hypothesis: {
          title: preset.name,
          description: preset.description,
          category: 'conflict',
          affectedHubIds: [preset.originNodeId],
          affectedCountries: [],
          affectedChokepoints: [],
          initialMutations: [],
        },
      };
    } else {
      config = {
        hypothesis, axioms, originNodeId, industry,
        conflictIntensity, fuelShortage, policyRestriction,
        durationDays, tickIntervalHours,
      };
    }

    const session = createSimulation(config, userId || 'anonymous');
    res.json({
      success: true,
      simulationId: session.id,
      session: {
        id: session.id,
        title: session.config.hypothesis.title,
        status: session.status,
        maxTicks: session.maxTicks,
        config: session.config,
      },
    });
  });

  // POST /api/sim/:id/start — start simulation
  router.post('/:id/start', (req: Request, res: Response) => {
    const success = startSimulation(req.params.id, io);
    if (!success) {
      return res.status(400).json({ error: 'Cannot start simulation. May already be running or not found.' });
    }
    res.json({ success: true, message: 'Simulation started. Connect via WebSocket to receive tick updates.' });
  });

  // POST /api/sim/:id/pause — pause simulation
  router.post('/:id/pause', (req: Request, res: Response) => {
    const success = pauseSimulation(req.params.id);
    res.json({ success });
  });

  // POST /api/sim/:id/resume — resume simulation
  router.post('/:id/resume', (req: Request, res: Response) => {
    const success = resumeSimulation(req.params.id, io);
    res.json({ success });
  });

  // POST /api/sim/:id/reset — reset simulation
  router.post('/:id/reset', (req: Request, res: Response) => {
    const success = resetSimulation(req.params.id);
    res.json({ success });
  });

  // POST /api/sim/:id/decision — apply a user decision
  router.post('/:id/decision', (req: Request, res: Response) => {
    const { type, recommendationId, relatedNodeIds, relatedEdgeIds } = req.body;

    if (!type || !recommendationId) {
      return res.status(400).json({ error: 'Missing required fields: type, recommendationId' });
    }

    const decision = applyUserDecision(
      req.params.id,
      type,
      recommendationId,
      relatedNodeIds || [],
      relatedEdgeIds || []
    );

    if (!decision) {
      return res.status(400).json({ error: 'Cannot apply decision' });
    }

    res.json({ success: true, decision });
  });

  // GET /api/sim/:id/state — current simulation state
  router.get('/:id/state', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    const graph = getSessionGraph(req.params.id);
    if (!graph) {
      return res.json({
        session: { id: session.id, status: session.status, currentTick: session.currentTick },
        message: 'Simulation not yet started. Start it to see graph state.',
      });
    }

    const score = calculateScore(graph, session.config, session.decisions, session.currentTick);

    res.json({
      simulationId: session.id,
      status: session.status,
      currentTick: session.currentTick,
      maxTicks: session.maxTicks,
      dayLabel: `Day ${Math.floor(session.currentTick * (session.config.tickIntervalHours / 24)) + 1}`,
      nodes: serializeNodes(graph),
      edges: serializeEdges(graph),
      chokepoints: serializeChokepoints(graph),
      score,
      decisions: session.decisions,
    });
  });

  // GET /api/sim/:id/impact — AI impact report
  router.get('/:id/impact', async (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    const graph = getSessionGraph(req.params.id);
    if (!graph) {
      return res.status(400).json({ error: 'Simulation not yet started' });
    }

    const report = await generateImpactReport(
      session.config.userId,
      session.id,
      session.config,
      graph
    );

    if (!report) {
      return res.status(404).json({ error: 'No user profile found. Create a user profile first to get personalized impact reports.' });
    }

    res.json(report);
  });

  // GET /api/sim/:id/attachment-scores — per-attachment-point scores
  router.get('/:id/attachment-scores', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    const graph = getSessionGraph(req.params.id);
    if (!graph) {
      return res.status(400).json({ error: 'Simulation not yet started' });
    }

    const scores = calculateAttachmentScores(graph, session.config.userId);
    res.json({ simulationId: session.id, scores });
  });

  // GET /api/sim/:id/summary — final simulation summary
  router.get('/:id/summary', (req: Request, res: Response) => {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    const graph = getSessionGraph(req.params.id);
    const score = graph ? calculateScore(graph, session.config, session.decisions, session.currentTick) : null;

    res.json({
      simulationId: session.id,
      title: session.config.hypothesis.title,
      status: session.status,
      totalTicks: session.currentTick,
      maxTicks: session.maxTicks,
      industry: session.config.industry,
      originNode: session.config.originNodeId,
      durationDays: session.config.durationDays,
      decisionsApplied: session.decisions,
      finalScore: score,
    });
  });

  // GET /api/sim/:id/ai-summary — AI-driven situation report
  router.get('/:id/ai-summary', async (req: Request, res: Response) => {
    try {
      const report = await generateSitRep(req.params.id);
      res.json({ report });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate AI SitRep' });
    }
  });

  // DELETE /api/sim/:id — delete simulation
  router.delete('/:id', (req: Request, res: Response) => {
    const success = deleteSimulation(req.params.id);
    res.json({ success });
  });

  return router;
}
