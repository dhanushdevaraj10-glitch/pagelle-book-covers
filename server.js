const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let SEED_DATA = null;
try {
  SEED_DATA = require('./data/store.json');
} catch {}

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const ADMIN_EMAIL = 'dhanushdevaraj10@gmail.com';
const OWNER_EMAIL = ADMIN_EMAIL;
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_PASSWORD || 'Dhanush@10';
const MASTER_ADMIN_TOKEN = 'pagelle_admin_master_session_token_dhanush_2026';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'pagelle_session_secret_hmac_key_2026';

function generateSignedToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
    role: user.role || 'user',
    isOwner: !!user.isOwner,
    createdAt: Date.now()
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');
  return `pgt_${b64}.${sig}`;
}

function verifySignedToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('pgt_')) return null;
  const parts = token.slice(4).split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(String(password), salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
  if (!fs.existsSync(STORE_PATH)) {
    // If running in Vercel or ephemeral container, pre-seed from project data/store.json if present
    const seedPath = path.join(ROOT, 'data', 'store.json');
    if (fs.existsSync(seedPath)) {
      try {
        const seedContent = fs.readFileSync(seedPath, 'utf8');
        fs.writeFileSync(STORE_PATH, seedContent, 'utf8');
        return JSON.parse(seedContent);
      } catch {}
    }
    if (SEED_DATA) {
      try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(SEED_DATA, null, 2), 'utf8');
        return JSON.parse(JSON.stringify(SEED_DATA));
      } catch {
        return SEED_DATA;
      }
    }

    const now = new Date().toISOString();
    const initial = {
      users: [
        {
          id: 'usr-admin-owner',
          name: 'Dhanush',
          email: ADMIN_EMAIL,
          passwordHash: hashPassword(ADMIN_INITIAL_PASSWORD),
          role: 'admin',
          isOwner: true,
          active: true,
          loginCount: 0,
          createdAt: now,
          lastLoginAt: null
        }
      ],
      loginLogs: [],
      communityCovers: [],
      sessions: {},
      follows: []
    };
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    } catch {}
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.loginLogs)) parsed.loginLogs = [];
    if (!Array.isArray(parsed.communityCovers)) parsed.communityCovers = [];
    if (!Array.isArray(parsed.follows)) parsed.follows = [];
    if (SEED_DATA && Array.isArray(SEED_DATA.follows)) {
      for (const sf of SEED_DATA.follows) {
        const hasFollow = parsed.follows.some(f =>
          (f.id && sf.id && f.id === sf.id) ||
          (
            String(f.followerId || f.followerEmail).toLowerCase() === String(sf.followerId || sf.followerEmail).toLowerCase() &&
            String(f.followedId || f.followedEmail).toLowerCase() === String(sf.followedId || sf.followedEmail).toLowerCase()
          )
        );
        if (!hasFollow) {
          parsed.follows.push(sf);
        }
      }
    }
    if (SEED_DATA && Array.isArray(SEED_DATA.users)) {
      for (const su of SEED_DATA.users) {
        const existingIdx = parsed.users.findIndex(u => u.email && su.email && u.email.toLowerCase() === su.email.toLowerCase());
        if (existingIdx === -1) {
          parsed.users.push(su);
        } else {
          if (su.avatar && (!parsed.users[existingIdx].avatar || parsed.users[existingIdx].avatar === 'assets/avatar-dhanush.jpg' || parsed.users[existingIdx].avatar === 'assets/avatar-dhanush.jpg?v=2.2.0' || parsed.users[existingIdx].avatar === 'assets/default-avatar.png')) {
            parsed.users[existingIdx].avatar = su.avatar;
          }
          if (su.username && !parsed.users[existingIdx].username) {
            parsed.users[existingIdx].username = su.username;
          }
        }
      }
    }
    parsed.users.forEach((u) => {
      if (!u.username) {
        u.username = (u.name || (u.email ? u.email.split('@')[0] : 'user')).toLowerCase().replace(/[^a-z0-9_]/g, '');
      }
    });
    if (!parsed.sessions || typeof parsed.sessions !== 'object') parsed.sessions = {};

    // Guarantee primary admin always exists
    if (!parsed.users.some((u) => u.email.toLowerCase() === ADMIN_EMAIL)) {
      parsed.users.unshift({
        id: 'usr-admin-owner',
        name: 'Dhanush',
        email: ADMIN_EMAIL,
        passwordHash: hashPassword(ADMIN_INITIAL_PASSWORD),
        role: 'admin',
        bio: 'Thick Thighs pretty eyes',
        avatar: 'assets/avatar-dhanush.jpg?v=2.2.0',
        accountType: 'Personal',
        isOwner: true,
        active: true,
        loginCount: 0,
        createdAt: new Date().toISOString(),
        lastLoginAt: null
      });
    }
    // Guarantee permanent admin session token for Dhanush
    parsed.sessions[MASTER_ADMIN_TOKEN] = {
      userId: 'usr-admin-owner',
      createdAt: new Date().toISOString()
    };
    if (!Array.isArray(parsed.deletedCoverIds)) parsed.deletedCoverIds = [];
    return parsed;
  } catch {
    return { users: [], loginLogs: [], communityCovers: [], sessions: {}, follows: [], deletedCoverIds: [] };
  }
}

let blobPut = null;
try {
  const blobPkg = require('@vercel/blob');
  blobPut = blobPkg.put;
} catch (e) {}

const BLOB_URL = 'https://qbjxqewgtsgynzdb.public.blob.vercel-storage.com/pagelle-database/store.json';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_QBJxQewGtSGYNZDB_O2Ez8iMK9ZqRL4VfV9sPHkqhs8wZc5';

let memoryStore = null;
let lastBlobFetchTime = 0;

