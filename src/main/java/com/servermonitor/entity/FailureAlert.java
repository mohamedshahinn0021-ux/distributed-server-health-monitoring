package com.servermonitor.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "failure_alerts")
public class FailureAlert {

    @Id
    private String id;

    @Indexed
    private String serverId;

    private Server server;

    private String alertType; // FAILURE, RECOVERY, DEGRADED, RESTORED, STABILIZED

    private ServerState previousState;

    private ServerState newState;

    private String failureDescription;

    @Indexed
    private LocalDateTime alertTime = LocalDateTime.now();

    @Indexed
    private Boolean isAcknowledged = false;

    public FailureAlert() {
    }

    public FailureAlert(Server server, String alertType, ServerState previousState, ServerState newState, String failureDescription) {
        this.server = server;
        this.serverId = server != null ? server.getId() : null;
        this.alertType = alertType;
        this.previousState = previousState;
        this.newState = newState;
        this.failureDescription = failureDescription;
        this.alertTime = LocalDateTime.now();
        this.isAcknowledged = false;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getServerId() {
        return serverId;
    }

    public void setServerId(String serverId) {
        this.serverId = serverId;
    }

    public Server getServer() {
        return server;
    }

    public void setServer(Server server) {
        this.server = server;
        if (server != null) {
            this.serverId = server.getId();
        }
    }

    public String getAlertType() {
        return alertType;
    }

    public void setAlertType(String alertType) {
        this.alertType = alertType;
    }

    public ServerState getPreviousState() {
        return previousState;
    }

    public void setPreviousState(ServerState previousState) {
        this.previousState = previousState;
    }

    public ServerState getNewState() {
        return newState;
    }

    public void setNewState(ServerState newState) {
        this.newState = newState;
    }

    public String getFailureDescription() {
        return failureDescription;
    }

    public void setFailureDescription(String failureDescription) {
        this.failureDescription = failureDescription;
    }

    public LocalDateTime getAlertTime() {
        return alertTime;
    }

    public void setAlertTime(LocalDateTime alertTime) {
        this.alertTime = alertTime;
    }

    public Boolean getIsAcknowledged() {
        return isAcknowledged;
    }

    public void setIsAcknowledged(Boolean acknowledged) {
        isAcknowledged = acknowledged;
    }
}
