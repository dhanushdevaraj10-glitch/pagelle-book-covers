(function enforceAuthGate() {
  var SESSION_KEY = 'best_book_covers_session_v1';
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    var session = raw ? JSON.parse(raw) : null;
    if (session && session.email && session.token) {
      if (window.REQUIRE_ADMIN) {
        var isOwner = session.email && session.email.toLowerCase() === 'dhanushdevaraj10@gmail.com';
        var isAdmin = session.role === 'admin' || isOwner;
        if (!isAdmin) {
          document.documentElement.style.display = 'none';
          window.location.replace('index.html');
          return;
        }
      }
      return;
    }
  } catch (e) {
    // Fall through to redirect
  }

  // Allow unauthenticated viewers to view public community member profiles
  var search = window.location.search || '';
  if (search && (search.includes('user=') || search.includes('id=') || search.includes('email='))) {
    return;
  }

  document.documentElement.style.display = 'none';
  var target = window.location.pathname + window.location.search;
  window.location.replace('login.html?next=' + encodeURIComponent(target));
})();
