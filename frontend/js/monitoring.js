/**
 * Real-Time Monitoring Console & FSM State Machine Simulator
 */

let socket = null;
let serversList = [];

document.addEventListener('DOMContentLoaded', () => {
  protectPage();
  initSocket();
  loadLiveServers();
  initSimulatorControls();
});

function initSocket() {
  try {
    socket = io();

    socket.on('connect', () => {
      const statusPill = document.getElementById('monitoring-live-status');
      if (statusPill) {
        statusPill.innerHTML = '<span class="pulse-dot"></span> STREAM CONNECTED';
      }
    });

    socket.on('server_health_update', (payload) => {
      handleLiveUpdate(payload);
    });

    socket.on('server_status_transition', (transition) => {
      logTransitionEvent(transition);
    });
  } catch (err) {
    console.warn('Socket connection error:', err);
  }
}

async function loadLiveServers() {
  try {
    const res = await fetchWithAuth('/api/servers');
    const data = await res.json();
    if (data.success) {
      serversList = data.servers || [];
      renderMonitoringCards(serversList);
    }
  } catch (err) {
    showToast(`Failed to load servers: ${err.message}`, 'critical');
  }
}

function renderMonitoringCards(servers) {
  const container = document.getElementById('live-server-cards');
  if (!container) return;

  if (servers.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-hdd-network fs-1 d-block mb-2"></i>
        No servers registered for monitoring.
      </div>
    `;
    return;
  }

  container.innerHTML = servers.map((s) => {
    const status = s.currentStatus || 'ACTIVE';
    const statusClass = status.toLowerCase();
    const latency = s.lastResponseTime ? `${s.lastResponseTime} ms` : '--';
    const lastChecked = s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleTimeString() : 'Never';

    return `
      <div class="col-md-6 col-lg-4 mb-4" id="monitor-card-${s._id}">
        <div class="card card-custom h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="badge-status ${statusClass}" id="card-badge-${s._id}">${status}</span>
            <small class="text-muted font-monospace">${s.monitoringInterval}s cycle</small>
          </div>
          <div class="card-body">
            <h5 class="card-title fw-bold text-truncate">${escapeHtml(s.serverName)}</h5>
            <p class="text-muted small text-truncate mb-3">${escapeHtml(s.serverUrl)}</p>

            <div class="p-3 rounded bg-body-tertiary mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-secondary small">Response Latency:</span>
                <span class="fw-bold font-monospace ${s.lastResponseTime > s.responseTimeThreshold ? 'text-warning' : 'text-success'}" id="card-latency-${s._id}">
                  ${latency}
                </span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-secondary small">Latency Threshold:</span>
                <span class="text-muted small font-monospace">&le; ${s.responseTimeThreshold} ms</span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-secondary small">HTTP Status:</span>
                <span class="badge bg-secondary font-monospace" id="card-status-${s._id}">${s.lastStatusCode || '--'}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-secondary small">Last Probed:</span>
                <span class="text-muted small" id="card-time-${s._id}">${lastChecked}</span>
              </div>
            </div>

            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="triggerSingleCheck('${s._id}')">
                <i class="bi bi-arrow-repeat"></i> Probe Now
              </button>
              <a href="history.html?serverId=${s._id}" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-graph-up"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleLiveUpdate(payload) {
  const { server, checkResult, fsmResult } = payload;
  if (!server) return;

  const card = document.getElementById(`monitor-card-${server._id}`);
  if (card) {
    const badge = document.getElementById(`card-badge-${server._id}`);
    if (badge) {
      badge.className = `badge-status ${(server.currentStatus || 'ACTIVE').toLowerCase()}`;
      badge.textContent = server.currentStatus || 'ACTIVE';
    }

    const latencyEl = document.getElementById(`card-latency-${server._id}`);
    if (latencyEl) {
      latencyEl.textContent = `${checkResult.responseTime} ms`;
      latencyEl.className = `fw-bold font-monospace ${checkResult.responseTime > server.responseTimeThreshold ? 'text-warning' : 'text-success'}`;
    }

    const statusEl = document.getElementById(`card-status-${server._id}`);
    if (statusEl) {
      statusEl.textContent = checkResult.statusCode || 'ERR';
    }

    const timeEl = document.getElementById(`card-time-${server._id}`);
    if (timeEl) {
      timeEl.textContent = new Date(checkResult.checkedAt).toLocaleTimeString();
    }
  }
}

function logTransitionEvent(transition) {
  const logContainer = document.getElementById('fsm-transition-log');
  if (!logContainer) return;

  const emptyMsg = logContainer.querySelector('.text-muted-empty');
  if (emptyMsg) emptyMsg.remove();

  const item = document.createElement('div');
  item.className = 'p-2 mb-2 rounded border bg-body-tertiary small';
  
  const typeMap = {
    DISCONNECTED: 'text-danger',
    SLOW: 'text-warning',
    RECOVERING: 'text-primary',
    ACTIVE: 'text-success',
  };

  const colorClass = typeMap[transition.newState] || 'text-info';

  item.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-1">
      <strong class="text-primary">${escapeHtml(transition.serverName)}</strong>
      <span class="text-muted" style="font-size:0.75rem;">${new Date(transition.timestamp).toLocaleTimeString()}</span>
    </div>
    <div class="mb-1">
      <span class="badge bg-secondary font-monospace">${transition.previousState}</span>
      &rarr;
      <span class="fw-bold ${colorClass}">${transition.newState}</span>
    </div>
    <div class="text-secondary" style="font-size: 0.78rem;">${escapeHtml(transition.reason)}</div>
  `;

  logContainer.prepend(item);

  // Keep max 20 log items
  while (logContainer.children.length > 20) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

async function triggerSingleCheck(serverId) {
  try {
    showToast('Executing health probe...', 'info');
    const res = await fetchWithAuth(`/api/monitoring/${serverId}/check`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`Probe result: ${data.result.checkResult.responseTime}ms (${data.result.fsmResult.newState})`, 'success');
      loadLiveServers();
    }
  } catch (err) {
    showToast(`Probe error: ${err.message}`, 'critical');
  }
}

/**
 * Initialize Failure Injection & FSM Simulator Controls
 */
function initSimulatorControls() {
  const btnHealthy = document.getElementById('sim-btn-healthy');
  const btnSlow = document.getElementById('sim-btn-slow');
  const btnError = document.getElementById('sim-btn-error');
  const btnFlaky = document.getElementById('sim-btn-flaky');

  if (btnHealthy) {
    btnHealthy.addEventListener('click', () => setMockState('healthy', 'Normal Healthy Mode (<50ms)'));
  }
  if (btnSlow) {
    btnSlow.addEventListener('click', () => setMockState('slow', 'Degraded Latency Mode (>800ms)'));
  }
  if (btnError) {
    btnError.addEventListener('click', () => setMockState('error', 'Full Outage / Disconnected Mode (HTTP 500)'));
  }
  if (btnFlaky) {
    btnFlaky.addEventListener('click', () => setMockState(null, 'Cyclic State Recovery Simulator'));
  }
}

async function setMockState(state, description) {
  try {
    const res = await fetch('/api/mock/set-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    const data = await res.json();
    showToast(`Simulator updated: ${description}`, 'info');
  } catch (err) {
    showToast(`Simulator error: ${err.message}`, 'critical');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
