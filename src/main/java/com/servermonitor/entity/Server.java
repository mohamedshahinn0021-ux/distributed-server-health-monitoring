package com.servermonitor.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "servers")
public class Server {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "server_name", nullable = false, length = 100)
    private String serverName;

    @Column(name = "ip_address", nullable = false, length = 120)
    private String ipAddress;

    @Column(nullable = false)
    private Integer port;

    @Column(length = 10)
    private String protocol = "HTTP"; // HTTP or TCP

    @Column(name = "endpoint_path", length = 255)
    private String endpointPath = "/";

    @Enumerated(EnumType.STRING)
    @Column(name = "current_state", nullable = false, length = 20)
    private ServerState currentState = ServerState.ACTIVE;

    @Column(name = "consecutive_successes")
    private Integer consecutiveSuccesses = 0;

    @Column(name = "last_response_time_ms")
    private Long lastResponseTimeMs = 0L;

    @Column(name = "last_checked_at")
    private LocalDateTime lastCheckedAt;

    @Column(name = "slow_threshold_ms")
    private Long slowThresholdMs = 500L;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at")
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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
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
