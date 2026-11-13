# Distributed Server Health Monitoring and Failure Detection System

An enterprise-grade, responsive, full-stack web application for continuous network server monitoring, automated failure detection, and health state classification powered by **Finite State Machines (FSM)**.

---

## 1. System Overview

The **Distributed Server Health Monitoring and Failure Detection System** actively tracks multiple server endpoints across distributed networks. It measures round-trip response times in milliseconds, checks reachability via TCP socket and HTTP/HTTPS probes, and uses a deterministic Finite State Machine to classify conditions, detect outages, and track recovery stability.

### Key Capabilities:
- **Continuous Health Probing:** Background daemon monitors registered servers every 15 seconds.
- **Finite State Machine (FSM):** Deterministic 4-state lifecycle engine (`ACTIVE`, `SLOW`, `DISCONNECTED`, `RECOVERING`).
- **Failure Detection & Incident Alerts:** Automated generation of critical failure alerts, latency degradation warnings, and recovery notices.
- **Stability Verification Window:** Previously disconnected servers must achieve 3 consecutive successful health cycles before returning to `ACTIVE`.
- **Modern Responsive Dashboard:** Metric cards, latency meters, interactive Chart.js response time trend charts, live searching, and state filtering.
- **Admin Authentication:** Secure admin login with password hashing and session tokens.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3, FontAwesome 6, Chart.js 4.4 |
| **Backend** | Java 17+, Spring Boot 3.2.5 (Spring Web, Spring Data JPA, Spring Security) |
| **Database** | MySQL 8.0+ (with zero-config H2 profile fallback for immediate testing) |
| **Networking** | Java Networking (`java.net.Socket`, `java.net.HttpURLConnection`) |
| **Tooling** | VS Code / IntelliJ IDEA, MySQL Workbench, Maven Wrapper |
| **Preview Runtime** | Node.js (Zero-dependency preview server for instant local launch) |

---

## 3. Finite State Machine (FSM) Lifecycle Architecture

The server condition is modeled as a deterministic Finite State Machine with 4 operational states:

```
                  +----------------------------------------------+
                  |                                              |
                  v                                              |
            +------------+  Latency > Threshold   +----------+   |
      +---->|   ACTIVE   |----------------------->|   SLOW   |   |
      |     +------------+                        +----------+   |
      |           |                                     |        |
      |           | Unreachable           Unreachable   |        |
      |           +-----------------+-------------------+        |
      |                             |                            |
      |                             v                            |
3 Successful Checks          +--------------+                    |
      |                      | DISCONNECTED |                    |
      |                      +--------------+                    |
      |                             |                            |
      |                             | First Reachable Probe      |
      |                             v                            |
      |                      +--------------+                    |
      +----------------------|  RECOVERING  |--------------------+
                             +--------------+   Failed Check
```

### State Definitions & Color Coding:
1. **ACTIVE (Green `#198754`):** Server is reachable and response time is $\le$ configured threshold (e.g. $<500\text{ms}$).
2. **SLOW (Yellow `#f59e0b`):** Server is reachable, but response time is degraded ($>500\text{ms}$).
3. **DISCONNECTED (Red `#dc3545`):** Server is unreachable, connection timed out, or connection refused.
4. **RECOVERING (Blue `#0d6efd`):** Previously disconnected server is reachable again; undergoing 3-cycle stability validation.

### State Transition Matrix:

| Initial State | Event / Probe Outcome | New State | System Action & Alert |
| :--- | :--- | :--- | :--- |
| **ACTIVE** | Unreachable | **DISCONNECTED** | Generates `FAILURE` alert; resets stability counter to 0. |
| **ACTIVE** | Reachable & Latency > Threshold | **SLOW** | Generates `DEGRADED` alert. |
| **ACTIVE** | Reachable & Latency $\le$ Threshold | **ACTIVE** | Increment pass counter; no alert. |
| **SLOW** | Reachable & Latency $\le$ Threshold | **ACTIVE** | Generates `RESTORED` alert. |
| **SLOW** | Unreachable | **DISCONNECTED** | Generates `FAILURE` alert. |
| **DISCONNECTED** | Reachable | **RECOVERING** | Generates `RECOVERY` alert; initializes stability check $1/3$. |
| **DISCONNECTED** | Unreachable | **DISCONNECTED** | Retains disconnected status. |
| **RECOVERING** | Unreachable | **DISCONNECTED** | Generates `FAILURE` alert (failed recovery check); resets counter. |
| **RECOVERING** | Reachable & Counter $< 3$ | **RECOVERING** | Stability check progress (e.g. $2/3$). |
| **RECOVERING** | Reachable & Counter $\ge 3$ & Latency $\le$ Threshold | **ACTIVE** | Generates `STABILIZED` alert; marks server operational. |
| **RECOVERING** | Reachable & Counter $\ge 3$ & Latency > Threshold | **SLOW** | Generates `DEGRADED` alert; marks server stabilized but slow. |

---

## 4. Database Design (MySQL)

