import { SERVER_STATES } from './fsmService.js';
import { createAlert } from './alertService.js';

/**
 * Failure Detection and Alerting Engine
 * Evaluates FSM transition results and determines whether alerts are required
 * 
 * @param {Object} server - Server entity
 * @param {Object} fsmResult - Result from evaluateFSMState
 * @param {Object} checkResult - Latest health check outcome
 * @param {Object} [io] - Socket.IO instance
 */
export async function processFailureDetection(server, fsmResult, checkResult, io = null) {
  const { previousState, newState, transitionOccurred, reason } = fsmResult;

  if (!transitionOccurred) {
    return null;
  }

  const serverName = server.serverName || 'Server';
  let alertType = 'INFO';
  let severity = 'INFO';
  let message = '';

  switch (newState) {
    case SERVER_STATES.DISCONNECTED:
      alertType = 'DISCONNECTED';
      severity = 'CRITICAL';
      message = `🚨 [CRITICAL DOWNTIME] ${serverName} is DISCONNECTED! ${reason}`;
      break;

    case SERVER_STATES.SLOW:
      alertType = 'SLOW_PERFORMANCE';
      severity = 'WARNING';
      message = `⚠️  [PERFORMANCE WARNING] ${serverName} is degraded (SLOW). Response time: ${checkResult.responseTime}ms. ${reason}`;
      break;

    case SERVER_STATES.RECOVERING:
      alertType = 'RECOVERING';
      severity = 'INFO';
      message = `🔄 [RECOVERY IN PROGRESS] ${serverName} started responding again. Validating stability (${fsmResult.consecutiveSuccesses}/3).`;
      break;

    case SERVER_STATES.ACTIVE:
      if (previousState === SERVER_STATES.RECOVERING) {
        alertType = 'RECOVERY_COMPLETED';
        severity = 'SUCCESS';
        message = `✅ [SYSTEM RESTORED] ${serverName} has successfully stabilized and returned to ACTIVE state.`;
      } else if (previousState === SERVER_STATES.SLOW) {
        alertType = 'RECOVERY_COMPLETED';
        severity = 'SUCCESS';
        message = `✅ [LATENCY NORMALIZED] ${serverName} response time returned within acceptable threshold (${checkResult.responseTime}ms).`;
      }
      break;

    default:
      return null;
  }

  if (message) {
    return await createAlert(
      {
        serverId: server._id,
        alertType,
        message,
        severity,
      },
      io
    );
  }

  return null;
}

export default {
  processFailureDetection,
};
