-- ========================================================================
-- Distributed Server Health Monitoring and Failure Detection System
-- Sample Seed Data for Testing & Demonstration
-- ========================================================================

USE server_monitor_db;

-- 1. Insert Default Admin User
-- Password is 'admin123' (BCrypt hashed: $2a$10$wK1W2Q/8yqSjF06D3QOVOuP5sF1Y5QJ1QJqZ.B2zJ1fC0k.D2a8dK or plain fallback)
INSERT INTO admin (id, username, password, full_name, email, role) VALUES
(1, 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'System Administrator', 'admin@servermonitor.io', 'ROLE_ADMIN')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- 2. Insert Sample Servers representing different states
INSERT INTO servers (id, server_name, ip_address, port, protocol, endpoint_path, current_state, consecutive_successes, last_response_time_ms, last_checked_at, slow_threshold_ms, description) VALUES
(1, 'Primary Web Application', '127.0.0.1', 8080, 'HTTP', '/api/mock/healthy', 'ACTIVE', 5, 42, NOW() - INTERVAL 1 MINUTE, 400, 'Core customer-facing Spring Boot web application'),
(2, 'Cloudflare Anycast DNS', '1.1.1.1', 53, 'TCP', '', 'ACTIVE', 8, 28, NOW() - INTERVAL 2 MINUTE, 250, 'Ultra-low latency public DNS resolver node'),
(3, 'Google Public DNS-Primary', '8.8.8.8', 53, 'TCP', '', 'ACTIVE', 12, 35, NOW() - INTERVAL 1 MINUTE, 300, 'Global Anycast DNS server for external routing verification'),
(4, 'Legacy Reporting Service', '127.0.0.1', 8080, 'HTTP', '/api/mock/slow', 'SLOW', 3, 780, NOW() - INTERVAL 3 MINUTE, 400, 'Batched reporting backend experiencing heavy I/O congestion'),
(5, 'Disaster Recovery Database', '192.0.2.1', 3306, 'TCP', '', 'DISCONNECTED', 0, 0, NOW() - INTERVAL 4 MINUTE, 500, 'Offline standby replica server (simulated unreachable network)'),
(6, 'Payment Gateway Webhook', '127.0.0.1', 8080, 'HTTP', '/api/mock/recovering', 'RECOVERING', 2, 95, NOW() - INTERVAL 30 SECOND, 500, 'Recently rebooted payment ingest daemon undergoing stability check')
ON DUPLICATE KEY UPDATE server_name=VALUES(server_name);

-- 3. Insert Historical Monitoring Records
INSERT INTO monitoring_history (server_id, response_time_ms, status, checked_at, error_message) VALUES
(1, 48, 'ACTIVE', NOW() - INTERVAL 10 MINUTE, NULL),
(1, 45, 'ACTIVE', NOW() - INTERVAL 8 MINUTE, NULL),
(1, 42, 'ACTIVE', NOW() - INTERVAL 1 MINUTE, NULL),
(2, 26, 'ACTIVE', NOW() - INTERVAL 10 MINUTE, NULL),
(2, 30, 'ACTIVE', NOW() - INTERVAL 5 MINUTE, NULL),
(2, 28, 'ACTIVE', NOW() - INTERVAL 2 MINUTE, NULL),
(4, 380, 'ACTIVE', NOW() - INTERVAL 15 MINUTE, NULL),
(4, 620, 'SLOW', NOW() - INTERVAL 10 MINUTE, 'Response time exceeded threshold (620ms > 400ms)'),
(4, 780, 'SLOW', NOW() - INTERVAL 3 MINUTE, 'Response time exceeded threshold (780ms > 400ms)'),
(5, 50, 'ACTIVE', NOW() - INTERVAL 30 MINUTE, NULL),
(5, 0, 'DISCONNECTED', NOW() - INTERVAL 20 MINUTE, 'Connection timed out to 192.0.2.1:3306'),
(5, 0, 'DISCONNECTED', NOW() - INTERVAL 4 MINUTE, 'Connection timed out to 192.0.2.1:3306'),
(6, 0, 'DISCONNECTED', NOW() - INTERVAL 15 MINUTE, 'Connection refused'),
(6, 120, 'RECOVERING', NOW() - INTERVAL 2 MINUTE, 'Server reachable again; stability check 1/3'),
(6, 95, 'RECOVERING', NOW() - INTERVAL 30 SECOND, 'Server reachable again; stability check 2/3');

-- 4. Insert Failure & Recovery Alerts
INSERT INTO failure_alerts (server_id, alert_type, previous_state, new_state, failure_description, alert_time, is_acknowledged) VALUES
(5, 'FAILURE', 'ACTIVE', 'DISCONNECTED', 'CRITICAL: Disaster Recovery Database is unreachable. Network connection to 192.0.2.1:3306 timed out after 3000ms.', NOW() - INTERVAL 20 MINUTE, FALSE),
(4, 'DEGRADED', 'ACTIVE', 'SLOW', 'WARNING: Legacy Reporting Service latency degraded to 620ms (configured threshold: 400ms).', NOW() - INTERVAL 10 MINUTE, TRUE),
(6, 'FAILURE', 'ACTIVE', 'DISCONNECTED', 'CRITICAL: Payment Gateway Webhook failed health ping. Connection refused on 127.0.0.1:8080.', NOW() - INTERVAL 15 MINUTE, TRUE),
(6, 'RECOVERY', 'DISCONNECTED', 'RECOVERING', 'NOTICE: Payment Gateway Webhook responded after downtime. Initiated 3-cycle stability validation.', NOW() - INTERVAL 2 MINUTE, FALSE);
