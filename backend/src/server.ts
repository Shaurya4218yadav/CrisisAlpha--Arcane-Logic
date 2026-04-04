// ============================================================
// CrisisAlpha — Server Entry Point (v2)
// Express + Socket.IO with all pillar services initialized
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Routes
import graphRoutes from './routes/graphRoutes';
import userRoutes from './routes/userRoutes';
import createSimulationRoutes from './routes/simulationRoutes';
import feedRoutes from './routes/feedRoutes';
import chatRoutes from './routes/chatRoutes';

// Services
import { loadGraph, hydrateBaseGraphFromNeo4j } from './services/graphService';
import { startIngestion, onLiveEvent, processWorldEvent } from './services/ingestionService';
import { initInference } from './services/inferenceService';
import { startTelematicsIngestion, onTelematicsFrame } from './services/telematicsService';
import { startNewsIngestion, onNewsEvent } from './services/newsIngestionService';
import { startAllProducers, onTrafficUpdate, onWeatherEvent } from './services/liveDataProducers';
import { startRiskDecay } from './services/riskDecayService';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Middleware ───────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────

app.use('/api/graph', graphRoutes);
app.use('/api/user', userRoutes);
app.use('/api/sim', createSimulationRoutes(io));
app.use('/api/feed', feedRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const graph = loadGraph();
  
  // Calculate live TEU stats
  let totalDailyTEU = 0;
  for (const e of graph.edges.values()) totalDailyTEU += e.currentVolumeTEU;
  
  res.json({
    status: 'ok',
    version: '2.1.0',
    pillars: {
      realTimeSimulation: true,
      whatIfEngine: true,
      predictiveImpact: true,
      liveDataIngestion: true,
    },
    graph: {
      nodes: graph.nodes.size,
      edges: graph.edges.size,
      chokepoints: graph.chokepoints.size,
      regions: graph.regions.size,
      politicalRelations: graph.politicalRelations.length,
      totalDailyTEU: Math.round(totalDailyTEU),
    },
    timestamp: new Date().toISOString(),
  });
});

// Legacy compat: old routes still respond
app.get('/api/presets', (req, res) => {
  res.redirect('/api/sim/presets');
});

