document.addEventListener('DOMContentLoaded', () => {
  const messageEl = document.getElementById('subscriptionMessage');
  const billingInput = document.getElementById('billingCycle');
  const billingToggle = document.getElementById('billingToggle');

  const plans = {
    starter: { monthly: 1, annual: 1 * 12 },
    professional: { monthly: 499, annual: 499 * 12 },
    enterprise: { monthly: 899, annual: 899 * 12 },
  };

  let csrfToken = null;
  let userBilling = null;   // { cpf, fullName, email, ... }
  let currentPlan = null;

  async function loadCsrfToken() {
    try {
      const res = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin',
      });
      const data = await res.json();
      csrfToken = data.csrfToken;
      console.log('🔑 CSRF carregado (subscription):', csrfToken);
    } catch (err) {
      console.error('Erro ao carregar CSRF', err);
    }
  }

  async function loadUserBilling() {
    try {
      const res = await fetch('/api/users/me/billing', {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!res.ok) {
        console.warn('Não foi possível carregar billing do usuário');
        return;
      }

      userBilling = await res.json();
      console.log('💳 Billing do usuário:', userBilling);
    } catch (err) {
      console.error('Erro ao carregar billing do usuário', err);
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

  function saveCheckoutPrefill() {
    // sessionStorage só dura nesta aba/sessão [web:296]
    sessionStorage.setItem('checkout_fullName', userBilling?.fullName || userBilling?.name || '');
    sessionStorage.setItem('checkout_email', userBilling?.email || '');
    sessionStorage.setItem('checkout_cpf', userBilling?.cpf || '');
  }

  async function createCheckout(plan) {
    const cycle = billingInput.value;

    // passa dados para o checkout sem expor na URL
    saveCheckoutPrefill();

    window.location.href = `/checkout.html?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}`;
  }

  function openCpfModal() {
    const modal = document.getElementById('cpfModal');
    const infoArea = document.getElementById('cpfInfoArea');
    const agree = document.getElementById('cpfAgreeCheckbox');
    const btnContinue = document.getElementById('cpfContinueButton');
    const btnCancel = document.getElementById('cpfCancelButton');

    if (!modal || !infoArea || !agree || !btnContinue || !btnCancel) {
      console.error('Elementos do modal de CPF não encontrados no DOM.');
      if (currentPlan) createCheckout(currentPlan);
      return;
    }

    agree.checked = false;
    btnContinue.disabled = true;

    if (userBilling && userBilling.cpf) {
      const onlyDigits = String(userBilling.cpf).replace(/\D/g, '');
      const cpfMask = onlyDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

      const displayName = userBilling.fullName || userBilling.name || '';
      const displayEmail = userBilling.email || '';

      infoArea.innerHTML = `
        <p>Dados cadastrados na sua conta:</p>
        ${displayName ? `<p>Nome: <strong>${displayName}</strong></p>` : ''}
        ${displayEmail ? `<p>E-mail: <strong>${displayEmail}</strong></p>` : ''}
        <p>CPF: <strong>${cpfMask}</strong></p>
        <p>
          É obrigatório usar <strong>este mesmo CPF</strong> na página de pagamento do PagBank.
          Caso utilize outro CPF, sua assinatura pode não ser liberada automaticamente.
        </p>
      `;
    } else {
      infoArea.innerHTML = `
        <p>Você ainda não cadastrou seu CPF.</p>
        <p>
          Para que a assinatura seja liberada automaticamente, é necessário
          cadastrar seu CPF na página de configurações antes de realizar o pagamento.
        </p>
        <div style="margin-top:15px;">
          <a href="/config.html" class="btn-primary">Ir para configurações</a>
        </div>
      `;
    }

    modal.style.display = 'block';

    agree.onchange = () => {
      const hasCpf = !!(userBilling && userBilling.cpf);
      btnContinue.disabled = !hasCpf || !agree.checked;
    };

    btnCancel.onclick = () => {
      modal.style.display = 'none';
      messageEl.textContent = '';
    };

    btnContinue.onclick = () => {
      if (btnContinue.disabled) return;
      modal.style.display = 'none';
      if (currentPlan) createCheckout(currentPlan);
    };
  }

  document.querySelectorAll('.plan-button').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPlan = btn.getAttribute('data-plan');
      openCpfModal();
    });
  });

  loadCsrfToken().then(updatePrices);
  loadUserBilling();
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
//   let userBilling = null;   // { cpf: '12345678901', ... }
//   let currentPlan = null;   // plano selecionado no modal

