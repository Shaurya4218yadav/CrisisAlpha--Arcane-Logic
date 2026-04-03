# CrisisAlpha — Architecture & Build Plan

## Overview

CrisisAlpha is an interactive crisis simulation engine inspired by **Plague Inc.**, focused on showing how geopolitical or supply-side shocks spread across logistics networks over time.

The product is not a real-world forecasting platform in v1. It is a **graph-based simulation system** with a strong visual interface, a time-step propagation engine, interactive user decisions, and clear business/risk outputs.

The core experience is:

- User selects a crisis origin on the map
- User picks an industry and adjusts crisis parameters
- Simulation runs across a logistics network over time
- Nodes and routes change state visually
- Live crisis events appear
- User takes mitigation or profit-seeking decisions
- System recomputes results and produces a final score

---

# 1. Goals of v1

## What v1 must do

- Show a world or regional map with connected logistics nodes and routes
- Allow user interaction through map clicks, selectors, and sliders
- Run a time-based crisis simulation
- Visually show cascading disruption spread
- Emit live event cards during the simulation
- Suggest actionable decisions
- Recompute outcomes after user actions
- Show final metrics such as failed routes, safe alternatives, profit zones, and score

## What v1 will not do

- No live external APIs
- No real GNN training
- No real-world forecasting claims
- No overcomplicated distributed backend
- No full global logistics accuracy

This matters because overengineering will kill the project.

---

# 2. Recommended Tech Stack

## Frontend

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **MapLibre GL JS** for map rendering and route/node styling
- **Zustand** for frontend state management
- **Framer Motion** for animations and event transitions
- **Recharts** or **visx** for side metrics and summary charts

### Why this frontend stack

Next.js + TypeScript is the cleanest choice for fast UI iteration, decent structure, and long-term maintainability.

Tailwind is the fastest way to build a polished control-heavy interface.

MapLibre is a better fit than basic map libraries because the product depends on fast updates of route colors, node states, overlays, and animated visual feedback.

## Backend

You proposed:

- **Node.js**
- **TypeScript**

That is acceptable.

For your team and speed, if you are already comfortable in Node/TypeScript, use:

- **Node.js + TypeScript**
- **Express** for HTTP APIs
- **ws** or **Socket.IO** for streaming simulation ticks to the frontend
- Optional: **Zod** for schema validation

### Honest recommendation

For simulation-heavy logic, Python is cleaner. But if your actual strength is Node/TS, then using Node/TS end-to-end is the smarter delivery decision.

Do not switch to a stack you barely know just because it sounds more “technical.” A completed strong Node/TS system is better than a half-built Python system.

## Data / Persistence

Start with:

- **Static JSON / GeoJSON files** for graph data, industry profiles, and crisis presets

Add **PostgreSQL** only if you need:

- user accounts
- saved scenarios
- leaderboard/history
- persistent simulation sessions
- analytics

### Recommendation

For v1:

- **Primary data source:** static JSON / GeoJSON
- **Database:** none initially
- **PostgreSQL:** only later if required

---

# 3. High-Level System Architecture

```text
+-----------------------------------------------------------+
|                       FRONTEND UI                         |
|  Next.js + TypeScript + Tailwind + MapLibre              |
|-----------------------------------------------------------|
|  Map View  | Control Panel | Event Feed | Decision Panel |
|            | Summary Bar   | Final Results Dashboard     |
+-----------------------------|-----------------------------+
                              |
                              | HTTP / WebSocket
                              v
+-----------------------------------------------------------+
|                     BACKEND API LAYER                     |
|              Node.js + TypeScript + Express               |
|-----------------------------------------------------------|
|   Scenario API   |   Session Manager   |   Tick Stream    |
+-----------------------------|-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                  SIMULATION CORE / ENGINE                 |
|-----------------------------------------------------------|
| Graph Loader | Crisis Rules | Propagation Engine          |
| Event Engine | Recommendation Engine | Scoring Engine     |
+-----------------------------|-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                       DATA LAYER                          |
|-----------------------------------------------------------|
| cities.geojson | routes.geojson | industries.json         |
| presets.json   | optional PostgreSQL later               |
+-----------------------------------------------------------+
```

