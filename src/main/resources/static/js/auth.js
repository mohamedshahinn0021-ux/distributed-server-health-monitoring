/**
 * Admin Authentication & Session Management Module
 */

document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  const token = Api.getToken();

  // If on login page and already logged in, redirect to dashboard
  if (isLoginPage) {
    if (token) {
      window.location.href = '/index.html';
      return;
    }
    initLoginForm();
  } else {
    // Protected page: verify token exists
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    initUserDisplay();
  }
});

function initLoginForm() {
  const form = document.getElementById('login-form');
  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  // Check URL query parameters for session expiration
  const params = new URLSearchParams(window.location.search);
  if (params.get('expired')) {
    showAlert('Your session has expired. Please log in again.', 'warning');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const remember = document.getElementById('remember-me')?.checked || false;

      if (!username || !password) {
        showAlert('Please enter both username and password.', 'danger');
        return;
      }

      setLoading(true);
      hideAlert();

      try {
        const res = await Api.login(username, password);
        if (res && res.success && res.data.authenticated) {
          Api.setToken(res.data.token, remember);
          Api.setCurrentUser({
            username: res.data.username,
            fullName: res.data.fullName,
            role: res.data.role
          });
          window.location.href = '/index.html';
        } else {
          showAlert(res?.message || 'Invalid credentials', 'danger');
        }
      } catch (err) {
        showAlert(err.message || 'Login failed. Check server connection.', 'danger');
      } finally {
        setLoading(false);
      }
    });
  }

  function showAlert(message, type = 'danger') {
    if (alertBox) {
      alertBox.className = `alert alert-${type} py-2 px-3 small`;
      alertBox.textContent = message;
      alertBox.classList.remove('d-none');
    }
  }

  function hideAlert() {
    if (alertBox) {
      alertBox.classList.add('d-none');
    }
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading
        ? '<span class="spinner-border spinner-border-sm me-2"></span>Authenticating...'
        : '<i class="fas fa-sign-in-alt me-2"></i>Sign In to Dashboard';
    }
  }
}

function initUserDisplay() {
  const user = Api.getCurrentUser();
  const userNameElem = document.getElementById('current-user-name');
  if (userNameElem && user) {
    userNameElem.textContent = user.fullName || user.username;
  }

  // Logout triggers
  const logoutButtons = document.querySelectorAll('.logout-trigger');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to log out?')) {
        try {
          await Api.logout();
        } catch (ignored) {}
        Api.clearToken();
        window.location.href = '/login.html';
      }
    });
  });
}
