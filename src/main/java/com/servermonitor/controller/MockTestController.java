package com.servermonitor.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Embedded test endpoints that allow testing and demonstration 
 * of all four Finite State Machine states:
 * - ACTIVE
 * - SLOW
 * - DISCONNECTED
 * - RECOVERING
 */
@RestController
@RequestMapping("/api/mock")
public class MockTestController {

    private final AtomicBoolean simulatedDown = new AtomicBoolean(false);
    private final AtomicInteger recoveryCallCount = new AtomicInteger(0);

    @GetMapping("/healthy")
    public ResponseEntity<Map<String, Object>> mockHealthy() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "MockHealthyService",
                "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping("/slow")
    public ResponseEntity<Map<String, Object>> mockSlow(@RequestParam(defaultValue = "750") long delayMs) {
        try {
            Thread.sleep(Math.min(delayMs, 3000));
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
        return ResponseEntity.ok(Map.of(
                "status", "UP_SLOW",
                "simulatedDelayMs", delayMs,
                "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping("/recovering")
    public ResponseEntity<Map<String, Object>> mockRecovering() {
        int count = recoveryCallCount.incrementAndGet();
        return ResponseEntity.ok(Map.of(
                "status", "RECOVERING_SUCCESS",
                "probeAttempt", count,
                "message", "Simulating recovering service stability check " + count,
                "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping("/toggleable")
    public ResponseEntity<Map<String, Object>> mockToggleable() {
        if (simulatedDown.get()) {
            return ResponseEntity.status(503).body(Map.of(
                    "status", "DOWN",
                    "error", "Simulated service outage"
            ));
        }
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "message", "Service running normally"
        ));
    }

    @PostMapping("/toggleable/toggle")
    public ResponseEntity<Map<String, Object>> toggleState() {
        boolean newState = !simulatedDown.get();
        simulatedDown.set(newState);
        return ResponseEntity.ok(Map.of(
                "simulatedDown", newState,
                "message", newState ? "Simulated service is now OFFLINE (will cause DISCONNECTED)" 
                                    : "Simulated service is now ONLINE (will trigger RECOVERY)"
        ));
    }
}