//   async function loadCsrfToken() {
//     try {
//       const res = await fetch('/api/csrf-token', {
//         method: 'GET',
//         credentials: 'same-origin',
//       });

//       const data = await res.json();
//       csrfToken = data.csrfToken;

//       if (!csrfToken) {
//         console.error('CSRF token não recebido do servidor.');
//       } else {
//         console.log('🔑 CSRF carregado (subscription):', csrfToken);
//       }
//     } catch (err) {
//       console.error('Erro ao carregar CSRF', err);
//     }
//   }

//   // carrega dados de cobrança do usuário (inclui cpf)
//   async function loadUserBilling() {
//   try {
//     const res = await fetch('/api/users/me/billing', {
//       method: 'GET',
//       credentials: 'same-origin',
//     });

//     if (!res.ok) {
//       console.warn('Não foi possível carregar billing do usuário');
//       return;
//     }

//     userBilling = await res.json();
//     console.log('💳 Billing do usuário:', userBilling);
//   } catch (err) {
//     console.error('Erro ao carregar billing do usuário', err);
//   }
// }

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
//     const cycle = billingInput.value; // monthly / annual

//     // salva para a próxima página
//     if (userBilling) {
//       sessionStorage.setItem("checkout_fullName", userBilling.fullName || "");
//       sessionStorage.setItem("checkout_email", userBilling.email || "");
//       sessionStorage.setItem("checkout_cpf", userBilling.cpf || "");
//     }

//     window.location.href = `/checkout.html?plan=${plan}&cycle=${cycle}`;
//   }

//   // ----- LÓGICA DO MODAL DE CPF -----

//   function openCpfModal() {
//   const modal = document.getElementById('cpfModal');
//   const infoArea = document.getElementById('cpfInfoArea');
//   const agree = document.getElementById('cpfAgreeCheckbox');
//   const btnContinue = document.getElementById('cpfContinueButton');
//   const btnCancel = document.getElementById('cpfCancelButton');

//   if (!modal || !infoArea || !agree || !btnContinue || !btnCancel) {
//     console.error('Elementos do modal de CPF não encontrados no DOM.');
//     if (currentPlan) createCheckout(currentPlan);
//     return;
//   }

//   agree.checked = false;
//   // sempre começa desabilitado
//   btnContinue.disabled = true;

//   if (userBilling && userBilling.cpf) {
//     const onlyDigits = String(userBilling.cpf).replace(/\D/g, '');
//     const cpfMask = onlyDigits.replace(
//       /(\d{3})(\d{3})(\d{3})(\d{2})/,
//       '$1.$2.$3-$4'
//     );

//     infoArea.innerHTML = `
//       <p>CPF cadastrado na sua conta:</p>
//       <p><strong>${cpfMask}</strong></p>
//       <p>
//         É obrigatório usar <strong>este mesmo CPF</strong> na página de pagamento do PagBank.
//         Caso utilize outro CPF, sua assinatura pode não ser liberada automaticamente.
//       </p>
//     `;
//   } else {
//     infoArea.innerHTML = `
//       <p>Você ainda não cadastrou seu CPF.</p>
//       <p>
//         Para que a assinatura seja liberada automaticamente, é necessário
//         cadastrar seu CPF na página de configurações antes de realizar o pagamento.
//       </p>
//       <div style="margin-top:15px;">
//         <a href="/config.html" class="btn-primary">Ir para configurações</a>
//       </div>
//     `;
//   }