## Core flow

1. Frontend sends scenario config to backend
2. Backend initializes graph state
3. Simulation engine runs in discrete ticks
4. Tick snapshots stream back to frontend
5. Frontend updates nodes, routes, panels, and events in real time
6. User sends decisions back during simulation
7. Backend mutates graph state and recomputes future ticks
8. Final summary is generated at the end

---

# 4. Conceptual Model

The simulation is built on a **graph**.

## Graph Model

- **Nodes** = cities, ports, hubs, industrial centers
- **Edges** = routes between them

Each node and edge carries dynamic state.

## Node state

Each node should have:

- `id`
- `name`
- `lat`
- `lng`
- `country`
- `region`
- `type` (city / port / hub)
- `industryWeights`
- `baseDemand`
- `baseSupply`
- `inventoryBuffer`
- `resilienceScore`
- `riskScore`
- `status`

## Edge state

Each edge should have:

- `id`
- `sourceNodeId`
- `targetNodeId`
- `transportType` (sea / road / rail / air)
- `capacity`
- `baseCost`
- `baseTransitTime`
- `fuelSensitivity`
- `policySensitivity`
- `riskTransmissionWeight`
- `riskScore`
- `status`

---

# 5. Core Functional Modules

## 5.1 Scenario Builder

This converts user inputs into a simulation-ready configuration.

### Inputs

- crisis origin selected on map
- industry selected from dropdown
- sliders:
  - conflict intensity
  - fuel shortage
  - policy restriction
- optional:
  - simulation duration
  - simulation speed
  - objective mode

### Output schema

```ts
export type ScenarioConfig = {
  originNodeId: string;
  industry: 'automotive' | 'energy' | 'pharma' | 'consumer_goods';
  conflictIntensity: number;   // 0 to 1
  fuelShortage: number;        // 0 to 1
  policyRestriction: number;   // 0 to 1
  durationDays: number;
  userGoal: 'resilience' | 'profit' | 'balanced';
};
```

## 5.2 Graph Loader

Loads static city and route data into in-memory graph structures.

Responsibilities:

- parse JSON/GeoJSON
- build adjacency lists
- attach industry-specific weights
- expose neighbor/path helpers

## 5.3 Crisis Rules Engine

Applies initial crisis shocks based on scenario config.

Examples:

- higher conflict intensity sharply raises risk near origin
- fuel shortage increases route operating cost, especially for road/air
- policy restriction lowers route capacity across borders

This is the module that creates the initial crisis disturbance.

## 5.4 Propagation Engine

This is the heart of the system.

It spreads risk across the logistics graph over time.

It is **not** a true GNN in v1. It is a weighted graph propagation model.

Responsibilities:

- update node risk based on local crisis + neighboring risk
- update edge risk from connected node conditions + route sensitivity
- convert risk into status changes
- detect failures

## 5.5 Event Engine

Watches graph state and emits user-facing events.

Examples:

- port shutdown detected
- cross-border route restricted
- fuel shortage worsening
- safe-zone demand spike observed

## 5.6 Recommendation Engine

Suggests actions such as:

- reroute through safer corridors
- shift inventory to safer hubs
- increase pricing in high-demand safe regions

## 5.7 Scoring Engine

Tracks outcome quality.

Metrics:

- risk avoided
- profit gained
- failed routes
- safe alternatives found
- unmet demand
- network efficiency
- resilience score

---

# 6. Low-Level Simulation Design

## Simulation model

Use **discrete time-step simulation**, not continuous simulation.

Example ticks:

- Day 1
- Day 2
- Day 3
- Day 5
- Day 7
- Day 9

Or internal ticks every few simulated hours if you want smoother playback.

## Tick pipeline

At each simulation tick:

1. apply crisis factor effects
2. propagate node risk
3. recompute edge risk
4. update node/edge statuses
5. trigger live events
6. generate recommendations
7. apply user decisions if submitted
8. recompute outcome metrics
9. stream snapshot to frontend

## Risk propagation formula

Suggested simple node update rule:

```text
newRisk(node) =
  baseRisk(node)
  + localShock(node)
  + alpha * sum(neighborRisk * transmissionWeight)
  - beta * resilienceFactor(node)
```

