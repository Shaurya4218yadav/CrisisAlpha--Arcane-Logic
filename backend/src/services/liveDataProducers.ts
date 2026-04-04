// ============================================================
// CrisisAlpha — Live Data Producers
// Mock AIS ship traffic + weather alert generators
// ============================================================

import { loadGraph } from './graphService';
import type { WorldEvent, GraphMutation } from '../models/event';
import { v4 as uuid } from 'uuid';

// Callback registries
let trafficCallbacks: Array<(update: TrafficUpdate) => void> = [];
let weatherCallbacks: Array<(event: WorldEvent) => void> = [];

export interface TrafficUpdate {
  edgeId: string;
  sourceHubId: string;
  targetHubId: string;
  activeVessels: number;
  volumeMultiplier: number; // 0.85-1.15 (±15% variance)
  timestamp: string;
}

export function onTrafficUpdate(cb: (u: TrafficUpdate) => void): () => void {
  trafficCallbacks.push(cb);
  return () => { trafficCallbacks = trafficCallbacks.filter(c => c !== cb); };
}

export function onWeatherEvent(cb: (e: WorldEvent) => void): () => void {
  weatherCallbacks.push(cb);
  return () => { weatherCallbacks = weatherCallbacks.filter(c => c !== cb); };
}

// ── AIS Ship Traffic Mock Producer ─────────────────────────

let trafficTimer: ReturnType<typeof setInterval> | null = null;
const TRAFFIC_INTERVAL_MS = 30_000; // 30 seconds

function emitTrafficUpdates(): void {
  try {
    const graph = loadGraph();
    const edges = Array.from(graph.edges.values());

    // Pick 5-10 random edges to update
    const count = 5 + Math.floor(Math.random() * 6);
    const shuffled = edges.sort(() => Math.random() - 0.5).slice(0, count);

    for (const edge of shuffled) {
      // Variance: ±5-15% around baseline
      const variance = 0.85 + Math.random() * 0.30; // 0.85 to 1.15
      const activeVessels = Math.max(1, Math.round((edge.baseVolumeTEU / 5000) * variance));

      // Random minor delay (5% chance)
      const hasDelay = Math.random() < 0.05;
      const multiplier = hasDelay ? (0.80 + Math.random() * 0.10) : variance;

      const update: TrafficUpdate = {
        edgeId: edge.id,
        sourceHubId: edge.sourceHubId,
        targetHubId: edge.targetHubId,
        activeVessels,
        volumeMultiplier: Math.round(multiplier * 1000) / 1000,
        timestamp: new Date().toISOString(),
      };

      // Apply to graph in-memory
      edge.currentVolumeTEU = Math.round(edge.baseVolumeTEU * multiplier);

      for (const cb of trafficCallbacks) cb(update);
    }
  } catch (err) {
    // Graph not loaded yet, skip
  }
}

// ── Weather Alert Mock Producer ────────────────────────────

let weatherTimer: ReturnType<typeof setInterval> | null = null;
const WEATHER_INTERVAL_MS = 2 * 60_000; // 2 minutes

// Seasonal probability models
interface WeatherZone {
  hubIds: string[];
  chokepointIds: string[];
  region: string;
  type: string;
  peakMonths: number[]; // 0-indexed
  baseProbability: number;
  peakProbability: number;
  severities: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; weight: number }>;
}

const WEATHER_ZONES: WeatherZone[] = [
  {
    hubIds: ['shanghai', 'busan', 'kaohsiung', 'taipei', 'hongkong'],
    chokepointIds: ['taiwan_strait'],
    region: 'East Asia',
    type: 'Typhoon',
    peakMonths: [5, 6, 7, 8, 9, 10], // June-Nov
    baseProbability: 0.05,
    peakProbability: 0.35,
    severities: [
      { severity: 'medium', weight: 0.5 },
      { severity: 'high', weight: 0.35 },
      { severity: 'critical', weight: 0.15 },
    ],
  },
  {
    hubIds: ['mumbai', 'chennai', 'colombo', 'karachi'],
    chokepointIds: [],
    region: 'South Asia',
    type: 'Monsoon',
    peakMonths: [5, 6, 7, 8], // June-Sept
    baseProbability: 0.08,
    peakProbability: 0.40,
    severities: [
      { severity: 'low', weight: 0.3 },
      { severity: 'medium', weight: 0.5 },
      { severity: 'high', weight: 0.2 },
    ],
  },
  {
    hubIds: ['rotterdam', 'hamburg', 'london', 'felixstowe', 'antwerp', 'lehavre'],
    chokepointIds: ['english_channel'],
    region: 'Northern Europe',
    type: 'Winter Storm',
    peakMonths: [10, 11, 0, 1, 2], // Nov-Mar
    baseProbability: 0.05,
    peakProbability: 0.25,
    severities: [
      { severity: 'low', weight: 0.4 },
      { severity: 'medium', weight: 0.45 },
      { severity: 'high', weight: 0.15 },
    ],
  },
  {
    hubIds: ['houston', 'newyork', 'savannah', 'panama_city'],
    chokepointIds: ['panama_canal'],
    region: 'Atlantic',
    type: 'Hurricane',
    peakMonths: [5, 6, 7, 8, 9], // June-Oct
    baseProbability: 0.04,
    peakProbability: 0.20,
    severities: [
      { severity: 'medium', weight: 0.4 },
      { severity: 'high', weight: 0.4 },
      { severity: 'critical', weight: 0.2 },
    ],
  },
  {
    hubIds: ['dubai', 'muscat', 'doha', 'jeddah'],
    chokepointIds: ['strait_of_hormuz'],
    region: 'Arabian Gulf',
    type: 'Sandstorm',
    peakMonths: [2, 3, 4, 5], // Mar-Jun
    baseProbability: 0.06,
    peakProbability: 0.20,
    severities: [
      { severity: 'low', weight: 0.5 },
      { severity: 'medium', weight: 0.4 },
      { severity: 'high', weight: 0.1 },
    ],
  },
];

