# CrisisAlpha — Full System Architecture

**Version:** 2.0 — Global Intelligence Engine  
**Team:** Arcane Logic  
**Last Updated:** April 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Core Architectural Principles](#2-core-architectural-principles)
3. [Technology Stack](#3-technology-stack)
4. [High-Level System Diagram](#4-high-level-system-diagram)
5. [The World Knowledge Graph](#5-the-world-knowledge-graph)
6. [Live Data Ingestion Pipeline](#6-live-data-ingestion-pipeline)
7. [User Context Model — Attachment Points](#7-user-context-model--attachment-points)
8. [Event Sourcing — The Ledger of Reality](#8-event-sourcing--the-ledger-of-reality)
9. [The What-If Simulation Engine](#9-the-what-if-simulation-engine)
10. [The Shadow Graph — Overlay Architecture](#10-the-shadow-graph--overlay-architecture)
11. [The Causality Filter — Three-Tier Filtering Engine](#11-the-causality-filter--three-tier-filtering-engine)
12. [AI Inference Layer](#12-ai-inference-layer)
13. [Propagation Engine](#13-propagation-engine)
14. [Backend Service Architecture](#14-backend-service-architecture)
15. [Frontend Architecture](#15-frontend-architecture)
16. [API Design](#16-api-design)
17. [Data Flow — End-to-End Pipelines](#17-data-flow--end-to-end-pipelines)
18. [Deployment Architecture](#18-deployment-architecture)
19. [Project Structure](#19-project-structure)
20. [Implementation Phases](#20-implementation-phases)

---

## 1. System Overview

CrisisAlpha is a **Global Intelligence Simulation Engine** that models how real-world events — geopolitical conflicts, natural disasters, policy changes, weather disruptions, and economic shifts — propagate across global trade networks and impact businesses.

The platform operates through **three interconnected pillars**, each building on the last to deliver a complete crisis intelligence experience:

---

### Pillar 1 — Real-Time Event Simulation (Live World Map)

The foundation of CrisisAlpha is a **living, breathing model of the real world** — a macro-level knowledge graph of ~1000–2000 nodes representing trade hubs, chokepoints, countries, and industries, rendered on an interactive map.

**What it does:**
- Maintains a **living knowledge graph** of the world's trade routes, political relationships, geography, and economic dependencies
- Ingests **real-time data feeds** (news, weather, disasters, shipping, politics) and reflects them on the map in near real-time
- Overlays the **user's business context** (Attachment Points — where they source, manufacture, ship, and sell) onto the world model, so every event is viewed through the lens of *their* supply chain
- Displays **live risk propagation** — when an earthquake hits a port or a conflict erupts near a chokepoint, the disruption ripples visually across connected trade routes on the map

**Key experience:** The user opens the map and sees the world *as it is right now* — color-coded nodes showing real-time risk levels, animated edges showing trade flow health, and an event feed streaming global incidents. Their own supply chain nodes are highlighted, giving them instant situational awareness of how the real world is affecting their business *today*.

---

### Pillar 2 — The "What-If" Simulation Engine

On top of the live world model, users can inject **hypothetical events** to explore how potential crises would cascade across the global trade network.

**What it does:**
- Allows users to trigger **"What-If" scenarios** (e.g., "What if war breaks out in the South China Sea?", "What if the Suez Canal is blocked for 30 days?", "What if the US imposes 50% tariffs on China?")
- Forks the live world state into a **Simulation Branch** using Event Sourcing — the simulation starts from reality and diverges based on the hypothesis
- Runs a **tick-based Propagation Engine** that computes how disruption cascades across the graph over simulated time (hours/days)
- Uses a **Causality Filter** to intelligently reconcile real-world events that arrive *during* the simulation — passing compatible events, blocking contradictory ones, and modifying ambiguous ones
- Enables **user decisions** mid-simulation — the user can apply recommended mitigation actions (reroute shipments, activate backup suppliers) and see the graph recompute in response

**Key experience:** The user asks "What if?" — the system forks reality, injects the crisis, and runs time forward. They watch disruption spread across the map tick by tick, see which of their supply chain nodes turn red, and make strategic decisions to mitigate impact. The simulation plays out like a controlled experiment on the real world.

---

### Pillar 3 — The Predictive Impact Model

The final pillar translates macro-level graph disruption into **micro-level, personalized business impact forecasts** for the user's specific supply chain.

**What it does:**
- Given a real or simulated event, the **AI Inference Layer** predicts how the user's supply chain will be affected over **X number of days** — not just *that* they'll be impacted, but *how much*, *when*, and *what changes*
- Generates **time-series impact projections**: "Your PCB supply from Shenzhen will face 14-day delays starting Day 3. Buffer stock runs out by Day 17. Cost increase of ~$2.3M over 30 days."
- Forecasts **cascading secondary effects**: price surges on alternative routes, competitor disruption creating market opportunities, inventory depletion timelines, contract risk windows
- Provides **actionable recommendations** tied to predicted outcomes: "Activate Vietnam backup supplier now to reduce projected loss from $2.3M to $800K"
- Computes an **overall Impact Score** with breakdowns by attachment point, timeline, and financial exposure (for Tier 3 enterprise users)

**Key experience:** The user doesn't just see *that* the Suez Canal is blocked — they see that in 7 days their Rotterdam warehouse runs dry, in 14 days their EU customers face stockouts, and in 21 days they lose $1.8M in contracts. They also see that if they reroute via the Cape now, the loss drops to $400K. The system turns macro disruptions into a personal, time-projected business impact forecast.

---

### How the Three Pillars Work Together

```
PILLAR 1: REAL-TIME WORLD                    PILLAR 2: WHAT-IF ENGINE                   PILLAR 3: PREDICTION MODEL
──────────────────────────                   ────────────────────────                    ──────────────────────────

┌──────────────────────┐                     ┌──────────────────────┐                    ┌──────────────────────────┐
│  Live Knowledge      │  "What if this      │  Fork live state     │  For each tick,     │  AI Inference Layer      │
│  Graph + Real-Time   │──escalates?"──────▶ │  Inject hypothesis   │──compute impact───▶ │                          │
│  Data Feeds          │                     │  Run Propagation     │                    │  Macro disruption data   │
│                      │                     │  Apply Causality     │                    │  + User attachments      │
│  User sees the       │                     │  Filter live events  │                    │  + Industry context      │
│  world as-is with    │                     │                      │                    │  = Personalized forecast: │
│  their supply chain  │                     │  User sees the       │                    │                          │
│  overlaid            │                     │  hypothetical world  │                    │  "In X days, your supply │
│                      │                     │  evolve tick-by-tick │                    │   chain will see..."     │
└──────────────────────┘                     └──────────────────────┘                    └──────────────────────────┘
        ▲                                            │                                            │
        │                                            │ User makes decisions                       │
        │                                            ▼                                            ▼
        │                                    ┌──────────────────────┐                    ┌──────────────────────────┐
        │                                    │  Decision mutates    │                    │  Recommendations:        │
        │                                    │  the simulation      │◀───────────────────│  "Do X now to reduce     │
        └────────real events keep flowing────│  graph, system       │                    │   loss from $2.3M to     │
                                             │  recomputes          │                    │   $800K over 30 days"    │
                                             └──────────────────────┘                    └──────────────────────────┘
```

### Core Experience Flow

```
User defines their business context (Attachment Points)
    → PILLAR 1: Live world map shows real-time events affecting their supply chain
        → User triggers a "What-If" scenario on the live world map
            → PILLAR 2: System forks Base Reality into a Simulation Branch
                → Propagation Engine computes cascading disruption tick by tick
                    → PILLAR 3: AI Inference Layer predicts personalized impact over X days
                        → "In 7 days, your warehouse buffer depletes. In 14 days, stockouts begin."
                            → Live events continue flowing in, filtered by Causality Engine
                                → User makes strategic decisions, system recomputes projected outcomes
                                    → Final impact score, timeline projections, and recommendations delivered
```

---

## 2. Core Architectural Principles

### 2.1 Event Sourcing Over State Mutation

The system does **not** store "current state" as a mutable snapshot. It stores the **ordered sequence of events** that produced the current state. This enables:

- Forking reality at any point in time for simulations
- Full audit trails and temporal queries
- Deterministic replay of any scenario

### 2.2 Overlay Architecture Over Duplication

Simulations do **not** clone the entire world database. They store only their **deltas** (differences from Base Reality) as lightweight overlays. This enables thousands of concurrent simulations without multiplying storage costs.

### 2.3 Tiered Intelligence

Not every decision requires an expensive AI call. The system uses a **funnel architecture** — cheap math first, embeddings second, LLM reasoning only for the ambiguous 1%.

### 2.4 Macro Graph + Micro Inference

The knowledge base operates at **macro hub level** (~1000–2000 global nodes). Users attach their business at specific points, and an **AI layer bridges** the gap to generate micro-level business impact.

---

## 3. Technology Stack

### 3.1 Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 16 (App Router) | SSR, routing, React 19 |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS 4 | Rapid UI development |
| Map Engine | MapLibre GL JS | Interactive trade network visualization |
| State | Zustand | Lightweight reactive state management |
| Animations | Framer Motion | UI transitions, event feed animations |
| Charts | Recharts | Metrics dashboards, score visualizations |
| Real-time | Socket.IO Client | Live simulation tick streaming |

### 3.2 Backend — Core API
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js | Event-driven, real-time capable |
| Language | TypeScript | End-to-end type safety with frontend |
| HTTP Framework | Express | REST API endpoints |
| Real-time | Socket.IO | WebSocket streaming for simulation ticks |
| Validation | Zod | Request/response schema validation |
| Task Queue | BullMQ + Redis | Background job processing for data ingestion |

### 3.3 Data Layer
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Knowledge Graph DB | Neo4j | Stores world graph — nodes, edges, political relations |
| Event Store | PostgreSQL (with TimescaleDB) | Append-only event log for Event Sourcing |
| User Data | PostgreSQL | User profiles, attachment points, saved simulations |
| Vector Store | Pinecone or Milvus | Semantic search for Causality Filter Tier 2 |
| Cache | Redis | Session state, hot graph data, simulation overlays |
| Static Seed Data | GeoJSON + JSON | Initial world graph bootstrap data |

### 3.4 AI / ML Layer
| Component | Technology | Purpose |
|-----------|-----------|---------|
| LLM (Reasoning) | Gemini / Claude / GPT-4 | Causality Filter Tier 3, impact narrative generation |
| Embeddings | text-embedding-3-small or Gemini Embeddings | Vector representations for semantic similarity |
| News NLP | GDELT API + custom pipelines | Real-time geopolitical event extraction |

### 3.5 Data Ingestion
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Stream Processing | Apache Kafka or Redis Streams | High-throughput event ingestion pipeline |
| Scheduler | Node-cron or BullMQ repeatable jobs | Periodic API polling (weather, shipping, etc.) |

---

## 4. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LIVE DATA FEEDS                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ GDELT    │ │ Weather  │ │ Disaster │ │ Shipping │ │ Policy   │     │
│  │ (News/   │ │ (NOAA/   │ │ (GDACS)  │ │ (AIS/    │ │ (Custom  │     │
│  │ Politics)│ │ OpenWx)  │ │          │ │ Spire)   │ │ Feeds)   │     │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │
│       └─────────────┴─────────────┴────────────┴────────────┘           │
│                                   │                                     │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │   EVENT INGESTION PIPELINE    │
                    │   (Kafka / Redis Streams)     │
                    │                               │
                    │   Normalize → Classify →      │
                    │   Geo-tag → Store as Event    │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │       EVENT STORE             │
                    │   (PostgreSQL + TimescaleDB)  │
                    │   Append-only event ledger    │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────┐  ┌────────────────────┐  ┌────────────────────────┐
│   BASE REALITY    │  │  CAUSALITY FILTER  │  │   USER CONTEXT DB      │
│   GRAPH (Neo4j)   │  │                    │  │   (PostgreSQL)         │
│                   │  │  Tier1: Graph Hops │  │                        │
│  ~1000-2000 nodes │  │  Tier2: Vectors    │  │  Attachment Points     │
│  Trade routes     │  │  Tier3: LLM Judge  │  │  Dependency Strengths  │
│  Political rels   │  │                    │  │  Business Profiles     │
│  Geography        │  │  Output:           │  │  Industry Context      │
│  Industry data    │  │  PASS/MODIFY/BLOCK │  │                        │
└────────┬──────────┘  └─────────┬──────────┘  └───────────┬────────────┘
         │                       │                         │
         │              ┌────────▼──────────┐              │
         │              │  SIMULATION       │              │
         │              │  OVERLAY GRAPHS   │              │
         │              │  (Redis + Memory) │              │
         │              │                   │              │
         │              │  Shadow deltas    │              │
         │              │  per simulation   │              │
         │              └────────┬──────────┘              │
         │                       │                         │
         └───────────┬───────────┘─────────────────────────┘
                     ▼
         ┌───────────────────────┐
         │   SIMULATION ENGINE  │
         │                      │
         │  Propagation Engine  │
         │  Event Engine        │
         │  Recommendation Eng. │
         │  Scoring Engine      │
         └───────────┬──────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  AI INFERENCE LAYER  │
         │  (LLM)               │
         │                      │
         │  Macro disruption    │
         │  + User attachments  │
         │  = Micro impact      │
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────┐
         │   FRONTEND UI       │
         │   Next.js + MapLibre│
         │                     │
         │  Map │ Controls     │
         │  Events │ Decisions │
         │  Impact │ Score     │
         └─────────────────────┘
```

---

## 5. The World Knowledge Graph

### 5.1 Overview

The Knowledge Graph is the persistent, living model of the real world. Stored in **Neo4j**, it represents global trade infrastructure, political relationships, geographic data, and economic dependencies as a graph of interconnected entities.

### 5.2 Node Types

| Node Label | Description | Count (approx) | Example |
|------------|-------------|-----------------|---------|
| `Country` | Sovereign nation | ~195 | India, USA, China |
| `TradeHub` | Major port, airport, or logistics center | ~500–800 | Port of Shanghai, Rotterdam, Dubai |
| `Chokepoint` | Strategic geographic bottleneck | ~15–20 | Suez Canal, Strait of Malacca, Panama Canal |
| `Region` | Geographic/economic zone | ~30–50 | South China Sea, Persian Gulf, EU Zone |
| `Industry` | Global industry sector | ~10–15 | Semiconductors, Energy, Pharma, Agriculture |
| `WeatherZone` | Climate/disaster risk zone | ~50–100 | Pacific Typhoon Belt, Tornado Alley |

### 5.3 Relationship Types

| Relationship | From → To | Properties | Example |
|------------|-----------|------------|---------|
| `TRADES_WITH` | Country → Country | volume, goods[], tariff_rate | India –TRADES_WITH→ USA |
| `CONNECTED_BY` | TradeHub → TradeHub | transport_type, capacity, cost, transit_days, fuel_sensitivity | Shanghai –CONNECTED_BY→ Rotterdam |
| `PASSES_THROUGH` | TradeHub → Chokepoint | dependency_level | Shanghai –PASSES_THROUGH→ Malacca |
| `LOCATED_IN` | TradeHub → Country | — | Port of LA –LOCATED_IN→ USA |
| `ALLIED_WITH` | Country → Country | strength (0-1), type | USA –ALLIED_WITH→ Japan |
| `SANCTIONS_AGAINST` | Country → Country | goods_affected[], severity | USA –SANCTIONS_AGAINST→ Iran |
| `PRODUCES` | Country → Industry | share_pct, capacity | Taiwan –PRODUCES→ Semiconductors (share: 0.60) |
| `DEPENDS_ON` | Industry → Industry | criticality | Electronics –DEPENDS_ON→ Semiconductors |
| `IN_WEATHER_ZONE` | TradeHub → WeatherZone | — | Tokyo –IN_WEATHER_ZONE→ Pacific Typhoon Belt |

### 5.4 Node Properties — TradeHub (Primary Simulation Node)

```typescript
interface TradeHubNode {
  id: string;                          // "hub_shanghai"
  name: string;                        // "Port of Shanghai"
  type: 'port' | 'airport' | 'hub' | 'factory_zone';
  lat: number;
  lng: number;
  country_id: string;                  // FK to Country node
  region_id: string;                   // FK to Region node

  // Economic properties
  annual_throughput: number;           // TEU or tons
  industry_weights: Record<string, number>;  // { semiconductors: 0.3, consumer_goods: 0.5 }
  gdp_contribution: number;           // relative economic importance

  // Resilience properties
  infrastructure_quality: number;     // 0-1
  alternative_routes: number;         // count of backup paths
  inventory_buffer_days: number;      // avg days of buffer stock
  resilience_score: number;           // computed: 0-1

  // Dynamic state (updated by events)
  current_risk_score: number;         // 0-1, updated by propagation
  current_status: 'operational' | 'stressed' | 'disrupted' | 'shutdown';
  active_disruptions: string[];       // IDs of active events affecting this node
}
```

### 5.5 Edge Properties — Trade Route

```typescript
interface TradeRouteEdge {
  id: string;
  source_hub_id: string;
  target_hub_id: string;
  transport_type: 'sea' | 'road' | 'rail' | 'air' | 'pipeline';

  // Capacity & cost
  capacity: number;                   // units/day
  base_cost_per_unit: number;
  base_transit_days: number;

  // Sensitivity factors (0-1)
  fuel_sensitivity: number;           // how much fuel costs affect this route
  policy_sensitivity: number;         // how much border policy affects capacity
  weather_sensitivity: number;        // exposure to weather disruption
  geopolitical_sensitivity: number;   // exposure to conflict/sanctions

  // Propagation
  risk_transmission_weight: number;   // how strongly risk spreads along this edge

  // Dynamic state
  current_risk_score: number;
  current_status: 'operational' | 'stressed' | 'disrupted' | 'broken';
  current_capacity_pct: number;       // remaining capacity as % of base
}
```

### 5.6 Political Relationship Properties

```typescript
interface PoliticalRelation {
  country_a: string;
  country_b: string;
  relation_type: 'ally' | 'neutral' | 'rival' | 'hostile' | 'sanctioned';
  diplomatic_score: number;           // -1 (hostile) to +1 (strong ally)
  trade_agreement: string | null;     // "RCEP", "EU Single Market", etc.
  active_sanctions: boolean;
  sanction_details?: {
    goods_affected: string[];
    severity: 'partial' | 'full';
    since: string;                    // ISO date
  };
}
```

---

## 6. Live Data Ingestion Pipeline

### 6.1 Overview

The ingestion pipeline continuously feeds real-world events into the system. It is the mechanism that keeps the Knowledge Graph alive and current.

### 6.2 Data Sources

| Source | Data Type | API / Method | Poll Frequency |
|--------|-----------|-------------|----------------|
| **GDELT Project** | Global political events, conflicts, protests, policy changes | REST API (GDELT 2.0) | Every 15 minutes |
| **NOAA / OpenWeatherMap** | Weather forecasts, severe weather alerts | REST API | Every 30 minutes |
| **GDACS** | Natural disasters: earthquakes, floods, cyclones | RSS/XML Feed | Every 15 minutes |
| **MarineTraffic / Spire** | Ship positions, port congestion, shipping delays | AIS API | Every 1 hour |
| **ReliefWeb / OCHA** | Humanitarian crises, conflict zones | REST API | Every 1 hour |
| **WTO / World Bank** | Trade policy changes, tariff updates | REST API + scraping | Daily |
| **Custom News NLP** | Breaking news classification from Reuters/AP | RSS + LLM classification | Every 5 minutes |

### 6.3 Ingestion Pipeline Architecture

```
┌──────────────┐
│  Data Source  │ ── poll/webhook ──▶ ┌──────────────────────┐
│  APIs         │                     │  Ingestion Workers   │
└──────────────┘                     │  (BullMQ Jobs)       │
                                     │                      │
                                     │  1. Fetch raw data   │
                                     │  2. Normalize schema │
                                     │  3. Geo-tag (lat/lng)│
                                     │  4. Classify type    │
                                     │  5. Assign severity  │
                                     └──────────┬───────────┘
                                                │
                                     ┌──────────▼───────────┐
                                     │   Event Bus          │
                                     │   (Kafka / Redis     │
                                     │    Streams)          │
                                     └──────────┬───────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                    ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
                    │ Event Store │   │ Base Reality │   │ Causality Filter│
                    │ (Postgres)  │   │ Graph Update │   │ (for active     │
                    │ Append log  │   │ (Neo4j)      │   │  simulations)   │
                    └─────────────┘   └─────────────┘   └─────────────────┘
```

### 6.4 Normalized Event Schema

Every ingested event, regardless of source, is normalized into this schema before entering the system:

```typescript
interface WorldEvent {
  id: string;                         // UUID
  timestamp: string;                  // ISO-8601
  source: string;                     // "gdelt" | "noaa" | "gdacs" | "custom"

  // Classification
  category: 'political' | 'economic' | 'weather' | 'disaster'
           | 'conflict' | 'policy' | 'trade' | 'infrastructure';
  subcategory: string;                // "tariff_change", "earthquake", "port_strike"
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Geographic binding
  affected_countries: string[];       // ["CN", "TW"]
  affected_hub_ids: string[];         // ["hub_shanghai", "hub_kaohsiung"]
  affected_region_ids: string[];      // ["region_south_china_sea"]
  coordinates?: { lat: number; lng: number };

  // Content
  title: string;                      // "China imposes export controls on rare earth minerals"
  summary: string;                    // 2-3 sentence summary
  raw_source_url?: string;

  // Graph impact (pre-computed or LLM-derived)
  graph_mutations: GraphMutation[];   // specific changes to apply to the graph

  // Embedding (for Causality Filter Tier 2)
  embedding_vector?: number[];        // 1536-dim vector
}

interface GraphMutation {
  target_type: 'node' | 'edge' | 'relationship';
  target_id: string;
  mutation_type: 'update_property' | 'create' | 'delete';
  property: string;                   // "current_risk_score", "capacity", etc.
  operation: 'set' | 'increment' | 'multiply';
  value: number | string;
  duration_hours?: number;            // how long this mutation lasts (null = permanent)
}
```

---

## 7. User Context Model — Attachment Points

### 7.1 The Macro-to-Micro Bridge

The Knowledge Graph operates at macro level (~1000 nodes). Users need micro-level impact analysis for their specific business. The system bridges this gap through **Attachment Points** — lightweight declarations of where a user's business touches the global macro graph.

### 7.2 User Profile Schema

```typescript
interface UserProfile {
  id: string;
  company_name: string;
  industry: string;                   // primary industry sector
  headquarters_country: string;

  // Tier 1: Auto-generated from industry
  // Tier 2: User-customized
  // Tier 3: Deep profile with financials
  profile_tier: 1 | 2 | 3;

  attachment_points: AttachmentPoint[];
  saved_simulations: string[];        // simulation IDs
}

interface AttachmentPoint {
  id: string;
  hub_id: string;                     // FK to TradeHub node in Knowledge Graph
  relationship: 'source' | 'manufacture' | 'ship_through' | 'warehouse' | 'sell_to';
  goods_category: string;             // "semiconductors", "raw_materials", etc.

  // Dependency assessment
  dependency_strength: 'critical' | 'high' | 'medium' | 'low';
  has_alternative: boolean;
  alternative_hub_id?: string;        // backup hub if this one fails
  switch_cost_days?: number;          // days to switch to alternative

  // Tier 3 only — financial exposure
  monthly_volume?: number;
  monthly_value_usd?: number;
  contract_lock_months?: number;      // months remaining on contracts
}
```

### 7.3 User Onboarding Tiers

| Tier | Effort | What user provides | What system gives back |
|------|--------|-------------------|----------------------|
| **Tier 1 — Quick Start** | 30 seconds | Industry + Region | Auto-generated attachment points from industry templates. Approximate impact analysis. |
| **Tier 2 — Custom** | 5 minutes | Manually adds/removes attachment points, sets dependency strength | Personalized disruption alerts, accurate rerouting recommendations |
| **Tier 3 — Enterprise** | 15 minutes | Uploads supplier CSV, declares financial exposure per route | Dollar-value impact estimates, contract risk analysis, insurance-grade reports |

### 7.4 Industry Templates (Tier 1 Auto-Generation)

```json
{
  "electronics": {
    "typical_sources": ["hub_taiwan_hsinchu", "hub_shenzhen", "hub_seoul"],
    "typical_routes": ["chokepoint_malacca", "chokepoint_suez"],
    "typical_markets": ["hub_los_angeles", "hub_rotterdam", "hub_tokyo"],
    "critical_dependencies": ["semiconductors", "rare_earth_minerals", "displays"]
  },
  "automotive": {
    "typical_sources": ["hub_wolfsburg", "hub_nagoya", "hub_detroit"],
    "typical_routes": ["chokepoint_suez", "chokepoint_panama"],
    "typical_markets": ["hub_shanghai", "hub_mumbai", "hub_sao_paulo"],
    "critical_dependencies": ["steel", "semiconductors", "lithium"]
  }
}
```

---

## 8. Event Sourcing — The Ledger of Reality

### 8.1 Core Concept

The system does **not** store a mutable "current state of the world." Instead, it stores an **append-only log of every event** that has ever affected the world state. The current state is a **derived view** — the sum of all events replayed in order.

### 8.2 Why Event Sourcing

| Traditional State Store | Event Sourcing |
|------------------------|----------------|
| Stores: "Taiwan export capacity = 72%" | Stores: "Factory built (+10%) → Tariff imposed (-5%) → Earthquake (-23%)" |
| Cannot fork reality | Can fork at any timestamp |
| Cannot ask "what was the state 3 days ago?" | Full temporal queries |
| Simulations require full database copy | Simulations inherit history, store only deltas |

### 8.3 Event Store Schema (PostgreSQL + TimescaleDB)

```sql
CREATE TABLE world_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          TEXT NOT NULL,         -- 'gdelt', 'noaa', 'user_simulation'
  category        TEXT NOT NULL,
  subcategory     TEXT,
  severity        TEXT NOT NULL,
  title           TEXT NOT NULL,
  summary         TEXT,
  affected_hubs   TEXT[],               -- array of hub IDs
  affected_countries TEXT[],
  graph_mutations JSONB NOT NULL,       -- array of GraphMutation objects
  embedding       VECTOR(1536),         -- pgvector for semantic search
  branch_id       TEXT DEFAULT 'base',  -- 'base' for reality, simulation ID for branches
  is_synthetic    BOOLEAN DEFAULT FALSE -- true for user-injected What-If events

  -- TimescaleDB hypertable for time-series performance
);

SELECT create_hypertable('world_events', 'timestamp');

-- Index for fast branch queries
CREATE INDEX idx_events_branch ON world_events (branch_id, timestamp);
```

### 8.4 State Reconstruction

```
Current State of Base Reality = Replay all events WHERE branch_id = 'base' in order

Current State of Simulation X = Replay all events WHERE branch_id = 'base' AND timestamp < fork_time
                                + Replay all events WHERE branch_id = 'sim_X'
                                + Replay all PASSED events from Causality Filter after fork_time
```

---

## 9. The What-If Simulation Engine

### 9.1 The Divergence Problem

When a user creates a simulation (e.g., "What if war breaks out in the South China Sea?"), two conflicting needs emerge:

- If the simulation **ignores** real-world updates, it becomes stale
- If it **blindly accepts** every real event, those events may contradict the simulation premise

The solution: **Event Sourcing + Shadow Graph + Causality Filter** working together.

### 9.2 Simulation Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                    SIMULATION LIFECYCLE                          │
│                                                                  │
│  1. CREATE                                                       │
│     User defines: Hypothetical Event + Axioms (fixed premises)  │
│     System records: fork_timestamp = NOW()                       │
│     System creates: Simulation Branch in Event Store             │
│     System creates: Empty Shadow Graph Overlay in Redis          │
│                                                                  │
│  2. INITIALIZE                                                   │
│     System injects the synthetic event into the branch           │
│     Propagation Engine computes initial impact on Shadow Graph   │
│     First tick snapshot streams to frontend                      │
│                                                                  │
│  3. RUNNING (continuous)                                         │
│     Real events arrive → Causality Filter evaluates each one    │
│     Passed/Modified events update the Shadow Graph               │
│     Propagation Engine runs per tick                             │
│     User decisions mutate the Shadow Graph                       │
│     AI Inference generates personalized impact reports           │
│                                                                  │
│  4. COMPLETE                                                     │
│     Simulation duration ends or user stops                       │
│     Final score computed                                         │
│     Shadow Graph archived or discarded                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.3 Simulation Config Schema

```typescript
interface SimulationConfig {
  id: string;                         // UUID
  user_id: string;
  created_at: string;

  // The hypothetical event
  hypothesis: {
    title: string;                    // "War in South China Sea"
    description: string;              // detailed scenario description
    category: string;                 // "conflict"
    affected_hub_ids: string[];       // ground zero nodes
    affected_countries: string[];
    initial_mutations: GraphMutation[];  // what the hypothesis changes
  };

  // Axioms — the immutable rules of this simulation
  axioms: SimulationAxiom[];

  // Execution parameters
  duration_days: number;              // simulated days to run
  tick_interval_hours: number;        // simulated hours per tick
  fork_timestamp: string;             // point in time the simulation diverges from reality

  // State
  status: 'created' | 'running' | 'paused' | 'completed';
  current_tick: number;
}

interface SimulationAxiom {
  id: string;
  statement: string;                  // "US and China are in active military conflict"
  type: 'block_category' | 'block_relationship' | 'enforce_state' | 'custom';

  // For structured axioms (faster Tier 1/2 filtering):
  blocked_countries?: string[];       // peace treaties between these countries are blocked
  blocked_categories?: string[];      // e.g., block "trade_agreement" events between US-CN
  enforced_states?: {                 // states that must remain true
    target_id: string;
    property: string;
    value: any;
  }[];

  // For Tier 3 (LLM-evaluated):
  natural_language: string;           // "The US and China are at war. No peace treaties."
}
```

---

## 10. The Shadow Graph — Overlay Architecture

### 10.1 Core Concept

Instead of duplicating the entire Neo4j graph per simulation, each simulation stores only its **differences** from Base Reality.

### 10.2 How Reads Work

```
Query: "What is the risk score of Port of Shanghai in Simulation X?"

Step 1: Check Shadow Graph (Redis) for Simulation X overrides on hub_shanghai
Step 2: If override exists → return override value
Step 3: If no override → read from Base Reality Graph (Neo4j) → return base value
```

### 10.3 Shadow Graph Storage (Redis)

```
Key Pattern:  sim:{simulation_id}:node:{node_id}
Value:        JSON hash of overridden properties

Example:
  sim:abc123:node:hub_shanghai → {
    "current_risk_score": 0.92,
    "current_status": "shutdown",
    "current_capacity_pct": 0.05
  }

  sim:abc123:edge:route_shanghai_tokyo → {
    "current_risk_score": 0.85,
    "current_status": "disrupted",
    "current_capacity_pct": 0.20
  }

  sim:abc123:meta → {
    "fork_timestamp": "2026-04-03T00:00:00Z",
    "total_overridden_nodes": 47,
    "total_overridden_edges": 83
  }
```

### 10.4 Memory Efficiency

| Approach | Storage per simulation | 1000 simultaneous sims |
|----------|----------------------|----------------------|
| Full graph copy | ~500MB | ~500GB ❌ |
| Shadow overlay (avg 5% of nodes modified) | ~25MB | ~25GB ✅ |

---

## 11. The Causality Filter — Three-Tier Filtering Engine

### 11.1 Overview

The Causality Filter sits between the Live Data Feed and all active Simulation Branches. For every incoming real-world event, it determines whether that event should be **passed**, **blocked**, or **modified** for each active simulation.

### 11.2 The Three-Tier Funnel

```
        Incoming Real-World Event
                    │
                    ▼
    ┌───────────────────────────────┐
    │  TIER 1: TOPOLOGICAL FILTER  │   ~90% of events filtered here
    │  (Graph Hop Distance)        │   Cost: Near zero
    │                              │   Speed: < 1ms
    │  IF event nodes > N hops     │
    │  from simulation nodes       │
    │  THEN → auto PASS            │
    └───────────────┬──────────────┘
                    │ (10% remain)
                    ▼
    ┌───────────────────────────────┐
    │  TIER 2: SEMANTIC FILTER     │   ~9% of events filtered here
    │  (Vector Embedding Cosine)   │   Cost: Low
    │                              │   Speed: < 10ms
    │  Compare event embedding to  │
    │  simulation axiom embeddings │
    │  IF cosine_sim < threshold   │
    │  THEN → auto PASS            │
    └───────────────┬──────────────┘
                    │ (1% remain)
                    ▼
    ┌───────────────────────────────┐
    │  TIER 3: AGENTIC REASONING   │   ~1% of events reach here
    │  (LLM Judge)                 │   Cost: Highest
    │                              │   Speed: 1-3 seconds
    │  Structured prompt:          │
    │  - Simulation axioms         │
    │  - Incoming event            │
    │  - Output: PASS/MODIFY/BLOCK │
    └───────────────┬──────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │ Apply to Shadow │
         │ Graph Overlay   │
         └─────────────────┘
```

### 11.3 Tier 1 — Topological Relevance (Graph Hops)

```typescript
function tier1Filter(event: WorldEvent, simulation: SimulationConfig): 'pass' | 'escalate' {
  const simNodeIds = new Set([
    ...simulation.hypothesis.affected_hub_ids,
    ...simulation.axioms.flatMap(a => a.blocked_countries || [])
  ]);

  const MAX_HOPS = 3; // configurable

  for (const eventNodeId of event.affected_hub_ids) {
    const distance = graphService.shortestHopDistance(eventNodeId, simNodeIds);
    if (distance <= MAX_HOPS) {
      return 'escalate'; // close enough — send to Tier 2
    }
  }

  return 'pass'; // too far away — let it through unchanged
}
```

### 11.4 Tier 2 — Semantic Relevance (Vector Similarity)

```typescript
async function tier2Filter(event: WorldEvent, simulation: SimulationConfig): Promise<'pass' | 'escalate'> {
  const eventVector = event.embedding_vector
    || await embeddingService.embed(event.title + ' ' + event.summary);

  const axiomVectors = await Promise.all(
    simulation.axioms.map(a => embeddingService.embed(a.natural_language))
  );

  const SIMILARITY_THRESHOLD = 0.75;

  for (const axiomVec of axiomVectors) {
    const similarity = cosineSimilarity(eventVector, axiomVec);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return 'escalate'; // semantically related — send to Tier 3
    }
  }

  return 'pass'; // topically unrelated — let it through
}
```

### 11.5 Tier 3 — Agentic Reasoning (LLM Judge)

```typescript
async function tier3Filter(event: WorldEvent, simulation: SimulationConfig): Promise<CausalityDecision> {
  const prompt = `
You are a causality analysis engine for a geopolitical simulation.

SIMULATION AXIOMS (these are the immutable rules of this simulation):
${simulation.axioms.map(a => `- ${a.natural_language}`).join('\n')}

INCOMING REAL-WORLD EVENT:
Title: ${event.title}
Summary: ${event.summary}
Category: ${event.category}
Affected: ${event.affected_countries.join(', ')}

TASK: Does this event contradict any simulation axiom?
Respond with EXACTLY one of:
- PASS: Event is compatible. Apply it unchanged.
- BLOCK: Event directly contradicts an axiom. Discard it entirely.
- MODIFY: Event is real but its impact must be recalculated under the simulation's constraints.
  If MODIFY, explain what adjustment is needed.

Output format:
DECISION: [PASS|BLOCK|MODIFY]
REASON: [one sentence]
MODIFICATION: [if MODIFY, describe the adjustment]
`;

  const response = await llm.generate(prompt);
  return parseCausalityResponse(response);
}
```

---

## 12. AI Inference Layer

### 12.1 Purpose

The AI Inference Layer bridges the gap between **macro-level disruption data** (from the Knowledge Graph) and **micro-level business impact** (for the specific user). It generates personalized, actionable impact reports.

### 12.2 How It Works

```
Input to LLM:
┌────────────────────────────────────────────────────────┐
│  1. Current disruption state from Simulation Engine    │
│     - Which nodes are disrupted, risk levels           │
│     - Which routes are broken/degraded                 │
│     - Active events timeline                           │
│                                                        │
│  2. User's Attachment Points                           │
│     - Where they source, ship, sell                    │
│     - Dependency strengths and alternatives            │
│     - Financial exposure (if Tier 3)                   │
│                                                        │
│  3. Industry context                                   │
│     - Supply chain patterns for their industry         │
│     - Typical lead times, substitution difficulty      │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│  LLM Output: Personalized Impact Report               │
│                                                        │
│  "Based on the Suez Canal blockage in your             │
│   simulation:                                          │
│                                                        │
│   🔴 CRITICAL: Your Shenzhen PCB supply (dependency:   │
│      CRITICAL) ships through Malacca + Suez. Expected  │
│      delay: 14-18 days via Cape reroute.               │
│                                                        │
│   🟡 MODERATE: Rotterdam warehouse resupply delayed.   │
│      Current buffer: 12 days. Shortfall begins Day 26. │
│                                                        │
│   🟢 UNAFFECTED: LA distribution unaffected (Pacific   │
│      routes operational).                              │
│                                                        │
│   💰 OPPORTUNITY: Competitors using Suez are also      │
│      disrupted. You could gain 8-12% market share in   │
│      EU if you activate Vietnam backup supplier now.   │
│                                                        │
│   📊 Estimated financial impact: -$2.3M over 30 days   │
│      (mitigatable to -$800K with recommended actions)" │
└────────────────────────────────────────────────────────┘
```

---

## 13. Propagation Engine

### 13.1 Overview

The Propagation Engine runs during simulation ticks, spreading disruption across the graph using weighted formulas. It operates on the **merged view** (Base Graph + Shadow Overlay).

### 13.2 Tick Pipeline

At each simulation tick:

```
1. Apply any new events (from live feed, filtered by Causality Filter)
2. Apply user decisions (if any were submitted since last tick)
3. Compute node risk propagation
4. Compute edge risk from connected nodes
5. Update node/edge statuses based on thresholds
6. Run Event Engine — detect threshold crossings, generate alerts
7. Run Recommendation Engine — suggest actions
8. Update score metrics
9. Stream tick snapshot to frontend via WebSocket
10. Write updated state to Shadow Graph overlay
```

### 13.3 Node Risk Propagation Formula

```
newRisk(node) = clamp(0, 1,
    baseRisk(node)
  + localShock(node)                           // from direct events
  + α × Σ(neighborRisk × transmissionWeight)   // spread from neighbors
  - β × resilienceFactor(node)                 // resistance to spread
  + γ × industryExposure(node, simIndustry)    // industry-specific vulnerability
)

Where:
  α = 0.3  (spread strength, configurable)
  β = 0.1  (resilience dampening)
  γ = 0.15 (industry amplifier)
```

### 13.4 Edge Risk Formula

```
edgeRisk = clamp(0, 1,
    avg(sourceNodeRisk, targetNodeRisk)
  × (1 + fuelSensitivity × fuelShockFactor)
  × (1 + policySensitivity × policyShockFactor)
  × (1 + weatherSensitivity × weatherShockFactor)
  × riskTransmissionWeight
)
```

### 13.5 Status Thresholds

| Risk Score | Status | Visual Color | Meaning |
|-----------|--------|-------------|---------|
| 0.00 – 0.30 | `operational` | 🟢 Green | Normal operations |
| 0.30 – 0.60 | `stressed` | 🟡 Yellow | Elevated risk, delays possible |
| 0.60 – 0.80 | `disrupted` | 🟠 Orange | Significant disruption, partial failure |
| 0.80 – 1.00 | `shutdown` | 🔴 Red | Non-operational, complete failure |

---

## 14. Backend Service Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    EXPRESS API LAYER                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Scenario API │ │ User API     │ │ Data Ingestion   │  │
│  │ /api/sim/*   │ │ /api/user/*  │ │ API /api/feed/*  │  │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘  │
│         │                │                  │            │
│  ┌──────▼────────────────▼──────────────────▼─────────┐  │
│  │              SERVICE LAYER                         │  │
│  │                                                    │  │
│  │  simulationService    — orchestrate tick loop      │  │
│  │  graphService         — Neo4j queries, pathfinding │  │
│  │  propagationEngine    — risk math per tick         │  │
│  │  eventService         — threshold detection        │  │
│  │  recommendationSvc    — suggest actions            │  │
│  │  scoreService         — compute metrics            │  │
│  │  causalityFilter      — 3-tier event filtering     │  │
│  │  inferenceService     — LLM impact reports         │  │
│  │  ingestionService     — normalize external data    │  │
│  │  userContextService   — attachment point mgmt      │  │
│  │  shadowGraphService   — Redis overlay CRUD         │  │
│  │  embeddingService     — vector operations          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              REAL-TIME LAYER                       │  │
│  │  Socket.IO — tick streaming to frontend            │  │
│  │  BullMQ    — background ingestion jobs             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 15. Frontend Architecture

### 15.1 Core UI Areas

| Panel | Responsibility |
|-------|---------------|
| **Map View** (MapLibre) | Render world graph — nodes colored by risk, edges showing trade routes. Animate disruption spread. Click to trigger simulations. |
| **Control Panel** | Set up new simulations — pick hypothesis, set parameters, start/pause/reset. |
| **Event Feed** | Live chronological feed of simulation events and real-world filtered events. |
| **Decision Panel** | Show AI recommendations, let user apply decisions. |
| **Impact Dashboard** | Personalized impact report based on user's attachment points. |
| **Summary Bar** | Current tick/day, risk metrics, score, network health. |
| **Results Screen** | Post-simulation — final score, impact analysis, decisions review. |

### 15.2 State Management (Zustand Store)

```typescript
interface AppState {
  // User context
  user: UserProfile | null;
  attachmentPoints: AttachmentPoint[];

  // Base Reality (read from graph)  
  baseNodes: Map<string, TradeHubNode>;
  baseEdges: Map<string, TradeRouteEdge>;

  // Active Simulation
  simulation: SimulationConfig | null;
  simPhase: 'idle' | 'setup' | 'running' | 'paused' | 'completed';
  currentTick: number;

  // Simulation state (base + overlay merged on backend, streamed to frontend)
  simNodes: Array<{ id: string; riskScore: number; status: string }>;
  simEdges: Array<{ id: string; riskScore: number; status: string }>;

  // Events & recommendations
  events: SimulationEvent[];
  recommendations: Recommendation[];
  impactReport: string | null;       // AI-generated personalized report

  // Score
  score: ScoreSnapshot;
}
```

---

## 16. API Design

### 16.1 REST Endpoints

```
── User Context ──
POST   /api/user/profile              Create/update user profile
GET    /api/user/profile              Get user profile with attachment points
POST   /api/user/attachments          Add attachment point
DELETE /api/user/attachments/:id      Remove attachment point
GET    /api/user/industry-template/:industry   Get auto-generated template

── Simulation ──
POST   /api/sim/create                Create new What-If simulation
POST   /api/sim/:id/start             Start simulation tick loop
POST   /api/sim/:id/pause             Pause simulation
POST   /api/sim/:id/resume            Resume simulation
POST   /api/sim/:id/reset             Reset simulation to initial state
POST   /api/sim/:id/decision          Submit user decision
GET    /api/sim/:id/state             Get current simulation state
GET    /api/sim/:id/impact            Get AI-generated personalized impact report
GET    /api/sim/:id/summary           Get final results after completion

── World Graph (read-only for frontend) ──
GET    /api/graph/nodes               Get all trade hub nodes (base reality)
GET    /api/graph/edges               Get all trade route edges
GET    /api/graph/node/:id            Get single node details
GET    /api/graph/relations/:countryA/:countryB   Get political relation

── Data Feed (admin/internal) ──
GET    /api/feed/recent               Get recent real-world events
GET    /api/feed/status               Get ingestion pipeline health
```

### 16.2 WebSocket Events

```
── Server → Client ──
sim:tick            Tick update with full state snapshot
sim:event           New simulation event
sim:recommendation  New recommendation available
sim:impact          Updated AI impact report
sim:complete        Simulation finished, final results
reality:event       Real-world event that passed the Causality Filter
reality:update      Base Reality graph change notification

── Client → Server ──
sim:join            Join simulation room for live updates
sim:decision        Submit a user decision
```

---

## 17. Data Flow — End-to-End Pipelines

### 17.1 Pipeline A — Real-World Event Ingestion

```
External API → Ingestion Worker → Normalize → Geo-tag → Embed
    → Write to Event Store (branch='base')
    → Update Base Reality Graph (Neo4j)
    → For each active simulation:
        → Causality Filter (Tier 1 → 2 → 3)
            → PASS:   Apply to Shadow Graph unchanged
            → MODIFY: Apply adjusted mutation to Shadow Graph
            → BLOCK:  Discard for this simulation
    → Broadcast reality:event to connected frontend clients
```

### 17.2 Pipeline B — User Creates "What-If" Simulation

```
User defines hypothesis + axioms
    → Backend creates SimulationConfig
    → Event Store: write synthetic event (branch='sim_X', is_synthetic=true)
    → Shadow Graph: create overlay in Redis
    → Propagation Engine: compute initial impact on overlay
    → AI Inference: generate initial impact report for user's attachment points
    → Stream first tick to frontend
    → Start tick loop (Pipeline C)
```

### 17.3 Pipeline C — Simulation Tick Loop (Repeating)

```
Timer fires for next tick
    → Read merged state: Base Graph + Shadow Overlay
    → Propagation Engine: spread risk for this tick
    → Event Engine: detect threshold crossings
    → Recommendation Engine: compute suggestions
    → Score Engine: update metrics
    → Write updated nodes/edges to Shadow Graph (Redis)
    → AI Inference: regenerate impact report if significant changes
    → Stream tick payload via WebSocket (sim:tick)
    → Check if max ticks reached → emit sim:complete
```

### 17.4 Pipeline D — User Decision Application

```
User clicks "Apply Decision" on frontend
    → WebSocket: sim:decision { simulation_id, recommendation_id }
    → Backend validates decision
    → Shadow Graph: mutate affected nodes/edges
    → Re-run propagation for remaining ticks with new conditions
    → Score Engine: recalculate with decision impact
    → Stream updated state to frontend
```

---

## 18. Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│                   CLOUD PROVIDER                     │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Frontend   │  │  Backend API │  │  Workers    │  │
│  │  (Vercel)   │  │  (Railway /  │  │  (Railway / │  │
│  │  Next.js    │  │   Render)    │  │   Render)   │  │
│  │  CDN-edge   │  │  Express +   │  │  BullMQ     │  │
│  │             │  │  Socket.IO   │  │  ingestion  │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                │                 │         │
│         └────────────────┼─────────────────┘         │
│                          │                           │
│  ┌───────────────────────┼───────────────────────┐   │
│  │                DATA SERVICES                  │   │
│  │                                               │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │   │
│  │  │ Neo4j   │  │PostgreSQL│  │   Redis      │  │   │
│  │  │ Aura    │  │(Supabase │  │   (Upstash)  │  │   │
│  │  │         │  │ or Neon) │  │              │  │   │
│  │  │ Graph DB│  │ Events + │  │ Shadow Graph │  │   │
│  │  │         │  │ Users    │  │ Cache, Queue │  │   │
│  │  └─────────┘  └──────────┘  └─────────────┘  │   │
│  │                                               │   │
│  │  ┌───────────┐  ┌─────────────────────────┐   │   │
│  │  │ Pinecone  │  │ LLM API (Gemini/Claude) │   │   │
│  │  │ Vectors   │  │ Causality + Inference    │   │   │
│  │  └───────────┘  └─────────────────────────┘   │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 19. Project Structure

```
CrisisAlpha/
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                    # Main simulation page
│       │   ├── layout.tsx                  # Root layout
│       │   ├── onboarding/page.tsx         # User attachment point setup
│       │   └── results/page.tsx            # Post-simulation results
│       ├── components/
│       │   ├── map/
│       │   │   ├── WorldMap.tsx            # MapLibre world graph renderer
│       │   │   ├── MapLegend.tsx           # Risk color legend
│       │   │   └── NodeTooltip.tsx         # Hover details on nodes
│       │   ├── controls/
│       │   │   ├── SimulationSetup.tsx     # Hypothesis + axioms input
│       │   │   ├── ControlBar.tsx          # Start/pause/reset/speed
│       │   │   └── ParameterSliders.tsx    # Crisis intensity controls
│       │   ├── events/
│       │   │   ├── EventFeed.tsx           # Live event timeline
│       │   │   └── EventCard.tsx           # Individual event display
│       │   ├── decisions/
│       │   │   ├── DecisionPanel.tsx       # Recommendations + actions
│       │   │   └── ImpactReport.tsx        # AI-generated impact narrative
│       │   ├── summary/
│       │   │   ├── SummaryBar.tsx          # Live metrics strip
│       │   │   └── ResultsDashboard.tsx    # Final score + review
│       │   └── user/
│       │       ├── AttachmentSetup.tsx      # Attachment point editor
│       │       └── BusinessProfile.tsx     # Industry + profile config
│       ├── lib/
│       │   ├── api/client.ts               # REST API client
│       │   ├── socket/scenarioSocket.ts    # WebSocket client
│       │   └── map/colorScale.ts           # Risk → color mapping
│       ├── state/
│       │   └── scenarioStore.ts            # Zustand global state
│       └── types/
│           └── index.ts                    # Shared TypeScript types
│
├── backend/
│   └── src/
│       ├── server.ts                       # Express + Socket.IO entry
│       ├── routes/
│       │   ├── simulationRoutes.ts         # /api/sim/*
│       │   ├── userRoutes.ts               # /api/user/*
│       │   ├── graphRoutes.ts              # /api/graph/*
│       │   └── feedRoutes.ts               # /api/feed/*
│       ├── services/
│       │   ├── simulationService.ts        # Tick loop orchestrator
│       │   ├── graphService.ts             # Neo4j queries + pathfinding
│       │   ├── propagationEngine.ts        # Risk spread math
│       │   ├── eventService.ts             # Threshold event detection
│       │   ├── recommendationService.ts    # Action suggestions
│       │   ├── scoreService.ts             # Metrics computation
│       │   ├── causalityFilter.ts          # 3-tier event filtering
│       │   ├── shadowGraphService.ts       # Redis overlay CRUD
│       │   ├── inferenceService.ts         # LLM impact report generation
│       │   ├── ingestionService.ts         # External data normalization
│       │   ├── embeddingService.ts         # Vector embedding operations
│       │   └── userContextService.ts       # Attachment point management
│       ├── workers/
│       │   ├── gdeltWorker.ts              # GDELT polling + processing
│       │   ├── weatherWorker.ts            # Weather API polling
│       │   ├── disasterWorker.ts           # GDACS disaster feed
│       │   ├── shippingWorker.ts           # AIS/shipping data
│       │   └── newsWorker.ts               # Custom news NLP pipeline
│       ├── models/
│       │   ├── graph.ts                    # Node/Edge type definitions
│       │   ├── event.ts                    # WorldEvent schema
│       │   ├── simulation.ts               # SimulationConfig, Axiom types
│       │   ├── user.ts                     # UserProfile, AttachmentPoint
│       │   └── causality.ts                # CausalityDecision types
│       ├── db/
│       │   ├── neo4j.ts                    # Neo4j driver + connection
│       │   ├── postgres.ts                 # PostgreSQL connection pool
│       │   ├── redis.ts                    # Redis client
│       │   └── pinecone.ts                 # Vector DB client
│       ├── data/
│       │   ├── seed/
│       │   │   ├── trade_hubs.json         # ~1000 global trade hubs
│       │   │   ├── trade_routes.json       # ~3000 trade route edges
│       │   │   ├── countries.json          # 195 countries + metadata
│       │   │   ├── political_relations.json# bilateral relations
│       │   │   ├── chokepoints.json        # strategic bottlenecks
│       │   │   ├── industries.json         # industry definitions
│       │   │   └── industry_templates.json # Tier 1 auto-generation
│       │   └── seed.ts                     # Database seeder script
│       └── utils/
│           ├── pathfinding.ts              # Dijkstra / A* on graph
│           ├── cosine.ts                   # Vector similarity math
│           └── thresholds.ts               # Risk → status mapping
│
├── ARCHITECTURE.md                        # This document
├── README.md                              # Project overview
└── .gitignore
```

---

## 20. Implementation Phases

### Phase 1 — Static World Graph + Neo4j Migration
- Migrate from GeoJSON files to Neo4j
- Seed ~500 trade hubs, ~2000 routes, 195 countries, political relationships
- Build graph query service with pathfinding
- Frontend: render real world macro map

### Phase 2 — Event Sourcing + Shadow Graph
- Set up PostgreSQL Event Store with TimescaleDB
- Set up Redis for Shadow Graph overlays
- Implement simulation create/fork/start lifecycle
- Implement basic propagation engine on overlay architecture

### Phase 3 — Live Data Feeds (Weather + Disasters)
- Connect GDACS disaster feed + NOAA weather
- Build ingestion workers with BullMQ
- Normalize events into WorldEvent schema
- Auto-update Base Reality graph from live events

### Phase 4 — Causality Filter
- Implement Tier 1 (graph hop distance)
- Integrate vector embeddings (Pinecone) for Tier 2
- Integrate LLM for Tier 3 reasoning
- Wire filter into active simulation pipeline

### Phase 5 — User Context + AI Inference
- Build user profile + attachment point system
- Build industry templates for Tier 1 auto-generation
- Integrate LLM for personalized micro-impact reports
- Build Impact Dashboard UI component

### Phase 6 — Geopolitical Intelligence (GDELT + News)
- Connect GDELT real-time feed
- Build news NLP classification pipeline
- LLM agent to translate news → graph mutations
- Political relationship auto-updates

### Phase 7 — Polish + Scale
- Decision engine improvements
- Scoring refinements
- Performance optimization (Redis caching, query optimization)
- UI polish, animations, mobile responsiveness
- Load testing for concurrent simulations

---

*This document defines the complete architectural blueprint for CrisisAlpha v2. All implementation should reference this as the source of truth for system design decisions.*
