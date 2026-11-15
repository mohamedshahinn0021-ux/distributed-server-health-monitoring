/**
 * Finite State Machine (FSM) Service for Server Health Monitoring
 * 
 * Formal States:
 *  - ACTIVE: Server is healthy and responding within threshold (< responseTimeThreshold)
 *  - SLOW: Server is responding, but responseTime exceeds responseTimeThreshold
 *  - DISCONNECTED: Server is unreachable or health checks repeatedly fail (>= FAILURE_THRESHOLD)
 *  - RECOVERING: Previously disconnected server has started responding again and requires
 *                consecutive stable checks (>= RECOVERY_THRESHOLD) to reach ACTIVE
 */

export const SERVER_STATES = {
  ACTIVE: 'ACTIVE',
  SLOW: 'SLOW',
  DISCONNECTED: 'DISCONNECTED',
  RECOVERING: 'RECOVERING',
};

// Thresholds for transitions
export const FSM_CONFIG = {
  FAILURE_THRESHOLD: 3,   // Repeated failures before declaring DISCONNECTED
  RECOVERY_THRESHOLD: 3,  // Consecutive successes required before declaring ACTIVE from RECOVERING
};

/**
 * Evaluates the next server state based on health-check results and current state.
 * 
 * @param {Object} currentServer - Existing server record
 * @param {Object} checkResult - Latest health check outcome
 * @param {boolean} checkResult.isReachable - True if HTTP status is 2xx/3xx
 * @param {number} checkResult.responseTime - Measured latency in milliseconds
 * @param {number} checkResult.statusCode - HTTP response status code
 * @param {string|null} checkResult.errorMessage - Error description if failed
 * @returns {Object} Updated FSM evaluation result
 */
export function evaluateFSMState(currentServer, checkResult) {
  const currentState = currentServer.currentStatus || SERVER_STATES.ACTIVE;
  const threshold = currentServer.responseTimeThreshold || 500;
  let failures = currentServer.consecutiveFailures || 0;
  let successes = currentServer.consecutiveSuccesses || 0;

  let nextState = currentState;
  let reason = '';
  let transitionOccurred = false;

  const isReachable = Boolean(checkResult.isReachable);
  const responseTime = Number(checkResult.responseTime) || 0;
  const isSlow = responseTime > threshold;

  if (isReachable) {
    // Health check succeeded
    failures = 0;
    successes += 1;

    switch (currentState) {
      case SERVER_STATES.ACTIVE:
        if (isSlow) {
          nextState = SERVER_STATES.SLOW;
          reason = `Response time (${responseTime}ms) exceeded threshold of ${threshold}ms.`;
        } else {
          nextState = SERVER_STATES.ACTIVE;
          reason = `Healthy response received (${responseTime}ms).`;
        }
        break;

      case SERVER_STATES.SLOW:
        if (!isSlow) {
          nextState = SERVER_STATES.ACTIVE;
          reason = `Response time returned to normal (${responseTime}ms <= ${threshold}ms).`;
        } else {
          nextState = SERVER_STATES.SLOW;
          reason = `Response time remains elevated (${responseTime}ms > ${threshold}ms).`;
        }
        break;

      case SERVER_STATES.DISCONNECTED:
        // First successful probe while disconnected triggers RECOVERING
        nextState = SERVER_STATES.RECOVERING;
        successes = 1;
        reason = `Server became reachable after downtime. Initiating recovery monitoring (${successes}/${FSM_CONFIG.RECOVERY_THRESHOLD} checks).`;
        break;

      case SERVER_STATES.RECOVERING:
        if (successes >= FSM_CONFIG.RECOVERY_THRESHOLD) {
          if (isSlow) {
            nextState = SERVER_STATES.SLOW;
            reason = `Recovery achieved with ${successes} consecutive checks, but latency (${responseTime}ms) is above threshold (${threshold}ms).`;
          } else {
            nextState = SERVER_STATES.ACTIVE;
            reason = `Recovery confirmed after ${successes} consecutive successful checks (${responseTime}ms).`;
          }
        } else {
          nextState = SERVER_STATES.RECOVERING;
          reason = `Server responding during recovery validation (${successes}/${FSM_CONFIG.RECOVERY_THRESHOLD} checks).`;
        }
        break;

      default:
        nextState = isSlow ? SERVER_STATES.SLOW : SERVER_STATES.ACTIVE;
        reason = `State initialized to ${nextState}.`;
    }
  } else {
    // Health check failed
    successes = 0;
    failures += 1;

    switch (currentState) {
      case SERVER_STATES.ACTIVE:
      case SERVER_STATES.SLOW:
        if (failures >= FSM_CONFIG.FAILURE_THRESHOLD) {
          nextState = SERVER_STATES.DISCONNECTED;
          reason = `Repeated health check failures (${failures}/${FSM_CONFIG.FAILURE_THRESHOLD}). ${checkResult.errorMessage || 'Server unreachable'}`;
        } else {
          nextState = currentState;
          reason = `Health check failed (${failures}/${FSM_CONFIG.FAILURE_THRESHOLD} before disconnect). ${checkResult.errorMessage || ''}`;
        }
        break;

      case SERVER_STATES.RECOVERING:
        // If it fails during recovery, immediately drop back to DISCONNECTED
        nextState = SERVER_STATES.DISCONNECTED;
        reason = `Health check failed during recovery phase. ${checkResult.errorMessage || 'Server disconnected again'}`;
        break;

      case SERVER_STATES.DISCONNECTED:
        nextState = SERVER_STATES.DISCONNECTED;
        reason = `Server continues to be unreachable (${failures} failures). ${checkResult.errorMessage || ''}`;
        break;

      default:
        nextState = SERVER_STATES.DISCONNECTED;
        reason = `Server is unreachable: ${checkResult.errorMessage || 'Connection failure'}`;
    }
  }

  transitionOccurred = nextState !== currentState;

  return {
    previousState: currentState,
    newState: nextState,
    transitionOccurred,
    reason: reason.trim(),
    consecutiveFailures: failures,
    consecutiveSuccesses: successes,
  };
}

export default {
  SERVER_STATES,
  FSM_CONFIG,
  evaluateFSMState,
};
