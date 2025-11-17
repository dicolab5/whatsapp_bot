// src/server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const runMigrations = require('./migrations');
const db = require('./db');
const { createAndSendBroadcast } = require('./broadcastService');
const { client, syncContacts, getQrStatus } = require('./whatsapp');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Layout base com Bootstrap
function layout({ title, content }) {
  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Bootstrap 5.3 CSS -->
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
    crossorigin="anonymous"
  />
  <style>
    body {
      background-color: #f5f6fa;
    }
    .navbar-brand {
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .card {
      box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.05);
      border-radius: 0.75rem;
    }
    .table thead th {
      white-space: nowrap;
    }
    .badge-status {
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">Painel Chatbot TI</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <a class="nav-link" href="/contacts">Contatos</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/broadcast">Nova campanha</a>
          </li>
        </ul>
        <form class="d-flex" action="/sync-contacts" method="GET">
          <button class="btn btn-outline-light btn-sm" type="submit">
            Sincronizar contatos
          </button>
        </form>
      </div>
    </div>
  </nav>

  <main class="container mb-5">
    ${content}
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
    integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
    crossorigin="anonymous"></script>
</body>
</html>
`;
}

// Home
app.get('/', (req, res) => {
  const content = `
  <div class="row">
    <div class="col-lg-8 mx-auto">
      <div class="card">
        <div class="card-body">
          <h1 class="h4 mb-3">Bem-vindo ao painel da loja de TI</h1>
          <p class="text-muted">
            Aqui você gerencia os contatos, campanhas de WhatsApp e envios do seu chatbot.
          </p>
          <div class="row g-3">
            <div class="col-md-4">
              <a href="/contacts" class="btn btn-primary w-100">Ver contatos</a>
            </div>
            <div class="col-md-4">
              <a href="/broadcast" class="btn btn-success w-100">Nova campanha</a>
            </div>
            <div class="col-md-4">
              <a href="/sync-contacts" class="btn btn-outline-secondary w-100">Sincronizar contatos</a>
            </div>
            <div class="col-md-4">
              <a href="/qr" class="btn btn-outline-danger w-100">Conectar WhatsApp</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  res.send(layout({ title: 'Painel Chatbot TI', content }));
});

