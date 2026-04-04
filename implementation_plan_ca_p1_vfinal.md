# CrisisAlpha — Phase 1 Implementation Plan
## Real-Time Base Reality (The Live Dashboard)

### Goal
Build the foundational real-time trade network: calibrate nodes/edges with real-world throughput data, connect live data streams (news, weather, shipping), and display real-time disruption events on the 3D globe so the user sees a living, breathing global logistics network before any simulation begins.

---

## Confirmed Design Decisions

- **3 Disruption Types Only**: Conflict, Policy/Tariff, Weather. No fuel shortage or infrastructure as separate categories.
- **Total Trade Volume Only**: No industry-specific breakdown. Each connection uses total volume (TEU-based from real data).
- **Real Data + Mock Gaps**: UNCTAD port throughput (real) → derived route volumes → mock producers fill live traffic gaps.
- **Hybrid API**: Real connections (GDELT news, OpenSky ADS-B) + Mock producers (AIS shipping, weather alerts).

---

## Step 1: Data Calibration — Real-World Trade Volumes

### What We're Changing
Replace hardcoded `annualThroughput` (arbitrary 0-100 scale) and `capacity` (arbitrary 0-100 scale) with real UNCTAD TEU figures and derived route volumes.

### 1.1 Update Port Throughput Data

#### [MODIFY] [trade_hubs.json](file:///e:/Projects/CrisisAlpha--Arcane-Logic/backend/src/data/trade_hubs.json)
- Replace `annualThroughput` (0-100) with `annualThroughputTEU` (actual TEU/year from UNCTAD 2024 data)
- Source: UNCTAD Review of Maritime Transport + Lloyd's List Top 100 Ports

Key ports and their real TEU values:

| Port | Current (arbitrary) | Real TEU (2024) |
|:---|:---:|:---:|
| Shanghai | 95 | 51,500,000 |
| Singapore | 90 | 41,120,000 |
| Shenzhen | 85 | 33,400,000 |
| Busan | 75 | 24,400,000 |
| Dubai (Jebel Ali) | 75 | 15,500,000 |
| Rotterdam | 85 | 13,820,000 |
| Hong Kong | 70 | 13,690,000 |
| Antwerp | 70 | 13,500,000 |
| Los Angeles | 80 | 10,100,000 |
| Mumbai (JNPT) | 65 | 6,200,000 |
| Mombasa | 20 | 1,500,000 |
| Tehran (inland hub) | 30 | 800,000 |

### 1.2 Derive Route Volumes from Port Data

#### [MODIFY] [graphService.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/backend/src/services/graphService.ts)
- Add `deriveRouteVolumes()` function that runs during graph hydration
- Formula for each edge:
  ```
  dailyVolumeTEU = min(sourcePort.annualTEU, targetPort.annualTEU) 
                   / 365 
                   / max(sourcePort.routeCount, targetPort.routeCount)
  ```
- This produces realistic daily TEU flow per route proportional to real port sizes
- Each edge gets a new `baseVolumeTEU` field (daily baseline volume)

#### [MODIFY] [graph.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/backend/src/models/graph.ts)
- Add `baseVolumeTEU: number` to `TradeRouteEdge` interface
- Add `currentVolumeTEU: number` (= `baseVolumeTEU × currentCapacityPct`, updated each tick)
- Keep existing `capacity` field for backward compatibility but derive it from TEU data

#### [MODIFY] [trade_routes.json](file:///e:/Projects/CrisisAlpha--Arcane-Logic/backend/src/data/trade_routes.json)
- Remove hardcoded `capacity` field (will be computed at runtime)
- Keep all sensitivity fields (`fuelSensitivity`, `policySensitivity`, `weatherSensitivity`, `geopoliticalSensitivity`)

### Verification — Step 1

| Test | Method | Pass Criteria |
|:---|:---|:---|
| **V1.1** TEU data loaded | `GET /api/graph/full` → check any node | `annualThroughputTEU` is a number > 100,000 (real TEU, not 0-100 scale) |
| **V1.2** Route volume derivation | `GET /api/graph/full` → check any edge | `baseVolumeTEU` exists and is > 0 |
| **V1.3** Port size ordering | Compare Shanghai vs Mombasa edge volumes | Shanghai-connected routes have ~30x more volume than Mombasa routes |
| **V1.4** Total network volume | Sum all `baseVolumeTEU` across edges | Should be in the range of 200K-500K TEU/day (global container trade is ~250M TEU/year ÷ 365) |
| **V1.5** Backward compat | Frontend `GlobeView` still renders | Globe loads without errors, arcs still visible |

