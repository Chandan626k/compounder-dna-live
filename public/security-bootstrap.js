(() => {
  const PUBLIC_API = new Set(['/api/health', '/api/data/health', '/api/auth/config']);
  const originalFetch = window.fetch.bind(window);
  let clerk = null;

  const overlay = document.createElement('div');
  overlay.id = 'stocksamjho-auth-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.72);display:grid;place-items:center;padding:20px;font-family:system-ui,sans-serif;';
  overlay.innerHTML = '<div style="width:min(420px,100%);background:#fff;border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25)"><div style="font-weight:800;font-size:20px;margin-bottom:6px">StockSamjho Sign in</div><div style="font-size:12px;color:#64748b;margin-bottom:14px">Authentication is required to access live research APIs.</div><div id="stocksamjho-signin"></div></div>';

  const showAuth = () => {
    if (!document.body.contains(overlay)) document.body.appendChild(overlay);
    const target = document.getElementById('stocksamjho-signin');
    if (clerk && target && !target.dataset.mounted) {
      clerk.mountSignIn(target, { routing: 'hash' });
      target.dataset.mounted = 'true';
    }
  };
  const hideAuth = () => overlay.remove();

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load authentication SDK'));
    document.head.appendChild(script);
  });

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/') || PUBLIC_API.has(url.pathname)) {
      return originalFetch(input, init);
    }
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (clerk?.session) {
      const token = await clerk.session.getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await originalFetch(input, { ...init, headers });
    if (response.status === 401) showAuth();
    return response;
  };

  async function boot() {
    try {
      const configResponse = await originalFetch('/api/auth/config', { cache: 'no-store' });
      if (!configResponse.ok) throw new Error('Authentication configuration unavailable');
      const { publishableKey } = await configResponse.json();
      if (!publishableKey) throw new Error('Missing Clerk publishable key');
      const clerkDomain = atob(publishableKey.split('_')[2]).slice(0, -1);
      await loadScript(`https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`);
      await loadScript(`https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`);
      clerk = new window.Clerk(publishableKey);
      await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
      window.StockSamjhoAuth = clerk;
      if (clerk.isSignedIn) {
        hideAuth();
        const top = document.querySelector('.topin');
        if (top && !document.getElementById('stocksamjho-user-button')) {
          const holder = document.createElement('div');
          holder.id = 'stocksamjho-user-button';
          holder.style.marginLeft = '10px';
          top.appendChild(holder);
          clerk.mountUserButton(holder);
        }
      } else {
        showAuth();
      }
    } catch (error) {
      console.error('[security-bootstrap]', error);
      overlay.querySelector('div > div:nth-child(2)').textContent = 'Authentication could not be initialized. Please try again later.';
      document.body.appendChild(overlay);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
