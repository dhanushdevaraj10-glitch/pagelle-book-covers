// PAGELLE BOOK COVERS - Luxury Loading Screen & Seamless Transitions
(function initPagelleLoader() {
  if (typeof window === 'undefined') return;

  const bar = document.getElementById('pagelleLoaderFill');
  const screen = document.getElementById('pagelleLoader');
  const topProgress = document.getElementById('pagelleTopProgress');

  // Progressive loading simulation
  let progress = 18;
  if (bar) bar.style.width = progress + '%';

  const timer = setInterval(() => {
    if (progress < 85) {
      progress += Math.random() * 16 + 6;
      if (progress > 85) progress = 85;
      if (bar) bar.style.width = progress + '%';
    }
  }, 80);

  function dismiss() {
    clearInterval(timer);
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (screen) {
        screen.classList.add('pagelle-loader-fade-out');
        setTimeout(() => {
          screen.style.display = 'none';
        }, 420);
      }
    }, 140);
  }

  // Dismiss on DOMContentLoaded or full window load
  if (document.readyState === 'complete') {
    dismiss();
  } else {
    window.addEventListener('load', dismiss);
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(dismiss, 160);
    });
  }

  // Safety fallback timeout: never block longer than 1100ms
  setTimeout(dismiss, 1100);

  // Link click handler for instant top progress bar & seamless SPA exit
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || !a.href) return;
    if (a.target && a.target !== '_self') return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    try {
      const targetUrl = new URL(a.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search && targetUrl.hash) return;
      if (a.getAttribute('download') !== null) return;

      // Start sleek top progress bar
      if (topProgress) {
        topProgress.classList.remove('active');
        void topProgress.offsetWidth; // force reflow
        topProgress.classList.add('active');
      }

      // Smooth exit transition
      document.body.classList.add('page-transitioning-out');
    } catch {}
  }, { passive: true });
})();
