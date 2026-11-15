/**
 * Server Management Client Logic (CRUD, Filtering, Real-Time Sync)
 */

let allServers = [];
let deleteTargetId = null;
let editModalInstance = null;
let addModalInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  protectPage();
  initModals();
  loadServers();
  initEventHandlers();
  initSocket();
});

function initModals() {
  const addModalEl = document.getElementById('addServerModal');
  if (addModalEl) {
    addModalInstance = new bootstrap.Modal(addModalEl);
  }

  const editModalEl = document.getElementById('editServerModal');
  if (editModalEl) {
    editModalInstance = new bootstrap.Modal(editModalEl);
  }
}

function initSocket() {
  try {
    const socket = io();
    socket.on('server_created', () => loadServers());
    socket.on('server_updated', () => loadServers());
    socket.on('server_deleted', () => loadServers());
    socket.on('server_health_update', () => loadServers());
  } catch (e) {
    console.warn('Socket.IO not available:', e);
  }
}

function initEventHandlers() {
  // Search input filter
  const searchInput = document.getElementById('server-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterAndRenderServers());
  }

  // Status dropdown filter
  const statusFilter = document.getElementById('server-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => filterAndRenderServers());
  }

  // Add Server Form Submission
  const addForm = document.getElementById('form-add-server');
  if (addForm) {
    addForm.addEventListener('submit', handleAddServer);
  }

  // Edit Server Form Submission
  const editForm = document.getElementById('form-edit-server');
  if (editForm) {
    editForm.addEventListener('submit', handleEditServer);
  }

  // Confirm Delete Button
  const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }
}

/**
 * Fetch all registered servers from backend REST API
 */
async function loadServers() {
  try {
    const res = await fetchWithAuth('/api/servers');
    const data = await res.json();

    if (data.success) {
      allServers = data.servers || [];
      filterAndRenderServers();
    } else {
      showToast(data.message || 'Failed to load servers', 'critical');
    }
  } catch (error) {
    console.error('Failed to load servers:', error);
    showToast(`Error: ${error.message}`, 'critical');
  }
}

/**
 * Filter and display servers in table
 */
