/**
 * Dashboard Controller, Chart.js Visualization & Auto-refresh Engine
 */

let responseTimeChart = null;
let autoRefreshTimer = null;
let isAutoRefreshActive = true;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initDashboardControls();
  initServerManagement();
  refreshAllData();
  startAutoRefresh();
  startClock();
});

function initNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav-link');
  const sections = document.querySelectorAll('.dashboard-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-section');

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.classList.remove('d-none');
        } else {
          sec.classList.add('d-none');
        }
      });

      // Update page title
      const pageTitle = document.getElementById('navbar-page-title');
      if (pageTitle) {
        pageTitle.textContent = link.getAttribute('data-title') || 'Dashboard';
      }

      // Close mobile sidebar if open
      const sidebar = document.getElementById('sidebar');
      if (sidebar && window.innerWidth < 992) {
        sidebar.classList.remove('show');
      }
    });
  });

  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('show');
    });
  }
}

function initDashboardControls() {
  // Global Scan All Button
  const scanAllBtn = document.getElementById('scan-all-btn');
  if (scanAllBtn) {
    scanAllBtn.addEventListener('click', async () => {
      const icon = scanAllBtn.querySelector('i');
      if (icon) icon.classList.add('fa-spin');
      scanAllBtn.disabled = true;

      try {
        const res = await Api.checkAllServers();
        if (res && res.success) {
          showToast(`Full cluster health check completed across ${res.data.length} servers`, 'success');
          await refreshAllData();
        }
      } catch (err) {
        showToast('Scan failed: ' + err.message, 'danger');
      } finally {
        if (icon) icon.classList.remove('fa-spin');
        scanAllBtn.disabled = false;
      }
    });
  }

  // Auto-refresh Pause/Resume Toggle
  const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
  if (autoRefreshToggle) {
    autoRefreshToggle.addEventListener('click', () => {
      isAutoRefreshActive = !isAutoRefreshActive;
      const icon = autoRefreshToggle.querySelector('i');
      const text = autoRefreshToggle.querySelector('.toggle-text');

      if (isAutoRefreshActive) {
        startAutoRefresh();
        autoRefreshToggle.className = 'btn btn-sm btn-outline-success';
        if (icon) icon.className = 'fas fa-sync-alt fa-spin me-1';
        if (text) text.textContent = 'Auto-Refresh: ON (10s)';
        showToast('Auto-refresh resumed', 'info');
      } else {
        clearInterval(autoRefreshTimer);
        autoRefreshToggle.className = 'btn btn-sm btn-outline-secondary';
        if (icon) icon.className = 'fas fa-pause me-1';
        if (text) text.textContent = 'Auto-Refresh: PAUSED';
        showToast('Auto-refresh paused', 'warning');
      }
    });
  }

  // Interactive Simulation Toggle Button
  const toggleMockBtn = document.getElementById('toggle-mock-btn');
  if (toggleMockBtn) {
    toggleMockBtn.addEventListener('click', async () => {
      try {
        const res = await Api.toggleMockService();
        if (res) {
          showToast(res.message, res.simulatedDown ? 'warning' : 'success');
          await refreshAllData();
        }
      } catch (err) {
        showToast('Simulation toggle failed: ' + err.message, 'danger');
      }
    });
  }
}

async function refreshAllData() {
  await Promise.allSettled([
    loadStats(),
    loadServers(),
    loadChart(),
    loadAlerts(),
    loadHistory()
  ]);
}

async function loadStats() {
  try {
    const res = await Api.getDashboardStats();
    if (res && res.success) {
      const stats = res.data;
      updateStatText('stat-total-servers', stats.totalServers);
      updateStatText('stat-active-servers', stats.activeServers);
      updateStatText('stat-slow-servers', stats.slowServers);
      updateStatText('stat-disconnected-servers', stats.disconnectedServers);
      updateStatText('stat-recovering-servers', stats.recoveringServers);

      // Average Latency & Health
      const avgElem = document.getElementById('stat-avg-latency');
      if (avgElem) {
        avgElem.textContent = `${stats.averageResponseTimeMs} ms`;
      }

      const healthElem = document.getElementById('stat-health-percentage');
      if (healthElem) {
        healthElem.textContent = `${stats.healthPercentage}%`;
      }
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

function updateStatText(id, value) {
  const elem = document.getElementById(id);
  if (elem) {
    elem.textContent = value;
  }
}

async function loadChart() {
  const chartCanvas = document.getElementById('responseTimeChart');
  if (!chartCanvas) return;

  try {
    const res = await Api.getChartData();
    if (res && res.success) {
      const chartData = res.data;
      renderChart(chartCanvas, chartData);
    }
  } catch (err) {
    console.error('Error loading chart data:', err);
  }
}

function renderChart(canvas, chartData) {
  const ctx = canvas.getContext('2d');

  const formattedDatasets = (chartData.datasets || []).map(ds => ({
    label: ds.label,
    data: ds.data,
    borderColor: ds.borderColor,
    backgroundColor: ds.backgroundColor ? `${ds.backgroundColor}22` : 'rgba(78, 115, 223, 0.1)',
    tension: 0.35,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: false
  }));

  if (responseTimeChart) {
    responseTimeChart.data.labels = chartData.labels;
    responseTimeChart.data.datasets = formattedDatasets;
    responseTimeChart.update();
  } else {
    responseTimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: formattedDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              font: { size: 11 }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.parsed.y} ms`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Response Time (ms)',
              font: { size: 11, weight: 'bold' }
            },
            grid: {
              color: '#f0f2f5'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }
  autoRefreshTimer = setInterval(() => {
    if (isAutoRefreshActive) {
      refreshAllData();
    }
  }, 10000);
}

function startClock() {
  const clockElem = document.getElementById('live-system-clock');
  if (!clockElem) return;

  function update() {
    const now = new Date();
    clockElem.textContent = now.toLocaleTimeString([], { hour12: false });
  }
  update();
  setInterval(update, 1000);
}
