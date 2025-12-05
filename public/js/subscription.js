// public/js/subscription.js
document.addEventListener('DOMContentLoaded', () => {
  const messageEl = document.getElementById('subscriptionMessage');
  const billingInput = document.getElementById('billingCycle');
  const billingToggle = document.getElementById('billingToggle');

  const plans = {
    starter: { monthly: 199, annual: 199 * 12 },
    professional: { monthly: 499, annual: 499 * 12 },
    enterprise: { monthly: 899, annual: 899 * 12 }
  };

  let csrfToken = null;

  // Carregar token CSRF do backend
  async function loadCsrfToken() {
    try {
      const res = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin'
      });

      const data = await res.json();
      csrfToken = data.csrfToken;

      if (!csrfToken) {
        console.error('CSRF token não recebido do servidor.');
      } else {
        console.log('🔑 CSRF carregado (subscription):', csrfToken);
      }
    } catch (err) {
      console.error('Erro ao carregar CSRF', err);
    }
  }

  function formatPrice(v) {
    return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  }

  function updatePrices() {
    const cycle = billingInput.value;
    document.querySelectorAll('.plan-card').forEach(card => {
      const plan = card.getAttribute('data-plan');
      const priceEl = card.querySelector('.plan-price');
      const periodEl = card.querySelector('.plan-price-period');
      const value = plans[plan][cycle];
      priceEl.textContent = formatPrice(value);
      periodEl.textContent = cycle === 'monthly' ? '/mês' : '/ano';
    });
  }

  billingToggle.addEventListener('change', () => {
    billingInput.value = billingToggle.checked ? 'annual' : 'monthly';
    updatePrices();
  });

  async function createCheckout(plan) {
    // Garante que o token foi carregado
    if (!csrfToken) {
      await loadCsrfToken();
    }

    if (!csrfToken) {
      alert('Erro: CSRF token não carregado.');
      return;
    }

    messageEl.textContent = 'Redirecionando para PagSeguro...';

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          plan,
          billing_cycle: billingInput.value
        })
      });

      const data = await res.json();

      if (!res.ok) {
        messageEl.textContent = data.error || 'Erro ao iniciar assinatura.';
        return;
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        messageEl.textContent = 'URL de pagamento não recebida.';
      }
    } catch (err) {
      console.error(err);
      messageEl.textContent = 'Erro na comunicação com o servidor.';
    }
  }

  document.querySelectorAll('.plan-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.getAttribute('data-plan');
      createCheckout(plan);
    });
  });

  // Inicializa: carrega CSRF e ajusta preços
  loadCsrfToken().then(updatePrices);
});


// // public/js/subscription.js 
// document.addEventListener('DOMContentLoaded', () => {
//   const messageEl = document.getElementById('subscriptionMessage');
//   const billingInput = document.getElementById('billingCycle');
//   const billingToggle = document.getElementById('billingToggle');

//   const plans = {
//     starter: { monthly: 199, annual: 199 * 12 },
//     professional: { monthly: 499, annual: 499 * 12 },
//     enterprise: { monthly: 899, annual: 899 * 12 },
//   };

//   let csrfToken = null;

//   // Se cookie for httpOnly, o servidor deve enviar o token no JSON
//   async function loadCsrfToken() {
//     try {
//       const res = await fetch('/api/csrf-token', {
//         method: 'GET',
//         credentials: 'include'
//       });

//       const data = await res.json();

//       csrfToken = data.csrfToken; // 👈 agora realmente guarda o token

//       if (!csrfToken) {
//         console.error('CSRF token não recebido do servidor.');
//       } else {
//         console.log('CSRF carregado:', csrfToken);
//       }
//     } catch (err) {
//       console.error('Erro ao carregar CSRF', err);
//     }
//   }

//   function formatPrice(v) {
//     return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
//   }

//   function updatePrices() {
//     const cycle = billingInput.value;
//     document.querySelectorAll('.plan-card').forEach(card => {
//       const plan = card.getAttribute('data-plan');
//       const priceEl = card.querySelector('.plan-price');
//       const periodEl = card.querySelector('.plan-price-period');
//       const value = plans[plan][cycle];
//       priceEl.textContent = formatPrice(value);
//       periodEl.textContent = cycle === 'monthly' ? '/mês' : '/ano';
//     });
//   }

//   billingToggle.addEventListener('change', () => {
//     billingInput.value = billingToggle.checked ? 'annual' : 'monthly';
//     updatePrices();
//   });

//   async function createCheckout(plan) {
//     if (!csrfToken) {
//       console.warn('CSRF ainda não carregado, aguardando...');
//       await loadCsrfToken();
//     }

//     if (!csrfToken) {
//       alert('Erro: CSRF token não carregado.');
//       return;
//     }

//     messageEl.textContent = 'Redirecionando para PagSeguro...';

//     try {
//       const res = await fetch('/api/subscriptions/checkout', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'CSRF-Token': csrfToken // 👈 agora correto
//         },
//         credentials: 'include',
//         body: JSON.stringify({
//           plan,
//           billing_cycle: billingInput.value
//         })
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         messageEl.textContent = data.error || 'Erro ao iniciar assinatura.';
//         return;
//       }

//       if (data.paymentUrl) {
//         window.location.href = data.paymentUrl;
//       } else {
//         messageEl.textContent = 'URL de pagamento não recebida.';
//       }
//     } catch (err) {
//       console.error(err);
//       messageEl.textContent = 'Erro na comunicação com o servidor.';
//     }
//   }

//   document.querySelectorAll('.plan-button').forEach(btn => {
//     btn.addEventListener('click', () => {
//       const plan = btn.getAttribute('data-plan');
//       createCheckout(plan);
//     });
//   });

//   // Aguarda CSRF antes de permitir uso
//   loadCsrfToken().then(() => {
//     updatePrices();
//   });
// });