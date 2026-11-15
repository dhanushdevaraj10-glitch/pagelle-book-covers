import { CURATED_BOOKS } from './data.js';

export const STORAGE_USER_BOOKS_KEY = 'best_book_covers_user_v1';
export const STORAGE_FAVORITES_KEY = 'best_book_covers_favs_v1';

let toastTimer = null;

let serverCoversCache = null;

export function loadUserBooks() {
  if (Array.isArray(serverCoversCache)) {
    return serverCoversCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_USER_BOOKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function syncCommunityCovers() {
  try {
    const res = await fetch('/api/covers');
    if (!res.ok) return loadUserBooks();
    const data = await res.json();
    if (Array.isArray(data.covers)) {
      serverCoversCache = data.covers;
      saveUserBooks(data.covers);
      return data.covers;
    }
  } catch {
    // Fall back to cached localStorage covers
  }
  return loadUserBooks();
}

export async function publishCommunityCover(coverPayload) {
  const session = getCurrentSession();
  const res = await fetch('/api/covers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': session ? session.token : ''
    },
    body: JSON.stringify(coverPayload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not publish cover.');
  }
  const current = loadUserBooks();
  const updated = [data.cover, ...current.filter((c) => c.id !== data.cover.id)];
  serverCoversCache = updated;
  saveUserBooks(updated);
  return data.cover;
}

export async function deleteCommunityCover(coverId) {
  const session = getCurrentSession();
  const res = await fetch('/api/covers', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': session ? session.token : ''
    },
    body: JSON.stringify({ coverId })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not delete cover.');
  }
  const updated = loadUserBooks().filter((b) => b.id !== coverId);
  serverCoversCache = updated;
  saveUserBooks(updated);
}

export function saveUserBooks(userBooks) {
  try {
    localStorage.setItem(STORAGE_USER_BOOKS_KEY, JSON.stringify(userBooks));
    return true;
  } catch {
    showToast('Storage is full. Try uploading a smaller cover image.');
    return false;
  }
}

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites) {
  try {
    localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage quota errors for favorites
  }
}

export function getAllBooks() {
  return [...loadUserBooks(), ...CURATED_BOOKS];
}

export function findBookById(id) {
  return getAllBooks().find((b) => b.id === id) || null;
}

export function showToast(message) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3200);
}

