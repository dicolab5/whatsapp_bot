// src/server.js subir para o github
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const runMigrations = require('./migrations');
const db = require('./db');
const { createAndSendBroadcast } = require('./broadcastService');
//const { client, syncContacts, getQrStatus } = require('./whatsapp');
const { syncContacts, getBotStatus } = require('./whatsapp');
const { client } = require('./whatsapp');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // em produção, ideal usar secure: true (mas só funciona com HTTPS)
    maxAge: 1000 * 60 * 60 * 8 // 8 horas
  }
}));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/login');
}

app.get('/login', (req, res) => {
  const content = `
  <div class="row">
    <div class="col-md-4 mx-auto">
      <div class="card">
        <div class="card-body">
          <h1 class="h5 mb-3">Login do painel</h1>
          <form method="POST" action="/login">
            <div class="mb-3">
              <label class="form-label">Usuário</label>
              <input type="text" name="username" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Senha</label>
              <input type="password" name="password" class="form-control" required />
            </div>
            <button type="submit" class="btn btn-primary w-100">Entrar</button>
          </form>
        </div>
      </div>
    </div>
  </div>
  `;
  res.send(layout({ title: 'Login', content }));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    return res.redirect('/');
  }

  const content = `
  <div class="row">
    <div class="col-md-4 mx-auto">
      <div class="card">
        <div class="card-body">
          <h1 class="h5 mb-3">Login do painel</h1>
          <div class="alert alert-danger">Usuário ou senha inválidos.</div>
          <form method="POST" action="/login">
            <div class="mb-3">
              <label class="form-label">Usuário</label>
              <input type="text" name="username" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Senha</label>
              <input type="password" name="password" class="form-control" required />
            </div>
            <button type="submit" class="btn btn-primary w-100">Entrar</button>
          </form>
        </div>
      </div>
    </div>
  </div>
  `;
  res.status(401).send(layout({ title: 'Login', content }));
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

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
          <li class="nav-item">
            <a class="nav-link" href="/tickets">Atendimentos</a>
          </li>          
        </ul>
        <form class="d-flex" action="/sync-contacts" method="GET">
          <button class="btn btn-outline-light btn-sm" type="submit">
            Sincronizar contatos
          </button>
        </form>
      </div>
    </div>
    <div class="collapse navbar-collapse" id="navbarNav">
  <ul class="navbar-nav me-auto mb-2 mb-lg-0">
    <!-- links existentes -->
  </ul>
  <form class="d-flex" action="/logout" method="POST">
    <button class="btn btn-outline-light btn-sm" type="submit">
      Sair
    </button>
  </form>
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
app.get('/', requireAdmin, (req, res) => {
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
            <div class="col-md-4">
              <a href="/admin/clear-contacts" class="btn btn-outline-warning w-100">Limpar Contatos</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  res.send(layout({ title: 'Painel Chatbot TI', content }));
});

// Listagem de contatos com busca, checkboxes e botão de opt-in
app.get('/contacts', requireAdmin, async (req, res) => {
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

  <script>
async function checkBotReady() {
  try {
    const res = await fetch('/api/bot-status');
    const data = await res.json();
    document.getElementById('syncBtn').disabled = !data.ready;
  } catch (e) {
    document.getElementById('syncBtn').disabled = true;
  }
}
checkBotReady();
setInterval(checkBotReady, 4000);
document.getElementById('syncBtn').onclick = function() {
  window.location.href = '/sync-contacts';
};
</script>

  `;
  res.send(layout({ title: 'Contatos', content }));
});

// Alternar opt-in de um contato
app.post('/contacts/:id/toggle-optin', requireAdmin, async (req, res) => {
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

// Rota para limpar todos os contatos
app.post('/admin/clear-contacts', requireAdmin, async (req, res) => {
  await db('whatsapp_contacts').del();
  const content = `
    <div class="alert alert-warning">
      Todos os contatos foram removidos da tabela <code>whatsapp_contacts</code>.<br>
      <a href="/sync-contacts" class="btn btn-sm btn-primary mt-2">Sincronizar contatos novamente</a>
      <a href="/" class="btn btn-sm btn-link mt-2">Voltar ao painel</a>
    </div>
  `;
  res.send(layout({ title: 'Contatos limpos', content }));
});


// Form de broadcast
app.get('/broadcast', requireAdmin, (req, res) => {
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
app.post('/broadcast', requireAdmin, async (req, res) => {
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

// // Sincronizar contatos
// app.get('/sync-contacts', requireAdmin, async (req, res) => {
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

app.get('/sync-contacts', requireAdmin, async (req, res) => {
  if (!getBotStatus().ready) {
    const content = `
      <div class="alert alert-danger">
        O WhatsApp ainda não está conectado.<br>
        Escaneie o QR code em <a href="/qr">Conectar WhatsApp</a> e aguarde o status "conectado".
      </div>
      <a href="/" class="btn btn-link">Voltar</a>
    `;
    return res.send(layout({ title: 'Erro - WhatsApp não pronto', content }));
  }
  try {
    await syncContacts();
    const content = `
      <div class="alert alert-info">
        Sincronização de contatos concluída!<br>
        <a href="/contacts" class="btn btn-sm btn-link mt-2">Ver contatos</a>
      </div>
    `;
    res.send(layout({ title: 'Sincronização', content }));
  } catch (err) {
    const content = `
      <div class="alert alert-danger">
        Erro ao sincronizar: ${err.message}
        <br />
        <a href="/" class="btn btn-sm btn-link mt-2">Voltar</a>
      </div>
    `;
    res.status(500).send(layout({ title: 'Erro sincronização', content }));
  }
});

// API para obter status do bot
app.get('/api/bot-status', requireAdmin, (req, res) => {
  res.json(getBotStatus());
});


// API simples para obter o QR atual e status
app.get('/api/qr', requireAdmin, (req, res) => {
  const status = getQrStatus();
  res.json(status);
});

// Página para exibir o QR code do WhatsApp
app.get('/qr', requireAdmin, (req, res) => {
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

// Listagem de atendimentos (fila humana e manutenção)
app.get('/tickets', requireAdmin, async (req, res) => {
  // Contatos que pediram atendente
  const humanQueue = await db('whatsapp_contacts')
    .where('needs_human', true)
    .orderBy('updated_at', 'desc')
    .limit(100);

  // Pedidos de manutenção pendentes
  const maintenance = await db('maintenance_requests as mr')
    .leftJoin('whatsapp_contacts as c', 'c.id', 'mr.contact_id')
    .select(
      'mr.id',
      'mr.wa_id',
      'mr.raw_message',
      'mr.status',
      'mr.created_at',
      'c.name',
      'c.push_name',
      'c.number'
    )
    .where('mr.status', 'pending')
    .orderBy('mr.created_at', 'desc')
    .limit(100);

  let humanRows = '';
  for (const c of humanQueue) {
    const displayName = c.name || c.push_name || c.number || c.wa_id;
    humanRows += `
      <tr>
        <td>${displayName}</td>
        <td>${c.number || ''}</td>
        <td>${c.wa_id}</td>
        <td>${c.updated_at ? new Date(c.updated_at).toLocaleString('pt-BR') : ''}</td>
        <td>
          <form method="POST" action="/tickets/${c.id}/resolve-human" style="display:inline;">
            <button type="submit" class="btn btn-sm btn-outline-success">Marcar como atendido</button>
          </form>
        </td>
      </tr>
    `;
  }

  let maintRows = '';
  for (const m of maintenance) {
    const displayName = m.name || m.push_name || m.number || m.wa_id;
    maintRows += `
      <tr>
        <td>${displayName}</td>
        <td>${m.number || ''}</td>
        <td>${m.wa_id}</td>
        <td>${m.raw_message}</td>
        <td>${m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : ''}</td>
        <td>
          <form method="POST" action="/tickets/${m.id}/resolve-maintenance" style="display:inline;">
            <button type="submit" class="btn btn-sm btn-outline-success">Marcar como resolvido</button>
          </form>
        </td>
      </tr>
    `;
  }

  const content = `
  <div class="row">
    <div class="col-lg-12">
      <div class="card mb-4">
        <div class="card-body">
          <h2 class="h5 mb-3">Fila de atendimento humano</h2>
          <div class="table-responsive">
            <table class="table table-sm align-middle table-hover">
              <thead class="table-light">
                <tr>
                  <th>Contato</th>
                  <th>Número</th>
                  <th>WA ID</th>
                  <th>Última atualização</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${humanRows || '<tr><td colspan="5" class="text-center text-muted">Nenhum contato aguardando atendimento.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h2 class="h5 mb-3">Pedidos de manutenção pendentes</h2>
          <div class="table-responsive">
            <table class="table table-sm align-middle table-hover">
              <thead class="table-light">
                <tr>
                  <th>Contato</th>
                  <th>Número</th>
                  <th>WA ID</th>
                  <th>Mensagem</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${maintRows || '<tr><td colspan="6" class="text-center text-muted">Nenhum pedido de manutenção pendente.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;

  res.send(layout({ title: 'Atendimentos', content }));
});

// Marcar atendimento humano como resolvido
app.post('/tickets/:id/resolve-human', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).send('ID inválido');

  await db('whatsapp_contacts')
    .where({ id })
    .update({
      needs_human: false,
      updated_at: db.fn.now()
    });

  res.redirect('/tickets');
});

// Marcar pedido de manutenção como resolvido
app.post('/tickets/:id/resolve-maintenance', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).send('ID inválido');

  await db('maintenance_requests')
    .where({ id })
    .update({
      status: 'done'
    });

  res.redirect('/tickets');
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


// // src/server.js subir para o github
// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const session = require('express-session');
// const runMigrations = require('./migrations');
// const db = require('./db');
// const { createAndSendBroadcast } = require('./broadcastService');
// const { client, syncContacts, getQrStatus } = require('./whatsapp');


// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// app.use(session({
//   secret: process.env.SESSION_SECRET || 'dev-secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     // em produção, ideal usar secure: true (mas só funciona com HTTPS)
//     maxAge: 1000 * 60 * 60 * 8 // 8 horas
//   }
// }));

// function requireAdmin(req, res, next) {
//   if (req.session && req.session.isAdmin) {
//     return next();
//   }
//   return res.redirect('/login');
// }

// app.get('/login', (req, res) => {
//   const content = `
//   <div class="row">
//     <div class="col-md-4 mx-auto">
//       <div class="card">
//         <div class="card-body">
//           <h1 class="h5 mb-3">Login do painel</h1>
//           <form method="POST" action="/login">
//             <div class="mb-3">
//               <label class="form-label">Usuário</label>
//               <input type="text" name="username" class="form-control" required />
//             </div>
//             <div class="mb-3">
//               <label class="form-label">Senha</label>
//               <input type="password" name="password" class="form-control" required />
//             </div>
//             <button type="submit" class="btn btn-primary w-100">Entrar</button>
//           </form>
//         </div>
//       </div>
//     </div>
//   </div>
//   `;
//   res.send(layout({ title: 'Login', content }));
// });

// app.post('/login', (req, res) => {
//   const { username, password } = req.body;

//   const adminUser = process.env.ADMIN_USER || 'admin';
//   const adminPass = process.env.ADMIN_PASS || 'admin';

//   if (username === adminUser && password === adminPass) {
//     req.session.isAdmin = true;
//     return res.redirect('/');
//   }

//   const content = `
//   <div class="row">
//     <div class="col-md-4 mx-auto">
//       <div class="card">
//         <div class="card-body">
//           <h1 class="h5 mb-3">Login do painel</h1>
//           <div class="alert alert-danger">Usuário ou senha inválidos.</div>
//           <form method="POST" action="/login">
//             <div class="mb-3">
//               <label class="form-label">Usuário</label>
//               <input type="text" name="username" class="form-control" required />
//             </div>
//             <div class="mb-3">
//               <label class="form-label">Senha</label>
//               <input type="password" name="password" class="form-control" required />
//             </div>
//             <button type="submit" class="btn btn-primary w-100">Entrar</button>
//           </form>
//         </div>
//       </div>
//     </div>
//   </div>
//   `;
//   res.status(401).send(layout({ title: 'Login', content }));
// });

// app.post('/logout', (req, res) => {
//   req.session.destroy(() => {
//     res.redirect('/login');
//   });
// });

// // Layout base com Bootstrap
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
//           <li class="nav-item">
//             <a class="nav-link" href="/tickets">Atendimentos</a>
//           </li>
//         </ul>
//         <form class="d-flex" action="/sync-contacts" method="GET">
//           <button class="btn btn-outline-light btn-sm" type="submit">
//             Sincronizar contatos
//           </button>
//         </form>
//       </div>
//     </div>
//     <div class="collapse navbar-collapse" id="navbarNav">
//   <ul class="navbar-nav me-auto mb-2 mb-lg-0">
//     <!-- links existentes -->
//   </ul>
//   <form class="d-flex" action="/logout" method="POST">
//     <button class="btn btn-outline-light btn-sm" type="submit">
//       Sair
//     </button>
//   </form>
// </div>
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
// app.get('/', requireAdmin, (req, res) => {
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
//             <div class="col-md-4">
//               <a href="/qr" class="btn btn-outline-danger w-100">Conectar WhatsApp</a>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   </div>`;
//   res.send(layout({ title: 'Painel Chatbot TI', content }));
// });

// // Listagem de contatos com busca, checkboxes e botão de opt-in
// app.get('/contacts', requireAdmin, async (req, res) => {
//   const search = (req.query.search || '').trim();

//   let query = db('whatsapp_contacts')
//     .where('is_group', false);

//   if (search) {
//     query = query.andWhere(function () {
//       this.whereILike('name', `%${search}%`)
//         .orWhereILike('push_name', `%${search}%`)
//         .orWhereILike('number', `%${search}%`);
//     });
//   }

//   const contacts = await query
//     .orderBy('name', 'asc')
//     .limit(500);

//   let rows = '';
//   for (const c of contacts) {
//     const displayName = c.name || c.push_name || c.number || c.wa_id;
//     const optInBadge = c.opt_in
//       ? '<span class="badge bg-success badge-status">Opt-in</span>'
//       : '<span class="badge bg-secondary badge-status">Sem opt-in</span>';

//     const optInButton = `
//       <form method="POST" action="/contacts/${c.id}/toggle-optin" style="display:inline;">
//         <button type="submit" class="btn btn-sm ${c.opt_in ? 'btn-outline-danger' : 'btn-outline-success'}">
//           ${c.opt_in ? 'Remover opt-in' : 'Dar opt-in'}
//         </button>
//       </form>
//     `;

//     rows += `
//       <tr>
//         <td class="text-center">
//           <input type="checkbox" class="form-check-input contact-checkbox" name="contactIds" value="${c.id}" />
//         </td>
//         <td>${displayName}</td>
//         <td>${c.number || ''}</td>
//         <td>${optInBadge} ${optInButton}</td>
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

//       <form class="row g-2 mb-3" method="GET" action="/contacts">
//         <div class="col-md-6">
//           <input type="text" class="form-control" name="search" placeholder="Buscar por nome, perfil ou número..."
//                  value="${search}" />
//         </div>
//         <div class="col-md-6 d-flex gap-2">
//           <button type="submit" class="btn btn-outline-primary">Buscar</button>
//           <a href="/contacts" class="btn btn-outline-secondary">Limpar</a>
//         </div>
//       </form>

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
//     if (checkAll) {
//       checkAll.addEventListener('change', function() {
//         checkboxes.forEach(cb => cb.checked = checkAll.checked);
//       });
//     }

//     const form = document.getElementById('contactsForm');
//     form.addEventListener('submit', function(e) {
//       const selected = Array.from(checkboxes).filter(cb => cb.checked);
//       if (selected.length === 0) {
//         e.preventDefault();
//         alert('Selecione ao menos um contato para criar a campanha.');
//       }
//     });
//   </script>
//   `;
//   res.send(layout({ title: 'Contatos', content }));
// });

// // Alternar opt-in de um contato
// app.post('/contacts/:id/toggle-optin', requireAdmin, async (req, res) => {
//   const id = Number.parseInt(req.params.id, 10);
//   if (Number.isNaN(id)) return res.status(400).send('ID inválido');

//   const contact = await db('whatsapp_contacts').where({ id }).first();
//   if (!contact) return res.status(404).send('Contato não encontrado');

//   const newValue = !contact.opt_in;
//   await db('whatsapp_contacts')
//     .where({ id })
//     .update({ opt_in: newValue, updated_at: db.fn.now() });

//   res.redirect('/contacts');
// });

// // Form de broadcast
// app.get('/broadcast', requireAdmin, (req, res) => {
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
// app.post('/broadcast', requireAdmin, async (req, res) => {
//   const { name, message, onlyOptIn, contactIds } = req.body;

//   let idsArray = [];
//   if (contactIds && contactIds.trim() !== '') {
//     idsArray = contactIds.split(',').map(id => Number.parseInt(id, 10)).filter(n => !Number.isNaN(n));
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
// app.get('/sync-contacts', requireAdmin, async (req, res) => {
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

// // API simples para obter o QR atual e status
// app.get('/api/qr', requireAdmin, (req, res) => {
//   const status = getQrStatus();
//   res.json(status);
// });

// // Página para exibir o QR code do WhatsApp
// app.get('/qr', requireAdmin, (req, res) => {
//   const content = `
//   <div class="row">
//     <div class="col-lg-6 mx-auto">
//       <div class="card">
//         <div class="card-body text-center">
//           <h2 class="h5 mb-3">Conectar WhatsApp</h2>
//           <p class="text-muted">
//             Aponte a câmera do WhatsApp (Aparelhos conectados) para o QR abaixo.
//           </p>
//           <div id="qr-container" class="d-flex justify-content-center my-3">
//             <div id="qrcode"></div>
//           </div>
//           <p id="qr-status" class="text-muted small"></p>
//           <a href="/" class="btn btn-link">Voltar ao painel</a>
//         </div>
//       </div>
//     </div>
//   </div>

//   <!-- Lib simples de QRCode em JS (QRCode.js) via CDN -->
//   <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
//   <script>
//     let qrInstance = null;

//     async function fetchQr() {
//       try {
//         const res = await fetch('/api/qr');
//         const data = await res.json();

//         const statusEl = document.getElementById('qr-status');
//         const qrDiv = document.getElementById('qrcode');

//         if (data.ready) {
//           // Já conectado
//           statusEl.textContent = 'WhatsApp conectado! Você já pode usar o painel normalmente.';
//           qrDiv.innerHTML = '';
//           return;
//         }

//         if (!data.qr) {
//           statusEl.textContent = 'Aguardando QR code do WhatsApp...';
//           qrDiv.innerHTML = '';
//           return;
//         }

//         statusEl.textContent = 'QR code ativo. Escaneie com o app do WhatsApp.';

//         // Desenha / atualiza o QR
//         qrDiv.innerHTML = '';
//         qrInstance = new QRCode(qrDiv, {
//           text: data.qr,
//           width: 256,
//           height: 256,
//         });

//       } catch (err) {
//         console.error(err);
//         const statusEl = document.getElementById('qr-status');
//         statusEl.textContent = 'Erro ao carregar QR. Tente atualizar a página.';
//       }
//     }

//     // Busca inicial
//     fetchQr();
//     // Atualiza a cada 10 segundos (WhatsApp renova o QR periodicamente)
//     setInterval(fetchQr, 10000);
//   </script>
//   `;
//   res.send(layout({ title: 'Conectar WhatsApp', content }));
// });

// // Listagem de atendimentos (fila humana e manutenção)
// app.get('/tickets', requireAdmin, async (req, res) => {
//   // Contatos que pediram atendente
//   const humanQueue = await db('whatsapp_contacts')
//     .where('needs_human', true)
//     .orderBy('updated_at', 'desc')
//     .limit(100);

//   // Pedidos de manutenção pendentes
//   const maintenance = await db('maintenance_requests as mr')
//     .leftJoin('whatsapp_contacts as c', 'c.id', 'mr.contact_id')
//     .select(
//       'mr.id',
//       'mr.wa_id',
//       'mr.raw_message',
//       'mr.status',
//       'mr.created_at',
//       'c.name',
//       'c.push_name',
//       'c.number'
//     )
//     .where('mr.status', 'pending')
//     .orderBy('mr.created_at', 'desc')
//     .limit(100);

//   let humanRows = '';
//   for (const c of humanQueue) {
//     const displayName = c.name || c.push_name || c.number || c.wa_id;
//     humanRows += `
//       <tr>
//         <td>${displayName}</td>
//         <td>${c.number || ''}</td>
//         <td>${c.wa_id}</td>
//         <td>${c.updated_at ? new Date(c.updated_at).toLocaleString('pt-BR') : ''}</td>
//         <td>
//           <form method="POST" action="/tickets/${c.id}/resolve-human" style="display:inline;">
//             <button type="submit" class="btn btn-sm btn-outline-success">Marcar como atendido</button>
//           </form>
//         </td>
//       </tr>
//     `;
//   }

//   let maintRows = '';
//   for (const m of maintenance) {
//     const displayName = m.name || m.push_name || m.number || m.wa_id;
//     maintRows += `
//       <tr>
//         <td>${displayName}</td>
//         <td>${m.number || ''}</td>
//         <td>${m.wa_id}</td>
//         <td>${m.raw_message}</td>
//         <td>${m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : ''}</td>
//         <td>
//           <form method="POST" action="/tickets/${m.id}/resolve-maintenance" style="display:inline;">
//             <button type="submit" class="btn btn-sm btn-outline-success">Marcar como resolvido</button>
//           </form>
//         </td>
//       </tr>
//     `;
//   }

//   const content = `
//   <div class="row">
//     <div class="col-lg-12">
//       <div class="card mb-4">
//         <div class="card-body">
//           <h2 class="h5 mb-3">Fila de atendimento humano</h2>
//           <div class="table-responsive">
//             <table class="table table-sm align-middle table-hover">
//               <thead class="table-light">
//                 <tr>
//                   <th>Contato</th>
//                   <th>Número</th>
//                   <th>WA ID</th>
//                   <th>Última atualização</th>
//                   <th>Ações</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 ${humanRows || '<tr><td colspan="5" class="text-center text-muted">Nenhum contato aguardando atendimento.</td></tr>'}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       <div class="card">
//         <div class="card-body">
//           <h2 class="h5 mb-3">Pedidos de manutenção pendentes</h2>
//           <div class="table-responsive">
//             <table class="table table-sm align-middle table-hover">
//               <thead class="table-light">
//                 <tr>
//                   <th>Contato</th>
//                   <th>Número</th>
//                   <th>WA ID</th>
//                   <th>Mensagem</th>
//                   <th>Data</th>
//                   <th>Ações</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 ${maintRows || '<tr><td colspan="6" class="text-center text-muted">Nenhum pedido de manutenção pendente.</td></tr>'}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   </div>
//   `;

//   res.send(layout({ title: 'Atendimentos', content }));
// });

// // Marcar atendimento humano como resolvido
// app.post('/tickets/:id/resolve-human', requireAdmin, async (req, res) => {
//   const id = Number.parseInt(req.params.id, 10);
//   if (Number.isNaN(id)) return res.status(400).send('ID inválido');

//   await db('whatsapp_contacts')
//     .where({ id })
//     .update({
//       needs_human: false,
//       updated_at: db.fn.now()
//     });

//   res.redirect('/tickets');
// });

// // Marcar pedido de manutenção como resolvido
// app.post('/tickets/:id/resolve-maintenance', requireAdmin, async (req, res) => {
//   const id = Number.parseInt(req.params.id, 10);
//   if (Number.isNaN(id)) return res.status(400).send('ID inválido');

//   await db('maintenance_requests')
//     .where({ id })
//     .update({
//       status: 'done'
//     });

//   res.redirect('/tickets');
// });


// async function start() {
//   await runMigrations();
//   client.initialize();
//   app.listen(PORT, () => {
//     console.log(`Admin rodando em http://localhost:${PORT}`);
//   });
// }

// start().catch((err) => {
//   console.error('Erro ao iniciar aplicação:', err);
// });


