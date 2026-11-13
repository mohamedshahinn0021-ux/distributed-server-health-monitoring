package com.servermonitor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "failure_alerts")
public class FailureAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "server_id", nullable = false)
    private Server server;

    @Column(name = "alert_type", nullable = false, length = 30)
    private String alertType; // FAILURE, RECOVERY, DEGRADED, RESTORED, STABILIZED

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_state", length = 20)
    private ServerState previousState;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_state", nullable = false, length = 20)
    private ServerState newState;

    @Column(name = "failure_description", nullable = false, columnDefinition = "TEXT")
    private String failureDescription;

    @Column(name = "alert_time", nullable = false)
    private LocalDateTime alertTime = LocalDateTime.now();

    @Column(name = "is_acknowledged", nullable = false)
    private Boolean isAcknowledged = false;

    public FailureAlert() {
    }

    public FailureAlert(Server server, String alertType, ServerState previousState, ServerState newState, String failureDescription) {
        this.server = server;
        this.alertType = alertType;
        this.previousState = previousState;
        this.newState = newState;
        this.failureDescription = failureDescription;
        this.alertTime = LocalDateTime.now();
        this.isAcknowledged = false;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Server getServer() {
        return server;
    }

    public void setServer(Server server) {
        this.server = server;
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
