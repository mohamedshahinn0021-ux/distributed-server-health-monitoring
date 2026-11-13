package com.servermonitor.fsm;

import com.servermonitor.entity.ServerState;

/**
 * Encapsulates the output of a Finite State Machine transition evaluation.
 */
public class StateTransitionResult {

    private final ServerState previousState;
    private final ServerState newState;
    private final boolean stateChanged;
    private final boolean alertNeeded;
    private final String alertType; // FAILURE, RECOVERY, DEGRADED, RESTORED, STABILIZED
    private final String description;
    private final int consecutiveSuccesses;

    public StateTransitionResult(ServerState previousState, ServerState newState, 
                                 boolean stateChanged, boolean alertNeeded, 
                                 String alertType, String description, 
                                 int consecutiveSuccesses) {
        this.previousState = previousState;
        this.newState = newState;
        this.stateChanged = stateChanged;
        this.alertNeeded = alertNeeded;
        this.alertType = alertType;
        this.description = description;
        this.consecutiveSuccesses = consecutiveSuccesses;
    }

    public static StateTransitionResult noChange(ServerState state, int consecutiveSuccesses, String note) {
        return new StateTransitionResult(state, state, false, false, null, note, consecutiveSuccesses);
    }

    public ServerState getPreviousState() {
        return previousState;
    }

    public ServerState getNewState() {
        return newState;
    }

    public boolean isStateChanged() {
        return stateChanged;
    }

    public boolean isAlertNeeded() {
        return alertNeeded;
    }

    public String getAlertType() {
        return alertType;
    }

    public String getDescription() {
        return description;
    }

    public int getConsecutiveSuccesses() {
        return consecutiveSuccesses;
    }
}
