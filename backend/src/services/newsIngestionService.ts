// ============================================================
// CrisisAlpha — News Ingestion Service (GDELT + Mock Fallback)
// Polls GDELT for real-world events, maps to nearest trade hub
// ============================================================

import { loadGraph } from './graphService';
import type { TradeHubNode } from '../models/graph';
import { LIVE_EVENT_SCENARIOS } from '../models/event';
import type { WorldEvent, GraphMutation } from '../models/event';
import { v4 as uuid } from 'uuid';

// Callback registry for emitting events
let eventCallbacks: Array<(event: WorldEvent) => void> = [];

export function onNewsEvent(callback: (event: WorldEvent) => void): () => void {
  eventCallbacks.push(callback);
  return () => { eventCallbacks = eventCallbacks.filter(cb => cb !== callback); };
}

// ── GDELT Configuration ────────────────────────────────────

const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const DISRUPTION_KEYWORDS: Record<string, string[]> = {
  conflict: ['war', 'military', 'attack', 'tensions', 'sanctions', 'piracy', 'missile', 'bombing'],
  policy: ['tariff', 'trade war', 'sanctions', 'customs', 'export ban', 'embargo', 'trade deal'],
  weather: ['typhoon', 'hurricane', 'earthquake', 'flooding', 'drought', 'tsunami', 'cyclone', 'storm'],
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ── Haversine distance (km) ────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Find nearest hub within radius ─────────────────────────

function findNearestHub(lat: number, lng: number, maxKm: number = 500): TradeHubNode | null {
  try {
    const graph = loadGraph();
    let nearest: TradeHubNode | null = null;
    let bestDist = Infinity;
    for (const node of graph.nodes.values()) {
      const d = haversineKm(lat, lng, node.lat, node.lng);
      if (d < maxKm && d < bestDist) {
        bestDist = d;
        nearest = node;
      }
    }
    return nearest;
  } catch {
    return null;
  }
}

// ── Classify article ───────────────────────────────────────

function classifyArticle(title: string): { category: 'conflict' | 'policy' | 'weather'; severity: 'low' | 'medium' | 'high' | 'critical' } | null {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(DISRUPTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const severity =
          lower.includes('critical') || lower.includes('major') || lower.includes('severe') ? 'high' :
          lower.includes('minor') || lower.includes('small') ? 'low' : 'medium';
        return { category: cat as any, severity };
      }
    }
  }
  return null;
}

// ── GDELT Fetch ────────────────────────────────────────────

async function fetchGDELT(): Promise<void> {
  try {
    const url = `${GDELT_API}?query=trade OR shipping OR port OR sanctions&mode=artlist&maxrecords=20&format=json&timespan=15min`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    
    if (!resp.ok) {
      console.log(`[GDELT] ⚠️ API returned ${resp.status}, falling back to mock`);
      emitMockEvent();
      return;
    }

    const data = (await resp.json()) as any;
    const articles = data?.articles || [];

    if (articles.length === 0) {
      console.log('[GDELT] No articles found, using mock fallback');
      emitMockEvent();
      return;
    }

    let matched = 0;
    for (const article of articles.slice(0, 10)) {
      const classification = classifyArticle(article.title || '');
      if (!classification) continue;

      // Try geo-locating
      const lat = article.sourcecountry_lat || article.lat;
      const lng = article.sourcecountry_lng || article.lng;
      const hub = (lat && lng) ? findNearestHub(parseFloat(lat), parseFloat(lng)) : null;

      const event: WorldEvent = {
        id: `gdelt_${uuid().slice(0, 8)}`,
        timestamp: new Date().toISOString(),
        source: 'gdelt',
        category: classification.category,
        subcategory: classification.category,
        severity: classification.severity,
        affectedCountries: article.sourcecountry ? [article.sourcecountry] : [],
        affectedHubIds: hub ? [hub.id] : [],
        affectedChokepointIds: [],
        affectedRegionIds: hub ? [hub.regionId] : [],
        coordinates: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
        title: article.title?.slice(0, 120) || 'Untitled Event',
        summary: article.seendate ? `Source: ${article.domain || 'GDELT'} | ${article.seendate}` : 'Real-time intelligence feed',
        rawSourceUrl: article.url,
        graphMutations: hub ? [{
          targetType: 'node',
          targetId: hub.id,
          mutationType: 'update_property',
          property: 'currentRiskScore',
          operation: 'increment',
          value: classification.severity === 'high' ? 0.15 : classification.severity === 'critical' ? 0.25 : 0.08,
          durationHours: 24,
        }] : [],
        branchId: 'base',
        isSynthetic: false,
      };

      for (const cb of eventCallbacks) cb(event);
      matched++;
    }

    console.log(`[GDELT] Fetched ${articles.length} articles, ${matched} matched disruption filters`);
  } catch (err) {
    console.log('[GDELT] Fetch failed, falling back to mock producer');
    emitMockEvent();
  }
}

// ── Mock Fallback ──────────────────────────────────────────

function emitMockEvent(): void {
  const scenarios = LIVE_EVENT_SCENARIOS;
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  const event: WorldEvent = {
    id: `mock_${uuid().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    source: 'mock_gdelt',
    category: scenario.category,
    subcategory: scenario.subcategory,
    severity: scenario.severity,
    affectedCountries: scenario.affectedCountries,
    affectedHubIds: scenario.affectedHubIds,
    affectedChokepointIds: scenario.affectedChokepointIds,
    affectedRegionIds: [],
    title: scenario.title,
    summary: scenario.summary,
    graphMutations: scenario.mutations,
    branchId: 'base',
    isSynthetic: false,
  };

  for (const cb of eventCallbacks) cb(event);
  console.log(`[GDELT] 📰 Mock event: "${scenario.title}"`);
}

// ── Start / Stop ───────────────────────────────────────────

export function startNewsIngestion(): void {
  if (isRunning) return;
  isRunning = true;

  console.log('[GDELT] 📡 Starting news ingestion (5-min poll)...');
  
  // Initial fetch after 10s delay
  setTimeout(() => {
    fetchGDELT();
  }, 10000);

  pollTimer = setInterval(fetchGDELT, POLL_INTERVAL_MS);
}

export function stopNewsIngestion(): void {
  if (!isRunning) return;
  isRunning = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log('[GDELT] ⏹️ News ingestion stopped');
}
