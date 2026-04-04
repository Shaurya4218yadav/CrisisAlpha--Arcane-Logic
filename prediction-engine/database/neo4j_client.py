import os
from neo4j import GraphDatabase

class Neo4jClient:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "testpassword")
        self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))

    def close(self):
        self.driver.close()

    def get_graph_state(self):
        """
        Retrieves the exact graph state natively mapped onto identical states as the Node.js backend.
        Returns all TradeHub nodes and TradeRoute edges.
        """
        nodes = []
        edges = []
        with self.driver.session() as session:
            # Cypher to fetch TradeHubs
            node_result = session.run("MATCH (n:TradeHub) RETURN n")
            for record in node_result:
                node = record["n"]
                nodes.append(dict(node))
                
            # Cypher to fetch TradeRoutes
            edge_result = session.run("MATCH (a:TradeHub)-[r:ROUTE]->(b:TradeHub) RETURN r, a.id AS source, b.id AS target")
            for record in edge_result:
                edge = dict(record["r"])
                edge["sourceHubId"] = record["source"]
                edge["targetHubId"] = record["target"]
                edges.append(edge)
                
        return {"nodes": nodes, "edges": edges}
        
    def write_mutations(self, mutations):
        """
        Takes predictive mutations returned from Monte Carlo analysis and writes them back independently
        to Neo4j, bypassing the Node WebSocket bottleneck.
        """
        with self.driver.session() as session:
            for mutation in mutations:
                if mutation["type"] == "node":
                    session.run(
                        "MATCH (n:TradeHub {id: $id}) SET n.predictiveRisk = $risk",
                        id=mutation["id"], risk=mutation["risk"]
                    )
                elif mutation["type"] == "edge":
                    session.run(
                        "MATCH ()-[r:ROUTE {id: $id}]->() SET r.predictiveCapacity = $cap, r.predictiveRisk = $risk",
                        id=mutation["id"], cap=mutation["capacity"], risk=mutation["risk"]
                    )

# Singleton instance
neo4j_client = Neo4jClient()