Where:

- `alpha` controls how strongly risk spreads
- `transmissionWeight` depends on route properties
- `beta` controls resistance to spread
- `resilienceFactor` comes from inventory buffers, alternate routes, and node stability

## Edge risk formula

```text
edgeRisk =
  avg(sourceRisk, targetRisk)
  * transportSensitivity
  * fuelFactor
  * policyFactor
```

## Status thresholds

Use simple thresholds for clarity:

- `0.0 - 0.3` = safe
- `0.3 - 0.6` = stressed
- `0.6 - 0.8` = risky
- `0.8 - 1.0` = broken

These thresholds drive map coloring and event logic.

---

# 7. Recommendation Logic

The recommendation engine should be heuristic, not overcomplicated.

## 7.1 Rerouting

Find alternative paths that reduce risk-adjusted cost.

Path score example:

```text
pathScore = w1 * cumulativeRisk + w2 * cost + w3 * transitTime
```

Pick the route with best score under capacity constraints.

## 7.2 Inventory Shifting

Recommend moving inventory toward hubs that have:

- lower projected risk
- strong downstream reachability
- low current disruption
- high expected demand capture

## 7.3 Dynamic Pricing

Mark zones for pricing increase when:

- demand rises sharply
- local supply remains constrained
- routes are still operational enough to serve demand

This is how “profit opportunities” emerge in the simulation.

---

# 8. Event System Design

Events make the product feel alive.

## Event sources

Events should be triggered from threshold rules, not random text generation.

Examples:

- node risk crosses 0.75 and node type is port → `port_shutdown`
- average fuel-sensitive route cost rises above threshold → `fuel_shortage_worsening`
- safe zone gains sharply rising demand → `demand_spike_safe_zone`
- route capacity collapses across border → `policy_restriction_escalation`

## Event schema

```ts
export type SimulationEvent = {
  id: string;
  tick: number;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  relatedNodeIds?: string[];
  relatedEdgeIds?: string[];
};
```

---

# 9. Frontend Architecture

## Core frontend areas

### 9.1 Map View

Responsibilities:

- render cities as nodes
- render routes as lines
- color nodes and lines based on current risk/status
- animate crisis spread over time
- allow selecting scenario origin

### 9.2 Control Panel

Responsibilities:

- industry selection
- crisis parameter sliders
- start, pause, reset
- speed controls

### 9.3 Event Feed

Responsibilities:

- show live crisis alerts
- show chronological event feed
- highlight severe changes

### 9.4 Decision Panel

Responsibilities:

- show recommendations
- allow action selection
- show estimated cost/benefit impact

### 9.5 Summary / Dashboard Panel

Responsibilities:

- current day/tick
- failed routes count
- active risk zones
- current profit opportunity score
- resilience / efficiency score

---

# 10. Backend Architecture

## Main backend layers

```text
+--------------------------------------------------+
|                   Express API                    |
|--------------------------------------------------|
| Scenario Routes | Decision Routes | Summary API  |
+-------------------------|------------------------+
                          |
                          v
+--------------------------------------------------+
|                 Session / State Layer            |
|--------------------------------------------------|
| Active Scenario Store | Tick Scheduler | Stream  |
+-------------------------|------------------------+
                          |
                          v
+--------------------------------------------------+
|                 Simulation Services              |
|--------------------------------------------------|
| Graph Loader | Rules Engine | Propagation Engine |
| Event Engine | Recommendation Engine | Scoring   |
+-------------------------|------------------------+
                          |
                          v
+--------------------------------------------------+
|                     Data Files                   |
+--------------------------------------------------+
```

## Key backend services

### `scenarioService`

Responsibilities:

- validate scenario input
- create session state
- initialize simulation world

### `graphService`

Responsibilities:

- load cities/routes data
- expose graph traversal/path helpers
- update in-memory state

### `simulationService`

Responsibilities:

- run ticks
- orchestrate all engines
- stream updates

### `recommendationService`

Responsibilities:

- calculate decisions and expected impact

### `scoreService`

Responsibilities:

- compute partial and final score

### `eventService`

Responsibilities:

