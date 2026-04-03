// ============================================================
// CrisisAlpha — API Client
// HTTP + Socket.IO connections to backend
// ============================================================

import { io, Socket } from 'socket.io-client';
import { ScenarioConfig, TickPayload, SimulationComplete } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ---- REST API ----

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getGraph: () => fetchJSON('/api/graph'),
  getPresets: () => fetchJSON('/api/presets'),
  getIndustries: () => fetchJSON('/api/industries'),

  createScenario: (config: ScenarioConfig) =>
    fetchJSON('/api/scenario/create', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  startScenario: (id: string) =>
    fetchJSON(`/api/scenario/${id}/start`, { method: 'POST' }),

  pauseScenario: (id: string) =>
    fetchJSON(`/api/scenario/${id}/pause`, { method: 'POST' }),

  resumeScenario: (id: string) =>
    fetchJSON(`/api/scenario/${id}/resume`, { method: 'POST' }),

  resetScenario: (id: string) =>
    fetchJSON(`/api/scenario/${id}/reset`, { method: 'POST' }),

  applyDecision: (id: string, recommendationId: string) =>
    fetchJSON(`/api/scenario/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ recommendationId }),
    }),

  getState: (id: string) => fetchJSON(`/api/scenario/${id}/state`),
  getSummary: (id: string) => fetchJSON(`/api/scenario/${id}/summary`),
};

// ---- WebSocket ----

let socket: Socket | null = null;

export function connectSocket(
  scenarioId: string,
  onTick: (payload: TickPayload) => void,
  onComplete: (data: SimulationComplete) => void
): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io(API_BASE, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[WS] Connected');
    socket?.emit('join_scenario', scenarioId);
  });

  socket.on('tick', onTick);
  socket.on('simulation_complete', onComplete);

  socket.on('disconnect', () => {
    console.log('[WS] Disconnected');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
