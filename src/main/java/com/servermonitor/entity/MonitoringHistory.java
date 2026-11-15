package com.servermonitor.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "monitoring_history")
public class MonitoringHistory {

    @Id
    private String id;

    @Indexed
    private String serverId;

    private Server server;

    private Long responseTimeMs;

    private ServerState status;

    @Indexed
    private LocalDateTime checkedAt = LocalDateTime.now();

    private String errorMessage;

    public MonitoringHistory() {
    }

    public MonitoringHistory(Server server, Long responseTimeMs, ServerState status, String errorMessage) {
        this.server = server;
        this.serverId = server != null ? server.getId() : null;
        this.responseTimeMs = responseTimeMs;
        this.status = status;
        this.errorMessage = errorMessage;
        this.checkedAt = LocalDateTime.now();
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
