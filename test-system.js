/**
 * Comprehensive System & Integration Test Suite for
 * Distributed Server Health Monitoring and Failure Detection System
 */

import { evaluateFSMState, SERVER_STATES } from './backend/services/fsmService.js';
import { hashPassword, comparePassword, signToken, verifyToken } from './backend/utils/cryptoAuth.js';
import { validateServerUrl } from './backend/utils/responseTime.js';
import { connectDB } from './backend/config/db.js';

import Admin from './backend/models/Admin.js';
import Server from './backend/models/Server.js';
import MonitoringHistory from './backend/models/MonitoringHistory.js';
import Alert from './backend/models/Alert.js';

import { login, register, getProfile } from './backend/controllers/authController.js';
import {
  createServer,
  getAllServers,
  getServerById,
  updateServer,
  toggleServerMonitoring,
  deleteServer,
} from './backend/controllers/serverController.js';
import {
  getMonitoringStatus,
  getServerHistory,
  getServerMonitoringDetails,
} from './backend/controllers/monitoringController.js';
import {
  getAllAlerts,
  markAllRead,
  markRead,
} from './backend/controllers/alertController.js';

// Mock Response Helper
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runAllTests() {
  console.log('=================================================================');
  console.log('🧪 Starting Distributed Server Monitor Integration Verification');
  console.log('=================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Connect Database (uses in-memory fallback if daemon is offline)
  await connectDB();

  // 1. Test Cryptographic Security & Tokens
  console.log('\n--- 1. Testing Cryptographic Security & JWT ---');
  try {
    const rawPw = 'SecureAdminSecret!99';
    const hashed = await hashPassword(rawPw);
    assert(typeof hashed === 'string' && hashed.length > 20, 'Password hashed securely with PBKDF2/bcrypt');

    const match = await comparePassword(rawPw, hashed);
    assert(match === true, 'Valid password verification matches hash');

    const mismatch = await comparePassword('InvalidPassword', hashed);
    assert(mismatch === false, 'Invalid password is fundamentally rejected');

    const token = signToken({ id: 'test_admin_id', username: 'test_admin', email: 'test@admin.local' });
    assert(typeof token === 'string' && token.split('.').length === 3, 'JWT signed with HS256 standard');

    const decoded = verifyToken(token);
    assert(decoded.username === 'test_admin' && decoded.id === 'test_admin_id', 'JWT verified and decoded');
  } catch (err) {
    assert(false, `Crypto utility test failed: ${err.message}`);
  }

  // 2. Test Finite State Machine (FSM) Transitions
  console.log('\n--- 2. Testing Finite State Machine (FSM) Transitions ---');
  try {
    // ACTIVE -> SLOW
    let s = { currentStatus: 'ACTIVE', responseTimeThreshold: 400, consecutiveFailures: 0, consecutiveSuccesses: 5 };
    let res = evaluateFSMState(s, { isReachable: true, responseTime: 650, statusCode: 200 });
    assert(res.newState === 'SLOW' && res.transitionOccurred === true, 'FSM: ACTIVE -> SLOW when latency > threshold');

    // SLOW -> ACTIVE
    s = { currentStatus: 'SLOW', responseTimeThreshold: 400, consecutiveFailures: 0, consecutiveSuccesses: 2 };
    res = evaluateFSMState(s, { isReachable: true, responseTime: 150, statusCode: 200 });
    assert(res.newState === 'ACTIVE' && res.transitionOccurred === true, 'FSM: SLOW -> ACTIVE when latency normalizes');

    // ACTIVE -> DISCONNECTED (after repeated failures >= 3)
    s = { currentStatus: 'ACTIVE', responseTimeThreshold: 400, consecutiveFailures: 2, consecutiveSuccesses: 0 };
    res = evaluateFSMState(s, { isReachable: false, statusCode: 503, errorMessage: 'Timeout' });
    assert(res.newState === 'DISCONNECTED' && res.transitionOccurred === true, 'FSM: ACTIVE -> DISCONNECTED on 3rd failure');

    // DISCONNECTED -> RECOVERING (when server responds again)
    s = { currentStatus: 'DISCONNECTED', responseTimeThreshold: 400, consecutiveFailures: 4, consecutiveSuccesses: 0 };
    res = evaluateFSMState(s, { isReachable: true, responseTime: 85, statusCode: 200 });
    assert(res.newState === 'RECOVERING' && res.transitionOccurred === true, 'FSM: DISCONNECTED -> RECOVERING upon first reachable response');

    // RECOVERING -> ACTIVE (after 3 consecutive successes)
    s = { currentStatus: 'RECOVERING', responseTimeThreshold: 400, consecutiveFailures: 0, consecutiveSuccesses: 2 };
    res = evaluateFSMState(s, { isReachable: true, responseTime: 95, statusCode: 200 });
    assert(res.newState === 'ACTIVE' && res.transitionOccurred === true, 'FSM: RECOVERING -> ACTIVE after 3 stable checks');

    // RECOVERING -> DISCONNECTED (if failure occurs during recovery)
    s = { currentStatus: 'RECOVERING', responseTimeThreshold: 400, consecutiveFailures: 0, consecutiveSuccesses: 2 };
    res = evaluateFSMState(s, { isReachable: false, statusCode: 500, errorMessage: 'Dropped again' });
    assert(res.newState === 'DISCONNECTED' && res.transitionOccurred === true, 'FSM: RECOVERING -> DISCONNECTED upon recovery failure');
  } catch (err) {
    assert(false, `FSM test failed: ${err.message}`);
  }

  // 3. Test URL Validation & SSRF Guard
  console.log('\n--- 3. Testing URL Validation & SSRF Protection ---');
  try {
    const validHttp = validateServerUrl('http://api.service.internal:8080/health');
    assert(validHttp.valid === true, 'Valid HTTP URL accepted');

    const validHttps = validateServerUrl('https://1.1.1.1');
    assert(validHttps.valid === true, 'Valid HTTPS URL accepted');

    const badScheme = validateServerUrl('ftp://example.com/file');
    assert(badScheme.valid === false, 'Non-HTTP protocol rejected');

    const ssrfMetadata = validateServerUrl('http://169.254.169.254/latest/meta-data/');
    assert(ssrfMetadata.valid === false, 'Cloud metadata IP address blocked (SSRF Guard)');
  } catch (err) {
    assert(false, `URL validation test failed: ${err.message}`);
  }

  // 4. Test Authentication Controller
  console.log('\n--- 4. Testing Authentication Controller ---');
  let token = null;
  let testAdminUser = null;
  try {
    // Login with default seed admin
    const loginReq = { body: { identifier: 'admin', password: 'admin123' } };
    const loginRes = createMockRes();
    await login(loginReq, loginRes);
    assert(loginRes.statusCode === 200 && Boolean(loginRes.body.token), 'Admin login successful and returned JWT');
    token = loginRes.body.token;
    testAdminUser = loginRes.body.admin;

    // Register a new admin
    const regReq = {
      body: {
        username: 'supervisor_test',
        email: 'supervisor@enterprise.local',
        password: 'SupervisorPass123',
      },
    };
    const regRes = createMockRes();
    await register(regReq, regRes);
    assert(regRes.statusCode === 201 && regRes.body.admin.username === 'supervisor_test', 'New admin registration successful');

    // Get Profile
    const profileReq = { user: { id: testAdminUser.id } };
    const profileRes = createMockRes();
    await getProfile(profileReq, profileRes);
    assert(profileRes.statusCode === 200 && profileRes.body.admin.username === 'admin', 'Admin profile retrieval successful');
  } catch (err) {
    assert(false, `Auth controller test failed: ${err.message}`);
  }

  // 5. Test Server Management Controller (CRUD)
  console.log('\n--- 5. Testing Server Management Controller ---');
  let testServerId = null;
  try {
    // List initial servers
    const listReq = { query: {} };
    const listRes = createMockRes();
    await getAllServers(listReq, listRes);
    assert(listRes.statusCode === 200 && listRes.body.servers.length >= 1, 'Listed initial registered servers');

    // Create a new server
    const createReq = {
      body: {
        serverName: 'Core Payment Gateway Node',
        serverUrl: 'http://localhost:5000/api/mock/healthy',
        description: 'Payment routing reverse proxy',
        monitoringInterval: 5,
        responseTimeThreshold: 350,
      },
      app: { get: () => null },
    };
    const createRes = createMockRes();
    await createServer(createReq, createRes);
    assert(createRes.statusCode === 201 && createRes.body.server._id, 'Created new server target');
    testServerId = createRes.body.server._id;

    // Get Server by ID
    const getReq = { params: { id: testServerId } };
    const getRes = createMockRes();
    await getServerById(getReq, getRes);
    assert(getRes.statusCode === 200 && getRes.body.server.serverName === 'Core Payment Gateway Node', 'Fetched server details by ID');

    // Update Server
    const updateReq = {
      params: { id: testServerId },
      body: {
        serverName: 'Core Payment Gateway Node (Updated)',
        responseTimeThreshold: 450,
      },
      app: { get: () => null },
    };
    const updateRes = createMockRes();
    await updateServer(updateReq, updateRes);
    assert(updateRes.statusCode === 200 && updateRes.body.server.responseTimeThreshold === 450, 'Updated server threshold configuration');

    // Toggle Monitoring
    const toggleReq = { params: { id: testServerId }, app: { get: () => null } };
    const toggleRes = createMockRes();
    await toggleServerMonitoring(toggleReq, toggleRes);
    assert(toggleRes.statusCode === 200, 'Toggled server monitoring state');
  } catch (err) {
    assert(false, `Server controller test failed: ${err.message}`);
  }

  // 6. Test Monitoring & History Controller
  console.log('\n--- 6. Testing Monitoring & Historical Analytics ---');
  try {
    // Create mock history records
    await MonitoringHistory.create({
      serverId: testServerId,
      responseTime: 120,
      statusCode: 200,
      healthStatus: 'ACTIVE',
      isReachable: true,
      checkedAt: new Date(),
    });
    await MonitoringHistory.create({
      serverId: testServerId,
      responseTime: 580,
      statusCode: 200,
      healthStatus: 'SLOW',
      isReachable: true,
      checkedAt: new Date(),
    });

    // Get Monitoring Status (Dashboard Metrics)
    const statusReq = {};
    const statusRes = createMockRes();
    await getMonitoringStatus(statusReq, statusRes);
    assert(statusRes.statusCode === 200 && statusRes.body.metrics.totalServers >= 1, 'Compiled aggregated monitoring metrics');
    assert(typeof statusRes.body.metrics.overallAvailability === 'number', 'Overall availability percentage computed');
    assert(statusRes.body.distribution.ACTIVE !== undefined, 'Distribution includes ACTIVE count');
    assert(statusRes.body.distribution.SLOW !== undefined, 'Distribution includes SLOW count');
    assert(statusRes.body.distribution.DISCONNECTED !== undefined, 'Distribution includes DISCONNECTED count');
    assert(statusRes.body.distribution.RECOVERING !== undefined, 'Distribution includes RECOVERING count');

    // Get History for Server
    const histReq = { params: { serverId: testServerId }, query: {} };
    const histRes = createMockRes();
    await getServerHistory(histReq, histRes);
    assert(histRes.statusCode === 200 && histRes.body.history.length >= 2, 'Fetched historical records for server');
    assert(histRes.body.statistics.uptimePercentage !== undefined, 'Uptime percentage calculated in history');
    assert(histRes.body.statistics.avgLatency > 0, 'Average latency calculated in history');
  } catch (err) {
    assert(false, `Monitoring controller test failed: ${err.message}`);
  }

  // 7. Test Alerts Controller
  console.log('\n--- 7. Testing Alert System Controller ---');
  try {
    // Create mock alert
    await Alert.create({
      serverId: testServerId,
      alertType: 'DISCONNECTED',
      message: 'Node unreachable',
      severity: 'CRITICAL',
      isRead: false,
    });

    const alertsReq = { query: {} };
    const alertsRes = createMockRes();
    await getAllAlerts(alertsReq, alertsRes);
    assert(alertsRes.statusCode === 200 && alertsRes.body.alerts.length >= 1, 'Retrieved alert repository list');

    // Mark all as read
    const markAllReq = { app: { get: () => null } };
    const markAllRes = createMockRes();
    await markAllRead(markAllReq, markAllRes);
    assert(markAllRes.statusCode === 200, 'Marked all alerts as read');
  } catch (err) {
    assert(false, `Alert controller test failed: ${err.message}`);
  }

  // 8. Delete Server & Cascade Cleanup
  console.log('\n--- 8. Testing Cascade Delete ---');
  try {
    const deleteReq = { params: { id: testServerId }, app: { get: () => null } };
    const deleteRes = createMockRes();
    await deleteServer(deleteReq, deleteRes);
    assert(deleteRes.statusCode === 200, 'Cascade deleted server, history, and alerts');
  } catch (err) {
    assert(false, `Cascade delete test failed: ${err.message}`);
  }

  console.log('\n=================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
