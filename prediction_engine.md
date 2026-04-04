# Phase 4: Python Prediction Engine

Up until this point, all simulation logic and data manipulation have been successfully running through our Node.js/TypeScript backend. While Node is fantastic for managing WebSockets and the Base Reality event loop, it is not mathematically optimized to run ten thousand parallel "What-If" scenarios to compute predictive volatility bounds.

To achieve this, we will spin up a decentralized **Python AI Pillar**.

## Architectural Overview
1. **The Language Barrier:** Node.js runs the API, Kafka ingestion, and frontend sockets. Python runs deep ML array calculations (Monte Carlo Analysis, Generative Agent-Based Modeling).
2. **The Data Bridge:** Because our "Source of Truth" is **Neo4j**, the Python Engine doesn't even need to ask Node.js for data. Python connects the official `neo4j-driver` and natively accesses identical graph states. 
3. **The Communication Layer:** Node.js triggers a REST call to the new `FastAPI` Python server (`http://localhost:8000/predict/scenario`).

## Proposed Changes

### 1. Engine Scaffolding
- **[NEW]** `/prediction-engine/requirements.txt`: Standardize the ML environment (`fastapi`, `uvicorn`, `neo4j`, `numpy`, `pandas`).
- **[NEW]** `/prediction-engine/main.py`: The FastAPI server entry point.

### 2. Monte Carlo Simulator
- **[NEW]** `/prediction-engine/simulation/monte_carlo.py`: This script will pull the target sub-graph from Neo4j. Because it uses `numpy` vectors, it will rapidly simulate a bottleneck thousands of times over varying distributions (e.g., fuel shortage probabilities) to output a 95% Confidence Interval for exact financial losses.

### 3. Node.js Integration
- **[MODIFY]** `backend/src/services/simulationService.ts`: We will rip out the naive `Math.random()` simulation calculations and point them off to `http://localhost:8000/predict/scenario` to demand enterprise-grade predictions.

## User Review Required
> [!IMPORTANT]
> The Python Prediction engine operates independently. I will set it up to run gracefully on `port 8000` via Uvicorn. To develop it, I will generate a `requirements.txt` file. Before we write the complex ML math, I want to ensure the empty FastAPI server perfectly handshakes with our Node.js server. 

## Open Questions
- Do you have a preferred Python package manager (e.g., raw `pip`, `poetry`, `conda`) for me to initialize the environment, or should I just construct a standard `requirements.txt` and `python -m venv`?
- Should we add this new Python engine immediately to the `docker-compose.yml` so it spins up automatically with Neo4j and Kafka?

## Verification Plan
1. Install Python requirements.
2. Boot Python `uvicorn`.
3. Ping `http://localhost:8000/health` from the Node.js backend.
4. Run a simulation from the frontend UI and trace the numerical predictions through Python arrays back to the browser WebGL charts.