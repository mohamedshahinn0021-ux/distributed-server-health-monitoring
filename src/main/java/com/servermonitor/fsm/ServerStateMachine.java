package com.servermonitor.fsm;

import com.servermonitor.entity.Server;
import com.servermonitor.entity.ServerState;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Finite State Machine (FSM) Engine for Server Health Monitoring.
 * 
 * Formal Definition:
 * States (S) = { ACTIVE, SLOW, DISCONNECTED, RECOVERING }
 * Inputs (I) = { Probe(Reachable: Boolean, LatencyMs: Long, ThresholdMs: Long) }
 * 
 * State Transition Matrix:
 * - ACTIVE       + (Unreachable)                     -> DISCONNECTED (Action: Emit Failure Alert)
 * - ACTIVE       + (Reachable & Latency > Threshold)  -> SLOW         (Action: Emit Degraded Alert)
 * - ACTIVE       + (Reachable & Latency <= Threshold) -> ACTIVE       (Action: No Alert)
 * 
 * - SLOW         + (Unreachable)                     -> DISCONNECTED (Action: Emit Failure Alert)
 * - SLOW         + (Reachable & Latency <= Threshold) -> ACTIVE       (Action: Emit Restored Alert)
 * - SLOW         + (Reachable & Latency > Threshold)  -> SLOW         (Action: No Alert)
 * 
 * - DISCONNECTED + (Unreachable)                     -> DISCONNECTED (Action: No Alert)
 * - DISCONNECTED + (Reachable)                       -> RECOVERING   (Action: Emit Recovery Alert, Count = 1)
 * 
 * - RECOVERING   + (Unreachable)                     -> DISCONNECTED (Action: Emit Failure Alert, Reset Count)
 * - RECOVERING   + (Reachable & Count < Required)    -> RECOVERING   (Action: Increment Stability Count)
 * - RECOVERING   + (Reachable & Count >= Req & Latency <= Thresh) -> ACTIVE (Action: Emit Stabilized Alert)
 * - RECOVERING   + (Reachable & Count >= Req & Latency > Thresh)  -> SLOW   (Action: Emit Degraded Alert)
 */
@Component
public class ServerStateMachine {

    @Value("${server.monitor.recovery-stability-count:3}")
    private int recoveryStabilityCount = 3;

    public StateTransitionResult evaluate(Server server, boolean isReachable, long responseTimeMs, String errorMessage) {
        ServerState current = server.getCurrentState();
        int successes = server.getConsecutiveSuccesses() != null ? server.getConsecutiveSuccesses() : 0;
        long threshold = (server.getSlowThresholdMs() != null && server.getSlowThresholdMs() > 0) 
                         ? server.getSlowThresholdMs() 
                         : 500L;
        String name = server.getServerName();

        // 1. UNREACHABLE CONDITION
        if (!isReachable) {
            if (current == ServerState.DISCONNECTED) {
                return StateTransitionResult.noChange(ServerState.DISCONNECTED, 0, 
                        "Server " + name + " remains DISCONNECTED. " + (errorMessage != null ? errorMessage : ""));
            } else if (current == ServerState.RECOVERING) {
                String desc = "CRITICAL: Server '" + name + "' failed recovery stability check and transitioned back to DISCONNECTED. " 
                            + (errorMessage != null ? errorMessage : "");
                return new StateTransitionResult(current, ServerState.DISCONNECTED, true, true, "FAILURE", desc, 0);
            } else {
                // Was ACTIVE or SLOW
                String desc = "CRITICAL: Server '" + name + "' is DISCONNECTED. Connectivity failure detected on " 
                            + server.getIpAddress() + ":" + server.getPort() + ". " 
                            + (errorMessage != null ? errorMessage : "");
                return new StateTransitionResult(current, ServerState.DISCONNECTED, true, true, "FAILURE", desc, 0);
            }
        }

        // 2. REACHABLE CONDITION
        boolean isSlowLatency = responseTimeMs > threshold;

        switch (current) {
            case ACTIVE:
                if (isSlowLatency) {
                    String desc = "WARNING: Server '" + name + "' latency degraded to " + responseTimeMs 
                                + "ms, exceeding configured threshold (" + threshold + "ms). Transitioned to SLOW state.";
                    return new StateTransitionResult(current, ServerState.SLOW, true, true, "DEGRADED", desc, successes + 1);
                }
                return StateTransitionResult.noChange(ServerState.ACTIVE, successes + 1, 
                        "Server " + name + " is ACTIVE (" + responseTimeMs + "ms).");

            case SLOW:
                if (!isSlowLatency) {
                    String desc = "NOTICE: Server '" + name + "' latency has recovered to normal (" + responseTimeMs 
                                + "ms <= " + threshold + "ms). Transitioned to ACTIVE state.";
                    return new StateTransitionResult(current, ServerState.ACTIVE, true, true, "RESTORED", desc, 1);
                }
                return StateTransitionResult.noChange(ServerState.SLOW, successes + 1, 
                        "Server " + name + " remains SLOW (" + responseTimeMs + "ms > " + threshold + "ms).");

            case DISCONNECTED:
                // First successful probe after disconnection -> enters RECOVERING
                int initialRecoveryCount = 1;
                String desc = "RECOVERY: Server '" + name + "' became reachable again (" + responseTimeMs 
                            + "ms). Transitioned to RECOVERING state (Stability: " 
                            + initialRecoveryCount + "/" + recoveryStabilityCount + ").";
                return new StateTransitionResult(current, ServerState.RECOVERING, true, true, "RECOVERY", desc, initialRecoveryCount);

            case RECOVERING:
                int updatedSuccesses = successes + 1;
                if (updatedSuccesses >= recoveryStabilityCount) {
                    // Stability verified!
                    if (!isSlowLatency) {
                        String stableDesc = "STABILIZED: Server '" + name + "' successfully passed " + updatedSuccesses 
                                          + " consecutive health checks. Operational stability verified; transitioned to ACTIVE.";
                        return new StateTransitionResult(current, ServerState.ACTIVE, true, true, "STABILIZED", stableDesc, updatedSuccesses);
                    } else {
                        String degradedDesc = "WARNING: Server '" + name + "' stabilized after downtime, but response time is SLOW (" 
                                            + responseTimeMs + "ms > " + threshold + "ms). Transitioned to SLOW.";
                        return new StateTransitionResult(current, ServerState.SLOW, true, true, "DEGRADED", degradedDesc, updatedSuccesses);
                    }
                } else {
                    // Still in recovery phase
                    return StateTransitionResult.noChange(ServerState.RECOVERING, updatedSuccesses, 
                            "Server " + name + " is RECOVERING (Stability check " + updatedSuccesses + "/" + recoveryStabilityCount + " successful).");
                }

            default:
                return StateTransitionResult.noChange(current, successes, "No state change");
        }
    }

    public int getRecoveryStabilityCount() {
        return recoveryStabilityCount;
    }

    public void setRecoveryStabilityCount(int recoveryStabilityCount) {
        this.recoveryStabilityCount = recoveryStabilityCount;
    }
}
