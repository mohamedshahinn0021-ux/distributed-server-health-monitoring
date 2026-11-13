package com.servermonitor.dto;

import jakarta.validation.constraints.*;

public class ServerRequest {

    @NotBlank(message = "Server name is required")
    @Size(max = 100, message = "Server name cannot exceed 100 characters")
    private String serverName;

    @NotBlank(message = "IP address or hostname is required")
    @Size(max = 120, message = "IP address/hostname cannot exceed 120 characters")
    private String ipAddress;

    @NotNull(message = "Port number is required")
    @Min(value = 1, message = "Port must be at least 1")
    @Max(value = 65535, message = "Port cannot exceed 65535")
    private Integer port;

    @Pattern(regexp = "^(?i)(HTTP|TCP)$", message = "Protocol must be either HTTP or TCP")
    private String protocol = "HTTP";

    @Size(max = 255, message = "Endpoint path cannot exceed 255 characters")
    private String endpointPath = "/";

    @Min(value = 10, message = "Slow threshold must be at least 10ms")
    @Max(value = 60000, message = "Slow threshold cannot exceed 60000ms")
    private Long slowThresholdMs = 500L;

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private String description;

    public ServerRequest() {
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
        this.protocol = protocol;
    }

    public String getEndpointPath() {
        return endpointPath;
    }

    public void setEndpointPath(String endpointPath) {
        this.endpointPath = endpointPath;
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
}