export function createBookCardElement(book, onSelect, className = 'book-card-btn') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.addEventListener('click', () => onSelect(book.id));

  const thumb = document.createElement('div');
  thumb.className = 'book-cover-thumb';

  const img = document.createElement('img');
  img.src = book.image;
  img.alt = `${book.title} by ${book.author}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  thumb.appendChild(img);

  const titleEl = document.createElement('div');
  titleEl.className = 'book-card-title';
  titleEl.textContent = book.title;

  const authorEl = document.createElement('div');
  authorEl.className = 'book-card-author';
  authorEl.textContent = `by ${book.author}`;

  btn.appendChild(thumb);
  btn.appendChild(titleEl);
  btn.appendChild(authorEl);

  return btn;
}

// Instant Page Prefetcher for silky 0ms navigation
export function initInstantPrefetch() {
  if (typeof window === 'undefined' || window.__prefetcherInitialized) return;
  window.__prefetcherInitialized = true;
  const prefetched = new Set();

  function prefetchUrl(url) {
    if (!url || prefetched.has(url)) return;
    try {
      const u = new URL(url, window.location.href);
      if (u.origin !== window.location.origin) return;
      const path = u.pathname.toLowerCase();
      if (
        path.startsWith('/api/') ||
        path.endsWith('.jpg') ||
        path.endsWith('.png') ||
        path.endsWith('.webp') ||
        path.endsWith('.svg')
      ) {
        return;
      }
      prefetched.add(u.pathname);
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = u.pathname;
      document.head.appendChild(link);
    } catch {}
  }

  document.addEventListener(
    'mouseover',
    (e) => {
      const a = e.target.closest('a');
      if (a && a.href && !a.href.startsWith('mailto:') && !a.href.startsWith('#') && !a.href.startsWith('javascript:')) {
        prefetchUrl(a.href);
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchstart',
    (e) => {
      const a = e.target.closest('a');
      if (a && a.href && !a.href.startsWith('mailto:') && !a.href.startsWith('#') && !a.href.startsWith('javascript:')) {
        prefetchUrl(a.href);
      }
    },
    { passive: true }
  );
}

export const OWNER_EMAIL = 'dhanushdevaraj10@gmail.com';
export const MASTER_ADMIN_TOKEN = 'pagelle_admin_master_session_token_dhanush_2026';
export const STORAGE_SESSION_KEY = 'best_book_covers_session_v1';
export const STORAGE_ACCOUNTS_KEY = 'best_book_covers_accounts_v1';
export const STORAGE_DELETED_ACCOUNTS_KEY = 'best_book_covers_deleted_accounts_v1';

export function getDeletedAccountEmails() {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_ACCOUNTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map((e) => String(e).toLowerCase().trim()) : [];
  } catch {
    return [];
  }
}

export function isAccountDeleted(email) {
  if (!email) return false;
  const deleted = getDeletedAccountEmails();
  return deleted.includes(String(email).toLowerCase().trim());
}

export function markAccountDeleted(email) {
  if (!email) return;
  const clean = String(email).toLowerCase().trim();
  const deleted = getDeletedAccountEmails();
  if (!deleted.includes(clean)) {
    deleted.push(clean);
    try {
      localStorage.setItem(STORAGE_DELETED_ACCOUNTS_KEY, JSON.stringify(deleted));
    } catch {}
  }
}

// Immediately purge legacy Dhanush Studio dummy profile from local state on startup
(function purgeLegacyStudioProfile() {
  try {
    markAccountDeleted('dhanush.studio@pinterest.com');
    markAccountDeleted('usr-studio');

    const rawAccs = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (rawAccs) {
      const arr = JSON.parse(rawAccs);
      if (Array.isArray(arr)) {
        const cleanArr = arr.filter(
          (a) =>
            a &&
            a.id !== 'usr-studio' &&
            a.email?.toLowerCase().trim() !== 'dhanush.studio@pinterest.com' &&
            a.name !== 'Dhanush Studio'
        );
        localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(cleanArr));
      }
    }

    const rawFollowing = localStorage.getItem(STORAGE_FOLLOWING_KEY);
    if (rawFollowing) {
      const fList = JSON.parse(rawFollowing);
      if (Array.isArray(fList)) {
        const cleanF = fList.filter(
          (id) =>
            id !== 'usr-studio' &&
            id !== 'dhanush.studio@pinterest.com' &&
            id !== 'dhanush_studio' &&
            id !== '@dhanush_studio'
        );
        localStorage.setItem(STORAGE_FOLLOWING_KEY, JSON.stringify(cleanF));
      }
    }

    const rawComm = localStorage.getItem(STORAGE_COMMUNITY_USERS_KEY);
    if (rawComm) {
      const cList = JSON.parse(rawComm);
      if (Array.isArray(cList)) {
        const cleanC = cList.filter(
          (u) =>
            u &&
            u.id !== 'usr-studio' &&
            u.email?.toLowerCase().trim() !== 'dhanush.studio@pinterest.com' &&
            u.name !== 'Dhanush Studio'
        );
        localStorage.setItem(STORAGE_COMMUNITY_USERS_KEY, JSON.stringify(cleanC));
      }
    }
  } catch {}
})();

export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !parsed.email) return null;

    const isOwner = parsed.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    // Ensure owner always has verified admin role and permanent master admin token
    if (isOwner) {
      parsed.role = 'admin';
      parsed.token = MASTER_ADMIN_TOKEN;
    }

    // Ensure session always has an avatar and never reverts to outdated/default placeholders
    if (!parsed.avatar || (isOwner && parsed.avatar.includes('default-avatar'))) {
      try {
        const cachedAvatar = localStorage.getItem(`best_book_covers_avatar_${parsed.email.toLowerCase()}`);
        if (cachedAvatar && !cachedAvatar.includes('default-avatar')) {
          parsed.avatar = cachedAvatar;
        }
      } catch {}

      if (!parsed.avatar || (isOwner && parsed.avatar.includes('default-avatar'))) {
        try {
          const stored = JSON.parse(localStorage.getItem(STORAGE_ACCOUNTS_KEY) || '[]');
          const match = stored.find((a) => a.email && a.email.toLowerCase() === parsed.email.toLowerCase());
          if (match && match.avatar && !match.avatar.includes('default-avatar')) {
            parsed.avatar = match.avatar;
          }
        } catch {}
      }

      if (!parsed.avatar || (isOwner && parsed.avatar.includes('default-avatar'))) {
        parsed.avatar = isOwner ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png';
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getStoredAccounts(currentSession) {
  let accounts = [];
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    accounts = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(accounts)) accounts = [];
  } catch {
    accounts = [];
  }

  // Strictly filter out any accounts marked deleted or Dhanush Studio dummy profile
  const deletedEmails = getDeletedAccountEmails();
  accounts = accounts.filter(
    (a) =>
      a &&
      a.email &&
      a.id !== 'usr-studio' &&
      a.email.toLowerCase().trim() !== 'dhanush.studio@pinterest.com' &&
      a.name !== 'Dhanush Studio' &&
      !deletedEmails.includes(a.email.toLowerCase().trim())
  );

  // Pre-seed accounts if empty (matching single verified user session)
  if (accounts.length === 0) {
    const activeName = (currentSession && currentSession.name) || 'Dhanush';
    const activeEmail = (currentSession && currentSession.email) || OWNER_EMAIL;
    const activeRole = (currentSession && currentSession.role) || (activeEmail === OWNER_EMAIL ? 'admin' : 'user');
    const activeType = (currentSession && currentSession.accountType) || 'Personal';
    const activeAvatar = (currentSession && currentSession.avatar) || (activeEmail === OWNER_EMAIL ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png');

    accounts = [
      {
        id: (currentSession && currentSession.userId) || 'usr-admin-owner',
        name: activeName,
        email: activeEmail,
        role: activeRole,
        accountType: activeType,
        avatar: activeAvatar
      }
    ];

    try {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {}
  } else if (currentSession && currentSession.email && !deletedEmails.includes(currentSession.email.toLowerCase().trim())) {
    // Keep active session in sync with stored list
    const idx = accounts.findIndex((a) => a.email.toLowerCase() === currentSession.email.toLowerCase());
    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        name: currentSession.name || accounts[idx].name,
        role: currentSession.role || accounts[idx].role,
        accountType: currentSession.accountType || accounts[idx].accountType || 'Personal',
        avatar: currentSession.avatar || accounts[idx].avatar || (currentSession.email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png')
      };
    } else {
      accounts.push({
        id: currentSession.userId || `usr-${Date.now()}`,
        name: currentSession.name || currentSession.email.split('@')[0],
        email: currentSession.email,
        role: currentSession.role || 'user',
        accountType: currentSession.accountType || 'Personal',
        avatar: currentSession.avatar || (currentSession.email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png')
      });
    }
    try {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {}
  }

  return accounts;
}

export function saveStoredAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

export function updateCurrentProfile({ name, bio, avatar, accountType }) {
  const session = getCurrentSession() || {};
  if (name && typeof name === 'string' && name.trim()) session.name = name.trim();
  if (typeof bio === 'string') session.bio = bio.trim();
  if (avatar && typeof avatar === 'string') session.avatar = avatar;
  if (accountType && typeof accountType === 'string') session.accountType = accountType;

  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    if (session.email && session.avatar) {
      localStorage.setItem(`best_book_covers_avatar_${session.email.toLowerCase()}`, session.avatar);
    }
  } catch {}

  const accounts = getStoredAccounts(session);
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === (session.email || '').toLowerCase());
  if (idx >= 0) {
    if (name) accounts[idx].name = session.name;
    if (typeof bio === 'string') accounts[idx].bio = session.bio;
    if (avatar) accounts[idx].avatar = session.avatar;
    if (accountType) accounts[idx].accountType = session.accountType;
    saveStoredAccounts(accounts);
  }

  // Sync to server profile in background
  try {
    fetch('/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': session.token || '',
        'x-user-email': session.email || ''
      },
      body: JSON.stringify({
        name: session.name,
        bio: session.bio,
        avatar: session.avatar,
        accountType: session.accountType,
        email: session.email
      })
    }).catch(() => {});
  } catch {}

  // Update header and mobile dock avatar images immediately
  if (session.avatar) {
    document.querySelectorAll('.nav-profile-avatar-img, .dropdown-active-avatar-img, #profileAvatarImg, .mobile-dock-avatar-img').forEach((img) => {
      img.src = session.avatar;
    });
  }
  if (session.name) {
    document.querySelectorAll('.dropdown-active-name, #profileDisplayName').forEach((el) => {
      el.textContent = session.name;
    });
  }
  if (typeof session.bio === 'string') {
    const bioEl = document.getElementById('profileBio');
    if (bioEl) bioEl.textContent = session.bio;
  }

  return session;
}

export function switchActiveAccount(targetAccount) {
  const current = getCurrentSession() || {};
  const newSession = {
    userId: targetAccount.id || `usr-${Date.now()}`,
    name: targetAccount.name,
    email: targetAccount.email,
    role: targetAccount.role || (targetAccount.email.toLowerCase() === OWNER_EMAIL ? 'admin' : 'user'),
    accountType: targetAccount.accountType || 'Personal',
    avatar: targetAccount.avatar || 'assets/default-avatar.png',
    token: current.token || 'demo-token',
    loggedInAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newSession));
  } catch {}

  showToast(`Switched account to ${targetAccount.name}`);
  setTimeout(() => {
    window.location.reload();
  }, 350);
}

export async function deleteAccount(targetEmail) {
  if (!targetEmail) return false;
  const session = getCurrentSession();
  const normalizedTarget = targetEmail.trim().toLowerCase();

  if (normalizedTarget === OWNER_EMAIL.toLowerCase()) {
    showToast('The primary administrator account cannot be deleted.');
    return false;
  }

  // 1. Mark account permanently deleted in blacklist
  markAccountDeleted(normalizedTarget);

  // 2. Notify backend server
  try {
    const res = await fetch('/api/user/account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': (session && session.token) || ''
      },
      body: JSON.stringify({ email: normalizedTarget })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status === 400) {
      showToast(data.error || 'The primary administrator account cannot be deleted.');
      return false;
    }
  } catch {
    // If network fails, proceed with client cleanup
  }

  // 3. Remove permanently from stored accounts list in localStorage
  let accounts = [];
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    accounts = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(accounts)) accounts = [];
  } catch {
    accounts = [];
  }
  accounts = accounts.filter((a) => a && a.email && a.email.toLowerCase().trim() !== normalizedTarget);
  saveStoredAccounts(accounts);
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}

  // 4. Remove local community covers submitted by this account
  try {
    const storedCovers = loadUserBooks();
    const filteredCovers = storedCovers.filter(
      (c) => !c.submittedByEmail || c.submittedByEmail.toLowerCase().trim() !== normalizedTarget
    );
    localStorage.setItem(STORAGE_USER_BOOKS_KEY, JSON.stringify(filteredCovers));
  } catch {}

  // 5. Clean up following / followers links for this account
  try {
    localStorage.removeItem(`bookcover_following_${normalizedTarget}`);
    if (session && session.email) {
      const activeFollowKey = `bookcover_following_${session.email.toLowerCase().trim()}`;
      const raw = localStorage.getItem(activeFollowKey);
      if (raw) {
        let list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list = list.filter((id) => id && id.toLowerCase() !== normalizedTarget && id !== 'usr-studio');
          localStorage.setItem(activeFollowKey, JSON.stringify(list));
        }
      }
    }
  } catch {}

  const isCurrentActive = session && session.email.toLowerCase() === normalizedTarget;

  if (isCurrentActive) {
    if (accounts.length > 0) {
      showToast(`Account deleted. Switching to ${accounts[0].name}...`);
      setTimeout(() => {
        switchActiveAccount(accounts[0]);
      }, 500);
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      showToast('Account deleted successfully.');
      setTimeout(() => {
        window.location.replace('login.html');
      }, 600);
    }
  } else {
    showToast(`Account (${targetEmail}) deleted successfully.`);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }

  return true;
}

export function closeConfirmModal() {
  const existing = document.getElementById('confirmModalOverlay');
  if (existing) existing.remove();
}

export function openConfirmModal({
  title = 'Confirm Action',
  message = 'Are you sure?',
  subtext = '',
  confirmLabel = 'Delete',
  isDanger = true,
  onConfirm
}) {
  closeConfirmModal();

  const overlay = document.createElement('div');
  overlay.id = 'confirmModalOverlay';
  overlay.className = 'account-modal-overlay confirm-modal-overlay';
  overlay.innerHTML = `
    <div class="account-modal-card confirm-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
      <div class="confirm-modal-header">
        <div class="confirm-modal-icon-wrap ${isDanger ? 'confirm-danger' : ''}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>
        <div class="confirm-modal-title-group">
          <h3 class="account-modal-title confirm-modal-title" id="confirmModalTitle">${escapeHtml(title)}</h3>
          <p class="confirm-modal-message">${message}</p>
        </div>
      </div>
      ${subtext ? `<div class="confirm-modal-subtext">${subtext}</div>` : ''}
      <div class="account-modal-actions confirm-modal-actions">
        <button type="button" class="account-modal-cancel-btn" id="confirmCancelBtn">Cancel</button>
        <button type="button" class="${isDanger ? 'confirm-danger-btn' : 'account-modal-submit-btn'}" id="confirmProceedBtn">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
  };

  overlay.querySelector('#confirmCancelBtn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const proceedBtn = overlay.querySelector('#confirmProceedBtn');
  proceedBtn.addEventListener('click', async () => {
    proceedBtn.disabled = true;
    proceedBtn.textContent = 'Deleting...';
    try {
      if (typeof onConfirm === 'function') {
        await onConfirm();
      }
    } finally {
      close();
    }
  });
}