---

## Step 2: Live Data Ingestion Pipeline

### What We're Building
Three Kafka producers that push real-time events into the system — one real (GDELT), two mock (AIS, weather). These flow through the existing `ingestionService.ts` and update the base reality graph.

### 2.1 GDELT News Connector (Real)

#### [NEW] `backend/src/services/newsIngestionService.ts`
- Polls GDELT REST API (`/api/v2/doc/doc`) every 5 minutes
- Filters to only 3 categories matching our disruption types:
  - `conflict`: keywords `war`, `military`, `attack`, `tensions`, `sanctions`, `piracy`
  - `policy`: keywords `tariff`, `trade war`, `sanctions`, `customs`, `export ban`, `embargo`
  - `weather`: keywords `typhoon`, `hurricane`, `earthquake`, `flooding`, `drought`, `tsunami`
- Geo-locates each event: matches article's geo-coordinates to nearest hub (within 500km radius)
- Produces Kafka messages to `base-reality.disruptions` topic
- Falls back to mock news generator if GDELT is unreachable (generates headlines from templates in `LIVE_EVENT_SCENARIOS`)

### 2.2 Mock AIS Ship Traffic Producer

#### [NEW] `backend/src/services/liveDataProducers.ts`
- **Ship Traffic Mock**: Generates realistic vessel position updates along known shipping routes
  - Each route gets a number of active "vessels" proportional to its `baseVolumeTEU`
  - Vessels move along the route path with realistic speed (sea: 15 knots, etc.)
  - Random delays/disruptions (5% chance per tick of minor delay)
  - Emits `TRAFFIC_UPDATE` events that adjust edge `currentVolumeTEU` slightly (±5-15% daily variance)
- **Weather Alert Mock**: Generates weather events using seasonal probability models
  - Typhoon season (June-Nov) → higher probability for East Asia / Southeast Asia routes
  - Monsoon season (June-Sept) → South Asia hubs
  - Winter storms → Northern Europe / North Atlantic routes
  - Emits `WEATHER_EVENT` Kafka messages with severity, duration, affected hub IDs

### 2.3 Ingestion Service Updates

#### [MODIFY] [ingestionService.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/backend/src/services/ingestionService.ts)
- Add 3 new event type handlers alongside existing `NODE_DISRUPTION` and `ROUTE_CONSTRICTION`:
  - `CONFLICT_EVENT` → increments `currentRiskScore` on affected nodes, applies political relation modifiers
  - `POLICY_EVENT` → increments risk on cross-border edges via `policySensitivity`, applies to sanctioned countries
  - `WEATHER_EVENT` → increments risk on affected nodes/chokepoints, time-limited with `durationHours`
- Each handler normalizes the incoming event into the existing `WorldEvent` type and appends to the event store
- Emits `reality:event` via Socket.IO so the frontend can display it in real-time

### 2.4 Server Startup Integration

#### [MODIFY] [server.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/backend/src/server.ts)
- Start all producers after graph hydration completes
- Start GDELT poller on a 5-minute interval
- Start mock AIS producer on a 30-second interval
- Start mock weather producer on a 2-minute interval
- Log: `[LIVE] 🛰️ Real-time data producers active`

### Verification — Step 2

| Test | Method | Pass Criteria |
|:---|:---|:---|
| **V2.1** GDELT connectivity | Check server logs after startup | `[GDELT] Fetched N articles` OR `[GDELT] Falling back to mock` |
| **V2.2** Kafka message flow | Produce a test event → check consumer | `ingestionService` logs `[INGEST] Processing CONFLICT_EVENT` within 5s |
| **V2.3** Graph mutation | Push a `WEATHER_EVENT` targeting `shanghai` → `GET /api/graph/full` | `shanghai` node's `currentRiskScore` > 0 |
| **V2.4** Event store append | After 2 minutes running → `GET /api/feed/recent` | Returns ≥ 1 event with `branchId: 'base'` |
| **V2.5** Mock AIS variance | Check edges after 60s of running | `currentVolumeTEU` values differ slightly from `baseVolumeTEU` (±5-15%) |
| **V2.6** Weather seasonality | Inspect 100 mock weather events | East Asia events cluster in June-Nov, monsoon events in June-Sept |
| **V2.7** No sandbox leakage | Start a simulation → check if GDELT events appear in sandbox | Sandbox graph unaffected by base reality events |
| **V2.8** Socket emission | Connect WebSocket → wait 30s | Receive at least one `reality:event` on the socket |

