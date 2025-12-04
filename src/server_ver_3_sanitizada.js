// src/server.js
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
const bcrypt = require("bcrypt");

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
const userRoutes = require('./routes/userRoutes');
const configRoutes = require('./routes/configRoutes');


const { layout } = require('./utils/layout');
const { syncContacts } = require('./whatsapp/whatsapp');
const { getBotStatus } = require('./whatsapp/client');
const db = require('./database/db');

const app = express();
// Remove o header X-Powered-By (hardening)
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;
const IN_PROD = process.env.NODE_ENV === 'production';

// ---------- Basic helmet (without CSP) ----------
// We'll add a tailored CSP middleware later so we can allow a relaxed CSP
// on the root (/) page only.
app.use(helmet()); // apply default safe headers (except CSP which we customize)

// If behind proxy (Cloudflare, nginx), enable trust proxy to let secure cookies/HSTS work
if (IN_PROD) app.set('trust proxy', 1);

// ---------- Static files ----------
// index: false -> we serve index manually so we can set relaxed CSP only for it
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1d',
  index: false
}));

// ---------- Request parsing & limits ----------
app.use(express.json({ limit: '50kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50kb' }));
app.use(bodyParser.json({ limit: '50kb' }));
app.use(cookieParser());

// ---------- Rate limiter + Slowdown ----------
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

const globalSpeed = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 100,
  delayMs: () => 500
});
app.use(globalSpeed);

// ---------- Session ----------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure: IN_PROD,
    sameSite: 'Strict'
  }
}));

// ---------- CSP: Relaxed only for root (/) to allow your inline onclick handlers ----------
// Serve index.html with a relaxed CSP (allows 'unsafe-inline' only on this page).
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

// ---------- Global CSP for the rest of the app (restrictive but allows CDN assets used) ----------
// app.use(helmet.contentSecurityPolicy({
//   useDefaults: true,
//   directives: {
//     defaultSrc: ["'self'"],
//     scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // 'unsafe-inline' kept for some inline libs you may have; remove if you fully migrate
//     scriptSrcElem: ["'self'", "https://cdn.jsdelivr.net"],
//     styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
//     styleSrcElem: ["'self'", "https://cdn.jsdelivr.net"],
//     imgSrc: ["'self'", "data:"],
//     connectSrc: ["'self'", "https://cdn.jsdelivr.net", "/js"],
//     formAction: ["'self'"],
//     frameAncestors: ["'none'"],
//     objectSrc: ["'none'"],
//     fontSrc: ["'self'", "https://cdn.jsdelivr.net"]
//   }
// }));

app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    scriptSrcElem: ["'self'", "https://cdn.jsdelivr.net", "/js"], // Adicione "/js" aqui
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    styleSrcElem: ["'self'", "https://cdn.jsdelivr.net"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'", "https://cdn.jsdelivr.net", "/js"], // Inclua se fetch usa este caminho
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net"]
  }
}));

// ---------- HSTS (production) ----------
if (IN_PROD) {
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
}

// // ---------- CSRF protection ----------
// // Only apply CSRF to state-changing requests and don't exclude broad paths.
// // Exempt: safe HTTP methods (GET/HEAD/OPTIONS) and the login POST endpoint.
// const csrfProtection = csurf({
//   cookie: {
//     httpOnly: true,
//     sameSite: 'Strict',
//     secure: IN_PROD
//   }
// });

// ---------- CSRF PROTECTION (CORRIGIDO) ----------

// Gera o middleware do CSRF
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: 'Strict',
    secure: IN_PROD
  }
});

// Sempre gerar token para GET (necessário para o front capturar no cookie)
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    try {
      csrfProtection(req, res, () => {
        // expõe o token num cookie legível pelo front
        res.cookie("XSRF-TOKEN", req.csrfToken(), {
          sameSite: 'Strict',
          secure: IN_PROD
        });
        next();
      });
    } catch (e) {
      next();
    }
    return;
  }

  // Permite login e registro sem CSRF
  if (
    (req.method === 'POST' && req.path === '/api/auth/login') ||
    (req.method === 'POST' && req.path === '/api/users/register')
  ) {
    return next();
  }

  // Para qualquer POST/PUT/DELETE exigimos CSRF token
  return csrfProtection(req, res, next);
});

// Middleware to apply CSRF protection conditionally
app.use((req, res, next) => {
  // allow safe methods through
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // allow the login POST (so public login works without a CSRF token)
  if (req.method === 'POST' && req.path === '/api/auth/login') return next();
  if (req.method === 'POST' && req.path === '/api/users/register') return next();

  // otherwise apply CSRF protection
  return csrfProtection(req, res, next);
});

