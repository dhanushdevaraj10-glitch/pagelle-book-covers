import {
  STORAGE_SESSION_KEY,
  getCurrentSession,
  deleteCommunityCover,
  showToast
} from './shared.js';

let overviewData = {
  users: [],
  loginLogs: [],
  communityCovers: []
};
let activeTab = 'logs';

const adminWelcomeTextEl = document.getElementById('adminWelcomeText');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const breadcrumbCurrentEl = document.getElementById('adminBreadcrumbCurrent');

const tabButtons = document.querySelectorAll('[data-admin-tab]');
const panelLogsEl = document.getElementById('panelLogs');
const panelUsersEl = document.getElementById('panelUsers');
const panelCoversEl = document.getElementById('panelCovers');
const panelSecurityEl = document.getElementById('panelSecurity');
const changePasswordFormEl = document.getElementById('changePasswordForm');
const currentPasswordInputEl = document.getElementById('currentPasswordInput');
const newPasswordInputEl = document.getElementById('newPasswordInput');
const confirmPasswordInputEl = document.getElementById('confirmPasswordInput');
const passwordChangeErrorEl = document.getElementById('passwordChangeError');

const navLogsCountEl = document.getElementById('navLogsCount');
const navUsersCountEl = document.getElementById('navUsersCount');
const navCoversCountEl = document.getElementById('navCoversCount');

const kpiUsersEl = document.getElementById('kpiUsers');
const kpiLoginsEl = document.getElementById('kpiLogins');
const kpiTodayEl = document.getElementById('kpiToday');
const kpiCoversEl = document.getElementById('kpiCovers');

const logSearchInputEl = document.getElementById('logSearchInput');
const logFilterSelectEl = document.getElementById('logFilterSelect');
const logsTableBodyEl = document.getElementById('logsTableBody');
const logsEmptyEl = document.getElementById('logsEmpty');

const userSearchInputEl = document.getElementById('userSearchInput');
const userFilterSelectEl = document.getElementById('userFilterSelect');
const usersTableBodyEl = document.getElementById('usersTableBody');
const usersEmptyEl = document.getElementById('usersEmpty');

const coversTableBodyEl = document.getElementById('coversTableBody');
const coversEmptyEl = document.getElementById('coversEmpty');
const refreshAdminBtn = document.getElementById('refreshAdminBtn');

function formatDateTime(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function summarizeUserAgent(ua = '') {
  const s = String(ua);
  let browser = 'Browser';
  if (s.includes('Edg/')) browser = 'Edge';
  else if (s.includes('Chrome/')) browser = 'Chrome';
  else if (s.includes('Firefox/')) browser = 'Firefox';
  else if (s.includes('Safari/') && !s.includes('Chrome/')) browser = 'Safari';
  else if (s.includes('PowerShell') || s.includes('curl')) browser = 'CLI Client';

  let os = 'Desktop';
  if (s.includes('Windows')) os = 'Windows';
  else if (s.includes('Mac OS')) os = 'macOS';
  else if (s.includes('Android')) os = 'Android';
  else if (s.includes('iPhone') || s.includes('iPad')) os = 'iOS';
  else if (s.includes('Linux')) os = 'Linux';

  return `${browser} · ${os}`;
}

function switchTab(tab) {
  activeTab = tab;
  tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.adminTab === tab));
  panelLogsEl.classList.toggle('hidden', tab !== 'logs');
  panelUsersEl.classList.toggle('hidden', tab !== 'users');
  panelCoversEl.classList.toggle('hidden', tab !== 'covers');
  panelSecurityEl.classList.toggle('hidden', tab !== 'security');

  const labels = {
    logs: 'Login Activity Logs',
    users: 'Users',
    covers: 'Community Covers',
    security: 'Change Password'
  };
  breadcrumbCurrentEl.textContent = labels[tab] || 'Overview';
}

async function fetchAdminOverview() {
  const session = getCurrentSession();
  const isOwner = session && session.email && session.email.toLowerCase() === 'dhanushdevaraj10@gmail.com';
  const isAdmin = session && (session.role === 'admin' || isOwner);
  if (!session || !isAdmin) {
    window.location.replace('index.html');
    return;
  }

  const token = isOwner ? 'pagelle_admin_master_session_token_dhanush_2026' : (session.token || '');
  const res = await fetch('/api/admin/overview', {
    headers: { 'x-auth-token': token }
  });

  if (!res.ok) {
    console.error('Admin overview failed (HTTP ' + res.status + ')');
    if (!isOwner) {
      window.location.replace('index.html');
      return;
    }
  }

  if (res.ok) {
    overviewData = await res.json();
    renderStats();
    renderLogs();
    renderUsers();
    renderCovers();
  }
}