//   modal.style.display = 'block';

//   agree.onchange = () => {
//     // só habilita se tiver CPF cadastrado E o checkbox marcado
//     const hasCpf = !!(userBilling && userBilling.cpf);
//     btnContinue.disabled = !hasCpf || !agree.checked;
//   };

//   btnCancel.onclick = () => {
//     modal.style.display = 'none';
//     messageEl.textContent = '';
//   };

//   btnContinue.onclick = () => {
//     if (btnContinue.disabled) return; // proteção extra
//     modal.style.display = 'none';
//     if (currentPlan) {
//       createCheckout(currentPlan);
//     }
//   };
// }

//   document.querySelectorAll('.plan-button').forEach(btn => {
//     btn.addEventListener('click', () => {
//       currentPlan = btn.getAttribute('data-plan');
//       // sempre abre o modal, que decide se redireciona para config.html ou segue
//       openCpfModal();
//     });
//   });

//   // Inicialização
//   loadCsrfToken().then(updatePrices);
//   loadUserBilling();
// });


// // // public/js/subscription.js
// // document.addEventListener('DOMContentLoaded', () => {
// //   const messageEl = document.getElementById('subscriptionMessage');
// //   const billingInput = document.getElementById('billingCycle');
// //   const billingToggle = document.getElementById('billingToggle');

// //   const plans = {
// //     starter: { monthly: 199, annual: 199 * 12 },
// //     professional: { monthly: 499, annual: 499 * 12 },
// //     enterprise: { monthly: 899, annual: 899 * 12 },
// //   };

// //   let csrfToken = null;

// //   async function loadCsrfToken() {
// //     try {
// //       const res = await fetch('/api/csrf-token', {
// //         method: 'GET',
// //         credentials: 'same-origin',
// //       });

// //       const data = await res.json();
// //       csrfToken = data.csrfToken;

// //       if (!csrfToken) {
// //         console.error('CSRF token não recebido do servidor.');
// //       } else {
// //         console.log('🔑 CSRF carregado (subscription):', csrfToken);
// //       }
// //     } catch (err) {
// //       console.error('Erro ao carregar CSRF', err);
// //     }
// //   }

// //   function formatPrice(v) {
// //     return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
// //   }

// //   function updatePrices() {
// //     const cycle = billingInput.value;
// //     document.querySelectorAll('.plan-card').forEach(card => {
// //       const plan = card.getAttribute('data-plan');
// //       const priceEl = card.querySelector('.plan-price');
// //       const periodEl = card.querySelector('.plan-price-period');
// //       const value = plans[plan][cycle];
// //       priceEl.textContent = formatPrice(value);
// //       periodEl.textContent = cycle === 'monthly' ? '/mês' : '/ano';
// //     });
// //   }

// //   billingToggle.addEventListener('change', () => {
// //     billingInput.value = billingToggle.checked ? 'annual' : 'monthly';
// //     updatePrices();
// //   });

// //   async function createCheckout(plan) {
// //     if (!csrfToken) {
// //       await loadCsrfToken();
// //     }
// //     if (!csrfToken) {
// //       alert('Erro: CSRF token não carregado.');
// //       return;
// //     }

// //     messageEl.textContent = 'Redirecionando para PagSeguro...';

// //     try {
// //       const res = await fetch('/api/subscriptions/checkout', {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //           'CSRF-Token': csrfToken,
// //         },
// //         credentials: 'same-origin',
// //         body: JSON.stringify({
// //           plan,
// //           billing_cycle: billingInput.value,
// //         }),
// //       });

// //       const data = await res.json();

// //       if (!res.ok) {
// //         messageEl.textContent = data.error || 'Erro ao iniciar assinatura.';
// //         return;
// //       }