// ── WebSocket ───────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] 🔌 Client connected: ${socket.id}`);

  // Join simulation room
  socket.on('sim:join', (simulationId: string) => {
    socket.join(simulationId);
    console.log(`[WS] 📺 ${socket.id} joined sim ${simulationId}`);
  });

  // Leave simulation room
  socket.on('sim:leave', (simulationId: string) => {
    socket.leave(simulationId);
    console.log(`[WS] 📴 ${socket.id} left sim ${simulationId}`);
  });

  // Join base reality feed
  socket.on('reality:subscribe', () => {
    socket.join('reality');
    console.log(`[WS] 🌍 ${socket.id} subscribed to reality feed`);
  });

  // Join telematics feed
  socket.on('telematics:subscribe', () => {
    socket.join('telematics');
    console.log(`[WS] 🛰️ ${socket.id} subscribed to live traffic feed`);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] ❌ Client disconnected: ${socket.id}`);
  });
});

// ── Wire live events to WebSocket ───────────────────────────

// Events from Kafka ingestion → reality room
onLiveEvent((event) => {
  io.to('reality').emit('reality:event', event);
});

// Events from GDELT news → process + emit
onNewsEvent((event) => {
  processWorldEvent(event);
  io.to('reality').emit('reality:event', event);
});

// Events from weather mock → process + emit
onWeatherEvent((event) => {
  processWorldEvent(event);
  io.to('reality').emit('reality:event', event);
});

// Traffic updates → emit to reality room
onTrafficUpdate((update) => {
  io.to('reality').emit('reality:traffic', update);
});

// Subscribe telematics frames
onTelematicsFrame((frame) => {
  io.to('telematics').emit('telematics:frame', frame);
});

// Periodically emit network stats to reality subscribers
setInterval(() => {
  try {
    const graph = loadGraph();
    let totalDailyTEU = 0;
    let disruptions = 0;
    let totalRisk = 0;
    
    for (const e of graph.edges.values()) totalDailyTEU += e.currentVolumeTEU;
    for (const n of graph.nodes.values()) {
      totalRisk += n.currentRiskScore;
      if (n.currentRiskScore > 0.1) disruptions++;
    }
    
    const networkHealth = graph.nodes.size > 0 
      ? Math.round((1 - totalRisk / graph.nodes.size) * 1000) / 10 
      : 100;
    
    io.to('reality').emit('reality:stats', {
      totalDailyVolumeTEU: Math.round(totalDailyTEU),
      activeDisruptions: disruptions,
      networkHealthPct: networkHealth,
      timestamp: new Date().toISOString(),
    });
  } catch {}
}, 15000); // Every 15 seconds

// ── Startup ─────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

async function boot() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       CrisisAlpha Simulation Engine v2.1     ║');
  console.log('║    Three-Pillar Architecture + Live Data      ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Load graph from Neo4j
  console.log('[Boot] 📊 Hydrating base graph from Neo4j...');
  await hydrateBaseGraphFromNeo4j();
  const graph = loadGraph();
  console.log(`[Boot] ✅ Graph loaded: ${graph.nodes.size} hubs, ${graph.edges.size} routes, ${graph.chokepoints.size} chokepoints`);

  // 2. Initialize AI inference
  console.log('[Boot] 🤖 Initializing AI inference...');
  await initInference();

  // 3. Start Kafka ingestion (graceful — won't crash if unavailable)
  console.log('[Boot] 📡 Starting event ingestion...');
  await startIngestion();

  // 4. Start live data producers
  console.log('[Boot] 🛰️ Starting live data producers...');
  startNewsIngestion();
  startAllProducers();

  // 5. Start risk decay engine
  console.log('[Boot] ⏳ Starting risk decay engine...');
  startRiskDecay();

  // 6. Start telematics
  console.log('[Boot] 🚛 Starting vehicle telematics...');
  await startTelematicsIngestion();

  // 7. Start server
  httpServer.listen(PORT, () => {
    console.log(`\n[Server] 🚀 CrisisAlpha backend running on http://localhost:${PORT}`);
    console.log(`[Server] 📡 WebSocket server on ws://localhost:${PORT}`);
    console.log('\n[API Endpoints]');
    console.log('  GET  /api/health              — Health check + TEU stats');
    console.log('  GET  /api/graph/full           — Full world graph');
    console.log('  GET  /api/graph/nodes          — All trade hubs');
    console.log('  GET  /api/graph/edges          — All trade routes');
    console.log('  GET  /api/graph/chokepoints    — Strategic chokepoints');
    console.log('  GET  /api/graph/relations      — Political relations');
    console.log('  GET  /api/graph/path/:from/:to — Pathfinding');
    console.log('  POST /api/user/profile         — Create user profile');
    console.log('  POST /api/user/attachments     — Add attachment point');
    console.log('  GET  /api/user/industry-template/:industry');
    console.log('  GET  /api/sim/presets           — Scenario presets');
    console.log('  POST /api/sim/create            — Create simulation');
    console.log('  POST /api/sim/:id/start         — Start simulation');
    console.log('  POST /api/sim/:id/decision      — Apply decision');
    console.log('  GET  /api/sim/:id/state         — Current state');
    console.log('  GET  /api/sim/:id/impact        — AI impact report');
    console.log('  GET  /api/feed/recent           — Live event feed');
    console.log('  GET  /api/feed/stats            — Network stats (TEU)');
    console.log('  GET  /api/feed/status           — Ingestion health');
    console.log('  POST /api/feed/inject           — Manual event injection');
    console.log('\n[Live Data Sources]');
    console.log('  📰 GDELT News          — 5-min poll (real + mock fallback)');
    console.log('  🚢 AIS Ship Traffic     — 30s mock producer');
    console.log('  🌀 Weather Alerts       — 2-min seasonal mock producer');
    console.log('');
  });
}

boot().catch(console.error);
