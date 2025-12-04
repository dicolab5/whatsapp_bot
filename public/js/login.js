console.log("🚀 LOGIN SCRIPT INICIADO");

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM carregado");

  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const is2FA = params.get("2fa");

  const loginForm = document.getElementById("loginForm");
  const twoFactorForm = document.getElementById("twoFactorForm");
  const msg = document.getElementById("errorMessage");

  // Força o formulário 2FA
  if (is2FA === "required") {
    console.log("🔐 Mostrando formulário de 2FA...");
    if (loginForm) loginForm.style.display = "none";
    if (twoFactorForm) twoFactorForm.style.display = "block";
  }

  // Exibir erros
  if (error && msg) {
    msg.style.display = "block";
    msg.className = "alert alert-danger mt-3";

    const messages = {
      invalid: "Credenciais inválidas.",
      invalid_token: "Código 2FA inválido.",
      expired: 'Assinatura expirada. <a href="/planos">Renovar plano</a>',
      trial_expired: 'Seu período de avaliação terminou. <a href="/planos">Ativar plano</a>',
      server: "Ocorreu um erro interno. Tente novamente."
    };

    msg.innerHTML = messages[error] || "Erro no servidor.";
  }
});
