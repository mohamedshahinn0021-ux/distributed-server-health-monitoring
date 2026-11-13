/**
 * Monitoring History Log Module
 */

let allHistory = [];
let selectedServerFilter = 'ALL';

async function loadHistory() {
  try {
    const res = await Api.getRecentHistory();
    if (res && res.success) {
      allHistory = res.data || [];
      populateHistoryServerFilter();
      renderHistoryTable();
    }
  } catch (err) {
    console.error('Error fetching history:', err);
  }
}

function populateHistoryServerFilter() {
  const select = document.getElementById('history-server-filter');
  if (!select) return;

  const currentVal = select.value || 'ALL';
  const serverMap = new Map();
  allHistory.forEach(h => {
    if (h.server) {
      serverMap.set(h.server.id, h.server.serverName);
    }
  });

  let options = '<option value="ALL">All Monitored Servers</option>';
  serverMap.forEach((name, id) => {
    options += `<option value="${id}">${escapeHtml(name)}</option>`;
  });
  select.innerHTML = options;
  select.value = currentVal;

  select.onchange = (e) => {
    selectedServerFilter = e.target.value;
    renderHistoryTable();
  };
}

function renderHistoryTable() {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  const filtered = allHistory.filter(h => {
    if (selectedServerFilter === 'ALL') return true;
    return h.server && String(h.server.id) === String(selectedServerFilter);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          No monitoring history records available.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const timeFormatted = new Date(item.checkedAt).toLocaleString();
    const stateBadge = getStateBadgeHtml(item.status);

    return `
      <tr>
        <td class="small text-muted font-monospace">${timeFormatted}</td>
        <td>
          <div class="fw-bold">${escapeHtml(item.server?.serverName || 'Deleted Server')}</div>
          <small class="text-muted">${item.server?.ipAddress}:${item.server?.port}</small>
        </td>
        <td>${stateBadge}</td>
        <td>
          <span class="fw-bold ${item.responseTimeMs > 500 ? 'text-warning' : 'text-success'}">
            ${item.status === 'DISCONNECTED' ? '—' : `${item.responseTimeMs} ms`}
          </span>
        </td>
        <td class="small text-muted" style="max-width: 300px;">
          ${item.errorMessage ? `<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>${escapeHtml(item.errorMessage)}</span>` : '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Probe successful</span>'}
        </td>
      </tr>
    `;
  }).join('');
}
