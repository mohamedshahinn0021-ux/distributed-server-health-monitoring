/**
 * Admin Dashboard - Analytics, Charts, Tables & Socket.IO Real-Time Stream
 */

let latencyChart = null;
let distributionChart = null;
let socket = null;
let currentServers = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  protectPage();
  initSocketIO();
  loadDashboardData();

  // Setup manual refresh button if present
  const refreshBtn = document.getElementById('btn-refresh-dashboard');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadDashboardData);
  }
});

/**
 * Connect to Socket.IO for live zero-refresh updates
 */
function initSocketIO() {
  try {
    // Socket.io instance
    socket = io();

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to live monitoring stream');
      const pill = document.querySelector('.live-pill');
      if (pill) {
        pill.innerHTML = '<span class="pulse-dot"></span> LIVE ENGINE ACTIVE';
      }
    });

    socket.on('disconnect', () => {
      console.warn('[Socket.IO] Stream disconnected');
      const pill = document.querySelector('.live-pill');
      if (pill) {
        pill.innerHTML = '<span class="pulse-dot" style="background:#ef4444;"></span> RECONNECTING...';
      }
    });

    // Listen for health checks & updates
    socket.on('server_health_update', (data) => {
      handleLiveServerUpdate(data);
    });

    socket.on('server_status_transition', (transition) => {
      handleStatusTransition(transition);
    });

    socket.on('new_alert', (alert) => {
      handleNewAlert(alert);
    });

    socket.on('server_created', () => {
      loadDashboardData();
    });

    socket.on('server_deleted', () => {
      loadDashboardData();
    });
  } catch (err) {
    console.warn('Socket.IO connection could not be established immediately:', err.message);
  }
}

/**
 * Fetch and populate dashboard status
 */
async function loadDashboardData() {
  try {
    const res = await fetchWithAuth('/api/monitoring/status');
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to load monitoring status');
    }

    currentServers = data.servers || [];

    updateMetricCards(data.metrics);
    renderServerTable(currentServers);
    renderDistributionChart(data.distribution);
    renderLatencyChart(currentServers);
    renderRecentAlerts(data.recentAlerts);
    renderRecentActivity(data.recentActivity);
  } catch (error) {
    console.error('Error fetching dashboard status:', error);
    showToast(`Error: ${error.message}`, 'critical');
  }
}

/**
 * Update top numerical metric cards
 */