- detect threshold events
- generate feed payloads

---

# 11. API Design

## REST endpoints

```text
POST   /api/scenario/create
POST   /api/scenario/:id/start
POST   /api/scenario/:id/pause
POST   /api/scenario/:id/reset
POST   /api/scenario/:id/decision
GET    /api/scenario/:id/state
GET    /api/scenario/:id/summary
```

## WebSocket / live stream

```text
WS /ws/scenario/:id
```

This streams:

- tick updates
- node state changes
- edge state changes
- events
- recommendations
- score updates
- final summary

## Example tick payload

```json
{
  "scenarioId": "scn_123",
  "tick": 3,
  "dayLabel": "Day 3",
  "nodes": [
    { "id": "mumbai", "riskScore": 0.72, "status": "risky" },
    { "id": "dubai", "riskScore": 0.19, "status": "safe" }
  ],
  "edges": [
    { "id": "route_12", "riskScore": 0.81, "status": "broken" },
    { "id": "route_27", "riskScore": 0.41, "status": "stressed" }
  ],
  "events": [
    {
      "id": "evt_91",
      "tick": 3,
      "type": "port_shutdown",
      "severity": "high",
      "title": "Port shutdown detected",
      "message": "Major disruption observed near Karachi corridor"
    }
  ],
  "recommendations": [
    {
      "id": "rec_22",
      "type": "reroute",
      "title": "Reroute via Gulf corridor",
      "impact": {
        "riskReduction": 0.18,
        "costIncrease": 0.07
      }
    }
  ],
  "score": {
    "riskAvoided": 18,
    "profitGained": 11,
    "networkEfficiency": 74
  }
}
```

---

# 12. Data Design

## File-based data for v1

### `cities.geojson`

Contains all nodes.

Fields:

- id
- name
- coordinates
- type
- country
- region
- industry weights
- resilience score
- supply/demand defaults

### `routes.geojson`

Contains all edges.

Fields:

- id
- source
- target
- transport type
- capacity
- base cost
- transit time
- fuel sensitivity
- policy sensitivity
- transmission weight

### `industries.json`

Defines industry-specific priorities.

Example:

- automotive depends more on road/port links
- pharma values resilience and lead time
- energy is highly exposed to geopolitical chokepoints

### `presets.json`

Defines scenario templates.

Example presets:

- regional war
- fuel crisis
- sanctions escalation
- port strike

## PostgreSQL later

Only introduce PostgreSQL when you genuinely need persistent features.

Suggested later tables:

- `users`
- `saved_scenarios`
- `scenario_runs`
- `scenario_decisions`
- `leaderboard`
- `simulation_metrics`

Do not add a database before the product proves itself.

---

# 13. Suggested Project Structure

## Frontend

```text
frontend/
  app/
    page.tsx
    layout.tsx
  components/
    map/
      SimulationMap.tsx
      MapLegend.tsx
    controls/
      ControlPanel.tsx
      SliderGroup.tsx
    events/
      EventFeed.tsx
      EventCard.tsx
    decisions/
      DecisionPanel.tsx
      RecommendationCard.tsx
    summary/
      SummaryBar.tsx
      ResultsDashboard.tsx
  lib/
    api/
      client.ts
    socket/
      scenarioSocket.ts
    map/
      layers.ts
      colorScale.ts
  state/
    scenarioStore.ts
  types/
    scenario.ts
    graph.ts
    event.ts
```

## Backend

```text
backend/
  src/
    server.ts
    app.ts
    routes/
      scenarioRoutes.ts
      summaryRoutes.ts
    controllers/
      scenarioController.ts
      decisionController.ts
    services/
      scenarioService.ts
      graphService.ts
      simulationService.ts
      propagationEngine.ts
      eventService.ts
      recommendationService.ts
      scoreService.ts
    models/
      scenario.ts
      graph.ts
      event.ts
    utils/
      pathfinding.ts
      thresholds.ts
      scoring.ts
    data/
      cities.geojson
      routes.geojson
      industries.json
      presets.json
```

---

# 14. Sequence Flow

## Simulation start flow

