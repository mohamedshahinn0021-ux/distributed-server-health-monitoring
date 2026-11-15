import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

let isConnected = false;
let useMemoryFallback = false;

// In-Memory Data Store for resilient offline execution
export const memoryStore = {
  admins: [],
  servers: [],
  monitoringHistories: [],
  alerts: [],
};

export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/distributed_server_monitor';

  try {
    mongoose.set('strictQuery', false);
    console.log(`[Database] Attempting connection to MongoDB at: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });

    isConnected = true;
    useMemoryFallback = false;
    console.log(`[Database] ✅ Connected to MongoDB successfully (${mongoURI})`);
    
    // Seed initial admin and demo servers if collections are empty
    await seedInitialData();
  } catch (error) {
    isConnected = false;
    useMemoryFallback = true;
    console.warn(`[Database] ⚠️  MongoDB connection error: ${error.message}`);
    console.warn('[Database] ℹ️  Falling back to high-fidelity In-Memory Database Mode.');
    console.warn('[Database] ℹ️  To connect real MongoDB, start your local MongoDB service or set MONGODB_URI in backend/.env');
    
    await seedInitialData();
  }
}

export function isDbConnected() {
  return isConnected;
}

export function isUsingMemoryFallback() {
  return useMemoryFallback;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      isConnected = false;
      console.log('[Database] MongoDB connection closed gracefully.');
    } catch (err) {
      console.error('[Database] Error closing MongoDB connection:', err.message);
    }
  }
}

/**
 * Seeds initial demo data (Admin & Servers) for immediate evaluation
 */
async function seedInitialData() {
  try {
    // Dynamic import to avoid circular dependency
    const { default: Admin } = await import('../models/Admin.js');
    const { default: Server } = await import('../models/Server.js');
    const { default: Alert } = await import('../models/Alert.js');
    const { hashPassword } = await import('../utils/cryptoAuth.js');

    // 1. Seed Admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log('[Database] Seeding default administrator account...');
      const hashedPassword = await hashPassword('admin123');
      await Admin.create({
        username: 'admin',
        email: 'admin@system.local',
        password: hashedPassword,
        createdAt: new Date(),
      });
      console.log('[Database] ✅ Default admin created (username: admin, password: admin123)');
    }

    // 2. Seed Initial Servers
    const serverCount = await Server.countDocuments();
    if (serverCount === 0) {
      console.log('[Database] Seeding initial servers for real-time monitoring...');
      const seedServers = [
        {
          serverName: 'Primary Web Application',
          serverUrl: 'http://localhost:5000/api/mock/healthy',
          description: 'Core customer-facing web portal and dashboard gateway',
          monitoringInterval: 10,
          responseTimeThreshold: 400,
          currentStatus: 'ACTIVE',
          isMonitoring: true,
          consecutiveFailures: 0,
          consecutiveSuccesses: 5,
          lastResponseTime: 45,
          lastStatusCode: 200,
          lastCheckedAt: new Date(),
        },
        {
          serverName: 'Payment & Billing Microservice',
          serverUrl: 'http://localhost:5000/api/mock/slow',
          description: 'High-security transaction processing and invoice generation service',
          monitoringInterval: 10,
          responseTimeThreshold: 350,
          currentStatus: 'SLOW',
          isMonitoring: true,
          consecutiveFailures: 0,
          consecutiveSuccesses: 3,
          lastResponseTime: 820,
          lastStatusCode: 200,
          lastCheckedAt: new Date(),
        },
        {
          serverName: 'Legacy Reporting Cluster',
          serverUrl: 'http://localhost:5000/api/mock/error',
          description: 'Batch data aggregation service pending maintenance upgrade',
          monitoringInterval: 10,
          responseTimeThreshold: 500,
          currentStatus: 'DISCONNECTED',
          isMonitoring: true,
          consecutiveFailures: 4,
          consecutiveSuccesses: 0,
          lastResponseTime: 0,
          lastStatusCode: 500,
          lastCheckedAt: new Date(),
        },
        {
          serverName: 'Cloudflare Public Edge DNS',
          serverUrl: 'https://1.1.1.1',
          description: 'Global high-reliability DNS resolver probe',
          monitoringInterval: 15,
          responseTimeThreshold: 300,
          currentStatus: 'ACTIVE',
          isMonitoring: true,
          consecutiveFailures: 0,
          consecutiveSuccesses: 10,
          lastResponseTime: 28,
          lastStatusCode: 200,
          lastCheckedAt: new Date(),
        },
        {
          serverName: 'Cache Node - East Region',
          serverUrl: 'http://localhost:5000/api/mock/flaky',
          description: 'Distributed Redis cluster fronted by reverse-proxy',
          monitoringInterval: 10,
          responseTimeThreshold: 300,
          currentStatus: 'RECOVERING',
          isMonitoring: true,
          consecutiveFailures: 0,
          consecutiveSuccesses: 1,
          lastResponseTime: 62,
          lastStatusCode: 200,
          lastCheckedAt: new Date(),
        }
      ];

      for (const s of seedServers) {
        await Server.create(s);
      }
      console.log(`[Database] ✅ Seeded ${seedServers.length} servers into database.`);
    }
  } catch (err) {
    console.error('[Database] Warning while seeding initial data:', err.message);
  }
}

export default {
  connectDB,
  isDbConnected,
  isUsingMemoryFallback,
  disconnectDB,
  memoryStore,
};