export function initAuthHeader() {
  initInstantPrefetch();
  const nav = document.querySelector('.header-nav');
  if (!nav) return;
  const header = nav.closest('.site-header') || nav.parentNode;
  if (!header || header.querySelector('.nav-user-wrap')) return;

  const session = getCurrentSession();
  if (!session) return;

  const isOwner = session.email && session.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isAdmin = session.role === 'admin' || isOwner;

  // Add Admin link if owner / admin
  if (isAdmin && !nav.querySelector('.nav-admin-link')) {
    const adminLink = document.createElement('a');
    adminLink.href = 'admin.html';
    adminLink.className = 'nav-link nav-admin-link';
    if (window.location.pathname.endsWith('admin.html')) {
      adminLink.classList.add('active');
    }
    adminLink.textContent = 'Admin';
    nav.appendChild(adminLink);
  }

  const allAccounts = getStoredAccounts(session);
  const currentAccountType = session.accountType || 'Personal';
  const otherAccounts = allAccounts.filter(
    (acc) => acc.email.toLowerCase() !== session.email.toLowerCase()
  );

  const wrap = document.createElement('div');
  wrap.className = 'nav-user-wrap';

  // 1. Profile Picture Circular Button
  const profileBtn = document.createElement('button');
  profileBtn.type = 'button';
  profileBtn.className = 'nav-profile-btn';
  profileBtn.setAttribute('aria-label', `${session.name || 'User'} profile and accounts menu`);
  profileBtn.setAttribute('aria-haspopup', 'true');
  profileBtn.setAttribute('title', 'Open account switcher');

  profileBtn.innerHTML = `
    <span class="nav-profile-avatar-circle">
      <img src="${session.avatar || 'assets/default-avatar.png'}" class="nav-profile-avatar-img" alt="${escapeHtml(session.name || 'User')}" onerror="this.src='assets/default-avatar.png'" />
    </span>
  `;

  // 2. Small Dropdown Arrow Button Beside Profile Picture
  const chevronBtn = document.createElement('button');
  chevronBtn.type = 'button';
  chevronBtn.className = 'nav-chevron-btn';
  chevronBtn.setAttribute('aria-label', 'Accounts and settings menu');
  chevronBtn.setAttribute('aria-haspopup', 'true');
  chevronBtn.setAttribute('aria-expanded', 'false');

  chevronBtn.innerHTML = `
    <span class="nav-chevron-icon">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </span>
    <span class="nav-chevron-tooltip">Accounts</span>
  `;

  // 3. Pinterest-inspired Dropdown Menu Panel (~350px width)
  const menu = document.createElement('div');
  menu.className = 'nav-user-dropdown hidden';
  menu.setAttribute('role', 'menu');

  // Render switchable other accounts HTML
  const otherAccountsHtml = otherAccounts
    .map(
      (acc) => `
      <div class="dropdown-switch-item" role="menuitem">
        <button type="button" class="dropdown-switch-main" data-switch-email="${escapeHtml(acc.email)}" title="Switch to ${escapeHtml(acc.name)}">
          <img src="${acc.avatar || 'assets/default-avatar.png'}" class="dropdown-switch-avatar" alt="${escapeHtml(acc.name)}" onerror="this.src='assets/default-avatar.png'" />
          <div class="dropdown-switch-meta">
            <div class="dropdown-switch-name">${escapeHtml(acc.name)}</div>
            <div class="dropdown-switch-sub">${escapeHtml(acc.accountType || 'Personal')} &bull; ${escapeHtml(acc.email)}</div>
          </div>
        </button>
        <div class="dropdown-switch-actions">
          <button type="button" class="dropdown-switch-pill" data-switch-email="${escapeHtml(acc.email)}" title="Switch to ${escapeHtml(acc.name)}">Switch</button>
          <button type="button" class="dropdown-switch-delete-btn" data-delete-account-email="${escapeHtml(acc.email)}" data-delete-account-name="${escapeHtml(acc.name)}" title="Delete account ${escapeHtml(acc.name)}" aria-label="Delete account ${escapeHtml(acc.name)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `
    )
    .join('');

  menu.innerHTML = `
    <!-- Section 1 – Currently In -->
    <div class="dropdown-heading">Currently in</div>
    <div class="dropdown-active-card" id="dropdownActiveCard" role="button" tabindex="0" title="Go to ${escapeHtml(session.name || 'your')} profile">
      <div class="dropdown-active-avatar-wrap">
        <img src="${session.avatar || 'assets/default-avatar.png'}" class="dropdown-active-avatar-img" alt="${escapeHtml(session.name || 'User')}" onerror="this.src='assets/default-avatar.png'" />
      </div>
      <div class="dropdown-active-info">
        <div class="dropdown-active-name-row">
          <span class="dropdown-active-name">${escapeHtml(session.name || session.email.split('@')[0])}</span>
        </div>
        <div class="dropdown-active-type">${escapeHtml(currentAccountType)}</div>
        <div class="dropdown-active-email" title="${escapeHtml(session.email)}">${escapeHtml(session.email)}</div>
      </div>
      <div class="dropdown-active-check" aria-hidden="true" title="Current Active Account">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </div>

    <!-- Admin Access (Exclusively for Dhanush / Admin) -->
    ${
      isAdmin
        ? `
      <a href="admin.html" class="dropdown-menu-item dropdown-admin-item" id="dropdownAdminLink" role="menuitem" title="Open Site Administration Dashboard">
        <div class="dropdown-admin-main">
          <svg class="dropdown-admin-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span class="dropdown-admin-label">Admin Dashboard</span>
        </div>
        <span class="dropdown-admin-badge">Admin</span>
      </a>
    `
        : ''
    }

    <!-- Section 2 – Account Settings & Discover -->
    <a href="profile.html?explore=1" class="dropdown-menu-item" id="dropdownFindProfilesLink" role="menuitem" style="margin-top: 6px; text-decoration: none; color: inherit; display: flex; align-items: center;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 7px;">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <span>Find Profiles to Follow</span>
    </a>
    <button type="button" class="dropdown-menu-item" id="dropdownConvertBusinessBtn" role="menuitem">
      <span>${currentAccountType === 'Business' ? 'Convert to personal' : 'Convert to business'}</span>
    </button>

    <!-- Section 3 – Your Accounts -->
    <div class="dropdown-heading" style="margin-top: 8px;">Your accounts</div>
    ${
      otherAccounts.length > 0
        ? `<div class="dropdown-switch-list">${otherAccountsHtml}</div>`
        : ''
    }
    <button type="button" class="dropdown-menu-item" id="dropdownAddAccountBtn" role="menuitem">
      <span>+ Add Pagelle account</span>
    </button>

    <!-- Section 4 – Logout & Delete -->
    <div class="dropdown-divider"></div>
    <button type="button" class="dropdown-menu-item dropdown-logout-item" id="dropdownLogoutBtn" role="menuitem">
      <span>Log out</span>
    </button>
    <button type="button" class="dropdown-menu-item dropdown-danger-item" id="dropdownDeleteCurrentBtn" role="menuitem" title="Permanently delete current account">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
      <span>Delete current account</span>
    </button>
  `;

  // Toggle behavior
  function closeMenu() {
    menu.classList.add('hidden');
    chevronBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu(e) {
    if (e) e.stopPropagation();
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      menu.classList.remove('hidden');
      chevronBtn.setAttribute('aria-expanded', 'true');
    } else {
      closeMenu();
    }
  }

  profileBtn.addEventListener('click', toggleMenu);
  chevronBtn.addEventListener('click', toggleMenu);

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target) && !document.querySelector('.account-modal-overlay')?.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeAddAccountModal();
    }
  });

  // Section 1: Active card click -> navigate to Profile page
  const activeCard = menu.querySelector('#dropdownActiveCard');
  if (activeCard) {
    activeCard.addEventListener('click', () => {
      closeMenu();
      if (!window.location.pathname.endsWith('profile.html')) {
        window.location.href = 'profile.html';
      }
    });
    activeCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activeCard.click();
      }
    });
  }

  // Admin Dashboard link click -> close menu before navigating
  const adminDropdownLink = menu.querySelector('#dropdownAdminLink');
  if (adminDropdownLink) {
    adminDropdownLink.addEventListener('click', () => {
      closeMenu();
    });
  }

  // Section 2: Convert to Business / Personal toggle
  const convertBtn = menu.querySelector('#dropdownConvertBusinessBtn');
  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      const nextType = currentAccountType === 'Business' ? 'Personal' : 'Business';
      session.accountType = nextType;
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      } catch {}

      const accounts = getStoredAccounts(session);
      const curIdx = accounts.findIndex((a) => a.email.toLowerCase() === session.email.toLowerCase());
      if (curIdx >= 0) {
        accounts[curIdx].accountType = nextType;
        saveStoredAccounts(accounts);
      }

      showToast(`Account converted to ${nextType}!`);
      closeMenu();
      setTimeout(() => {
        window.location.reload();
      }, 300);
    });
  }

  // Section 3: Switch account clicks
  menu.querySelectorAll('[data-switch-email]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const email = btn.getAttribute('data-switch-email');
      const target = allAccounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (target) {
        closeMenu();
        switchActiveAccount(target);
      }
    });
  });

  // Section 3: Delete switchable accounts
  menu.querySelectorAll('[data-delete-account-email]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const email = btn.getAttribute('data-delete-account-email');
      const name = btn.getAttribute('data-delete-account-name') || email;
      closeMenu();
      openConfirmModal({
        title: `Delete Account "${name}"?`,
        message: `Are you sure you want to permanently delete account <strong>${escapeHtml(name)}</strong> (${escapeHtml(email)})?`,
        subtext: 'This account will be removed from your accounts list and all covers posted by this account will be erased.',
        confirmLabel: 'Delete Account',
        isDanger: true,
        onConfirm: () => deleteAccount(email)
      });
    });
  });

  // Section 3: Add BookCover Account Button
  const addAccountBtn = menu.querySelector('#dropdownAddAccountBtn');
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
      closeMenu();
      openAddAccountModal();
    });
  }

  // Section 4: Log Out
  const logoutBtn = menu.querySelector('#dropdownLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'x-auth-token': session.token || '' }
        });
      } catch {
        // Ignore network logout error
      }
      localStorage.removeItem(STORAGE_SESSION_KEY);
      window.location.replace('login.html');
    });
  }

  // Section 4: Delete Current Active Account
  const deleteCurrentBtn = menu.querySelector('#dropdownDeleteCurrentBtn');
  if (deleteCurrentBtn) {
    deleteCurrentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      if (session.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        showToast('The primary administrator account cannot be deleted.');
        return;
      }
      openConfirmModal({
        title: 'Delete Active Account?',
        message: `Are you sure you want to permanently delete your account <strong>${escapeHtml(session.name || session.email)}</strong> (${escapeHtml(session.email)})?`,
        subtext: 'All of your uploaded covers and profile settings will be permanently removed.',
        confirmLabel: 'Delete My Account',
        isDanger: true,
        onConfirm: () => deleteAccount(session.email)
      });
    });
  }

  wrap.appendChild(profileBtn);
  wrap.appendChild(chevronBtn);
  wrap.appendChild(menu);
  header.appendChild(wrap);

  // Initialize Pinterest-style mobile bottom navigation bar
  initMobileBottomNav();
}