---

## Step 3: Frontend Live Feed

### What We're Building
Wire the frontend to display real-time base reality events and live throughput data on the globe, before any simulation is started.

### 3.1 State Store Updates

#### [MODIFY] [scenarioStore.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/frontend/src/state/scenarioStore.ts)
- Add `baseRealityEvents: SimulationEvent[]` array (separate from simulation events)
- Add `addBaseRealityEvent(event)` action
- Add `liveNetworkStats: { totalVolumeTEU: number, activeDisruptions: number, affectedHubs: number }` 
- Add `updateLiveStats(stats)` action

### 3.2 Reality WebSocket Connection

#### [MODIFY] [client.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/frontend/src/lib/api/client.ts)
- Add `connectRealitySocket()` function:
  - Connects to Socket.IO
  - Listens on `reality:event` channel
  - Pushes incoming events to `scenarioStore.addBaseRealityEvent()`
  - Listens on `reality:stats` channel for live throughput updates
- Auto-connect on app initialization (in `page.tsx` `useEffect`)

### 3.3 Intel Feed Enhancement

#### [MODIFY] [IntelFeed.tsx](file:///e:/Projects/CrisisAlpha--Arcane-Logic/frontend/src/components/panels/IntelFeed.tsx)
- Add a "Live" tab showing `baseRealityEvents` (real-time news/weather/conflict events)
- Each event shows: timestamp, category icon (⚔️/📜/🌀), title, affected hub name, severity badge
- New events animate in from the top with a subtle slide + glow effect
- Clicking an event highlights the affected node on the globe

### 3.4 Summary Bar Live Metrics

#### [MODIFY] [SummaryBar.tsx](file:///e:/Projects/CrisisAlpha--Arcane-Logic/frontend/src/components/summary/SummaryBar.tsx)
- Show live network stats when no simulation is running:
  - Total daily volume (TEU) with live counter animation
  - Active disruptions count with pulse indicator
  - Network health percentage (from avg node risk)
- When simulation starts, switch to showing simulation metrics (existing behavior)

### 3.5 Globe Live Data Visualization

#### [MODIFY] [GlobeView.tsx](file:///e:/Projects/CrisisAlpha--Arcane-Logic/frontend/src/components/globe/GlobeView.tsx)
- Arc thickness now proportional to `baseVolumeTEU` (thicker = more trade volume)
- Node pulse radius proportional to `annualThroughputTEU` (Shanghai pulses bigger than Mombasa)
- When a `reality:event` arrives, briefly flash the affected node with the event color (red for conflict, amber for weather, blue for policy)
- Add a subtle particle effect along arcs representing active trade flow

### Verification — Step 3

| Test | Method | Pass Criteria |
|:---|:---|:---|
| **V3.1** Live events display | Open frontend → wait 60s | IntelFeed "Live" tab shows ≥ 1 event |
| **V3.2** Event click → globe | Click an event in IntelFeed | Globe rotates to and highlights the affected node |
| **V3.3** Summary bar stats | Open frontend with backend running | Summary bar shows total TEU/day, disruption count, network health |
| **V3.4** Arc thickness | Compare Shanghai→Singapore arc vs Mombasa→Dubai arc | Shanghai arc is visibly thicker |
| **V3.5** Node pulse sizing | Compare Shanghai node vs Tehran node on globe | Shanghai node pulses larger |
| **V3.6** Event flash | Wait for a reality:event | Affected node briefly glows the disruption color |
| **V3.7** Latency | Measure time from Kafka produce to globe visual update | Under 3 seconds |
| **V3.8** No console errors | Open browser DevTools → Console | Zero errors during 2 minutes of live feed |

---

## Step 4: Graph Service Enhancements

### What We're Building
Update the graph hydration and serialization to support the new TEU-based volume system and ensure the frontend receives all the data it needs.

### 4.1 Graph Hydration Updates

