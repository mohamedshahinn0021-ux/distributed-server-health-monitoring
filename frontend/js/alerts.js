/**
 * Alerts Center Client Logic
 */

let allAlerts = [];

document.addEventListener('DOMContentLoaded', () => {
  protectPage();
  loadAlerts();
  initEventHandlers();
  initSocket();
});

function initSocket() {
  try {
    const socket = io();
    socket.on('new_alert', (alert) => {
      showToast(alert.message, (alert.severity || 'info').toLowerCase());
      loadAlerts();
    });
    socket.on('alert_marked_read', () => loadAlerts());
    socket.on('all_alerts_read', () => loadAlerts());
    socket.on('alert_deleted', () => loadAlerts());
    socket.on('all_alerts_cleared', () => loadAlerts());
  } catch (e) {
    console.warn('Socket error in alerts:', e);
  }
}

function initEventHandlers() {
  const severityFilter = document.getElementById('filter-severity');
  if (severityFilter) {
    severityFilter.addEventListener('change', filterAndRenderAlerts);
  }

  const readFilter = document.getElementById('filter-read-status');
  if (readFilter) {
    readFilter.addEventListener('change', filterAndRenderAlerts);
  }

  const markAllBtn = document.getElementById('btn-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', handleMarkAllRead);
  }

  const clearAllBtn = document.getElementById('btn-clear-all-alerts');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', handleClearAll);
  }
}

async function loadAlerts() {
  try {
    const res = await fetchWithAuth('/api/alerts?limit=100');
    const data = await res.json();
    if (data.success) {
      allAlerts = data.alerts || [];
      filterAndRenderAlerts();
    }
  } catch (err) {
    showToast(`Failed to load alerts: ${err.message}`, 'critical');
  }
}

function filterAndRenderAlerts() {
  const severity = document.getElementById('filter-severity')?.value || 'ALL';
  const readStatus = document.getElementById('filter-read-status')?.value || 'ALL';

  const filtered = allAlerts.filter((a) => {
    if (severity !== 'ALL' && a.severity !== severity) return false;
    if (readStatus === 'UNREAD' && a.isRead) return false;
    if (readStatus === 'READ' && !a.isRead) return false;
    return true;
  });

  renderAlertsList(filtered);
}

function renderAlertsList(alerts) {
  const container = document.getElementById('alerts-container');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-bell-slash fs-1 d-block mb-2"></i>
        No alerts match the selected criteria.
      </div>
    `;
    return;
  }

  container.innerHTML = alerts.map((a) => {
    const sev = (a.severity || 'INFO').toLowerCase();
    const isUnread = !a.isRead;
    const timeFormatted = new Date(a.createdAt).toLocaleString();

    let icon = 'bi-info-circle text-primary';
    let badgeClass = 'bg-primary';

    if (sev === 'critical') {
      icon = 'bi-exclamation-octagon text-danger';
      badgeClass = 'bg-danger';
    } else if (sev === 'warning') {
      icon = 'bi-exclamation-triangle text-warning';
      badgeClass = 'bg-warning text-dark';
    } else if (sev === 'success') {
      icon = 'bi-check-circle text-success';
      badgeClass = 'bg-success';
    }

    return `
      <div class="card card-custom mb-3 ${isUnread ? 'border-primary' : ''}">
        <div class="card-body d-flex align-items-start gap-3 p-3">
          <i class="bi ${icon} fs-3 mt-1"></i>
          <div class="flex-grow-1">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <div class="d-flex align-items-center gap-2">
                <span class="badge ${badgeClass} font-monospace">${a.severity}</span>
                <span class="badge bg-secondary font-monospace">${a.alertType}</span>
                ${isUnread ? '<span class="badge bg-info text-dark" style="font-size:0.68rem;">UNREAD</span>' : ''}
              </div>
              <small class="text-muted">${timeFormatted}</small>
            </div>
            <p class="mb-1 fw-semibold">${escapeHtml(a.message)}</p>
          </div>
          <div class="d-flex flex-column gap-1">
            ${isUnread ? `
              <button class="btn btn-sm btn-outline-success" title="Mark as Read" onclick="markSingleRead('${a._id}')">
                <i class="bi bi-check2"></i>
              </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-danger" title="Delete Alert" onclick="deleteSingleAlert('${a._id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function markSingleRead(id) {
  try {
    const res = await fetchWithAuth(`/api/alerts/${id}/read`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      showToast('Alert marked as read', 'success');
      loadAlerts();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  }
}

async function handleMarkAllRead() {
  try {
    const res = await fetchWithAuth('/api/alerts/read-all', { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      showToast('All alerts marked as read', 'success');
      loadAlerts();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  }
}

async function deleteSingleAlert(id) {
  try {
    const res = await fetchWithAuth(`/api/alerts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Alert removed', 'info');
      loadAlerts();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  }
}

async function handleClearAll() {
  if (!confirm('Are you sure you want to permanently delete all alerts?')) return;
  try {
    const res = await fetchWithAuth('/api/alerts/clear-all', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('All alerts cleared successfully', 'success');
      loadAlerts();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
