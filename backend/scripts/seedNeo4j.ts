import * as fs from 'fs';
import * as path from 'path';
import { getNeo4jDriver, closeNeo4j, runCypher, mergeTradeHub, mergeTradeRoute } from '../src/services/neo4jService';

async function verifyConnection() {
  try {
    await runCypher('RETURN 1');
    console.log('[Seed] Connected to Neo4j successfully.');
  } catch (error) {
    console.error('[Seed] Failed to connect to Neo4j. Check if Docker is running.', error);
    process.exit(1);
  }
}

async function seedGraph() {
  await verifyConnection();
  console.log('[Seed] Clearing existing graph...');
  await runCypher('MATCH (n) DETACH DELETE n');

  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const hubsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'trade_hubs.json'), 'utf-8'));
  const routesRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'trade_routes.json'), 'utf-8'));

  console.log(`[Seed] Seeding ${hubsRaw.hubs.length} Trade Hub nodes...`);
  for (const hub of hubsRaw.hubs) {
    await mergeTradeHub(hub);
  }

  console.log(`[Seed] Seeding ${routesRaw.routes.length} Trade Route edges...`);
  for (const route of routesRaw.routes) {
    // Relationships are bidirectional in this transport model functionally, but we write them directed 
    // and query undirected. We will write them directed here as per JSON.
    await mergeTradeRoute(route);
  }

  console.log('[Seed] Seeding completed.');
  await closeNeo4j();
}

seedGraph().catch(console.error);
