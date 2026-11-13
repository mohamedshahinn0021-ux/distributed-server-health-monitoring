package com.servermonitor.dto;

public class DashboardStatsDto {
    private long totalServers;
    private long activeServers;
    private long slowServers;
    private long disconnectedServers;
    private long recoveringServers;
    private long unacknowledgedAlerts;
    private long averageResponseTimeMs;
    private double healthPercentage;

    public DashboardStatsDto() {
    }

    public DashboardStatsDto(long totalServers, long activeServers, long slowServers, 
                             long disconnectedServers, long recoveringServers, 
                             long unacknowledgedAlerts, long averageResponseTimeMs, 
                             double healthPercentage) {
        this.totalServers = totalServers;
        this.activeServers = activeServers;
        this.slowServers = slowServers;
        this.disconnectedServers = disconnectedServers;
        this.recoveringServers = recoveringServers;
        this.unacknowledgedAlerts = unacknowledgedAlerts;
        this.averageResponseTimeMs = averageResponseTimeMs;
        this.healthPercentage = healthPercentage;
    }

    public long getTotalServers() {
        return totalServers;
    }

    public void setTotalServers(long totalServers) {
        this.totalServers = totalServers;
    }

    public long getActiveServers() {
        return activeServers;
    }

    public void setActiveServers(long activeServers) {
        this.activeServers = activeServers;
    }

    public long getSlowServers() {
        return slowServers;
    }

    public void setSlowServers(long slowServers) {
        this.slowServers = slowServers;
    }

    public long getDisconnectedServers() {
        return disconnectedServers;
    }

    public void setDisconnectedServers(long disconnectedServers) {
        this.disconnectedServers = disconnectedServers;
    }

    public long getRecoveringServers() {
        return recoveringServers;
    }

    public void setRecoveringServers(long recoveringServers) {
        this.recoveringServers = recoveringServers;
    }

    public long getUnacknowledgedAlerts() {
        return unacknowledgedAlerts;
    }

    public void setUnacknowledgedAlerts(long unacknowledgedAlerts) {
        this.unacknowledgedAlerts = unacknowledgedAlerts;
    }

    public long getAverageResponseTimeMs() {
        return averageResponseTimeMs;
    }

    public void setAverageResponseTimeMs(long averageResponseTimeMs) {
        this.averageResponseTimeMs = averageResponseTimeMs;
    }

    public double getHealthPercentage() {
        return healthPercentage;
    }

    public void setHealthPercentage(double healthPercentage) {
        this.healthPercentage = healthPercentage;
    }
}
