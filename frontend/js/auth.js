/**
 * Authentication and Client-side Session Management
 */

const AUTH_TOKEN_KEY = 'monitor_admin_token';
const ADMIN_USER_KEY = 'monitor_admin_user';
const THEME_KEY = 'monitor_app_theme';

// ==========================================
// Theme Management
// ==========================================
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggleIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  updateThemeToggleIcon(newTheme);
}

function updateThemeToggleIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark' 
      ? '<i class="bi bi-sun-fill text-warning"></i>' 
      : '<i class="bi bi-moon-stars-fill text-primary"></i>';
    btn.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
  }
}

// ==========================================
// Auth Helpers
// ==========================================
function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

function getCurrentUser() {
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Route protection guard
 */
function protectPage() {
  if (!isAuthenticated()) {
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `login.html?returnUrl=${returnUrl}`;
  }
}

function logout() {
  clearAuthSession();
  window.location.href = 'login.html';
}

/**
 * Authenticated Fetch wrapper that automatically adds Authorization header
 */
async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    // If unauthorized, redirect to login
    if (response.status === 401) {
      clearAuthSession();
      window.location.href = 'login.html';
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Display toast notification
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-alert toast-${type}`;

  let icon = 'bi-info-circle-fill text-primary';
  if (type === 'critical' || type === 'error') icon = 'bi-exclamation-triangle-fill text-danger';
  if (type === 'warning') icon = 'bi-exclamation-circle-fill text-warning';
  if (type === 'success') icon = 'bi-check-circle-fill text-success';

  toast.innerHTML = `
    <i class="bi ${icon} fs-5 mt-1"></i>
    <div class="flex-grow-1">
      <div class="fw-semibold small">${message}</div>
      <div class="text-muted" style="font-size: 0.72rem;">${new Date().toLocaleTimeString()}</div>
    </div>
    <button type="button" class="btn-close btn-close-sm" style="font-size: 0.65rem;" onclick="this.parentElement.remove()"></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 6000);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  const logoutBtns = document.querySelectorAll('.action-logout');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });

  // Display user email / username in sidebar
  const user = getCurrentUser();
  const userEmailEls = document.querySelectorAll('.user-display-email');
  if (user) {
    userEmailEls.forEach(el => {
      el.textContent = user.username || user.email || 'Admin';
    });
  }
});