export function initMobileBottomNav() {
  if (document.querySelector('.mobile-bottom-nav')) return;

  const session = getCurrentSession() || {};
  const avatar = session.avatar || 'assets/default-avatar.png';
  const pathname = window.location.pathname.toLowerCase();

  let active = '';
  if (pathname.endsWith('index.html') || pathname.endsWith('/') || pathname === '' || pathname.endsWith('bookcover/') || pathname.endsWith('bookcover')) {
    active = 'home';
  } else if (pathname.endsWith('browse.html')) {
    active = 'browse';
  } else if (pathname.endsWith('collections.html')) {
    active = 'collection';
  } else if (pathname.endsWith('profile.html')) {
    active = 'profile';
  }

  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile Navigation');

  nav.innerHTML = `
    <div class="mobile-bottom-dock">
      <a href="index.html" class="mobile-dock-btn ${active === 'home' ? 'active' : ''}" aria-label="Home" title="Home">
        <svg class="mobile-dock-icon mobile-dock-home-icon" width="26" height="26" viewBox="0 0 28 28" fill="none">
          <path d="M14 4.5C13.3 4.5 12.6 4.8 12.1 5.2L5.8 10.3C4.7 11.2 4 12.5 4 13.9V20C4 22.2 5.8 24 8 24H20C22.2 24 24 22.2 24 20V13.9C24 12.5 23.3 11.2 22.2 10.3L15.9 5.2C15.4 4.8 14.7 4.5 14 4.5Z" fill="currentColor"/>
          <path class="mobile-dock-home-smile" d="M11 17.5C11.5 18.7 12.7 19.5 14 19.5C15.3 19.5 16.5 18.7 17 17.5" stroke="#1c1a17" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
      </a>

      <a href="browse.html" class="mobile-dock-btn ${active === 'browse' ? 'active' : ''}" aria-label="Browse" title="Browse Book Covers">
        <svg class="mobile-dock-icon mobile-dock-search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="10.8" cy="10.8" r="6.8"></circle>
          <line x1="20.5" y1="20.5" x2="15.8" y2="15.8"></line>
        </svg>
      </a>

      <a href="collections.html" class="mobile-dock-btn ${active === 'collection' ? 'active' : ''}" aria-label="Collections" title="Book Cover Collections">
        <svg class="mobile-dock-icon mobile-dock-collection-icon" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7.5" height="7.5" rx="2"></rect>
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2"></rect>
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"></rect>
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2"></rect>
        </svg>
      </a>

      <a href="profile.html" class="mobile-dock-btn mobile-dock-profile-btn ${active === 'profile' ? 'active' : ''}" aria-label="Profile" title="My Profile">
        <span class="mobile-dock-avatar-circle">
          <img src="${escapeHtml(avatar)}" class="mobile-dock-avatar-img" alt="${escapeHtml(session.name || 'Profile')}" onerror="this.src='assets/default-avatar.png'" />
        </span>
      </a>
    </div>
  `;

  document.body.appendChild(nav);
}

// Add Account Modal Dialog
function closeAddAccountModal() {
  const existing = document.getElementById('addAccountModalOverlay');
  if (existing) existing.remove();
}