// ---------- Force HTTPS in production (works when behind a proxy that sets x-forwarded-proto) ----------
app.use((req, res, next) => {
  if (IN_PROD && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.hostname}${req.originalUrl}`);
  }
  next();
});

// ---------- Middleware: block suspicious user-agents & long URLs ----------
app.use((req, res, next) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const blockedUA = /(burp|sqlmap|nikto|fuzz|acunetix|netsparker|owasp|w3af|nessus|scanner|intruder)/i;
  if (blockedUA.test(ua)) {
    console.warn('Blocked suspicious UA:', ua, 'from', req.ip);
    return res.status(403).send('Blocked');
  }
  if (req.url && req.url.length > 2000) return res.status(414).send('URI too long');
  next();
});

// ---------- Sanitization: remove nulls and harmful control-chars but keep LF/CR/TAB ----------
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string') {
      // Remove NUL and control characters except TAB(9), LF(10) and CR(13)
      obj[k] = v.replace(/\0/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, '');
    } else if (typeof v === 'object') {
      sanitizeObject(v);
    }
  }
  return obj;
}
app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  next();
});

// ---------- Simple IDS logging for suspicious payloads ----------
app.use((req, res, next) => {
  const payload = JSON.stringify({ url: req.url, body: req.body || {}, query: req.query || {} });
  const suspicious = /(\b(union|select|insert|delete|update|drop|sleep|benchmark)\b)|(<script>)|(\.\.\/)/i;
  if (suspicious.test(payload)) {
    console.warn('Suspected attack pattern detected:', {
      ip: req.ip,
      ua: req.headers['user-agent'],
      url: req.url
    });
    return res.status(403).send('Forbidden');
  }
  next();
});

// // ---------- Auth helpers ----------
// function requireAdmin(req, res, next) {
//   if (req.session && req.session.isAdmin) return next();
//   res.redirect('/login');
// }

// function requireAdmin(req, res, next) {
//   if (req.session && req.session.isAdmin) return next();
//   return res.redirect('/login');
// }

// ---------- Auth helpers ----------
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/login');
}

// function requireAuth(req, res, next) {
//   if (!req.session.userId) return res.redirect('/login');
  
//   // Admins sempre passam
//   if (req.session.isAdmin) return next();
  
//   // Assinantes: verifica plano
//   if (!req.session.accountType || 
//       (req.session.accountType !== 'free' && req.session.accountType === 'expired')) {
//     return res.redirect('/login?error=expired');
//   }
//   next();
// }

// Verifica autenticação E expiração do trial
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  
  if (req.session.isAdmin) return next(); // Admin sempre passa
  
  // Verifica se trial expirou
  if (req.session.subscriptionExpires && 
      new Date(req.session.subscriptionExpires) < new Date()) {
    return res.redirect('/login?error=trial_expired');
  }
  
  next();
}

// Libera acesso baseado no tipo de conta
function restrictTo(...allowedTypes) {
  return (req, res, next) => {
    if (req.session.isAdmin) return next(); // Admin sempre
    
    const accountType = req.session.accountType || 'free';
    
    // DURING TRIAL: free age as 'professional'
    const effectiveType = (accountType === 'free' && req.session.subscriptionExpires) 
      ? 'professional' 
      : accountType;
    
    if (!allowedTypes.includes(effectiveType)) {
      return res.status(403).send(`
        <div class="alert alert-danger">
          <h4>Acesso negado</h4>
          <p>Upgrade necessário para esta funcionalidade.</p>
          <a href="/planos" class="btn btn-primary">Ver planos</a>
        </div>
      `);
    }
    
    next();
  };
}

// ---------- Auth routes ----------
//app.post('/login', AuthController.login);
//app.post('/logout', AuthController.logout);

// serve login page
app.get('/login', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'))
);

// logout (GET) destroy session
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
app.get('/broadcast', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'broadcast.html'))
);
app.get('/tickets', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'tickets.html'))
);
app.get('/qr', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'qr.html'))
);
app.get('/topics', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'topics.html'))
);
app.get('/promos', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'promos.html'))
);
app.get('/painel', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'painel.html'))
);
app.get('/cadastros', requireAuth, restrictTo('starter', 'professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'cadastros.html'))
);
app.get('/dashboard', requireAuth, restrictTo('professional', 'enterprise') , (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'))
);
app.get('/config', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'config.html'))
);
app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'cadastro.html'));
});

// ---------- Sync contacts route ----------
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

// ---------- Admin action: clear contacts ----------
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

// ---------- Routers ----------
app.use('/api/auth', authRoutes);

app.use('/api/contacts', requireAuth, contactRoutes);
app.use('/api/broadcast', requireAuth, broadcastRoutes);
app.use('/api/tickets', requireAuth, ticketRoutes);
app.use('/api/whatsapp', requireAuth, whatsappRoutes);
app.use('/api/topics', requireAuth, topicsRoutes);
app.use('/api/services', requireAuth, servicesRoutes);
app.use('/api/promos', requireAuth, promoRoutes);
app.use('/api/sales', requireAuth, salesRoutes);
app.use('/api/assistances', requireAuth, assistancesRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/vendors', requireAuth, vendorRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/config', requireAuth, configRoutes);

// ---------- Start ----------
async function start() {
  await runMigrations();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin rodando na porta ${PORT}`);
    console.log(`Acesso local:   http://localhost:${PORT}`);
    console.log(`Acesso externo: http://whatsappbot.ddns.net:${PORT}`);
  });
}

start().catch(err => console.error('Erro ao iniciar aplicação:', err));
