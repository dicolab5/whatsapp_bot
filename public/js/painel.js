// public/js/painel.js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) return;
    const me = await res.json();

      // Mostrar username no header
      const navBrand = document.querySelector('.navbar-brand');
      if (navBrand && me.username) {
          navBrand.textContent = `Painel Chatbot TI - ${me.username}`;
      }
    // const navBrand = document.querySelector('.navbar-brand');
    // if (navBrand && me.username) {
    //   navBrand.textContent = `Painel Chatbot TI - ${me.username}`;
    // }

    //ATENÇÃO!!!!! Descomentar se parar de funcionar alguma coisa referente ao qrcode
    // // Ajustar links para incluir userId na URL, se quiser
    // const qrLink = document.querySelector('a[href="/qr"]');
    // if (qrLink && me.id) {
    //   qrLink.href = `/api/whatsapp/qr/${me.id}`;
    // }

    const syncLink = document.querySelector('a[href="/sync-contacts"]');
    if (syncLink && me.id) {
      syncLink.href = `/api/whatsapp/sync-contacts/${me.id}`;
    }
  } catch (e) {
    console.error(e);
  }
});
