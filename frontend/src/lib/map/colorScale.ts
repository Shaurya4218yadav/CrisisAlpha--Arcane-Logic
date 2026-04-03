// ============================================================
// CrisisAlpha — Map Color Scales
// Risk-based color mapping for nodes and edges
// ============================================================

import { NodeStatus } from '@/types';

export const STATUS_COLORS: Record<NodeStatus, string> = {
  safe: '#10b981',      // emerald-500
  stressed: '#f59e0b',  // amber-500
  risky: '#f97316',     // orange-500
  broken: '#ef4444',    // red-500
};

export const STATUS_GLOW: Record<NodeStatus, string> = {
  safe: 'rgba(16, 185, 129, 0.4)',
  stressed: 'rgba(245, 158, 11, 0.4)',
  risky: 'rgba(249, 115, 22, 0.5)',
  broken: 'rgba(239, 68, 68, 0.6)',
};

export function getRiskColor(risk: number): string {
  if (risk >= 0.8) return '#ef4444';
  if (risk >= 0.6) return '#f97316';
  if (risk >= 0.3) return '#f59e0b';
  return '#10b981';
}

export function getRiskGradient(risk: number): string {
  if (risk >= 0.8) return 'linear-gradient(135deg, #ef4444, #dc2626)';
  if (risk >= 0.6) return 'linear-gradient(135deg, #f97316, #ea580c)';
  if (risk >= 0.3) return 'linear-gradient(135deg, #f59e0b, #d97706)';
  return 'linear-gradient(135deg, #10b981, #059669)';
}

export const TRANSPORT_DASH: Record<string, number[]> = {
  sea: [],
  road: [8, 4],
  rail: [4, 4],
  air: [2, 6],
};

export const NODE_TYPE_SIZE: Record<string, number> = {
  port: 10,
  hub: 12,
  city: 8,
};

export const SEVERITY_COLORS = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
};
