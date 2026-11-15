/**
 * ==============================================================================
 * Distributed Server Health Monitoring and Failure Detection System
 * MAIN BACKEND ENTRY POINT: server.js
 * ==============================================================================
 * 
 * Requirements Satisfied:
 *  1. Imports Express.js
 *  2. Imports Node.js HTTP module
 *  3. Imports Socket.IO Server
 *  4. Imports Mongoose
 *  5. Imports dotenv
 *  6. Imports CORS
 *  7. Imports all API route files (serverRoutes, alertRoutes, analyticsRoutes, mockRoutes)
 *  8. Imports error-handling middleware
 *  9. Connects to MongoDB using MONGODB_URI (distributed_server_monitor database)
 * 10. Initializes Express application
 * 11. Configures JSON parsing, URL encoding, and CORS
 * 12. Registers all backend REST API routes
 * 13. Initializes Socket.IO with WebSocket streaming
 * 14. Initializes the monitoring service after database connection is established
 * 15. Starts the HTTP server using configured PORT
 * 16. Handles server startup errors cleanly
 * 17. Handles graceful shutdown signals (SIGINT, SIGTERM)
 * 18. Closes monitoring jobs and disconnects MongoDB during shutdown
 */

// 1. Import Express.js
import express from 'express';

// 2. Import Node.js HTTP module
import http from 'http';

// 3. Import Socket.IO Server
import { Server as SocketIOServer } from 'socket.io';

// 4. Import Mongoose
import mongoose from 'mongoose';

// 5. Import dotenv
import dotenv from 'dotenv';

// 6. Import CORS
import cors from 'cors';

// Rate Limiting
import rateLimit from 'express-rate-limit';

// 7. Import all API route files
import serverRoutes from './routes/serverRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import mockRoutes from './mock/mockRoutes.js';

// 8. Import error-handling & auth middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/authMiddleware.js';

// Database & Monitoring services
import { connectDB, disconnectDB, isDbConnected } from './db.js';
import {
  startMonitoringScheduler,
  stopMonitoringScheduler,
} from './services/monitoringService.js';

// Load environment variables from .env
dotenv.config();

// 10. Initialize the Express application
const app = express();

// 2. Initialize Node.js HTTP server instance
const server = http.createServer(app);

// Configuration Constants
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/distributed_server_monitor';

// 13. Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Attach Socket.IO instance to Express application context for controllers
app.set('io', io);

// 11. Configure JSON parsing, URL encoding, and CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting (Security Requirement)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded. Please wait a moment before sending more requests.',
  },
});
app.use('/api/', apiLimiter);

// System Health Verification Endpoint
app.get('/api/health', (req, res) => {
  return res.json({
    status: 'online',
    system: 'Distributed Server Health Monitoring and Failure Detection System',
    version: '1.0.0',
    database: isDbConnected() ? 'connected' : 'in-memory-operational',
    databaseUri: isDbConnected() ? MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'local-memory',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 12. Register all backend routes
app.use('/api/servers', serverRoutes);
app.use('/api/monitoring', serverRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/fsm', analyticsRoutes);
app.use('/api/mock', mockRoutes);

// 8. Register centralized error-handling middleware
app.use(errorHandler);

// Socket.IO lifecycle logging and connection handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('ping_check', () => {
    socket.emit('pong_check', { time: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected (${reason}): ${socket.id}`);
  });
});

// 14. Initialize the monitoring service after successful database connection
async function startServer() {
  try {
    console.log('[System] Initializing Distributed Health Monitor Backend...');
    
    // 9. Connect to MongoDB using MONGODB_URI
    await connectDB();

    // 15. Start the HTTP server using configured PORT
    server.listen(PORT, () => {
      console.log('=================================================================');
      console.log(`🛡️  ServerPulse Health Monitoring Server running on port ${PORT}`);
      console.log(`📡 Socket.IO Real-Time Engine: Active (ws://localhost:${PORT})`);
      console.log(`📊 Health Endpoint: http://localhost:${PORT}/api/health`);
      console.log(`🧪 Mock Simulation Nodes: http://localhost:${PORT}/api/mock/fast`);
      console.log('=================================================================');

      // 14. Start monitoring jobs after server starts and DB is ready
      startMonitoringScheduler(io);
    });
  } catch (err) {
    // 16. Handle server startup errors
    console.error('❌ [Fatal Startup Error]: Failed to start backend server:', err);
    process.exit(1);
  }
}

// 17 & 18. Graceful shutdown handler
async function handleShutdown(signal) {
  console.log(`\n🛑 [${signal}] Signal received. Starting graceful shutdown...`);

  // 18. Close monitoring jobs
  try {
    stopMonitoringScheduler();
  } catch (err) {
    console.error('Error stopping monitoring scheduler:', err);
  }

  // Close HTTP server to stop accepting new requests
  server.close(async () => {
    console.log('🔌 HTTP and WebSocket connections closed.');

    // 18. Disconnect MongoDB
    try {
      await disconnectDB();
    } catch (err) {
      console.error('Error disconnecting MongoDB:', err);
    }

    console.log('✅ Graceful shutdown complete. Exiting process.');
    process.exit(0);
  });

  // Force exit if shutdown hangs beyond 10 seconds
  setTimeout(() => {
    console.error('⚠️  Shutdown timeout reached. Forcing immediate termination.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start server
startServer();

export { app, server, io };
