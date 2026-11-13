package com.servermonitor.controller;

import com.servermonitor.dto.ApiResponse;
import com.servermonitor.dto.ChartDataDto;
import com.servermonitor.dto.DashboardStatsDto;
import com.servermonitor.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDto>> getStats() {
        DashboardStatsDto stats = dashboardService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.ok("Dashboard statistics retrieved", stats));
    }

    @GetMapping("/chart-data")
    public ResponseEntity<ApiResponse<ChartDataDto>> getChartData() {
        ChartDataDto chartData = dashboardService.getResponseTimeChartData();
        return ResponseEntity.ok(ApiResponse.ok("Chart data retrieved", chartData));
    }
}
