/**
 * Finite-State Machine (FSM) Service for Server Health Monitoring
 * 
 * States:
 * - ACTIVE: Normal operation, response time <= threshold, status 2xx/3xx
 * - SLOW: Responding, but response time > threshold
 * - DISCONNECTED: Connectivity failed, timed out, or HTTP 5xx
 * - RECOVERING: Intermediate state after DISCONNECTED on first successful response,
 *               requiring consecutive successful checks to graduate back to ACTIVE.
 */

export const FSM_STATES = {
  ACTIVE: 'ACTIVE',
  SLOW: 'SLOW',
  DISCONNECTED: 'DISCONNECTED',
  RECOVERING: 'RECOVERING',
};

export const FSM_TRANSITIONS = [
  { from: 'ACTIVE', to: 'SLOW', trigger: 'Response time > threshold', condition: 'Single slow check' },
  { from: 'SLOW', to: 'ACTIVE', trigger: 'Response time <= threshold', condition: 'Single normal check' },
  { from: 'ACTIVE', to: 'DISCONNECTED', trigger: 'Check failed', condition: '>= failureThreshold consecutive failures' },
  { from: 'SLOW', to: 'DISCONNECTED', trigger: 'Check failed', condition: '>= failureThreshold consecutive failures' },
  { from: 'DISCONNECTED', to: 'RECOVERING', trigger: 'Check succeeded', condition: 'First successful response' },
  { from: 'RECOVERING', to: 'ACTIVE', trigger: 'Consecutive successful checks', condition: '>= recoveryThreshold successes' },
  { from: 'RECOVERING', to: 'DISCONNECTED', trigger: 'Check failed during recovery', condition: 'Any failure during recovery' },
];

/**
 * Evaluates the next FSM state based on the current state, monitoring result, and server thresholds.
 * 
 * @param {Object} server Current server object
 * @param {Object} checkResult { isConnected, responseTime, statusCode, errorMessage }
 * @returns {Object} { newState, previousState, transitioned, reason, consecutiveFailures, consecutiveSuccesses }
 */
export function evaluateFSM(server, checkResult) {
  const currentState = server.currentState || FSM_STATES.ACTIVE;
  const failureThreshold = server.failureThreshold || 2;
  const recoveryThreshold = server.recoveryThreshold || 2;
  const responseThreshold = server.responseThreshold || 500;

  const { isConnected, responseTime, statusCode, errorMessage } = checkResult;

  let newState = currentState;
  let reason = '';
  let consecutiveFailures = server.consecutiveFailures || 0;
  let consecutiveSuccesses = server.consecutiveSuccesses || 0;

  if (isConnected) {
    // Successful check
    consecutiveFailures = 0;
    consecutiveSuccesses += 1;
    const isSlow = responseTime > responseThreshold;

    switch (currentState) {
      case FSM_STATES.ACTIVE:
        if (isSlow) {
          newState = FSM_STATES.SLOW;
          reason = `High latency detected: ${responseTime}ms exceeded threshold of ${responseThreshold}ms.`;
        } else {
          newState = FSM_STATES.ACTIVE;
          reason = `Normal operation: ${responseTime}ms (HTTP ${statusCode}).`;
        }
        break;

      case FSM_STATES.SLOW:
        if (!isSlow) {
          newState = FSM_STATES.ACTIVE;
          reason = `Latency normalized: ${responseTime}ms is below threshold of ${responseThreshold}ms.`;
        } else {
          newState = FSM_STATES.SLOW;
          reason = `Remains slow: ${responseTime}ms exceeds threshold of ${responseThreshold}ms.`;
        }
        break;

      case FSM_STATES.DISCONNECTED:
        // First successful check starts recovery
        newState = FSM_STATES.RECOVERING;
        consecutiveSuccesses = 1; // start recovery counter
        reason = `First successful response received (${responseTime}ms, HTTP ${statusCode}). Server entering RECOVERING state.`;
        break;

      case FSM_STATES.RECOVERING:
        if (consecutiveSuccesses >= recoveryThreshold) {
          newState = FSM_STATES.ACTIVE;
          reason = `Recovery verified with ${consecutiveSuccesses} consecutive successful checks. Server fully restored to ACTIVE.`;
        } else {
          newState = FSM_STATES.RECOVERING;
          reason = `Recovery in progress: check ${consecutiveSuccesses}/${recoveryThreshold} successful (${responseTime}ms).`;
        }
        break;

      default:
        newState = isSlow ? FSM_STATES.SLOW : FSM_STATES.ACTIVE;
        reason = `State reset to ${newState}.`;
        break;
    }
  } else {
    // Failed check
    consecutiveFailures += 1;
    consecutiveSuccesses = 0;

    switch (currentState) {
      case FSM_STATES.ACTIVE:
      case FSM_STATES.SLOW:
        if (consecutiveFailures >= failureThreshold) {
          newState = FSM_STATES.DISCONNECTED;
          reason = `Server disconnected after ${consecutiveFailures} consecutive failed checks: ${errorMessage || 'No response'}.`;
        } else {
          // Warning before state change to prevent flapping
          reason = `Health check warning: failure ${consecutiveFailures}/${failureThreshold} (${errorMessage || 'Network error'}).`;
        }
        break;

      case FSM_STATES.RECOVERING:
        // Any failure while recovering drops back to DISCONNECTED
        newState = FSM_STATES.DISCONNECTED;
        reason = `Recovery failed: check failed during verification stage (${errorMessage || 'Connection lost'}).`;
        break;

      case FSM_STATES.DISCONNECTED:
        newState = FSM_STATES.DISCONNECTED;
        reason = `Server remains disconnected (${consecutiveFailures} total failed checks): ${errorMessage || 'No response'}.`;
        break;

      default:
        newState = FSM_STATES.DISCONNECTED;
        reason = `Transitioned to DISCONNECTED: ${errorMessage || 'Connection failure'}.`;
        break;
    }
  }

  const transitioned = newState !== currentState;

  return {
    previousState: currentState,
    newState,
    transitioned,
    reason,
    consecutiveFailures,
    consecutiveSuccesses,
  };
}