function filterAndRenderServers() {
  const searchVal = (document.getElementById('server-search-input')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('server-status-filter')?.value || 'ALL';

  const filtered = allServers.filter((s) => {
    // Status filter
    if (statusVal !== 'ALL' && s.currentStatus !== statusVal) {
      return false;
    }
    // Search filter
    if (searchVal) {
      const nameMatch = s.serverName && s.serverName.toLowerCase().includes(searchVal);
      const urlMatch = s.serverUrl && s.serverUrl.toLowerCase().includes(searchVal);
      const descMatch = s.description && s.description.toLowerCase().includes(searchVal);
      if (!nameMatch && !urlMatch && !descMatch) return false;
    }
    return true;
  });

  renderServerCards(filtered);
}

/**
 * Render servers table / cards
 */
function renderServerCards(servers) {
  const container = document.getElementById('servers-table-body');
  if (!container) return;

  if (servers.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <i class="bi bi-hdd-network fs-1 d-block mb-2"></i>
          No servers found matching your criteria.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = servers.map((s) => {
    const status = s.currentStatus || 'ACTIVE';
    const statusClass = status.toLowerCase();
    const lastChecked = s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleTimeString() : 'Never';
    const latency = s.lastResponseTime ? `${s.lastResponseTime} ms` : '--';
    const isMonitoring = s.isMonitoring !== false;

    return `
      <tr>
        <td>
          <div class="fw-bold text-primary">${escapeHtml(s.serverName)}</div>
          <small class="text-muted">${escapeHtml(s.description || 'No description provided')}</small>
        </td>
        <td>
          <a href="${escapeHtml(s.serverUrl)}" target="_blank" class="font-monospace text-decoration-none small">
            ${escapeHtml(s.serverUrl)} <i class="bi bi-box-arrow-up-right" style="font-size:0.7rem;"></i>
          </a>
        </td>
        <td>
          <span class="badge-status ${statusClass}">${status}</span>
        </td>
        <td>
          <span class="fw-semibold font-monospace">${latency}</span>
          <small class="text-muted d-block">&le; ${s.responseTimeThreshold}ms</small>
        </td>
        <td>
          <span class="badge bg-secondary font-monospace">${s.monitoringInterval}s</span>
        </td>
        <td>
          <div class="form-check form-switch">
            <input 
              class="form-check-input" 
              type="checkbox" 
              role="switch" 
              ${isMonitoring ? 'checked' : ''} 
              onchange="toggleMonitoring('${s._id}')"
              title="${isMonitoring ? 'Disable' : 'Enable'} Monitoring"
            >
          </div>
        </td>
        <td>
          <span class="small text-muted">${lastChecked}</span>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" title="Check Now" onclick="triggerServerCheck('${s._id}')">
              <i class="bi bi-arrow-repeat"></i>
            </button>
            <button class="btn btn-outline-warning" title="Edit Server" onclick="openEditModal('${s._id}')">
              <i class="bi bi-pencil-square"></i>
            </button>
            <a href="history.html?serverId=${s._id}" class="btn btn-outline-info" title="History Analytics">
              <i class="bi bi-graph-up"></i>
            </a>
            <button class="btn btn-outline-danger" title="Delete Server" onclick="promptDelete('${s._id}', '${escapeHtml(s.serverName)}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Handle Add Server form submit
 */
async function handleAddServer(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const serverName = form.serverName.value.trim();
  const serverUrl = form.serverUrl.value.trim();
  const description = form.description.value.trim();
  const monitoringInterval = parseInt(form.monitoringInterval.value, 10);
  const responseTimeThreshold = parseInt(form.responseTimeThreshold.value, 10);

  if (!serverName || !serverUrl) {
    showToast('Server name and URL are required', 'warning');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    const res = await fetchWithAuth('/api/servers', {
      method: 'POST',
      body: JSON.stringify({
        serverName,
        serverUrl,
        description,
        monitoringInterval,
        responseTimeThreshold,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Server registered successfully!', 'success');
      form.reset();
      addModalInstance.hide();
      loadServers();
    } else {
      showToast(data.message || 'Failed to add server', 'critical');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Add Server';
  }
}

/**
 * Open Edit Modal with Server Data
 */
function openEditModal(serverId) {
  const server = allServers.find((s) => s._id === serverId);
  if (!server) return;

  const form = document.getElementById('form-edit-server');
  if (!form) return;

  form.editServerId.value = server._id;
  form.editServerName.value = server.serverName || '';
  form.editServerUrl.value = server.serverUrl || '';
  form.editDescription.value = server.description || '';
  form.editMonitoringInterval.value = server.monitoringInterval || 10;
  form.editResponseTimeThreshold.value = server.responseTimeThreshold || 500;

  editModalInstance.show();
}

/**
 * Handle Edit Server form submit
 */
async function handleEditServer(e) {
  e.preventDefault();
  const form = e.target;
  const serverId = form.editServerId.value;
  const submitBtn = form.querySelector('button[type="submit"]');

  const serverName = form.editServerName.value.trim();
  const serverUrl = form.editServerUrl.value.trim();
  const description = form.editDescription.value.trim();
  const monitoringInterval = parseInt(form.editMonitoringInterval.value, 10);
  const responseTimeThreshold = parseInt(form.editResponseTimeThreshold.value, 10);

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    const res = await fetchWithAuth(`/api/servers/${serverId}`, {
      method: 'PUT',
      body: JSON.stringify({
        serverName,
        serverUrl,
        description,
        monitoringInterval,
        responseTimeThreshold,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Server details updated successfully!', 'success');
      editModalInstance.hide();
      loadServers();
    } else {
      showToast(data.message || 'Failed to update server', 'critical');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Save Changes';
  }
}

/**
 * Toggle Monitoring for Server
 */
async function toggleMonitoring(serverId) {
  try {
    const res = await fetchWithAuth(`/api/servers/${serverId}/toggle`, {
      method: 'PATCH',
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'info');
      loadServers();
    } else {
      showToast(data.message || 'Failed to toggle monitoring', 'warning');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  }
}

/**
 * Trigger Immediate Check
 */
async function triggerServerCheck(serverId) {
  try {
    showToast('Executing health check probe...', 'info');
    const res = await fetchWithAuth(`/api/monitoring/${serverId}/check`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Probe result: ${data.result.checkResult.responseTime}ms (${data.result.fsmResult.newState})`, 'success');
      loadServers();
    } else {
      showToast(data.message || 'Check failed', 'warning');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  }
}

/**
 * Prompt Delete Confirmation Modal
 */
function promptDelete(serverId, serverName) {
  deleteTargetId = serverId;
  const modalEl = document.getElementById('deleteConfirmModal');
  const nameEl = document.getElementById('delete-server-name');
  if (nameEl) nameEl.textContent = serverName;
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

/**
 * Confirm Delete
 */
async function handleConfirmDelete() {
  if (!deleteTargetId) return;

  const btn = document.getElementById('btn-confirm-delete');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

    const res = await fetchWithAuth(`/api/servers/${deleteTargetId}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    if (data.success) {
      showToast('Server deleted successfully', 'success');
      const modalEl = document.getElementById('deleteConfirmModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      loadServers();
    } else {
      showToast(data.message || 'Delete failed', 'critical');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Delete Server';
    deleteTargetId = null;
  }
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