function renderStats() {
  const users = overviewData.users || [];
  const logs = overviewData.loginLogs || [];
  const covers = overviewData.communityCovers || [];

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const loginsToday = logs.filter(
    (l) => l.status === 'Success' && String(l.timestamp || '').startsWith(todayPrefix)
  ).length;

  navUsersCountEl.textContent = String(users.length);
  navLogsCountEl.textContent = String(logs.length);
  navCoversCountEl.textContent = String(covers.length);

  kpiUsersEl.textContent = String(users.length);
  kpiLoginsEl.textContent = String(logs.length);
  kpiTodayEl.textContent = String(loginsToday);
  kpiCoversEl.textContent = String(covers.length);
}

function renderLogs() {
  const q = logSearchInputEl.value.trim().toLowerCase();
  const filter = logFilterSelectEl.value;

  const filtered = (overviewData.loginLogs || []).filter((log) => {
    if (filter === 'Sign Up' && log.action !== 'Sign Up') return false;
    if ((filter === 'Success' || filter === 'Failed' || filter === 'Blocked') && log.status !== filter) {
      return false;
    }
    if (!q) return true;
    return (
      String(log.name || '').toLowerCase().includes(q) ||
      String(log.email || '').toLowerCase().includes(q) ||
      String(log.ip || '').toLowerCase().includes(q)
    );
  });

  logsTableBodyEl.innerHTML = '';
  logsEmptyEl.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach((log) => {
    const tr = document.createElement('tr');

    const statusClass =
      log.status === 'Success'
        ? 'badge-success'
        : log.status === 'Blocked'
          ? 'badge-warn'
          : 'badge-danger';

    const roleClass = log.role === 'admin' ? 'badge-admin' : 'badge-member';

    tr.innerHTML = `
      <td>
        <div class="table-primary-text"></div>
        <div class="table-sub-text"></div>
      </td>
      <td><span class="admin-badge ${roleClass}">${log.role === 'admin' ? 'ADMIN' : 'USER'}</span></td>
      <td>${log.action}</td>
      <td><span class="admin-badge ${statusClass}">${log.status}</span></td>
      <td><code>${log.ip || '127.0.0.1'}</code></td>
      <td title="${String(log.userAgent || '').replace(/"/g, '&quot;')}">${summarizeUserAgent(log.userAgent)}</td>
      <td>${formatDateTime(log.timestamp)}</td>
    `;
    tr.querySelector('.table-primary-text').textContent = log.name || 'Unknown';
    tr.querySelector('.table-sub-text').textContent = log.email || '—';
    logsTableBodyEl.appendChild(tr);
  });
}

async function updateUserPermission(userId, patch) {
  const session = getCurrentSession();
  const res = await fetch('/api/admin/users', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': session.token
    },
    body: JSON.stringify({ userId, ...patch })
  });
  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || 'Could not update user.');
    return;
  }
  showToast('User permissions updated.');
  await fetchAdminOverview();
}

async function deleteUserAccount(userId, email) {
  const session = getCurrentSession();
  const res = await fetch('/api/admin/users', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': session.token
    },
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || 'Could not remove user.');
    return;
  }
  showToast(`Removed user ${email}`);
  await fetchAdminOverview();
}

