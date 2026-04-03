// ============================================================
// CrisisAlpha — Event Detection Service (v2)
// Expanded threshold-based event detection
// ============================================================

import { v4 as uuid } from 'uuid';
import type { GraphState } from '../models/graph';
import type { SimulationEvent } from '../models/event';
import { EVENT_TEMPLATES } from '../models/event';

// Track which events have been emitted to avoid duplicates
const emittedEvents = new Map<string, Set<string>>();

function getTracker(simulationId: string): Set<string> {
  if (!emittedEvents.has(simulationId)) {
    emittedEvents.set(simulationId, new Set());
  }
  return emittedEvents.get(simulationId)!;
}

export function clearTracker(simulationId: string): void {
  emittedEvents.delete(simulationId);
}

// ── Main Detection ──────────────────────────────────────────

export function detectEvents(
  graph: GraphState,
  simulationId: string,
  tick: number
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const tracker = getTracker(simulationId);

  // Node-based events
  for (const [, node] of graph.nodes) {
    // Port shutdown
    if (node.currentRiskScore >= 0.8 && (node.type === 'port' || node.type === 'hub')) {
      const key = `port_shutdown_${node.id}`;
      if (!tracker.has(key)) {
        tracker.add(key);
        const template = EVENT_TEMPLATES.port_shutdown;
        events.push(createEvent(tick, 'port_shutdown', template.severity, template.title, template.messageFn(node.name), template.category, [node.id]));
      }
    }
    // Hub critical
    else if (node.currentRiskScore >= 0.6 && node.currentRiskScore < 0.8) {
      const key = `hub_critical_${node.id}`;
      if (!tracker.has(key)) {
        tracker.add(key);
        const template = EVENT_TEMPLATES.hub_critical;
        events.push(createEvent(tick, 'hub_critical', template.severity, template.title, template.messageFn(node.name), template.category, [node.id]));
      }
    }
    // Node stressed
    else if (node.currentRiskScore >= 0.3 && node.currentRiskScore < 0.6) {
      const key = `node_stressed_${node.id}`;
      if (!tracker.has(key)) {
        tracker.add(key);
        const template = EVENT_TEMPLATES.node_stressed;
        events.push(createEvent(tick, 'node_stressed', template.severity, template.title, template.messageFn(node.name), template.category, [node.id]));
      }
    }

    // Demand spike in safe zones (profit opportunity)
    if (node.currentRiskScore < 0.1 && node.baseDemand > 70) {
      // Check if neighbors are disrupted
      const adjEdges = graph.adjacency.get(node.id) || [];
      let disruptedNeighbors = 0;
      for (const edgeId of adjEdges) {
        const edge = graph.edges.get(edgeId);
        if (edge && edge.currentRiskScore > 0.5) disruptedNeighbors++;
      }
      if (disruptedNeighbors >= 2) {
        const key = `demand_spike_${node.id}_${tick}`;
        if (!tracker.has(key)) {
          tracker.add(key);
          const template = EVENT_TEMPLATES.demand_spike_safe_zone;
          events.push(createEvent(tick, 'demand_spike', template.severity, template.title, template.messageFn(node.name), template.category, [node.id]));
        }
      }
    }
  }

  // Edge-based events
  for (const [, edge] of graph.edges) {
    if (edge.currentRiskScore >= 0.8) {
      const key = `route_broken_${edge.id}`;
      if (!tracker.has(key)) {
        tracker.add(key);
        const template = EVENT_TEMPLATES.route_broken;
        const routeName = `${edge.sourceHubId} → ${edge.targetHubId}`;
        events.push(createEvent(tick, 'route_broken', template.severity, template.title, template.messageFn(routeName), template.category, [], [edge.id]));
      }
    }

    // Route restored
    if (edge.currentRiskScore < 0.3 && tracker.has(`route_broken_${edge.id}`)) {
      const key = `route_restored_${edge.id}_${tick}`;
      if (!tracker.has(key)) {
        tracker.add(key);
        const template = EVENT_TEMPLATES.route_restored;
        const routeName = `${edge.sourceHubId} → ${edge.targetHubId}`;
        events.push(createEvent(tick, 'route_restored', template.severity, template.title, template.messageFn(routeName), template.category, [], [edge.id]));
      }
    }
  }

  // Chokepoint events
  for (const [, cp] of graph.chokepoints) {
    if (cp.currentRiskScore >= 0.7) {
      const key = `chokepoint_blocked_${cp.id}`;
      if (!tracker.has(key)) {
        tracker.add(key);
        const template = EVENT_TEMPLATES.chokepoint_blocked;
        events.push(createEvent(tick, 'chokepoint_blocked', template.severity, template.title, template.messageFn(cp.name), template.category, [], [], [cp.id]));
      }
    } else if (cp.currentRiskScore >= 0.4 && cp.currentRiskScore < 0.7) {
      const key = `chokepoint_threatened_${cp.id}`;
      if (!tracker.has(key)) {
        tracker.add(key);
        const template = EVENT_TEMPLATES.chokepoint_threatened;
        events.push(createEvent(tick, 'chokepoint_threatened', template.severity, template.title, template.messageFn(cp.name), template.category, [], [], [cp.id]));
      }
    }
  }

  // Cascade events
  const totalNodes = graph.nodes.size;
  const disruptedNodes = Array.from(graph.nodes.values()).filter(n => n.currentRiskScore > 0.5).length;
  const disruptedPct = disruptedNodes / totalNodes;

  if (disruptedPct >= 0.3 && !tracker.has(`cascade_critical_${tick}`)) {
    tracker.add(`cascade_critical_${tick}`);
    const template = EVENT_TEMPLATES.cascade_critical_mass;
    events.push(createEvent(tick, 'cascade_critical', template.severity, template.title, template.messageFn('global'), template.category));
  } else if (disruptedPct >= 0.15 && disruptedPct < 0.3 && !tracker.has(`cascade_spreading_${tick}`)) {
    tracker.add(`cascade_spreading_${tick}`);
    const template = EVENT_TEMPLATES.cascade_spreading;
    events.push(createEvent(tick, 'cascade_spreading', template.severity, template.title, template.messageFn('affected'), template.category));
  }

  return events;
}

// ── Helper ──────────────────────────────────────────────────

function createEvent(
  tick: number,
  type: string,
  severity: SimulationEvent['severity'],
  title: string,
  message: string,
  category?: string,
  relatedNodeIds?: string[],
  relatedEdgeIds?: string[],
  relatedChokepointIds?: string[]
): SimulationEvent {
  return {
    id: `sevt_${uuid().slice(0, 8)}`,
    tick,
    type,
    severity,
    title,
    message,
    category: category as any,
    relatedNodeIds,
    relatedEdgeIds,
    relatedChokepointIds,
    timestamp: new Date().toISOString(),
  };
}
