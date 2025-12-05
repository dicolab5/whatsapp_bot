// public/js/csrf.js
async function getCsrfToken() {
  if (window.__csrfToken) return window.__csrfToken;

  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  const data = await res.json();
  window.__csrfToken = data.csrfToken;
  return window.__csrfToken;
}

async function csrfFetch(url, options = {}) {
  const token = await getCsrfToken();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  headers.set('CSRF-Token', token); // header que o csurf aceita

  return fetch(url, {
    ...options,
    headers
  });
}
