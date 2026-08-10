document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let currentUser = null;
  let authToken = localStorage.getItem('mrc_token') || null;

  // DOM ELEMANLARI
  const loginScreen = document.getElementById('login-screen');
  const dashboardApp = document.getElementById('dashboard-app');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const navItems = document.querySelectorAll('.nav-item');
  const tabPages = document.querySelectorAll('.tab-page');
  const logoutBtn = document.getElementById('logout-btn');
  const refreshStatusBtn = document.getElementById('refresh-status-btn');

  // --- API İSTEK YARDIMCISI ---
  // Login isteği için ayrı fonksiyon (logout döngüsünü önler)
  async function loginFetch(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Giriş başarısız.');
    }
    return data;
  }

  // Kimlik doğrulaması gerektiren istekler için
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`/api${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      // Sadece dashboard'dayken 401 gelirse çıkış yap
      if (res.status === 401 && currentUser) {
        logout();
        return;
      }
      throw new Error(data.error || 'İstek başarısız oldu.');
    }
    return data;
  }

  // --- TOAST BİLDİRİMLERİ ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warn') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- OTURUM DURUMU MANTIĞI ---
  async function checkAuth() {
    if (!authToken) {
      showLoginScreen();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        localStorage.removeItem('mrc_token');
        authToken = null;
        showLoginScreen();
        return;
      }

      const data = await res.json();
      currentUser = data.user;
      showDashboard();
    } catch (err) {
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    loginScreen.classList.add('active');
    loginScreen.style.display = 'flex';
    dashboardApp.classList.add('hidden');
  }

  function showDashboard() {
    loginScreen.classList.remove('active');
    loginScreen.style.display = 'none';
    dashboardApp.classList.remove('hidden');

    document.getElementById('user-email-display').textContent = currentUser.email;
    document.getElementById('user-role-display').textContent =
      currentUser.role === 'superadmin' ? 'Süper Yönetici' : 'Yönetici';
    document.getElementById('user-avatar-initial').textContent =
      currentUser.email[0].toUpperCase();

    loadBotStatus();
    loadActivityLogs();
    loadViolations();
    loadRoles();
    loadAdmins();
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('mrc_token');
    showLoginScreen();
    showToast('Oturum kapatıldı.', 'info');
  }

  // --- GİRİŞ FORMU ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginBtn = document.getElementById('login-btn');
    loginError.classList.add('hidden');
    loginError.textContent = '';
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Giriş yapılıyor...</span>';

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    try {
      const data = await loginFetch(email, password);

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('mrc_token', authToken);

      showToast('Başarıyla giriş yapıldı!', 'success');
      showDashboard();
    } catch (err) {
      loginError.textContent = err.message || 'Giriş yapılırken bir hata oluştu.';
      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>Giriş Yap</span><i class="fa-solid fa-arrow-right-to-bracket"></i>';
    }
  });

  logoutBtn.addEventListener('click', logout);

  // --- SEKMELER ARASI GEÇİŞ ---
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navItems.forEach((b) => b.classList.remove('active'));
      tabPages.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  // --- BOT DURUMUNU YÜKLE ---
  async function loadBotStatus() {
    try {
      const status = await apiFetch('/bot/status');
      if (!status) return;

      document.getElementById('guild-name-display').textContent = status.guildName || '-';
      document.getElementById('bot-ping-display').textContent = status.online ? `${status.ping} ms` : '-- ms';
      document.getElementById('stat-guilds').textContent = status.guildCount || 0;
      document.getElementById('stat-members').textContent = status.memberCount || '--';
      document.getElementById('stat-channels').textContent = status.channelsCount || '--';

      const uptimeSec = Math.floor((status.uptime || 0) / 1000);
      const hours = Math.floor(uptimeSec / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      document.getElementById('stat-uptime').textContent = status.online ? `${hours}s ${minutes}d` : '--';

      // Bot kontrol panel durumu güncelle
      const dot = document.getElementById('control-ping-dot');
      const statusText = document.getElementById('control-status-text');
      const startBtn = document.getElementById('btn-start-bot');
      const stopBtn = document.getElementById('btn-stop-bot');
      const restartBtn = document.getElementById('btn-restart-bot');

      if (status.online) {
        dot.className = 'ping-dot online-dot';
        statusText.textContent = `Çevrimiçi — ${status.tag || 'Bot'}`;
        statusText.style.color = '#4ade80';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        stopBtn.disabled = false;
        stopBtn.style.opacity = '1';
        restartBtn.disabled = false;
        restartBtn.style.opacity = '1';
      } else {
        dot.className = 'ping-dot offline-dot';
        statusText.textContent = 'Çevrimdışı';
        statusText.style.color = '#9ca3af';
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        stopBtn.disabled = true;
        stopBtn.style.opacity = '0.5';
        restartBtn.disabled = true;
        restartBtn.style.opacity = '0.5';
      }
    } catch (err) {
      console.error('Bot durumu alınamadı:', err);
    }
  }

  // Bot kontrol butonları
  document.getElementById('btn-start-bot').addEventListener('click', async () => {
    try {
      const res = await apiFetch('/bot/start', { method: 'POST' });
      showToast(res.message, 'success');
      setTimeout(() => { loadBotStatus(); loadActivityLogs(); }, 3000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-stop-bot').addEventListener('click', async () => {
    if (!confirm('Botu durdurmak istediğinize emin misiniz?')) return;
    try {
      const res = await apiFetch('/bot/stop', { method: 'POST' });
      showToast(res.message, 'warn');
      setTimeout(() => { loadBotStatus(); loadActivityLogs(); }, 1000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-restart-bot').addEventListener('click', async () => {
    try {
      const res = await apiFetch('/bot/restart', { method: 'POST' });
      showToast(res.message, 'info');
      setTimeout(() => { loadBotStatus(); loadActivityLogs(); }, 4000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Her 15 saniyede bir durumu güncelle
  setInterval(() => {
    loadBotStatus();
    loadActivityLogs();
  }, 15000);

  refreshStatusBtn.addEventListener('click', () => {
    loadBotStatus();
    loadActivityLogs();
    showToast('Metrikler güncellendi.', 'info');
  });

  // --- LOGLARI YÜKLE ---
  async function loadActivityLogs() {
    try {
      const data = await apiFetch('/bot/logs');
      if (!data) return;

      const container = document.getElementById('log-container');

      if (!data.logs || data.logs.length === 0) {
        container.innerHTML = `<div class="log-item info"><span class="log-text">Henüz log kaydı yok.</span></div>`;
        return;
      }

      container.innerHTML = data.logs
        .map((log) => {
          const time = new Date(log.timestamp).toLocaleTimeString('tr-TR');
          return `
            <div class="log-item ${log.type}">
              <span class="log-time">[${time}]</span>
              <span class="log-text">${log.message}</span>
            </div>`;
        })
        .join('');
    } catch (err) {
      console.error('Loglar alınamadı:', err);
    }
  }

  document.getElementById('clear-logs-btn').addEventListener('click', () => {
    document.getElementById('log-container').innerHTML = '';
    showToast('Ekrandaki loglar temizlendi.', 'info');
  });

  // --- MODERASYON & İHLALLER ---
  async function loadViolations() {
    try {
      const data = await apiFetch('/moderation/violations');
      if (!data) return;

      const tbody = document.getElementById('violations-table-body');
      const violations = data.violations || {};
      const keys = Object.keys(violations);

      if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Kayıtlı ihlal bulunmuyor.</td></tr>`;
        return;
      }

      tbody.innerHTML = keys.map((key) => {
        const userViolations = violations[key] || [];
        const userId = key.split('-')[1] || key;
        const total = userViolations.length;
        const last = userViolations[userViolations.length - 1];
        const lastTime = last ? new Date(last.timestamp).toLocaleString('tr-TR') : '--';
        const lastReason = last ? last.reason : '--';

        return `
          <tr>
            <td><code>${userId}</code></td>
            <td><span class="badge ${total >= 3 ? 'badge-purple' : 'badge-blue'}">${total} İhlal</span></td>
            <td>${lastTime}</td>
            <td>${lastReason}</td>
            <td>
              <button class="btn btn-sm btn-ghost fill-user-btn" data-id="${userId}">
                <i class="fa-solid fa-gavel"></i> Cezalandır
              </button>
            </td>
          </tr>`;
      }).join('');

      document.querySelectorAll('.fill-user-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.getElementById('mod-user-id').value = btn.getAttribute('data-id');
          navItems.forEach((b) => b.classList.remove('active'));
          tabPages.forEach((p) => p.classList.remove('active'));
          document.querySelector('[data-tab="moderation"]').classList.add('active');
          document.getElementById('tab-moderation').classList.add('active');
          showToast('Kullanıcı ID foruma aktarıldı.', 'info');
        });
      });
    } catch (err) {
      console.error('İhlaller yüklenemedi:', err);
    }
  }

  document.getElementById('refresh-violations-btn').addEventListener('click', loadViolations);

  const modActionSelect = document.getElementById('mod-action');
  const groupDuration = document.getElementById('group-duration');

  modActionSelect.addEventListener('change', () => {
    groupDuration.style.display = modActionSelect.value === 'timeout' ? 'block' : 'none';
  });

  document.getElementById('moderation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('mod-user-id').value.trim();
    const action = modActionSelect.value;
    const durationMinutes = document.getElementById('mod-duration').value;
    const reason = document.getElementById('mod-reason').value.trim();

    try {
      const res = await apiFetch('/moderation/action', {
        method: 'POST',
        body: JSON.stringify({ userId, action, durationMinutes, reason }),
      });
      if (!res) return;
      showToast(res.message, 'success');
      document.getElementById('moderation-form').reset();
      loadActivityLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // --- ROL YÖNETİMİ ---
  async function loadRoles() {
    try {
      const data = await apiFetch('/roles');
      if (!data) return;

      const container = document.getElementById('role-list-container');
      const roles = data.roles || [];

      if (roles.length === 0) {
        container.innerHTML = `<p class="text-center text-muted">Henüz oyun rolü eklenmemiş.</p>`;
        return;
      }

      container.innerHTML = roles.map((r, index) => `
        <div class="list-item">
          <div class="item-main">
            <span class="item-emoji">${r.emoji || '🎮'}</span>
            <div>
              <div class="item-title">${r.label}</div>
              <div class="item-subtitle">Rol ID: ${r.roleId}</div>
            </div>
          </div>
          <button class="btn btn-sm btn-ghost delete-role-btn" data-index="${index}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>`).join('');

      document.querySelectorAll('.delete-role-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const idx = btn.getAttribute('data-index');
          if (confirm('Bu rolü panelden silmek istediğinize emin misiniz?')) {
            try {
              const res = await apiFetch(`/roles/${idx}`, { method: 'DELETE' });
              if (!res) return;
              showToast(res.message, 'warn');
              loadRoles();
              loadActivityLogs();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });
    } catch (err) {
      console.error('Roller yüklenemedi:', err);
    }
  }

  document.getElementById('add-role-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roleId = document.getElementById('role-id').value.trim();
    const label = document.getElementById('role-label').value.trim();
    const emoji = document.getElementById('role-emoji').value.trim();

    try {
      const res = await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify({ roleId, label, emoji }),
      });
      if (!res) return;
      showToast(res.message, 'success');
      document.getElementById('add-role-form').reset();
      document.getElementById('role-emoji').value = '🎮';
      loadRoles();
      loadActivityLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('send-panel-btn').addEventListener('click', async () => {
    try {
      const res = await apiFetch('/roles/send-panel', { method: 'POST' });
      if (!res) return;
      showToast(res.message, 'success');
      loadActivityLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // --- YÖNETİCİ HESAPLARI ---
  async function loadAdmins() {
    try {
      const data = await apiFetch('/admins');
      if (!data) return;

      const container = document.getElementById('admin-list-container');
      const admins = data.admins || [];

      if (admins.length === 0) {
        container.innerHTML = `<p class="text-center text-muted">Yönetici bulunamadı.</p>`;
        return;
      }

      container.innerHTML = admins.map((a) => {
        const isSuper = a.role === 'superadmin';
        const canDelete = currentUser?.role === 'superadmin' && a.id !== currentUser.id;
        return `
          <div class="list-item">
            <div class="item-main">
              <i class="fa-solid ${isSuper ? 'fa-user-shield' : 'fa-user-gear'}"></i>
              <div>
                <div class="item-title">${a.email}</div>
                <div class="item-subtitle">Oluşturulma: ${new Date(a.createdAt).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge ${isSuper ? 'badge-purple' : 'badge-blue'}">${isSuper ? 'Süper Yönetici' : 'Yönetici'}</span>
              ${canDelete ? `<button class="btn btn-sm btn-ghost delete-admin-btn" data-id="${a.id}"><i class="fa-solid fa-user-xmark"></i></button>` : ''}
            </div>
          </div>`;
      }).join('');

      document.querySelectorAll('.delete-admin-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Bu yönetici hesabını silmek istediğinize emin misiniz?')) {
            try {
              const res = await apiFetch(`/admins/${id}`, { method: 'DELETE' });
              if (!res) return;
              showToast(res.message, 'warn');
              loadAdmins();
              loadActivityLogs();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });
    } catch (err) {
      console.error('Yöneticiler yüklenemedi:', err);
    }
  }

  document.getElementById('add-admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const role = document.getElementById('admin-role').value;

    try {
      const res = await apiFetch('/admins', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
      if (!res) return;
      showToast(res.message, 'success');
      document.getElementById('add-admin-form').reset();
      loadAdmins();
      loadActivityLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('refresh-admins-btn').addEventListener('click', loadAdmins);

  // --- BAŞLANGIÇ ---
  checkAuth();
});
