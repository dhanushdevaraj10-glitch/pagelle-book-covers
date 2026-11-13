const SESSION_KEY = 'best_book_covers_session_v1';

function getNextDestination() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next || next.startsWith('http://') || next.startsWith('https://') || next.includes('login.html')) {
    return 'index.html';
  }
  return next;
}

// If already signed in, enter the site immediately
try {
  const existing = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (existing && existing.email && existing.token) {
    window.location.replace(getNextDestination());
  }
} catch {
  // Ignore invalid session data
}

let mode = 'signin';

const tabEls = document.querySelectorAll('[data-auth-mode]');
const headingEl = document.getElementById('loginHeading');
const subheadingEl = document.getElementById('loginSubheading');
const nameFieldWrapEl = document.getElementById('nameFieldWrap');
const nameInputEl = document.getElementById('authName');
const emailInputEl = document.getElementById('authEmail');
const passwordInputEl = document.getElementById('authPassword');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const authErrorEl = document.getElementById('authError');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authFormEl = document.getElementById('authForm');

function setMode(nextMode) {
  mode = nextMode;
  tabEls.forEach((t) => t.classList.toggle('active', t.dataset.authMode === nextMode));
  authErrorEl.classList.add('hidden');

  if (nextMode === 'signup') {
    headingEl.textContent = 'Create your account';
    subheadingEl.textContent = 'Sign up once to access the full book cover gallery and submit covers.';
    nameFieldWrapEl.classList.remove('hidden');
    authSubmitBtn.textContent = 'Create Account & Enter';
    passwordInputEl.setAttribute('autocomplete', 'new-password');
  } else {
    headingEl.textContent = 'Sign in to continue';
    subheadingEl.textContent = 'Enter your details to explore curated book covers and add your own.';
    nameFieldWrapEl.classList.add('hidden');
    authSubmitBtn.textContent = 'Sign In';
    passwordInputEl.setAttribute('autocomplete', 'current-password');
  }
}

function showError(msg) {
  authErrorEl.textContent = msg;
  authErrorEl.classList.remove('hidden');
}

tabEls.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.authMode));
});

togglePasswordBtn.addEventListener('click', () => {
  const isHidden = passwordInputEl.type === 'password';
  passwordInputEl.type = isHidden ? 'text' : 'password';
  togglePasswordBtn.textContent = isHidden ? 'Hide' : 'Show';
});

authFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorEl.classList.add('hidden');

  const email = emailInputEl.value.trim();
  const password = passwordInputEl.value;
  const name = nameInputEl.value.trim();

  if (!email || !email.includes('@') || !email.includes('.')) {
    showError('Please enter a valid email address.');
    emailInputEl.focus();
    return;
  }

  if (!password || password.length < 4) {
    showError('Password must be at least 4 characters.');
    passwordInputEl.focus();
    return;
  }

  if (mode === 'signup' && !name) {
    showError('Please enter your name.');
    nameInputEl.focus();
    return;
  }

  authSubmitBtn.disabled = true;
  const originalLabel = authSubmitBtn.textContent;
  authSubmitBtn.textContent = 'Please wait...';

  try {
    const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const payload = mode === 'signup' ? { name, email, password } : { email, password };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok || !data.session) {
      showError(data.error || 'Authentication failed.');
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = originalLabel;
      return;
    }

    const session = data.session;
    const isOwnerEmail = session.email && session.email.toLowerCase() === 'dhanushdevaraj10@gmail.com';

    // Ensure avatar is never empty or lost across logins
    if (!session.avatar || session.avatar === 'assets/default-avatar.png') {
      try {
        const storedAccounts = JSON.parse(localStorage.getItem('best_book_covers_accounts_v1') || '[]');
        const match = storedAccounts.find((a) => a.email && a.email.toLowerCase() === session.email.toLowerCase());
        if (match && match.avatar && match.avatar !== 'assets/default-avatar.png') {
          session.avatar = match.avatar;
        }
      } catch {}
    }
    if (!session.avatar || (isOwnerEmail && session.avatar.includes('default-avatar'))) {
      session.avatar = isOwnerEmail ? 'assets/avatar-dhanush.jpg' : 'assets/default-avatar.png';
    }

    // Keep stored accounts synchronized with the authenticated session
    try {
      const ACCOUNTS_KEY = 'best_book_covers_accounts_v1';
      const storedAccounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      const idx = storedAccounts.findIndex((a) => a.email && a.email.toLowerCase() === session.email.toLowerCase());
      if (idx >= 0) {
        storedAccounts[idx].name = session.name || storedAccounts[idx].name;
        storedAccounts[idx].avatar = session.avatar || storedAccounts[idx].avatar;
        storedAccounts[idx].bio = session.bio || storedAccounts[idx].bio;
        storedAccounts[idx].accountType = session.accountType || storedAccounts[idx].accountType || 'Personal';
      } else {
        storedAccounts.unshift({
          id: session.userId || `usr-${Date.now()}`,
          name: session.name || session.email.split('@')[0],
          email: session.email,
          role: session.role || (isOwnerEmail ? 'admin' : 'user'),
          accountType: session.accountType || 'Personal',
          avatar: session.avatar
        });
      }
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(storedAccounts));
    } catch {}

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.location.replace(getNextDestination());
  } catch {
    showError('Unable to reach server. Make sure the server is running.');
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = originalLabel;
  }
});