Database name: `server_monitor_db`

```
  +------------------+         +-----------------------+
  |      admin       |         |        servers        |
  +------------------+         +-----------------------+
  | id (PK)          |         | id (PK)               |
  | username         |         | server_name           |
  | password         |         | ip_address            |
  | full_name        |         | port                  |
  | email            |         | protocol (HTTP/TCP)   |
  | role             |         | endpoint_path         |
  | created_at       |         | current_state (FSM)   |
  +------------------+         | consecutive_successes |
                               | last_response_time_ms |
                               | slow_threshold_ms     |
                               | last_checked_at       |
                               | description           |
                               | created_at            |
                               +-----------------------+
                                     |           |
             +-----------------------+           +-----------------------+
             | 1:N                                                       | 1:N
             v                                                           v
  +-----------------------+                                   +-----------------------+
  |  monitoring_history   |                                   |    failure_alerts     |
  +-----------------------+                                   +-----------------------+
  | id (PK)               |                                   | id (PK)               |
  | server_id (FK)        |                                   | server_id (FK)        |
  | response_time_ms      |                                   | alert_type            |
  | status                |                                   | previous_state        |
  | checked_at            |                                   | new_state             |
  | error_message         |                                   | failure_description   |
  +-----------------------+                                   | alert_time            |
                                                              | is_acknowledged       |
                                                              +-----------------------+
```

---

## 5. Project Folder Structure

```
distributed-server-monitor/
├── pom.xml                                   # Maven dependencies & build specification
├── README.md                                 # Complete documentation
├── preview-server.js                         # Instant local preview server
├── package.json                              # Preview server launcher metadata
├── run.bat                                   # Windows one-click interactive startup script
├── run.sh                                    # Linux / macOS startup script
├── database/
│   ├── schema.sql                            # DDL script creating all MySQL tables
│   └── data.sql                              # Seed data with default admin and sample servers
└── src/
    └── main/
        ├── java/com/servermonitor/
        │   ├── ServerMonitorApplication.java # Spring Boot entry point
        │   ├── config/
        │   │   ├── SecurityConfig.java       # Spring Security & BCrypt configuration
        │   │   └── SchedulerConfig.java      # Background thread pool scheduler
        │   ├── controller/
        │   │   ├── AuthController.java       # Admin login/logout & profile API
        │   │   ├── ServerController.java     # Server CRUD & manual scan API
        │   │   ├── DashboardController.java  # Aggregate metrics & Chart.js data API
        │   │   ├── HistoryController.java    # Monitoring history log API
        │   │   ├── AlertController.java      # Failure & recovery alerts API
        │   │   └── MockTestController.java   # Embedded simulation endpoints
        │   ├── dto/
        │   │   ├── ApiResponse.java          # Uniform JSON response envelope
        │   │   ├── LoginRequest.java         # Login credentials DTO
        │   │   ├── LoginResponse.java        # Authentication payload DTO
        │   │   ├── ServerRequest.java        # Server creation/update DTO with validation
        │   │   ├── DashboardStatsDto.java    # Overview metric counts DTO
        │   │   └── ChartDataDto.java         # Multi-line Chart.js data DTO
        │   ├── entity/
        │   │   ├── Admin.java                # JPA Entity for admin table
        │   │   ├── Server.java               # JPA Entity for servers table
        │   │   ├── MonitoringHistory.java    # JPA Entity for monitoring_history table
        │   │   ├── FailureAlert.java         # JPA Entity for failure_alerts table
        │   │   └── ServerState.java          # FSM Enum: ACTIVE, SLOW, DISCONNECTED, RECOVERING
        │   ├── exception/
        │   │   ├── ResourceNotFoundException.java
        │   │   └── GlobalExceptionHandler.java# Centralized JSON error responses
        │   ├── fsm/
        │   │   ├── ServerStateMachine.java   # Finite State Machine implementation
        │   │   └── StateTransitionResult.java # Transition evaluation outcome
        │   ├── repository/
        │   │   ├── AdminRepository.java
        │   │   ├── ServerRepository.java
        │   │   ├── MonitoringHistoryRepository.java
        │   │   └── FailureAlertRepository.java
        │   └── service/
        │       ├── AuthService.java          # Authentication & session token management
        │       ├── ServerService.java        # Server lifecycle operations
        │       ├── HealthMonitoringService.java # Distributed ping orchestrator
        │       ├── PingProbeService.java     # Low-level TCP & HTTP socket probe
        │       ├── AlertService.java         # Alert persistence & acknowledgment
        │       └── DashboardService.java     # Metric calculations & chart formatting
        └── resources/
            ├── application.properties        # Main Spring Boot configuration
            ├── application-mysql.properties  # MySQL database profile
            ├── application-h2.properties     # H2 in-memory development profile
            ├── schema.sql                    # Auto-initialization schema
            ├── data.sql                      # Auto-initialization seed data
            └── static/                       # Frontend Web UI (served directly on port 8080)
                ├── index.html                # Main Dashboard UI
                ├── login.html                # Admin Login UI
                ├── css/
                │   └── style.css             # Responsive styling & state colors
                └── js/
                    ├── api.js                # Centralized REST API client
                    ├── auth.js               # Login validation & session handling
                    ├── servers.js            # Server CRUD, filters & table rendering
                    ├── history.js            # History log table renderer
                    ├── alerts.js             # Alert feed & acknowledgment
                    └── dashboard.js          # Chart.js visualization & auto-refresh
```

