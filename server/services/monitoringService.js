import axios from 'axios';
import Server from '../models/Server.js';
import MonitoringHistory from '../models/MonitoringHistory.js';
import StateTransition from '../models/StateTransition.js';
import { evaluateFSM } from './fsmService.js';
import { handleStateAlert } from './alertService.js';
import { validateHealthCheckUrl } from '../utils/validator.js';

// In-memory store for per-server interval timers
const activeTimers = new Map();

/**
 * Performs a health check for a single server instance.
 * Measures response time, captures status code, updates FSM state,
 * logs history, generates alerts, and broadcasts real-time Socket.IO events.
 */
export async function performHealthCheck(server, io) {
  if (!server || !server._id || !server.enabled) {
    return null;
  }

  // Validate URL and enforce SSRF protections
  const validation = validateHealthCheckUrl(server.url);
  if (!validation.valid) {
    console.warn(`[MonitoringService] SSRF / URL validation failed for ${server.name}: ${validation.error}`);
    // Treat invalid/unauthorized URL as a failure
    return await processCheckResult(
      server,
      {
        isConnected: false,
        responseTime: 0,
        statusCode: null,
        errorMessage: validation.error,
      },
      io
    );
  }

  const startTime = Date.now();
  let checkResult = {
    isConnected: false,
    responseTime: 0,
    statusCode: null,
    errorMessage: '',
  };

  // Timeout limit is double the threshold (min 3000ms, max 10000ms)
  const timeoutMs = Math.min(Math.max((server.responseThreshold || 500) * 2, 3000), 10000);

  try {
    const response = await axios.get(server.url, {
      timeout: timeoutMs,
      maxRedirects: 0, // Prevent SSRF redirect bypasses
      headers: {
        'User-Agent': 'DistributedServerMonitor/1.0 (HealthCheck-Engine)',
        Accept: '*/*',
      },
      validateStatus: () => true, // Accept any status code so we can inspect it
    });

    const elapsed = Date.now() - startTime;
    const statusCode = response.status;

    // HTTP 2xx and 3xx are considered connected
    const isSuccess = statusCode >= 200 && statusCode < 400;

    checkResult = {
      isConnected: isSuccess,
      responseTime: elapsed,
      statusCode,
      errorMessage: isSuccess ? '' : `HTTP ${statusCode} ${response.statusText || 'Error'}`,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    let message = error.message || 'Connection failed';

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      message = `Request timed out after ${timeoutMs}ms`;
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      message = 'DNS Resolution failed (Host not found)';
    } else if (error.code === 'ECONNREFUSED') {
      message = 'Connection refused by destination host';
    }

    checkResult = {
      isConnected: false,
      responseTime: elapsed,
      statusCode: error.response?.status || null,
      errorMessage: message,
    };
  }

  return await processCheckResult(server, checkResult, io);
}

/**
 * Passes health check results through FSM, persists records, and broadcasts updates.
 */
