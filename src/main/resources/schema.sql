-- ========================================================================
-- Distributed Server Health Monitoring and Failure Detection System
-- Database Schema Definition (MySQL 8.0+)
-- ========================================================================

CREATE DATABASE IF NOT EXISTS server_monitor_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE server_monitor_db;

-- 1. Admin Table: Stores administrator credentials and profile data
CREATE TABLE IF NOT EXISTS admin (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120),
    role VARCHAR(30) DEFAULT 'ROLE_ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Servers Table: Stores monitored servers, target endpoints, and current FSM state
CREATE TABLE IF NOT EXISTS servers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(120) NOT NULL,
    port INT NOT NULL,
    protocol VARCHAR(10) DEFAULT 'HTTP',
    endpoint_path VARCHAR(255) DEFAULT '/',
    current_state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    consecutive_successes INT DEFAULT 0,
    last_response_time_ms BIGINT DEFAULT 0,
    last_checked_at TIMESTAMP NULL,
    slow_threshold_ms BIGINT DEFAULT 500,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_current_state (current_state),
    INDEX idx_ip_port (ip_address, port)
) ENGINE=InnoDB;

-- 3. Monitoring_History Table: Stores continuous health ping log records
CREATE TABLE IF NOT EXISTS monitoring_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id BIGINT NOT NULL,
    response_time_ms BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message VARCHAR(500),
    INDEX idx_server_checked (server_id, checked_at),
    CONSTRAINT fk_history_server FOREIGN KEY (server_id) 
        REFERENCES servers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Failure_Alerts Table: Stores state transition failure and recovery incidents
CREATE TABLE IF NOT EXISTS failure_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    server_id BIGINT NOT NULL,
    alert_type VARCHAR(30) NOT NULL, -- FAILURE, RECOVERY, DEGRADED, STABILIZED
    previous_state VARCHAR(20),
    new_state VARCHAR(20) NOT NULL,
    failure_description TEXT NOT NULL,
    alert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    INDEX idx_alert_time (alert_time),
    INDEX idx_acknowledged (is_acknowledged),
    CONSTRAINT fk_alerts_server FOREIGN KEY (server_id) 
        REFERENCES servers(id) ON DELETE CASCADE
) ENGINE=InnoDB;
