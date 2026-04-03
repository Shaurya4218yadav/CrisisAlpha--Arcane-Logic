// ============================================================
// CrisisAlpha — Event Service
// Watches graph state and emits threshold-based events
// ============================================================

import { GraphState } from '../models/graph';
import { SimulationEvent, EVENT_TEMPLATES } from '../models/event';
import { ScenarioConfig } from '../models/scenario';
import { v4 as uuid } from 'uuid';

// Track which events have been emitted to avoid duplicates
const emittedEvents = new Map<string, Set<string>>(); // scenarioId -> Set of event keys

export function initEventTracker(scenarioId: string): void {
  emittedEvents.set(scenarioId, new Set());
}

export function clearEventTracker(scenarioId: string): void {
  emittedEvents.delete(scenarioId);
}

export function detectEvents(
  graph: GraphState,
  config: ScenarioConfig,
  tick: number,
  scenarioId: string
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const emitted = emittedEvents.get(scenarioId) || new Set();

  for (const [nodeId, node] of graph.nodes) {
    // Port shutdown
    if (node.type === 'port' && node.riskScore >= 0.75) {
      const key = `port_shutdown_${nodeId}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        events.push(createEvent('port_shutdown', tick, node.name, [nodeId]));
      }
    }

    // Hub critical
    if (node.type === 'hub' && node.riskScore >= 0.8) {
      const key = `hub_critical_${nodeId}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        events.push(createEvent('hub_critical', tick, node.name, [nodeId]));
      }
    }

    // Node stressed (first time crossing 0.3)
    if (node.riskScore >= 0.3 && node.riskScore < 0.6) {
      const key = `node_stressed_${nodeId}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        events.push(createEvent('node_stressed', tick, node.name, [nodeId]));
      }
    }

    // Demand spike in safe zone
    if (node.riskScore < 0.2 && node.baseDemand > 70) {
      // Check if neighbors are under stress
      const edgeIds = graph.adjacency.get(nodeId) || [];
      let hasStressedNeighbor = false;
      for (const edgeId of edgeIds) {
        const edge = graph.edges.get(edgeId);
        if (!edge) continue;
        const neighborId = edge.sourceNodeId === nodeId ? edge.targetNodeId : edge.sourceNodeId;
        const neighbor = graph.nodes.get(neighborId);
        if (neighbor && neighbor.riskScore >= 0.5) {
          hasStressedNeighbor = true;
          break;
        }
      }
      if (hasStressedNeighbor) {
        const key = `demand_spike_${nodeId}`;
        if (!emitted.has(key)) {
          emitted.add(key);
          events.push(createEvent('demand_spike_safe_zone', tick, node.name, [nodeId]));
        }
      }
    }
  }

  // Edge-based events
  for (const [edgeId, edge] of graph.edges) {
    // Route broken
    if (edge.riskScore >= 0.8) {
      const key = `route_broken_${edgeId}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        const sourceNode = graph.nodes.get(edge.sourceNodeId);
        const targetNode = graph.nodes.get(edge.targetNodeId);
        const routeName = `${sourceNode?.name || edge.sourceNodeId} → ${targetNode?.name || edge.targetNodeId}`;
        events.push(createEvent('route_broken', tick, routeName, [], [edgeId]));
      }
    }

    // Fuel shortage worsening on fuel-sensitive routes
    if (edge.fuelSensitivity > 0.6 && edge.riskScore >= 0.5) {
      const key = `fuel_shortage_${edgeId}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        const sourceNode = graph.nodes.get(edge.sourceNodeId);
        events.push(createEvent('fuel_shortage_worsening', tick, sourceNode?.name || edge.sourceNodeId, [], [edgeId]));
      }
    }

    // Policy restriction escalation
    if (edge.policySensitivity > 0.5 && edge.riskScore >= 0.6) {
      const key = `policy_restriction_${edgeId}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        const sourceNode = graph.nodes.get(edge.sourceNodeId);
        events.push(createEvent('policy_restriction_escalation', tick, sourceNode?.name || edge.sourceNodeId, [], [edgeId]));
      }
    }
  }

  // Cascade spreading event (check at certain ticks)
  if (tick % 3 === 0 && tick > 1) {
    const stressedNodes = Array.from(graph.nodes.values()).filter(n => n.riskScore >= 0.3);
    const originNode = graph.nodes.get(config.originNodeId);
    if (stressedNodes.length >= 3) {
      const key = `cascade_spreading_tick_${tick}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        events.push(createEvent(
          'cascade_spreading',
          tick,
          originNode?.name || config.originNodeId,
          stressedNodes.map(n => n.id)
        ));
      }
    }
  }

  return events;
}

function createEvent(
  type: string,
  tick: number,
  contextName: string,
  relatedNodeIds: string[] = [],
  relatedEdgeIds: string[] = []
): SimulationEvent {
  const template = EVENT_TEMPLATES[type];
  if (!template) {
    return {
      id: `evt_${uuid().slice(0, 8)}`,
      tick,
      type,
      severity: 'low',
      title: type,
      message: `Event at ${contextName}`,
      relatedNodeIds,
      relatedEdgeIds,
    };
  }

  return {
    id: `evt_${uuid().slice(0, 8)}`,
    tick,
    type,
    severity: template.severity,
    title: template.title,
    message: template.messageFn(contextName),
    relatedNodeIds,
    relatedEdgeIds,
  };
}
