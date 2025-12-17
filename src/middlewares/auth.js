// src/middleware/auth.js  
const db = require('../database/db');  // ← ADICIONE esta linha
const path = require('node:path');


async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  
  if (!req.session.accountType || !req.session.subscriptionExpires) {
    try {
      const user = await db('users').where('id', req.session.userId).first();
      if (!user) return res.redirect('/login');
      
      req.session.accountType = user.account_type;
      req.session.billingCycle = user.billing_cycle;
      req.session.subscriptionExpires = user.subscription_expires;
      req.session.isAdmin = user.is_admin;
    } catch (err) {
      console.error('Erro ao carregar user no middleware:', err);
      return res.redirect('/login');
    }
  }

  if (req.session.isAdmin) return next();

  const accountType = req.session.accountType || 'free';

  // Só checa expiração se NÃO for free
  if (accountType !== 'free' && req.session.subscriptionExpires) {
    const expires = new Date(req.session.subscriptionExpires);
    if (!Number.isNaN(expires.getTime()) && expires < new Date()) {
      return res.redirect('/login?error=trial_expired');
    }
  }

  next();
}


// async function requireAuth(req, res, next) {
//   if (!req.session.userId) return res.redirect('/login');
  
//   // Se não tem dados do plano na sessão, carrega do banco
//   if (!req.session.accountType || !req.session.subscriptionExpires) {
//     try {
//       const user = await db('users').where('id', req.session.userId).first();
//       if (!user) return res.redirect('/login');
      
//       req.session.accountType = user.account_type;
//       req.session.billingCycle = user.billing_cycle;
//       req.session.subscriptionExpires = user.subscription_expires;
//       req.session.isAdmin = user.is_admin;
//     } catch (err) {
//       console.error('Erro ao carregar user no middleware:', err);
//       return res.redirect('/login');
//     }
//   }

//   // Admin sempre passa
//   if (req.session.isAdmin) return next();

//   // Verifica expiração do trial/plano
//   if (req.session.subscriptionExpires &&
//       new Date(req.session.subscriptionExpires) < new Date()) {
//     return res.redirect('/login?error=trial_expired');
//   }

//   next();
// }

function restrictTo(...allowedTypes) {
  return (req, res, next) => {
    if (req.session.isAdmin) return next();

    const accountType = req.session.accountType || 'free';

    const effectiveType =
      (accountType === 'free' && req.session.subscriptionExpires)
        ? 'professional'
        : accountType;

    if (!allowedTypes.includes(effectiveType)) {
      return res.status(403).sendFile(
        path.join(__dirname, '..', '..', 'public', 'upgrade.html')
      );
    }

    next();
  };
}


// function restrictTo(...allowedTypes) {
//   return (req, res, next) => {
//     if (req.session.isAdmin) return next();

//     const accountType = req.session.accountType || 'free';

//     // DURING TRIAL: free users age as 'professional'
//     const effectiveType = (accountType === 'free' && req.session.subscriptionExpires) 
//       ? 'professional' 
//       : accountType;

//     if (!allowedTypes.includes(effectiveType)) {
//       return res.status(403).send(`
//         <div class="alert alert-danger">
//           <h4>Acesso negado</h4>
//           <p>Upgrade necessário para esta funcionalidade.</p>
//           <a href="/planos" class="btn btn-primary">Ver planos</a>
//         </div>
//       `);
//     }

//     next();
//   };
// }

module.exports = {
  requireAuth,
  restrictTo
};

