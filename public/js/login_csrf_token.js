// public/js/login_csrf_token.js
async function loadCsrfToken() {
  try {
    const res = await fetch('/api/csrf-token', {
      credentials: 'same-origin'
    });
    const data = await res.json();
    console.log('🔑 TOKEN RECEBIDO NO FRONT:', data);

    const input = document.getElementById('csrfToken');
    if (input && data.csrfToken) {
      input.value = data.csrfToken;
      console.log('🔑 HIDDEN _csrf ATUALIZADO:', input.value);
    }
  } catch (e) {
    console.error('Erro ao carregar CSRF token', e);
  }
}
document.addEventListener('DOMContentLoaded', loadCsrfToken);