// Listagem de contatos com busca, checkboxes e botão de opt-in
app.get('/contacts', async (req, res) => {
  const search = (req.query.search || '').trim();

  let query = db('whatsapp_contacts')
    .where('is_group', false);

  if (search) {
    query = query.andWhere(function () {
      this.whereILike('name', `%${search}%`)
        .orWhereILike('push_name', `%${search}%`)
        .orWhereILike('number', `%${search}%`);
    });
  }

  const contacts = await query
    .orderBy('name', 'asc')
    .limit(500);

  let rows = '';
  for (const c of contacts) {
    const displayName = c.name || c.push_name || c.number || c.wa_id;
    const optInBadge = c.opt_in
      ? '<span class="badge bg-success badge-status">Opt-in</span>'
      : '<span class="badge bg-secondary badge-status">Sem opt-in</span>';

    const optInButton = `
      <form method="POST" action="/contacts/${c.id}/toggle-optin" style="display:inline;">
        <button type="submit" class="btn btn-sm ${c.opt_in ? 'btn-outline-danger' : 'btn-outline-success'}">
          ${c.opt_in ? 'Remover opt-in' : 'Dar opt-in'}
        </button>
      </form>
    `;

    rows += `
      <tr>
        <td class="text-center">
          <input type="checkbox" class="form-check-input contact-checkbox" name="contactIds" value="${c.id}" />
        </td>
        <td>${displayName}</td>
        <td>${c.number || ''}</td>
        <td>${optInBadge} ${optInButton}</td>
      </tr>
    `;
  }

  const content = `
  <div class="card">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0">Contatos</h2>
        <span class="text-muted small">Mostrando até 500 contatos</span>
      </div>

      <form class="row g-2 mb-3" method="GET" action="/contacts">
        <div class="col-md-6">
          <input type="text" class="form-control" name="search" placeholder="Buscar por nome, perfil ou número..."
                 value="${search}" />
        </div>
        <div class="col-md-6 d-flex gap-2">
          <button type="submit" class="btn btn-outline-primary">Buscar</button>
          <a href="/contacts" class="btn btn-outline-secondary">Limpar</a>
        </div>
      </form>

      <form id="contactsForm" method="GET" action="/broadcast">
        <div class="mb-2 d-flex justify-content-between align-items-center">
          <div>
            <label class="form-check-label">
              <input type="checkbox" class="form-check-input" id="checkAll" />
              Selecionar todos
            </label>
          </div>
          <button type="submit" class="btn btn-sm btn-primary">
            Criar campanha para selecionados
          </button>
        </div>

        <div class="table-responsive">
          <table class="table table-sm align-middle table-hover">
            <thead class="table-light">
              <tr>
                <th class="text-center" style="width: 40px;">#</th>
                <th>Nome / Perfil</th>
                <th>Número</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4" class="text-center text-muted">Nenhum contato encontrado.</td></tr>'}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  </div>

  <script>
    const checkAll = document.getElementById('checkAll');
    const checkboxes = document.querySelectorAll('.contact-checkbox');
    if (checkAll) {
      checkAll.addEventListener('change', function() {
        checkboxes.forEach(cb => cb.checked = checkAll.checked);
      });
    }

    const form = document.getElementById('contactsForm');
    form.addEventListener('submit', function(e) {
      const selected = Array.from(checkboxes).filter(cb => cb.checked);
      if (selected.length === 0) {
        e.preventDefault();
        alert('Selecione ao menos um contato para criar a campanha.');
      }
    });
  </script>
  `;
  res.send(layout({ title: 'Contatos', content }));
});

// Alternar opt-in de um contato
app.post('/contacts/:id/toggle-optin', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).send('ID inválido');

  const contact = await db('whatsapp_contacts').where({ id }).first();
  if (!contact) return res.status(404).send('Contato não encontrado');

  const newValue = !contact.opt_in;
  await db('whatsapp_contacts')
    .where({ id })
    .update({ opt_in: newValue, updated_at: db.fn.now() });

  res.redirect('/contacts');
});

// Form de broadcast
app.get('/broadcast', (req, res) => {
  let selectedIds = req.query.contactIds;
  if (!selectedIds) {
    selectedIds = [];
  } else if (!Array.isArray(selectedIds)) {
    selectedIds = [selectedIds];
  }

  const idsString = selectedIds.join(',');

  const infoText = selectedIds.length > 0
    ? `Esta campanha será enviada para <strong>${selectedIds.length}</strong> contato(s) selecionado(s).`
    : 'Se nenhum contato for selecionado, será usado o filtro padrão (apenas opt-in, até o limite configurado).';

  const content = `
  <div class="row">
    <div class="col-lg-8 mx-auto">
      <div class="card">
        <div class="card-body">
          <h2 class="h5 mb-3">Nova campanha</h2>
          <p class="text-muted">${infoText}</p>

          <form method="POST" action="/broadcast">
            <input type="hidden" name="contactIds" value="${idsString}" />

            <div class="mb-3">
              <label class="form-label">Nome da campanha</label>
              <input type="text" name="name" class="form-control" placeholder="Ex: Promoção de upgrades de SSD" required />
            </div>

            <div class="mb-3">
              <label class="form-label">Mensagem</label>
              <textarea name="message" class="form-control" rows="5" placeholder="Escreva aqui a mensagem que será enviada..." required></textarea>
              <div class="form-text">
                Evite texto muito genérico ou repetitivo para reduzir chance de bloqueio.
              </div>
            </div>

            <div class="mb-3 form-check">
              <input class="form-check-input" type="checkbox" name="onlyOptIn" id="onlyOptIn" checked />
              <label class="form-check-label" for="onlyOptIn">
                Usar apenas contatos com opt-in (quando não há seleção manual de contatos)
              </label>
            </div>

            <button type="submit" class="btn btn-success">
              Enviar campanha
            </button>
            <a href="/contacts" class="btn btn-link">Voltar para contatos</a>
          </form>
        </div>
      </div>
    </div>
  </div>
  `;
  res.send(layout({ title: 'Nova campanha', content }));
});

