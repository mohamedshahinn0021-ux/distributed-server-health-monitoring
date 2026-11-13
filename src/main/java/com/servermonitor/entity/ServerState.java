package com.servermonitor.entity;

/**
 * Finite State Machine (FSM) States for Server Health Monitoring.
 * 
 * - ACTIVE: Server is running normally with healthy response time.
 * - SLOW: Server is reachable but responding above the configured latency threshold.
 * - DISCONNECTED: Server is unreachable, connection timed out, or connection refused.
 * - RECOVERING: Previously disconnected server is reachable again and undergoing stability verification.
 */
public enum ServerState {
    ACTIVE("Active", "#28a745", "Server is running normally."),
    SLOW("Slow", "#ffc107", "Server is reachable but experiencing latency degradation."),
    DISCONNECTED("Disconnected", "#dc3545", "Server is unreachable or not responding."),
    RECOVERING("Recovering", "#0d6efd", "Server became reachable; verifying operational stability.");

    private final String displayName;
    private final String colorHex;
    private final String description;

    ServerState(String displayName, String colorHex, String description) {
        this.displayName = displayName;
        this.colorHex = colorHex;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getColorHex() {
        return colorHex;
    }

    public String getDescription() {
        return description;
    }
}
