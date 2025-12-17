// public/js/checkout.js funcionando mesmo com as mudanças recentes 14/12/2025
document.addEventListener("DOMContentLoaded", () => {
  let csrfToken = null;
  let lastTxid = null;

  const btnGenerate = document.getElementById("generatePixButton");
  const pixArea = document.getElementById("pixArea");
  const uploadModal = document.getElementById("uploadModal");
  const processingBox = document.getElementById("processingBox");

  async function loadCsrfToken() {
    try {
      const res = await fetch("/api/csrf-token", {
        method: "GET",
        credentials: "same-origin",
      });

      const data = await res.json();
      csrfToken = data.csrfToken;
      console.log("🔐 CSRF carregado (checkout):", csrfToken);
    } catch (err) {
      console.error("Erro ao carregar CSRF:", err);
    }
  }

  // --- Prefill vindo do subscription.js via sessionStorage [web:296]
  function applyPrefill() {
    const savedName = sessionStorage.getItem("checkout_fullName") || "";
    const savedCpf = sessionStorage.getItem("checkout_cpf") || "";
    const savedEmail = sessionStorage.getItem("checkout_email") || "";

    if (savedName) document.getElementById("fullName").value = savedName;
    if (savedCpf) document.getElementById("cpf").value = savedCpf;
    if (savedEmail) document.getElementById("email").value = savedEmail;
  }

  loadCsrfToken();
  applyPrefill();

  const url = new URL(window.location.href);
  const plan = url.searchParams.get("plan");
  const cycle = url.searchParams.get("cycle");

  document.getElementById("selectedPlan").textContent = plan;
  document.getElementById("selectedCycle").textContent = cycle;

  btnGenerate.addEventListener("click", async () => {
    if (!csrfToken) {
      alert("Erro interno: CSRF não carregado.");
      return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const cpf = document.getElementById("cpf").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!fullName || !cpf || !email) {
      alert("Preencha todos os campos.");
      return;
    }

    // trava o botão por 10 min (mesmo se o usuário clicar várias vezes)
    btnGenerate.disabled = true;

    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          plan,
          billing_cycle: cycle,
          fullName,
          cpf,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        btnGenerate.disabled = false; // libera na falha
        alert(data.error || "Erro ao gerar QR Code.");
        return;
      }

      lastTxid = data.txid;

      pixArea.innerHTML = `
        <h3>Pagamento PIX</h3>

        <div class="qr-wrapper">
          <img src="${data.qrCodeImage}" class="qr-image" />
        </div>

        <p>Copiar código:</p>
        <textarea class="pix-code" readonly>${data.payload}</textarea>
        <p>Válido por 10 minutos.</p>

        <button id="openUploadModal" class="upload-btn">Enviar Comprovante de Pagamento</button>
      `;

      document.getElementById("openUploadModal").onclick = () => {
        uploadModal.classList.remove("hidden");
      };

      // libera o botão só depois de 10 minutos (validade do QR)
      setTimeout(() => {
        btnGenerate.disabled = false;
      }, 10 * 60 * 1000); // setTimeout padrão [web:307]
    } catch (err) {
      console.error(err);
      btnGenerate.disabled = false;
      alert("Erro ao gerar QR Code.");
    }
  });

  // ----------- Modal logic -----------
  document.querySelector(".closeModal").onclick = () => {
    uploadModal.classList.add("hidden");
  };

  document.getElementById("sendReceiptButton").onclick = async () => {
    const file = document.getElementById("fileUpload").files[0];

    if (!file) {
      alert("Escolha um arquivo válido.");
      return;
    }

    if (!lastTxid) {
      alert("Gere o QR Code antes de enviar o comprovante.");
      return;
    }

    const formData = new FormData();
    formData.append("receipt", file);
    formData.append("txid", lastTxid);

    const res = await fetch("/api/comprovante/upload-receipt", {
      method: "POST",
      credentials: "same-origin",
      headers: { "CSRF-Token": csrfToken },
      body: formData,
    });

    if (!res.ok) {
      alert("Erro ao enviar comprovante.");
      return;
    }

    // Fecha modal
    uploadModal.classList.add("hidden");

    // Remove QR CODE
    pixArea.innerHTML = "";

    // Mostra status
    processingBox.classList.remove("hidden");
    processingBox.innerHTML = `
      <h3>Analisando seu pagamento...</h3>
      <p>Aguarde <span id="countdown">60</span> segundos...</p>
    `;

    // Inicia contagem de 60 segundos
    let time = 60;
    const countdown = document.getElementById("countdown");

    const interval = setInterval(async () => {
      time--;
      countdown.textContent = time;

      if (time <= 0) {
        clearInterval(interval);

        // rota correta (era /api/confirm/payment no seu snippet)
        await fetch("/api/subscriptions/confirm-payment", {
          method: "POST",
          headers: { "CSRF-Token": csrfToken, "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ txid: lastTxid }),
        });

        processingBox.innerHTML = `
          <h3>Pagamento aprovado!</h3>
          <p>Acesso liberado. Você já pode usar o plano.</p>
        `;

        // redireciona para thankyou.html após um pequeno delay
        setTimeout(() => {
          window.location.href = "/thankyou.html";
        }, 1200); // window.location + setTimeout [web:307]
      }
    }, 1000);
  };
});