// //       if (data.paymentUrl) {
// //         window.location.href = data.paymentUrl;
// //       } else {
// //         messageEl.textContent = 'URL de pagamento não recebida.';
// //       }
// //     } catch (err) {
// //       console.error(err);
// //       messageEl.textContent = 'Erro na comunicação com o servidor.';
// //     }
// //   }

// //   document.querySelectorAll('.plan-button').forEach(btn => {
// //     btn.addEventListener('click', () => {
// //       const plan = btn.getAttribute('data-plan');
// //       createCheckout(plan);
// //     });
// //   });

// //   loadCsrfToken().then(updatePrices);
// // });


// // // public/js/subscription.js 
// // document.addEventListener('DOMContentLoaded', () => {
// //   const messageEl = document.getElementById('subscriptionMessage');
// //   const billingInput = document.getElementById('billingCycle');
// //   const billingToggle = document.getElementById('billingToggle');

// //   const plans = {
// //     starter: { monthly: 199, annual: 199 * 12 },
// //     professional: { monthly: 499, annual: 499 * 12 },
// //     enterprise: { monthly: 899, annual: 899 * 12 }
// //   };

// //   let csrfToken = null;

// //   // Carregar token CSRF do backend
// //   async function loadCsrfToken() {
// //     try {
// //       const res = await fetch('/api/csrf-token', {
// //         method: 'GET',
// //         credentials: 'same-origin'
// //       });

// //       const data = await res.json();
// //       csrfToken = data.csrfToken;

// //       if (!csrfToken) {
// //         console.error('CSRF token não recebido do servidor.');
// //       } else {
// //         console.log('🔑 CSRF carregado (subscription):', csrfToken);
// //       }
// //     } catch (err) {
// //       console.error('Erro ao carregar CSRF', err);
// //     }
// //   }

// //   function formatPrice(v) {
// //     return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
// //   }

// //   function updatePrices() {
// //     const cycle = billingInput.value;
// //     document.querySelectorAll('.plan-card').forEach(card => {
// //       const plan = card.getAttribute('data-plan');
// //       const priceEl = card.querySelector('.plan-price');
// //       const periodEl = card.querySelector('.plan-price-period');
// //       const value = plans[plan][cycle];
// //       priceEl.textContent = formatPrice(value);
// //       periodEl.textContent = cycle === 'monthly' ? '/mês' : '/ano';
// //     });
// //   }

// //   billingToggle.addEventListener('change', () => {
// //     billingInput.value = billingToggle.checked ? 'annual' : 'monthly';
// //     updatePrices();
// //   });

// //   async function createCheckout(plan) {
// //     // Garante que o token foi carregado
// //     if (!csrfToken) {
// //       await loadCsrfToken();
// //     }

// //     if (!csrfToken) {
// //       alert('Erro: CSRF token não carregado.');
// //       return;
// //     }

// //     messageEl.textContent = 'Redirecionando para PagSeguro...';

// //     try {
// //       const res = await fetch('/api/subscriptions/checkout', {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //           'CSRF-Token': csrfToken
// //         },
// //         credentials: 'same-origin',
// //         body: JSON.stringify({
// //           plan,
// //           billing_cycle: billingInput.value
// //         })
// //       });

// //       const data = await res.json();

// //       if (!res.ok) {
// //         messageEl.textContent = data.error || 'Erro ao iniciar assinatura.';
// //         return;
// //       }

// //       if (data.paymentUrl) {
// //         window.location.href = data.paymentUrl;
// //       } else {
// //         messageEl.textContent = 'URL de pagamento não recebida.';
// //       }
// //     } catch (err) {
// //       console.error(err);
// //       messageEl.textContent = 'Erro na comunicação com o servidor.';
// //     }
// //   }

// //   document.querySelectorAll('.plan-button').forEach(btn => {
// //     btn.addEventListener('click', () => {
// //       const plan = btn.getAttribute('data-plan');
// //       createCheckout(plan);
// //     });
// //   });

// //   // Inicializa: carrega CSRF e ajusta preços
// //   loadCsrfToken().then(updatePrices);
// // });


