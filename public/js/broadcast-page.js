document.addEventListener('DOMContentLoaded', () => {
  // Suponha que você receba os IDs de contatos selecionados via query string ou API se necessário.
  // Aqui apenas mostra info simples do broadcast conforme encontrado no HTML original.
  const infoTextEl = document.getElementById('broadcastInfoText');
  const idsInput = document.getElementById('idsInput');
  const urlParams = new URLSearchParams(window.location.search);
  const contactIds = urlParams.get('contactIds') ? urlParams.get('contactIds').split(',') : [];

  // Atualiza texto informativo
  if (contactIds.length > 0) {
    infoTextEl.innerHTML = `Esta campanha será enviada para <strong>${contactIds.length}</strong> contato(s) selecionado(s).`;
    idsInput.value = contactIds.join(',');
  } else {
    infoTextEl.textContent = 'Se nenhum contato for selecionado, será usado o filtro padrão (apenas opt-in, até o limite configurado).';
  }

  // O formulário POST funciona normalmente; se quiser AJAX, pode interceptar aqui.
  // document.getElementById('broadcastForm').onsubmit = function(e) { ... }
});
