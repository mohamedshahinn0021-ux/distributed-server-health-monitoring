/**
 * Failure Detection & Recovery Alert Module
 */

let allAlerts = [];

async function loadAlerts() {
  try {
    const res = await Api.getAlerts();
    if (res && res.success) {
      allAlerts = res.data || [];
      renderRecentAlertsWidget();
      renderAlertsTable();
      updateAlertBadges();
    }
  } catch (err) {
    console.error('Error fetching alerts:', err);
  }
}

function updateAlertBadges() {
  const unreadCount = allAlerts.filter(a => !a.isAcknowledged).length;
  const navBadge = document.getElementById('nav-alert-badge');
  const sidebarBadge = document.getElementById('sidebar-alert-badge');

  if (navBadge) {
    navBadge.textContent = unreadCount;
    navBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }
  if (sidebarBadge) {
    sidebarBadge.textContent = unreadCount;
    sidebarBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }
}

function renderRecentAlertsWidget() {
  const container = document.getElementById('recent-alerts-container');
  if (!container) return;

  const recent = allAlerts.slice(0, 6);
  if (recent.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="fas fa-shield-alt fa-2x text-success mb-2 d-block"></i>
        <span>No server failure or recovery incidents reported. All systems stable.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = recent.map(alert => {
    const iconInfo = getAlertIcon(alert.alertType);
    const timeStr = formatRelativeTime(alert.alertTime);

    return `
      <div class="alert-item alert-type-${alert.alertType}">
        <div class="alert-icon-box">
          <i class="${iconInfo.icon}"></i>
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-bold small ${iconInfo.titleClass}">${iconInfo.title}</span>
            <span class="text-muted" style="font-size: 0.75rem;">${timeStr}</span>
          </div>
          <p class="mb-1 text-dark small" style="line-height: 1.4;">
            ${escapeHtml(alert.failureDescription)}
          </p>
          <div class="d-flex align-items-center gap-2 mt-1">
            <span class="badge bg-light text-dark border" style="font-size: 0.7rem;">
              <i class="fas fa-server me-1"></i>${escapeHtml(alert.server?.serverName || 'Server')}
            </span>
            ${alert.previousState && alert.newState ? `
              <span class="badge bg-secondary-subtle text-secondary" style="font-size: 0.7rem;">
                ${alert.previousState} &rarr; ${alert.newState}
              </span>
            ` : ''}
            ${!alert.isAcknowledged ? `
              <button class="btn btn-link btn-sm p-0 ms-auto text-decoration-none small" onclick="acknowledgeAlertItem('${alert.id}')">
                <i class="fas fa-check me-1"></i>Ack
              </button>
            ` : '<span class="ms-auto text-muted small"><i class="fas fa-check-double text-success"></i></span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAlertsTable() {
  const tbody = document.getElementById('full-alerts-table-body');
  if (!tbody) return;

  if (allAlerts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          No alert incidents on record.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allAlerts.map(alert => {
    const iconInfo = getAlertIcon(alert.alertType);
    const formattedDate = new Date(alert.alertTime).toLocaleString();

    return `
      <tr class="${!alert.isAcknowledged ? 'table-warning-subtle' : ''}">
        <td><strong>#${alert.id}</strong></td>
        <td>
          <span class="badge ${iconInfo.badgeClass}">
            <i class="${iconInfo.icon} me-1"></i>${alert.alertType}
          </span>
        </td>
        <td>
          <strong>${escapeHtml(alert.server?.serverName || 'Unknown')}</strong>
          <div class="small text-muted">${alert.server?.ipAddress}:${alert.server?.port}</div>
        </td>
        <td>
          <span class="badge bg-light text-dark border">
            ${alert.previousState || 'INIT'} &rarr; ${alert.newState}
          </span>
        </td>
        <td class="small" style="max-width: 320px;">
          ${escapeHtml(alert.failureDescription)}
        </td>
        <td class="small text-muted">${formattedDate}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            ${!alert.isAcknowledged ? `
              <button class="btn btn-outline-success" title="Acknowledge Alert" onclick="acknowledgeAlertItem('${alert.id}')">
                <i class="fas fa-check"></i>
              </button>
            ` : ''}
            <button class="btn btn-outline-danger" title="Delete Alert" onclick="deleteAlertItem('${alert.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getAlertIcon(alertType) {
  switch (alertType) {
    case 'FAILURE':
      return {
        icon: 'fas fa-exclamation-circle text-danger',
        title: 'Connection Failure Detected',
        titleClass: 'text-danger',
        badgeClass: 'bg-danger'
      };
    case 'RECOVERY':
      return {
        icon: 'fas fa-heartbeat text-primary',
        title: 'Recovery In Progress',
        titleClass: 'text-primary',
        badgeClass: 'bg-primary'
      };
    case 'STABILIZED':
      return {
        icon: 'fas fa-check-circle text-success',
        title: 'Server Operational Stability Verified',
        titleClass: 'text-success',
        badgeClass: 'bg-success'
      };
    case 'DEGRADED':
      return {
        icon: 'fas fa-tachometer-alt text-warning',
        title: 'Response Latency Degraded',
        titleClass: 'text-warning',
        badgeClass: 'bg-warning text-dark'
      };
    case 'RESTORED':
      return {
        icon: 'fas fa-bolt text-success',
        title: 'Latency Performance Restored',
        titleClass: 'text-success',
        badgeClass: 'bg-success'
      };
    default:
      return {
        icon: 'fas fa-info-circle text-info',
        title: 'System Event',
        titleClass: 'text-info',
        badgeClass: 'bg-info text-dark'
      };
  }
}

async function acknowledgeAlertItem(id) {
  try {
    const res = await Api.acknowledgeAlert(id);
    if (res && res.success) {
      showToast('Alert acknowledged', 'success');
      await refreshAllData();
    }
  } catch (err) {
    showToast('Failed to acknowledge alert: ' + err.message, 'danger');
  }
}

async function handleAcknowledgeAll() {
  try {
    const res = await Api.acknowledgeAllAlerts();
    if (res && res.success) {
      showToast('All alerts marked as acknowledged', 'success');
      await refreshAllData();
    }
  } catch (err) {
    showToast('Failed to acknowledge alerts: ' + err.message, 'danger');
  }
}

async function handleClearAllAlerts() {
  if (confirm('Are you sure you want to clear all failure and recovery alerts?')) {
    try {
      const res = await Api.clearAllAlerts();
      if (res && res.success) {
        showToast('All alerts cleared', 'info');
        await refreshAllData();
      }
    } catch (err) {
      showToast('Failed to clear alerts: ' + err.message, 'danger');
    }
  }
}

async function deleteAlertItem(id) {
  try {
    const res = await Api.deleteAlert(id);
    if (res && res.success) {
      showToast('Alert removed', 'info');
      await refreshAllData();
    }
  } catch (err) {
    showToast('Failed to delete alert: ' + err.message, 'danger');
  }
}