// // // // public/js/subscription.js 
// // // document.addEventListener('DOMContentLoaded', () => {
// // //   const messageEl = document.getElementById('subscriptionMessage');
// // //   const billingInput = document.getElementById('billingCycle');
// // //   const billingToggle = document.getElementById('billingToggle');

// // //   const plans = {
// // //     starter: { monthly: 199, annual: 199 * 12 },
// // //     professional: { monthly: 499, annual: 499 * 12 },
// // //     enterprise: { monthly: 899, annual: 899 * 12 },
// // //   };

// // //   let csrfToken = null;

// // //   // Se cookie for httpOnly, o servidor deve enviar o token no JSON
// // //   async function loadCsrfToken() {
// // //     try {
// // //       const res = await fetch('/api/csrf-token', {
// // //         method: 'GET',
// // //         credentials: 'include'
// // //       });

// // //       const data = await res.json();

// // //       csrfToken = data.csrfToken; // 👈 agora realmente guarda o token

// // //       if (!csrfToken) {
// // //         console.error('CSRF token não recebido do servidor.');
// // //       } else {
// // //         console.log('CSRF carregado:', csrfToken);
// // //       }
// // //     } catch (err) {
// // //       console.error('Erro ao carregar CSRF', err);
// // //     }
// // //   }

// // //   function formatPrice(v) {
// // //     return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
// // //   }

// // //   function updatePrices() {
// // //     const cycle = billingInput.value;
// // //     document.querySelectorAll('.plan-card').forEach(card => {
// // //       const plan = card.getAttribute('data-plan');
// // //       const priceEl = card.querySelector('.plan-price');
// // //       const periodEl = card.querySelector('.plan-price-period');
// // //       const value = plans[plan][cycle];
// // //       priceEl.textContent = formatPrice(value);
// // //       periodEl.textContent = cycle === 'monthly' ? '/mês' : '/ano';
// // //     });
// // //   }

// // //   billingToggle.addEventListener('change', () => {
// // //     billingInput.value = billingToggle.checked ? 'annual' : 'monthly';
// // //     updatePrices();
// // //   });

// // //   async function createCheckout(plan) {
// // //     if (!csrfToken) {
// // //       console.warn('CSRF ainda não carregado, aguardando...');
// // //       await loadCsrfToken();
// // //     }

// // //     if (!csrfToken) {
// // //       alert('Erro: CSRF token não carregado.');
// // //       return;
// // //     }

// // //     messageEl.textContent = 'Redirecionando para PagSeguro...';

// // //     try {
// // //       const res = await fetch('/api/subscriptions/checkout', {
// // //         method: 'POST',
// // //         headers: {
// // //           'Content-Type': 'application/json',
// // //           'CSRF-Token': csrfToken // 👈 agora correto
// // //         },
// // //         credentials: 'include',
// // //         body: JSON.stringify({
// // //           plan,
// // //           billing_cycle: billingInput.value
// // //         })
// // //       });

// // //       const data = await res.json();

// // //       if (!res.ok) {
// // //         messageEl.textContent = data.error || 'Erro ao iniciar assinatura.';
// // //         return;
// // //       }

// // //       if (data.paymentUrl) {
// // //         window.location.href = data.paymentUrl;
// // //       } else {
// // //         messageEl.textContent = 'URL de pagamento não recebida.';
// // //       }
// // //     } catch (err) {
// // //       console.error(err);
// // //       messageEl.textContent = 'Erro na comunicação com o servidor.';
// // //     }
// // //   }

// // //   document.querySelectorAll('.plan-button').forEach(btn => {
// // //     btn.addEventListener('click', () => {
// // //       const plan = btn.getAttribute('data-plan');
// // //       createCheckout(plan);
// // //     });
// // //   });

// // //   // Aguarda CSRF antes de permitir uso
// // //   loadCsrfToken().then(() => {
// // //     updatePrices();
// // //   });
// // // });