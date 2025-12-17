// src/middleware/security.js
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');

function securityMiddleware(app, { IN_PROD }) {
  // Rate limiter
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
  });
  app.use(limiter);

  // Slowdown
  const globalSpeed = slowDown({
    windowMs: 60 * 1000,
    delayAfter: 100,
    delayMs: () => 500
  });
  app.use(globalSpeed);

  // Session (pode ficar aqui ou em outro módulo de infra)
  const session = require('express-session');
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

  // Helmet básico
  app.use(helmet());

  if (IN_PROD) {
    app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
  }

  // Force HTTPS
  app.use((req, res, next) => {
    if (IN_PROD && req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });

  // Block UAs e URLs muito longas
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

  // Sanitização
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string') {
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

  // IDS simples
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
}

function csrfMiddleware(app, { IN_PROD, csurf, helmet }) {
  app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcElem: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrcElem: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"]
    }
  }));

  const csrfProtection = csurf({
    cookie: {
      httpOnly: true,
      sameSite: 'Strict',
      secure: IN_PROD
    }
  });

  // rota de token usando a MESMA instância
  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    const token = req.csrfToken();
    console.log('🔑 CSRF TOKEN GERADO:', token);
    console.log('🔑 COOKIES NA GERAÇÃO:', req.cookies);
    res.json({ csrfToken: token });
  });

  // bypass csrf
  app.use((req, res, next) => {
    // rotas sem CSRF
    if (
      req.path === '/api/auth/login' ||
      req.path === '/api/users/register' ||
      req.path === '/api/subscriptions/manual-confirm' ||
      req.path === '/api/broadcast/send' ||
      req.path === '/api/pix/webhook'      
    ) {
      return next();
    }

    // // para debug de csrf
    // console.log('🔍 CSRF DEBUG:');
    // console.log('  → method:', req.method);
    // console.log('  → path:', req.path);
    // console.log('  → body:', req.body);
    // console.log('  → body._csrf:', req.body?._csrf);
    // console.log('  → cookies:', req.cookies);
    // console.log('---------------------------------');

    return csrfProtection(req, res, next);
  });
  
}

module.exports = {
  securityMiddleware,
  csrfMiddleware
};
