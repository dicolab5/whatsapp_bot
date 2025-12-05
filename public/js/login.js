// public/js/login.js
console.log('🚀 LOGIN SCRIPT CARREGADO');

  // Aguarda DOM + delay para garantir
  window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded disparado');
    
    setTimeout(() => {
      console.log('⏰ CHECKING URL após 100ms...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const is2FA = urlParams.get('2fa');
      
      console.log('🔍 URL ATUAL:', window.location.href);
      console.log('🔍 URL PARAMS:', { error, is2FA, fullSearch: window.location.search });

      // FORÇA MOSTRAR 2FA se detectar o parâmetro
      if (is2FA === 'required') {
        console.log('✅ FORÇANDO 2FA FORM!');
        const loginForm = document.getElementById('loginForm');
        const twoFactorForm = document.getElementById('twoFactorForm');
        
        console.log('  → loginForm existe?', !!loginForm);
        console.log('  → twoFactorForm existe?', !!twoFactorForm);
        
        if (loginForm) loginForm.style.display = 'none';
        if (twoFactorForm) twoFactorForm.style.display = 'block';
      }

      // Erros
      if (error) {
        const msg = document.getElementById('errorMessage');
        if (msg) {
          msg.style.display = 'block';
          msg.className = 'alert alert-danger mt-3';
          msg.innerHTML = error === 'invalid' ? 'Credenciais inválidas' :
                          error === 'invalid_token' ? 'Código 2FA inválido' :
                          error === 'expired' ? 'Assinatura expirada. <a href="/planos">Renovar plano</a>' :
                          'Erro no servidor';
        }
      }
    }, 100);
  });

  // DEBUG ADICIONAL - executa sempre
  console.log('🔍 URLSearchParams test:', new URLSearchParams(window.location.search).get('2fa'));