// POST para disparar broadcast
app.post('/broadcast', async (req, res) => {
  const { name, message, onlyOptIn, contactIds } = req.body;

  let idsArray = [];
  if (contactIds && contactIds.trim() !== '') {
    idsArray = contactIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
  }

  try {
    const result = await createAndSendBroadcast({
      name,
      message,
      filters: {
        onlyOptIn: !!onlyOptIn
      },
      contactIds: idsArray
    });

    const content = `
    <div class="row">
      <div class="col-lg-6 mx-auto">
        <div class="alert alert-success">
          <h4 class="alert-heading">Campanha enviada!</h4>
          <p>ID: <strong>${result.broadcastId}</strong></p>
          <p>Total enviados: <strong>${result.sentCount}</strong></p>
          <hr />
          <a href="/contacts" class="btn btn-sm btn-primary">Voltar para contatos</a>
          <a href="/broadcast" class="btn btn-sm btn-outline-secondary ms-2">Nova campanha</a>
        </div>
      </div>
    </div>`;
    res.send(layout({ title: 'Campanha enviada', content }));
  } catch (err) {
    const content = `
    <div class="row">
      <div class="col-lg-6 mx-auto">
        <div class="alert alert-danger">
          <h4 class="alert-heading">Erro ao enviar campanha</h4>
          <p>${err.message}</p>
          <hr />
          <a href="/contacts" class="btn btn-sm btn-secondary">Voltar</a>
        </div>
      </div>
    </div>`;
    res.status(500).send(layout({ title: 'Erro', content }));
  }
});

// Sincronizar contatos
app.get('/sync-contacts', async (req, res) => {
  try {
    await syncContacts();
    const content = `
    <div class="alert alert-info">
      Sincronização iniciada. Veja os logs no servidor para detalhes.
      <br />
      <a href="/contacts" class="btn btn-sm btn-link mt-2">Ver contatos</a>
    </div>`;
    res.send(layout({ title: 'Sincronizar contatos', content }));
  } catch (err) {
    const content = `
    <div class="alert alert-danger">
      Erro ao sincronizar: ${err.message}
      <br />
      <a href="/" class="btn btn-sm btn-link mt-2">Voltar</a>
    </div>`;
    res.status(500).send(layout({ title: 'Erro sincronização', content }));
  }
});

// API simples para obter o QR atual e status
app.get('/api/qr', (req, res) => {
  const status = getQrStatus();
  res.json(status);
});

// Página para exibir o QR code do WhatsApp
app.get('/qr', (req, res) => {
  const content = `
  <div class="row">
    <div class="col-lg-6 mx-auto">
      <div class="card">
        <div class="card-body text-center">
          <h2 class="h5 mb-3">Conectar WhatsApp</h2>
          <p class="text-muted">
            Aponte a câmera do WhatsApp (Aparelhos conectados) para o QR abaixo.
          </p>
          <div id="qr-container" class="d-flex justify-content-center my-3">
            <div id="qrcode"></div>
          </div>
          <p id="qr-status" class="text-muted small"></p>
          <a href="/" class="btn btn-link">Voltar ao painel</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Lib simples de QRCode em JS (QRCode.js) via CDN -->
  <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
  <script>
    let qrInstance = null;

    async function fetchQr() {
      try {
        const res = await fetch('/api/qr');
        const data = await res.json();

        const statusEl = document.getElementById('qr-status');
        const qrDiv = document.getElementById('qrcode');

        if (data.ready) {
          // Já conectado
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

        // Desenha / atualiza o QR
        qrDiv.innerHTML = '';
        qrInstance = new QRCode(qrDiv, {
          text: data.qr,
          width: 256,
          height: 256,
        });

      } catch (err) {
        console.error(err);
        const statusEl = document.getElementById('qr-status');
        statusEl.textContent = 'Erro ao carregar QR. Tente atualizar a página.';
      }
    }

    // Busca inicial
    fetchQr();
    // Atualiza a cada 10 segundos (WhatsApp renova o QR periodicamente)
    setInterval(fetchQr, 10000);
  </script>
  `;
  res.send(layout({ title: 'Conectar WhatsApp', content }));
});

