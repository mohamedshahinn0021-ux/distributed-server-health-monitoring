package com.servermonitor.service;

import com.servermonitor.entity.Server;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;

/**
 * Service responsible for executing low-level network connectivity checks 
 * and measuring round-trip response times in milliseconds.
 */
@Service
public class PingProbeService {

    private static final Logger log = LoggerFactory.getLogger(PingProbeService.class);

    @Value("${server.monitor.connect-timeout-ms:3000}")
    private int defaultTimeoutMs = 3000;

    public static class ProbeResult {
        private final boolean reachable;
        private final long responseTimeMs;
        private final Integer statusCode;
        private final String errorMessage;

        public ProbeResult(boolean reachable, long responseTimeMs, Integer statusCode, String errorMessage) {
            this.reachable = reachable;
            this.responseTimeMs = responseTimeMs;
            this.statusCode = statusCode;
            this.errorMessage = errorMessage;
        }

        public static ProbeResult success(long responseTimeMs, Integer statusCode) {
            return new ProbeResult(true, responseTimeMs, statusCode, null);
        }

        public static ProbeResult failure(String errorMessage) {
            return new ProbeResult(false, 0L, null, errorMessage);
        }

        public boolean isReachable() {
            return reachable;
        }

        public long getResponseTimeMs() {
            return responseTimeMs;
        }

        public Integer getStatusCode() {
            return statusCode;
        }

        public String getErrorMessage() {
            return errorMessage;
        }
    }

    /**
     * Probes the server using either HTTP or TCP Socket according to server specification.
     */
    public ProbeResult probe(Server server) {
        String protocol = server.getProtocol() != null ? server.getProtocol().toUpperCase() : "HTTP";
        
        if ("HTTP".equalsIgnoreCase(protocol) || "HTTPS".equalsIgnoreCase(protocol)) {
            return probeHttp(server);
        } else {
            return probeSocket(server);
        }
    }

    /**
     * HTTP / HTTPS Probe
     */
    public ProbeResult probeHttp(Server server) {
        String host = server.getIpAddress().trim();
        int port = server.getPort();
        String path = (server.getEndpointPath() != null && !server.getEndpointPath().trim().isEmpty()) 
                      ? server.getEndpointPath().trim() 
                      : "/";
        if (!path.startsWith("/")) {
            path = "/" + path;
        }

        String scheme = (port == 443 || "HTTPS".equalsIgnoreCase(server.getProtocol())) ? "https" : "http";
        String urlString = scheme + "://" + host + (port == 80 || port == 443 ? "" : ":" + port) + path;

        long startTime = System.currentTimeMillis();
        HttpURLConnection connection = null;

        try {
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(defaultTimeoutMs);
            connection.setReadTimeout(defaultTimeoutMs);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("User-Agent", "ServerHealthMonitor/1.0");

            int responseCode = connection.getResponseCode();
            long duration = System.currentTimeMillis() - startTime;

            // 2xx, 3xx, and even 4xx responses mean the host/port is reachable and actively responding
            if (responseCode >= 200 && responseCode < 500) {
                return ProbeResult.success(Math.max(1L, duration), responseCode);
            } else {
                return new ProbeResult(false, duration, responseCode, "HTTP Error Code: " + responseCode);
            }
        } catch (IOException e) {
            // If HTTP probe fails with connection refused / timeout, fallback to socket check to verify TCP level
            log.debug("HTTP check failed for {}: {}, attempting TCP socket verification", urlString, e.getMessage());
            ProbeResult socketResult = probeSocket(server);
            if (socketResult.isReachable()) {
                return socketResult;
            }
            return ProbeResult.failure("HTTP unreachable: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    /**
     * Raw TCP Socket Probe
     */
    public ProbeResult probeSocket(Server server) {
        String host = server.getIpAddress().trim();
        int port = server.getPort();

        long startTime = System.currentTimeMillis();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), defaultTimeoutMs);
            long duration = System.currentTimeMillis() - startTime;
            return ProbeResult.success(Math.max(1L, duration), 200);
        } catch (IOException e) {
            return ProbeResult.failure("TCP Connection failed to " + host + ":" + port + " (" + e.getMessage() + ")");
        }
    }
}
