// ============================================================
// CrisisAlpha — Event Models (v2)
// WorldEvent schema, GraphMutation, and event templates
// ============================================================

// ── Core Event Types ────────────────────────────────────────

export type EventCategory =
  | 'political' | 'economic' | 'weather' | 'disaster'
  | 'conflict' | 'policy' | 'trade' | 'infrastructure';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface WorldEvent {
  id: string;
  timestamp: string;              // ISO-8601
  source: string;                 // "gdelt" | "noaa" | "gdacs" | "simulation" | "user"

  // Classification
  category: EventCategory;
  subcategory: string;            // "tariff_change", "earthquake", "port_strike"
  severity: EventSeverity;

  // Geographic binding
  affectedCountries: string[];
  affectedHubIds: string[];
  affectedChokepointIds: string[];
  affectedRegionIds: string[];
  coordinates?: { lat: number; lng: number };

  // Content
  title: string;
  summary: string;
  rawSourceUrl?: string;

  // Graph impact
  graphMutations: GraphMutation[];

  // Branch info
  branchId: string;               // 'base' for reality, simulation ID for branches
  isSynthetic: boolean;           // true for user-injected What-If events
}

export interface GraphMutation {
  targetType: 'node' | 'edge' | 'chokepoint' | 'relationship';
  targetId: string;
  mutationType: 'update_property' | 'create' | 'delete';
  property: string;               // "currentRiskScore", "capacity", etc.
  operation: 'set' | 'increment' | 'multiply';
  value: number | string;
  durationHours?: number;         // how long this mutation lasts (null = permanent)
}

// ── Simulation Event (emitted during tick processing) ───────

export interface SimulationEvent {
  id: string;
  tick: number;
  type: string;
  severity: EventSeverity;
  title: string;
  message: string;
  category?: EventCategory;
  relatedNodeIds?: string[];
  relatedEdgeIds?: string[];
  relatedChokepointIds?: string[];
  timestamp: string;
}

// ── Event Templates ─────────────────────────────────────────

export interface EventTemplate {
  title: string;
  messageFn: (name: string, context?: string) => string;
  severity: EventSeverity;
  category: EventCategory;
}

export const EVENT_TEMPLATES: Record<string, EventTemplate> = {
  // Infrastructure
  port_shutdown: {
    title: 'Port Shutdown Detected',
    messageFn: (name) => `Major disruption: ${name} port operations have ceased. All inbound/outbound cargo is halted.`,
    severity: 'critical',
    category: 'infrastructure',
  },
  hub_critical: {
    title: 'Hub Reached Critical Risk',
    messageFn: (name) => `Logistics hub at ${name} is at critical risk levels. Supply chain bottleneck forming.`,
    severity: 'critical',
    category: 'infrastructure',
  },
  route_broken: {
    title: 'Trade Route Collapsed',
    messageFn: (name) => `Transport route ${name} has become non-operational. Cargo rerouting required.`,
    severity: 'critical',
    category: 'infrastructure',
  },
  node_stressed: {
    title: 'Node Under Stress',
    messageFn: (name) => `${name} is experiencing elevated risk and supply pressure.`,
    severity: 'low',
    category: 'trade',
  },

  // Chokepoint events
  chokepoint_threatened: {
    title: 'Strategic Chokepoint Threatened',
    messageFn: (name) => `${name} is under threat. Routes passing through this chokepoint are at elevated risk.`,
    severity: 'high',
    category: 'conflict',
  },
  chokepoint_blocked: {
    title: 'Chokepoint Blocked',
    messageFn: (name) => `${name} is completely blocked. All dependent trade routes are severed.`,
    severity: 'critical',
    category: 'infrastructure',
  },

  // Political events
  sanctions_imposed: {
    title: 'New Sanctions Imposed',
    messageFn: (name, ctx) => `New sanctions imposed affecting ${name}. ${ctx || 'Trade capacity reduced.'}`,
    severity: 'high',
    category: 'policy',
  },
  diplomatic_escalation: {
    title: 'Diplomatic Tensions Escalating',
    messageFn: (name) => `Diplomatic relations deteriorating near ${name}. Trade restrictions likely.`,
    severity: 'medium',
    category: 'political',
  },
  policy_restriction_escalation: {
    title: 'Policy Restriction Escalation',
    messageFn: (name) => `Cross-border capacity near ${name} reduced by policy changes.`,
    severity: 'medium',
    category: 'policy',
  },

  // Economic events
  fuel_shortage_worsening: {
    title: 'Fuel Shortage Intensifying',
    messageFn: (name) => `Fuel-dependent routes near ${name} are seeing rising costs and delays.`,
    severity: 'medium',
    category: 'economic',
  },
  demand_spike_safe_zone: {
    title: 'Demand Spike in Safe Zone',
    messageFn: (name) => `Rapidly rising demand detected at ${name} — profit opportunity as disrupted competitors lose capacity.`,
    severity: 'low',
    category: 'trade',
  },
  price_surge: {
    title: 'Price Surge Detected',
    messageFn: (name) => `Commodity prices surging at ${name} due to supply constraints.`,
    severity: 'medium',
    category: 'economic',
  },

  // Cascade events
  cascade_spreading: {
    title: 'Crisis Cascade Spreading',
    messageFn: (name) => `Disruption is cascading outward from ${name} region. Multiple nodes affected.`,
    severity: 'high',
    category: 'infrastructure',
  },
  cascade_critical_mass: {
    title: 'Cascade Reached Critical Mass',
    messageFn: (name) => `Over 30% of the network is disrupted. Systemic failure risk increasing from ${name}.`,
    severity: 'critical',
    category: 'infrastructure',
  },

  // Weather/disaster
  severe_weather_warning: {
    title: 'Severe Weather Warning',
    messageFn: (name) => `Severe weather system approaching ${name}. Port/route operations may be impacted.`,
    severity: 'medium',
    category: 'weather',
  },
  natural_disaster: {
    title: 'Natural Disaster Reported',
    messageFn: (name) => `Natural disaster reported near ${name}. Infrastructure damage assessment underway.`,
    severity: 'high',
    category: 'disaster',
  },

  // Positive events
  route_restored: {
    title: 'Route Partially Restored',
    messageFn: (name) => `Trade route ${name} has been partially restored. Capacity recovering.`,
    severity: 'low',
    category: 'infrastructure',
  },
  supply_chain_adaptation: {
    title: 'Supply Chain Adapting',
    messageFn: (name) => `${name} region showing signs of supply chain adaptation. Alternative routes establishing.`,
    severity: 'low',
    category: 'trade',
  },
};