async function processCheckResult(server, checkResult, io) {
  // 1. Evaluate Finite-State Machine
  const fsmResult = evaluateFSM(server, checkResult);

  // 2. Persist StateTransition if state changed
  let transitionRecord = null;
  if (fsmResult.transitioned) {
    try {
      transitionRecord = await StateTransition.create({
        serverId: server._id,
        serverName: server.name,
        previousState: fsmResult.previousState,
        newState: fsmResult.newState,
        reason: fsmResult.reason,
        responseTime: checkResult.responseTime,
        statusCode: checkResult.statusCode,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error(`[MonitoringService] Failed to record transition for ${server.name}:`, err.message);
    }
  }

  // 3. Update Server in Database
  try {
    await Server.findByIdAndUpdate(server._id, {
      currentState: fsmResult.newState,
      consecutiveFailures: fsmResult.consecutiveFailures,
      consecutiveSuccesses: fsmResult.consecutiveSuccesses,
      lastCheckedAt: new Date(),
      lastResponseTime: checkResult.responseTime,
      lastStatusCode: checkResult.statusCode,
      lastErrorMessage: checkResult.errorMessage,
    });
  } catch (err) {
    console.error(`[MonitoringService] Failed to update server status for ${server.name}:`, err.message);
  }

  // 4. Record Monitoring History entry in MongoDB
  let historyEntry = null;
  try {
    historyEntry = await MonitoringHistory.create({
      serverId: server._id,
      responseTime: checkResult.responseTime,
      statusCode: checkResult.statusCode,
      isConnected: checkResult.isConnected,
      state: fsmResult.newState,
      errorMessage: checkResult.errorMessage,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error(`[MonitoringService] Failed to record history for ${server.name}:`, err.message);
  }

  // 5. Generate Alert if appropriate
  let alert = null;
  if (fsmResult.transitioned) {
    alert = await handleStateAlert(server, fsmResult, io);
  }

  // 6. Real-time Broadcast via Socket.IO
  if (io) {
    const payload = {
      serverId: server._id,
      serverName: server.name,
      currentState: fsmResult.newState,
      previousState: fsmResult.previousState,
      transitioned: fsmResult.transitioned,
      responseTime: checkResult.responseTime,
      statusCode: checkResult.statusCode,
      isConnected: checkResult.isConnected,
      errorMessage: checkResult.errorMessage,
      reason: fsmResult.reason,
      timestamp: new Date(),
    };

    io.emit('monitoring_result', payload);

    if (fsmResult.transitioned) {
      io.emit('server_status_changed', {
        ...payload,
        transition: transitionRecord,
      });
    }
  }

  return {
    server: {
      ...server.toObject?.() || server,
      currentState: fsmResult.newState,
      lastResponseTime: checkResult.responseTime,
      lastStatusCode: checkResult.statusCode,
      lastCheckedAt: new Date(),
    },
    checkResult,
    fsmResult,
    alert,
  };
}

/**
 * Registers a recurring monitoring interval for a specific server
 */
export function registerServer(server, io) {
  if (!server || !server._id) return;
  const serverIdStr = server._id.toString();

  // Clear existing timer if any
  unregisterServer(serverIdStr);

  if (!server.enabled) return;

  const intervalSec = Math.max(server.monitoringInterval || 10, 2);
  const intervalMs = intervalSec * 1000;

  // Execute first check after a brief stagger (100ms - 1500ms) to avoid request storms
  const initialDelay = Math.floor(Math.random() * 1000) + 200;
  setTimeout(async () => {
    try {
      const freshServer = await Server.findById(server._id);
      if (freshServer && freshServer.enabled) {
        await performHealthCheck(freshServer, io);
      }
    } catch (err) {
      console.error(`[MonitoringService] Initial check error for ${server.name}:`, err.message);
    }
  }, initialDelay);

  // Set recurring interval
  const timer = setInterval(async () => {
    try {
      const freshServer = await Server.findById(server._id);
      if (freshServer && freshServer.enabled) {
        await performHealthCheck(freshServer, io);
      } else if (!freshServer || !freshServer.enabled) {
        unregisterServer(serverIdStr);
      }
    } catch (err) {
      console.error(`[MonitoringService] Recurring check error for server ${serverIdStr}:`, err.message);
    }
  }, intervalMs);

  activeTimers.set(serverIdStr, timer);
}

/**
 * Unregisters and stops monitoring for a specific server
 */
export function unregisterServer(serverId) {
  const idStr = serverId?.toString();
  if (activeTimers.has(idStr)) {
    clearInterval(activeTimers.get(idStr));
    activeTimers.delete(idStr);
  }
}

/**
 * Starts the monitoring scheduler for all active servers
 */
export async function startMonitoringScheduler(io) {
  try {
    const servers = await Server.find({ enabled: true });
    console.log(`[MonitoringService] Initializing monitoring scheduler for ${servers.length} server(s)...`);
    for (const server of servers) {
      registerServer(server, io);
    }
  } catch (err) {
    console.error('[MonitoringService] Failed to initialize monitoring scheduler:', err.message);
  }
}

/**
 * Stops all monitoring timers
 */
export function stopMonitoringScheduler() {
  for (const [id, timer] of activeTimers.entries()) {
    clearInterval(timer);
  }
  activeTimers.clear();
  console.log('[MonitoringService] All monitoring timers stopped.');
}
