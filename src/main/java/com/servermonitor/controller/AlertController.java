package com.servermonitor.controller;

import com.servermonitor.dto.ApiResponse;
import com.servermonitor.entity.FailureAlert;
import com.servermonitor.service.AlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FailureAlert>>> getAlerts() {
        List<FailureAlert> alerts = alertService.getRecentAlerts();
        return ResponseEntity.ok(ApiResponse.ok("Failure and recovery alerts retrieved", alerts));
    }

    @PutMapping("/{id}/acknowledge")
    public ResponseEntity<ApiResponse<FailureAlert>> acknowledgeAlert(@PathVariable String id) {
        FailureAlert alert = alertService.acknowledgeAlert(id);
        return ResponseEntity.ok(ApiResponse.ok("Alert acknowledged", alert));
    }

    @PostMapping("/acknowledge-all")
    public ResponseEntity<ApiResponse<Void>> acknowledgeAll() {
        alertService.acknowledgeAllAlerts();
        return ResponseEntity.ok(ApiResponse.ok("All alerts acknowledged", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAlert(@PathVariable String id) {
        alertService.deleteAlert(id);
        return ResponseEntity.ok(ApiResponse.ok("Alert deleted successfully", null));
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<Void>> clearAllAlerts() {
        alertService.clearAllAlerts();
        return ResponseEntity.ok(ApiResponse.ok("All alerts cleared", null));
    }
}
