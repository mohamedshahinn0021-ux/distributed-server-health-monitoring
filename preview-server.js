/**
 * ========================================================================
 * Distributed Server Health Monitoring and Failure Detection System
 * Standalone Node.js Preview Server (Zero External Dependencies)
 * ========================================================================
 * Implements the exact same REST API and Finite State Machine (FSM)
 * as the Java Spring Boot backend, allowing instant local testing.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const url = require('url');

const PORT = process.env.PORT || 8080;
const STATIC_DIR = path.join(__dirname, 'src', 'main', 'resources', 'static');

// In-Memory Database State matching MySQL seed data
let servers = [
  {
    id: 1,
    serverName: 'Primary Web Application',
    ipAddress: '127.0.0.1',
    port: 8080,
    protocol: 'HTTP',
    endpointPath: '/api/mock/healthy',
    currentState: 'ACTIVE',
    consecutiveSuccesses: 5,
    lastResponseTimeMs: 38,
    lastCheckedAt: new Date(Date.now() - 60000).toISOString(),
    slowThresholdMs: 400,
    description: 'Core customer-facing web application'
  },
  {
    id: 2,
    serverName: 'Cloudflare Anycast DNS',
    ipAddress: '1.1.1.1',
    port: 53,
    protocol: 'TCP',
    endpointPath: '',
    currentState: 'ACTIVE',
    consecutiveSuccesses: 8,
    lastResponseTimeMs: 25,
    lastCheckedAt: new Date(Date.now() - 120000).toISOString(),
    slowThresholdMs: 250,
    description: 'Ultra-low latency public DNS resolver node'
  },
  {
    id: 3,
    serverName: 'Google Public DNS-Primary',
    ipAddress: '8.8.8.8',
    port: 53,
    protocol: 'TCP',
    endpointPath: '',
    currentState: 'ACTIVE',
    consecutiveSuccesses: 12,
    lastResponseTimeMs: 32,
    lastCheckedAt: new Date(Date.now() - 60000).toISOString(),
    slowThresholdMs: 300,
    description: 'Global Anycast DNS server for external routing verification'
  },
  {
    id: 4,
    serverName: 'Legacy Reporting Service',
    ipAddress: '127.0.0.1',
    port: 8080,
    protocol: 'HTTP',
    endpointPath: '/api/mock/slow',
    currentState: 'SLOW',
    consecutiveSuccesses: 3,
    lastResponseTimeMs: 780,
    lastCheckedAt: new Date(Date.now() - 180000).toISOString(),
    slowThresholdMs: 400,
    description: 'Batched reporting backend experiencing heavy I/O congestion'
  },
  {
    id: 5,
    serverName: 'Disaster Recovery Database',
    ipAddress: '192.0.2.1', // Non-routable RFC 5737 test IP
    port: 3306,
    protocol: 'TCP',
    endpointPath: '',
    currentState: 'DISCONNECTED',
    consecutiveSuccesses: 0,
    lastResponseTimeMs: 0,
    lastCheckedAt: new Date(Date.now() - 240000).toISOString(),
    slowThresholdMs: 500,
    description: 'Offline standby replica server (simulated unreachable network)'
  },
  {
    id: 6,
    serverName: 'Payment Gateway Webhook',
    ipAddress: '127.0.0.1',
    port: 8080,
    protocol: 'HTTP',
    endpointPath: '/api/mock/recovering',
    currentState: 'RECOVERING',
    consecutiveSuccesses: 2,
    lastResponseTimeMs: 88,
    lastCheckedAt: new Date(Date.now() - 30000).toISOString(),
    slowThresholdMs: 500,
    description: 'Recently rebooted payment ingest daemon undergoing stability check'
  }
];

let nextServerId = 7;
let nextAlertId = 5;

let alerts = [
  {
    id: 1,
    server: servers[4],
    alertType: 'FAILURE',
    previousState: 'ACTIVE',
    newState: 'DISCONNECTED',
    failureDescription: 'CRITICAL: Disaster Recovery Database is unreachable. Network connection to 192.0.2.1:3306 timed out after 3000ms.',
    alertTime: new Date(Date.now() - 1200000).toISOString(),
    isAcknowledged: false
  },
  {
    id: 2,
    server: servers[3],
    alertType: 'DEGRADED',
    previousState: 'ACTIVE',
    newState: 'SLOW',
    failureDescription: 'WARNING: Legacy Reporting Service latency degraded to 780ms (configured threshold: 400ms).',
    alertTime: new Date(Date.now() - 600000).toISOString(),
    isAcknowledged: true
  },
  {
    id: 3,
    server: servers[5],
    alertType: 'FAILURE',
    previousState: 'ACTIVE',
    newState: 'DISCONNECTED',
    failureDescription: 'CRITICAL: Payment Gateway Webhook failed health ping. Connection refused on 127.0.0.1:8080.',
    alertTime: new Date(Date.now() - 900000).toISOString(),
    isAcknowledged: true
  },
  {
    id: 4,
    server: servers[5],
    alertType: 'RECOVERY',
    previousState: 'DISCONNECTED',
    newState: 'RECOVERING',
    failureDescription: 'NOTICE: Payment Gateway Webhook responded after downtime. Initiated 3-cycle stability validation.',
    alertTime: new Date(Date.now() - 120000).toISOString(),
    isAcknowledged: false
  }
];

let history = [
  { id: 1, server: servers[0], responseTimeMs: 45, status: 'ACTIVE', checkedAt: new Date(Date.now() - 600000).toISOString(), errorMessage: null },
  { id: 2, server: servers[0], responseTimeMs: 38, status: 'ACTIVE', checkedAt: new Date(Date.now() - 60000).toISOString(), errorMessage: null },
  { id: 3, server: servers[1], responseTimeMs: 25, status: 'ACTIVE', checkedAt: new Date(Date.now() - 120000).toISOString(), errorMessage: null },
  { id: 4, server: servers[2], responseTimeMs: 32, status: 'ACTIVE', checkedAt: new Date(Date.now() - 60000).toISOString(), errorMessage: null },
  { id: 5, server: servers[3], responseTimeMs: 780, status: 'SLOW', checkedAt: new Date(Date.now() - 180000).toISOString(), errorMessage: 'Response time exceeded threshold (780ms > 400ms)' },
  { id: 6, server: servers[4], responseTimeMs: 0, status: 'DISCONNECTED', checkedAt: new Date(Date.now() - 240000).toISOString(), errorMessage: 'Connection timed out to 192.0.2.1:3306' },
  { id: 7, server: servers[5], responseTimeMs: 88, status: 'RECOVERING', checkedAt: new Date(Date.now() - 30000).toISOString(), errorMessage: null }
];

let simulatedMockDown = false;
let recoveryCallCounter = 0;

/**
 * Finite State Machine (FSM) Evaluation Logic
 */