function openAddAccountModal() {
  closeAddAccountModal();

  const overlay = document.createElement('div');
  overlay.id = 'addAccountModalOverlay';
  overlay.className = 'account-modal-overlay';
  overlay.innerHTML = `
    <div class="account-modal-card" role="dialog" aria-labelledby="addAccountTitle">
      <h3 class="account-modal-title" id="addAccountTitle">Add Pagelle Account</h3>
      <p class="account-modal-subtitle">Connect or add another account to easily switch between your profiles.</p>
      <form class="account-modal-form" id="addAccountForm">
        <div class="account-modal-field">
          <label for="newAccName">Name</label>
          <input type="text" id="newAccName" placeholder="e.g. Dhanush" required />
        </div>
        <div class="account-modal-field">
          <label for="newAccEmail">Email address</label>
          <input type="email" id="newAccEmail" placeholder="e.g. creator@pagelle.com" required />
        </div>
        <div class="account-modal-field">
          <label for="newAccType">Account Type</label>
          <select id="newAccType">
            <option value="Personal">Personal</option>
            <option value="Business">Business</option>
          </select>
        </div>
        <div class="account-modal-actions">
          <button type="button" class="account-modal-cancel-btn" id="cancelAddAccBtn">Cancel</button>
          <button type="submit" class="account-modal-submit-btn">Add &amp; Switch</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAddAccountModal();
  });

  const cancelBtn = overlay.querySelector('#cancelAddAccBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeAddAccountModal);

  const form = overlay.querySelector('#addAccountForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#newAccName').value.trim();
      const email = form.querySelector('#newAccEmail').value.trim();
      const accountType = form.querySelector('#newAccType').value;

      if (!name || !email || !email.includes('@')) {
        showToast('Please provide a valid name and email.');
        return;
      }

      const current = getCurrentSession() || {};
      const accounts = getStoredAccounts(current);

      const existingAcc = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      const newAcc = existingAcc || {
        id: `usr-${Date.now()}`,
        name,
        email,
        role: email.toLowerCase() === OWNER_EMAIL ? 'admin' : 'user',
        accountType,
        avatar: 'assets/default-avatar.png'
      };

      if (!existingAcc) {
        accounts.push(newAcc);
        saveStoredAccounts(accounts);
      }

      closeAddAccountModal();
      switchActiveAccount(newAcc);
    });
  }

  setTimeout(() => {
    const input = overlay.querySelector('#newAccName');
    if (input) input.focus();
  }, 100);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function bindSubscribeForm(formId, feedbackId) {
  const form = document.getElementById(formId);
  const feedback = document.getElementById(feedbackId);
  if (!form || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const val = (input.value || '').trim();
    if (!val || !val.includes('@') || !val.includes('.')) {
      feedback.textContent = 'Please enter a valid email address.';
      return;
    }
    feedback.textContent = `Confirmed for ${val} · Questions? Write to ${OWNER_EMAIL}`;
    input.value = '';
  });
}

export function bindFooterContact() {
  const form = document.getElementById('footerContactForm');
  const feedback = document.getElementById('footerContactFeedback');
  const copyBtn = document.getElementById('copyOwnerEmailBtn');

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(OWNER_EMAIL);
        showToast(`Copied ${OWNER_EMAIL}`);
      } catch {
        showToast(`Email: ${OWNER_EMAIL}`);
      }
    });
  }

  if (form && feedback) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="text"]');
      const message = (input.value || '').trim();
      if (!message) {
        feedback.textContent = `Enter a quick note or email to message ${OWNER_EMAIL}.`;
        return;
      }
      const mailtoUrl = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(
        'PAGELLE BOOK COVERS — Inquiry'
      )}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoUrl;
      feedback.textContent = `Drafting message to ${OWNER_EMAIL}...`;
      input.value = '';
    });
  }
}

const STORAGE_COMMENTS_KEY = 'best_book_covers_comments_v1';

function loadCoverComments() {
  try {
    const raw = localStorage.getItem(STORAGE_COMMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCoverComments(map) {
  try {
    localStorage.setItem(STORAGE_COMMENTS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function getInitials(name = 'BC') {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase() || 'BC';
}

function triggerFileDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadCoverAsPng(book) {
  const safeName = String(book.title || 'book-cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 900, 1350);
      const pngUrl = canvas.toDataURL('image/png');
      triggerFileDownload(pngUrl, `${safeName}.png`);
      showToast(`Downloaded "${book.title}.png"`);
    } catch {
      triggerFileDownload(book.image, `${safeName}`);
      showToast(`Downloaded "${book.title}"`);
    }
  };
  img.onerror = () => {
    triggerFileDownload(book.image, `${safeName}`);
    showToast(`Downloaded "${book.title}"`);
  };
  img.src = book.image;
}

function downloadCoverOriginal(book) {
  const safeName = String(book.title || 'book-cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const isSvg = String(book.image || '').startsWith('data:image/svg+xml');
  const ext = isSvg ? 'svg' : 'jpg';
  triggerFileDownload(book.image, `${safeName}.${ext}`);
  showToast(`Downloaded "${book.title}.${ext}"`);
}

/**
 * Shared Book Cover Detail Lightbox controller (Pinterest-inspired Pin Detail UI).
 */
export function createDetailModalController({ onBooksChanged } = {}) {
  const modalEl = document.getElementById('detailModal') || document.getElementById('detailModalOverlay');
  if (!modalEl) return { open: () => {} };
  modalEl.classList.add('modal-backdrop');

  // Upgrade modal markup cleanly so every page gets the exact same rich detail view
  modalEl.innerHTML = `
    <div class="modal-panel pin-modal-panel" role="document">
      <div class="pin-topbar">
        <div class="pin-topbar-left">
          <button type="button" class="pin-icon-btn" id="pinBackBtn" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>

          <button type="button" class="pin-like-pill" id="detailLikeBtn" aria-label="Like cover">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span id="pinLikeCount">0</span>
          </button>

          <button type="button" class="pin-icon-btn" id="pinCommentFocusBtn" aria-label="Comments">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </button>

          <button type="button" class="pin-icon-btn" id="pinShareBtn" aria-label="Share cover">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
          </button>

          <div class="pin-more-wrap">
            <button type="button" class="pin-icon-btn" id="pinMoreBtn" aria-label="More and download options" aria-expanded="false">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="19" cy="12" r="2"></circle>
              </svg>
            </button>

            <div class="pin-more-menu hidden" id="pinMoreMenu" role="menu">
              <button type="button" class="pin-menu-item" id="pinDownloadPngBtn" role="menuitem">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Download image (PNG)</span>
              </button>
              <button type="button" class="pin-menu-item" id="pinDownloadOrigBtn" role="menuitem">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>Download original file</span>
              </button>
              <button type="button" class="pin-menu-item pin-menu-danger hidden" id="detailDeleteBtn" role="menuitem">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                </svg>
                <span>Remove Cover</span>
              </button>
            </div>
          </div>
        </div>

        <div class="pin-topbar-right">
          <a href="browse.html" class="pin-board-pill" id="pinGenrePill">
            <span id="detailGenre">Fiction</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </a>
          <button type="button" class="pin-save-btn" id="pinSaveBtn">Save</button>
        </div>
      </div>

      <div class="pin-image-stage">
        <div class="pin-cover-card" id="pinCoverCard">
          <img id="detailImage" src="" alt="" class="pin-cover-img" />
          <div class="pin-floating-tools">
            <button type="button" class="pin-float-btn" id="pinZoomBtn" title="View larger" aria-label="View larger">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
            <button type="button" class="pin-float-btn" id="pinQuickDownloadBtn" title="Download cover image" aria-label="Download cover image">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="pin-meta-section">
        <div class="pin-creator-row">
          <div class="pin-avatar" id="pinAvatar">BC</div>
          <div class="pin-creator-text">
            <span class="pin-creator-name" id="detailAuthor">Author Name</span>
            <span class="pin-creator-sub" id="pinMetaSub">Designer &middot; 2025</span>
          </div>
          <span class="detail-community-badge hidden" id="detailCommunityBadge">Community Added</span>
        </div>
        <h2 class="pin-book-title" id="detailTitle">Book Title</h2>
        <p class="pin-book-desc" id="detailDesc"></p>

        <div class="pin-comments-list" id="pinCommentsList"></div>

        <form class="pin-comment-form" id="pinCommentForm">
          <input type="text" class="pin-comment-input" id="pinCommentInput" placeholder="Add a comment ..." maxlength="200" />
          <div class="pin-comment-actions">
            <button type="button" class="pin-emoji-btn" id="pinEmojiBtn" title="Add reaction" aria-label="Add emoji">😊</button>
            <button type="submit" class="pin-comment-send" aria-label="Post comment">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="pin-lightbox hidden" id="pinLightboxOverlay" role="dialog" aria-modal="true" aria-label="Full cover preview">
      <div class="pin-lightbox-bar">
        <button type="button" class="pin-lb-circle-btn" id="pinLightboxCloseBtn" aria-label="Close full view" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="pin-lightbox-actions">
          <button type="button" class="pin-lb-pill-btn" id="pinLightboxShareBtn">
            <span>Share</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
          </button>

          <button type="button" class="pin-lb-pill-btn" id="pinLightboxDownloadBtn" title="Download cover PNG">
            <span>Download</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>

          <a href="browse.html" class="pin-lb-pill-btn" id="pinLightboxGenrePill">
            <span id="pinLightboxGenre">Fiction</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </a>

          <button type="button" class="pin-save-btn" id="pinLightboxSaveBtn">Save</button>
        </div>
      </div>

      <div class="pin-lightbox-stage" id="pinLightboxStage">
        <img id="pinLightboxImg" src="" alt="" class="pin-lightbox-img" />
      </div>

      <div class="pin-lightbox-zoom-controls">
        <button type="button" class="pin-lb-zoom-btn" id="pinLightboxZoomInBtn" aria-label="Zoom in" title="Zoom in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button type="button" class="pin-lb-zoom-btn" id="pinLightboxZoomOutBtn" aria-label="Zoom out" title="Zoom out">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  `;

  const backBtn = document.getElementById('pinBackBtn');
  const likeBtn = document.getElementById('detailLikeBtn');
  const likeCountEl = document.getElementById('pinLikeCount');
  const commentFocusBtn = document.getElementById('pinCommentFocusBtn');
  const shareBtn = document.getElementById('pinShareBtn');
  const moreBtn = document.getElementById('pinMoreBtn');
  const moreMenuEl = document.getElementById('pinMoreMenu');
  const downloadPngBtn = document.getElementById('pinDownloadPngBtn');
  const downloadOrigBtn = document.getElementById('pinDownloadOrigBtn');
  const deleteBtn = document.getElementById('detailDeleteBtn');

  const genrePillEl = document.getElementById('pinGenrePill');
  const genreEl = document.getElementById('detailGenre');
  const saveBtn = document.getElementById('pinSaveBtn');

  const coverCardEl = document.getElementById('pinCoverCard');
  const imageEl = document.getElementById('detailImage');
  const zoomBtn = document.getElementById('pinZoomBtn');
  const quickDownloadBtn = document.getElementById('pinQuickDownloadBtn');

  const lightboxEl = document.getElementById('pinLightboxOverlay');
  const lightboxStageEl = document.getElementById('pinLightboxStage');
  const lightboxImgEl = document.getElementById('pinLightboxImg');
  const lightboxCloseBtn = document.getElementById('pinLightboxCloseBtn');
  const lightboxShareBtn = document.getElementById('pinLightboxShareBtn');
  const lightboxDownloadBtn = document.getElementById('pinLightboxDownloadBtn');
  const lightboxGenrePillEl = document.getElementById('pinLightboxGenrePill');
  const lightboxGenreEl = document.getElementById('pinLightboxGenre');
  const lightboxSaveBtn = document.getElementById('pinLightboxSaveBtn');
  const lightboxZoomInBtn = document.getElementById('pinLightboxZoomInBtn');
  const lightboxZoomOutBtn = document.getElementById('pinLightboxZoomOutBtn');

  // Mount the fullscreen lightbox directly on document.body so it is never
  // trapped inside modal stacking contexts or affected by parent paddings/scrollbars
  if (lightboxEl && lightboxEl.parentElement !== document.body) {
    document.body.appendChild(lightboxEl);
  }

  const avatarEl = document.getElementById('pinAvatar');
  const authorEl = document.getElementById('detailAuthor');
  const metaSubEl = document.getElementById('pinMetaSub');
  const communityBadgeEl = document.getElementById('detailCommunityBadge');
  const titleEl = document.getElementById('detailTitle');
  const descEl = document.getElementById('detailDesc');

  const commentsListEl = document.getElementById('pinCommentsList');
  const commentFormEl = document.getElementById('pinCommentForm');
  const commentInputEl = document.getElementById('pinCommentInput');
  const emojiBtn = document.getElementById('pinEmojiBtn');

  let inspectedId = null;
  let lightboxScale = 1;

  function canDeleteComment(item, session) {
    if (!session) return false;
    if (session.role === 'admin') return true;
    if (item.email) {
      return item.email.toLowerCase() === String(session.email || '').toLowerCase();
    }
    return item.author === session.name;
  }

  function deleteCommentAt(bookId, index) {
    const allComments = loadCoverComments();
    const list = Array.isArray(allComments[bookId]) ? allComments[bookId] : [];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    if (list.length === 0) {
      delete allComments[bookId];
    } else {
      allComments[bookId] = list;
    }
    saveCoverComments(allComments);
    renderComments(bookId);
    showToast('Comment deleted');
  }

  function renderComments(bookId) {
    const allComments = loadCoverComments();
    const list = Array.isArray(allComments[bookId]) ? allComments[bookId] : [];
    const session = getCurrentSession();
    commentsListEl.innerHTML = '';
    commentsListEl.classList.toggle('hidden', list.length === 0);

    list.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'pin-comment-item';

      const body = document.createElement('div');
      body.className = 'pin-comment-body';
      const who = document.createElement('strong');
      who.textContent = item.author || 'Reader';
      const txt = document.createElement('span');
      txt.textContent = item.text || '';
      body.appendChild(who);
      body.appendChild(txt);
      row.appendChild(body);

      if (canDeleteComment(item, session)) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'pin-comment-delete';
        delBtn.title = 'Delete comment';
        delBtn.setAttribute('aria-label', 'Delete comment');
        delBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
        `;
        delBtn.addEventListener('click', () => deleteCommentAt(bookId, index));
        row.appendChild(delBtn);
      }

      commentsListEl.appendChild(row);
    });
  }

  function syncLikeAndSaveUi(bookId) {
    const favs = loadFavorites();
    const isSaved = favs.includes(bookId);
    likeBtn.classList.toggle('liked', isSaved);
    likeCountEl.textContent = String(isSaved ? 1 : 0);
    saveBtn.classList.toggle('saved', isSaved);
    saveBtn.textContent = isSaved ? 'Saved' : 'Save';
    lightboxSaveBtn.classList.toggle('saved', isSaved);
    lightboxSaveBtn.textContent = isSaved ? 'Saved' : 'Save';
  }

  function applyLightboxZoom(nextScale) {
    lightboxScale = Math.max(0.7, Math.min(2.5, Number(nextScale.toFixed(2))));
    lightboxImgEl.style.transform = `scale(${lightboxScale})`;
    lightboxImgEl.classList.toggle('is-zoomed', lightboxScale > 1);
  }

  function openLightbox() {
    const book = findBookById(inspectedId);
    if (!book) return;
    lightboxImgEl.src = book.image;
    lightboxImgEl.alt = `${book.title} full cover preview`;
    lightboxGenreEl.textContent = book.genre;
    lightboxGenrePillEl.href = `browse.html?genre=${encodeURIComponent(book.genre)}`;
    applyLightboxZoom(1);
    lightboxEl.classList.remove('hidden');
    document.body.classList.add('pin-lightbox-active');
    document.documentElement.classList.add('pin-lightbox-active');
  }

  function closeLightbox() {
    lightboxEl.classList.add('hidden');
    applyLightboxZoom(1);
    document.body.classList.remove('pin-lightbox-active');
    document.documentElement.classList.remove('pin-lightbox-active');
  }

  function close() {
    closeLightbox();
    modalEl.classList.add('hidden');
    moreMenuEl.classList.add('hidden');
    coverCardEl.classList.remove('zoomed');
    document.body.style.overflow = '';
    document.body.classList.remove('pin-lightbox-active');
    document.documentElement.classList.remove('pin-lightbox-active');
    inspectedId = null;
  }

  function open(bookId) {
    const book = findBookById(bookId);
    if (!book) return;

    inspectedId = book.id;
    moreMenuEl.classList.add('hidden');
    coverCardEl.classList.remove('zoomed');
    descEl.classList.remove('expanded');
    closeLightbox();

    imageEl.src = book.image;
    imageEl.alt = `${book.title} cover`;
    genreEl.textContent = book.genre;
    genrePillEl.href = `browse.html?genre=${encodeURIComponent(book.genre)}`;
    lightboxGenreEl.textContent = book.genre;
    lightboxGenrePillEl.href = `browse.html?genre=${encodeURIComponent(book.genre)}`;
    communityBadgeEl.classList.toggle('hidden', !book.isCommunity);

    avatarEl.textContent = getInitials(book.author);
    authorEl.textContent = book.author;
    metaSubEl.textContent = `${book.designer || 'Editorial Studio'} · ${book.year || '2026'}`;
    titleEl.textContent = book.title;
    descEl.textContent = book.desc || '';

    syncLikeAndSaveUi(book.id);
    renderComments(book.id);

    const session = getCurrentSession();
    const canDelete =
      book.isCommunity &&
      session &&
      (session.role === 'admin' ||
        !book.submittedByEmail ||
        book.submittedByEmail.toLowerCase() === session.email.toLowerCase());
    deleteBtn.classList.toggle('hidden', !canDelete);

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function toggleSaveCurrent() {
    if (!inspectedId) return;
    const favs = loadFavorites();
    const idx = favs.indexOf(inspectedId);
    if (idx >= 0) {
      favs.splice(idx, 1);
      showToast('Removed from Saved');
    } else {
      favs.push(inspectedId);
      showToast('Saved to Favorites');
    }
    saveFavorites(favs);
    syncLikeAndSaveUi(inspectedId);
    if (onBooksChanged) onBooksChanged();
  }

  async function shareCurrentCover() {
    if (!inspectedId) return;
    const book = findBookById(inspectedId);
    const shareText = book ? `${book.title} by ${book.author} — PAGELLE BOOK COVERS` : 'PAGELLE BOOK COVERS';
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: window.location.href });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} (${window.location.href})`);
      showToast('Cover link copied to clipboard');
    } catch {
      showToast('Ready to share!');
    }
  }

  backBtn.addEventListener('click', close);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) close();
    if (!e.target.closest('.pin-more-wrap')) {
      moreMenuEl.classList.add('hidden');
      moreBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!lightboxEl.classList.contains('hidden')) {
        closeLightbox();
        return;
      }
      if (!modalEl.classList.contains('hidden')) {
        close();
      }
    }
  });

  likeBtn.addEventListener('click', toggleSaveCurrent);
  saveBtn.addEventListener('click', toggleSaveCurrent);
  lightboxSaveBtn.addEventListener('click', toggleSaveCurrent);

  commentFocusBtn.addEventListener('click', () => {
    commentInputEl.focus();
  });

  shareBtn.addEventListener('click', shareCurrentCover);
  lightboxShareBtn.addEventListener('click', shareCurrentCover);

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = moreMenuEl.classList.toggle('hidden');
    moreBtn.setAttribute('aria-expanded', String(!isHidden));
  });

  downloadPngBtn.addEventListener('click', () => {
    const book = findBookById(inspectedId);
    moreMenuEl.classList.add('hidden');
    if (book) downloadCoverAsPng(book);
  });

  downloadOrigBtn.addEventListener('click', () => {
    const book = findBookById(inspectedId);
    moreMenuEl.classList.add('hidden');
    if (book) downloadCoverOriginal(book);
  });

  quickDownloadBtn.addEventListener('click', () => {
    const book = findBookById(inspectedId);
    if (book) downloadCoverAsPng(book);
  });

  lightboxDownloadBtn.addEventListener('click', () => {
    const book = findBookById(inspectedId);
    if (book) downloadCoverAsPng(book);
  });

  zoomBtn.addEventListener('click', openLightbox);
  imageEl.addEventListener('click', openLightbox);
  lightboxCloseBtn.addEventListener('click', closeLightbox);
  lightboxStageEl.addEventListener('click', (e) => {
    if (e.target === lightboxStageEl) closeLightbox();
  });
  lightboxZoomInBtn.addEventListener('click', () => applyLightboxZoom(lightboxScale + 0.25));
  lightboxZoomOutBtn.addEventListener('click', () => applyLightboxZoom(lightboxScale - 0.25));

  emojiBtn.addEventListener('click', () => {
    const emojis = ['📚', '✨', '❤️', '🔥', '🎨'];
    const pick = emojis[Math.floor(Math.random() * emojis.length)];
    commentInputEl.value = `${commentInputEl.value}${commentInputEl.value ? ' ' : ''}${pick}`;
    commentInputEl.focus();
  });

  if (descEl) {
    descEl.addEventListener('click', () => {
      descEl.classList.toggle('expanded');
    });
  }

  commentFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!inspectedId) return;
    const text = commentInputEl.value.trim();
    if (!text) return;

    const session = getCurrentSession();
    const allComments = loadCoverComments();
    const existing = Array.isArray(allComments[inspectedId]) ? allComments[inspectedId] : [];
    existing.push({
      author: session ? session.name : 'Reader',
      email: session ? session.email : '',
      text,
      at: Date.now()
    });
    allComments[inspectedId] = existing;
    saveCoverComments(allComments);

    commentInputEl.value = '';
    renderComments(inspectedId);
    showToast('Comment posted');
  });

  deleteBtn.addEventListener('click', async () => {
    if (!inspectedId) return;
    const target = findBookById(inspectedId);
    if (!target || !target.isCommunity) return;

    try {
      await deleteCommunityCover(inspectedId);
    } catch (err) {
      showToast(err.message || 'Permission denied');
      return;
    }

    const updatedFavs = loadFavorites().filter((id) => id !== inspectedId);
    saveFavorites(updatedFavs);

    close();
    if (onBooksChanged) onBooksChanged();
    showToast(`Removed "${target.title}" from the gallery.`);
  });

  return { open, close };
}