function pickSeverity(zone: WeatherZone): 'low' | 'medium' | 'high' | 'critical' {
  const r = Math.random();
  let cumulative = 0;
  for (const s of zone.severities) {
    cumulative += s.weight;
    if (r <= cumulative) return s.severity;
  }
  return 'medium';
}

function emitWeatherEvent(): void {
  const month = new Date().getMonth();

  for (const zone of WEATHER_ZONES) {
    const isPeak = zone.peakMonths.includes(month);
    const probability = isPeak ? zone.peakProbability : zone.baseProbability;

    if (Math.random() > probability) continue;

    const severity = pickSeverity(zone);
    const affectedHub = zone.hubIds[Math.floor(Math.random() * zone.hubIds.length)];
    const durationHours = severity === 'critical' ? 72 : severity === 'high' ? 48 : severity === 'medium' ? 24 : 12;
    const riskIncrement = severity === 'critical' ? 0.35 : severity === 'high' ? 0.25 : severity === 'medium' ? 0.15 : 0.08;

    const mutations: GraphMutation[] = [
      {
        targetType: 'node',
        targetId: affectedHub,
        mutationType: 'update_property',
        property: 'currentRiskScore',
        operation: 'increment',
        value: riskIncrement,
        durationHours,
      },
    ];

    // Also affect chokepoint if applicable
    if (zone.chokepointIds.length > 0) {
      mutations.push({
        targetType: 'chokepoint',
        targetId: zone.chokepointIds[0],
        mutationType: 'update_property',
        property: 'currentRiskScore',
        operation: 'increment',
        value: riskIncrement * 0.5,
        durationHours,
      });
    }

    const event: WorldEvent = {
      id: `wx_${uuid().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      source: 'weather_mock',
      category: 'weather',
      subcategory: zone.type.toLowerCase().replace(/ /g, '_'),
      severity,
      affectedCountries: [],
      affectedHubIds: [affectedHub],
      affectedChokepointIds: zone.chokepointIds,
      affectedRegionIds: [],
      title: `${zone.type} Warning: ${zone.region}`,
      summary: `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${zone.type.toLowerCase()} affecting ${zone.region}. Duration: ~${durationHours}h. Port operations may be impacted.`,
      graphMutations: mutations,
      branchId: 'base',
      isSynthetic: false,
    };

    for (const cb of weatherCallbacks) cb(event);
    console.log(`[Weather] 🌀 ${zone.type} [${severity}] → ${affectedHub} (${zone.region})`);
  }
}

// ── Start / Stop ───────────────────────────────────────────

export function startTrafficProducer(): void {
  if (trafficTimer) return;
  console.log('[Traffic] 🚢 Mock AIS producer started (30s interval)');
  emitTrafficUpdates(); // Initial emit
  trafficTimer = setInterval(emitTrafficUpdates, TRAFFIC_INTERVAL_MS);
}

export function stopTrafficProducer(): void {
  if (trafficTimer) {
    clearInterval(trafficTimer);
    trafficTimer = null;
  }
}

export function startWeatherProducer(): void {
  if (weatherTimer) return;
  console.log('[Weather] 🌤️ Mock weather producer started (2-min interval)');
  // First event after 30s
  setTimeout(emitWeatherEvent, 30000);
  weatherTimer = setInterval(emitWeatherEvent, WEATHER_INTERVAL_MS);
}

export function stopWeatherProducer(): void {
  if (weatherTimer) {
    clearInterval(weatherTimer);
    weatherTimer = null;
  }
}

export function startAllProducers(): void {
  startTrafficProducer();
  startWeatherProducer();
  console.log('[LIVE] 🛰️ Real-time data producers active');
}

export function stopAllProducers(): void {
  stopTrafficProducer();
  stopWeatherProducer();
}
