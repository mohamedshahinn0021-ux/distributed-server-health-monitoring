/**
 * Server Management & Table Interaction Module
 */

let allServers = [];
let currentFilter = 'ALL';
let currentSearch = '';

function initServerManagement() {
  const searchInput = document.getElementById('server-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderServerTable();
    });
  }

  // Filter Buttons
  const filterButtons = document.querySelectorAll('[data-server-filter]');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-server-filter');
      renderServerTable();
    });
  });

  // Add Server Form Submit
  const addForm = document.getElementById('add-server-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddServer);
  }

  // Edit Server Form Submit
  const editForm = document.getElementById('edit-server-form');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdateServer);
  }

  // Preset Buttons for quick demo testing
  const presetButtons = document.querySelectorAll('[data-preset]');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.getAttribute('data-preset')));
  });
}

async function loadServers() {
  try {
    const res = await Api.getServers();
    if (res && res.success) {
      allServers = res.data || [];
      renderServerTable();
    }
  } catch (err) {
    console.error('Error fetching servers:', err);
    showToast('Failed to load server list: ' + err.message, 'danger');
  }
}

function renderServerTable() {
  const tbody = document.getElementById('servers-table-body');
  const countBadge = document.getElementById('table-count-badge');
  if (!tbody) return;

  const filtered = allServers.filter(s => {
    const matchesFilter = currentFilter === 'ALL' || s.currentState === currentFilter;
    const matchesSearch = !currentSearch ||
      s.serverName.toLowerCase().includes(currentSearch) ||
      s.ipAddress.toLowerCase().includes(currentSearch) ||
      s.protocol.toLowerCase().includes(currentSearch);
    return matchesFilter && matchesSearch;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${allServers.length}`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="fas fa-server fa-2x mb-2 text-black-50 d-block"></i>
          No servers matching the selected criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(server => {
    const stateBadge = getStateBadgeHtml(server.currentState);
    const latencyHtml = getLatencyHtml(server);
    const lastChecked = server.lastCheckedAt 
      ? formatRelativeTime(server.lastCheckedAt) 
      : '<span class="text-muted">Never</span>';

    return `
      <tr>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(server.serverName)}</div>
          <small class="text-muted">${escapeHtml(server.description || 'No description')}</small>
        </td>
        <td>
          <span class="badge bg-light text-dark border">
            ${server.protocol}://${escapeHtml(server.ipAddress)}:${server.port}${server.endpointPath || ''}
          </span>
        </td>
        <td>${stateBadge}</td>
        <td>${latencyHtml}</td>
        <td><small class="text-muted">${lastChecked}</small></td>
        <td>
          <small class="badge bg-secondary-subtle text-secondary">
            ${server.currentState === 'RECOVERING' ? `${server.consecutiveSuccesses}/3 checks` : `${server.consecutiveSuccesses || 0} passes`}
          </small>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" title="Check Health Now" onclick="triggerCheckServer(${server.id}, this)">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button class="btn btn-outline-secondary" title="Edit Server" onclick="openEditModal(${server.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger" title="Delete Server" onclick="confirmDeleteServer(${server.id}, '${escapeHtml(server.serverName)}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getStateBadgeHtml(state) {
  switch (state) {
    case 'ACTIVE':
      return `<span class="state-badge badge-active"><span class="pulse-indicator"></span>ACTIVE</span>`;
    case 'SLOW':
      return `<span class="state-badge badge-slow"><i class="fas fa-tachometer-alt"></i>SLOW</span>`;
    case 'DISCONNECTED':
      return `<span class="state-badge badge-disconnected"><i class="fas fa-times-circle"></i>DISCONNECTED</span>`;
    case 'RECOVERING':
      return `<span class="state-badge badge-recovering"><i class="fas fa-heartbeat"></i>RECOVERING</span>`;
    default:
      return `<span class="badge bg-secondary">${state}</span>`;
  }
}

function getLatencyHtml(server) {
  if (server.currentState === 'DISCONNECTED') {
    return `<span class="text-danger small fw-bold"><i class="fas fa-unlink me-1"></i>Unreachable</span>`;
  }

  const ms = server.lastResponseTimeMs || 0;
  const thresh = server.slowThresholdMs || 500;
  let color = 'bg-success';
  if (ms > thresh) color = 'bg-warning';
  if (ms > thresh * 2) color = 'bg-danger';

  const widthPct = Math.min(100, Math.max(8, (ms / 1000) * 100));

  return `
    <div class="latency-meter">
      <div class="latency-bar-bg">
        <div class="latency-bar-fill ${color}" style="width: ${widthPct}%"></div>
      </div>
      <span class="fw-bold small ${ms > thresh ? 'text-warning' : 'text-dark'}">${ms} ms</span>
    </div>
  `;
}

async function triggerCheckServer(id, btn) {
  const icon = btn.querySelector('i');
  if (icon) icon.classList.add('fa-spin');
  btn.disabled = true;

  try {
    const res = await Api.checkServer(id);
    if (res && res.success) {
      showToast(`Health check complete for ${res.data.serverName}: State is ${res.data.currentState}`, 'success');
      await refreshAllData();
    }
  } catch (err) {
    showToast('Health check failed: ' + err.message, 'danger');
  } finally {
    if (icon) icon.classList.remove('fa-spin');
    btn.disabled = false;
  }
}

async function handleAddServer(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    serverName: form.serverName.value.trim(),
    ipAddress: form.ipAddress.value.trim(),
    port: parseInt(form.port.value, 10),
    protocol: form.protocol.value,
    endpointPath: form.endpointPath.value.trim() || '/',
    slowThresholdMs: parseInt(form.slowThresholdMs.value, 10) || 500,
    description: form.description.value.trim()
  };

  try {
    const res = await Api.createServer(data);
    if (res && res.success) {
      showToast(`Server '${data.serverName}' added successfully. Initial state: ${res.data.currentState}`, 'success');
      form.reset();
      const modal = bootstrap.Modal.getInstance(document.getElementById('addServerModal'));
      if (modal) modal.hide();
      await refreshAllData();
    }
  } catch (err) {
    showToast('Failed to add server: ' + err.message, 'danger');
  }
}

async function openEditModal(id) {
  try {
    const res = await Api.getServer(id);
    if (res && res.success) {
      const server = res.data;
      const form = document.getElementById('edit-server-form');
      form.editServerId.value = server.id;
      form.serverName.value = server.serverName;
      form.ipAddress.value = server.ipAddress;
      form.port.value = server.port;
      form.protocol.value = server.protocol || 'HTTP';
      form.endpointPath.value = server.endpointPath || '/';
      form.slowThresholdMs.value = server.slowThresholdMs || 500;
      form.description.value = server.description || '';

      const modal = new bootstrap.Modal(document.getElementById('editServerModal'));
      modal.show();
    }
  } catch (err) {
    showToast('Failed to load server details: ' + err.message, 'danger');
  }
}

async function handleUpdateServer(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.editServerId.value;
  const data = {
    serverName: form.serverName.value.trim(),
    ipAddress: form.ipAddress.value.trim(),
    port: parseInt(form.port.value, 10),
    protocol: form.protocol.value,
    endpointPath: form.endpointPath.value.trim() || '/',
    slowThresholdMs: parseInt(form.slowThresholdMs.value, 10) || 500,
    description: form.description.value.trim()
  };

  try {
    const res = await Api.updateServer(id, data);
    if (res && res.success) {
      showToast(`Server '${data.serverName}' updated successfully`, 'success');
      const modal = bootstrap.Modal.getInstance(document.getElementById('editServerModal'));
      if (modal) modal.hide();
      await refreshAllData();
    }
  } catch (err) {
    showToast('Failed to update server: ' + err.message, 'danger');
  }
}

async function confirmDeleteServer(id, name) {
  if (confirm(`Are you sure you want to delete server "${name}"? All associated monitoring history and alerts will also be removed.`)) {
    try {
      const res = await Api.deleteServer(id);
      if (res && res.success) {
        showToast(`Server "${name}" deleted`, 'info');
        await refreshAllData();
      }
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'danger');
    }
  }
}

function applyPreset(presetType) {
  const form = document.getElementById('add-server-form');
  if (!form) return;

  switch (presetType) {
    case 'google-dns':
      form.serverName.value = 'Google Anycast DNS';
      form.ipAddress.value = '8.8.8.8';
      form.port.value = '53';
      form.protocol.value = 'TCP';
      form.endpointPath.value = '';
      form.slowThresholdMs.value = '250';
      form.description.value = 'Public DNS probe node for global routing check';
      break;
    case 'cloudflare-dns':
      form.serverName.value = 'Cloudflare 1.1.1.1';
      form.ipAddress.value = '1.1.1.1';
      form.port.value = '53';
      form.protocol.value = 'TCP';
      form.endpointPath.value = '';
      form.slowThresholdMs.value = '200';
      form.description.value = 'High performance public Anycast resolver';
      break;
    case 'mock-healthy':
      form.serverName.value = 'Fast Microservice API';
      form.ipAddress.value = '127.0.0.1';
      form.port.value = '8080';
      form.protocol.value = 'HTTP';
      form.endpointPath.value = '/api/mock/healthy';
      form.slowThresholdMs.value = '300';
      form.description.value = 'Local mock endpoint returning 200 OK (<30ms)';
      break;
    case 'mock-slow':
      form.serverName.value = 'Congested Analytics Node';
      form.ipAddress.value = '127.0.0.1';
      form.port.value = '8080';
      form.protocol.value = 'HTTP';
      form.endpointPath.value = '/api/mock/slow';
      form.slowThresholdMs.value = '400';
      form.description.value = 'Simulates high latency backend (750ms > 400ms threshold)';
      break;
    case 'mock-disconnected':
      form.serverName.value = 'Unreachable Standby Host';
      form.ipAddress.value = '192.0.2.1'; // RFC 5737 test address guaranteed non-routable
      form.port.value = '9999';
      form.protocol.value = 'TCP';
      form.endpointPath.value = '';
      form.slowThresholdMs.value = '500';
      form.description.value = 'Simulates network connectivity failure and timeout';
      break;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function formatRelativeTime(dateString) {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateString;
  }
}
