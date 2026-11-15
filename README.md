# Distributed Server Health Monitoring and Failure Detection System

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-brightgreen.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x%20Real--Time-black.svg)](https://socket.io/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-orange.svg)](https://www.chartjs.org/)

A production-grade, advanced enterprise web application designed to continuously monitor distributed servers through network connectivity checks, HTTP health checks, and precision response-time measurements.

The system features an automated **Finite State Machine (FSM)** engine that dynamically evaluates server conditions into four states: **ACTIVE**, **SLOW**, **DISCONNECTED**, and **RECOVERING**, accompanied by real-time failure detection, alert generation, and interactive dashboard telemetry via WebSockets.

---

## 1. System Architecture & Objective

The objective is to provide site reliability engineers (SRE) and system administrators with complete visibility into distributed server fleets.

### Finite State Machine (FSM) States
| State | Badge Color | Description |
|---|---|---|
| **ACTIVE** | 🟢 **Green** (`#10b981`) | Server is responding normally with HTTP 2xx/3xx and latency within configured threshold. |
| **SLOW** | 🟡 **Yellow** (`#f59e0b`) | Server is responding, but response latency exceeds configured milliseconds threshold. |
| **DISCONNECTED** | 🔴 **Red** (`#ef4444`) | Server is unreachable or health checks repeatedly fail ($\ge$ 3 consecutive failures). |
| **RECOVERING** | 🔵 **Blue** (`#3b82f6`) | A previously disconnected server has started responding again and is being verified for stability ($\ge$ 3 checks). |

### Valid State Transitions
```
                Latency > Threshold
     ┌───────────────────────────────────────┐
     │                                       ▼
┌─────────┐      Latency <= Threshold      ┌──────────┐
│         │ ◄───────────────────────────── │          │
│ ACTIVE  │                                │   SLOW   │
│         │ ─── Repeated Failures (>=3) ──►│          │
└─────────┘                                └──────────┘
     │                                           │
     │ Repeated Failures (>=3)                   │ Repeated Failures (>=3)
     ▼                                           ▼
┌─────────────────────────────────────────────────────┐
│                    DISCONNECTED                     │
└─────────────────────────────────────────────────────┘
     │                                           ▲
     │ Reachable probe (1st success)             │ Probe fails during recovery
     ▼                                           │
┌─────────────────────────────────────────────────────┐
│                     RECOVERING                      │
└─────────────────────────────────────────────────────┘
     │
     └── 3 Consecutive Successes ─────────────► ACTIVE (or SLOW if latency high)
```

---

## 2. Technology Stack

### Frontend
- **HTML5 & CSS3**: Modern glassmorphic enterprise styling, custom scrollbars, and pulsing animations.
- **JavaScript (ES6+)**: Clean, asynchronous event-driven client architecture.
- **Bootstrap 5**: Responsive layout, modal dialogs, badges, and utility classes.
- **Chart.js**: Interactive real-time latency bar/line graphs and donut health distributions.
- **Socket.IO Client**: Zero-refresh bi-directional WebSocket streaming.

### Backend
- **Node.js & Express.js**: High-performance asynchronous REST API server.
- **`server.js`**: Main backend application entry point.
- **MongoDB & Mongoose**: Object Data Modeling (ODM) with indexes and relationships.
- **Resilient Dual Storage**: Native MongoDB connection with automatic, zero-config in-memory fallback for offline test environments.
- **Axios**: Precision HTTP health check probing.
- **Socket.IO**: Real-time broadcast engine (`server_health_update`, `server_status_transition`, `new_alert`).
- **PBKDF2 & JWT Security**: Military-grade password hashing and tokenized route protection.
- **SSRF Defense**: Strict HTTP/HTTPS validation blocking internal metadata addresses (`169.254.169.254`).

---

## 3. Project Directory Structure

```
distributed-server-monitor/
├── server.js                          # Root Backend Entry Point
├── package.json                       # Project configuration & npm scripts
├── test-system.js                     # Automated 35-test integration suite
│
├── backend/                           # Complete Modular Backend Structure
│   ├── server.js                      # Main Express & Socket.IO initialization
│   ├── .env                           # Environment variables configuration
│   ├── .env.example                   # Environment template
│   ├── package.json                   # Backend dependencies manifest
│   ├── config/
│   │   └── db.js                      # MongoDB connection & dual-mode fallback
│   ├── models/
│   │   ├── Admin.js                   # Administrator user Mongoose model
│   │   ├── Server.js                  # Target server Mongoose model
│   │   ├── MonitoringHistory.js       # Historical probe record model
│   │   └── Alert.js                   # Failure & warning alert model
│   ├── controllers/
│   │   ├── authController.js          # Authentication (login/register/profile)
│   │   ├── serverController.js        # Server fleet management (CRUD)
│   │   ├── monitoringController.js    # Health checks & dashboard KPIs
│   │   └── alertController.js         # Alerts management & filters
│   ├── routes/
│   │   ├── authRoutes.js              # /api/auth endpoints
│   │   ├── serverRoutes.js            # /api/servers endpoints
│   │   ├── monitoringRoutes.js        # /api/monitoring endpoints
│   │   ├── alertRoutes.js             # /api/alerts endpoints
│   │   └── mockRoutes.js              # /api/mock test endpoints
│   ├── services/
│   │   ├── fsmService.js              # Finite State Machine implementation
│   │   ├── monitoringService.js       # Continuous scheduler & HTTP probes
│   │   ├── failureDetectionService.js # Downtime detection & alert triggers
│   │   └── alertService.js            # Alert storage & deduplication
│   ├── middleware/
│   │   └── authMiddleware.js          # JWT Bearer token route guard
│   └── utils/
│       ├── responseTime.js            # Health checker & SSRF validator
│       └── cryptoAuth.js              # PBKDF2 hashing & JWT utilities
│
└── frontend/                          # Professional Frontend Dashboard
    ├── index.html                     # Enterprise landing page & portal
    ├── login.html                     # Admin login & registration page
    ├── dashboard.html                 # Main monitoring dashboard
    ├── servers.html                   # Server fleet management interface
    ├── monitoring.html                # Live console & FSM simulator
    ├── alerts.html                    # Failure detection alerts center
    ├── history.html                   # Historical reports & latency trends
    ├── css/
    │   ├── style.css                  # Theme variables (Dark/Light) & base CSS
    │   └── dashboard.css              # Widgets, cards, and chart styles
    └── js/
        ├── auth.js                    # Session management & route protection
        ├── dashboard.js               # Dashboard charts & live Socket.IO feed
        ├── servers.js                 # Server CRUD & modal handlers
        ├── monitoring.js              # Real-time console & simulator controls
        ├── alerts.js                  # Alert filtering & actions
        └── history.js                 # History charts & uptime calculations
```

---

## 4. Database Collections & Schema Design

### Admin Collection
```javascript
{
  username:  { type: String, required: true, unique: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true }, // PBKDF2/bcrypt hash
  createdAt: { type: Date, default: Date.now }
}
```

### Server Collection
```javascript
{
  serverName:             { type: String, required: true },
  serverUrl:              { type: String, required: true },
  description:            { type: String, default: '' },
  monitoringInterval:     { type: Number, default: 10 },   // In seconds (3-3600)
  responseTimeThreshold:  { type: Number, default: 500 },  // In ms (20-30000)
  currentStatus:          { type: String, enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'], default: 'ACTIVE' },
  isMonitoring:           { type: Boolean, default: true },
  consecutiveFailures:    { type: Number, default: 0 },
  consecutiveSuccesses:   { type: Number, default: 0 },
  lastResponseTime:       { type: Number, default: 0 },
  lastStatusCode:         { type: Number, default: 0 },
  lastCheckedAt:          { type: Date, default: null },
  createdAt:              { type: Date, default: Date.now },
  updatedAt:              { type: Date, default: Date.now }
}
```

### MonitoringHistory Collection
```javascript
{
  serverId:     { type: ObjectId, ref: 'Server', required: true, index: true },
  responseTime: { type: Number, required: true },
  statusCode:   { type: Number, required: true },
  healthStatus: { type: String, enum: ['ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'], required: true },
  isReachable:  { type: Boolean, required: true },
  checkedAt:    { type: Date, default: Date.now, index: true },
  errorMessage: { type: String, default: null }
}
```

### Alert Collection
```javascript
{
  serverId:   { type: ObjectId, ref: 'Server', required: true, index: true },
  alertType:  { type: String, enum: ['DISCONNECTED', 'SLOW_PERFORMANCE', 'RECOVERING', 'RECOVERY_COMPLETED', 'INFO'], default: 'DISCONNECTED' },
  message:    { type: String, required: true },
  severity:   { type: String, enum: ['CRITICAL', 'WARNING', 'INFO', 'SUCCESS'], default: 'INFO' },
  isRead:     { type: Boolean, default: false, index: true },
  createdAt:  { type: Date, default: Date.now, index: true }
}
```

---

## 5. REST API Documentation

### Authentication
- `POST /api/auth/register` - Create a new administrator account.
- `POST /api/auth/login` - Authenticate administrator & return JWT token.
- `GET /api/auth/profile` - Get current authenticated admin details *(Protected)*.

### Server Management
- `GET /api/servers` - List all registered servers (Supports `?status=&search=`).
- `POST /api/servers` - Register a new target server *(Protected)*.
- `GET /api/servers/:id` - Fetch details for a specific server.
- `PUT /api/servers/:id` - Update server URL, threshold, or interval *(Protected)*.
- `PATCH /api/servers/:id/toggle` - Pause or resume monitoring for a server *(Protected)*.
- `DELETE /api/servers/:id` - Cascade delete server, history, and alerts *(Protected)*.

### Health Monitoring & History
- `GET /api/monitoring/status` - Aggregated dashboard metrics, state counts, and availability percentage.
- `GET /api/monitoring/:serverId` - Single server status with latest history.
- `POST /api/monitoring/:serverId/check` - Trigger an immediate manual probe.
- `GET /api/monitoring/history/:serverId` - Historical records with date filtering (`?startDate=&endDate=&limit=`).

### Alerts
- `GET /api/alerts` - List alerts (Supports `?severity=&isRead=&limit=`).
- `GET /api/alerts/:id` - Fetch single alert by ID.
- `PUT /api/alerts/:id/read` - Mark specific alert as read *(Protected)*.
- `PUT /api/alerts/read-all` - Mark all alerts as read *(Protected)*.
- `DELETE /api/alerts/:id` - Delete an alert *(Protected)*.
- `DELETE /api/alerts/clear-all` - Permanently clear all alerts *(Protected)*.

### Mock Simulation Endpoints (For Demonstration & Assessment)
- `GET /api/mock/healthy` - Responds within 20-50ms (tests `ACTIVE`).
- `GET /api/mock/slow` - Delays 800ms+ (tests `SLOW`).
- `GET /api/mock/error` - Returns HTTP 500 (tests `DISCONNECTED`).
- `GET /api/mock/flaky` - Cyclic mode testing `RECOVERING` $\rightarrow$ `ACTIVE`.
- `POST /api/mock/set-state` - Dynamically toggle simulation behavior from UI.

---

## 6. Installation & Execution Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **MongoDB** (Local instance or MongoDB Atlas connection string)
  - *Note: If MongoDB is not running locally, the application automatically initializes an active in-memory operational engine so you can evaluate the platform instantly!*

### Step 1: Clone or Navigate to the Project
```bash
cd distributed-server-monitor
```

### Step 2: Environment Configuration
Create or review `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/distributed_server_monitor
JWT_SECRET=super_secure_server_monitoring_secret_key_2026
CLIENT_URL=http://localhost:5000
```

### Step 3: Run the Automated Verification Suite
Verify all 35 system and integration tests:
```bash
node test-system.js
```
Expected output: `🎉 TEST SUMMARY: 35 PASSED, 0 FAILED`.

### Step 4: Start the Application
Run the root `server.js` entry point:
```bash
npm start
# OR directly:
node server.js
```

### Step 5: Access the Web Dashboard
Open your browser and navigate to:
```
http://localhost:5000
```
- **Admin Dashboard**: `http://localhost:5000/dashboard.html`
- **Admin Login**: `http://localhost:5000/login.html`
- **Server Fleet**: `http://localhost:5000/servers.html`
- **Live Console**: `http://localhost:5000/monitoring.html`
- **Alerts Center**: `http://localhost:5000/alerts.html`
- **Historical Reports**: `http://localhost:5000/history.html`

### Default Evaluation Credentials
- **Username**: `admin`
- **Password**: `admin123`

---

## 7. Interactive Evaluation & Demonstration Walkthrough

1. **Sign In**: Visit `http://localhost:5000/login.html` and sign in with `admin` / `admin123`.
2. **Dashboard Overview**: Check the 7 KPI cards, the response-time comparison chart, and the FSM distribution doughnut.
3. **Register a Server**: Go to **Server Management**, click **Add New Server**, enter a name and target URL (e.g. `https://1.1.1.1` or `http://localhost:5000/api/mock/healthy`).
4. **Trigger Manual Probes**: Click the **Check** button on any server row to run an immediate on-demand health check.
5. **Interactive FSM Simulator**:
   - Go to **Live Console** (`monitoring.html`).
   - Click **Force Slow Latency**: Watch the node transition to 🟡 **SLOW** with warning alerts.
   - Click **Inject Failure**: Watch the node fail health checks and transition to 🔴 **DISCONNECTED** with a Critical Alert.
   - Click **Cyclic Recovery**: Watch the node begin stability probing (🔵 **RECOVERING**) and transition back to 🟢 **ACTIVE** after 3 consecutive successful checks!
6. **Dark / Light Theme**: Click the theme toggle icon in the top header to seamlessly switch themes.

---

## 8. License & Assessment Attribution
Developed as an advanced-level Distributed Server Health Monitoring and Failure Detection System following enterprise full-stack design patterns.
