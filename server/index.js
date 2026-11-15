import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { connectDB, isDbConnected } from './db.js';
import serverRoutes from './routes/serverRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import mockRoutes from './mock/mockRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  startMonitoringScheduler,
  stopMonitoringScheduler,
} from './services/monitoringService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Socket.IO configuration with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

// Attach io instance to express app so routes can broadcast events
app.set('io', io);

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting Middleware (150 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded: too many requests, please try again shortly.',
  },
});
app.use('/api/', limiter);

// System Health & Verification Route
app.get('/api/health', (req, res) => {
  return res.json({
    status: 'online',
    system: 'Distributed Server Health Monitor & Failure Detection System',
    version: '1.0.0',
    database: isDbConnected() ? 'connected' : 'in-memory-operational',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mount Application Routes
app.use('/api/servers', serverRoutes);
app.use('/api/monitoring', serverRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/fsm', analyticsRoutes);
app.use('/api/mock', mockRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Socket.IO connection lifecycle
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });

  socket.on('ping_check', (data) => {
    socket.emit('pong_check', { time: Date.now() });
  });
});

// Startup Server & Monitoring Engine
async function bootstrap() {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`🚀 Distributed Health Monitor Server running on port ${PORT}`);
    console.log(`📡 WebSocket / Socket.IO live stream ready`);
    console.log(`🧪 Mock test endpoints mounted at http://localhost:${PORT}/api/mock/`);
    console.log(`===========================================================`);

    // Start background monitoring scheduler
    startMonitoringScheduler(io);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
});

// Graceful process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server and stopping timers...');
  stopMonitoringScheduler();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server and stopping timers...');
  stopMonitoringScheduler();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
