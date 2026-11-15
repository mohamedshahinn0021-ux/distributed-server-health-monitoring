package com.servermonitor.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "servers")
public class Server {

    @Id
    private String id;

    @Indexed
    private String serverName;

    private String ipAddress;

    private Integer port;

    private String protocol = "HTTP"; // HTTP or TCP

    private String endpointPath = "/";

    @Indexed
    private ServerState currentState = ServerState.ACTIVE;

    private Integer consecutiveSuccesses = 0;

    private Long lastResponseTimeMs = 0L;

    private LocalDateTime lastCheckedAt;

    private Long slowThresholdMs = 500L;

    private String description;

    private LocalDateTime createdAt = LocalDateTime.now();

    public Server() {
    }

    public Server(String serverName, String ipAddress, Integer port, String protocol, String endpointPath, Long slowThresholdMs, String description) {
        this.serverName = serverName;
        this.ipAddress = ipAddress;
        this.port = port;
        this.protocol = protocol != null ? protocol.toUpperCase() : "HTTP";
        this.endpointPath = (endpointPath != null && !endpointPath.trim().isEmpty()) ? endpointPath : "/";
        this.slowThresholdMs = (slowThresholdMs != null && slowThresholdMs > 0) ? slowThresholdMs : 500L;
        this.description = description;
        this.currentState = ServerState.ACTIVE;
        this.consecutiveSuccesses = 0;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getServerName() {
        return serverName;
    }

    public void setServerName(String serverName) {
        this.serverName = serverName;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public Integer getPort() {
        return port;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public String getProtocol() {
        return protocol;
    }

    public void setProtocol(String protocol) {
        this.protocol = protocol != null ? protocol.toUpperCase() : "HTTP";
    }

    public String getEndpointPath() {
        return endpointPath;
    }

    public void setEndpointPath(String endpointPath) {
        this.endpointPath = endpointPath;
    }

    public ServerState getCurrentState() {
        return currentState;
    }

    public void setCurrentState(ServerState currentState) {
        this.currentState = currentState;
    }

    public Integer getConsecutiveSuccesses() {
        return consecutiveSuccesses;
    }

    public void setConsecutiveSuccesses(Integer consecutiveSuccesses) {
        this.consecutiveSuccesses = consecutiveSuccesses;
    }

    public Long getLastResponseTimeMs() {
        return lastResponseTimeMs;
    }

    public void setLastResponseTimeMs(Long lastResponseTimeMs) {
        this.lastResponseTimeMs = lastResponseTimeMs;
    }

    public LocalDateTime getLastCheckedAt() {
        return lastCheckedAt;
    }

    public void setLastCheckedAt(LocalDateTime lastCheckedAt) {
        this.lastCheckedAt = lastCheckedAt;
    }

    public Long getSlowThresholdMs() {
        return slowThresholdMs;
    }

    public void setSlowThresholdMs(Long slowThresholdMs) {
        this.slowThresholdMs = slowThresholdMs;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
