document.addEventListener('DOMContentLoaded', () => {
  const checkAll = document.getElementById('checkAll');
  const form = document.getElementById('contactsForm');
  const tableBody = document.getElementById('contactsTableBody');

  // Função para buscar contatos via API
  async function fetchContacts() {
    try {
      const res = await fetch('/api/contacts'); // Faça uma rota API que retorna lista JSON!
      const contacts = await res.json();
      renderContactsTable(contacts);
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="4">Erro ao carregar contatos.</td></tr>';
    }
  }

  function renderContactsTable(contacts) {
    if (!contacts.length) {
      tableBody.innerHTML = '<tr><td colspan="4">Nenhum contato encontrado.</td></tr>';
      return;
    }
    tableBody.innerHTML = contacts.map(c => {
      const displayName = c.name || c.push_name || c.number || c.wa_id;
      const optInBadge = c.opt_in
        ? '<span class="badge bg-success badge-status">Opt-in</span>'
        : '<span class="badge bg-secondary badge-status">Sem opt-in</span>';
      return `
        <tr>
          <td class="text-center">
            <input type="checkbox" class="form-check-input contact-checkbox" name="contactIds" value="${c.id}" />
          </td>
          <td>${displayName}</td>
          <td>${c.number || ''}</td>
          <td>${optInBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // Eventos JS adicionais (selecionar todos, etc)
  if (checkAll) {
    checkAll.addEventListener('change', function() {
      document.querySelectorAll('.contact-checkbox').forEach(cb => cb.checked = checkAll.checked);
    });
  }

  form.addEventListener('submit', function(e) {
  e.preventDefault(); // previne envio padrão

  const selected = Array.from(document.querySelectorAll('.contact-checkbox'))
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (selected.length === 0) {
    alert('Selecione ao menos um contato para criar a campanha.');
    return;
  }

  const contactIdsParam = selected.join(',');
  window.location.href = `/broadcast?contactIds=${contactIdsParam}`;
});


  // Inicializa
  fetchContacts();
});
