/**
 * Distributed Server Health Monitoring and Failure Detection System
 * Centralized API Client Module
 */

const API_BASE = '/api';

const Api = {
  getToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  },

  setToken(token, remember = true) {
    if (remember) {
      localStorage.setItem('auth_token', token);
    } else {
      sessionStorage.setItem('auth_token', token);
    }
  },

  clearToken() {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.clearToken();
        window.location.href = '/login.html?expired=true';
        return null;
      }

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = json?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return json;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  },

  getMe() {
    return this.request('/auth/me');
  },

  // Server Management Endpoints
  getServers() {
    return this.request('/servers');
  },

  getServer(id) {
    return this.request(`/servers/${id}`);
  },

  createServer(data) {
    return this.request('/servers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateServer(id, data) {
    return this.request(`/servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteServer(id) {
    return this.request(`/servers/${id}`, {
      method: 'DELETE'
    });
  },

  checkServer(id) {
    return this.request(`/servers/${id}/check`, {
      method: 'POST'
    });
  },

  checkAllServers() {
    return this.request('/servers/check-all', {
      method: 'POST'
    });
  },

  // Dashboard Endpoints
  getDashboardStats() {
    return this.request('/dashboard/stats');
  },

  getChartData() {
    return this.request('/dashboard/chart-data');
  },

  // History Endpoints
  getRecentHistory() {
    return this.request('/history');
  },

  getServerHistory(serverId) {
    return this.request(`/history/server/${serverId}`);
  },

  // Alert Endpoints
  getAlerts() {
    return this.request('/alerts');
  },

  acknowledgeAlert(id) {
    return this.request(`/alerts/${id}/acknowledge`, {
      method: 'PUT'
    });
  },

  acknowledgeAllAlerts() {
    return this.request('/alerts/acknowledge-all', {
      method: 'POST'
    });
  },

  deleteAlert(id) {
    return this.request(`/alerts/${id}`, {
      method: 'DELETE'
    });
  },

  clearAllAlerts() {
    return this.request('/alerts/clear-all', {
      method: 'DELETE'
    });
  },

  // Mock Simulations for Demonstration
  toggleMockService() {
    return this.request('/mock/toggleable/toggle', {
      method: 'POST'
    });
  }
};

// UI Toast Notification Helper
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const bgClass = type === 'success' ? 'bg-success' :
                  type === 'danger' || type === 'error' ? 'bg-danger' :
                  type === 'warning' ? 'bg-warning text-dark' : 'bg-primary';

  const toastId = 'toast_' + Date.now();
  const html = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' || type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  toastContainer.insertAdjacentHTML('beforeend', html);
  const element = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(element, { delay: 4000 });
  bsToast.show();
  element.addEventListener('hidden.bs.toast', () => element.remove());
}