```text
User selects scenario inputs
        |
        v
Frontend sends POST /api/scenario/create
        |
        v
Backend validates config and creates scenario session
        |
        v
Graph and preset data are loaded
        |
        v
Initial crisis shock is applied
        |
        v
Frontend opens WebSocket connection
        |
        v
User presses Start
        |
        v
Simulation tick loop begins
        |
        v
Each tick updates graph state and streams payload
        |
        v
Frontend repaints map, events, and score panels
```

## Decision flow

```text
Recommendation appears on frontend
        |
        v
User selects an action
        |
        v
Frontend sends POST /api/scenario/:id/decision
        |
        v
Backend mutates graph/session state
        |
        v
Future ticks are recomputed using new conditions
        |
        v
Updated state is streamed back to frontend
```

---

# 15. Score Design

Keep score readable.

## Suggested score dimensions

- **Risk Avoided**
- **Profit Gained**
- **Network Efficiency**
- **Demand Served**
- **Route Failure Count**

## Final score example

```text
finalScore =
  0.40 * riskAvoided
  + 0.35 * profitGained
  + 0.25 * networkEfficiency
```

You can also show separate labels like:

- Operationally resilient
- Profit-maximizing
- Balanced strategist

That makes the final output more engaging.

---

# 16. Implementation Plan

## Phase 1 — UI & Map Prototype

Build:

- map view
- nodes and routes rendering
- click interaction
- control panel
- fake color spread animation

Output:

- a clickable polished visual shell

## Phase 2 — Graph Engine Core

Build:

- graph loader
- adjacency model
- node/edge risk state
- tick loop
- simple propagation formula

Output:

- real simulation engine running behind the map

## Phase 3 — Live Streaming & Events

Build:

- WebSocket stream
- event engine
- event cards
- animated map updates

Output:

- alive-looking simulation

## Phase 4 — Decisions & Recommendations

Build:

- reroute recommendation
- inventory shift recommendation
- pricing recommendation
- decision submit flow
- recomputation after user actions

Output:

- interactive game/simulator loop

## Phase 5 — Final Scoring & Polish

Build:

- results screen
- score model
- summary charts
- preset scenarios
- better animations
- loading/error handling

Output:

- demo-ready product

---

# 17. Risks and Design Warnings

## Biggest technical risks

### 1. Overengineering the simulation

Do not try to make it academically perfect.

A believable deterministic simulator is enough.

### 2. Too much map data

Do not model hundreds of countries and thousands of routes in v1.

Start with a reduced network.

### 3. Complex backend state handling too early

Keep one active in-memory simulation session model first.

### 4. Weak UI clarity

If users cannot instantly understand red/yellow/green spread and recommended actions, the product fails even if the backend is clever.

### 5. Adding PostgreSQL too early

Static data is enough until persistence is actually needed.

---

# 18. Final Stack Decision

## Recommended final stack for your case

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- MapLibre GL JS
- Zustand
- Framer Motion
- Recharts or visx

### Backend

- Node.js
- TypeScript
- Express
- WebSocket library (`ws`) or Socket.IO
- Zod optional

### Data

- GeoJSON + JSON mock files for v1
- PostgreSQL only if persistent storage becomes necessary

### Deployment

- Frontend: Vercel
- Backend: Render / Railway / VPS
- Data files bundled with backend

---

# 19. Bottom-Line Recommendation

This is the practical architecture you should build:

```text
Frontend (Next.js + TS + Tailwind + MapLibre)
        |
        | REST + WebSocket
        v
Backend (Node.js + TS + Express)
        |
        +--> Scenario Manager
        +--> Graph Loader
        +--> Propagation Engine
        +--> Event Engine
        +--> Recommendation Engine
        +--> Scoring Engine
        |
        v
Static JSON / GeoJSON data
```

That is the right v1 architecture.

Not microservices.
Not real GNNs.
Not live geopolitical intelligence.
Not distributed systems theatre.

A strong, clear, visual simulation engine with interactive decision loops is what will actually work.

---

# 20. Next Recommended Steps

Immediate next work:

1. finalize node and route schema
2. define 1 sample region / network for prototype
3. build map rendering first
4. build in-memory graph engine second
5. add tick streaming third
6. add decisions and scoring fourth

