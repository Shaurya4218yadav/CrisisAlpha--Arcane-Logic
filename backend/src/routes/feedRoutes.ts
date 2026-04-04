// ============================================================
// CrisisAlpha — Feed Routes (v2)
// REST API for live event feed + network stats
// ============================================================

import { Router, Request, Response } from 'express';
import { getRecentEvents, getEventStoreStats, getAllEvents } from '../services/eventStoreService';
import { injectEvent, isIngestionRunning, startIngestion, stopIngestion, isKafkaConnected } from '../services/ingestionService';
import { loadGraph } from '../services/graphService';
import type { GraphMutation } from '../models/event';

const router = Router();

// GET /api/feed/recent — recent real-world events
router.get('/recent', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const events = getRecentEvents(limit);
  res.json({
    count: events.length,
    events,
  });
});

// GET /api/feed/all — all events in store
router.get('/all', (req: Request, res: Response) => {
  const events = getAllEvents();
  res.json({
    count: events.length,
    events: events.slice(-100), // last 100 events
  });
});

// GET /api/feed/stats — live network statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const graph = loadGraph();
    
    // Calculate total daily volume TEU
    let totalDailyVolumeTEU = 0;
    let disruptedEdges = 0;
    for (const edge of graph.edges.values()) {
      totalDailyVolumeTEU += edge.currentVolumeTEU;
      if (edge.currentStatus !== 'operational') disruptedEdges++;
    }

    // Count active disruptions (nodes with risk > 0.1)
    let activeDisruptions = 0;
    let affectedHubs = 0;
    let totalRisk = 0;
    for (const node of graph.nodes.values()) {
      totalRisk += node.currentRiskScore;
      if (node.currentRiskScore > 0.1) {
        activeDisruptions++;
        affectedHubs++;
      }
    }

    // Network health: average of (1 - risk) across all nodes
    const avgRisk = graph.nodes.size > 0 ? totalRisk / graph.nodes.size : 0;
    const networkHealthPct = Math.round((1 - avgRisk) * 1000) / 10;

    // Count chokepoint disruptions
    let chokepointDisruptions = 0;
    for (const cp of graph.chokepoints.values()) {
      if (cp.currentRiskScore > 0.1) chokepointDisruptions++;
    }

    const eventStats = getEventStoreStats();

    res.json({
      totalDailyVolumeTEU: Math.round(totalDailyVolumeTEU),
      activeDisruptions: activeDisruptions + chokepointDisruptions,
      affectedHubs,
      disruptedEdges,
      networkHealthPct,
      totalNodes: graph.nodes.size,
      totalEdges: graph.edges.size,
      totalChokepoints: graph.chokepoints.size,
      kafkaConnected: isKafkaConnected(),
      eventStoreSize: eventStats.totalEvents || 0,
      lastEventTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Graph not loaded yet' });
  }
});

// GET /api/feed/status — ingestion pipeline health
router.get('/status', (req: Request, res: Response) => {
  const stats = getEventStoreStats();
  res.json({
    ingestionRunning: isIngestionRunning(),
    kafkaConnected: isKafkaConnected(),
    eventStore: stats,
  });
});

// POST /api/feed/inject — manually inject an event
router.post('/inject', (req: Request, res: Response) => {
  const {
    title, summary, category, severity,
    affectedHubIds, affectedCountries, affectedChokepointIds,
    mutations,
  } = req.body;

  if (!title || !summary || !category || !severity) {
    return res.status(400).json({
      error: 'Missing required fields: title, summary, category, severity',
    });
  }

  const event = injectEvent(
    title,
    summary,
    category,
    severity,
    affectedHubIds || [],
    affectedCountries || [],
    affectedChokepointIds || [],
    (mutations || []) as GraphMutation[]
  );

  res.json({ success: true, event });
});

// POST /api/feed/start — start ingestion
router.post('/start', (req: Request, res: Response) => {
  startIngestion();
  res.json({ success: true, message: 'Ingestion started' });
});

// POST /api/feed/stop — stop ingestion
router.post('/stop', (req: Request, res: Response) => {
  stopIngestion();
  res.json({ success: true, message: 'Ingestion stopped' });
});

export default router;