function mergeStore(local, remote) {
  if (!remote || typeof remote !== 'object') return local;

  // 1. Deleted Cover IDs
  const deletedSet = new Set([
    ...(Array.isArray(local.deletedCoverIds) ? local.deletedCoverIds : []),
    ...(Array.isArray(remote.deletedCoverIds) ? remote.deletedCoverIds : [])
  ]);
  local.deletedCoverIds = Array.from(deletedSet);

  // 2. Community covers
  const coverMap = new Map();
  const remoteCovers = Array.isArray(remote.communityCovers) ? remote.communityCovers : [];
  const localCovers = Array.isArray(local.communityCovers) ? local.communityCovers : [];

  for (const c of remoteCovers) {
    if (c && c.id && !deletedSet.has(c.id)) {
      coverMap.set(c.id, c);
    }
  }
  for (const c of localCovers) {
    if (c && c.id && !deletedSet.has(c.id)) {
      if (!coverMap.has(c.id)) {
        coverMap.set(c.id, c);
      } else {
        const existing = coverMap.get(c.id);
        const existingTime = new Date(existing.createdAt || 0).getTime();
        const localTime = new Date(c.createdAt || 0).getTime();
        coverMap.set(c.id, localTime >= existingTime ? c : existing);
      }
    }
  }
  local.communityCovers = Array.from(coverMap.values());
  local.communityCovers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // 3. Users
  const userMap = new Map();
  const remoteUsers = Array.isArray(remote.users) ? remote.users : [];
  const localUsers = Array.isArray(local.users) ? local.users : [];

  for (const u of remoteUsers) {
    if (u && u.email) userMap.set(u.email.toLowerCase(), u);
  }
  for (const u of localUsers) {
    if (u && u.email) {
      const emailLower = u.email.toLowerCase();
      if (!userMap.has(emailLower)) {
        userMap.set(emailLower, u);
      } else {
        const ru = userMap.get(emailLower);
        const bestLoginCount = Math.max(u.loginCount || 0, ru.loginCount || 0);
        const bestLastLogin = (new Date(u.lastLoginAt || 0) > new Date(ru.lastLoginAt || 0)) ? u.lastLoginAt : ru.lastLoginAt;
        const bestAvatar = (u.avatar && !u.avatar.includes('default-avatar')) ? u.avatar : ru.avatar;
        userMap.set(emailLower, {
          ...ru,
          ...u,
          loginCount: bestLoginCount,
          lastLoginAt: bestLastLogin,
          avatar: bestAvatar || ru.avatar
        });
      }
    }
  }

  if (!userMap.has(ADMIN_EMAIL.toLowerCase())) {
    userMap.set(ADMIN_EMAIL.toLowerCase(), {
      id: 'usr-admin-owner',
      name: 'Dhanush',
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(ADMIN_INITIAL_PASSWORD),
      role: 'admin',
      isOwner: true,
      active: true,
      loginCount: 1,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
  }
  local.users = Array.from(userMap.values());

  // 4. Login activity logs
  const logMap = new Map();
  const remoteLogs = Array.isArray(remote.loginLogs) ? remote.loginLogs : [];
  const localLogs = Array.isArray(local.loginLogs) ? local.loginLogs : [];

  for (const l of remoteLogs) {
    if (l && l.id) logMap.set(l.id, l);
  }
  for (const l of localLogs) {
    if (l && l.id) logMap.set(l.id, l);
  }
  local.loginLogs = Array.from(logMap.values());
  local.loginLogs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  if (local.loginLogs.length > 500) {
    local.loginLogs = local.loginLogs.slice(0, 500);
  }

  // 5. Follows & Sessions
  if (Array.isArray(remote.follows)) {
    const followSet = new Set((local.follows || []).map(f => f.id || `${f.followerId}-${f.followingId}`));
    for (const f of remote.follows) {
      const fid = f.id || `${f.followerId}-${f.followingId}`;
      if (!followSet.has(fid)) {
        if (!Array.isArray(local.follows)) local.follows = [];
        local.follows.push(f);
        followSet.add(fid);
      }
    }
  }

  if (remote.sessions && typeof remote.sessions === 'object') {
    if (!local.sessions || typeof local.sessions !== 'object') local.sessions = {};
    Object.assign(local.sessions, remote.sessions);
  }

  return local;
}

async function syncWithBlobStore() {
  if (!memoryStore) {
    memoryStore = ensureStore();
  }
  const now = Date.now();
  if (now - lastBlobFetchTime > 2000) {
    lastBlobFetchTime = now;
    try {
      const res = await fetch(`${BLOB_URL}?_t=${now}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const remote = await res.json();
        if (remote && typeof remote === 'object') {
          mergeStore(memoryStore, remote);
          try {
            fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf8');
          } catch {}
        }
      }
    } catch (e) {
      // Non-fatal, local memory store continues serving requests
    }
  }
  return memoryStore;
}

async function pushStoreToBlob(store) {
  if (!store) return;
  try {
    if (!blobPut) {
      const mod = require('@vercel/blob');
      blobPut = mod.put;
    }
    if (blobPut) {
      await blobPut('pagelle-database/store.json', JSON.stringify(store, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        token: BLOB_TOKEN
      });
      lastBlobFetchTime = Date.now();
    }
  } catch (err) {
    console.error('Blob sync push error:', err.message);
  }
}

async function saveStore(store) {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {}
  try {
    const rootStorePath = path.join(ROOT, 'data', 'store.json');
    if (rootStorePath !== STORE_PATH && fs.existsSync(path.dirname(rootStorePath))) {
      fs.writeFileSync(rootStorePath, JSON.stringify(store, null, 2), 'utf8');
    }
  } catch {}
  await pushStoreToBlob(store);
}

function sendJson(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  // If Vercel or middleware already parsed the body, return it immediately
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') {
      return Promise.resolve(req.body);
    }
    if (typeof req.body === 'string' && req.body.trim()) {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch (e) {
        return Promise.reject(new Error('Invalid JSON'));
      }
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  const raw = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '127.0.0.1';
  return raw === '::1' ? '127.0.0.1' : raw.replace('::ffff:', '');
}

// Security: Rate limiting and session management
const failedLogins = new Map(); // ip:email -> { count, firstTime, blockedUntil }
const signupLimits = new Map(); // ip -> { count, windowStart }
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function checkLoginRateLimit(ip, email) {
  const now = Date.now();
  const key = `${ip}:${email}`;
  const record = failedLogins.get(key);
  if (!record) return { allowed: true };
  if (record.blockedUntil && record.blockedUntil > now) {
    const remainingSec = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingSec };
  }
  if (record.blockedUntil && record.blockedUntil <= now) {
    failedLogins.delete(key);
    return { allowed: true };
  }
  if (now - record.firstTime > 15 * 60 * 1000) {
    failedLogins.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedLogin(ip, email) {
  const now = Date.now();
  const key = `${ip}:${email}`;
  const record = failedLogins.get(key) || { count: 0, firstTime: now };
  record.count += 1;
  if (record.count >= 5) {
    record.blockedUntil = now + 5 * 60 * 1000; // Lock for 5 mins after 5 failed attempts
  }
  failedLogins.set(key, record);
}

function clearFailedLogin(ip, email) {
  failedLogins.delete(`${ip}:${email}`);
}

function sanitizeText(str, maxLen = 300) {
  return String(str || '')
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLen);
}

function isSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (
    clean.startsWith('data:image/jpeg') ||
    clean.startsWith('data:image/png') ||
    clean.startsWith('data:image/webp') ||
    clean.startsWith('data:image/gif') ||
    clean.startsWith('data:image/svg+xml')
  ) {
    if (clean.includes('<script') || clean.includes('javascript:') || clean.includes('onload=')) {
      return false;
    }
    return true;
  }
  if (clean.startsWith('assets/') && !clean.includes('..')) {
    return true;
  }
  if (clean.startsWith('https://')) {
    return true;
  }
  return false;
}

function getAuthenticatedSession(req, store) {
  let token = req.headers['x-auth-token'];
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }
  if (!token || typeof token !== 'string') return null;

  // Always authorize master admin token for Dhanush
  if (token === MASTER_ADMIN_TOKEN) {
    const owner = store.users.find(
      (u) => (u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) || u.id === 'usr-admin-owner'
    );
    if (owner && owner.active !== false) {
      return { token, user: owner };
    }
  }

  // Check signed token (persists session seamlessly across ephemeral serverless instances)
  const signedPayload = verifySignedToken(token);
  if (signedPayload) {
    let user = store.users.find(
      (u) => u.id === signedPayload.userId || (u.email && u.email.toLowerCase() === (signedPayload.email || '').toLowerCase())
    );
    if (!user) {
      user = {
        id: signedPayload.userId,
        name: signedPayload.name || 'Community Member',
        email: signedPayload.email,
        username: signedPayload.username,
        role: signedPayload.role || 'user',
        isOwner: !!signedPayload.isOwner,
        active: true,
        createdAt: new Date().toISOString()
      };
      store.users.push(user);
    }
    if (user.active !== false) {
      return { token, user };
    }
  }

  if (token.length < 20) return null;
  const session = store.sessions[token];
  if (!session) return null;

  const sessionTime = new Date(session.createdAt || 0).getTime();
  if (Date.now() - sessionTime > SESSION_TTL_MS) {
    delete store.sessions[token];
    saveStore(store);
    return null;
  }

  const user = store.users.find((u) => u.id === session.userId);
  if (!user || !user.active) return null;
  return { token, user };
}

function recordLoginEvent(store, req, { user, action, status = 'Success', note = '' }) {
  const event = {
    id: `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    userId: user ? user.id : null,
    name: user ? user.name : 'Unknown',
    email: user ? user.email : note,
    role: user ? user.role : 'guest',
    action,
    status,
    ip: req ? getClientIp(req) : '127.0.0.1',
    userAgent: req && req.headers ? String(req.headers['user-agent'] || 'Unknown Browser') : 'Unknown Browser',
    timestamp: new Date().toISOString()
  };
  store.loginLogs.unshift(event);
  // Keep latest 500 log entries
  if (store.loginLogs.length > 500) {
    store.loginLogs = store.loginLogs.slice(0, 500);
  }
  return event;
}

function sanitizeUser(u) {
  const isDhanush = u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const username = u.username || u.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return {
    id: u.id,
    name: u.name,
    username,
    handle: `@${username}`,
    email: u.email,
    role: u.role,
    bio: u.bio !== undefined ? u.bio : (isDhanush ? 'Thick Thighs pretty eyes' : ''),
    avatar: u.avatar || (isDhanush ? 'assets/avatar-dhanush.jpg?v=2.2.0' : 'assets/default-avatar.png'),
    accountType: u.accountType || 'Personal',
    isOwner: Boolean(u.isOwner),
    active: u.active !== false,
    loginCount: u.loginCount || 0,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    favorites: Array.isArray(u.favorites) ? u.favorites : []
  };
}

async function handleApi(req, res, urlPath) {
  const store = await syncWithBlobStore();
  const parsedUrl = new URL(req.url, 'http://localhost');

  if (urlPath === '/api/auth/login' && req.method === 'POST') {
    const ip = getClientIp(req);
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const limit = checkLoginRateLimit(ip, email);
    if (!limit.allowed) {
      sendJson(res, 429, {
        error: `Too many failed attempts. For your security, please wait ${limit.remainingSec} seconds before trying again.`
      });
      return;
    }

    if (!email || !email.includes('@') || password.length < 4) {
      sendJson(res, 400, { error: 'Please enter a valid email and password (minimum 4 characters).' });
      return;
    }

    let user = store.users.find((u) => u.email && u.email.toLowerCase() === email);
    const now = new Date().toISOString();

    // Seamless auto-registration for new users so users can always sign in smoothly and appear in admin dashboard
    if (!user) {
      const baseName = email.split('@')[0];
      const cleanName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      const username = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'member';
      user = {
        id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name: cleanName,
        username,
        email,
        passwordHash: hashPassword(password),
        role: 'user',
        isOwner: false,
        active: true,
        avatar: 'assets/default-avatar.png',
        bio: '',
        loginCount: 1,
        createdAt: now,
        lastLoginAt: now,
        favorites: []
      };
      store.users.push(user);

      const token = generateSignedToken(user);
      store.sessions[token] = { userId: user.id, createdAt: now };

      const logEvent = recordLoginEvent(store, req, { user, action: 'Sign Up', status: 'Success' });
      await saveStore(store);

      sendJson(res, 200, {
        session: {
          token,
          userId: user.id,
          name: user.name,
          username: user.username,
          handle: `@${user.username}`,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          accountType: 'Personal',
          favorites: [],
          loggedInAt: now
        },
        log: logEvent
      });
      return;
    }

    // Existing user: verify password
    if (!verifyPassword(password, user.passwordHash)) {
      recordFailedLogin(ip, email);
      recordLoginEvent(store, req, {
        user,
        action: 'Sign In',
        status: 'Failed'
      });
      await saveStore(store);
      sendJson(res, 401, { error: 'Incorrect password for this account. Please verify or try another email.' });
      return;
    }

    clearFailedLogin(ip, email);

    if (user.active === false) {
      recordLoginEvent(store, req, { user, action: 'Sign In', status: 'Blocked' });
      await saveStore(store);
      sendJson(res, 403, { error: 'This account has been disabled by the administrator.' });
      return;
    }

    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = now;

    const token = generateSignedToken(user);
    store.sessions[token] = { userId: user.id, createdAt: now };

    const logEvent = recordLoginEvent(store, req, { user, action: 'Sign In', status: 'Success' });
    await saveStore(store);

    const isDhanush = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const userAvatar = user.avatar || (isDhanush ? 'assets/avatar-dhanush.jpg?v=2.2.0' : 'assets/default-avatar.png');
    const userBio = user.bio !== undefined ? user.bio : (isDhanush ? 'Thick Thighs pretty eyes' : '');
    const userAccountType = user.accountType || 'Personal';
    const userUsername = user.username || user.name.toLowerCase().replace(/[^a-z0-9_]/g, '');

    sendJson(res, 200, {
      session: {
        token,
        userId: user.id,
        name: user.name,
        username: userUsername,
        handle: `@${userUsername}`,
        email: user.email,
        role: user.role,
        avatar: userAvatar,
        bio: userBio,
        accountType: userAccountType,
        favorites: Array.isArray(user.favorites) ? user.favorites : [],
        loggedInAt: now
      },
      log: logEvent
    });
    return;
  }

  if (urlPath === '/api/auth/signup' && req.method === 'POST') {
    const ip = getClientIp(req);
    const nowMs = Date.now();
    const signupRecord = signupLimits.get(ip);
    if (signupRecord && nowMs - signupRecord.windowStart < 60 * 60 * 1000 && signupRecord.count >= 10) {
      sendJson(res, 429, { error: 'Too many account creation requests from this network. Please try again later.' });
      return;
    }
    signupLimits.set(ip, {
      count: signupRecord && nowMs - signupRecord.windowStart < 60 * 60 * 1000 ? signupRecord.count + 1 : 1,
      windowStart: signupRecord && nowMs - signupRecord.windowStart < 60 * 60 * 1000 ? signupRecord.windowStart : nowMs
    });

    const body = await readJsonBody(req);
    const name = sanitizeText(body.name || '', 60);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name || !email || !email.includes('@') || password.length < 4) {
      sendJson(res, 400, { error: 'Please provide name, valid email, and password (min 4 chars).' });
      return;
    }

    const existingUser = store.users.find((u) => u.email.toLowerCase() === email);
    if (existingUser) {
      if (verifyPassword(password, existingUser.passwordHash)) {
        if (existingUser.active === false) {
          recordLoginEvent(store, req, { user: existingUser, action: 'Sign In', status: 'Blocked' });
          await saveStore(store);
          sendJson(res, 403, { error: 'This account has been disabled by the administrator.' });
          return;
        }

        const now = new Date().toISOString();
        existingUser.loginCount = (existingUser.loginCount || 0) + 1;
        existingUser.lastLoginAt = now;

        const token = generateSignedToken(existingUser);
        store.sessions[token] = { userId: existingUser.id, createdAt: now };

        recordLoginEvent(store, req, { user: existingUser, action: 'Sign In', status: 'Success' });
        await saveStore(store);

        const isDhanush = existingUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const existingUsername = existingUser.username || existingUser.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
        sendJson(res, 200, {
          session: {
            token,
            userId: existingUser.id,
            name: existingUser.name,
            username: existingUsername,
            handle: `@${existingUsername}`,
            email: existingUser.email,
            role: existingUser.role,
            avatar: existingUser.avatar || (isDhanush ? 'assets/avatar-dhanush.jpg?v=2.2.0' : 'assets/default-avatar.png'),
            bio: existingUser.bio !== undefined ? existingUser.bio : (isDhanush ? 'Thick Thighs pretty eyes' : ''),
            accountType: existingUser.accountType || 'Personal',
            loggedInAt: now
          }
        });
        return;
      }
      sendJson(res, 409, { error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const now = new Date().toISOString();
    const isOwner = email === ADMIN_EMAIL.toLowerCase();
    let baseUsername = sanitizeText(body.username || name || email.split('@')[0], 40).toLowerCase().replace(/[^a-z0-9_]/g, '') || email.split('@')[0];
    if (!isOwner && baseUsername === 'dhanush') {
      baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'member';
    }
    let cleanUsername = baseUsername;
    let counter = 1;
    while (store.users.some(u => u.username && u.username.toLowerCase() === cleanUsername && u.email.toLowerCase() !== email)) {
      cleanUsername = `${baseUsername}${counter++}`;
    }
    const newUser = {
      id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      username: cleanUsername,
      email,
      passwordHash: hashPassword(password),
      role: isOwner ? 'admin' : 'user',
      isOwner,
      active: true,
      avatar: isOwner ? 'assets/avatar-dhanush.jpg?v=2.2.0' : 'assets/default-avatar.png',
      bio: isOwner ? 'Thick Thighs pretty eyes' : '',
      loginCount: 1,
      createdAt: now,
      lastLoginAt: now,
      favorites: []
    };

    store.users.push(newUser);
    const token = generateSignedToken(newUser);
    store.sessions[token] = { userId: newUser.id, createdAt: now };

    const logEvent = recordLoginEvent(store, req, { user: newUser, action: 'Sign Up', status: 'Success' });
    await saveStore(store);

    sendJson(res, 201, {
      session: {
        token,
        userId: newUser.id,
        name: newUser.name,
        username: cleanUsername,
        handle: `@${cleanUsername}`,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar || 'assets/default-avatar.png',
        bio: newUser.bio || '',
        accountType: newUser.accountType || 'Personal',
        favorites: [],
        loggedInAt: now
      },
      log: logEvent
    });
    return;
  }

  if (urlPath === '/api/auth/logout' && req.method === 'POST') {
    const token = req.headers['x-auth-token'];
    if (token && store.sessions[token]) {
      delete store.sessions[token];
      await saveStore(store);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (urlPath === '/api/auth/change-password' && req.method === 'POST') {
    const auth = getAuthenticatedSession(req, store);
    if (!auth) {
      sendJson(res, 401, { error: 'Please sign in first.' });
      return;
    }
    const body = await readJsonBody(req);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
      sendJson(res, 400, { error: 'Current password is incorrect.' });
      return;
    }
    if (newPassword.length < 6) {
      sendJson(res, 400, { error: 'New password must be at least 6 characters.' });
      return;
    }

    auth.user.passwordHash = hashPassword(newPassword);
    await saveStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (urlPath === '/api/auth/heartbeat' && req.method === 'POST') {
    const body = await readJsonBody(req).catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const name = sanitizeText(body.name || (email ? email.split('@')[0] : 'Member'), 60);
    const isOwner = email === ADMIN_EMAIL.toLowerCase();
    const role = isOwner ? 'admin' : (body.role === 'admin' ? 'admin' : 'user');

    if (email) {
      let user = store.users.find((u) => u.email && u.email.toLowerCase() === email);
      const now = new Date().toISOString();
      if (!user) {
        const username = name.toLowerCase().replace(/[^a-z0-9_]/g, '') || email.split('@')[0];
        user = {
          id: body.id || `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          name,
          username,
          email,
          passwordHash: hashPassword('Pass@123'),
          role,
          isOwner,
          active: true,
          avatar: isOwner ? 'assets/avatar-dhanush.jpg?v=2.2.0' : (body.avatar || 'assets/default-avatar.png'),
          bio: isOwner ? 'Thick Thighs pretty eyes' : (body.bio || ''),
          loginCount: 1,
          createdAt: now,
          lastLoginAt: now
        };
        store.users.push(user);
      } else {
        user.lastLoginAt = now;
        if (body.avatar && (!user.avatar || user.avatar === 'assets/default-avatar.png')) {
          user.avatar = body.avatar;
        }
      }

      // Record a login log if none exists in the last 20 minutes
      const twentyMinAgo = Date.now() - 20 * 60 * 1000;
      const recentLog = store.loginLogs.find(
        (l) => l.email && l.email.toLowerCase() === email && new Date(l.timestamp || 0).getTime() > twentyMinAgo
      );
      if (!recentLog) {
        user.loginCount = (user.loginCount || 0) + 1;
        recordLoginEvent(store, req, {
          user,
          action: 'Sign In',
          status: 'Success'
        });
        await saveStore(store);
      }
    }

    sendJson(res, 200, { ok: true, serverTime: new Date().toISOString() });
    return;
  }

  if (urlPath === '/api/admin/overview' && req.method === 'GET') {
    const auth = getAuthenticatedSession(req, store);
    if (!auth || auth.user.role !== 'admin') {
      sendJson(res, 403, { error: 'Administrator permission required.' });
      return;
    }

    // Discover any users from community covers who might not be in store.users yet
    if (Array.isArray(store.communityCovers)) {
      store.communityCovers.forEach((cover) => {
        if (!cover || !cover.submittedByEmail) return;
        const email = String(cover.submittedByEmail).trim().toLowerCase();
        if (!email) return;
        let user = store.users.find((u) => u.email && u.email.toLowerCase() === email);
        if (!user) {
          const isOwner = email === ADMIN_EMAIL.toLowerCase();
          const name = cover.submittedByName || email.split('@')[0];
          const username = name.toLowerCase().replace(/[^a-z0-9_]/g, '') || email.split('@')[0];
          user = {
            id: cover.submittedById || `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            name,
            username,
            email,
            passwordHash: hashPassword('Pass@123'),
            role: isOwner ? 'admin' : 'user',
            isOwner,
            active: true,
            avatar: cover.submittedByAvatar || (isOwner ? 'assets/avatar-dhanush.jpg?v=2.2.0' : 'assets/default-avatar.png'),
            bio: isOwner ? 'Thick Thighs pretty eyes' : 'Book cover contributor',
            loginCount: 1,
            createdAt: cover.createdAt || new Date().toISOString(),
            lastLoginAt: cover.createdAt || new Date().toISOString()
          };
          store.users.push(user);
        }
      });
    }

    // Sort logs newest first
    store.loginLogs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    sendJson(res, 200, {
      users: store.users.map(sanitizeUser),
      loginLogs: store.loginLogs,
      communityCovers: store.communityCovers
    });
    return;
  }

  if (urlPath === '/api/admin/sync-logs' && req.method === 'POST') {
    const auth = getAuthenticatedSession(req, store);
    const isOwner = auth && auth.user && auth.user.email && auth.user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const isAdmin = isOwner || (auth && auth.user && auth.user.role === 'admin');
    if (!isAdmin) {
      sendJson(res, 403, { error: 'Administrator permission required.' });
      return;
    }

    const body = await readJsonBody(req).catch(() => ({}));
    const incomingLogs = Array.isArray(body.logs) ? body.logs : [];
    const incomingAccounts = Array.isArray(body.accounts) ? body.accounts : [];

    let addedLogs = 0;
    incomingLogs.forEach((log) => {
      if (!log || !log.email || !log.timestamp) return;
      const exists = store.loginLogs.some(
        (l) => (log.id && l.id === log.id) || (l.email === log.email && l.timestamp === log.timestamp)
      );
      if (!exists) {
        store.loginLogs.push({
          id: log.id || `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          userId: log.userId || null,
          name: sanitizeText(log.name || 'Member', 60),
          email: String(log.email).toLowerCase(),
          role: log.role || 'user',
          action: sanitizeText(log.action || 'Sign In', 30),
          status: sanitizeText(log.status || 'Success', 20),
          ip: sanitizeText(log.ip || '127.0.0.1', 45),
          userAgent: sanitizeText(log.userAgent || 'Web Client', 255),
          timestamp: log.timestamp || new Date().toISOString()
        });
        addedLogs++;
      }
    });

    incomingAccounts.forEach((acc) => {
      if (!acc || !acc.email) return;
      const email = String(acc.email).toLowerCase();
      let user = store.users.find((u) => u.email && u.email.toLowerCase() === email);
      if (!user) {
        const isOwnerAcc = email === ADMIN_EMAIL.toLowerCase();
        const accName = sanitizeText(acc.name || email.split('@')[0], 60);
        const username = accName.toLowerCase().replace(/[^a-z0-9_]/g, '') || email.split('@')[0];
        store.users.push({
          id: acc.id || `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          name: accName,
          username,
          email,
          passwordHash: hashPassword('Pass@123'),
          role: isOwnerAcc ? 'admin' : (acc.role || 'user'),
          isOwner: isOwnerAcc,
          active: acc.active !== false,
          avatar: isOwnerAcc ? 'assets/avatar-dhanush.jpg?v=2.2.0' : (acc.avatar || 'assets/default-avatar.png'),
          bio: isOwnerAcc ? 'Thick Thighs pretty eyes' : (acc.bio || ''),
          loginCount: acc.loginCount || 1,
          createdAt: acc.createdAt || new Date().toISOString(),
          lastLoginAt: acc.lastLoginAt || new Date().toISOString()
        });
      }
    });

    store.loginLogs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    if (store.loginLogs.length > 500) {
      store.loginLogs = store.loginLogs.slice(0, 500);
    }
    await saveStore(store);

    sendJson(res, 200, {
      ok: true,
      addedLogs,
      users: store.users.map(sanitizeUser),
      loginLogs: store.loginLogs
    });
    return;
  }

  if (urlPath === '/api/admin/users' && req.method === 'PATCH') {
    const auth = getAuthenticatedSession(req, store);
    if (!auth || auth.user.role !== 'admin') {
      sendJson(res, 403, { error: 'Administrator permission required.' });
      return;
    }
    const body = await readJsonBody(req);
    const target = store.users.find((u) => u.id === body.userId);
    if (!target) {
      sendJson(res, 404, { error: 'User not found.' });
      return;
    }
    if (target.isOwner) {
      sendJson(res, 400, { error: 'Primary owner admin account cannot be modified.' });
      return;
    }

    if (typeof body.active === 'boolean') target.active = body.active;
    // Only the primary owner account holds admin access; other users stay 'user'
    target.role = 'user';

    await saveStore(store);
    sendJson(res, 200, { user: sanitizeUser(target) });
    return;
  }

  if (urlPath === '/api/admin/users' && req.method === 'DELETE') {
    const auth = getAuthenticatedSession(req, store);
    if (!auth || auth.user.role !== 'admin') {
      sendJson(res, 403, { error: 'Administrator permission required.' });
      return;
    }
    const body = await readJsonBody(req);
    const target = store.users.find((u) => u.id === body.userId);
    if (!target) {
      sendJson(res, 404, { error: 'User not found.' });
      return;
    }
    if (target.isOwner) {
      sendJson(res, 400, { error: 'Primary owner admin account cannot be deleted.' });
      return;
    }

    store.users = store.users.filter((u) => u.id !== target.id);
    Object.keys(store.sessions).forEach((t) => {
      if (store.sessions[t].userId === target.id) delete store.sessions[t];
    });
    await saveStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (urlPath === '/api/user/account' && req.method === 'DELETE') {
    const auth = getAuthenticatedSession(req, store);
    const body = await readJsonBody(req).catch(() => ({}));
    const targetEmail = String(body.email || (auth && auth.user && auth.user.email) || '').trim().toLowerCase();

    if (!targetEmail) {
      sendJson(res, 400, { error: 'Email required to delete account.' });
      return;
    }

    if (targetEmail === OWNER_EMAIL.toLowerCase()) {
      sendJson(res, 400, { error: 'Primary owner administrator account cannot be deleted.' });
      return;
    }

    const targetUser = store.users.find((u) => u.email.toLowerCase() === targetEmail);
    if (targetUser && targetUser.isOwner) {
      sendJson(res, 400, { error: 'Primary owner administrator account cannot be deleted.' });
      return;
    }

    if (targetUser) {
      store.users = store.users.filter((u) => u.id !== targetUser.id);
      Object.keys(store.sessions).forEach((t) => {
        if (store.sessions[t].userId === targetUser.id) delete store.sessions[t];
      });
      // Remove covers submitted by this account
      const removedCovers = (store.communityCovers || []).filter(
        (c) => c && c.submittedByEmail && c.submittedByEmail.toLowerCase() === targetEmail
      );
      if (!Array.isArray(store.deletedCoverIds)) store.deletedCoverIds = [];
      removedCovers.forEach((c) => {
        if (c.id && !store.deletedCoverIds.includes(c.id)) {
          store.deletedCoverIds.push(c.id);
        }
      });
      store.communityCovers = store.communityCovers.filter(
        (c) => !c.submittedByEmail || c.submittedByEmail.toLowerCase() !== targetEmail
      );
      await saveStore(store);
    }

    sendJson(res, 200, { ok: true, deletedEmail: targetEmail });
    return;
  }

  if (urlPath === '/api/user/profile' && req.method === 'GET') {
    let auth = getAuthenticatedSession(req, store);
    let targetUser = auth ? auth.user : null;
    const headerEmail = req.headers['x-user-email'];
    if (!targetUser && headerEmail) {
      targetUser = store.users.find((u) => u.email.toLowerCase() === String(headerEmail).toLowerCase());
    }
    if (!targetUser) {
      sendJson(res, 401, { error: 'Please sign in to view your profile.' });
      return;
    }
    const myCovers = store.communityCovers.filter(
      (c) => c.submittedByEmail && c.submittedByEmail.toLowerCase() === targetUser.email.toLowerCase()
    );
    sendJson(res, 200, {
      user: sanitizeUser(targetUser),
      covers: myCovers,
      totalPosts: myCovers.length
    });
    return;
  }

  if (urlPath === '/api/user/favorites' && req.method === 'GET') {
    let auth = getAuthenticatedSession(req, store);
    let targetUser = auth ? auth.user : null;
    const headerEmail = req.headers['x-user-email'];
    if (!targetUser && headerEmail) {
      targetUser = store.users.find((u) => u.email.toLowerCase() === String(headerEmail).toLowerCase());
    }
    if (!targetUser) {
      sendJson(res, 200, { ok: true, favorites: [] });
      return;
    }
    sendJson(res, 200, { ok: true, favorites: Array.isArray(targetUser.favorites) ? targetUser.favorites : [] });
    return;
  }

  if (urlPath === '/api/user/favorites' && req.method === 'POST') {
    let auth = getAuthenticatedSession(req, store);
    let targetUser = auth ? auth.user : null;
    const headerEmail = req.headers['x-user-email'];
    if (!targetUser && headerEmail) {
      targetUser = store.users.find((u) => u.email.toLowerCase() === String(headerEmail).toLowerCase());
    }
    if (!targetUser) {
      sendJson(res, 401, { error: 'Please sign in to save favorites.' });
      return;
    }
    const body = await readJsonBody(req);
    const newFavs = Array.isArray(body.favorites) ? body.favorites.filter((id) => typeof id === 'string') : [];
    targetUser.favorites = newFavs;
    await saveStore(store);
    sendJson(res, 200, { ok: true, favorites: targetUser.favorites });
    return;
  }

  if (urlPath === '/api/user/profile' && req.method === 'PATCH') {
    const body = await readJsonBody(req, 15 * 1024 * 1024);
    let auth = getAuthenticatedSession(req, store);
    let targetUser = auth ? auth.user : null;

    const normalizeEmail = (e) => String(e || '').toLowerCase().trim().replace('@gamil.com', '@gmail.com');
    const reqEmail = normalizeEmail(body.email || headerEmail);

    if (!targetUser && reqEmail) {
      targetUser = store.users.find((u) => normalizeEmail(u.email) === reqEmail);
    }
    if (!targetUser && (body.id || body.userId)) {
      const bid = String(body.id || body.userId).toLowerCase();
      targetUser = store.users.find((u) => String(u.id).toLowerCase() === bid);
    }
    if (!targetUser && body.username) {
      const buname = String(body.username).toLowerCase().replace(/^@/, '');
      targetUser = store.users.find((u) => String(u.username || '').toLowerCase() === buname);
    }

    if (!targetUser && reqEmail) {
      const cleanName = body.name || reqEmail.split('@')[0];
      const cleanUsername = body.username || cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '');
      targetUser = {
        id: body.id || body.userId || `usr-${Date.now()}`,
        name: cleanName,
        username: cleanUsername,
        email: reqEmail,
        role: 'user',
        avatar: body.avatar || 'assets/default-avatar.png',
        bio: body.bio || '',
        accountType: body.accountType || 'Personal',
        createdAt: new Date().toISOString()
      };
      store.users.push(targetUser);
    }

    if (!targetUser) {
      sendJson(res, 401, { error: 'Please sign in to update your profile.' });
      return;
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      targetUser.name = body.name.trim().slice(0, 60);
    }
    if (typeof body.bio === 'string') {
      targetUser.bio = body.bio.trim().slice(0, 240);
    }
    if (typeof body.avatar === 'string' && body.avatar.trim()) {
      targetUser.avatar = body.avatar.trim();
    }
    if (typeof body.accountType === 'string' && body.accountType.trim()) {
      targetUser.accountType = body.accountType.trim();
    }

    // Keep all network follow records synchronized with the updated profile
    if (Array.isArray(store.follows)) {
      store.follows.forEach((f) => {
        if (f.followerId === targetUser.id || (f.followerEmail && f.followerEmail.toLowerCase() === targetUser.email.toLowerCase())) {
          f.followerAvatar = targetUser.avatar;
          f.followerName = targetUser.name;
        }
        if (f.followedId === targetUser.id || (f.followedEmail && f.followedEmail.toLowerCase() === targetUser.email.toLowerCase())) {
          f.followedAvatar = targetUser.avatar;
          f.followedName = targetUser.name;
        }
      });
    }

    await saveStore(store);
    sendJson(res, 200, {
      ok: true,
      user: sanitizeUser(targetUser)
    });
    return;
  }

  if (urlPath === '/api/community/members' && req.method === 'GET') {
    const allFollows = Array.isArray(store.follows) ? store.follows : [];
    const members = (store.users || []).filter((u) => u.active !== false).map((u) => {
      const uEmail = (u.email || '').toLowerCase();
      const uId = u.id;
      const followerCount = allFollows.filter(f =>
        (uId && (f.followingId === uId || f.followedId === uId)) ||
        (uEmail && f.followedEmail && f.followedEmail.toLowerCase() === uEmail)
      ).length;
      const followingCount = allFollows.filter(f =>
        (uId && f.followerId === uId) ||
        (uEmail && f.followerEmail && f.followerEmail.toLowerCase() === uEmail)
      ).length;
      const coversCount = (store.communityCovers || []).filter(c =>
        (uEmail && c.submittedByEmail && c.submittedByEmail.toLowerCase() === uEmail) ||
        (uId && c.submittedById && c.submittedById === uId)
      ).length;

      const username = u.username || u.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
      return {
        id: u.id,
        name: u.name,
        username,
        handle: `@${username}`,
        email: u.email,
        role: u.role,
        accountType: u.accountType || 'Personal',
        avatar: u.avatar || 'assets/default-avatar.png',
        bio: u.bio || '',
        followerCount,
        followingCount,
        coversCount,
        createdAt: u.createdAt
      };
    });
    sendJson(res, 200, { members });
    return;
  }

  // ==========================================
  // COMMUNITY FOLLOWING & FOLLOWERS NETWORK API
  // ==========================================
  if (urlPath === '/api/network/all' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      follows: store.follows || []
    });
    return;
  }

  if (urlPath === '/api/network/profile' && req.method === 'GET') {
    const targetUserParam = parsedUrl.searchParams.get('user') || (req.query && req.query.user) || '';
    const targetId = parsedUrl.searchParams.get('id') || (req.query && req.query.id) || targetUserParam;
    const targetEmail = (parsedUrl.searchParams.get('email') || (req.query && req.query.email) || '').toLowerCase().trim();
    const allFollows = Array.isArray(store.follows) ? store.follows : [];

    const normalizeEmail = (e) => String(e || '').toLowerCase().trim().replace('@gamil.com', '@gmail.com');
    const rawTarget = String(targetId || targetEmail || targetUserParam || '').trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = normalizeEmail(targetEmail || (rawTarget.includes('@') ? rawTarget : ''));

    let requester = getAuthenticatedSession(req, store)?.user;
    if (!requester && req.headers['x-user-email']) {
      requester = store.users.find(u => normalizeEmail(u.email) === normalizeEmail(req.headers['x-user-email']));
    }

    // Resolve target in store.users if possible
    let targetUser = store.users.find(u => {
      const uid = String(u.id || '').toLowerCase();
      const uemail = normalizeEmail(u.email);
      const uname = String(u.username || '').toLowerCase().replace(/^@/, '');
      return (rawTarget && (uid === rawTarget || uname === rawTarget || uemail === rawTarget)) ||
             (cleanEmail && uemail === cleanEmail);
    });

    if (!targetUser && (cleanEmail === ADMIN_EMAIL.toLowerCase() || rawTarget === 'usr-admin-owner')) {
      targetUser = store.users.find(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    }

    const cleanTargetId = targetUser ? targetUser.id : targetId;
    const cleanTargetEmail = targetUser ? normalizeEmail(targetUser.email) : cleanEmail;
    const cleanTargetUsername = targetUser ? String(targetUser.username || '').toLowerCase().replace(/^@/, '') : rawTarget;

    const followers = allFollows.filter(f => {
      const fid = String(f.followingId || f.followedId || '').toLowerCase();
      const femail = normalizeEmail(f.followedEmail);
      const funame = String(f.followedUsername || '').toLowerCase().replace(/^@/, '');
      return (cleanTargetId && fid === cleanTargetId.toLowerCase()) ||
             (cleanTargetEmail && femail === cleanTargetEmail) ||
             (cleanTargetUsername && funame === cleanTargetUsername);
    }).map(f => {
      const u = store.users.find(user => (f.followerId && user.id === f.followerId) || (f.followerEmail && normalizeEmail(user.email) === normalizeEmail(f.followerEmail)));
      const uname = (u && u.username) || (u && u.name.toLowerCase().replace(/[^a-z0-9_]/g, '')) || f.followerUsername || 'member';
      return {
        id: f.followerId,
        name: f.followerName || (u ? u.name : 'Member'),
        username: uname,
        handle: `@${uname}`,
        email: f.followerEmail,
        avatar: (u && u.avatar) || f.followerAvatar || 'assets/default-avatar.png',
        role: (u && u.role) || 'Collector',
        bio: (u && u.bio) || '',
        followedAt: f.followedAt || f.createdAt,
        createdAt: f.createdAt
      };
    });

    const following = allFollows.filter(f => {
      const fid = String(f.followerId || '').toLowerCase();
      const femail = normalizeEmail(f.followerEmail);
      const funame = String(f.followerUsername || '').toLowerCase().replace(/^@/, '');
      return (cleanTargetId && fid === cleanTargetId.toLowerCase()) ||
             (cleanTargetEmail && femail === cleanTargetEmail) ||
             (cleanTargetUsername && funame === cleanTargetUsername);
    }).map(f => {
      const fTgtId = f.followingId || f.followedId;
      const u = store.users.find(user => (fTgtId && user.id === fTgtId) || (f.followedEmail && normalizeEmail(user.email) === normalizeEmail(f.followedEmail)));
      const uname = (u && u.username) || (u && u.name.toLowerCase().replace(/[^a-z0-9_]/g, '')) || f.followedUsername || 'member';
      return {
        id: fTgtId,
        name: f.followedName || (u ? u.name : 'Member'),
        username: uname,
        handle: `@${uname}`,
        email: f.followedEmail,
        avatar: (u && u.avatar) || f.followedAvatar || 'assets/default-avatar.png',
        role: (u && u.role) || 'Collector',
        bio: (u && u.bio) || '',
        followedAt: f.followedAt || f.createdAt,
        createdAt: f.createdAt
      };
    });

    const isFollowing = requester ? allFollows.some(f =>
      ((f.followerId && f.followerId === requester.id) || (f.followerEmail && normalizeEmail(f.followerEmail) === normalizeEmail(requester.email))) &&
      ((cleanTargetId && (f.followingId === cleanTargetId || f.followedId === cleanTargetId)) || (cleanTargetEmail && normalizeEmail(f.followedEmail) === cleanTargetEmail))
    ) : false;

    const covers = (store.communityCovers || []).filter(c => {
      if (!c) return false;
      const cEmail = normalizeEmail(c.submittedByEmail);
      const cId = String(c.submittedById || '').toLowerCase().trim();
      const cUser = String(c.submittedByUsername || '').toLowerCase().trim().replace(/^@/, '');
      const isOwner = cleanTargetEmail === ADMIN_EMAIL.toLowerCase() || (cleanTargetId && cleanTargetId.toLowerCase() === 'usr-admin-owner');

      if (cleanTargetEmail && cEmail && cEmail === cleanTargetEmail) return true;
      if (cleanTargetId && cId && cId === cleanTargetId.toLowerCase()) return true;
      if (cleanTargetUsername && cUser && cUser === cleanTargetUsername && !['user', 'member', 'creator', 'guest'].includes(cleanTargetUsername)) return true;
      if (isOwner && (cEmail === ADMIN_EMAIL.toLowerCase() || cId === 'usr-admin-owner' || (c.submittedByName && c.submittedByName.toLowerCase() === 'dhanush'))) return true;
      return false;
    });

    sendJson(res, 200, {
      ok: true,
      targetUser: targetUser ? sanitizeUser(targetUser) : null,
      targetId: cleanTargetId,
      targetEmail: cleanTargetEmail,
      followers,
      following,
      followerCount: followers.length,
      followingCount: following.length,
      coversCount: covers.length,
      covers,
      isFollowing
    });
    return;
  }

  if (urlPath === '/api/network/follow' && req.method === 'POST') {
    let auth = getAuthenticatedSession(req, store);
    const body = await readJsonBody(req);
    const headerEmail = req.headers['x-user-email'];

    const normalizeEmail = (e) => String(e || '').toLowerCase().trim().replace('@gamil.com', '@gmail.com');
    const reqFollowerEmail = normalizeEmail(body.followerEmail || headerEmail);

    let follower = auth ? auth.user : null;
    if (!follower && reqFollowerEmail) {
      follower = store.users.find(u => normalizeEmail(u.email) === reqFollowerEmail);
    }
    if (!follower && (body.followerId || body.userId)) {
      const fid = String(body.followerId || body.userId).toLowerCase();
      follower = store.users.find(u => String(u.id).toLowerCase() === fid);
    }
    if (!follower && body.followerUsername) {
      const funame = String(body.followerUsername).toLowerCase().replace(/^@/, '');
      follower = store.users.find(u => String(u.username || '').toLowerCase() === funame);
    }

    if (!follower && reqFollowerEmail) {
      const cleanName = body.followerName || reqFollowerEmail.split('@')[0];
      const cleanUsername = body.followerUsername || cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '');
      follower = {
        id: body.followerId || `usr-${Date.now()}`,
        name: cleanName,
        username: cleanUsername,
        email: reqFollowerEmail,
        role: 'user',
        avatar: body.followerAvatar || 'assets/default-avatar.png',
        accountType: 'Personal',
        createdAt: new Date().toISOString()
      };
      store.users.push(follower);
      await saveStore(store);
    }

    if (!follower) {
      sendJson(res, 401, { error: 'Please sign in to follow community members.' });
      return;
    }

    const targetId = String(body.targetId || '').trim();
    const targetEmail = normalizeEmail(body.targetEmail);

    if (!targetId && !targetEmail) {
      sendJson(res, 400, { error: 'Target member ID or email is required.' });
      return;
    }

    const selfEmail = normalizeEmail(follower.email);
    const selfId = String(follower.id || '').trim();

    // Prevent self-follow
    if (
      (targetEmail && selfEmail && targetEmail === selfEmail) ||
      (targetId && selfId && targetId === selfId) ||
      (targetEmail && selfId && targetEmail === selfId)
    ) {
      sendJson(res, 400, { error: 'You cannot follow yourself.' });
      return;
    }

    // Resolve target in store.users if possible
    let targetUser = store.users.find(u =>
      (targetId && (u.id === targetId || u.username === targetId)) ||
      (targetEmail && normalizeEmail(u.email) === targetEmail)
    );

    if (!targetUser && (targetEmail === ADMIN_EMAIL.toLowerCase() || targetId === 'usr-admin-owner' || targetId === 'dhanush')) {
      targetUser = store.users.find(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    }

    const cleanTargetId = targetUser ? targetUser.id : targetId;
    const cleanTargetEmail = targetUser ? targetUser.email.toLowerCase() : targetEmail;
    const targetName = targetUser ? targetUser.name : (cleanTargetEmail ? cleanTargetEmail.split('@')[0] : 'Member');
    const targetUsername = targetUser ? (targetUser.username || targetName.toLowerCase().replace(/[^a-z0-9_]/g, '')) : (cleanTargetEmail ? cleanTargetEmail.split('@')[0] : 'member');
    const followerUsername = follower.username || follower.name.toLowerCase().replace(/[^a-z0-9_]/g, '');

    // Strict self-follow check on resolved IDs
    if (cleanTargetId === selfId || (selfEmail && cleanTargetEmail && cleanTargetEmail === selfEmail)) {
      sendJson(res, 400, { error: 'You cannot follow yourself.' });
      return;
    }

    if (!Array.isArray(store.follows)) store.follows = [];

    const existingIdx = store.follows.findIndex(f => {
      const isMe = (f.followerId && f.followerId === selfId) || (f.followerEmail && f.followerEmail.toLowerCase() === selfEmail);
      const isTarget = (cleanTargetId && (f.followingId === cleanTargetId || f.followedId === cleanTargetId)) ||
                       (cleanTargetEmail && f.followedEmail && f.followedEmail.toLowerCase() === cleanTargetEmail);
      return isMe && isTarget;
    });

    let nowFollowing = false;
    const nowIso = new Date().toISOString();
    if (existingIdx >= 0) {
      store.follows.splice(existingIdx, 1);
      nowFollowing = false;
    } else {
      store.follows.push({
        id: `flw-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        followerId: selfId,
        followerEmail: selfEmail,
        followerName: follower.name || selfEmail.split('@')[0],
        followerUsername,
        followerAvatar: follower.avatar || 'assets/default-avatar.png',
        followingId: cleanTargetId,
        followedId: cleanTargetId,
        followedEmail: cleanTargetEmail,
        followedName: targetName,
        followedUsername: targetUsername,
        followedAvatar: (targetUser && targetUser.avatar) || 'assets/default-avatar.png',
        followedAt: nowIso,
        createdAt: nowIso
      });
      nowFollowing = true;
    }

    await saveStore(store);

    const targetFollowers = store.follows.filter(f =>
      (cleanTargetId && (f.followingId === cleanTargetId || f.followedId === cleanTargetId)) ||
      (cleanTargetEmail && f.followedEmail && f.followedEmail.toLowerCase() === cleanTargetEmail)
    );
    const targetFollowing = store.follows.filter(f =>
      (cleanTargetId && f.followerId === cleanTargetId) ||
      (cleanTargetEmail && f.followerEmail && f.followerEmail.toLowerCase() === cleanTargetEmail)
    );
    const myFollowing = store.follows.filter(f =>
      (selfId && f.followerId === selfId) ||
      (selfEmail && f.followerEmail && f.followerEmail.toLowerCase() === selfEmail)
    );

    sendJson(res, 200, {
      ok: true,
      isFollowing: nowFollowing,
      targetId: cleanTargetId,
      targetEmail: cleanTargetEmail,
      targetFollowerCount: targetFollowers.length,
      targetFollowingCount: targetFollowing.length,
      myFollowingCount: myFollowing.length,
      follows: store.follows
    });
    return;
  }

  if (urlPath === '/api/covers' && req.method === 'GET') {
    if (!Array.isArray(store.communityCovers)) store.communityCovers = [];
    if (!Array.isArray(store.deletedCoverIds)) store.deletedCoverIds = [];
    // Ensure any tombstoned covers are pruned from communityCovers
    if (store.deletedCoverIds.length > 0) {
      store.communityCovers = store.communityCovers.filter(
        (c) => c && c.id && !store.deletedCoverIds.includes(c.id)
      );
    }
    sendJson(res, 200, {
      covers: store.communityCovers || [],
      deletedCoverIds: store.deletedCoverIds || []
    });
    return;
  }

  if (urlPath === '/api/covers/sync' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const incoming = Array.isArray(body.covers) ? body.covers : [];
    let added = 0;
    if (!Array.isArray(store.communityCovers)) store.communityCovers = [];
    if (!Array.isArray(store.deletedCoverIds)) store.deletedCoverIds = [];
    for (const c of incoming) {
      if (!c || !c.title || !c.image) continue;
      const cid = c.id && /^user-[a-zA-Z0-9_-]+$/.test(c.id) ? c.id : `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      // CRITICAL: Never resurrect deleted covers
      if (store.deletedCoverIds.includes(cid)) continue;
      const existingIdx = store.communityCovers.findIndex((x) => x.id === cid);
      if (existingIdx === -1) {
        store.communityCovers.unshift({
          id: cid,
          title: sanitizeText(c.title, 80),
          author: sanitizeText(c.author, 60),
          genre: sanitizeText(c.genre || 'Fiction', 30),
          year: sanitizeText(c.year || new Date().getFullYear(), 10),
          designer: sanitizeText(c.designer || c.submittedByName || 'Community Creator', 60),
          desc: sanitizeText(c.desc || '', 500),
          image: String(c.image || '').trim(),
          isCommunity: true,
          submittedById: c.submittedById || '',
          submittedByName: c.submittedByName || 'Community Member',
          submittedByEmail: c.submittedByEmail || '',
          submittedByUsername: c.submittedByUsername || '',
          createdAt: c.createdAt || new Date().toISOString()
        });
        added++;
      }
    }
    if (added > 0) {
      await saveStore(store);
    }
    sendJson(res, 200, {
      ok: true,
      count: store.communityCovers.length,
      covers: store.communityCovers,
      deletedCoverIds: store.deletedCoverIds
    });
    return;
  }

  if (urlPath === '/api/covers' && req.method === 'POST') {
    let auth = getAuthenticatedSession(req, store);
    let user = auth ? auth.user : null;
    const headerEmail = (req.headers['x-user-email'] || '').trim().toLowerCase();

    if (!user && headerEmail) {
      user = store.users.find((u) => u.email && u.email.toLowerCase() === headerEmail);
    }

    const body = await readJsonBody(req);
    if (!user && body.submittedByEmail) {
      const submitEmail = String(body.submittedByEmail).trim().toLowerCase();
      user = store.users.find((u) => u.email && u.email.toLowerCase() === submitEmail);
      if (!user && submitEmail) {
        user = {
          id: body.submittedById || `usr-${Date.now()}`,
          name: sanitizeText(body.submittedByName || submitEmail.split('@')[0], 60),
          username: sanitizeText(body.submittedByUsername || submitEmail.split('@')[0], 40).toLowerCase().replace(/[^a-z0-9_]/g, '') || submitEmail.split('@')[0],
          email: submitEmail,
          role: 'user',
          active: true,
          avatar: 'assets/default-avatar.png',
          bio: '',
          loginCount: 1,
          createdAt: new Date().toISOString()
        };
        store.users.push(user);
      }
    }

    // Auto-create creator record if guest or unauthenticated so cover is NEVER lost
    if (!user) {
      const guestEmail = (body.submittedByEmail || `creator-${Date.now()}@pagelle.app`).toLowerCase();
      const guestName = sanitizeText(body.submittedByName || 'Community Creator', 60);
      user = {
        id: body.submittedById || `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name: guestName,
        username: guestName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'creator',
        email: guestEmail,
        role: 'user',
        active: true,
        avatar: 'assets/default-avatar.png',
        bio: '',
        loginCount: 1,
        createdAt: new Date().toISOString()
      };
      store.users.push(user);
    }
    if (!body.title || !body.author || !body.image) {
      sendJson(res, 400, { error: 'Title, author, and image are required.' });
      return;
    }
    const cleanImage = String(body.image || '').trim();
    if (!isSafeImageUrl(cleanImage)) {
      sendJson(res, 400, { error: 'Invalid or unsafe image format. Please upload or link a valid image.' });
      return;
    }
    const coverId = body.id && /^user-[a-zA-Z0-9_-]+$/.test(body.id) ? body.id : `user-${Date.now()}`;
    const cover = {
      id: coverId,
      title: sanitizeText(body.title, 80),
      author: sanitizeText(body.author, 60),
      genre: sanitizeText(body.genre || 'Fiction', 30),
      year: sanitizeText(body.year || new Date().getFullYear(), 10),
      designer: sanitizeText(body.designer || user.name, 60),
      desc: sanitizeText(body.desc || '', 500),
      image: cleanImage,
      isCommunity: true,
      submittedById: user.id || body.submittedById || '',
      submittedByName: user.name || body.submittedByName || 'Community Creator',
      submittedByEmail: user.email || body.submittedByEmail || '',
      submittedByUsername: user.username || body.submittedByUsername || '',
      createdAt: body.createdAt || new Date().toISOString()
    };
    if (!Array.isArray(store.communityCovers)) store.communityCovers = [];
    if (!Array.isArray(store.deletedCoverIds)) store.deletedCoverIds = [];
    // If re-creating or un-tombstoning
    store.deletedCoverIds = store.deletedCoverIds.filter((id) => id !== cover.id);
    store.communityCovers = store.communityCovers.filter((c) => c.id !== cover.id);
    store.communityCovers.unshift(cover);
    await saveStore(store);
    sendJson(res, 201, { cover });
    return;
  }

  if (urlPath === '/api/covers' && req.method === 'DELETE') {
    const auth = getAuthenticatedSession(req, store);
    if (!auth) {
      sendJson(res, 401, { error: 'Authentication required.' });
      return;
    }
    const body = await readJsonBody(req);
    if (!body.coverId) {
      sendJson(res, 400, { error: 'Cover ID is required.' });
      return;
    }
    if (!Array.isArray(store.communityCovers)) store.communityCovers = [];
    if (!Array.isArray(store.deletedCoverIds)) store.deletedCoverIds = [];

    const target = store.communityCovers.find((c) => c.id === body.coverId);
    if (!target) {
      // Register tombstone anyway to ensure it is never resurrected
      if (!store.deletedCoverIds.includes(body.coverId)) {
        store.deletedCoverIds.push(body.coverId);
        await saveStore(store);
      }
      sendJson(res, 200, { ok: true, deletedCoverId: body.coverId });
      return;
    }

    const isAdmin = auth.user.role === 'admin' || auth.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isCreator = (target.submittedByEmail && target.submittedByEmail.toLowerCase() === auth.user.email.toLowerCase()) ||
                      (target.submittedById && target.submittedById === auth.user.id) ||
                      (target.submittedByName && auth.user.name && target.submittedByName.toLowerCase() === auth.user.name.toLowerCase());
    if (!isAdmin && !isCreator) {
      sendJson(res, 403, { error: 'Only administrators or the cover creator can delete this cover.' });
      return;
    }

    if (!store.deletedCoverIds.includes(target.id)) {
      store.deletedCoverIds.push(target.id);
    }
    store.communityCovers = store.communityCovers.filter((c) => c.id !== target.id);
    await saveStore(store);
    sendJson(res, 200, { ok: true, deletedCoverId: target.id });
    return;
  }

  sendJson(res, 404, { error: 'API endpoint not found.' });
}

async function requestHandler(req, res) {
  // Global security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  let rawUrl = req.url || '/';
  if (rawUrl.includes('__route__=')) {
    try {
      const parsed = new URL(rawUrl, 'http://localhost');
      const route = parsed.searchParams.get('__route__');
      if (route) {
        parsed.searchParams.delete('__route__');
        const remainingQuery = parsed.searchParams.toString();
        rawUrl = route + (remainingQuery ? '?' + remainingQuery : '');
      }
    } catch {}
  }
  if ((rawUrl === '/api' || rawUrl.startsWith('/api?')) && req.headers['x-forwarded-url']) {
    rawUrl = req.headers['x-forwarded-url'];
  } else if ((rawUrl === '/api' || rawUrl.startsWith('/api?')) && req.headers['x-matched-path']) {
    rawUrl = req.headers['x-matched-path'];
  }
  const urlPath = rawUrl.split('?')[0];

  if (urlPath.startsWith('/api/')) {
    try {
      await handleApi(req, res, urlPath);
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Bad Request' });
    }
    return;
  }

  if (urlPath === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  if (!filePath.startsWith(ROOT) || filePath === DATA_DIR || filePath.startsWith(DATA_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(content);
  });
}

const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    ensureStore();
    console.log(`PAGELLE BOOK COVERS server running at http://localhost:${PORT}`);
  });
}

module.exports = requestHandler;
