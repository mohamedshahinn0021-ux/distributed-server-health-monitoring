import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Config & Database
import { connectDB, disconnectDB, isDbConnected, isUsingMemoryFallback } from './config/db.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import mockRoutes from './routes/mockRoutes.js';

// Services
import {
  startMonitoringScheduler,
  stopMonitoringScheduler,
} from './services/monitoringService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/distributed_server_monitor';

// Initialize Socket.IO with permissive CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Attach Socket.IO instance to Express app for controllers and services
app.set('io', io);

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// System Health and Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  return res.json({
    status: 'online',
    system: 'Distributed Server Health Monitoring and Failure Detection System',
    version: '2.0.0',
    database: isDbConnected() ? 'connected-mongodb' : 'in-memory-operational',
    storageMode: isUsingMemoryFallback() ? 'In-Memory Resilient Fallback' : 'Native MongoDB Replica/Daemon',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/mock', mockRoutes);

// Route for root to serve dashboard or login
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Socket.IO lifecycle logging
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('request_ping', () => {
    socket.emit('response_pong', { time: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected (${reason}): ${socket.id}`);
  });
});

// Start backend server
async function startServer() {
  try {
    console.log('=================================================================');
    console.log('⚡ Distributed Server Health Monitoring and Failure Detection System');
    console.log('=================================================================');

    // 1. Connect Database
    await connectDB();

    // 2. Start HTTP Server
    server.listen(PORT, () => {
      console.log(`🚀 Web Server is running on: http://localhost:${PORT}`);
      console.log(`📡 Socket.IO Real-time Engine: Active (ws://localhost:${PORT})`);
      console.log(`💻 Frontend Application: http://localhost:${PORT}/dashboard.html`);
      console.log(`🔑 Admin Login: http://localhost:${PORT}/login.html (admin / admin123)`);
      console.log(`🧪 Mock Simulation Endpoints: http://localhost:${PORT}/api/mock/healthy`);
      console.log('=================================================================');

      // 3. Start Continuous Monitoring Scheduler
      startMonitoringScheduler(io);
    });
  } catch (err) {
    console.error('❌ [Fatal Startup Error]:', err);
    process.exit(1);
  }
}

// Graceful Shutdown
async function handleShutdown(signal) {
  console.log(`\n🛑 [${signal}] Received. Closing background processes gracefully...`);
  stopMonitoringScheduler();

  server.close(async () => {
    console.log('🔌 HTTP and WebSocket listener terminated.');
    await disconnectDB();
    console.log('✅ Graceful exit complete.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️  Shutdown timeout. Forcing termination.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();

export { app, server, io };
