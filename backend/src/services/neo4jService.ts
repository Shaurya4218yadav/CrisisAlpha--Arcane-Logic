import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'crisisalpha_admin';
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function closeNeo4j() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export async function runCypher(query: string, params: any = {}) {
  const session = getNeo4jDriver().session();
  try {
    const result = await session.run(query, params);
    return result.records;
  } catch (error) {
    console.error('[Neo4j Cypher Error]', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Convenience method to create a trade hub node
 */
export async function mergeTradeHub(hub: any) {
  const query = `
    MERGE (n:TradeHub {id: $id})
    SET n.name = $name,
        n.type = $type,
        n.lat = $lat,
        n.lng = $lng,
        n.countryId = $countryId,
        n.regionId = $regionId,
        n.annualThroughput = $annualThroughput,
        n.gdpContribution = $gdpContribution,
        n.infrastructureQuality = $infrastructureQuality,
        n.inventoryBufferDays = $inventoryBufferDays,
        n.resilienceScore = $resilienceScore,
        n.baseDemand = $baseDemand,
        n.baseSupply = $baseSupply,
        n.currentStatus = coalesce(n.currentStatus, 'operational'),
        n.capacityPct = coalesce(n.capacityPct, 1.0)
  `;
  await runCypher(query, hub);
}

/**
 * Convenience method to create a trade route edge
 */
export async function mergeTradeRoute(route: any) {
  const query = `
    MATCH (s:TradeHub {id: $sourceHubId})
    MATCH (t:TradeHub {id: $targetHubId})
    MERGE (s)-[r:ROUTE_TO {id: $id}]->(t)
    SET r.transportType = $transportType,
        r.capacity = $capacity,
        r.baseCostPerUnit = $baseCostPerUnit,
        r.baseTransitDays = $baseTransitDays,
        r.fuelSensitivity = $fuelSensitivity,
        r.policySensitivity = $policySensitivity,
        r.weatherSensitivity = $weatherSensitivity,
        r.geopoliticalSensitivity = $geopoliticalSensitivity,
        r.riskTransmissionWeight = $riskTransmissionWeight,
        r.transitDelayDays = coalesce(r.transitDelayDays, 0),
        r.fuelCostMultiplier = coalesce(r.fuelCostMultiplier, 1.0)
  `;
  await runCypher(query, route);
}

/**
 * Update Node Status (disruption)
 */
export async function updateNodeDisruption(id: string, delta: any) {
  const query = `
    MATCH (n:TradeHub {id: $id})
    SET n.capacityPct = $capacityPct,
        n.currentStatus = $status
    RETURN n
  `;
  return await runCypher(query, { id, ...delta });
}

/**
 * Update Edge Status (constriction)
 */
export async function updateEdgeConstriction(id: string, delta: any) {
  const query = `
    MATCH ()-[r:ROUTE_TO]-()
    WHERE r.id = $id OR $id IN r.passesThrough
    SET r.transitDelayDays = $transitDelayDays,
        r.fuelCostMultiplier = $fuelCostMultiplier
    RETURN r
  `;
  return await runCypher(query, { id, ...delta });
}
