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

function saveStore(store) {
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
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
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
  const token = req.headers['x-auth-token'];
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
  store.loginLogs.unshift({
    id: `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    userId: user ? user.id : null,
    name: user ? user.name : 'Unknown',
    email: user ? user.email : note,
    role: user ? user.role : 'guest',
    action,
    status,
    ip: getClientIp(req),
    userAgent: String(req.headers['user-agent'] || 'Unknown Browser'),
    timestamp: new Date().toISOString()
  });
  // Keep latest 500 log entries
  if (store.loginLogs.length > 500) {
    store.loginLogs = store.loginLogs.slice(0, 500);
  }
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
    lastLoginAt: u.lastLoginAt
  };
}

async function handleApi(req, res, urlPath) {
  const store = ensureStore();
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

    const user = store.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordFailedLogin(ip, email);
      recordLoginEvent(store, req, {
        user: user || { id: null, name: email || 'Unknown', email: email || '—', role: 'guest' },
        action: 'Sign In',
        status: 'Failed'
      });
      saveStore(store);
      sendJson(res, 401, { error: 'Invalid email or password.' });
      return;
    }

    clearFailedLogin(ip, email);

    if (user.active === false) {
      recordLoginEvent(store, req, { user, action: 'Sign In', status: 'Blocked' });
      saveStore(store);
      sendJson(res, 403, { error: 'This account has been disabled by the administrator.' });
      return;
    }

    const now = new Date().toISOString();
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = now;

    const token = generateSignedToken(user);
    store.sessions[token] = { userId: user.id, createdAt: now };

    recordLoginEvent(store, req, { user, action: 'Sign In', status: 'Success' });
    saveStore(store);

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
        loggedInAt: now
      }
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
          saveStore(store);
          sendJson(res, 403, { error: 'This account has been disabled by the administrator.' });
          return;
        }

        const now = new Date().toISOString();
        existingUser.loginCount = (existingUser.loginCount || 0) + 1;
        existingUser.lastLoginAt = now;

        const token = crypto.randomBytes(24).toString('hex');
        store.sessions[token] = { userId: existingUser.id, createdAt: now };

        recordLoginEvent(store, req, { user: existingUser, action: 'Sign In', status: 'Success' });
        saveStore(store);

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
    const isOwner = email === ADMIN_EMAIL;
    const cleanUsername = sanitizeText(body.username || name || email.split('@')[0], 40).toLowerCase().replace(/[^a-z0-9_]/g, '') || email.split('@')[0];
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
      lastLoginAt: now
    };

    store.users.push(newUser);
    const token = generateSignedToken(newUser);
    store.sessions[token] = { userId: newUser.id, createdAt: now };

    recordLoginEvent(store, req, { user: newUser, action: 'Sign Up', status: 'Success' });
    saveStore(store);

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
        loggedInAt: now
      }
    });
    return;
  }

  if (urlPath === '/api/auth/logout' && req.method === 'POST') {
    const token = req.headers['x-auth-token'];
    if (token && store.sessions[token]) {
      delete store.sessions[token];
      saveStore(store);
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
    saveStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (urlPath === '/api/admin/overview' && req.method === 'GET') {
    const auth = getAuthenticatedSession(req, store);
    if (!auth || auth.user.role !== 'admin') {
      sendJson(res, 403, { error: 'Administrator permission required.' });
      return;
    }

    sendJson(res, 200, {
      users: store.users.map(sanitizeUser),
      loginLogs: store.loginLogs,
      communityCovers: store.communityCovers
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

    saveStore(store);
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
    saveStore(store);
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
      saveStore(store);
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

    saveStore(store);
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

    if (!targetUser && (cleanEmail === ADMIN_EMAIL.toLowerCase() || rawTarget === 'usr-admin-owner' || rawTarget === 'dhanush')) {
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
      const cName = String(c.submittedByName || c.designer || '').toLowerCase().trim();
      const isOwner = cleanTargetEmail === ADMIN_EMAIL.toLowerCase() || (cleanTargetId && cleanTargetId.toLowerCase() === 'usr-admin-owner') || rawTarget === 'dhanush';

      if (cleanTargetEmail && cEmail && cEmail === cleanTargetEmail) return true;
      if (cleanTargetId && cId && cId === cleanTargetId.toLowerCase()) return true;
      if (cleanTargetUsername && cUser && cUser === cleanTargetUsername) return true;
      if (isOwner && (cEmail === ADMIN_EMAIL.toLowerCase() || cName === 'dhanush' || cId === 'usr-admin-owner')) return true;
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
      saveStore(store);
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

    saveStore(store);

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
      saveStore(store);
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
    const auth = getAuthenticatedSession(req, store);
    if (!auth) {
      sendJson(res, 401, { error: 'Please sign in to submit a cover.' });
      return;
    }
    const body = await readJsonBody(req);
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
      designer: sanitizeText(body.designer || auth.user.name, 60),
      desc: sanitizeText(body.desc || '', 500),
      image: cleanImage,
      isCommunity: true,
      submittedById: auth.user.id || '',
      submittedByName: auth.user.name || '',
      submittedByEmail: auth.user.email || '',
      submittedByUsername: auth.user.username || '',
      createdAt: new Date().toISOString()
    };
    if (!Array.isArray(store.communityCovers)) store.communityCovers = [];
    if (!Array.isArray(store.deletedCoverIds)) store.deletedCoverIds = [];
    // If re-creating or un-tombstoning
    store.deletedCoverIds = store.deletedCoverIds.filter((id) => id !== cover.id);
    store.communityCovers = store.communityCovers.filter((c) => c.id !== cover.id);
    store.communityCovers.unshift(cover);
    saveStore(store);
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
        saveStore(store);
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
    saveStore(store);
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
