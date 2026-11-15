/**
 * Historical Health Records & Analytics Logic
 */

let historyChart = null;
let servers = [];

document.addEventListener('DOMContentLoaded', () => {
  protectPage();
  loadServerDropdown();
  initEventHandlers();
});

function initEventHandlers() {
  const serverSelect = document.getElementById('history-server-select');
  if (serverSelect) {
    serverSelect.addEventListener('change', () => loadServerHistory());
  }

  const filterForm = document.getElementById('history-filter-form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadServerHistory();
    });
  }
}

async function loadServerDropdown() {
  try {
    const res = await fetchWithAuth('/api/servers');
    const data = await res.json();
    if (data.success) {
      servers = data.servers || [];
      const select = document.getElementById('history-server-select');
      if (!select) return;

      select.innerHTML = servers.map((s) => `
        <option value="${s._id}">${escapeHtml(s.serverName)} (${s.currentStatus})</option>
      `).join('');

      // Check if serverId is in URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlServerId = urlParams.get('serverId');
      if (urlServerId && servers.some((s) => s._id === urlServerId)) {
        select.value = urlServerId;
      }

      if (servers.length > 0) {
        loadServerHistory();
      } else {
        showToast('No servers available to view history', 'warning');
      }
    }
  } catch (err) {
    showToast(`Failed to load server list: ${err.message}`, 'critical');
  }
}

async function loadServerHistory() {
  const select = document.getElementById('history-server-select');
  const serverId = select?.value;
  if (!serverId) return;

  const startDate = document.getElementById('history-start-date')?.value;
  const endDate = document.getElementById('history-end-date')?.value;

  let query = `/api/monitoring/history/${serverId}?limit=100`;
  if (startDate) query += `&startDate=${encodeURIComponent(new Date(startDate).toISOString())}`;
  if (endDate) query += `&endDate=${encodeURIComponent(new Date(endDate + 'T23:59:59').toISOString())}`;

  try {
    const res = await fetchWithAuth(query);
    const data = await res.json();

    if (data.success) {
      renderStats(data.statistics);
      renderHistoryChart(data.history);
      renderHistoryTable(data.history);
    } else {
      showToast(data.message || 'Failed to fetch history', 'critical');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'critical');
  }
}

function renderStats(stats) {
  if (!stats) return;

  document.getElementById('hist-uptime').textContent = `${stats.uptimePercentage}%`;
  document.getElementById('hist-total-checks').textContent = stats.totalChecks;
  document.getElementById('hist-success-checks').textContent = stats.successfulChecks;
  document.getElementById('hist-failed-checks').textContent = stats.failedChecks;
  document.getElementById('hist-avg-latency').textContent = `${stats.avgLatency} ms`;
  document.getElementById('hist-min-latency').textContent = `${stats.minLatency} ms`;
  document.getElementById('hist-max-latency').textContent = `${stats.maxLatency} ms`;
}

function renderHistoryChart(records) {
  const canvas = document.getElementById('history-latency-chart');
  if (!canvas) return;

  // Records come newest first, reverse for chronological chart
  const chron = [...records].reverse();
  const labels = chron.map(r => new Date(r.checkedAt).toLocaleTimeString());
  const latencies = chron.map(r => r.responseTime || 0);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (historyChart) {
    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = latencies;
    historyChart.update();
    return;
  }

  historyChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Response Time (ms)',
        data: latencies,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Inter', size: 10 }, maxTicksLimit: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, callback: (v) => `${v}ms` },
        },
      },
      plugins: {
        legend: { labels: { color: textColor } },
      },
    },
  });
}

function renderHistoryTable(records) {
  const tbody = document.getElementById('history-records-tbody');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          No monitoring records found for the selected time range.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map((r) => {
    const status = r.healthStatus || 'ACTIVE';
    const statusClass = status.toLowerCase();
    const timeFormatted = new Date(r.checkedAt).toLocaleString();
    const isReachable = r.isReachable;

    return `
      <tr>
        <td class="font-monospace small">${timeFormatted}</td>
        <td><span class="badge-status ${statusClass}">${status}</span></td>
        <td>
          <span class="badge ${isReachable ? 'bg-success' : 'bg-danger'} font-monospace">
            ${r.statusCode || 'ERR'}
          </span>
        </td>
        <td class="font-monospace fw-semibold">${r.responseTime} ms</td>
        <td>
          <span class="badge ${isReachable ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">
            ${isReachable ? 'Reachable' : 'Unreachable'}
          </span>
        </td>
        <td class="text-muted small">${escapeHtml(r.errorMessage || '--')}</td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
