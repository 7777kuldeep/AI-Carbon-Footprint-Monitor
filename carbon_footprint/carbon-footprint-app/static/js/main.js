/* ════════════════════════════════════════
   CarbonIQ — main.js
   Shared auth, modal, and utility functions
════════════════════════════════════════ */

// ── Auth State ────────────────────────────────────────────────────────────────
async function checkSession() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    updateAuthUI(data);
    return data;
  } catch (e) {
    return { logged_in: false };
  }
}

function updateAuthUI(sessionData) {
  const authZone = document.getElementById('authZone');
  const userZone = document.getElementById('userZone');
  const navUsername = document.getElementById('navUsername');
  const navAuthLinks = document.getElementById('navAuthLinks');

  if (sessionData.logged_in) {
    if (authZone) authZone.classList.add('hidden');
    if (userZone) {
      userZone.classList.remove('hidden');
      if (navUsername) navUsername.textContent = '🌿 ' + sessionData.username;
    }
    if (navAuthLinks) {
      navAuthLinks.innerHTML = `
        <span class="username-tag">🌿 ${sessionData.username}</span>
        <a href="/profile" class="btn btn-ghost">History</a>
        <button class="btn btn-ghost" onclick="logout()">Logout</button>
      `;
    }
  } else {
    if (authZone) authZone.classList.remove('hidden');
    if (userZone) userZone.classList.add('hidden');
    if (navAuthLinks) {
      navAuthLinks.innerHTML = `
        <button class="btn btn-ghost" onclick="openModal('loginModal')">Login</button>
        <button class="btn btn-primary" onclick="openModal('registerModal')">Sign Up</button>
      `;
    }
  }
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}
function switchModal(closeId, openId) {
  closeModal(closeId);
  openModal(openId);
}

// Click outside to close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ── Auth Actions ──────────────────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');

  if (!username || !password) {
    showError(errEl, 'Please fill in all fields.');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok) {
      closeModal('loginModal');
      checkSession();
      showToast('Welcome back, ' + data.username + '! 🌱');
    } else {
      showError(errEl, data.error || 'Login failed.');
    }
  } catch (e) {
    showError(errEl, 'Network error. Try again.');
  }
}

async function doRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl = document.getElementById('registerError');

  if (!username || !email || !password) {
    showError(errEl, 'Please fill in all fields.');
    return;
  }
  if (password.length < 6) {
    showError(errEl, 'Password must be at least 6 characters.');
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (res.ok) {
      closeModal('registerModal');
      checkSession();
      showToast('Welcome to CarbonIQ, ' + data.username + '! 🌍');
    } else {
      showError(errEl, data.error || 'Registration failed.');
    }
  } catch (e) {
    showError(errEl, 'Network error. Try again.');
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  checkSession();
  showToast('Logged out. See you soon! 🌿');
  if (window.location.pathname === '/profile') {
    window.location.href = '/';
  }
}

// ── Toast Notification ────────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
    background: #0d1610; border: 1px solid #22c55e; color: #e2ffe8;
    padding: .75rem 1.25rem; border-radius: 10px; font-size: .9rem;
    box-shadow: 0 8px 32px rgba(0,0,0,.5);
    animation: slideIn .3s ease;
    font-family: 'DM Sans', sans-serif;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Error Display ─────────────────────────────────────────────────────────────
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── Format Helpers ────────────────────────────────────────────────────────────
function fmt(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return parseFloat(n).toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  // Handle Enter key in login/register forms
  ['loginPassword', 'regPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        id === 'loginPassword' ? doLogin() : doRegister();
      }
    });
  });
});
