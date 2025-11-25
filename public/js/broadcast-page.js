// // public/js/broadcast-page.js
document.addEventListener('DOMContentLoaded', () => {
  const infoTextEl = document.getElementById('broadcastInfoText');
  const idsInput = document.getElementById('idsInput');
  const savedSelect = document.getElementById('savedBroadcasts');
  const form = document.getElementById('broadcastForm');

  const urlParams = new URLSearchParams(window.location.search);
  const contactIds = urlParams.get('contactIds') ? urlParams.get('contactIds').split(',') : [];
  idsInput.value = contactIds.join(','); // Preenche input oculto como "1,2,3"


  if (contactIds.length > 0) {
    infoTextEl.innerHTML = `Esta campanha será enviada para <strong>${contactIds.length}</strong> contato(s) selecionado(s).`;
    idsInput.value = contactIds.join(',');
  } else {
    infoTextEl.textContent = 'Se nenhum contato for selecionado, será usado o filtro padrão (apenas opt-in, até o limite configurado).';
  }

  // Carregar campanhas salvas do backend
  fetch('/api/broadcast')
    .then(res => res.json())
    .then(broadcasts => {
      broadcasts.forEach(bc => {
        const option = document.createElement('option');
        option.value = bc.id;
        option.textContent = bc.name;
        option.dataset.message = bc.message;
        option.dataset.imageUrl = bc.image_url || '';
        savedSelect.appendChild(option);
      });
    })
    .catch(console.error);

  // Ao selecionar campanha, preencher form com os dados
  savedSelect.addEventListener('change', () => {
    const selected = savedSelect.selectedOptions[0];
    if (selected && selected.value) {
      form.elements['name'].value = selected.textContent;
      form.elements['message'].value = selected.dataset.message;

      // Para a imagem, como o upload não pode ser preenchido programaticamente,
      // podemos mostrar um preview e avisar que ao enviar sem mudar, a imagem não será reenviada
      const imgUrl = selected.dataset.imageUrl;
      let imgPreview = document.getElementById('imgPreview');

      if (!imgPreview) {
        imgPreview = document.createElement('img');
        imgPreview.id = 'imgPreview';
        imgPreview.className = 'img-thumbnail mb-3';
        imgPreview.style.maxWidth = '100%';
        form.querySelector('.mb-3').appendChild(imgPreview);
      }

      if (imgUrl) {
        imgPreview.src = `/${imgUrl}`;
        imgPreview.style.display = 'block';
      } else {
        imgPreview.style.display = 'none';
      }
    } else {
      form.reset();
      const imgPreview = document.getElementById('imgPreview');
      if (imgPreview) imgPreview.style.display = 'none';
    }
  });

  // Manter o broadcastId atualizado em um campo hidden
  savedSelect.addEventListener('change', () => {
  const selected = savedSelect.selectedOptions[0];
  const broadcastIdInput = document.getElementById('broadcastIdInput');

  if (selected && selected.value) {
    // preenche dados do form...
    broadcastIdInput.value = selected.value;
  } else {
    broadcastIdInput.value = '';
  }
});

});



