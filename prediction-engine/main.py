from fastapi import FastAPI, Request
from pydantic import BaseModel
from simulation.monte_carlo import run_monte_carlo_simulation
from database.neo4j_client import neo4j_client

app = FastAPI(title="CrisisAlpha Prediction Engine", version="1.0.0")

class ScenarioConfig(BaseModel):
    industry: str
    conflictIntensity: float
    fuelShortage: float
    policyRestriction: float
    originNodeId: str

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Prediction Engine is running"}

@app.post("/predict/scenario")
async def predict_scenario(config: ScenarioConfig):
    # Execute the 10,000 run Monte Carlo calculation
    config_dict = config.model_dump()
    monte_carlo_results = run_monte_carlo_simulation(config_dict, num_simulations=10000)
    
    # Optional: fetch identical Neo4j graph state (if populated)
    try:
        graph_state = neo4j_client.get_graph_state()
        nodes = graph_state["nodes"]
        edges = graph_state["edges"]
    except Exception as e:
        print(f"Neo4j mapping bypassed: {e}")
        nodes = []
        edges = []
        
    return {
        "status": "success",
        "message": "Monte Carlo prediction finalized.",
        "config_received": config_dict,
        "monte_carlo_impact": monte_carlo_results,
        "nodes": nodes,
        "edges": edges
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