function evaluateFSM(server, reachable, latencyMs, errorMsg) {
  const current = server.currentState;
  const successes = server.consecutiveSuccesses || 0;
  const thresh = server.slowThresholdMs || 500;
  const name = server.serverName;
  const STABILITY_THRESHOLD = 3;

  if (!reachable) {
    if (current === 'DISCONNECTED') {
      return { newState: 'DISCONNECTED', changed: false, alertNeeded: false, successes: 0 };
    } else if (current === 'RECOVERING') {
      return {
        newState: 'DISCONNECTED',
        changed: true,
        alertNeeded: true,
        alertType: 'FAILURE',
        desc: `CRITICAL: Server '${name}' failed recovery stability check and transitioned back to DISCONNECTED. ${errorMsg || ''}`,
        successes: 0
      };
    } else {
      return {
        newState: 'DISCONNECTED',
        changed: true,
        alertNeeded: true,
        alertType: 'FAILURE',
        desc: `CRITICAL: Server '${name}' is DISCONNECTED. Connectivity failure detected on ${server.ipAddress}:${server.port}. ${errorMsg || ''}`,
        successes: 0
      };
    }
  }

  // Reachable
  const isSlow = latencyMs > thresh;

  switch (current) {
    case 'ACTIVE':
      if (isSlow) {
        return {
          newState: 'SLOW',
          changed: true,
          alertNeeded: true,
          alertType: 'DEGRADED',
          desc: `WARNING: Server '${name}' latency degraded to ${latencyMs}ms, exceeding threshold (${thresh}ms). Transitioned to SLOW.`,
          successes: successes + 1
        };
      }
      return { newState: 'ACTIVE', changed: false, alertNeeded: false, successes: successes + 1 };

    case 'SLOW':
      if (!isSlow) {
        return {
          newState: 'ACTIVE',
          changed: true,
          alertNeeded: true,
          alertType: 'RESTORED',
          desc: `NOTICE: Server '${name}' latency has recovered to normal (${latencyMs}ms <= ${thresh}ms). Transitioned to ACTIVE.`,
          successes: 1
        };
      }
      return { newState: 'SLOW', changed: false, alertNeeded: false, successes: successes + 1 };

    case 'DISCONNECTED':
      return {
        newState: 'RECOVERING',
        changed: true,
        alertNeeded: true,
        alertType: 'RECOVERY',
        desc: `RECOVERY: Server '${name}' became reachable again (${latencyMs}ms). Transitioned to RECOVERING (Stability: 1/${STABILITY_THRESHOLD}).`,
        successes: 1
      };

    case 'RECOVERING':
      const updatedCount = successes + 1;
      if (updatedCount >= STABILITY_THRESHOLD) {
        if (!isSlow) {
          return {
            newState: 'ACTIVE',
            changed: true,
            alertNeeded: true,
            alertType: 'STABILIZED',
            desc: `STABILIZED: Server '${name}' successfully passed ${updatedCount} consecutive health checks. Transitioned to ACTIVE.`,
            successes: updatedCount
          };
        } else {
          return {
            newState: 'SLOW',
            changed: true,
            alertNeeded: true,
            alertType: 'DEGRADED',
            desc: `WARNING: Server '${name}' stabilized after downtime, but response time is SLOW (${latencyMs}ms > ${thresh}ms).`,
            successes: updatedCount
          };
        }
      }
      return { newState: 'RECOVERING', changed: false, alertNeeded: false, successes: updatedCount };

    default:
      return { newState: current, changed: false, alertNeeded: false, successes };
  }
}

