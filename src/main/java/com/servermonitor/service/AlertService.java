package com.servermonitor.service;

import com.servermonitor.entity.FailureAlert;
import com.servermonitor.entity.Server;
import com.servermonitor.entity.ServerState;
import com.servermonitor.repository.FailureAlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final FailureAlertRepository alertRepository;

    public AlertService(FailureAlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public FailureAlert recordAlert(Server server, String alertType, ServerState previousState, 
                                    ServerState newState, String description) {
        log.info("EVENT ALERT [{}]: Server '{}' (ID: {}) transitioned from {} -> {}. Description: {}", 
                alertType, server.getServerName(), server.getId(), previousState, newState, description);

        FailureAlert alert = new FailureAlert();
        alert.setServer(server);
        alert.setServerId(server != null ? server.getId() : null);
        alert.setAlertType(alertType);
        alert.setPreviousState(previousState);
        alert.setNewState(newState);
        alert.setFailureDescription(description);
        alert.setAlertTime(LocalDateTime.now());
        alert.setIsAcknowledged(false);

        return alertRepository.save(alert);
    }

    public List<FailureAlert> getRecentAlerts() {
        return alertRepository.findTop30ByOrderByAlertTimeDesc();
    }

    public List<FailureAlert> getAllAlerts() {
        return alertRepository.findByOrderByAlertTimeDesc();
    }

    public List<FailureAlert> getAlertsByServer(String serverId) {
        return alertRepository.findByServerIdOrderByAlertTimeDesc(serverId);
    }

    public long getUnacknowledgedCount() {
        return alertRepository.countByIsAcknowledgedFalse();
    }

    public FailureAlert acknowledgeAlert(String alertId) {
        FailureAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found with ID: " + alertId));
        alert.setIsAcknowledged(true);
        return alertRepository.save(alert);
    }

    public void acknowledgeAllAlerts() {
        List<FailureAlert> unacked = alertRepository.findAll();
        for (FailureAlert a : unacked) {
            a.setIsAcknowledged(true);
        }
        alertRepository.saveAll(unacked);
    }

    public void deleteAlert(String alertId) {
        alertRepository.deleteById(alertId);
    }

    public void clearAllAlerts() {
        alertRepository.deleteAll();
    }
}
