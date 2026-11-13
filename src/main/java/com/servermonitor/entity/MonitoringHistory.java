package com.servermonitor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "monitoring_history")
public class MonitoringHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "server_id", nullable = false)
    private Server server;

    @Column(name = "response_time_ms", nullable = false)
    private Long responseTimeMs;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ServerState status;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt = LocalDateTime.now();

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    public MonitoringHistory() {
    }

    public MonitoringHistory(Server server, Long responseTimeMs, ServerState status, String errorMessage) {
        this.server = server;
        this.responseTimeMs = responseTimeMs;
        this.status = status;
        this.errorMessage = errorMessage;
        this.checkedAt = LocalDateTime.now();
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

    public Long getResponseTimeMs() {
        return responseTimeMs;
    }

    public void setResponseTimeMs(Long responseTimeMs) {
        this.responseTimeMs = responseTimeMs;
    }

    public ServerState getStatus() {
        return status;
    }

    public void setStatus(ServerState status) {
        this.status = status;
    }

    public LocalDateTime getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(LocalDateTime checkedAt) {
        this.checkedAt = checkedAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
