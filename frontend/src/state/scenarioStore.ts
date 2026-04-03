// ============================================================
// CrisisAlpha — Zustand Store
// Central state management for the simulation
// ============================================================

import { create } from 'zustand';
import {
  ScenarioConfig,
  GraphNode,
  GraphEdge,
  SimulationEvent,
  Recommendation,
  ScoreSnapshot,
  TickPayload,
  Preset,
  SimulationComplete,
  UserProfile,
} from '@/types';

export type SimPhase = 'setup' | 'running' | 'paused' | 'completed';

interface ScenarioState {
  // Phase
  phase: SimPhase;
  setPhase: (phase: SimPhase) => void;

  // Scenario
  scenarioId: string | null;
  config: ScenarioConfig;
  setScenarioId: (id: string) => void;
  updateConfig: (partial: Partial<ScenarioConfig>) => void;

  // Graph
  nodes: GraphNode[];
  edges: GraphEdge[];
  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;

  // Simulation
  currentTick: number;
  maxTicks: number;
  dayLabel: string;

  // Events
  events: SimulationEvent[];
  addEvents: (events: SimulationEvent[]) => void;

  // Recommendations
  recommendations: Recommendation[];

  // Score
  score: ScoreSnapshot;

  // Final results
  finalResult: SimulationComplete | null;
  setFinalResult: (result: SimulationComplete) => void;

  // Presets
  presets: Preset[];
  setPresets: (presets: Preset[]) => void;
  applyPreset: (preset: Preset) => void;

  // Selected node (for map interaction)
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // User profile
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;

  // Process tick
  processTick: (payload: TickPayload) => void;

  // Reset
  reset: () => void;
}

const defaultConfig: ScenarioConfig = {
  originNodeId: '',
  industry: 'energy',
  conflictIntensity: 0.5,
  fuelShortage: 0.5,
  policyRestriction: 0.5,
  durationDays: 14,
  userGoal: 'balanced',
  riskSensitivity: 0.5,
  propagationSpeed: 0.5,
  demandVolatility: 0.3,
};

const defaultScore: ScoreSnapshot = {
  riskAvoided: 100,
  profitGained: 0,
  networkEfficiency: 100,
  demandServed: 100,
  routeFailures: 0,
  overallScore: 0,
};

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  phase: 'setup',
  setPhase: (phase) => set({ phase }),

  scenarioId: null,
  config: { ...defaultConfig },
  setScenarioId: (id) => set({ scenarioId: id }),
  updateConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  nodes: [],
  edges: [],
  setGraph: (nodes, edges) => set({ nodes, edges }),

  currentTick: 0,
  maxTicks: 14,
  dayLabel: 'Day 0',

  events: [],
  addEvents: (newEvents) =>
    set((state) => ({ events: [...state.events, ...newEvents] })),

  recommendations: [],
  score: { ...defaultScore },

  finalResult: null,
  setFinalResult: (result) => set({ finalResult: result, phase: 'completed' }),

  presets: [],
  setPresets: (presets) => set({ presets }),
  applyPreset: (preset) =>
    set((state) => ({
      config: {
        ...state.config,
        originNodeId: preset.originNodeId,
        industry: preset.industry,
        conflictIntensity: preset.conflictIntensity,
        fuelShortage: preset.fuelShortage,
        policyRestriction: preset.policyRestriction,
        durationDays: preset.durationDays,
      },
      selectedNodeId: preset.originNodeId,
    })),

  selectedNodeId: null,
  setSelectedNodeId: (id) =>
    set((state) => ({
      selectedNodeId: id,
      config: id ? { ...state.config, originNodeId: id } : state.config,
    })),

  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),

  processTick: (payload) =>
    set((state) => ({
      currentTick: payload.tick,
      maxTicks: state.maxTicks,
      dayLabel: payload.dayLabel,
      nodes: payload.nodes,
      edges: payload.edges,
      events: [...state.events, ...payload.events],
      recommendations: payload.recommendations,
      score: payload.score,
    })),

  reset: () =>
    set({
      phase: 'setup',
      scenarioId: null,
      config: { ...defaultConfig },
      nodes: [],
      edges: [],
      currentTick: 0,
      maxTicks: 14,
      dayLabel: 'Day 0',
      events: [],
      recommendations: [],
      score: { ...defaultScore },
      finalResult: null,
      selectedNodeId: null,
    }),
}));
