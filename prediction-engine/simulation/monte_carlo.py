import numpy as np
import pandas as pd

def run_monte_carlo_simulation(config: dict, num_simulations=10000) -> dict:
    """
    Simulates thousands of crisis timeline permutations using NumPy.
    Calculates 95% confidence intervals and non-linear risk distributions.
    """
    # 1. Extract base parameters from config
    conflict_intensity = config.get("conflictIntensity", 0.5)
    fuel_shortage = config.get("fuelShortage", 0.3)
    policy_restriction = config.get("policyRestriction", 0.3)
    industry = config.get("industry", "consumer_goods")
    
    # Base daily financial exposure per industry (in USD)
    base_exposure_map = {
        "automotive": 15000000,
        "energy": 45000000,
        "pharma": 25000000,
        "consumer_goods": 10000000
    }
    base_exposure = base_exposure_map.get(industry, 10000000)
    
    # 2. Define statistical distributions for our risk factors (Normal distribution, clipped 0-1)
    np.random.seed() # Use random seed for real simulation results per call
    
    conflict_dist = np.clip(np.random.normal(loc=conflict_intensity, scale=0.15, size=num_simulations), 0, 1)
    fuel_dist = np.clip(np.random.normal(loc=fuel_shortage, scale=0.10, size=num_simulations), 0, 1)
    policy_dist = np.clip(np.random.normal(loc=policy_restriction, scale=0.08, size=num_simulations), 0, 1)
    
    # 3. Industry specific sensitivity weights: [conflict, fuel, policy]
    sensitivity_map = {
        "automotive": np.array([0.4, 0.4, 0.2]),
        "energy": np.array([0.5, 0.1, 0.4]),
        "pharma": np.array([0.2, 0.3, 0.5]),
        "consumer_goods": np.array([0.3, 0.4, 0.3])
    }
    weights = sensitivity_map.get(industry, np.array([0.33, 0.33, 0.34]))
    
    # 4. Calculate Aggregate Risk Score Matrix (N runs)
    risk_matrix = np.column_stack((conflict_dist, fuel_dist, policy_dist))
    aggregate_risk = np.dot(risk_matrix, weights)
    
    # 5. Non-linear loss function based on aggregate risk
    # Risk < 0.3 causes negligible loss. Risk > 0.7 scales exponentially.
    loss_multiplier = np.where(aggregate_risk < 0.3, 0.05 * aggregate_risk, 
                      np.where(aggregate_risk < 0.7, 0.5 * aggregate_risk,
                               1.0 + 2.0 * (aggregate_risk - 0.7)**2))
                               
    # Black Swan Events: random exogenous catastrophic shocks (2% chance)
    black_swan_events = np.random.binomial(n=1, p=0.02, size=num_simulations)  
    black_swan_multiplier = 1.0 + (black_swan_events * np.random.uniform(0.5, 2.0, size=num_simulations))
    
    # Total loss array across all N simulation realities
    losses = base_exposure * loss_multiplier * black_swan_multiplier
    
    # 6. Extract statistical confidence bounds using numpy percentiles
    mean_loss = float(np.mean(losses))
    p5_loss = float(np.percentile(losses, 5))
    p95_loss = float(np.percentile(losses, 95))
    max_loss = float(np.max(losses))
    
    # 7. Bucket into a histogram density dataset for UI consumption
    hist, bin_edges = np.histogram(losses, bins=15)
    histogram_data = [
        {
            "bin_start": float(bin_edges[i]), 
            "bin_end": float(bin_edges[i+1]), 
            "count": int(hist[i])
        } for i in range(len(hist))
    ]
    
    return {
        "runs": num_simulations,
        "mean_loss_usd": mean_loss,
        "confidence_interval_95": {
            "lower_bound_usd": p5_loss,
            "upper_bound_usd": p95_loss
        },
        "tail_risk_max_usd": max_loss,
        "histogram": histogram_data
    }