// ── Live Feed Event Templates (for ingestion simulation) ────

export const LIVE_EVENT_SCENARIOS: Array<{
  title: string;
  summary: string;
  category: EventCategory;
  subcategory: string;
  severity: EventSeverity;
  affectedHubIds: string[];
  affectedCountries: string[];
  affectedChokepointIds: string[];
  mutations: GraphMutation[];
}> = [
  {
    title: 'Port workers strike in Rotterdam',
    summary: 'Dock workers at the Port of Rotterdam begin a 48-hour strike over pay disputes, reducing port capacity by 60%.',
    category: 'infrastructure',
    subcategory: 'port_strike',
    severity: 'high',
    affectedHubIds: ['rotterdam'],
    affectedCountries: ['NL'],
    affectedChokepointIds: [],
    mutations: [{ targetType: 'node', targetId: 'rotterdam', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.3, durationHours: 48 }],
  },
  {
    title: 'Typhoon warning issued for East China Sea',
    summary: 'Typhoon category 3 approaching Shanghai/Busan corridor. Shipping advisories issued.',
    category: 'weather',
    subcategory: 'typhoon',
    severity: 'high',
    affectedHubIds: ['shanghai', 'busan'],
    affectedCountries: ['CN', 'KR'],
    affectedChokepointIds: ['taiwan_strait'],
    mutations: [
      { targetType: 'node', targetId: 'shanghai', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.25, durationHours: 72 },
      { targetType: 'node', targetId: 'busan', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.15, durationHours: 72 },
    ],
  },
  {
    title: 'Oil prices spike after OPEC cuts',
    summary: 'OPEC announces surprise production cut. Brent crude up 8%. Fuel-sensitive routes under pressure.',
    category: 'economic',
    subcategory: 'oil_price_spike',
    severity: 'medium',
    affectedHubIds: ['dubai', 'riyadh', 'jeddah'],
    affectedCountries: ['AE', 'SA'],
    affectedChokepointIds: ['strait_of_hormuz'],
    mutations: [{ targetType: 'chokepoint', targetId: 'strait_of_hormuz', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.1 }],
  },
  {
    title: 'Earthquake hits near Istanbul',
    summary: 'Magnitude 5.8 earthquake reported near Istanbul. Port inspections underway.',
    category: 'disaster',
    subcategory: 'earthquake',
    severity: 'high',
    affectedHubIds: ['istanbul'],
    affectedCountries: ['TR'],
    affectedChokepointIds: ['bosphorus'],
    mutations: [{ targetType: 'node', targetId: 'istanbul', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.35, durationHours: 120 }],
  },
  {
    title: 'US-China trade tensions escalate',
    summary: 'New tariffs announced on semiconductor exports. Supply chain disruption expected.',
    category: 'policy',
    subcategory: 'tariff_change',
    severity: 'high',
    affectedHubIds: ['shanghai', 'hongkong', 'shenzhen', 'losangeles'],
    affectedCountries: ['CN', 'US'],
    affectedChokepointIds: [],
    mutations: [
      { targetType: 'node', targetId: 'shanghai', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.15 },
      { targetType: 'node', targetId: 'hongkong', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.1 },
    ],
  },
  {
    title: 'Suez Canal traffic jam reported',
    summary: 'Heavy congestion at Suez Canal entrance. Average transit time up by 12 hours.',
    category: 'infrastructure',
    subcategory: 'congestion',
    severity: 'medium',
    affectedHubIds: ['suez'],
    affectedCountries: ['EG'],
    affectedChokepointIds: ['suez_canal'],
    mutations: [{ targetType: 'chokepoint', targetId: 'suez_canal', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.15, durationHours: 24 }],
  },
  {
    title: 'Monsoon flooding in Mumbai port area',
    summary: 'Heavy monsoon rains cause flooding in Mumbai port. Container handling reduced.',
    category: 'weather',
    subcategory: 'flooding',
    severity: 'medium',
    affectedHubIds: ['mumbai'],
    affectedCountries: ['IN'],
    affectedChokepointIds: [],
    mutations: [{ targetType: 'node', targetId: 'mumbai', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.2, durationHours: 48 }],
  },
  {
    title: 'Piracy incidents rise in Strait of Malacca',
    summary: 'Multiple piracy attempts reported in the Strait of Malacca. Shipping companies re-evaluating routes.',
    category: 'conflict',
    subcategory: 'piracy',
    severity: 'medium',
    affectedHubIds: ['singapore'],
    affectedCountries: ['SG', 'MY', 'ID'],
    affectedChokepointIds: ['strait_of_malacca'],
    mutations: [{ targetType: 'chokepoint', targetId: 'strait_of_malacca', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.15 }],
  },
  {
    title: 'German automotive production halted',
    summary: 'Major semiconductor shortage forces halt at German auto plants. Hamburg port sees 20% drop in outbound cargo.',
    category: 'trade',
    subcategory: 'supply_shortage',
    severity: 'high',
    affectedHubIds: ['hamburg', 'rotterdam'],
    affectedCountries: ['DE', 'NL'],
    affectedChokepointIds: [],
    mutations: [{ targetType: 'node', targetId: 'hamburg', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.2 }],
  },
  {
    title: 'Iran threatens Strait of Hormuz closure',
    summary: 'Iran issues warning about potential Strait of Hormuz closure in response to new sanctions.',
    category: 'conflict',
    subcategory: 'military_threat',
    severity: 'critical',
    affectedHubIds: ['dubai', 'tehran', 'riyadh'],
    affectedCountries: ['IR', 'AE', 'SA'],
    affectedChokepointIds: ['strait_of_hormuz'],
    mutations: [
      { targetType: 'chokepoint', targetId: 'strait_of_hormuz', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.4 },
      { targetType: 'node', targetId: 'dubai', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.25 },
    ],
  },
  {
    title: 'Panama Canal drought restrictions tighten',
    summary: 'Water levels at Gatun Lake drop to new lows. Daily transits reduced to 24 from normal 36.',
    category: 'weather',
    subcategory: 'drought',
    severity: 'high',
    affectedHubIds: ['panama_city'],
    affectedCountries: ['PA'],
    affectedChokepointIds: ['panama_canal'],
    mutations: [{ targetType: 'chokepoint', targetId: 'panama_canal', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.3, durationHours: 720 }],
  },
  {
    title: 'India-Pakistan border tensions rise',
    summary: 'Military buildup reported along India-Pakistan border. Karachi port operations continue but insurance premiums spike.',
    category: 'conflict',
    subcategory: 'military_buildup',
    severity: 'medium',
    affectedHubIds: ['karachi', 'mumbai'],
    affectedCountries: ['PK', 'IN'],
    affectedChokepointIds: [],
    mutations: [{ targetType: 'node', targetId: 'karachi', mutationType: 'update_property', property: 'currentRiskScore', operation: 'increment', value: 0.2 }],
  },
];
