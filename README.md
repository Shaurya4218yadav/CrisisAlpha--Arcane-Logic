## CrisisAlpha 

**A crisis-aware supply chain simulation engine that predicts disruption points and recommends optimal survival + profit strategies in real time.**

---

Overview

CrisisAlpha is a simulation-driven platform inspired by interactive systems like Plague Inc., designed to model how real-world crises—such as geopolitical conflicts, fuel shortages, and disasters—disrupt logistics networks and markets.

Users interact directly with a world map to trigger and observe cascading disruptions, enabling smarter decision-making under uncertainty.

---

Key Features

 Interactive Map-Based Simulation

* Select any region and trigger crisis scenarios
* Visualize disruption spread across a dynamic network

 Real-Time Crisis Evolution

* Watch disruptions propagate across cities and routes
* Time-based simulation (Day 1 → Day 7 → Day 30)

 Risk Propagation Engine

* Graph-based system inspired by GNN message passing
* Models cascading failures across connected nodes

 Failure Detection

* Identify:

  * Broken routes
  * High-risk zones
  * Supply bottlenecks

# Decision Engine

* Suggest:

  * Alternative routes
  * Safer logistics hubs
  * Inventory redistribution

# Profit Intelligence

* Detect demand spikes in safe zones
* Recommend dynamic pricing strategies
* Highlight arbitrage opportunities

# Live Event System

* Dynamic alerts:

  * Port shutdowns
  * Fuel shortages
  * Demand surges

# Simulation Feedback

* Final scoring:

  * Risk avoided
  * Profit gained
  * Network efficiency

---

# Architecture

**Frontend**

* Next.js (React)
* Three.js (React Three Fiber)
* Tailwind CSS

**Backend**

* Node.js + Express
* Socket.IO (for real-time simulation ticks)
* TypeScript

**Core Engine**

* Graph-based simulation
* Risk propagation
* Pathfinding algorithms

**AI Layer**

* LLM-based explanation system
* Optional NLP for event signals

---

# How It Works

1. Select location and industry
2. Configure crisis parameters
3. Run simulation
4. Observe:

   * Spread of disruption
   * Failure points
   * Recommended actions

---

# Design Choice: Why Not a Full GNN?

We use a **deterministic graph-based propagation model inspired by GNNs** instead of training a full neural network.

This ensures:

* Real-time performance
* Interpretability
* No dependency on large datasets
* Stability during live simulations

---

# Use Cases

* Supply chain risk analysis
* Crisis preparedness
* Logistics optimization
* Scenario-based decision training

---

# Team

**Arcane Logic**

---

# Setup & Testing

CrisisAlpha is a full-stack application. Both the **Next.js frontend** and **Node.js backend** need to be running simultaneously to stream real-time simulation data over WebSockets to the 3D Globe.

## 1. Environment Setup

First, navigate to the `backend/` directory and configure the environment:
```sh
cd backend
cp .env.example .env
```
*(Optional)* Add your `GEMINI_API_KEY` to the `.env` file to enable the predictive AI inference layer. If omitted, the system gracefully defaults to a deterministic heuristic engine.

## 2. Running the Backend Engine

The backend orchestrates the Base Reality event ingestion, the What-If overlay engine, and the causality filters.

```sh
cd backend
npm install
npm run dev
```
*The backend will boot up on `http://localhost:3001`.*

## 3. Running the Frontend Dashboard

The frontend serves the real-time Crisis Command Center dashboard. Open a new terminal window:

```sh
cd frontend
npm install
npm run dev
```
*The application will boot up on `http://localhost:3000`.*

## 4. QA & Testing Workflow

1. Open your browser and navigate to `http://localhost:3000`.
2. Generate your **User Context** by entering test company parameters in the initial pre-simulation dialog.
3. Within the Control Panel, configure your crisis hypothesis (select Industry, severity parameters, or use a preset).
4. Click **Start Simulation**.
5. **Observe:** Watch the nodes pulse as risk propagates via live WebSockets. Review the AI Event Feed and impact projections.
6. **Interact/React:** Click the Chat (💬) icon in the bottom right context menu and ask the engine for live routing recommendations based on current supply chain disruptions!

---

# Vision

To transform crisis response from reactive analysis into interactive, simulation-driven decision intelligence.
