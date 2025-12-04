// src/server.js 
require('dotenv').config();
const express = require('express');
const path = require('node:path'); // <-- ADICIONADO
const bodyParser = require('body-parser');
const session = require('express-session');
const runMigrations = require('./database/migrations');
const contactRoutes = require('./routes/contactRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const topicsRoutes = require('./routes/topicsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const promoRoutes = require('./routes/promoRoutes');
const AuthController = require('./controllers/AuthController');
const salesRoutes = require('./routes/salesRoutes');
const assistancesRoutes = require('./routes/assistancesRoutes');
const productRoutes = require('./routes/productRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const reportRoutes = require('./routes/reportRoutes');


const { layout } = require('./utils/layout');
const { syncContacts } = require('./whatsapp/whatsapp');
const { getBotStatus } = require('./whatsapp/client');
const db = require('./database/db');

const app = express();
// Remove o header X-Powered-By
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Serve arquivos estáticos corretamente do /public
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json()); // garantir parser de JSON

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
app.get('/', (req, res) =>
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
app.get('/topics', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'topics.html'))
);
app.get('/promos', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'promos.html'))
);
app.get('/painel', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'painel.html'))
);

app.get('/cadastros', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'cadastros.html'))
);

app.get('/dashboard', requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'))
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

    // TRUNCATE mais eficiente que substitui o .del()
    await db.raw(`TRUNCATE TABLE whatsapp_contacts RESTART IDENTITY CASCADE;`);

    const content = `
      <div class="alert alert-warning">
        <h4>Contatos limpos</h4>
        <p>Tabela <code>whatsapp_contacts</code> foi truncada com sucesso (IDs reiniciados).</p>
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
app.use('/api/topics', requireAdmin, topicsRoutes);
app.use('/api/services', requireAdmin, servicesRoutes);
app.use('/api/promos', requireAdmin, promoRoutes);
app.use('/api/sales', requireAdmin, salesRoutes);
app.use('/api/assistances', requireAdmin, assistancesRoutes);
app.use('/api/products', requireAdmin, productRoutes);
app.use('/api/vendors', requireAdmin, vendorRoutes);
app.use('/api/reports', requireAdmin, reportRoutes);

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
