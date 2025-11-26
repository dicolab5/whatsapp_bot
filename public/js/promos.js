// public/js/promos.js
document.addEventListener('DOMContentLoaded', () => {
  const promosList = document.getElementById('promosList');
  const modalPromo = new bootstrap.Modal(document.getElementById('modalPromo'));

  const formPromo = document.getElementById('formPromo');
  const promoIdInput = document.getElementById('promoId');
  const promoTitleInput = document.getElementById('promoTitle');
  const promoDescriptionInput = document.getElementById('promoDescription');
  const promoActiveInput = document.getElementById('promoActive');

  // Carrega promoções do backend
  async function loadPromos() {
    promosList.innerHTML = '';
    const res = await fetch('/api/promos');
    const promos = await res.json();

    if (promos.length === 0) {
      promosList.innerHTML = '<li class="list-group-item">Nenhuma promoção cadastrada.</li>';
      return;
    }

    promos.forEach(promo => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';

      li.textContent = `${promo.title} - ${promo.active ? 'Ativa' : 'Inativa'}`;

      const btnGroup = document.createElement('div');

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-outline-primary me-2';
      btnEdit.textContent = 'Editar';
      btnEdit.onclick = () => openPromoModal(promo);

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Excluir';
      btnDelete.onclick = () => deletePromo(promo.id);

      btnGroup.appendChild(btnEdit);
      btnGroup.appendChild(btnDelete);

      li.appendChild(btnGroup);
      promosList.appendChild(li);
    });
  }

  // Abrir modal para adicionar nova promoção
  document.getElementById('btnAddPromo').onclick = () => {
    promoIdInput.value = '';
    promoTitleInput.value = '';
    promoDescriptionInput.value = '';
    promoActiveInput.checked = true;
    modalPromo.show();
  };

  // Abrir modal para editar promoção
  function openPromoModal(promo) {
    promoIdInput.value = promo.id;
    promoTitleInput.value = promo.title;
    promoDescriptionInput.value = promo.description;
    promoActiveInput.checked = promo.active;
    modalPromo.show();
  }

  // Salvar promoção no backend
  formPromo.onsubmit = async (e) => {
    e.preventDefault();
    const id = promoIdInput.value;
    const data = {
      title: promoTitleInput.value.trim(),
      description: promoDescriptionInput.value.trim(),
      active: promoActiveInput.checked
    };

    if (id) {
      await fetch(`/api/promos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
    modalPromo.hide();
    loadPromos();
  };

  // Deletar promoção
  async function deletePromo(promoId) {
    if (!confirm('Confirma exclusão?')) return;
    await fetch(`/api/promos/${promoId}`, { method: 'DELETE' });
    loadPromos();
  }

  loadPromos();
});
