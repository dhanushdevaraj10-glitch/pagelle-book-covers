const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const ADMIN_EMAIL = 'dhanushdevaraj10@gmail.com';
const OWNER_EMAIL = ADMIN_EMAIL;
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_PASSWORD || 'Dhanush@10';

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
      sessions: {}
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
        avatar: 'assets/avatar-dhanush.jpg',
        accountType: 'Personal',
        isOwner: true,
        active: true,
        loginCount: 0,
        createdAt: new Date().toISOString(),
        lastLoginAt: null
      });
    }
    return parsed;
  } catch {
    return { users: [], loginLogs: [], communityCovers: [], sessions: {} };
  }
}

function saveStore(store) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
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

function getAuthenticatedSession(req, store) {
  const token = req.headers['x-auth-token'];
  if (!token || typeof token !== 'string') return null;
  const session = store.sessions[token];
  if (!session) return null;
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
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    bio: u.bio !== undefined ? u.bio : (isDhanush ? 'Thick Thighs pretty eyes' : ''),
    avatar: u.avatar || (isDhanush ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png'),
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

  if (urlPath === '/api/auth/login' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const user = store.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordLoginEvent(store, req, {
        user: user || { id: null, name: email || 'Unknown', email: email || '—', role: 'guest' },
        action: 'Sign In',
        status: 'Failed'
      });
      saveStore(store);
      sendJson(res, 401, { error: 'Invalid email or password.' });
      return;
    }

    if (user.active === false) {
      recordLoginEvent(store, req, { user, action: 'Sign In', status: 'Blocked' });
      saveStore(store);
      sendJson(res, 403, { error: 'This account has been disabled by the administrator.' });
      return;
    }

    const now = new Date().toISOString();
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = now;

    const token = crypto.randomBytes(24).toString('hex');
    store.sessions[token] = { userId: user.id, createdAt: now };

    recordLoginEvent(store, req, { user, action: 'Sign In', status: 'Success' });
    saveStore(store);

    const isDhanush = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const userAvatar = user.avatar || (isDhanush ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png');
    const userBio = user.bio !== undefined ? user.bio : (isDhanush ? 'Thick Thighs pretty eyes' : '');
    const userAccountType = user.accountType || 'Personal';

    sendJson(res, 200, {
      session: {
        token,
        userId: user.id,
        name: user.name,
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
    const body = await readJsonBody(req);
    const name = String(body.name || '').trim();
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
        sendJson(res, 200, {
          session: {
            token,
            userId: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            avatar: existingUser.avatar || (isDhanush ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png'),
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
    const newUser = {
      id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      email,
      passwordHash: hashPassword(password),
      role: isOwner ? 'admin' : 'user',
      isOwner,
      active: true,
      avatar: isOwner ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png',
      bio: isOwner ? 'Thick Thighs pretty eyes' : '',
      loginCount: 1,
      createdAt: now,
      lastLoginAt: now
    };

    store.users.push(newUser);
    const token = crypto.randomBytes(24).toString('hex');
    store.sessions[token] = { userId: newUser.id, createdAt: now };

    recordLoginEvent(store, req, { user: newUser, action: 'Sign Up', status: 'Success' });
    saveStore(store);

    sendJson(res, 201, {
      session: {
        token,
        userId: newUser.id,
        name: newUser.name,
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

    if (!targetUser && body.email) {
      targetUser = store.users.find((u) => u.email.toLowerCase() === String(body.email).toLowerCase());
    }
    const headerEmail = req.headers['x-user-email'];
    if (!targetUser && headerEmail) {
      targetUser = store.users.find((u) => u.email.toLowerCase() === String(headerEmail).toLowerCase());
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

    saveStore(store);
    sendJson(res, 200, {
      ok: true,
      user: sanitizeUser(targetUser)
    });
    return;
  }

  if (urlPath === '/api/community/members' && req.method === 'GET') {
    const members = (store.users || []).filter((u) => u.active !== false).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      accountType: u.accountType || 'Personal',
      avatar: u.avatar || 'assets/default-avatar.png',
      bio: u.bio || '',
      createdAt: u.createdAt
    }));
    sendJson(res, 200, { members });
    return;
  }

  if (urlPath === '/api/covers' && req.method === 'GET') {
    sendJson(res, 200, { covers: store.communityCovers });
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
    const cover = {
      id: body.id || `user-${Date.now()}`,
      title: String(body.title).slice(0, 80),
      author: String(body.author).slice(0, 60),
      genre: String(body.genre || 'Fiction'),
      year: String(body.year || new Date().getFullYear()),
      designer: String(body.designer || auth.user.name),
      desc: String(body.desc || ''),
      image: String(body.image),
      isCommunity: true,
      submittedByName: auth.user.name,
      submittedByEmail: auth.user.email,
      createdAt: new Date().toISOString()
    };
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
    const target = store.communityCovers.find((c) => c.id === body.coverId);
    if (!target) {
      sendJson(res, 404, { error: 'Cover not found.' });
      return;
    }
    const isAdmin = auth.user.role === 'admin';
    const isCreator = target.submittedByEmail && target.submittedByEmail.toLowerCase() === auth.user.email.toLowerCase();
    if (!isAdmin && !isCreator) {
      sendJson(res, 403, { error: 'Only administrators or the cover creator can delete this cover.' });
      return;
    }
    store.communityCovers = store.communityCovers.filter((c) => c.id !== target.id);
    saveStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: 'API endpoint not found.' });
}

async function requestHandler(req, res) {
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