#### [MODIFY] [graphService.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/backend/src/services/graphService.ts)
- After loading nodes from Neo4j/JSON, store `annualThroughputTEU` on each node
- After loading edges, call `deriveRouteVolumes()` to compute `baseVolumeTEU` per edge
- Compute `currentVolumeTEU = baseVolumeTEU × currentCapacityPct` (updated in memory as disruptions hit)
- Update `serializeNodes()` to include `annualThroughputTEU` in output
- Update `serializeEdges()` to include `baseVolumeTEU` and `currentVolumeTEU` in output

### 4.2 Feed Routes

#### [NEW] `backend/src/routes/feedRoutes.ts`
- `GET /api/feed/recent` → returns last 20 base reality events (already partially exists)
- `GET /api/feed/stats` → returns live network stats:
  ```json
  {
    "totalDailyVolumeTEU": 312000,
    "activeDisruptions": 3,
    "affectedHubs": 5,
    "networkHealthPct": 94.2,
    "lastEventTimestamp": "2026-04-04T12:00:00Z"
  }
  ```

### 4.3 Frontend Types Update

#### [MODIFY] [types/index.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/frontend/src/types/index.ts)
- Add `annualThroughputTEU: number` to `GraphNode` type
- Add `baseVolumeTEU: number` and `currentVolumeTEU: number` to `GraphEdge` type
- Add `LiveNetworkStats` interface

#### [MODIFY] [client.ts](file:///e:/Projects/CrisisAlpha--Arcane-Logic/frontend/src/lib/api/client.ts)
- Update `normalizeNode()` to pass through `annualThroughputTEU`
- Update `normalizeEdge()` to pass through `baseVolumeTEU` and `currentVolumeTEU`

### Verification — Step 4

| Test | Method | Pass Criteria |
|:---|:---|:---|
| **V4.1** Node TEU data | `GET /api/graph/full` → check `shanghai` | Has `annualThroughputTEU: 51500000` |
| **V4.2** Edge volume data | `GET /api/graph/full` → check any edge | Has `baseVolumeTEU` > 0 and `currentVolumeTEU` > 0 |
| **V4.3** Feed stats | `GET /api/feed/stats` | Returns valid JSON with `totalDailyVolumeTEU` > 0 |
| **V4.4** Feed recent | `GET /api/feed/recent` after 2 min running | Returns array with ≥ 1 event |
| **V4.5** Frontend types | Build frontend (`npm run build`) | Zero TypeScript errors |
| **V4.6** Data integrity | Compare `graph/full` node count vs Neo4j `MATCH (n) RETURN count(n)` | Exact match |

---

## Build Order

```
Step 1: Data Calibration ──────────────── (no dependencies)
  │
  ├─→ Step 4.1: Graph hydration updates ── (depends on Step 1 data)
  │     │
  │     └─→ Step 4.2-4.3: Feed routes + types ── (depends on 4.1)
  │
  └─→ Step 2: Live Data Producers ──────── (depends on Step 1 for baseVolumeTEU)
        │
        └─→ Step 3: Frontend Live Feed ──── (depends on Step 2 for events + Step 4 for types)
```

**Estimated total: ~4 build sessions**
- Session 1: Steps 1 + 4.1 (data + graph hydration)
- Session 2: Steps 4.2 + 4.3 (routes + types)
- Session 3: Step 2 (all producers)
- Session 4: Step 3 (frontend wiring + visual polish)

---

## End-to-End Verification (After All Steps Complete)

| Test | Description | Pass Criteria |
|:---|:---|:---|
| **E2E-1** Cold start | `docker-compose up` → `npm run dev` (backend) → `npm run dev` (frontend) | Globe loads with real TEU-sized nodes and proportional arcs within 10s |
| **E2E-2** Live feed loop | Wait 2 minutes after startup | ≥ 3 reality events visible in IntelFeed, globe nodes flash on events |
| **E2E-3** Volume baseline | Compare `baseVolumeTEU` to `currentVolumeTEU` after live events | `currentVolumeTEU` drifts ±5-15% from baseline due to mock traffic |
| **E2E-4** Disruption impact | Wait for a weather/conflict event → check affected hub | Hub's `currentRiskScore` increased, connected edge volumes decreased |
| **E2E-5** Sandbox isolation | Start a simulation while live feed is running | Live events update base graph but NOT the simulation's sandbox graph |
| **E2E-6** Data persistence | Restart backend → `GET /api/graph/full` | Graph hydrates from Neo4j with correct TEU data |
| **E2E-7** Graceful degradation | Kill Kafka container → check backend | Backend continues with in-memory graph, logs warning, no crash |
