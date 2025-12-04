async function loadCsrfToken() {
    try {
      const res = await fetch('/csrf-token');
      const data = await res.json();
      const input = document.getElementById('csrfToken');
      if (input && data.csrfToken) {
        input.value = data.csrfToken;
      }
    } catch (e) {
      console.error('Erro ao carregar CSRF token', e);
    }
  }
  document.addEventListener('DOMContentLoaded', loadCsrfToken);