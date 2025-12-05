// public/js/http.js usado para pegar o csrf
async function getCsrfToken() {
  if (window.__csrfToken) return window.__csrfToken;
  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  const data = await res.json();
  window.__csrfToken = data.csrfToken;
  return window.__csrfToken;
}

async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (needsCsrf) {
    const token = await getCsrfToken();
    headers.set('CSRF-Token', token);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });
}
