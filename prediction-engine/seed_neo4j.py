import json
import os
from neo4j import GraphDatabase

# Configure connection
URI = "bolt://localhost:7687"
AUTH = ("neo4j", "testpassword")

def seed_database():
    print("Loading data from backend/data...")
    with open('backend/src/data/trade_hubs.json', 'r') as f:
        hubs_data = json.load(f)["hubs"]
        
    with open('backend/src/data/trade_routes.json', 'r') as f:
        routes_data = json.load(f)["routes"]

    driver = GraphDatabase.driver(URI, auth=AUTH)
    
    with driver.session() as session:
        print("Clearing existing graph...")
        session.run("MATCH (n) DETACH DELETE n")
        
        print(f"Inserting {len(hubs_data)} TradeHubs...")
        for hub in hubs_data:
            session.run('''
                CREATE (n:TradeHub {
                    id: $id, 
                    name: $name, 
                    type: $type, 
                    lat: $lat, 
                    lng: $lng, 
                    countryId: $countryId, 
                    regionId: $regionId
                })
            ''', **hub)
            
        print(f"Inserting {len(routes_data)} TradeRoutes...")
        for route in routes_data:
            session.run('''
                MATCH (a:TradeHub {id: $sourceHubId}), (b:TradeHub {id: $targetHubId})
                CREATE (a)-[r:ROUTE {
                    id: $id,
                    transportType: $transportType,
                    capacity: $capacity,
                    baseCostPerUnit: $baseCostPerUnit,
                    baseTransitDays: $baseTransitDays,
                    fuelSensitivity: $fuelSensitivity,
                    policySensitivity: $policySensitivity,
                    geopoliticalSensitivity: $geopoliticalSensitivity
                }]->(b)
            ''', **route)
            
    driver.close()
    print("Neo4j database successfully seeded with CrisisAlpha nodes and edges!")

if __name__ == "__main__":
    seed_database()