/**
 * Probe execution
 */
async function probeServer(server) {
  // Check for local mock targets
  if (server.ipAddress === '127.0.0.1' && server.port === 8080) {
    if (server.endpointPath === '/api/mock/healthy') {
      return { reachable: true, latencyMs: 20 + Math.floor(Math.random() * 25), error: null };
    }
    if (server.endpointPath === '/api/mock/slow') {
      return { reachable: true, latencyMs: 700 + Math.floor(Math.random() * 200), error: null };
    }
    if (server.endpointPath === '/api/mock/recovering') {
      return { reachable: true, latencyMs: 65 + Math.floor(Math.random() * 30), error: null };
    }
  }

  // Non-routable test address
  if (server.ipAddress === '192.0.2.1') {
    return { reachable: false, latencyMs: 0, error: 'Connection timed out after 3000ms' };
  }

  // Real TCP socket probe
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(2500);

    socket.connect(server.port, server.ipAddress, () => {
      if (!isResolved) {
        isResolved = true;
        const latency = Math.max(1, Date.now() - startTime);
        socket.destroy();
        resolve({ reachable: true, latencyMs: latency, error: null });
      }
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ reachable: false, latencyMs: 0, error: err.message });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ reachable: false, latencyMs: 0, error: 'Connection timed out' });
      }
    });
  });
}

/**
 * Check single server
 */
async function performServerCheck(server) {
  const probe = await probeServer(server);
  const prevState = server.currentState;
  const result = evaluateFSM(server, probe.reachable, probe.latencyMs, probe.error);

  server.currentState = result.newState;
  server.consecutiveSuccesses = result.successes;
  server.lastResponseTimeMs = probe.latencyMs;
  server.lastCheckedAt = new Date().toISOString();

  // Add history
  history.unshift({
    id: history.length + 1,
    server: { ...server },
    responseTimeMs: probe.latencyMs,
    status: result.newState,
    checkedAt: new Date().toISOString(),
    errorMessage: probe.error
  });
  if (history.length > 200) history.pop();

  // Add alert if needed
  if (result.alertNeeded) {
    alerts.unshift({
      id: nextAlertId++,
      server: { ...server },
      alertType: result.alertType,
      previousState: prevState,
      newState: result.newState,
      failureDescription: result.desc,
      alertTime: new Date().toISOString(),
      isAcknowledged: false
    });
  }

  return server;
}

// Background scheduler every 15s
setInterval(async () => {
  for (const s of servers) {
    await performServerCheck(s);
  }
}, 15000);

