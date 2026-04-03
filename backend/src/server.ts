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
import { loadGraph } from './services/graphService';
import { startIngestion, onLiveEvent } from './services/ingestionService';
import { initInference } from './services/inferenceService';

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
  res.json({
    status: 'ok',
    version: '2.0.0',
    pillars: {
      realTimeSimulation: true,
      whatIfEngine: true,
      predictiveImpact: true,
    },
    graph: {
      nodes: graph.nodes.size,
      edges: graph.edges.size,
      chokepoints: graph.chokepoints.size,
      regions: graph.regions.size,
      politicalRelations: graph.politicalRelations.length,
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

  socket.on('disconnect', () => {
    console.log(`[WS] ❌ Client disconnected: ${socket.id}`);
  });
});

// Subscribe ingestion events to WebSocket reality room
onLiveEvent((event) => {
  io.to('reality').emit('reality:event', event);
});

// ── Startup ─────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

async function boot() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       CrisisAlpha Simulation Engine v2       ║');
  console.log('║          Three-Pillar Architecture            ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Load graph
  console.log('[Boot] 📊 Loading world graph...');
  const graph = loadGraph();
  console.log(`[Boot] ✅ Graph loaded: ${graph.nodes.size} hubs, ${graph.edges.size} routes, ${graph.chokepoints.size} chokepoints`);

  // 2. Initialize AI inference
  console.log('[Boot] 🤖 Initializing AI inference...');
  await initInference();

  // 3. Start live event ingestion
  console.log('[Boot] 📡 Starting live event ingestion...');
  startIngestion();

  // 4. Start server
  httpServer.listen(PORT, () => {
    console.log(`\n[Server] 🚀 CrisisAlpha backend running on http://localhost:${PORT}`);
    console.log(`[Server] 📡 WebSocket server on ws://localhost:${PORT}`);
    console.log('\n[API Endpoints]');
    console.log('  GET  /api/health              — Health check');
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
    console.log('  POST /api/feed/inject           — Manual event injection');
    console.log('');
  });
}

boot().catch(console.error);
