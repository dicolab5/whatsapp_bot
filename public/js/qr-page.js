// public/js/qr-page.js

let userId = null;

// Carregar dados do usuário
async function loadUserInfo() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('não autenticado');
    const data = await res.json();

    userId = data.id;

    const headerEl = document.getElementById('user-header');
    if (headerEl) {
      headerEl.textContent = `Usuário: ${data.username} (ID: ${data.id})`;
    }
  } catch (err) {
    console.error('Erro ao carregar informações:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserInfo();
  if (!userId) {
    console.error('userId não definido, abortando QR page');
    return;
  }
  initializeQrPage();
});

function initializeQrPage() {
  let qrInstance = null;
  let clientActive = false;

  const isLocal = window.location.hostname === 'localhost';
  const baseURL = isLocal
    ? `http://${window.location.host}`
    : `https://${window.location.host}`;

  function updateButtonState() {
    const btn = document.getElementById('btnToggleQr');
    if (!btn) return;

    if (clientActive) {
      btn.textContent = 'Parar bot';
      btn.classList.remove('btn-success');
      btn.classList.add('btn-danger');
    } else {
      btn.textContent = 'Iniciar bot';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-success');
    }
  }

  // Buscar QR periodicamente (GET, sem CSRF)
  async function fetchQr() {
    try {
      const res = await fetch(`${baseURL}/api/whatsapp/qr/${userId}`, {
        credentials: 'same-origin'
      });
      const data = await res.json();

      const statusEl = document.getElementById('qr-status');
      const qrDiv = document.getElementById('qrcode');

      clientActive = data.ready || !!data.qr;
      updateButtonState();

      if (data.ready) {
        statusEl.textContent = 'WhatsApp conectado!';
        qrDiv.innerHTML = '';
        return;
      }

      if (!data.qr) {
        statusEl.textContent = 'Aguardando QR code...';
        qrDiv.innerHTML = '';
        return;
      }

      statusEl.textContent = 'Escaneie o QR com o WhatsApp.';
      qrDiv.innerHTML = '';
      qrInstance = new QRCode(qrDiv, {
        text: data.qr,
        width: 256,
        height: 256
      });
    } catch (err) {
      console.error('Erro ao carregar QR:', err);
      document.getElementById('qr-status').textContent =
        'Erro ao carregar QR.';
    }
  }

  // Botão iniciar/parar (POST com CSRF via apiFetch)
  document.getElementById('btnToggleQr').onclick = async () => {
    const statusEl = document.getElementById('qr-status');

    statusEl.textContent = clientActive
      ? 'Parando bot...'
      : 'Iniciando geração do QR code...';

    try {
      const endpoint = clientActive
        ? `/api/whatsapp/stop/${userId}`
        : `/api/whatsapp/start/${userId}`;

      const res = await apiFetch(`${baseURL}${endpoint}`, {
        method: 'POST'
      });

      const data = await res.json();
      statusEl.textContent = data.message || 'Operação concluída.';

      // otimisticamente inverte o estado; fetchQr vai confirmar logo depois
      clientActive = !clientActive;
      updateButtonState();
    } catch (err) {
      console.error('Erro ao iniciar/parar bot:', err);
      statusEl.textContent = clientActive
        ? 'Erro ao parar bot.'
        : 'Erro ao iniciar bot.';
    }

    setTimeout(fetchQr, 1500);
  };

  // Carregar QR imediato
  fetchQr();

  // Atualização periódica
  setInterval(fetchQr, 10000);
}


// // public/js/qr-page.js

// let userId = null;

// // Carregar dados do usuário
// async function loadUserInfo() {
//   try {
//     const res = await fetch('/api/me', { credentials: 'same-origin' });
//     if (!res.ok) throw new Error('não autenticado');
//     const data = await res.json();

//     userId = data.id;

//     const headerEl = document.getElementById('user-header');
//     if (headerEl) {
//       headerEl.textContent = `Usuário: ${data.username} (ID: ${data.id})`;
//     }
//   } catch (err) {
//     console.error('Erro ao carregar informações:', err);
//   }
// }

// document.addEventListener('DOMContentLoaded', async () => {
//   await loadUserInfo();
//   if (!userId) {
//     console.error('userId não definido, abortando QR page');
//     return;
//   }
//   initializeQrPage();
// });

// function initializeQrPage() {
//   let qrInstance = null;
//   let clientActive = false;

//   const isLocal = window.location.hostname === 'localhost';
//   const baseURL = isLocal
//     ? `http://${window.location.host}`
//     : `https://${window.location.host}`;

//   // Buscar QR periodicamente (GET, sem CSRF)
//   async function fetchQr() {
//     try {
//       const res = await fetch(`${baseURL}/api/whatsapp/qr/${userId}`, {
//         credentials: 'same-origin'
//       });
//       const data = await res.json();

//       const statusEl = document.getElementById('qr-status');
//       const qrDiv = document.getElementById('qrcode');

//       clientActive = data.ready || !!data.qr;

//       const btn = document.getElementById('btnToggleQr');
//       btn.textContent = clientActive
//         ? 'Parar bot'
//         : 'Iniciar geração do QR code';

//       if (data.ready) {
//         statusEl.textContent = 'WhatsApp conectado!';
//         qrDiv.innerHTML = '';
//         return;
//       }

//       if (!data.qr) {
//         statusEl.textContent = 'Aguardando QR code...';
//         qrDiv.innerHTML = '';
//         return;
//       }

//       statusEl.textContent = 'Escaneie o QR com o WhatsApp.';
//       qrDiv.innerHTML = '';
//       qrInstance = new QRCode(qrDiv, {
//         text: data.qr,
//         width: 256,
//         height: 256
//       });
//     } catch (err) {
//       console.error('Erro ao carregar QR:', err);
//       document.getElementById('qr-status').textContent =
//         'Erro ao carregar QR.';
//     }
//   }

