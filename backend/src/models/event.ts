// ============================================================
// CrisisAlpha — Event Models
// ============================================================

export interface SimulationEvent {
  id: string;
  tick: number;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  relatedNodeIds?: string[];
  relatedEdgeIds?: string[];
}

export const EVENT_TEMPLATES: Record<string, {
  title: string;
  messageFn: (name: string) => string;
  severity: 'low' | 'medium' | 'high';
}> = {
  port_shutdown: {
    title: 'Port Shutdown Detected',
    messageFn: (name) => `Major disruption: ${name} port operations have ceased.`,
    severity: 'high',
  },
  hub_critical: {
    title: 'Hub Reached Critical Risk',
    messageFn: (name) => `Logistics hub at ${name} is at critical risk levels.`,
    severity: 'high',
  },
  route_broken: {
    title: 'Route Collapsed',
    messageFn: (name) => `Transport route ${name} has become non-operational.`,
    severity: 'high',
  },
  fuel_shortage_worsening: {
    title: 'Fuel Shortage Intensifying',
    messageFn: (name) => `Fuel-dependent routes near ${name} are seeing rising costs.`,
    severity: 'medium',
  },
  demand_spike_safe_zone: {
    title: 'Demand Spike in Safe Zone',
    messageFn: (name) => `Rapidly rising demand detected at ${name} — profit opportunity.`,
    severity: 'low',
  },
  policy_restriction_escalation: {
    title: 'Policy Restriction Escalation',
    messageFn: (name) => `Cross-border capacity near ${name} reduced by policy changes.`,
    severity: 'medium',
  },
  node_stressed: {
    title: 'Node Under Stress',
    messageFn: (name) => `${name} is experiencing elevated risk and supply pressure.`,
    severity: 'low',
  },
  cascade_spreading: {
    title: 'Crisis Cascade Spreading',
    messageFn: (name) => `Disruption is cascading outward from ${name} region.`,
    severity: 'medium',
  },
};
