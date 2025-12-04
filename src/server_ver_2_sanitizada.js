// src/server.js
// Segurança e hardening com Express.js
//npm install helmet express-rate-limit express-slow-down csurf cookie-parser
// Atualizado para incluir várias melhorias de segurança e hardening
// além de sanitização básica de entrada e logging de padrões suspeitos
// Mantive a estrutura original e suas funcionalidades principais
// incluindo sessões, autenticação e rotas protegidas
// Adaptei para usar middlewares modernos e boas práticas
// de segurança web com Express.js
// Certifique-se de ajustar conforme suas necessidades específicas
// e testar adequadamente antes de usar em produção.
// Carregamento de variáveis de ambiente
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
// Remove o header X-Powered-By (hardening)
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;
const IN_PROD = process.env.NODE_ENV === 'production';

// --- Segurança / Hardening ---
// Helmet: várias proteções de cabeçalhos HTTP
// app.use(helmet({
//   // você pode ajustar diretivas conforme necessário
// }));

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],

      // 🔥 PERMITE BOOTSTRAP JS E CHART.JS
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // necessário p/ bootstrap + event listeners
        "https://cdn.jsdelivr.net"
      ],
      scriptSrcElem: [
        "'self'",
        "https://cdn.jsdelivr.net"
      ],

      // 🔥 PERMITE BOOTSTRAP CSS
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // necessário p/ bootstrap
        "https://cdn.jsdelivr.net"
      ],
      styleSrcElem: [
        "'self'",
        "https://cdn.jsdelivr.net"
      ],

      // 🔥 PERMITE IMAGENS DO SITE E BASE64
      imgSrc: ["'self'", "data:"],

      // 🔥 NECESSÁRIO PARA QUE O DASHBOARD FUNCIONE
      connectSrc: [
        "'self'",
        "https://cdn.jsdelivr.net"
      ],

      // 🔥 PERMITE SUBMETAR FORMULÁRIO DE LOGIN
      formAction: ["'self'"],

      // 🔥 BLOQUEIA FRAME, MAS SEGURANÇA OK
      frameAncestors: ["'none'"],

      // 🔥 BOA PRÁTICA
      objectSrc: ["'none'"],

      // Evita problemas com Bootstrap fonts
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"]
    }
  })
);

// app.use(helmet.contentSecurityPolicy({
//   directives: {
//     defaultSrc: ["'self'"],
//     scriptSrc: ["'self'"],
//     styleSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' só se precisar
//     imgSrc: ["'self'", "data:"],
//     connectSrc: ["'self'"],
//     objectSrc: ["'none'"],
//     frameAncestors: ["'none'"]
//   }
// }));

// HSTS em produção
if (IN_PROD) {
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
}

// Se estiver atrás de proxy (Cloudflare, nginx), habilite para cookies seguros
if (IN_PROD) app.set('trust proxy', 1);

// Limites de tamanho de payload (protege contra fuzzing com cargas gigantes)
app.use(express.json({ limit: '50kb' })); // ajuste se precisar de payloads maiores
app.use(bodyParser.urlencoded({ extended: true, limit: '50kb' }));
app.use(bodyParser.json({ limit: '50kb' }));

// Cookie parser (necessário para csurf)
app.use(cookieParser());

// Rate limiter global (evita scanner/DoS básicos)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120, // max requests por IP por janela (ajuste conforme tráfego)
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Slowdown global para evitar spam/scanners (Burp Suite, etc.)
const globalSpeed = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 100,
  delayMs: () => 500 // novo comportamento da versão 2
});
app.use(globalSpeed);

// Slowdown para endpoints sensíveis (login, etc)
// const globalSpeed = slowDown({
//   windowMs: 60 * 1000,
//   delayAfter: 100, // comece a atrasar após 100 requests
//   delayMs: 500 // atraso incremental
// });
// app.use(globalSpeed);

// Proteção contra CSRF para rotas POST/PUT/DELETE — somente se sua app usar cookies para sessão
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: 'Strict',
    secure: IN_PROD
  }
});
// Aplicaremos CSRF apenas em rotas que não sejam API públicas (você pode ajustar)
app.use((req, res, next) => {
  // permitir token nas rotas /api/auth (login etc.) — ajuste conforme arquitetura
  const safePaths = ['/api/auth', '/login', '/logout', '/api/whatsapp']; // adaptar
  if (safePaths.some(p => req.path.startsWith(p))) return next();
  return csrfProtection(req, res, next);
});

// Forçar HTTPS em produção
app.use((req, res, next) => {
  if (IN_PROD && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.hostname}${req.originalUrl}`);
  }
  next();
});

// Serve arquivos estáticos de /public
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1d',
  index: false
}));

// Sessão - com cookie seguro em produção
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

// Middleware para bloquear user-agents e padrões conhecidos de scanners/fuzzers
app.use((req, res, next) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  // Strings comuns vindas de ferramentas de teste / scanners
  const blockedUA = /(burp|sqlmap|nikto|fuzz|acunetix|netsparker|owasp|w3af|nessus|scanner|intruder)/i;
  if (blockedUA.test(ua)) {
    return res.status(403).send('Blocked');
  }
  // Bloquear URLs excessivamente longas (fuzzers colocam payloads gigantescos)
  if (req.url && req.url.length > 2000) return res.status(414).send('URI too long');
  next();
});

// Sanitização básica do corpo (remove caracteres nulos, control-chars e %00)
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string') {
      // remove bytes nulos e caracteres de controle perigosos
      obj[k] = v.replace(/\0/g, '').replace(/[\u0000-\u001F]+/g, '');
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

// Middleware de logging simplificado para padrões suspeitos (pode enviar para ELK/Graylog)
app.use((req, res, next) => {
  // Exemplo: logar tentativas de injeção simples
  const payload = JSON.stringify({ url: req.url, body: req.body || {}, query: req.query || {} });
  const suspicious = /(\b(union|select|insert|delete|update|drop|sleep|benchmark)\b)|(<script>)|(\.\.\/)/i;
  if (suspicious.test(payload)) {
    console.warn('Suspected attack pattern detected:', {
      ip: req.ip,
      ua: req.headers['user-agent'],
      url: req.url
    });
    // opcionalmente responder 403 silenciosamente
    return res.status(403).send('Forbidden');
  }
  next();
});

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

// Rota de logout (GET) — destrói sessão
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Erro ao fazer logout.');
    }
    res.redirect('/login');
  });
});

// Páginas protegidas
// app.get('/', (req, res) =>
//   res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
// );

// Middleware para enviar index.html com CSP relaxada (permite inline handlers apenas nesta página)
app.get('/', (req, res) => {
  // CSP relaxada só para index (permite onclick inline)
  const cspRelaxed = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // <-- aqui permitimos inline scripts apenas para index
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspRelaxed);
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ... (mantive suas demais rotas públicas/protegidas como estavam)
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