/**
 * HTTP Request Handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const getBody = () => new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });

  // REST API Routes
  try {
    // Auth
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = await getBody();
      if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
        return sendJson(200, {
          success: true,
          message: 'Login successful',
          data: {
            authenticated: true,
            token: 'ADM-TOKEN-' + Date.now(),
            username: 'admin',
            fullName: 'System Administrator',
            role: 'ROLE_ADMIN'
          }
        });
      }
      return sendJson(401, { success: false, message: 'Invalid username or password' });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      return sendJson(200, { success: true, message: 'Logged out successfully' });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      return sendJson(200, {
        success: true,
        data: { username: 'admin', fullName: 'System Administrator', role: 'ROLE_ADMIN' }
      });
    }

    // Dashboard Stats
    if (pathname === '/api/dashboard/stats' && method === 'GET') {
      const active = servers.filter(s => s.currentState === 'ACTIVE').length;
      const slow = servers.filter(s => s.currentState === 'SLOW').length;
      const disconnected = servers.filter(s => s.currentState === 'DISCONNECTED').length;
      const recovering = servers.filter(s => s.currentState === 'RECOVERING').length;
      const healthyResponses = history.filter(h => h.status !== 'DISCONNECTED');
      const avgMs = healthyResponses.length > 0 
        ? Math.round(healthyResponses.reduce((acc, cur) => acc + cur.responseTimeMs, 0) / healthyResponses.length) 
        : 0;

      return sendJson(200, {
        success: true,
        data: {
          totalServers: servers.length,
          activeServers: active,
          slowServers: slow,
          disconnectedServers: disconnected,
          recoveringServers: recovering,
          unacknowledgedAlerts: alerts.filter(a => !a.isAcknowledged).length,
          averageResponseTimeMs: avgMs,
          healthPercentage: servers.length > 0 ? Math.round((active / servers.length) * 1000) / 10 : 0
        }
      });
    }

    // Dashboard Chart Data
    if (pathname === '/api/dashboard/chart-data' && method === 'GET') {
      const labels = ['-10m', '-8m', '-6m', '-4m', '-2m', 'Now'];
      const datasets = servers.map((s, idx) => {
        const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1'];
        const color = colors[idx % colors.length];
        const base = s.currentState === 'DISCONNECTED' ? 0 : s.lastResponseTimeMs || 40;
        return {
          label: s.serverName,
          data: [
            Math.max(10, base + Math.floor(Math.random() * 20 - 10)),
            Math.max(10, base + Math.floor(Math.random() * 20 - 10)),
            Math.max(10, base + Math.floor(Math.random() * 20 - 10)),
            Math.max(10, base + Math.floor(Math.random() * 20 - 10)),
            Math.max(10, base + Math.floor(Math.random() * 20 - 10)),
            base
          ],
          borderColor: color,
          backgroundColor: color
        };
      });
      return sendJson(200, { success: true, data: { labels, datasets } });
    }

    // Servers List & Create
    if (pathname === '/api/servers' && method === 'GET') {
      return sendJson(200, { success: true, data: servers });
    }

    if (pathname === '/api/servers' && method === 'POST') {
      const body = await getBody();
      const newServer = {
        id: nextServerId++,
        serverName: body.serverName,
        ipAddress: body.ipAddress,
        port: parseInt(body.port, 10),
        protocol: body.protocol || 'HTTP',
        endpointPath: body.endpointPath || '/',
        currentState: 'ACTIVE',
        consecutiveSuccesses: 0,
        lastResponseTimeMs: 0,
        lastCheckedAt: null,
        slowThresholdMs: parseInt(body.slowThresholdMs, 10) || 500,
        description: body.description || ''
      };
      servers.push(newServer);
      await performServerCheck(newServer);
      return sendJson(201, { success: true, data: newServer });
    }

    // Single Server Actions
    const serverMatch = pathname.match(/^\/api\/servers\/(\d+)$/);
    if (serverMatch) {
      const id = parseInt(serverMatch[1], 10);
      const s = servers.find(x => x.id === id);
      if (!s) return sendJson(404, { success: false, message: 'Server not found' });

      if (method === 'GET') {
        return sendJson(200, { success: true, data: s });
      }
      if (method === 'PUT') {
        const body = await getBody();
        s.serverName = body.serverName || s.serverName;
        s.ipAddress = body.ipAddress || s.ipAddress;
        s.port = parseInt(body.port, 10) || s.port;
        s.protocol = body.protocol || s.protocol;
        s.endpointPath = body.endpointPath || s.endpointPath;
        s.slowThresholdMs = parseInt(body.slowThresholdMs, 10) || s.slowThresholdMs;
        s.description = body.description || s.description;
        return sendJson(200, { success: true, data: s });
      }
      if (method === 'DELETE') {
        servers = servers.filter(x => x.id !== id);
        return sendJson(200, { success: true, message: 'Server deleted' });
      }
    }

    const checkMatch = pathname.match(/^\/api\/servers\/(\d+)\/check$/);
    if (checkMatch && method === 'POST') {
      const id = parseInt(checkMatch[1], 10);
      const s = servers.find(x => x.id === id);
      if (!s) return sendJson(404, { success: false, message: 'Server not found' });
      await performServerCheck(s);
      return sendJson(200, { success: true, data: s });
    }

    if (pathname === '/api/servers/check-all' && method === 'POST') {
      for (const s of servers) {
        await performServerCheck(s);
      }
      return sendJson(200, { success: true, data: servers });
    }

    // Monitoring History
    if (pathname === '/api/history' && method === 'GET') {
      return sendJson(200, { success: true, data: history.slice(0, 100) });
    }

    // Alerts
    if (pathname === '/api/alerts' && method === 'GET') {
      return sendJson(200, { success: true, data: alerts });
    }

    const ackMatch = pathname.match(/^\/api\/alerts\/(\d+)\/acknowledge$/);
    if (ackMatch && method === 'PUT') {
      const id = parseInt(ackMatch[1], 10);
      const a = alerts.find(x => x.id === id);
      if (a) a.isAcknowledged = true;
      return sendJson(200, { success: true, data: a });
    }

    if (pathname === '/api/alerts/acknowledge-all' && method === 'POST') {
      alerts.forEach(a => { a.isAcknowledged = true; });
      return sendJson(200, { success: true, message: 'All acknowledged' });
    }

    const delAlertMatch = pathname.match(/^\/api\/alerts\/(\d+)$/);
    if (delAlertMatch && method === 'DELETE') {
      const id = parseInt(delAlertMatch[1], 10);
      alerts = alerts.filter(x => x.id !== id);
      return sendJson(200, { success: true, message: 'Alert deleted' });
    }

    if (pathname === '/api/alerts/clear-all' && method === 'DELETE') {
      alerts = [];
      return sendJson(200, { success: true, message: 'All cleared' });
    }

    // Mock Simulation Endpoints
    if (pathname === '/api/mock/healthy') {
      return sendJson(200, { status: 'UP', message: 'Healthy', timestamp: Date.now() });
    }

    if (pathname === '/api/mock/slow') {
      await new Promise(r => setTimeout(r, 750));
      return sendJson(200, { status: 'UP_SLOW', latency: 750, timestamp: Date.now() });
    }

    if (pathname === '/api/mock/recovering') {
      recoveryCallCounter++;
      return sendJson(200, { status: 'RECOVERING_SUCCESS', count: recoveryCallCounter });
    }

    if (pathname === '/api/mock/toggleable/toggle' && method === 'POST') {
      simulatedMockDown = !simulatedMockDown;
      const target = servers.find(s => s.id === 1);
      if (target) {
        if (simulatedMockDown) {
          target.ipAddress = '192.0.2.1';
        } else {
          target.ipAddress = '127.0.0.1';
        }
        await performServerCheck(target);
      }
      return sendJson(200, {
        simulatedDown: simulatedMockDown,
        message: simulatedMockDown 
          ? 'Primary Web App switched to non-routable address -> DISCONNECTED alert triggered!' 
          : 'Primary Web App restored to 127.0.0.1 -> RECOVERY cycle initiated!'
      });
    }
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(500, { success: false, message: err.message });
  }

  // Static File Serving
  let filePath = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(STATIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log('======================================================================');
  console.log(' Distributed Server Health Monitoring and Failure Detection System    ');
  console.log(` Running preview on: http://localhost:${PORT}`);
  console.log(' Admin credentials:  admin / admin123');
  console.log('======================================================================');
});
