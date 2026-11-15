import Server from '../models/Server.js';
import MonitoringHistory from '../models/MonitoringHistory.js';
import { performHttpHealthCheck } from '../utils/responseTime.js';
import { evaluateFSMState } from './fsmService.js';
import { processFailureDetection } from './failureDetectionService.js';

let schedulerTimer = null;
const inFlightChecks = new Set();

/**
 * Executes a health check for a single server, evaluates FSM, creates history, updates DB, and broadcasts updates
 * 
 * @param {string|Object} serverOrId - Server document or server ID
 * @param {Object} [io] - Socket.IO instance
 * @returns {Promise<Object>} Completed monitoring check details
 */
export async function executeServerHealthCheck(serverOrId, io = null) {
  let server = typeof serverOrId === 'string' ? await Server.findById(serverOrId) : serverOrId;
  if (!server) {
    throw new Error('Server not found');
  }

  const serverIdStr = server._id.toString();
  if (inFlightChecks.has(serverIdStr)) {
    // Avoid overlapping probe for the same server
    return { skipped: true, reason: 'Check already in progress' };
  }

  inFlightChecks.add(serverIdStr);

  try {
    // 1. Perform HTTP health check & response time measurement
    const checkResult = await performHttpHealthCheck(server.serverUrl, 5000);

    // 2. Evaluate Finite State Machine (FSM)
    const fsmResult = evaluateFSMState(server, checkResult);

    // 3. Process Failure Detection and Alerts
    const generatedAlert = await processFailureDetection(server, fsmResult, checkResult, io);

    // 4. Update Server Document with new health state
    const updatedServer = await Server.findByIdAndUpdate(server._id, {
      currentStatus: fsmResult.newState,
      consecutiveFailures: fsmResult.consecutiveFailures,
      consecutiveSuccesses: fsmResult.consecutiveSuccesses,
      lastResponseTime: checkResult.responseTime,
      lastStatusCode: checkResult.statusCode,
      lastCheckedAt: checkResult.checkedAt,
    });

    // 5. Save Record to MonitoringHistory
    const historyRecord = await MonitoringHistory.create({
      serverId: server._id,
      responseTime: checkResult.responseTime,
      statusCode: checkResult.statusCode,
      healthStatus: fsmResult.newState,
      isReachable: checkResult.isReachable,
      checkedAt: checkResult.checkedAt,
      errorMessage: checkResult.errorMessage,
    });

    const payload = {
      server: updatedServer,
      checkResult,
      fsmResult,
      historyRecord,
      alert: generatedAlert,
    };

    // 6. Broadcast Real-Time Update over Socket.IO
    if (io) {
      io.emit('server_health_update', payload);
      if (fsmResult.transitionOccurred) {
        io.emit('server_status_transition', {
          serverId: server._id,
          serverName: server.serverName,
          previousState: fsmResult.previousState,
          newState: fsmResult.newState,
          reason: fsmResult.reason,
          timestamp: checkResult.checkedAt,
        });
      }
    }

    return payload;
  } catch (error) {
    console.error(`[MonitoringService] Error checking server ${server.serverName || server._id}:`, error.message);
    throw error;
  } finally {
    inFlightChecks.delete(serverIdStr);
  }
}

/**
 * Starts the continuous monitoring scheduler
 * Uses high-resolution tick (every 2 seconds) checking each server's individual monitoringInterval
 * 
 * @param {Object} io - Socket.IO instance
 */
export function startMonitoringScheduler(io) {
  if (schedulerTimer) {
    console.log('[MonitoringService] Scheduler already active.');
    return;
  }

  console.log('[MonitoringService] 🚀 Starting automated server monitoring scheduler (tick interval: 2000ms)...');

  schedulerTimer = setInterval(async () => {
    try {
      // Query all servers enabled for monitoring
      const servers = await Server.find({ isMonitoring: true });
      const now = Date.now();

      for (const server of servers) {
        const intervalMs = (server.monitoringInterval || 10) * 1000;
        const lastChecked = server.lastCheckedAt ? new Date(server.lastCheckedAt).getTime() : 0;

        // Check if server interval has elapsed or if it was never checked
        if (now - lastChecked >= intervalMs) {
          executeServerHealthCheck(server, io).catch((err) => {
            console.error(`[MonitoringService] Failed probe on ${server.serverName}:`, err.message);
          });
        }
      }
    } catch (err) {
      console.error('[MonitoringService] Scheduler error:', err.message);
    }
  }, 2000);
}

/**
 * Stops the monitoring scheduler
 */
export function stopMonitoringScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[MonitoringService] 🛑 Automated monitoring scheduler stopped.');
  }
}

export default {
  executeServerHealthCheck,
  startMonitoringScheduler,
  stopMonitoringScheduler,
};
