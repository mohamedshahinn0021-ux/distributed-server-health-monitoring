package com.servermonitor.config;

import com.servermonitor.entity.*;
import com.servermonitor.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Automatically seeds the MongoDB database with default administrator
 * credentials and realistic sample servers if the collections are empty.
 */
@Component
public class MongoDatabaseSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MongoDatabaseSeeder.class);

    private final AdminRepository adminRepository;
    private final ServerRepository serverRepository;
    private final MonitoringHistoryRepository historyRepository;
    private final FailureAlertRepository alertRepository;
    private final PasswordEncoder passwordEncoder;

    public MongoDatabaseSeeder(AdminRepository adminRepository,
                               ServerRepository serverRepository,
                               MonitoringHistoryRepository historyRepository,
                               FailureAlertRepository alertRepository,
                               PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.serverRepository = serverRepository;
        this.historyRepository = historyRepository;
        this.alertRepository = alertRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedAdmin();
        seedServers();
    }

    private void seedAdmin() {
        if (adminRepository.count() == 0) {
            log.info("MongoDB: Seeding default administrator account (admin / admin123)...");
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFullName("System Administrator");
            admin.setEmail("admin@servermonitor.io");
            admin.setRole("ROLE_ADMIN");
            admin.setCreatedAt(LocalDateTime.now());
            adminRepository.save(admin);
            log.info("MongoDB: Default admin initialized successfully.");
        }
    }

    private void seedServers() {
        if (serverRepository.count() == 0) {
            log.info("MongoDB: Seeding sample servers and initial monitoring telemetry...");

            // 1. Primary Web Application (Healthy)
            Server s1 = new Server("Primary Web Application", "127.0.0.1", 8080, "HTTP", "/api/mock/healthy", 400L, "Core customer-facing Spring Boot web application");
            s1.setCurrentState(ServerState.ACTIVE);
            s1.setConsecutiveSuccesses(5);
            s1.setLastResponseTimeMs(42L);
            s1.setLastCheckedAt(LocalDateTime.now().minusMinutes(1));
            s1 = serverRepository.save(s1);

            // 2. Cloudflare Anycast DNS
            Server s2 = new Server("Cloudflare Anycast DNS", "1.1.1.1", 53, "TCP", "", 250L, "Ultra-low latency public DNS resolver node");
            s2.setCurrentState(ServerState.ACTIVE);
            s2.setConsecutiveSuccesses(8);
            s2.setLastResponseTimeMs(28L);
            s2.setLastCheckedAt(LocalDateTime.now().minusMinutes(2));
            s2 = serverRepository.save(s2);

            // 3. Google Public DNS
            Server s3 = new Server("Google Public DNS-Primary", "8.8.8.8", 53, "TCP", "", 300L, "Global Anycast DNS server for external routing verification");
            s3.setCurrentState(ServerState.ACTIVE);
            s3.setConsecutiveSuccesses(12);
            s3.setLastResponseTimeMs(35L);
            s3.setLastCheckedAt(LocalDateTime.now().minusMinutes(1));
            s3 = serverRepository.save(s3);

            // 4. Legacy Reporting Service (Slow)
            Server s4 = new Server("Legacy Reporting Service", "127.0.0.1", 8080, "HTTP", "/api/mock/slow", 400L, "Batched reporting backend experiencing heavy I/O congestion");
            s4.setCurrentState(ServerState.SLOW);
            s4.setConsecutiveSuccesses(3);
            s4.setLastResponseTimeMs(780L);
            s4.setLastCheckedAt(LocalDateTime.now().minusMinutes(3));
            s4 = serverRepository.save(s4);

            // 5. Disaster Recovery Database (Disconnected - RFC 5737 test IP)
            Server s5 = new Server("Disaster Recovery Database", "192.0.2.1", 3306, "TCP", "", 500L, "Offline standby replica server (simulated unreachable network)");
            s5.setCurrentState(ServerState.DISCONNECTED);
            s5.setConsecutiveSuccesses(0);
            s5.setLastResponseTimeMs(0L);
            s5.setLastCheckedAt(LocalDateTime.now().minusMinutes(4));
            s5 = serverRepository.save(s5);

            // 6. Payment Gateway Webhook (Recovering)
            Server s6 = new Server("Payment Gateway Webhook", "127.0.0.1", 8080, "HTTP", "/api/mock/recovering", 500L, "Recently rebooted payment ingest daemon undergoing stability check");
            s6.setCurrentState(ServerState.RECOVERING);
            s6.setConsecutiveSuccesses(2);
            s6.setLastResponseTimeMs(95L);
            s6.setLastCheckedAt(LocalDateTime.now().minusSeconds(30));
            s6 = serverRepository.save(s6);

            // Initial History Records
            historyRepository.save(new MonitoringHistory(s1, 45L, ServerState.ACTIVE, null));
            historyRepository.save(new MonitoringHistory(s1, 42L, ServerState.ACTIVE, null));
            historyRepository.save(new MonitoringHistory(s2, 28L, ServerState.ACTIVE, null));
            historyRepository.save(new MonitoringHistory(s3, 35L, ServerState.ACTIVE, null));
            historyRepository.save(new MonitoringHistory(s4, 780L, ServerState.SLOW, "Response time exceeded threshold (780ms > 400ms)"));
            historyRepository.save(new MonitoringHistory(s5, 0L, ServerState.DISCONNECTED, "Connection timed out to 192.0.2.1:3306"));
            historyRepository.save(new MonitoringHistory(s6, 95L, ServerState.RECOVERING, "Server reachable again; stability check 2/3"));

            // Initial Alerts
            FailureAlert a1 = new FailureAlert(s5, "FAILURE", ServerState.ACTIVE, ServerState.DISCONNECTED, 
                    "CRITICAL: Disaster Recovery Database is unreachable. Network connection to 192.0.2.1:3306 timed out after 3000ms.");
            a1.setIsAcknowledged(false);
            alertRepository.save(a1);

            FailureAlert a2 = new FailureAlert(s4, "DEGRADED", ServerState.ACTIVE, ServerState.SLOW, 
                    "WARNING: Legacy Reporting Service latency degraded to 780ms (configured threshold: 400ms).");
            a2.setIsAcknowledged(true);
            alertRepository.save(a2);

            FailureAlert a3 = new FailureAlert(s6, "RECOVERY", ServerState.DISCONNECTED, ServerState.RECOVERING, 
                    "NOTICE: Payment Gateway Webhook responded after downtime. Initiated 3-cycle stability validation.");
            a3.setIsAcknowledged(false);
            alertRepository.save(a3);

            log.info("MongoDB: Sample servers, history, and alerts successfully seeded.");
        }
    }
}