async function start() {
  await runMigrations();
  client.initialize();
  app.listen(PORT, () => {
    console.log(`Admin rodando em http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Erro ao iniciar aplicação:', err);
});


// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const runMigrations = require('./migrations');
// const db = require('./db');
// const { client, syncContacts } = require('./whatsapp');
// const { createAndSendBroadcast } = require('./broadcastService');

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// function layout({ title, content }) {
//   return `
// <!DOCTYPE html>
// <html lang="pt-br">
// <head>
//   <meta charset="UTF-8" />
//   <title>${title}</title>
//   <meta name="viewport" content="width=device-width, initial-scale=1" />
//   <!-- Bootstrap 5.3 CSS -->
//   <link
//     href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
//     rel="stylesheet"
//     integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
//     crossorigin="anonymous"
//   />
//   <style>
//     body {
//       background-color: #f5f6fa;
//     }
//     .navbar-brand {
//       font-weight: 600;
//       letter-spacing: 0.03em;
//     }
//     .card {
//       box-shadow: 0 0.25rem 0.5rem rgba(0,0,0,0.05);
//       border-radius: 0.75rem;
//     }
//     .table thead th {
//       white-space: nowrap;
//     }
//     .badge-status {
//       font-size: 0.75rem;
//     }
//   </style>
// </head>
// <body>
//   <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
//     <div class="container-fluid">
//       <a class="navbar-brand" href="/">Painel Chatbot TI</a>
//       <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
//         <span class="navbar-toggler-icon"></span>
//       </button>
//       <div class="collapse navbar-collapse" id="navbarNav">
//         <ul class="navbar-nav me-auto mb-2 mb-lg-0">
//           <li class="nav-item">
//             <a class="nav-link" href="/contacts">Contatos</a>
//           </li>
//           <li class="nav-item">
//             <a class="nav-link" href="/broadcast">Nova campanha</a>
//           </li>
//         </ul>
//         <form class="d-flex" action="/sync-contacts" method="GET">
//           <button class="btn btn-outline-light btn-sm" type="submit">
//             Sincronizar contatos
//           </button>
//         </form>
//       </div>
//     </div>
//   </nav>

//   <main class="container mb-5">
//     ${content}
//   </main>

//   <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
//     integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
//     crossorigin="anonymous"></script>
// </body>
// </html>
// `;
// }

// // Home
// app.get('/', (req, res) => {
//   const content = `
//   <div class="row">
//     <div class="col-lg-8 mx-auto">
//       <div class="card">
//         <div class="card-body">
//           <h1 class="h4 mb-3">Bem-vindo ao painel da loja de TI</h1>
//           <p class="text-muted">
//             Aqui você gerencia os contatos, campanhas de WhatsApp e envios do seu chatbot.
//           </p>
//           <div class="row g-3">
//             <div class="col-md-4">
//               <a href="/contacts" class="btn btn-primary w-100">Ver contatos</a>
//             </div>
//             <div class="col-md-4">
//               <a href="/broadcast" class="btn btn-success w-100">Nova campanha</a>
//             </div>
//             <div class="col-md-4">
//               <a href="/sync-contacts" class="btn btn-outline-secondary w-100">Sincronizar contatos</a>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   </div>`;
//   res.send(layout({ title: 'Painel Chatbot TI', content }));
// });

// // Listagem de contatos com checkboxes
// app.get('/contacts', async (req, res) => {
//   const contacts = await db('whatsapp_contacts')
//     .where('is_group', false)
//     .orderBy('name', 'asc')
//     .limit(500);

//   let rows = '';
//   for (const c of contacts) {
//     const displayName = c.name || c.push_name || c.number || c.wa_id;
//     const optInBadge = c.opt_in
//       ? '<span class="badge bg-success badge-status">Opt-in</span>'
//       : '<span class="badge bg-secondary badge-status">Sem opt-in</span>';

//     rows += `
//       <tr>
//         <td class="text-center">
//           <input type="checkbox" class="form-check-input contact-checkbox" name="contactIds" value="${c.id}" />
//         </td>
//         <td>${displayName}</td>
//         <td>${c.number || ''}</td>
//         <td>${optInBadge}</td>
//       </tr>
//     `;
//   }

//   const content = `
//   <div class="card">
//     <div class="card-body">
//       <div class="d-flex justify-content-between align-items-center mb-3">
//         <h2 class="h5 mb-0">Contatos</h2>
//         <span class="text-muted small">Mostrando até 500 contatos</span>
//       </div>

//       <form id="contactsForm" method="GET" action="/broadcast">
//         <div class="mb-2 d-flex justify-content-between align-items-center">
//           <div>
//             <label class="form-check-label">
//               <input type="checkbox" class="form-check-input" id="checkAll" />
//               Selecionar todos
//             </label>
//           </div>
//           <button type="submit" class="btn btn-sm btn-primary">
//             Criar campanha para selecionados
//           </button>
//         </div>

//         <div class="table-responsive">
//           <table class="table table-sm align-middle table-hover">
//             <thead class="table-light">
//               <tr>
//                 <th class="text-center" style="width: 40px;">#</th>
//                 <th>Nome / Perfil</th>
//                 <th>Número</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${rows || '<tr><td colspan="4" class="text-center text-muted">Nenhum contato encontrado.</td></tr>'}
//             </tbody>
//           </table>
//         </div>
//       </form>
//     </div>
//   </div>

//   <script>
//     const checkAll = document.getElementById('checkAll');
//     const checkboxes = document.querySelectorAll('.contact-checkbox');
//     checkAll.addEventListener('change', function() {
//       checkboxes.forEach(cb => cb.checked = checkAll.checked);
//     });

//     const form = document.getElementById('contactsForm');
//     form.addEventListener('submit', function(e) {
//       const selected = Array.from(checkboxes).filter(cb => cb.checked);
//       if (selected.length === 0) {
//         alert('Selecione ao menos um contato para criar a campanha.');
//         e.preventDefault();
//       }
//     });
//   </script>
//   `;
//   res.send(layout({ title: 'Contatos', content }));
// });

// // Form de broadcast (aceita contactIds via querystring, vinda da tela de contatos)
// app.get('/broadcast', (req, res) => {
//   let selectedIds = req.query.contactIds;
//   if (!selectedIds) {
//     selectedIds = [];
//   } else if (!Array.isArray(selectedIds)) {
//     selectedIds = [selectedIds];
//   }

//   const idsString = selectedIds.join(',');

//   const infoText = selectedIds.length > 0
//     ? `Esta campanha será enviada para <strong>${selectedIds.length}</strong> contato(s) selecionado(s).`
//     : 'Se nenhum contato for selecionado, será usado o filtro padrão (apenas opt-in, até o limite configurado).';

//   const content = `
//   <div class="row">
//     <div class="col-lg-8 mx-auto">
//       <div class="card">
//         <div class="card-body">
//           <h2 class="h5 mb-3">Nova campanha</h2>
//           <p class="text-muted">${infoText}</p>

//           <form method="POST" action="/broadcast">
//             <input type="hidden" name="contactIds" value="${idsString}" />

//             <div class="mb-3">
//               <label class="form-label">Nome da campanha</label>
//               <input type="text" name="name" class="form-control" placeholder="Ex: Promoção de upgrades de SSD" required />
//             </div>

//             <div class="mb-3">
//               <label class="form-label">Mensagem</label>
//               <textarea name="message" class="form-control" rows="5" placeholder="Escreva aqui a mensagem que será enviada..." required></textarea>
//               <div class="form-text">
//                 Evite texto muito genérico ou repetitivo para reduzir chance de bloqueio.
//               </div>
//             </div>

//             <div class="mb-3 form-check">
//               <input class="form-check-input" type="checkbox" name="onlyOptIn" id="onlyOptIn" checked />
//               <label class="form-check-label" for="onlyOptIn">
//                 Usar apenas contatos com opt-in (quando não há seleção manual de contatos)
//               </label>
//             </div>

//             <button type="submit" class="btn btn-success">
//               Enviar campanha
//             </button>
//             <a href="/contacts" class="btn btn-link">Voltar para contatos</a>
//           </form>
//         </div>
//       </div>
//     </div>
//   </div>
//   `;
//   res.send(layout({ title: 'Nova campanha', content }));
// });

// // POST para disparar broadcast
// app.post('/broadcast', async (req, res) => {
//   const { name, message, onlyOptIn, contactIds } = req.body;

//   let idsArray = [];
//   if (contactIds && contactIds.trim() !== '') {
//     idsArray = contactIds.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n));
//   }

//   try {
//     const result = await createAndSendBroadcast({
//       name,
//       message,
//       filters: {
//         onlyOptIn: !!onlyOptIn
//       },
//       contactIds: idsArray
//     });

//     const content = `
//     <div class="row">
//       <div class="col-lg-6 mx-auto">
//         <div class="alert alert-success">
//           <h4 class="alert-heading">Campanha enviada!</h4>
//           <p>ID: <strong>${result.broadcastId}</strong></p>
//           <p>Total enviados: <strong>${result.sentCount}</strong></p>
//           <hr />
//           <a href="/contacts" class="btn btn-sm btn-primary">Voltar para contatos</a>
//           <a href="/broadcast" class="btn btn-sm btn-outline-secondary ms-2">Nova campanha</a>
//         </div>
//       </div>
//     </div>`;
//     res.send(layout({ title: 'Campanha enviada', content }));
//   } catch (err) {
//     const content = `
//     <div class="row">
//       <div class="col-lg-6 mx-auto">
//         <div class="alert alert-danger">
//           <h4 class="alert-heading">Erro ao enviar campanha</h4>
//           <p>${err.message}</p>
//           <hr />
//           <a href="/contacts" class="btn btn-sm btn-secondary">Voltar</a>
//         </div>
//       </div>
//     </div>`;
//     res.status(500).send(layout({ title: 'Erro', content }));
//   }
// });

// // Sincronizar contatos
// app.get('/sync-contacts', async (req, res) => {
//   try {
//     await syncContacts();
//     const content = `
//     <div class="alert alert-info">
//       Sincronização iniciada. Veja os logs no servidor para detalhes.
//       <br />
//       <a href="/contacts" class="btn btn-sm btn-link mt-2">Ver contatos</a>
//     </div>`;
//     res.send(layout({ title: 'Sincronizar contatos', content }));
//   } catch (err) {
//     const content = `
//     <div class="alert alert-danger">
//       Erro ao sincronizar: ${err.message}
//       <br />
//       <a href="/" class="btn btn-sm btn-link mt-2">Voltar</a>
//     </div>`;
//     res.status(500).send(layout({ title: 'Erro sincronização', content }));
//   }
// });

// async function start() {
//   await runMigrations();
//   client.initialize();
//     app.listen(PORT, () => {
//       console.log(`Admin rodando em http://localhost:${PORT}`);
//     });
// }

// start().catch((err) => {
//   console.error('Erro ao iniciar aplicação:', err);
// });

// // require('dotenv').config();
// // const express = require('express');
// // const bodyParser = require('body-parser');
// // const runMigrations = require('./migrations');
// // const db = require('./db');
// // const { client, syncContacts } = require('./whatsapp');
// // const { createAndSendBroadcast } = require('./broadcastService');

// // const app = express();
// // const PORT = process.env.PORT || 3000;

// // app.use(bodyParser.urlencoded({ extended: true }));
// // app.use(bodyParser.json());

// // // Para um front simples, vamos usar HTML direto.
// // // Se quiser algo mais elaborado, troque por EJS/React/Vue etc.

// // app.get('/', (req, res) => {
// //   res.send(`
// //     <h1>Admin Chatbot - Loja de TI</h1>
// //     <ul>
// //       <li><a href="/contacts">Ver contatos</a></li>
// //       <li><a href="/broadcast">Nova campanha</a></li>
// //       <li><a href="/sync-contacts">Sincronizar contatos agora</a></li>
// //     </ul>
// //   `);
// // });

// // // Listagem simples de contatos
// // app.get('/contacts', async (req, res) => {
// //   const contacts = await db('whatsapp_contacts')
// //     .where('is_group', false)
// //     .orderBy('name', 'asc')
// //     .limit(200);

// //   let html = '<h2>Contatos (primeiros 200)</h2><table border="1" cellpadding="4"><tr><th>ID</th><th>Nome</th><th>Número</th><th>Opt-in</th></tr>';

// //   for (const c of contacts) {
// //     html += `<tr>
// //       <td>${c.id}</td>
// //       <td>${c.name || c.push_name || ''}</td>
// //       <td>${c.number || ''}</td>
// //       <td>${c.opt_in ? 'SIM' : 'NÃO'}</td>
// //     </tr>`;
// //   }

// //   html += '</table><a href="/">Voltar</a>';
// //   res.send(html);
// // });

// // // Form para criar broadcast
// // app.get('/broadcast', (req, res) => {
// //   res.send(`
// //     <h2>Nova campanha de broadcast</h2>
// //     <form method="POST" action="/broadcast">
// //       <label>Nome da campanha:</label><br>
// //       <input type="text" name="name" required /><br><br>

// //       <label>Mensagem (texto):</label><br>
// //       <textarea name="message" rows="5" cols="60" required></textarea><br><br>

// //       <label>Apenas contatos opt-in?</label>
// //       <input type="checkbox" name="onlyOptIn" value="true" checked /><br><br>

// //       <button type="submit">Enviar campanha</button>
// //     </form>
// //     <a href="/">Voltar</a>
// //   `);
// // });

// // // POST para disparar broadcast
// // app.post('/broadcast', async (req, res) => {
// //   const { name, message, onlyOptIn } = req.body;

// //   try {
// //     const result = await createAndSendBroadcast({
// //       name,
// //       message,
// //       filters: {
// //         onlyOptIn: !!onlyOptIn
// //       }
// //     });

// //     res.send(`
// //       <h2>Campanha criada</h2>
// //       <p>ID: ${result.broadcastId}</p>
// //       <p>Total enviados: ${result.sentCount}</p>
// //       <a href="/">Voltar</a>
// //     `);
// //   } catch (err) {
// //     res.status(500).send(`
// //       <h2>Erro ao enviar campanha</h2>
// //       <p>${err.message}</p>
// //       <a href="/">Voltar</a>
// //     `);
// //   }
// // });

// // // Força sincronização de contatos
// // app.get('/sync-contacts', async (req, res) => {
// //   try {
// //     await syncContacts();
// //     res.send('<p>Sincronização iniciada. Veja logs no servidor.</p><a href="/">Voltar</a>');
// //   } catch (err) {
// //     res.status(500).send(`<p>Erro: ${err.message}</p><a href="/">Voltar</a>`);
// //   }
// // });

// // async function start() {
// //   await runMigrations();
// //   client.initialize();

// //   app.listen(PORT, () => {
// //     console.log(`Admin rodando em http://localhost:${PORT}`);
// //   });
// // }

// // start().catch((err) => {
// //   console.error('Erro ao iniciar aplicação:', err);
// // });
