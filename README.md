CrisisAlpha

Interactive Crisis Simulation Engine for Risk, Resilience & Opportunity

Overview

CrisisAlpha is a simulation-driven platform inspired by interactive systems like Plague Inc., designed to model how real-world crises—such as geopolitical conflicts, fuel shortages, and disasters—disrupt logistics networks and markets.

Users interact directly with a world map to trigger and observe cascading disruptions, enabling smarter decision-making under uncertainty.

Key Features

Interactive Map-Based Simulation

Select any region and trigger crisis scenarios
Visualize disruption spread across a dynamic network
Real-Time Crisis Evolution

Watch disruptions propagate across cities and routes
Time-based simulation (Day 1 → Day 7 → Day 30)
Risk Propagation Engine

Graph-based system inspired by GNN message passing
Models cascading failures across connected nodes
Failure Detection

Identify:

Broken routes
High-risk zones
Supply bottlenecks
Decision Engine
Suggest:

Alternative routes
Safer logistics hubs
Inventory redistribution
Profit Intelligence
Detect demand spikes in safe zones
Recommend dynamic pricing strategies
Highlight arbitrage opportunities
Live Event System
Dynamic alerts:

Port shutdowns
Fuel shortages
Demand surges
Simulation Feedback
Final scoring:

Risk avoided
Profit gained
Network efficiency
Architecture
Frontend

React
Mapbox / Leaflet
Backend

FastAPI (Python)
Core Engine

Graph-based simulation
Risk propagation
Pathfinding algorithms
AI Layer

LLM-based explanation system
Optional NLP for event signals
How It Works
Select location and industry

Configure crisis parameters

Run simulation

Observe:

Spread of disruption
Failure points
Recommended actions
Design Choice: Why Not a Full GNN?
We use a deterministic graph-based propagation model inspired by GNNs instead of training a full neural network.

This ensures:

Real-time performance
Interpretability
No dependency on large datasets
Stability during live simulations
Use Cases
Supply chain risk analysis
Crisis preparedness
Logistics optimization
Scenario-based decision training
Team
Arcane Logic

Vision
To transform crisis response from reactive analysis into interactive, simulation-driven decision intelligence.
