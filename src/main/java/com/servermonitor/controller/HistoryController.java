package com.servermonitor.controller;

import com.servermonitor.dto.ApiResponse;
import com.servermonitor.entity.MonitoringHistory;
import com.servermonitor.repository.MonitoringHistoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final MonitoringHistoryRepository historyRepository;

    public HistoryController(MonitoringHistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MonitoringHistory>>> getRecentHistory() {
        List<MonitoringHistory> history = historyRepository.findTop100ByOrderByCheckedAtDesc();
        return ResponseEntity.ok(ApiResponse.ok("Recent monitoring history retrieved", history));
    }

    @GetMapping("/server/{serverId}")
    public ResponseEntity<ApiResponse<List<MonitoringHistory>>> getHistoryByServer(@PathVariable String serverId) {
        List<MonitoringHistory> history = historyRepository.findByServerIdOrderByCheckedAtDesc(serverId);
        return ResponseEntity.ok(ApiResponse.ok("History for server " + serverId + " retrieved", history));
    }
}
