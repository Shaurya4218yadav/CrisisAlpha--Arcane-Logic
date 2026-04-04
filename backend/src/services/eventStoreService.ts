// ============================================================
// CrisisAlpha — Event Store Service
// In-memory append-only event store with branch management
// ============================================================

import { v4 as uuid } from 'uuid';
import type { WorldEvent, GraphMutation } from '../models/event';

// Append-only event store
const eventStore: WorldEvent[] = [];

// ── Append Events ───────────────────────────────────────────

export function appendEvent(event: WorldEvent): WorldEvent {
  if (!event.id) event.id = `evt_${uuid().slice(0, 8)}`;
  if (!event.timestamp) event.timestamp = new Date().toISOString();
  eventStore.push(event);
  return event;
}

export function appendEvents(events: WorldEvent[]): WorldEvent[] {
  return events.map(e => appendEvent(e));
}

// ── Query Events ────────────────────────────────────────────

export function getEventsByBranch(branchId: string): WorldEvent[] {
  return eventStore.filter(e => e.branchId === branchId);
}

export function getBaseRealityEvents(): WorldEvent[] {
  return getEventsByBranch('base');
}

export function getSimulationEvents(simulationId: string): WorldEvent[] {
  return getEventsByBranch(simulationId);
}

export function getEventsSince(timestamp: string, branchId?: string): WorldEvent[] {
  const since = new Date(timestamp).getTime();
  return eventStore.filter(e => {
    if (branchId && e.branchId !== branchId) return false;
    return new Date(e.timestamp).getTime() >= since;
  });
}

export function getRecentEvents(limit: number = 20): WorldEvent[] {
  return eventStore
    .filter(e => e.branchId === 'base')
    .slice(-limit)
    .reverse();
}

export function getAllEvents(): WorldEvent[] {
  return [...eventStore];
}

// ── Event Replay (for state reconstruction) ─────────────────

export function replayEventsForBranch(
  simulationId: string,
  forkTimestamp: string
): WorldEvent[] {
  const forkTime = new Date(forkTimestamp).getTime();

  // Base events before fork
  const baseBeforeFork = eventStore.filter(
    e => e.branchId === 'base' && new Date(e.timestamp).getTime() < forkTime
  );

  // Simulation-specific events
  const simEvents = eventStore.filter(e => e.branchId === simulationId);

  // Passed base events after fork (applied by causality filter)
  const passedAfterFork = eventStore.filter(
    e => e.branchId === `${simulationId}_passed` && new Date(e.timestamp).getTime() >= forkTime
  );

  return [...baseBeforeFork, ...simEvents, ...passedAfterFork].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// ── Create Synthetic Event (for What-If injection) ──────────

export function createSyntheticEvent(
  simulationId: string,
  title: string,
  summary: string,
  category: WorldEvent['category'],
  severity: WorldEvent['severity'],
  affectedHubIds: string[],
  affectedCountries: string[],
  affectedChokepointIds: string[],
  mutations: GraphMutation[]
): WorldEvent {
  const event: WorldEvent = {
    id: `syn_${uuid().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    source: 'simulation',
    category,
    subcategory: 'hypothesis',
    severity,
    affectedCountries,
    affectedHubIds,
    affectedChokepointIds,
    affectedRegionIds: [],
    title,
    summary,
    graphMutations: mutations,
    branchId: simulationId,
    isSynthetic: true,
  };

  return appendEvent(event);
}

// ── Stats ───────────────────────────────────────────────────

export function getEventStoreStats() {
  const baseEvents = eventStore.filter(e => e.branchId === 'base');
  const syntheticEvents = eventStore.filter(e => e.isSynthetic);
  const branches = new Set(eventStore.map(e => e.branchId));

  return {
    totalEvents: eventStore.length,
    baseRealityEvents: baseEvents.length,
    syntheticEvents: syntheticEvents.length,
    activeBranches: branches.size,
    oldestEvent: eventStore.length > 0 ? eventStore[0].timestamp : null,
    newestEvent: eventStore.length > 0 ? eventStore[eventStore.length - 1].timestamp : null,
  };
}