function renderUsers() {
  const q = userSearchInputEl.value.trim().toLowerCase();
  const filter = userFilterSelectEl.value;

  const filtered = (overviewData.users || []).filter((u) => {
    if (filter === 'admin' && u.role !== 'admin') return false;
    if (filter === 'user' && u.role !== 'user') return false;
    if (filter === 'blocked' && u.active !== false) return false;
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  usersTableBodyEl.innerHTML = '';
  usersEmptyEl.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach((u) => {
    const tr = document.createElement('tr');
    const roleBadge = u.role === 'admin' ? 'badge-admin' : 'badge-member';
    const statusBadge = u.active ? 'badge-success' : 'badge-warn';

    const nameTd = document.createElement('td');
    nameTd.innerHTML = `<div class="table-primary-text"></div>`;
    nameTd.querySelector('.table-primary-text').textContent = u.name;

    const emailTd = document.createElement('td');
    emailTd.textContent = u.email;

    const roleTd = document.createElement('td');
    roleTd.innerHTML = `<span class="admin-badge ${roleBadge}">${u.role === 'admin' ? 'ADMIN' : 'MEMBER'}</span>`;

    const statusTd = document.createElement('td');
    statusTd.innerHTML = `<span class="admin-badge ${statusBadge}">${u.active ? 'Active' : 'Blocked'}</span>`;

    const countTd = document.createElement('td');
    countTd.textContent = String(u.loginCount || 0);

    const lastTd = document.createElement('td');
    lastTd.textContent = formatDateTime(u.lastLoginAt);

    const joinedTd = document.createElement('td');
    joinedTd.textContent = formatDateTime(u.createdAt);

    const actionsTd = document.createElement('td');
    actionsTd.className = 'admin-actions-cell';

    if (u.isOwner) {
      const ownerTag = document.createElement('span');
      ownerTag.className = 'owner-protected-tag';
      ownerTag.textContent = 'Primary Owner';
      actionsTd.appendChild(ownerTag);
    } else {
      const toggleActiveBtn = document.createElement('button');
      toggleActiveBtn.type = 'button';
      toggleActiveBtn.className = 'admin-action-btn';
      toggleActiveBtn.textContent = u.active ? 'Block' : 'Activate';
      toggleActiveBtn.addEventListener('click', () =>
        updateUserPermission(u.id, { active: !u.active })
      );

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'admin-action-btn admin-action-danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteUserAccount(u.id, u.email));

      actionsTd.appendChild(toggleActiveBtn);
      actionsTd.appendChild(delBtn);
    }

    tr.append(nameTd, emailTd, roleTd, statusTd, countTd, lastTd, joinedTd, actionsTd);
    usersTableBodyEl.appendChild(tr);
  });
}

function renderCovers() {
  const covers = overviewData.communityCovers || [];
  coversTableBodyEl.innerHTML = '';
  coversEmptyEl.classList.toggle('hidden', covers.length > 0);

  covers.forEach((cover) => {
    const tr = document.createElement('tr');

    const thumbTd = document.createElement('td');
    const img = document.createElement('img');
    img.src = cover.image;
    img.alt = cover.title;
    img.className = 'admin-cover-thumb';
    thumbTd.appendChild(img);

    const infoTd = document.createElement('td');
    infoTd.innerHTML = `<div class="table-primary-text"></div><div class="table-sub-text"></div>`;
    infoTd.querySelector('.table-primary-text').textContent = cover.title;
    infoTd.querySelector('.table-sub-text').textContent = `by ${cover.author}`;

    const genreTd = document.createElement('td');
    genreTd.textContent = cover.genre || 'Fiction';

    const byTd = document.createElement('td');
    byTd.innerHTML = `<div class="table-primary-text"></div><div class="table-sub-text"></div>`;
    byTd.querySelector('.table-primary-text').textContent = cover.submittedByName || 'Community';
    byTd.querySelector('.table-sub-text').textContent = cover.submittedByEmail || '—';

    const dateTd = document.createElement('td');
    dateTd.textContent = formatDateTime(cover.createdAt);

    const actTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'admin-action-btn admin-action-danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      try {
        await deleteCommunityCover(cover.id);
        showToast(`Deleted "${cover.title}"`);
        await fetchAdminOverview();
      } catch (err) {
        showToast(err.message || 'Could not delete cover.');
      }
    });
    actTd.appendChild(delBtn);

    tr.append(thumbTd, infoTd, genreTd, byTd, dateTd, actTd);
    coversTableBodyEl.appendChild(tr);
  });
}

async function init() {
  const session = getCurrentSession();
  if (!session || session.role !== 'admin') {
    window.location.replace('index.html');
    return;
  }

  adminWelcomeTextEl.textContent = `WELCOME, ${(session.name || 'ADMIN').toUpperCase()}`;

  adminLogoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-auth-token': session.token || '' }
      });
    } catch {
      // Ignore
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
    window.location.replace('login.html');
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.adminTab));
  });

  logSearchInputEl.addEventListener('input', renderLogs);
  logFilterSelectEl.addEventListener('change', renderLogs);
  userSearchInputEl.addEventListener('input', renderUsers);
  userFilterSelectEl.addEventListener('change', renderUsers);
  refreshAdminBtn.addEventListener('click', async () => {
    await fetchAdminOverview();
    showToast('Admin data refreshed');
  });

  if (changePasswordFormEl) {
    changePasswordFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      passwordChangeErrorEl.classList.add('hidden');
      const currentPassword = currentPasswordInputEl.value;
      const newPassword = newPasswordInputEl.value;
      const confirmPassword = confirmPasswordInputEl.value;

      if (newPassword.length < 6) {
        passwordChangeErrorEl.textContent = 'New password must be at least 6 characters.';
        passwordChangeErrorEl.classList.remove('hidden');
        return;
      }
      if (newPassword !== confirmPassword) {
        passwordChangeErrorEl.textContent = 'New password and confirmation do not match.';
        passwordChangeErrorEl.classList.remove('hidden');
        return;
      }

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': session.token
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        passwordChangeErrorEl.textContent = data.error || 'Could not update password.';
        passwordChangeErrorEl.classList.remove('hidden');
        return;
      }
      changePasswordFormEl.reset();
      showToast('Admin password updated successfully.');
    });
  }

  await fetchAdminOverview();
}

init();