/* ==========================================================================
   COMMUNITY MEMBERS & FOLLOWING NETWORK SYSTEM
   ========================================================================== */

export const STORAGE_FOLLOWING_KEY = 'best_book_covers_following_v3';
export const STORAGE_FOLLOWERS_KEY = 'best_book_covers_followers_v3';
export const STORAGE_COMMUNITY_USERS_KEY = 'best_book_covers_community_users_cache_v3';

// Clean up legacy mock data
try {
  localStorage.removeItem('best_book_covers_following_v1');
  localStorage.removeItem('best_book_covers_following_v2');
  localStorage.removeItem('best_book_covers_followers_v1');
  localStorage.removeItem('best_book_covers_followers_v2');
} catch {}

export function generateMemberAvatar(name = 'User', bg1 = '#28231d', bg2 = '#141210', accent = '#c9ae8c') {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase() || 'BC';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g_${initials})"/>
    <circle cx="64" cy="64" r="60" fill="none" stroke="${accent}" stroke-width="2.5" stroke-opacity="0.55"/>
    <text x="64" y="74" fill="${accent}" font-family="Georgia, serif" font-size="42" font-weight="700" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function syncCommunityMembersFromServer() {
  try {
    const res = await fetch('/api/community/members');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.members)) {
        localStorage.setItem(STORAGE_COMMUNITY_USERS_KEY, JSON.stringify(data.members));
        window.dispatchEvent(new CustomEvent('pagelle:members:synced', { detail: data.members }));
        return data.members;
      }
    }
  } catch {}
  return [];
}

