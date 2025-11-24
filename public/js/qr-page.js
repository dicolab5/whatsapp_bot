let qrInstance = null;
let clientActive = false;

async function fetchQr() {
  try {
    // Corrigido endpoint para o prefixo correto
    const res = await fetch('/api/whatsapp/qr');
    const data = await res.json();

    const statusEl = document.getElementById('qr-status');
    const qrDiv = document.getElementById('qrcode');

    clientActive = !!data.qr || data.ready;

    document.getElementById('btnToggleQr').textContent =
      clientActive ? 'Parar bot' : 'Iniciar geração do QR code';

    if (data.ready) {
      statusEl.textContent = 'WhatsApp conectado! Você já pode usar o painel normalmente.';
      qrDiv.innerHTML = '';
      return;
    }

    if (!data.qr) {
      statusEl.textContent = 'Aguardando QR code do WhatsApp...';
      qrDiv.innerHTML = '';
      return;
    }

    statusEl.textContent = 'QR code ativo. Escaneie com o app do WhatsApp.';

    qrDiv.innerHTML = '';
    qrInstance = new QRCode(qrDiv, {
      text: data.qr,
      width: 256,
      height: 256,
    });

  } catch (err) {
    const statusEl = document.getElementById('qr-status');
    statusEl.textContent = 'Erro ao carregar QR. Tente atualizar a página.';
  }
}

document.getElementById('btnToggleQr').onclick = async () => {
  const statusEl = document.getElementById('qr-status');
  statusEl.textContent = clientActive ? 'Parando bot...' : 'Iniciando geração do QR code...';

  try {
    // Corrigido endpoint para o prefixo correto
    const url = clientActive ? '/api/whatsapp/stop-bot' : '/api/whatsapp/generate-qr';
    const res = await fetch(url);
    const data = await res.json();
    statusEl.textContent = data.message;
  } catch (err) {
    statusEl.textContent = clientActive ? 'Erro ao parar o bot.' : 'Erro ao gerar novo QR code.';
  }

  setTimeout(fetchQr, 1500);
};

// Busca inicial do QR
fetchQr();
// Atualiza a cada 10 segundos para refrescar o QR
setInterval(fetchQr, 10000);


// let qrInstance = null;
// let clientActive = false;

// async function fetchQr() {
//   try {
//     const res = await fetch('/api/qr');
//     const data = await res.json();

//     const statusEl = document.getElementById('qr-status');
//     const qrDiv = document.getElementById('qrcode');

//     clientActive = !!data.qr || data.ready;

//     document.getElementById('btnToggleQr').textContent =
//       clientActive ? 'Parar bot' : 'Iniciar geração do QR code';

//     if (data.ready) {
//       statusEl.textContent = 'WhatsApp conectado! Você já pode usar o painel normalmente.';
//       qrDiv.innerHTML = '';
//       return;
//     }

//     if (!data.qr) {
//       statusEl.textContent = 'Aguardando QR code do WhatsApp...';
//       qrDiv.innerHTML = '';
//       return;
//     }

//     statusEl.textContent = 'QR code ativo. Escaneie com o app do WhatsApp.';

//     qrDiv.innerHTML = '';
//     qrInstance = new QRCode(qrDiv, {
//       text: data.qr,
//       width: 256,
//       height: 256,
//     });

//   } catch (err) {
//     const statusEl = document.getElementById('qr-status');
//     statusEl.textContent = 'Erro ao carregar QR. Tente atualizar a página.';
//   }
// }

// document.getElementById('btnToggleQr').onclick = async () => {
//   const statusEl = document.getElementById('qr-status');
//   statusEl.textContent = clientActive ? 'Parando bot...' : 'Iniciando geração do QR code...';

//   try {
//     const url = clientActive ? '/api/stop-bot' : '/api/generate-qr';
//     const res = await fetch(url);
//     const data = await res.json();
//     statusEl.textContent = data.message;
//   } catch (err) {
//     statusEl.textContent = clientActive ? 'Erro ao parar o bot.' : 'Erro ao gerar novo QR code.';
//   }

//   setTimeout(fetchQr, 1500);
// };

// // Busca inicial do QR
// fetchQr();
// setInterval(fetchQr, 10000);
