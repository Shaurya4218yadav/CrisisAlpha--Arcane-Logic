// ============================================================
// CrisisAlpha — Server Entry Point
// Express + Socket.IO server
// ============================================================

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import scenarioRoutes from './routes/scenarioRoutes';
import { setupSocketHandlers } from './services/simulationService';

const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
}));
app.use(express.json());

// Attach io to app for route access
app.set('io', io);

// Routes
app.use('/api', scenarioRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Setup WebSocket handlers
setupSocketHandlers(io);

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║          CrisisAlpha Backend Server           ║
  ║                                               ║
  ║   REST API:    http://localhost:${PORT}/api      ║
  ║   WebSocket:   ws://localhost:${PORT}            ║
  ║   Health:      http://localhost:${PORT}/health   ║
  ╚═══════════════════════════════════════════════╝
  `);
});

export { app, io, server };
