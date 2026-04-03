// ============================================================
// CrisisAlpha — Feed Routes
// REST API for live event feed
// ============================================================

import { Router, Request, Response } from 'express';
import { getRecentEvents, getEventStoreStats, getAllEvents } from '../services/eventStoreService';
import { injectEvent, isIngestionRunning, startIngestion, stopIngestion } from '../services/ingestionService';
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

// GET /api/feed/status — ingestion pipeline health
router.get('/status', (req: Request, res: Response) => {
  const stats = getEventStoreStats();
  res.json({
    ingestionRunning: isIngestionRunning(),
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
