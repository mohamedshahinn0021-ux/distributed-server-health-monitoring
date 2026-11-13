package com.servermonitor.service;

import com.servermonitor.dto.ChartDataDto;
import com.servermonitor.dto.DashboardStatsDto;
import com.servermonitor.entity.MonitoringHistory;
import com.servermonitor.entity.Server;
import com.servermonitor.entity.ServerState;
import com.servermonitor.repository.FailureAlertRepository;
import com.servermonitor.repository.MonitoringHistoryRepository;
import com.servermonitor.repository.ServerRepository;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DashboardService {

    private final ServerRepository serverRepository;
    private final MonitoringHistoryRepository historyRepository;
    private final FailureAlertRepository alertRepository;

    private static final String[] CHART_COLORS = {
            "#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b", "#6f42c1", "#fd7e14", "#20c997"
    };

    public DashboardService(ServerRepository serverRepository,
                            MonitoringHistoryRepository historyRepository,
                            FailureAlertRepository alertRepository) {
        this.serverRepository = serverRepository;
        this.historyRepository = historyRepository;
        this.alertRepository = alertRepository;
    }

    public DashboardStatsDto getDashboardStats() {
        long total = serverRepository.count();
        long active = serverRepository.countByCurrentState(ServerState.ACTIVE);
        long slow = serverRepository.countByCurrentState(ServerState.SLOW);
        long disconnected = serverRepository.countByCurrentState(ServerState.DISCONNECTED);
        long recovering = serverRepository.countByCurrentState(ServerState.RECOVERING);
        long unacknowledgedAlerts = alertRepository.countByIsAcknowledgedFalse();

        Double avgResponseTime = historyRepository.findAverageHealthyResponseTime();
        long avgMs = (avgResponseTime != null) ? Math.round(avgResponseTime) : 0L;

        double healthPercentage = (total > 0) ? Math.round(((double) active / total) * 1000.0) / 10.0 : 0.0;

        return new DashboardStatsDto(
                total,
                active,
                slow,
                disconnected,
                recovering,
                unacknowledgedAlerts,
                avgMs,
                healthPercentage
        );
    }

    /**
     * Prepares historical response time dataset for Chart.js
     */
    public ChartDataDto getResponseTimeChartData() {
        List<Server> servers = serverRepository.findAll();
        List<ChartDataDto.ServerDataset> datasets = new ArrayList<>();
        Set<String> labelSet = new LinkedHashSet<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm:ss");

        int colorIdx = 0;
        for (Server s : servers) {
            List<MonitoringHistory> histories = historyRepository.findTop20ByServerIdOrderByCheckedAtDesc(s.getId());
            // Reverse so oldest is first
            Collections.reverse(histories);

            List<Long> points = new ArrayList<>();
            for (MonitoringHistory h : histories) {
                points.add(h.getResponseTimeMs());
                labelSet.add(h.getCheckedAt().format(formatter));
            }

            if (!points.isEmpty()) {
                String color = CHART_COLORS[colorIdx % CHART_COLORS.length];
                colorIdx++;
                datasets.add(new ChartDataDto.ServerDataset(s.getServerName(), points, color, color));
            }
        }

        List<String> labels = new ArrayList<>(labelSet);
        if (labels.isEmpty()) {
            labels.add("Current");
        }

        return new ChartDataDto(labels, datasets);
    }
}
