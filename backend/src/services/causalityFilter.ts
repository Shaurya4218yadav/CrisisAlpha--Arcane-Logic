// ============================================================
// CrisisAlpha — Causality Filter
// Three-tier filtering: Topological → Semantic → LLM
// ============================================================

import type { WorldEvent } from '../models/event';
import type { SimulationConfig, SimulationAxiom, CausalityResult } from '../models/simulation';
import type { GraphState } from '../models/graph';
import { shortestHopDistance } from './graphService';

const MAX_HOPS = 3;
const SEMANTIC_SIMILARITY_THRESHOLD = 0.6;

// ── Main Pipeline ───────────────────────────────────────────

export async function evaluateEvent(
  event: WorldEvent,
  simulation: SimulationConfig,
  graph: GraphState,
): Promise<CausalityResult> {
  // Tier 1: Topological Filter
  const tier1Result = tier1Filter(event, simulation, graph);
  if (tier1Result === 'pass') {
    return { decision: 'PASS', reason: 'Event is topologically distant from simulation scope', tier: 1, confidence: 0.95 };
  }

  // Tier 2: Semantic Filter
  const tier2Result = tier2Filter(event, simulation);
  if (tier2Result === 'pass') {
    return { decision: 'PASS', reason: 'Event is semantically unrelated to simulation axioms', tier: 2, confidence: 0.85 };
  }

  // Tier 3: Reasoning (heuristic-based since no LLM in this path)
  const tier3Result = tier3HeuristicFilter(event, simulation);
  return tier3Result;
}

// ── Tier 1: Topological Relevance ───────────────────────────

function tier1Filter(event: WorldEvent, simulation: SimulationConfig, graph: GraphState): 'pass' | 'escalate' {
  const simNodeIds = new Set<string>([
    ...simulation.hypothesis.affectedHubIds,
    simulation.originNodeId,
  ]);

  // Add axiom-blocked country nodes
  for (const axiom of simulation.axioms) {
    if (axiom.blockedCountries) {
      for (const [nodeId, node] of graph.nodes) {
        if (axiom.blockedCountries.includes(node.countryId)) {
          simNodeIds.add(nodeId);
        }
      }
    }
  }

  // Check each affected hub in the event
  for (const eventHubId of event.affectedHubIds) {
    if (!graph.nodes.has(eventHubId)) continue;
    const distance = shortestHopDistance(graph, eventHubId, simNodeIds);
    if (distance <= MAX_HOPS) {
      return 'escalate'; // close enough — send to Tier 2
    }
  }

  return 'pass'; // too far away
}

// ── Tier 2: Semantic Relevance ──────────────────────────────

function tier2Filter(event: WorldEvent, simulation: SimulationConfig): 'pass' | 'escalate' {
  // Simplified keyword-based semantic comparison (no vector embeddings for MVP)
  const eventText = `${event.title} ${event.summary} ${event.category} ${event.subcategory}`.toLowerCase();

  for (const axiom of simulation.axioms) {
    const axiomText = axiom.naturalLanguage.toLowerCase();
    const axiomKeywords = extractKeywords(axiomText);

    let matchCount = 0;
    for (const keyword of axiomKeywords) {
      if (eventText.includes(keyword)) matchCount++;
    }

    const similarity = axiomKeywords.length > 0 ? matchCount / axiomKeywords.length : 0;
    if (similarity >= SEMANTIC_SIMILARITY_THRESHOLD) {
      return 'escalate'; // semantically related
    }
  }

  // Category-level matching
  const hypothesisText = `${simulation.hypothesis.title} ${simulation.hypothesis.description}`.toLowerCase();
  if (hypothesisText.includes(event.category) || hypothesisText.includes(event.subcategory)) {
    return 'escalate';
  }

  return 'pass';
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'shall', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'between', 'through', 'during', 'before', 'after', 'to', 'from', 'of', 'that', 'this', 'these', 'those']);
  return text
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

// ── Tier 3: Heuristic Reasoning ─────────────────────────────

function tier3HeuristicFilter(event: WorldEvent, simulation: SimulationConfig): CausalityResult {
  // Check if event directly contradicts any axiom
  for (const axiom of simulation.axioms) {
    // Category blocks
    if (axiom.type === 'block_category' && axiom.blockedCategories) {
      if (axiom.blockedCategories.includes(event.category) || axiom.blockedCategories.includes(event.subcategory)) {
        return {
          decision: 'BLOCK',
          reason: `Event category "${event.category}/${event.subcategory}" is blocked by axiom: "${axiom.statement}"`,
          tier: 3,
          confidence: 0.9,
        };
      }
    }

    // Country blocks (e.g., peace treaty events between warring countries)
    if (axiom.type === 'block_relationship' && axiom.blockedCountries) {
      const eventCountries = new Set(event.affectedCountries);
      const blockedOverlap = axiom.blockedCountries.filter(c => eventCountries.has(c));
      if (blockedOverlap.length >= 2) {
        // Event involves multiple blocked countries — likely contradicts
        if (event.category === 'political' && event.subcategory.includes('peace') || event.subcategory.includes('agreement')) {
          return {
            decision: 'BLOCK',
            reason: `Peace/agreement event between blocked countries contradicts axiom: "${axiom.statement}"`,
            tier: 3,
            confidence: 0.85,
          };
        }
      }
    }

    // Enforce state — block events that would change enforced states
    if (axiom.type === 'enforce_state' && axiom.enforcedStates) {
      for (const enforced of axiom.enforcedStates) {
        const mutationConflict = event.graphMutations.find(
          m => m.targetId === enforced.targetId && m.property === enforced.property
        );
        if (mutationConflict) {
          return {
            decision: 'MODIFY',
            reason: `Event tries to change enforced state on ${enforced.targetId}.${enforced.property}. Mutation adjusted.`,
            modification: `Remove mutation on ${enforced.targetId}.${enforced.property}`,
            tier: 3,
            confidence: 0.8,
          };
        }
      }
    }
  }

  // Default: PASS the event
  return {
    decision: 'PASS',
    reason: 'Event does not contradict any simulation axioms',
    tier: 3,
    confidence: 0.7,
  };
}

// ── Batch evaluate ──────────────────────────────────────────

export async function evaluateEvents(
  events: WorldEvent[],
  simulation: SimulationConfig,
  graph: GraphState,
): Promise<Map<string, CausalityResult>> {
  const results = new Map<string, CausalityResult>();
  for (const event of events) {
    const result = await evaluateEvent(event, simulation, graph);
    results.set(event.id, result);
  }
  return results;
}
