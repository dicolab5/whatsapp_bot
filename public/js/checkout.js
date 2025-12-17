// public/js/checkout.js
document.addEventListener("DOMContentLoaded", () => {
  let csrfToken = null;
  let lastTxid = null;

  let countdownInterval = null;
  let pollInterval = null;
  let expiresAt = 0;

  const btnGenerate = document.getElementById("generatePixButton");
  const pixArea = document.getElementById("pixArea");

  function stopTimers() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  function mmss(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  async function loadCsrfToken() {
    const res = await fetch("/api/csrf-token", { method: "GET", credentials: "same-origin" });
    const data = await res.json();
    csrfToken = data.csrfToken;
  }

  function applyPrefill() {
    const savedName = sessionStorage.getItem("checkout_fullName") || "";
    const savedCpf = sessionStorage.getItem("checkout_cpf") || "";
    const savedEmail = sessionStorage.getItem("checkout_email") || "";
    if (savedName) document.getElementById("fullName").value = savedName;
    if (savedCpf) document.getElementById("cpf").value = savedCpf;
    if (savedEmail) document.getElementById("email").value = savedEmail;
  }

  function resetUI(msg = "") {
    stopTimers();
    lastTxid = null;
    btnGenerate.disabled = false;
    pixArea.innerHTML = msg ? `<p>${msg}</p>` : "";
  }

  async function pollStatus() {
    if (!lastTxid) return;

    try {
      const res = await fetch(`/api/subscriptions/status?txid=${encodeURIComponent(lastTxid)}`, {
        method: "GET",
        credentials: "same-origin"
      });

      if (!res.ok) return;
      const data = await res.json();

      if (data?.status === "active") {
        stopTimers();
        pixArea.innerHTML = `<h3>Pagamento confirmado!</h3><p>Redirecionando...</p>`;
        setTimeout(() => (window.location.href = "/thankyou.html"), 600);
      }
    } catch (e) {
      // não interrompe fluxo por falha temporária
      console.error("Polling error:", e);
    }
  }

  function startCountdown10min() {
    expiresAt = Date.now() + 10 * 60 * 1000;

    countdownInterval = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      const el = document.getElementById("pixCountdown");
      if (el) el.textContent = mmss(remainingSec);

      if (remainingSec <= 0) {
        // expirou: some QR, para polling, libera botão
        resetUI("Tempo expirado. Gere um novo QR Code para tentar novamente.");
      }
    }, 1000);
  }

  function startPolling() {
    pollStatus(); // primeira checagem imediata
    pollInterval = setInterval(pollStatus, 3000); // a cada 3s
  }

  (async () => {
    try { await loadCsrfToken(); } catch (e) { console.error("CSRF load failed:", e); }
    applyPrefill();

    const url = new URL(window.location.href);
    const plan = url.searchParams.get("plan");
    const cycle = url.searchParams.get("cycle");

    document.getElementById("selectedPlan").textContent = plan || "-";
    document.getElementById("selectedCycle").textContent = cycle || "-";

    btnGenerate.addEventListener("click", async () => {
      if (!csrfToken) return alert("Erro interno: CSRF não carregado.");
      if (!plan || !cycle) return alert("Plano/ciclo ausentes na URL.");

      const fullName = document.getElementById("fullName").value.trim();
      const cpf = document.getElementById("cpf").value.trim();
      const email = document.getElementById("email").value.trim();
      if (!fullName || !cpf || !email) return alert("Preencha todos os campos.");

      btnGenerate.disabled = true;
      stopTimers();

      try {
        const res = await fetch("/api/subscriptions/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken
          },
          credentials: "same-origin",
          body: JSON.stringify({
            plan,
            billing_cycle: cycle,
            fullName,
            cpf,
            email
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          btnGenerate.disabled = false;
          return alert(data.error || "Erro ao gerar QR Code.");
        }

        lastTxid = data.txid;

        pixArea.innerHTML = `
          <h3>Pagamento PIX</h3>
          <div class="qr-wrapper">
            <img src="${data.qrCodeImage}" class="qr-image" />
          </div>
          <p>Copiar código:</p>
          <textarea class="pix-code" readonly>${data.payload}</textarea>
          <p>Tempo restante: <strong id="pixCountdown">10:00</strong></p>
          <p>Aguardando confirmação automática do pagamento...</p>
        `;

        startCountdown10min();
        startPolling();
      } catch (err) {
        console.error(err);
        btnGenerate.disabled = false;
        alert("Erro ao gerar QR Code.");
      }
    });
  })();
});
