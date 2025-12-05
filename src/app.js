// src/app.js   
require('dotenv').config();
const express = require('express');
const path = require('node:path');
const bodyParser = require('body-parser');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');

const contactRoutes = require('./routes/contactRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const topicsRoutes = require('./routes/topicsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const promoRoutes = require('./routes/promoRoutes');
const salesRoutes = require('./routes/salesRoutes');
const assistancesRoutes = require('./routes/assistancesRoutes');
const productRoutes = require('./routes/productRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const configRoutes = require('./routes/configRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');


const { layout } = require('./utils/layout');
const { syncContacts } = require('./whatsapp/whatsapp');
const { getBotStatus } = require('./whatsapp/client');
const db = require('./database/db');

const { requireAuth, restrictTo } = require('./middlewares/auth');
const { securityMiddleware, csrfMiddleware } = require('./middlewares/security');

const app = express();

// Necessário para funcionar atrás do ngrok, proxy, nginx etc.
app.set('trust proxy', 1);

const IN_PROD = process.env.NODE_ENV === 'production';

// -------- Básico --------
app.disable('x-powered-by');
if (IN_PROD) app.set('trust proxy', 1);

// Static
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1d',
  index: false
}));

// Parsing
app.use(express.json({ limit: '50kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50kb' }));
app.use(bodyParser.json({ limit: '50kb' }));
app.use(cookieParser());

// Segurança genérica (rate limit, slowdown, sanitização, IDS, HTTPS, etc)
securityMiddleware(app, { IN_PROD });

// CSP + CSRF
csrfMiddleware(app, { IN_PROD, csurf, helmet });

// -------- Páginas públicas (HTML) --------
app.get('/', (req, res) => {
  const cspRelaxed = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "script-src-elem 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src-elem 'self' https://cdn.jsdelivr.net",
    "img-src 'self' data:",
    "connect-src 'self' https://cdn.jsdelivr.net",
    "font-src 'self' https://cdn.jsdelivr.net",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join('; ');
  res.setHeader('Content-Security-Policy', cspRelaxed);
  return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Rota para cadastro
app.get('/cadastro', (req, res) => {
  const cspRelaxed = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self' https://cdn.jsdelivr.net",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join('; ');
  res.setHeader("Content-Security-Policy", cspRelaxed);
  return res.sendFile(path.join(__dirname, '..', 'public', 'cadastro.html'));
});



// Rota para login com captura de plano desejado
app.get('/login', (req, res) => {
  // Se veio com ?plan=... guarda na sessão
  if (req.query.plan) {
    req.session.afterLoginPlan = req.query.plan; // starter|professional|enterprise
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Rota para logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Erro ao fazer logout.');
    res.redirect('/login');
  });
});


// ---------- Protected pages ----------
app.get('/contacts', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'contacts.html'))
);

// Rota para página de transmissões
app.get('/broadcast', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'broadcast.html'))
);

// Rota para página de tickets
app.get('/tickets', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'tickets.html'))
);

// Rota para página de QR Code
app.get('/qr', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'qr.html'))
);

// Rota para página de tópicos
app.get('/topics', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'topics.html'))
);

// Rota para página de serviços
app.get('/promos', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'promos.html'))
);

// Rota para página de painel
app.get('/painel', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'painel.html'))
);

//  Rota para página de cadastros
app.get('/cadastros', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'cadastros.html'))
);

//  Rota para página de dashboard
app.get('/dashboard', requireAuth, restrictTo('professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'))
);

// Rota para página de configuração
app.get('/config', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'config.html'))
);

// Rota para página de cadastro
app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'cadastro.html'));
});

// Rota para página de cadastro
app.get('/privacity', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'privacity.html'));
});

// Rota para página de assinatura com auth
app.get(
  '/subscription',
  requireAuth,
  (req, res) =>
    res.sendFile(path.join(__dirname, '..', 'public', 'subscription.html'))
);

// -------- Rota para obter dados do usuário autenticado --------

app.get('/api/me', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'não autenticado' });
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
  });
});

// -------- Rotas especiais (sync / admin) --------
app.get('/sync-contacts', requireAuth, async (req, res) => {
  try {
    const botStatus = getBotStatus();
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

app.post('/admin/clear-contacts', requireAuth, async (req, res) => {
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

    await db.raw(`TRUNCATE TABLE whatsapp_contacts RESTART IDENTITY CASCADE;`);

    const content = `
      <div class="alert alert-warning">
        <h4>Contatos limpos</h4>
        <p>Tabela de>whatsapp_contacts</code> foi truncada com sucesso (IDs reiniciados).</p>
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

// -------- API Routers (REST) --------
app.use('/api/auth', authRoutes);

app.use('/api/contacts',     requireAuth, contactRoutes);
app.use('/api/broadcast',    requireAuth, broadcastRoutes);
app.use('/api/tickets',      requireAuth, ticketRoutes);
app.use('/api/whatsapp',     requireAuth, whatsappRoutes);
app.use('/api/topics',       requireAuth, topicsRoutes);
app.use('/api/services',     requireAuth, servicesRoutes);
app.use('/api/promos',       requireAuth, promoRoutes);
app.use('/api/sales',        requireAuth, salesRoutes);
app.use('/api/assistances',  requireAuth, assistancesRoutes);
app.use('/api/products',     requireAuth, productRoutes);
app.use('/api/vendors',      requireAuth, vendorRoutes);
app.use('/api/reports',      requireAuth, reportRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/config',       requireAuth, configRoutes);
//app.use('/api/subscriptions', requireAuth, subscriptionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

module.exports = app;
    