/**
 * ========================================================================
 * Distributed Server Health Monitoring and Failure Detection System
 * MongoDB Initialization & Seed Script (mongosh / MongoDB Compass)
 * ========================================================================
 * Usage:
 *   mongosh "mongodb://localhost:27017/server_monitor_db" init_mongo.js
 */

const dbName = 'server_monitor_db';
const db = db.getSiblingDB(dbName);

print(`Initializing MongoDB database: ${dbName}...`);

// 1. Admin Collection & Indexes
db.admin.createIndex({ username: 1 }, { unique: true });
db.admin.updateOne(
  { username: 'admin' },
  {
    $setOnInsert: {
      username: 'admin',
      // BCrypt hash for 'admin123'
      password: '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi',
      fullName: 'System Administrator',
      email: 'admin@servermonitor.io',
      role: 'ROLE_ADMIN',
      createdAt: new Date()
    }
  },
  { upsert: true }
);

// 2. Servers Collection & Indexes
db.servers.createIndex({ currentState: 1 });
db.servers.createIndex({ ipAddress: 1, port: 1 });

const sampleServers = [
  {
    serverName: 'Primary Web Application',
    ipAddress: '127.0.0.1',
    port: 8080,
    protocol: 'HTTP',
    endpointPath: '/api/mock/healthy',
    currentState: 'ACTIVE',
    consecutiveSuccesses: 5,
    lastResponseTimeMs: 42,
    lastCheckedAt: new Date(Date.now() - 60000),
    slowThresholdMs: 400,
    description: 'Core customer-facing Spring Boot web application',
    createdAt: new Date()
  },
  {
    serverName: 'Cloudflare Anycast DNS',
    ipAddress: '1.1.1.1',
    port: 53,
    protocol: 'TCP',
    endpointPath: '',
    currentState: 'ACTIVE',
    consecutiveSuccesses: 8,
    lastResponseTimeMs: 28,
    lastCheckedAt: new Date(Date.now() - 120000),
    slowThresholdMs: 250,
    description: 'Ultra-low latency public DNS resolver node',
    createdAt: new Date()
  },
  {
    serverName: 'Google Public DNS-Primary',
    ipAddress: '8.8.8.8',
    port: 53,
    protocol: 'TCP',
    endpointPath: '',
    currentState: 'ACTIVE',
    consecutiveSuccesses: 12,
    lastResponseTimeMs: 35,
    lastCheckedAt: new Date(Date.now() - 60000),
    slowThresholdMs: 300,
    description: 'Global Anycast DNS server for external routing verification',
    createdAt: new Date()
  },
  {
    serverName: 'Legacy Reporting Service',
    ipAddress: '127.0.0.1',
    port: 8080,
    protocol: 'HTTP',
    endpointPath: '/api/mock/slow',
    currentState: 'SLOW',
    consecutiveSuccesses: 3,
    lastResponseTimeMs: 780,
    lastCheckedAt: new Date(Date.now() - 180000),
    slowThresholdMs: 400,
    description: 'Batched reporting backend experiencing heavy I/O congestion',
    createdAt: new Date()
  },
  {
    serverName: 'Disaster Recovery Database',
    ipAddress: '192.0.2.1',
    port: 3306,
    protocol: 'TCP',
    endpointPath: '',
    currentState: 'DISCONNECTED',
    consecutiveSuccesses: 0,
    lastResponseTimeMs: 0,
    lastCheckedAt: new Date(Date.now() - 240000),
    slowThresholdMs: 500,
    description: 'Offline standby replica server (simulated unreachable network)',
    createdAt: new Date()
  },
  {
    serverName: 'Payment Gateway Webhook',
    ipAddress: '127.0.0.1',
    port: 8080,
    protocol: 'HTTP',
    endpointPath: '/api/mock/recovering',
    currentState: 'RECOVERING',
    consecutiveSuccesses: 2,
    lastResponseTimeMs: 95,
    lastCheckedAt: new Date(Date.now() - 30000),
    slowThresholdMs: 500,
    description: 'Recently rebooted payment ingest daemon undergoing stability check',
    createdAt: new Date()
  }
];

if (db.servers.countDocuments() === 0) {
  const insertResult = db.servers.insertMany(sampleServers);
  print(`Inserted ${insertResult.insertedCount} sample servers.`);
}

// 3. Monitoring History Collection & Indexes
db.monitoring_history.createIndex({ serverId: 1, checkedAt: -1 });
db.monitoring_history.createIndex({ checkedAt: -1 });

// 4. Failure Alerts Collection & Indexes
db.failure_alerts.createIndex({ alertTime: -1 });
db.failure_alerts.createIndex({ isAcknowledged: 1 });
db.failure_alerts.createIndex({ serverId: 1 });

print('MongoDB collections and indexes initialized successfully!');
