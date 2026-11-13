package com.servermonitor.controller;

import com.servermonitor.dto.ApiResponse;
import com.servermonitor.dto.ServerRequest;
import com.servermonitor.entity.Server;
import com.servermonitor.service.HealthMonitoringService;
import com.servermonitor.service.ServerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servers")
public class ServerController {

    private final ServerService serverService;
    private final HealthMonitoringService healthMonitoringService;

    public ServerController(ServerService serverService, HealthMonitoringService healthMonitoringService) {
        this.serverService = serverService;
        this.healthMonitoringService = healthMonitoringService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Server>>> getAllServers() {
        List<Server> servers = serverService.getAllServers();
        return ResponseEntity.ok(ApiResponse.ok("Servers retrieved", servers));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Server>> getServerById(@PathVariable Long id) {
        Server server = serverService.getServerById(id);
        return ResponseEntity.ok(ApiResponse.ok("Server found", server));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Server>> createServer(@Valid @RequestBody ServerRequest request) {
        Server server = serverService.createServer(request);
        // Immediately run an initial health check on newly added server
        Server checked = healthMonitoringService.checkSingleServer(server.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Server added and initial health check performed", checked != null ? checked : server));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Server>> updateServer(@PathVariable Long id, @Valid @RequestBody ServerRequest request) {
        Server updated = serverService.updateServer(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Server updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteServer(@PathVariable Long id) {
        serverService.deleteServer(id);
        return ResponseEntity.ok(ApiResponse.ok("Server deleted successfully", null));
    }

    @PostMapping("/{id}/check")
    public ResponseEntity<ApiResponse<Server>> checkServerNow(@PathVariable Long id) {
        Server checked = healthMonitoringService.checkSingleServer(id);
        if (checked != null) {
            return ResponseEntity.ok(ApiResponse.ok("Health check completed for " + checked.getServerName(), checked));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Server with ID " + id + " not found"));
        }
    }

    @PostMapping("/check-all")
    public ResponseEntity<ApiResponse<List<Server>>> checkAllNow() {
        List<Server> results = healthMonitoringService.checkAllServersNow();
        return ResponseEntity.ok(ApiResponse.ok("Triggered immediate health check on all servers", results));
    }
}
