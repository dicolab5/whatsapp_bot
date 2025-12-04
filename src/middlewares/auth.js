// src/middleware/auth.js
const db = require("../database/db");

/**
 * Middleware principal de autenticação
 * - Garante que existe sessão
 * - Carrega user do banco automaticamente quando necessário
 * - Verifica expiração do plano
 * - Permite Admin sempre
 */
async function requireAuth(req, res, next) {
  try {
    // Sem sessão → redireciona
    if (!req.session.userId) return res.redirect("/login");

    // Se os dados do usuário não estão na sessão → carrega do banco
    if (
      !req.session.accountType ||
      !req.session.subscriptionExpires ||
      req.session.isAdmin === undefined
    ) {
      const user = await db("users")
        .where("id", req.session.userId)
        .first();

      if (!user) {
        req.session.destroy(() => {});
        return res.redirect("/login");
      }

      // Cache seguro na sessão
      req.session.accountType = user.account_type;
      req.session.billingCycle = user.billing_cycle;
      req.session.subscriptionExpires = user.subscription_expires;
      req.session.isAdmin = user.is_admin === true || user.is_admin === 1;
    }

    // Admin nunca tem bloqueio
    if (req.session.isAdmin) return next();

    // Verifica expiração
    if (
      req.session.subscriptionExpires &&
      new Date(req.session.subscriptionExpires) < new Date()
    ) {
      return res.redirect("/login?error=trial_expired");
    }

    next();
  } catch (err) {
    console.error("Erro em requireAuth:", err);
    return res.redirect("/login?error=server");
  }
}

/**
 * Middleware para restringir rotas por tipo de conta
 * Exemplo: restrictTo("professional", "premium")
 */
function restrictTo(...allowedTypes) {
  return (req, res, next) => {
    // Admin sempre tem permissão
    if (req.session.isAdmin) return next();

    const accountType = req.session.accountType || "free";

    // Durante o trial, free age como professional
    const effectiveType =
      accountType === "free" && req.session.subscriptionExpires
        ? "professional"
        : accountType;

    if (!allowedTypes.includes(effectiveType)) {
      return res.status(403).send(`
        <div class="alert alert-danger">
          <h4>Acesso negado</h4>
          <p>Você precisa fazer upgrade do plano para acessar esta funcionalidade.</p>
          <a href="/planos" class="btn btn-primary mt-2">Ver Planos</a>
        </div>
      `);
    }

    next();
  };
}

module.exports = { requireAuth, restrictTo };
