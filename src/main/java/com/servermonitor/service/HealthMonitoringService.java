package com.servermonitor.service;

import com.servermonitor.entity.MonitoringHistory;
import com.servermonitor.entity.Server;
import com.servermonitor.entity.ServerState;
import com.servermonitor.fsm.ServerStateMachine;
import com.servermonitor.fsm.StateTransitionResult;
import com.servermonitor.repository.MonitoringHistoryRepository;
import com.servermonitor.repository.ServerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

@Service
public class HealthMonitoringService {

    private static final Logger log = LoggerFactory.getLogger(HealthMonitoringService.class);

    private final ServerRepository serverRepository;
    private final MonitoringHistoryRepository historyRepository;
    private final PingProbeService probeService;
    private final ServerStateMachine stateMachine;
    private final AlertService alertService;

    @Value("${server.monitor.enabled:true}")
    private boolean monitoringEnabled = true;

    private final ExecutorService probeExecutor = Executors.newFixedThreadPool(10);

    public HealthMonitoringService(ServerRepository serverRepository,
                                   MonitoringHistoryRepository historyRepository,
                                   PingProbeService probeService,
                                   ServerStateMachine stateMachine,
                                   AlertService alertService) {
        this.serverRepository = serverRepository;
        this.historyRepository = historyRepository;
        this.probeService = probeService;
        this.stateMachine = stateMachine;
        this.alertService = alertService;
    }

    /**
     * Automatic background scheduler: Executes continuous health checks
     * across all registered servers at fixed intervals.
     */
    @Scheduled(fixedDelayString = "${server.monitor.interval-ms:15000}", initialDelay = 5000)
    public void performScheduledHealthCheck() {
        if (!monitoringEnabled) {
            log.debug("Continuous server health monitoring is disabled via configuration.");
            return;
        }

        List<Server> servers = serverRepository.findAll();
        if (servers.isEmpty()) {
            return;
        }

        log.info("Starting distributed health cycle for {} registered servers...", servers.size());

        List<CompletableFuture<Void>> futures = new ArrayList<>();
        for (Server s : servers) {
            futures.add(CompletableFuture.runAsync(() -> checkSingleServer(s.getId()), probeExecutor));
        }

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(10, TimeUnit.SECONDS);
            log.info("Completed distributed health check cycle.");
        } catch (Exception e) {
            log.warn("Health check cycle completed with timeout or cancellation: {}", e.getMessage());
        }
    }

    /**
     * Executes health check and FSM evaluation for an individual server by ID.
     */
    @Transactional
    public Server checkSingleServer(Long serverId) {
        Server server = serverRepository.findById(serverId).orElse(null);
        if (server == null) {
            return null;
        }

        PingProbeService.ProbeResult probe = probeService.probe(server);
        ServerState previousState = server.getCurrentState();

        // Feed probe results into the Finite State Machine Engine
        StateTransitionResult transition = stateMachine.evaluate(
                server,
                probe.isReachable(),
                probe.getResponseTimeMs(),
                probe.getErrorMessage()
        );

        // Update server entity state and metrics
        server.setCurrentState(transition.getNewState());
        server.setConsecutiveSuccesses(transition.getConsecutiveSuccesses());
        server.setLastResponseTimeMs(probe.getResponseTimeMs());
        server.setLastCheckedAt(LocalDateTime.now());
        Server updatedServer = serverRepository.save(server);

        // Record monitoring history entry
        MonitoringHistory history = new MonitoringHistory();
        history.setServer(updatedServer);
        history.setResponseTimeMs(probe.getResponseTimeMs());
        history.setStatus(transition.getNewState());
        history.setCheckedAt(LocalDateTime.now());
        history.setErrorMessage(probe.getErrorMessage());
        historyRepository.save(history);

        // Generate alert if state machine determined alert condition
        if (transition.isAlertNeeded()) {
            alertService.recordAlert(
                    updatedServer,
                    transition.getAlertType(),
                    previousState,
                    transition.getNewState(),
                    transition.getDescription()
            );
        }

        return updatedServer;
    }

    /**
     * Triggers an immediate health check on all registered servers.
     */
    public List<Server> checkAllServersNow() {
        List<Server> servers = serverRepository.findAll();
        List<Server> results = new ArrayList<>();
        for (Server s : servers) {
            Server checked = checkSingleServer(s.getId());
            if (checked != null) {
                results.add(checked);
            }
        }
        return results;
    }
}
