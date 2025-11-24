require('dotenv').config();
const express = require('express');
const path = require('path'); // <-- ADICIONADO
const bodyParser = require('body-parser');
const session = require('express-session');
const runMigrations = require('./database/migrations');
const contactRoutes = require('./routes/contactRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const AuthController = require('./controllers/AuthController');
const { layout } = require('./utils/layout');
const { getBotStatus, syncContacts } = require('./whatsapp/whatsapp');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve arquivos estáticos corretamente do /public
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/login');
}

// Rota de login via POST para processar o formulário
app.post('/login', AuthController.login);

// Rota de logout via POST
app.post('/logout', AuthController.logout);

// Páginas principais servidas corretamente
app.get('/login', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'))
);

// Rota de logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Erro ao fazer logout.');
    }
    res.redirect('/login');
  });
});

// Páginas protegidas
app.get('/', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
);
app.get('/contacts', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'contacts.html'))
);
app.get('/broadcast', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'broadcast.html'))
);
app.get('/tickets', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'tickets.html'))
);
app.get('/qr', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'qr.html'))
);

// Página de sincronização de contatos com feedback detalhado
app.get('/sync-contacts', requireAdmin, async (req, res) => {
  try {
    const botStatus = getBotStatus(); // Exemplo: função que retorna status do dispositivo
    if (!botStatus.ready) {
      const content = `
        <div class="alert alert-warning">
          <h4>Dispositivo desconectado</h4>
          <p>A sincronização não pôde ser realizada pois o dispositivo não está conectado.</p>
          <a href="/" class="btn btn-primary">Voltar ao painel</a>
        </div>`;
      return res.send(layout({ title: 'Sincronização impossível', content }));
    }

    await syncContacts();
    const content = `
      <div class="alert alert-success">
        <h4>Sincronização iniciada</h4>
        <p>Veja os logs no servidor para detalhes.</p>
        <a href="/contacts" class="btn btn-primary">Ver contatos</a>
      </div>`;
    res.send(layout({ title: 'Sincronização', content }));

  } catch (err) {
    const content = `
      <div class="alert alert-danger">
        <h4>Erro na sincronização</h4>
        <p>${err.message}</p>
        <a href="/" class="btn btn-primary">Voltar ao painel</a>
      </div>`;
    res.status(500).send(layout({ title: 'Erro', content }));
  }
});

// Rota para limpar todos os contatos com feedback detalhado
app.post('/admin/clear-contacts', requireAdmin, async (req, res) => {
  try {
    const count = await db('whatsapp_contacts').count('id as total').first();
    if (!count.total) {
      const content = `
        <div class="alert alert-info">
          <h4>Sem contatos para remover</h4>
          <p>A tabela de contatos já está vazia.</p>
          <a href="/" class="btn btn-primary">Voltar ao painel</a>
        </div>`;
      return res.send(layout({ title: 'Nada para remover', content }));
    }

    await db('whatsapp_contacts').del();

    const content = `
      <div class="alert alert-warning">
        <h4>Contatos limpos</h4>
        <p>Todos os contatos foram removidos da tabela <code>whatsapp_contacts</code>.</p>
        <a href="/sync-contacts" class="btn btn-primary">Sincronizar contatos novamente</a>
        <a href="/" class="btn btn-link">Voltar ao painel</a>
      </div>`;
    res.send(layout({ title: 'Contatos limpos', content }));

  } catch (err) {
    const content = `
      <div class="alert alert-danger">
        <h4>Erro ao limpar contatos</h4>
        <p>${err.message}</p>
        <a href="/" class="btn btn-primary">Voltar ao painel</a>
      </div>`;
    res.status(500).send(layout({ title: 'Erro', content }));
  }
});

// Autenticação via controller/rotas
app.use('/api/auth', authRoutes);

// APIs usando os routers e o middleware de admin
app.use('/api/contacts', requireAdmin, contactRoutes);
app.use('/api/broadcast', requireAdmin, broadcastRoutes);
app.use('/api/tickets', requireAdmin, ticketRoutes);
app.use('/api/whatsapp', requireAdmin, whatsappRoutes);

// Inicialização
async function start() {
  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin rodando na porta ${PORT}`);
    console.log(`Acesso local:   http://localhost:${PORT}`);
    console.log(`Acesso externo: http://whatsappbot.ddns.net:${PORT}`);
  });
}
start().catch(err => console.error('Erro ao iniciar aplicação:', err));