//   // Botão iniciar/parar (POST com CSRF via apiFetch)
//   document.getElementById('btnToggleQr').onclick = async () => {
//     const statusEl = document.getElementById('qr-status');

//     statusEl.textContent = clientActive
//       ? 'Parando bot...'
//       : 'Iniciando geração do QR code...';

//     try {
//       const endpoint = clientActive
//         ? `/api/whatsapp/stop/${userId}`
//         : `/api/whatsapp/start/${userId}`;

//       const res = await apiFetch(`${baseURL}${endpoint}`, {
//         method: 'POST'
//       });

//       const data = await res.json();
//       statusEl.textContent = data.message || 'Operação concluída.';
//     } catch (err) {
//       console.error('Erro ao iniciar/parar bot:', err);
//       statusEl.textContent = clientActive
//         ? 'Erro ao parar bot.'
//         : 'Erro ao iniciar bot.';
//     }

//     setTimeout(fetchQr, 1500);
//   };

//   // Carregar QR imediato
//   fetchQr();

//   // Atualização periódica
//   setInterval(fetchQr, 10000);
// }


// // // public/js/qr-page.js 
// // // ======================
// // // Variáveis globais
// // // ======================
// // let userId = null;
// // let csrfToken = null;

// // // ======================
// // // Carregar token CSRF
// // // ======================
// // async function loadCsrf() {
// //   try {
// //     const res = await fetch("/csrf-token");
// //     const data = await res.json();
// //     csrfToken = data.csrfToken;
// //   } catch (err) {
// //     console.error("Erro ao carregar CSRF:", err);
// //   }
// // }

// // // ======================
// // // Carregar dados do usuário
// // // ======================
// // async function loadUserInfo() {
// //   try {
// //     const res = await fetch('/api/me', { credentials: 'include' });
// //     if (!res.ok) throw new Error('não autenticado');
// //     const data = await res.json();

// //     userId = data.id; // <-- ID correto da sessão

// //     const headerEl = document.getElementById("user-header");
// //     if (headerEl) {
// //       headerEl.textContent = `Usuário: ${data.username} (ID: ${data.id})`;
// //     }
// //   } catch (err) {
// //     console.error("Erro ao carregar informações:", err);
// //   }
// // }

// // // ======================
// // // Inicialização da página
// // // ======================
// // document.addEventListener("DOMContentLoaded", async () => {
// //   await loadCsrf();
// //   await loadUserInfo();   // aqui userId já fica preenchido com o da sessão
// //   if (!userId) {
// //     console.error('userId não definido, abortando QR page');
// //     return;
// //   }
// //   initializeQrPage();
// // });

// // // ======================
// // // Função principal da página
// // // ======================
// // function initializeQrPage() {
// //   let qrInstance = null;
// //   let clientActive = false;

// //   // Detectar ambiente
// //   const isLocal = window.location.hostname === "localhost";
// //   const baseURL = isLocal
// //     ? `http://${window.location.host}`
// //     : `https://${window.location.host}`;

// //   // ======================
// //   // Buscar QR periodicamente
// //   // ======================
// //   async function fetchQr() {
// //     try {
// //       const res = await fetch(`${baseURL}/api/whatsapp/qr/${userId}`);
// //       const data = await res.json();

// //       const statusEl = document.getElementById("qr-status");
// //       const qrDiv = document.getElementById("qrcode");

// //       clientActive = data.ready || !!data.qr;

// //       // Atualiza botão
// //       const btn = document.getElementById("btnToggleQr");
// //       btn.textContent = clientActive
// //         ? "Parar bot"
// //         : "Iniciar geração do QR code";

// //       if (data.ready) {
// //         statusEl.textContent = "WhatsApp conectado!";
// //         qrDiv.innerHTML = "";
// //         return;
// //       }

// //       if (!data.qr) {
// //         statusEl.textContent = "Aguardando QR code...";
// //         qrDiv.innerHTML = "";
// //         return;
// //       }

// //       // Gerar QR
// //       statusEl.textContent = "Escaneie o QR com o WhatsApp.";
// //       qrDiv.innerHTML = "";
// //       qrInstance = new QRCode(qrDiv, {
// //         text: data.qr,
// //         width: 256,
// //         height: 256,
// //       });

// //     } catch (err) {
// //       document.getElementById("qr-status").textContent =
// //         "Erro ao carregar QR.";
// //     }
// //   }

// //   // ======================
// //   // Botão iniciar/parar
// //   // ======================
// //   document.getElementById("btnToggleQr").onclick = async () => {
// //     const statusEl = document.getElementById("qr-status");

// //     statusEl.textContent = clientActive
// //       ? "Parando bot..."
// //       : "Iniciando geração do QR code...";

// //     try {
// //       const endpoint = clientActive
// //         ? `/api/whatsapp/stop/${userId}`
// //         : `/api/whatsapp/start/${userId}`;

// //       const res = await fetch(`${baseURL}${endpoint}`, {
// //         method: "POST",
// //         headers: {
// //           "CSRF-Token": csrfToken
// //         }
// //       });

// //       const data = await res.json();
// //       statusEl.textContent = data.message;

// //     } catch (err) {
// //       statusEl.textContent = clientActive
// //         ? "Erro ao parar bot."
// //         : "Erro ao iniciar bot.";
// //     }

// //     // Esperar backend gerar o QR
// //     setTimeout(fetchQr, 1500);
// //   };

// //   // Carregar QR imediato
// //   fetchQr();

// //   // Atualização periódica
// //   setInterval(fetchQr, 10000);
// // }