function updateMetricCards(metrics) {
  if (!metrics) return;

  setText('stat-total-servers', metrics.totalServers || 0);
  setText('stat-active-servers', metrics.activeServers || 0);
  setText('stat-slow-servers', metrics.slowServers || 0);
  setText('stat-disconnected-servers', metrics.disconnectedServers || 0);
  setText('stat-recovering-servers', metrics.recoveringServers || 0);
  setText('stat-availability', `${metrics.overallAvailability || 100}%`);
  setText('stat-avg-latency', `${metrics.averageResponseTime || 0} ms`);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Render Server Status Table
 */
function renderServerTable(servers) {
  const tbody = document.getElementById('server-status-tbody');
  if (!tbody) return;

  if (!servers || servers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-hdd-network fs-2 d-block mb-2"></i>
          No servers registered yet. Click <a href="servers.html" class="fw-semibold">Add Server</a> to begin.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = servers.map((s) => {
    const status = s.currentStatus || 'ACTIVE';
    const statusClass = status.toLowerCase();
    const lastChecked = s.lastCheckedAt 
      ? new Date(s.lastCheckedAt).toLocaleTimeString() 
      : 'Never';
    const latency = s.lastResponseTime ? `${s.lastResponseTime} ms` : '--';
    const statusCode = s.lastStatusCode ? s.lastStatusCode : '--';

    return `
      <tr id="server-row-${s._id}">
        <td>
          <div class="fw-semibold">${escapeHtml(s.serverName)}</div>
          <small class="text-muted text-truncate d-block" style="max-width: 200px;">
            <a href="${escapeHtml(s.serverUrl)}" target="_blank" class="text-muted text-decoration-none">
              ${escapeHtml(s.serverUrl)}
            </a>
          </small>
        </td>
        <td>
          <span class="badge-status ${statusClass}" id="badge-${s._id}">${status}</span>
        </td>
        <td>
          <span class="fw-bold font-monospace ${s.lastResponseTime > s.responseTimeThreshold ? 'text-warning' : 'text-success'}">
            ${latency}
          </span>
          <small class="text-muted d-block">&le; ${s.responseTimeThreshold}ms</small>
        </td>
        <td>
          <span class="badge bg-secondary font-monospace">${statusCode}</span>
        </td>
        <td>
          <span class="small text-muted font-monospace">${s.monitoringInterval}s</span>
        </td>
        <td>
          <span class="small text-muted" id="last-check-${s._id}">${lastChecked}</span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" title="Trigger Instant Check" onclick="triggerCheck('${s._id}')">
            <i class="bi bi-arrow-repeat"></i> Check
          </button>
          <a href="history.html?serverId=${s._id}" class="btn btn-sm btn-outline-secondary" title="View History">
            <i class="bi bi-graph-up"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Server Health Distribution Donut Chart (Chart.js)
 */
function renderDistributionChart(distribution) {
  const canvas = document.getElementById('chart-distribution');
  if (!canvas) return;

  const dataValues = [
    distribution?.ACTIVE || 0,
    distribution?.SLOW || 0,
    distribution?.DISCONNECTED || 0,
    distribution?.RECOVERING || 0,
  ];

  if (distributionChart) {
    distributionChart.data.datasets[0].data = dataValues;
    distributionChart.update();
    return;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';

  distributionChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['ACTIVE (Healthy)', 'SLOW (Degraded)', 'DISCONNECTED (Down)', 'RECOVERING (Validating)'],
      datasets: [{
        data: dataValues,
        backgroundColor: [
          '#10b981', // Green
          '#f59e0b', // Yellow
          '#ef4444', // Red
          '#3b82f6', // Blue
        ],
        borderWidth: 2,
        borderColor: isDark ? '#111827' : '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 14,
            color: textColor,
            font: { family: 'Inter', size: 11, weight: '500' },
          },
        },
      },
      cutout: '70%',
    },
  });
}

/**
 * Render Response-Time Latency Line Chart (Chart.js)
 */
function renderLatencyChart(servers) {
  const canvas = document.getElementById('chart-latency');
  if (!canvas) return;

  const labels = servers.map(s => s.serverName);
  const responseTimes = servers.map(s => s.lastResponseTime || 0);
  const thresholds = servers.map(s => s.responseTimeThreshold || 500);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (latencyChart) {
    latencyChart.data.labels = labels;
    latencyChart.data.datasets[0].data = responseTimes;
    latencyChart.data.datasets[1].data = thresholds;
    latencyChart.update();
    return;
  }

  latencyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current Response Time (ms)',
          data: responseTimes,
          backgroundColor: servers.map(s => {
            if (s.currentStatus === 'DISCONNECTED') return '#ef4444';
            if (s.currentStatus === 'SLOW') return '#f59e0b';
            if (s.currentStatus === 'RECOVERING') return '#3b82f6';
            return '#10b981';
          }),
          borderRadius: 6,
          maxBarThickness: 38,
        },
        {
          label: 'Configured Threshold (ms)',
          data: thresholds,
          type: 'line',
          borderColor: '#6366f1',
          borderDash: [5, 5],
          pointRadius: 4,
          fill: false,
        }
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Inter', size: 10 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, callback: (v) => `${v}ms` },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, color: textColor, font: { family: 'Inter', size: 11 } },
        },
      },
    },
  });
}

/**
 * Render recent failure alerts
 */
function renderRecentAlerts(alerts) {
  const container = document.getElementById('recent-alerts-list');
  if (!container) return;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted small">
        <i class="bi bi-shield-check text-success fs-3 d-block mb-1"></i>
        No active failure alerts recorded. All systems optimal.
      </div>
    `;
    return;
  }

  container.innerHTML = alerts.map(a => {
    const sev = (a.severity || 'INFO').toLowerCase();
    const time = new Date(a.createdAt).toLocaleTimeString();
    return `
      <div class="alert-feed-item ${sev}">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge bg-secondary font-monospace" style="font-size:0.68rem;">${a.alertType}</span>
            <small class="text-muted">${time}</small>
          </div>
          <div class="fw-semibold text-truncate" style="max-width: 320px;">${escapeHtml(a.message)}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Recent Monitoring Activity
 */
function renderRecentActivity(activities) {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML = `
      <li class="activity-item text-center text-muted">
        Waiting for initial health checks...
      </li>
    `;
    return;
  }

  container.innerHTML = activities.map(act => {
    const status = act.healthStatus || 'ACTIVE';
    const statusClass = status.toLowerCase();
    const time = new Date(act.checkedAt).toLocaleTimeString();
    const statusColor = act.isReachable ? 'bg-success' : 'bg-danger';

    return `
      <li class="activity-item">
        <div>
          <span class="badge ${statusColor} activity-badge me-2">${act.statusCode || 'ERR'}</span>
          <span class="badge-status ${statusClass}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${status}</span>
        </div>
        <div class="font-monospace text-muted small">${act.responseTime}ms</div>
        <div class="text-muted small">${time}</div>
      </li>
    `;
  }).join('');
}

/**
 * Trigger immediate manual health check for a server
 */
async function triggerCheck(serverId) {
  try {
    showToast('Executing health check probe...', 'info');
    const res = await fetchWithAuth(`/api/monitoring/${serverId}/check`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Probe result: ${data.result.checkResult.responseTime}ms (${data.result.fsmResult.newState})`, 'success');
      loadDashboardData();
    } else {
      showToast(data.message || 'Check failed', 'warning');
    }
  } catch (err) {
    showToast(`Failed to trigger check: ${err.message}`, 'critical');
  }
}

/**
 * Handle Live Server Health Update (Socket.IO)
 */
function handleLiveServerUpdate(payload) {
  if (!payload || !payload.server) return;

  const server = payload.server;
  const row = document.getElementById(`server-row-${server._id}`);
  
  if (row) {
    const badge = document.getElementById(`badge-${server._id}`);
    if (badge) {
      const status = server.currentStatus || 'ACTIVE';
      badge.className = `badge-status ${status.toLowerCase()}`;
      badge.textContent = status;
    }

    const lastCheck = document.getElementById(`last-check-${server._id}`);
    if (lastCheck && server.lastCheckedAt) {
      lastCheck.textContent = new Date(server.lastCheckedAt).toLocaleTimeString();
    }
  }

  // Reload status counts softly
  loadDashboardData();
}

/**
 * Handle Live State Machine Transition (Socket.IO)
 */
function handleStatusTransition(transition) {
  const typeMap = {
    DISCONNECTED: 'critical',
    SLOW: 'warning',
    RECOVERING: 'info',
    ACTIVE: 'success',
  };
  const type = typeMap[transition.newState] || 'info';
  showToast(
    `[FSM Transition] ${transition.serverName}: ${transition.previousState} &rarr; ${transition.newState} (${transition.reason})`,
    type
  );
}

/**
 * Handle Live Alert (Socket.IO)
 */
function handleNewAlert(alert) {
  const typeMap = {
    CRITICAL: 'critical',
    WARNING: 'warning',
    INFO: 'info',
    SUCCESS: 'success',
  };
  showToast(alert.message, typeMap[alert.severity] || 'info');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