---

## 6. Step-by-Step Instructions to Run the Application

### Option A: Using the Interactive Batch Launcher (Easiest for Windows)
1. Double-click `run.bat` in the project root.
2. Select **Option 1** for Java Spring Boot or **Option 2** for Instant Preview.
3. Your browser will automatically open: `http://localhost:8080`.

---

### Option B: Running with Java Spring Boot & MySQL

#### Step 1: Set up MySQL Database in MySQL Workbench
1. Open **MySQL Workbench**.
2. Connect to your local MySQL Server (`localhost:3306`).
3. Open and execute `database/schema.sql`:
   ```sql
   CREATE DATABASE IF NOT EXISTS server_monitor_db;
   USE server_monitor_db;
   ```
4. Open and execute `database/data.sql` to populate initial seed records.

#### Step 2: Configure Database Credentials
Verify or update `src/main/resources/application-mysql.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/server_monitor_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

#### Step 3: Run Spring Boot Application
From your terminal or inside VS Code / IntelliJ IDEA terminal:
```bash
mvn spring-boot:run
```
Or to run with the zero-dependency in-memory H2 profile:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

---

### Option C: Instant Preview (Node.js)
If you want to immediately interact with the full web dashboard without waiting to install Java or MySQL:
```bash
node preview-server.js
```
Open your browser at `http://localhost:8080`.

---

## 7. Default Credentials & Sample Server Data

### Admin Login Credentials:
- **URL:** `http://localhost:8080/login.html`
- **Username:** `admin`
- **Password:** `admin123`

### Pre-loaded Sample Servers:
1. **Primary Web Application:** `127.0.0.1:8080/api/mock/healthy` $\rightarrow$ State: **ACTIVE** ($<50\text{ms}$).
2. **Cloudflare Anycast DNS:** `1.1.1.1:53` (TCP) $\rightarrow$ State: **ACTIVE** ($\approx 25\text{ms}$).
3. **Google Public DNS:** `8.8.8.8:53` (TCP) $\rightarrow$ State: **ACTIVE** ($\approx 32\text{ms}$).
4. **Legacy Reporting Service:** `127.0.0.1:8080/api/mock/slow` $\rightarrow$ State: **SLOW** ($750\text{ms} > 400\text{ms}$ threshold).
5. **Disaster Recovery Database:** `192.0.2.1:3306` (TCP) $\rightarrow$ State: **DISCONNECTED** (RFC 5737 non-routable address; timeout).
6. **Payment Gateway Webhook:** `127.0.0.1:8080/api/mock/recovering` $\rightarrow$ State: **RECOVERING** (verifying operational stability).

---

## 8. Embedded Testing & Simulation Controls

The system includes built-in endpoints and UI buttons for live demonstration:
- **"Scan All Now" Button (Navbar):** Triggers an on-demand probe cycle across all registered servers.
- **"Toggle Mock Outage / Recovery" Button (Dashboard Banner):** Toggles the Primary Web Application IP between `127.0.0.1` and `192.0.2.1`. Clicking it demonstrates:
  - Transition from `ACTIVE` $\rightarrow$ `DISCONNECTED` with a Critical Failure Alert.
  - Subsequent transition from `DISCONNECTED` $\rightarrow$ `RECOVERING` $\rightarrow$ `ACTIVE` with Recovery and Stabilized Alerts.
- **Preset Buttons in "Add Server" Modal:** Instant 1-click population of test endpoints (`Google DNS`, `Cloudflare`, `Mock Fast`, `Mock Slow`, `Mock Down`).

---

## 9. REST API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate administrator credentials |
| `POST` | `/api/auth/logout` | Terminate session |
| `GET` | `/api/servers` | Retrieve all servers with current FSM state |
| `POST` | `/api/servers` | Register new server with initial probe |
| `PUT` | `/api/servers/{id}` | Update server details |
| `DELETE` | `/api/servers/{id}` | Delete server and associated history |
| `POST` | `/api/servers/{id}/check` | Immediate health check for single server |
| `POST` | `/api/servers/check-all` | Immediate health check for all servers |
| `GET` | `/api/dashboard/stats` | Summary metric counts and health percentage |
| `GET` | `/api/dashboard/chart-data` | Historical response times for Chart.js |
| `GET` | `/api/history` | Continuous monitoring logs |
| `GET` | `/api/alerts` | Failure and recovery alerts list |
| `PUT` | `/api/alerts/{id}/acknowledge` | Mark an incident as acknowledged |
| `DELETE` | `/api/alerts/clear-all` | Clear all alerts |