export function getAllCommunityMembers() {
  const session = getCurrentSession();
  const membersList = [];

  const findExistingIndex = (id, email, name) => {
    const cleanId = id ? String(id).trim().toLowerCase() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const cleanName = name ? String(name).trim().toLowerCase() : '';

    return membersList.findIndex((item) => {
      const itemCleanId = item.id ? String(item.id).trim().toLowerCase() : '';
      const itemCleanEmail = item.email ? String(item.email).trim().toLowerCase() : '';
      const itemCleanName = item.name ? String(item.name).trim().toLowerCase() : '';

      // Match by email if both have emails
      if (cleanEmail && itemCleanEmail && cleanEmail === itemCleanEmail) {
        return true;
      }
      // Match by ID if both have IDs
      if (cleanId && itemCleanId && cleanId === itemCleanId) {
        return true;
      }
      // Match if one ID is synthetic usr-email and matches email
      if (cleanEmail && itemCleanId === `usr-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`) {
        return true;
      }
      if (itemCleanEmail && cleanId === `usr-${itemCleanEmail.replace(/[^a-z0-9]/g, '-')}`) {
        return true;
      }
      // Match if ID is the email address itself
      if (cleanEmail && itemCleanId === cleanEmail) {
        return true;
      }
      if (itemCleanEmail && cleanId === itemCleanEmail) {
        return true;
      }
      // Match by name if exact same name AND (neither has conflicting different email)
      if (cleanName && itemCleanName && cleanName === itemCleanName) {
        if (!cleanEmail || !itemCleanEmail || cleanEmail === itemCleanEmail) {
          return true;
        }
      }
      return false;
    });
  };

  const addOrMergeMember = (m) => {
    if (!m) return;
    const email = (m.email || '').trim().toLowerCase();
    const id = m.id || m.userId || (email ? `usr-${email.replace(/[^a-z0-9]/g, '-')}` : null);
    const name = (m.name || (email ? email.split('@')[0] : '')).trim();

    if (!id && !email && !name) return;

    // Purge fake mock names if encountered
    if (['Elena Rostova', 'Marcus Vance', 'Sophia Chen', "Liam O'Connor", 'Amara Diallo', 'Dhanush Studio'].includes(name)) {
      return;
    }

    if (
      id === 'usr-studio' ||
      (email && email.toLowerCase() === 'dhanush.studio@pinterest.com') ||
      m.handle === '@dhanush_studio' ||
      m.handle === 'dhanush_studio'
    ) {
      return;
    }

    // Check if account is deleted
    if ((email && isAccountDeleted(email)) || (id && isAccountDeleted(id))) {
      return;
    }

    const idx = findExistingIndex(id, email, name);
    const isOwner = email === OWNER_EMAIL.toLowerCase();

    // Determine avatar
    let avatar = m.avatar;
    if (!avatar || avatar === 'assets/default-avatar.png') {
      avatar = isOwner ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png';
    }

    const isSelf = session ? (
      (session.email && email && email === session.email.toLowerCase()) ||
      (session.userId && id && String(id).toLowerCase() === String(session.userId).toLowerCase()) ||
      (session.id && id && String(id).toLowerCase() === String(session.id).toLowerCase())
    ) : false;

    if (idx >= 0) {
      const existing = membersList[idx];
      // Keep real server ID over synthetic usr-email
      const mergedId = (existing.id && !existing.id.startsWith('usr-user-') && !existing.id.startsWith('usr-self') && !existing.id.includes('@'))
        ? existing.id
        : (id || existing.id);

      const mergedEmail = existing.email || email;
      const mergedName = (existing.name && existing.name !== 'Member' && existing.name !== 'User') ? existing.name : (name || existing.name);

      // Update avatar if incoming has custom avatar, otherwise preserve existing
      let mergedAvatar = existing.avatar;
      if (avatar && avatar !== 'assets/default-avatar.png') {
        mergedAvatar = avatar;
      } else if (!mergedAvatar || mergedAvatar === 'assets/default-avatar.png') {
        mergedAvatar = avatar || (isOwner ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png');
      }

      // Preserve custom bio if available
      const mergedBio = (existing.bio && existing.bio.trim()) ? existing.bio : (m.bio || '');

      membersList[idx] = {
        ...existing,
        ...m,
        id: mergedId,
        email: mergedEmail,
        name: mergedName,
        avatar: mergedAvatar,
        bio: mergedBio,
        role: existing.role || m.role || (m.accountType === 'Business' ? 'Curated Book & Cover Design Studio' : 'Reader & Collector'),
        accountType: existing.accountType || m.accountType || 'Personal',
        isSelf: existing.isSelf || isSelf
      };
    } else {
      const handle = m.handle || `@${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
      const role = m.role || (m.accountType === 'Business' ? 'Curated Book & Cover Design Studio' : 'Reader & Collector');
      const bio = m.bio || '';

      membersList.push({
        id,
        name: name || 'Member',
        handle,
        email,
        role,
        bio,
        avatar,
        accountType: m.accountType || 'Personal',
        isSelf
      });
    }
  };

  // 1. Current Session
  if (session) {
    const isOwner = session.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    addOrMergeMember({
      id: session.userId || (isOwner ? 'usr-admin-owner' : 'usr-self'),
      name: session.name || (session.email ? session.email.split('@')[0] : 'User'),
      email: session.email,
      role: session.role === 'admin' ? 'Community Creator & Collector' : 'Book Cover Collector',
      bio: session.bio || (isOwner ? 'Thick Thighs pretty eyes' : ''),
      avatar: session.avatar || (isOwner ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png'),
      accountType: session.accountType || 'Personal',
      isSelf: true
    });
  }

  // 2. Stored Accounts
  try {
    const storedAccounts = getStoredAccounts(session);
    if (Array.isArray(storedAccounts)) {
      storedAccounts.forEach((acc) => addOrMergeMember(acc));
    }
  } catch {}

  // 4. Cached Server Registered Users
  try {
    const rawCache = localStorage.getItem(STORAGE_COMMUNITY_USERS_KEY);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => addOrMergeMember(u));
      }
    }
  } catch {}

  // 5. Community book submitters
  try {
    const allCommunityCovers = loadUserBooks();
    if (Array.isArray(allCommunityCovers)) {
      allCommunityCovers.forEach((cov) => {
        if (cov.submittedBy && cov.submittedByEmail) {
          addOrMergeMember({
            name: cov.submittedBy,
            email: cov.submittedByEmail,
            role: 'Book Jacket Contributor',
            bio: '',
            accountType: 'Personal'
          });
        }
      });
    }
  } catch {}

  return membersList;
}

export const COMMUNITY_MEMBERS = new Proxy([], {
  get(target, prop) {
    const list = getAllCommunityMembers();
    if (typeof list[prop] === 'function') {
      return list[prop].bind(list);
    }
    return list[prop];
  }
});

export const STORAGE_NETWORK_FOLLOWS_KEY = 'pagelle_network_follows_v3';

export async function syncNetworkFromServer() {
  try {
    const res = await fetch('/api/network/all');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.follows)) {
        localStorage.setItem(STORAGE_NETWORK_FOLLOWS_KEY, JSON.stringify(data.follows));

        // Rebuild following for current session user
        const session = getCurrentSession();
        if (session) {
          const selfId = String(session.userId || session.id || '').toLowerCase();
          const selfEmail = (session.email || '').toLowerCase();
          const myFollowing = data.follows
            .filter((f) => (selfId && String(f.followerId).toLowerCase() === selfId) || (selfEmail && f.followerEmail && f.followerEmail.toLowerCase() === selfEmail))
            .map((f) => f.followedId || f.followedEmail);
          localStorage.setItem(STORAGE_FOLLOWING_KEY, JSON.stringify(myFollowing));
        }

        window.dispatchEvent(new CustomEvent('pagelle:network:synced', { detail: data.follows }));
        return data.follows;
      }
    }
  } catch {}
  return [];
}

export function getFollowingUserIds() {
  try {
    const session = getCurrentSession();
    const selfId = session ? String(session.userId || session.id || '') : '';
    const selfEmail = session && session.email ? session.email.toLowerCase() : '';

    const raw = localStorage.getItem(STORAGE_FOLLOWING_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Filter out self and any fake mock IDs
    const fakeIds = ['usr-elena', 'usr-marcus', 'usr-sophia', 'usr-liam', 'usr-amara', 'usr-studio', 'dhanush.studio@pinterest.com', 'dhanush_studio', '@dhanush_studio'];
    const cleaned = list.filter((id) => {
      if (!id) return false;
      const str = String(id).toLowerCase();
      if (fakeIds.includes(str)) return false;
      if (selfId && str === selfId.toLowerCase()) return false;
      if (selfEmail && str === selfEmail) return false;
      return true;
    });

    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_FOLLOWING_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function isFollowingUser(userIdOrEmail) {
  if (!userIdOrEmail) return false;
  const following = getFollowingUserIds();
  const clean = String(userIdOrEmail).toLowerCase().trim();

  if (following.some((id) => String(id).toLowerCase() === clean)) {
    return true;
  }

  // Also check server synced follows
  try {
    const raw = localStorage.getItem(STORAGE_NETWORK_FOLLOWS_KEY);
    const allFollows = raw ? JSON.parse(raw) : [];
    const session = getCurrentSession();
    if (session && Array.isArray(allFollows)) {
      const selfId = String(session.userId || session.id || '').toLowerCase();
      const selfEmail = (session.email || '').toLowerCase();
      const isFound = allFollows.some((f) => {
        const isFollower = (selfId && String(f.followerId).toLowerCase() === selfId) || (selfEmail && f.followerEmail && f.followerEmail.toLowerCase() === selfEmail);
        const isTarget = (clean && String(f.followedId).toLowerCase() === clean) || (clean && f.followedEmail && f.followedEmail.toLowerCase() === clean);
        return isFollower && isTarget;
      });
      if (isFound) return true;
    }
  } catch {}

  const allMembers = getAllCommunityMembers();
  const member = allMembers.find((m) => (m.id && String(m.id).toLowerCase() === clean) || (m.email && m.email.toLowerCase() === clean));
  if (member) {
    if (member.id && following.some((id) => String(id).toLowerCase() === String(member.id).toLowerCase())) return true;
    if (member.email && following.some((id) => String(id).toLowerCase() === member.email.toLowerCase())) return true;
  }
  return false;
}

export async function toggleFollowUser(userIdOrEmail) {
  if (!userIdOrEmail) return false;
  const session = getCurrentSession();
  if (!session) return false;

  const selfId = String(session.userId || session.id || 'usr-admin-owner').toLowerCase();
  const selfEmail = session.email ? session.email.toLowerCase().trim() : '';

  const clean = String(userIdOrEmail).toLowerCase().trim();

  // PREVENT SELF-FOLLOWING: A user CANNOT follow themselves!
  if (clean === selfId || (selfEmail && clean === selfEmail)) {
    return false;
  }

  const allMembers = getAllCommunityMembers();
  const targetMember = allMembers.find((m) => (m.id && String(m.id).toLowerCase() === clean) || (m.email && m.email.toLowerCase() === clean));
  const targetId = targetMember?.id ? String(targetMember.id) : String(userIdOrEmail);
  const targetEmail = targetMember?.email ? targetMember.email.toLowerCase() : (clean.includes('@') ? clean : '');

  if (targetId.toLowerCase() === selfId || (selfEmail && targetEmail === selfEmail)) {
    return false;
  }

  let following = getFollowingUserIds();
  const isAlready = following.some((f) => f.toLowerCase() === targetId.toLowerCase() || (targetEmail && f.toLowerCase() === targetEmail));
  const nextState = !isAlready;

  if (nextState) {
    if (!following.some((f) => f.toLowerCase() === targetId.toLowerCase())) following.push(targetId);
  } else {
    following = following.filter((id) => id.toLowerCase() !== targetId.toLowerCase() && (!targetEmail || id.toLowerCase() !== targetEmail));
  }
  localStorage.setItem(STORAGE_FOLLOWING_KEY, JSON.stringify(following));

  // Sync to server
  try {
    const token = getAuthToken() || (session.email === OWNER_EMAIL ? MASTER_ADMIN_TOKEN : '');
    const res = await fetch('/api/network/follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        'x-user-email': session.email || ''
      },
      body: JSON.stringify({
        targetId,
        targetEmail,
        followerEmail: session.email || ''
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.follows)) {
        localStorage.setItem(STORAGE_NETWORK_FOLLOWS_KEY, JSON.stringify(data.follows));
      }
      window.dispatchEvent(new CustomEvent('pagelle:network:changed', { detail: data }));
      return data.isFollowing;
    }
  } catch {}

  window.dispatchEvent(new CustomEvent('pagelle:network:changed', { detail: { isFollowing: nextState } }));
  return nextState;
}

export function getFollowersForUser(targetUser) {
  if (!targetUser) return [];
  const targetId = String(targetUser.id || targetUser.userId || '').toLowerCase();
  const targetEmail = (targetUser.email || '').toLowerCase().trim();

  let allFollows = [];
  try {
    const raw = localStorage.getItem(STORAGE_NETWORK_FOLLOWS_KEY);
    allFollows = raw ? JSON.parse(raw) : [];
  } catch {}

  const allMembers = getAllCommunityMembers();
  const followerList = [];

  // 1. Matches from server network follows
  if (Array.isArray(allFollows)) {
    for (const f of allFollows) {
      const fTargetId = String(f.followedId || '').toLowerCase();
      const fTargetEmail = String(f.followedEmail || '').toLowerCase();
      if ((targetId && fTargetId === targetId) || (targetEmail && fTargetEmail === targetEmail)) {
        const fid = String(f.followerId || '').toLowerCase();
        const femail = String(f.followerEmail || '').toLowerCase();
        const matchedMember = allMembers.find((m) =>
          (fid && String(m.id || '').toLowerCase() === fid) ||
          (femail && String(m.email || '').toLowerCase() === femail)
        );
        const resolved = matchedMember || {
          id: f.followerId,
          name: f.followerName || 'Member',
          email: f.followerEmail,
          avatar: f.followerAvatar || 'assets/default-avatar.png',
          role: 'Reader & Collector',
          bio: '',
          accountType: 'Personal'
        };
        if (!followerList.some((item) => (item.id && resolved.id && item.id === resolved.id) || (item.email && resolved.email && item.email.toLowerCase() === resolved.email.toLowerCase()))) {
          followerList.push(resolved);
        }
      }
    }
  }

  // 2. Also merge any local legacy followers map if present
  try {
    const rawF = localStorage.getItem(STORAGE_FOLLOWERS_KEY);
    const followersMap = rawF ? JSON.parse(rawF) : {};
    if (followersMap && typeof followersMap === 'object') {
      const localIds = [
        ...(Array.isArray(followersMap[targetId]) ? followersMap[targetId] : []),
        ...(targetEmail && Array.isArray(followersMap[targetEmail]) ? followersMap[targetEmail] : [])
      ];
      for (const lid of localIds) {
        const cleanLid = String(lid).toLowerCase();
        const m = allMembers.find((item) => (item.id && String(item.id).toLowerCase() === cleanLid) || (item.email && String(item.email).toLowerCase() === cleanLid));
        if (m && !followerList.some((item) => item.id === m.id || (item.email && m.email && item.email.toLowerCase() === m.email.toLowerCase()))) {
          followerList.push(m);
        }
      }
    }
  } catch {}

  return followerList;
}

export function getFollowingForUser(targetUser) {
  if (!targetUser) return [];
  const session = getCurrentSession();
  const targetId = String(targetUser.id || targetUser.userId || '').toLowerCase();
  const targetEmail = (targetUser.email || '').toLowerCase().trim();

  let allFollows = [];
  try {
    const raw = localStorage.getItem(STORAGE_NETWORK_FOLLOWS_KEY);
    allFollows = raw ? JSON.parse(raw) : [];
  } catch {}

  const allMembers = getAllCommunityMembers();
  const followingList = [];

  // 1. Matches from server network follows
  if (Array.isArray(allFollows)) {
    for (const f of allFollows) {
      const fFollowerId = String(f.followerId || '').toLowerCase();
      const fFollowerEmail = String(f.followerEmail || '').toLowerCase();
      if ((targetId && fFollowerId === targetId) || (targetEmail && fFollowerEmail === targetEmail)) {
        const fTgtId = String(f.followedId || '').toLowerCase();
        const fTgtEmail = String(f.followedEmail || '').toLowerCase();
        const matchedMember = allMembers.find((m) =>
          (fTgtId && String(m.id || '').toLowerCase() === fTgtId) ||
          (fTgtEmail && String(m.email || '').toLowerCase() === fTgtEmail)
        );
        const resolved = matchedMember || {
          id: f.followedId,
          name: f.followedName || 'Member',
          email: f.followedEmail,
          avatar: 'assets/default-avatar.png',
          role: 'Reader & Collector',
          bio: '',
          accountType: 'Personal'
        };
        if (!followingList.some((item) => (item.id && resolved.id && item.id === resolved.id) || (item.email && resolved.email && item.email.toLowerCase() === resolved.email.toLowerCase()))) {
          followingList.push(resolved);
        }
      }
    }
  }

  // 2. Also merge local following for self
  const isSelf = session && (
    (targetId && (String(session.userId || session.id || '').toLowerCase() === targetId)) ||
    (targetEmail && session.email && session.email.toLowerCase() === targetEmail)
  );

  if (isSelf) {
    const localFollowingIds = getFollowingUserIds();
    for (const fid of localFollowingIds) {
      const cleanFid = String(fid).toLowerCase();
      const m = allMembers.find((item) => (item.id && String(item.id).toLowerCase() === cleanFid) || (item.email && item.email.toLowerCase() === cleanFid));
      if (m && !followingList.some((item) => item.id === m.id || (item.email && m.email && item.email.toLowerCase() === m.email.toLowerCase()))) {
        followingList.push(m);
      }
    }
  }

  return followingList;
}

export function getUserProfileByIdOrEmail(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toLowerCase();

  // 1. Current Session
  const session = getCurrentSession();
  if (session) {
    if (
      (session.userId && String(session.userId).toLowerCase() === clean) ||
      (session.id && String(session.id).toLowerCase() === clean) ||
      (session.email && session.email.toLowerCase() === clean)
    ) {
      const isOwner = session.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
      return {
        id: session.userId || session.id || (isOwner ? 'usr-admin-owner' : 'usr-self'),
        name: session.name || (session.email ? session.email.split('@')[0] : 'User'),
        email: session.email,
        role: session.role || 'user',
        bio: session.bio || (isOwner ? 'Thick Thighs pretty eyes' : ''),
        avatar: session.avatar || (isOwner ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png'),
        accountType: session.accountType || 'Personal',
        isSelf: true
      };
    }
  }

  // 2. Block any lookup for purged Dhanush Studio dummy profile
  if (clean === 'usr-studio' || clean === 'dhanush.studio@pinterest.com' || clean === '@dhanush_studio' || clean === 'dhanush_studio' || clean === 'dhanush studio') {
    return null;
  }

  // 3. All Real Community Members
  const allMembers = getAllCommunityMembers();
  const found = allMembers.find(
    (m) =>
      (m.id && String(m.id).toLowerCase() === clean) ||
      (m.email && m.email.toLowerCase() === clean) ||
      (m.handle && m.handle.toLowerCase() === clean) ||
      (m.handle && m.handle.toLowerCase() === `@${clean}`)
  );
  if (found) {
    return {
      ...found,
      isSelf: session ? (
        (found.email && session.email && found.email.toLowerCase() === session.email.toLowerCase()) ||
        (found.id && session.userId && String(found.id).toLowerCase() === String(session.userId).toLowerCase())
      ) : false
    };
  }

  return null;
}

export function getMemberPosts(targetUser) {
  if (!targetUser) return [];
  const allCommunity = loadUserBooks();
  const allBooks = getAllBooks();
  const email = ((targetUser && targetUser.email) || '').toLowerCase();
  const id = String(targetUser.id || targetUser.userId || '').toLowerCase();

  // If this member submitted community covers directly:
  const directSubmitted = allCommunity.filter(
    (c) => (c.submittedByEmail && c.submittedByEmail.toLowerCase() === email) ||
           (c.submittedById && c.submittedById.toLowerCase() === id)
  );
  if (directSubmitted.length > 0) {
    return directSubmitted;
  }

  return [];
}

