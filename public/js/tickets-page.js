// public/js/tickets-page.js  
document.addEventListener('DOMContentLoaded', () => {
  const humanBody = document.getElementById('ticketsHumanBody');
  const maintBody = document.getElementById('ticketsMaintBody');

  // Modal elements
  const modalEl = document.getElementById('ticketModal');
  const ticketModal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('ticketModalForm');

  const typeInput = document.getElementById('ticketModalType');
  const ticketIdInput = document.getElementById('ticketModalTicketId');
  const titleEl = document.getElementById('ticketModalTitle');

  const humanOnly = document.querySelectorAll('.human-only');
  const maintOnly = document.querySelectorAll('.maint-only');

  async function fetchTickets() {
    try {
      const [humanRes, maintRes] = await Promise.all([
        fetch('/api/tickets/human'),
        fetch('/api/tickets/maintenance')
      ]);
      const human = await humanRes.json();
      const maintenance = await maintRes.json();

      renderTicketsTable(humanBody, human, 'human');
      renderTicketsTable(maintBody, maintenance, 'maintenance');
    } catch (err) {
      humanBody.innerHTML = '<tr><td colspan="5">Erro ao carregar fila humana.</td></tr>';
      maintBody.innerHTML = '<tr><td colspan="9">Erro ao carregar manutenção.</td></tr>';
    }
  }

  // Abre o modal com os dados corretos
  function openModal(ticketId, type) {
    ticketIdInput.value = ticketId;
    typeInput.value = type;

    if (type === 'human') {
      titleEl.textContent = 'Registrar venda / atendimento humano';
      humanOnly.forEach(el => el.classList.remove('d-none'));
      maintOnly.forEach(el => el.classList.add('d-none'));
    } else {
      titleEl.textContent = 'Registrar conclusão de manutenção';
      humanOnly.forEach(el => el.classList.add('d-none'));
      maintOnly.forEach(el => el.classList.remove('d-none'));
    }

    form.reset();
    ticketModal.show();
  }

  // delegação de eventos para os dois <tbody>
  function handleBodyClick(e) {
    const btn = e.target.closest('button[data-ticket-id]');
    if (!btn) return;
    const ticketId = btn.getAttribute('data-ticket-id');
    const type = btn.getAttribute('data-type');
    openModal(ticketId, type);
  }

  humanBody.addEventListener('click', handleBodyClick);
  maintBody.addEventListener('click', handleBodyClick);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = typeInput.value;
    const ticketId = Number(ticketIdInput.value);

    const payloadBase = {
      ticket_id: ticketId,
      customer_name: document.getElementById('customerName').value,
      customer_cpf: document.getElementById('customerCpf').value || null,
      vendor_id: document.getElementById('vendorId').value || null,
      payment_method: document.getElementById('paymentMethod').value,
      items: [] // por enquanto manual, depois pode virar seleção de produtos
    };

    if (!payloadBase.customer_name || !payloadBase.payment_method) {
      alert('Preencha nome do cliente e forma de pagamento.');
      return;
    }

    try {
      if (type === 'human') {
        const discount = Number(document.getElementById('discount').value || 0);
        const total = Number(document.getElementById('saleTotal').value || 0);

        // usando total como um único item genérico por enquanto
        payloadBase.discount = discount;
        payloadBase.items = [{
          product_id: null,
          quantity: 1,
          unit_price: total
        }];

        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadBase)
        });
        if (!res.ok) throw new Error('Falha ao registrar venda');
      } else {
        const laborValue = Number(document.getElementById('laborValue').value || 0);
        const productsTotal = Number(document.getElementById('productsTotal').value || 0);
        const workDescription = document.getElementById('workDescription').value || '';

        const payload = {
          ...payloadBase,
          labor_value: laborValue,
          work_description: workDescription,
          items: [{
            product_id: null,
            quantity: 1,
            unit_price: productsTotal
          }]
        };

        const res = await fetch('/api/assistances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Falha ao registrar assistência');
      }

      ticketModal.hide();
      await fetchTickets();
      alert('Atendimento registrado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar. Tente novamente.');
    }
  });

//   fetchTickets();
//   setInterval(fetchTickets, 20000);
// });

  function renderTicketsTable(body, list, type) {
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="${type === 'human' ? 5 : 9}">Nenhum registro.</td></tr>`;
      return;
    }
    body.innerHTML = list.map(item => {
      const displayName = item.name || item.push_name || item.number || item.wa_id;
      
      if (type === 'human') {
  return `
    <tr>
      <td>${displayName}</td>
      <td>${item.number || ''}</td>
      <td>${item.wa_id}</td>
      <td>${item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : ''}</td>
      <td>
        <button type="button"
          class="btn btn-sm btn-outline-success"
          data-ticket-id="${item.id}"
          data-type="human">
          Marcar como atendido
        </button>
      </td>
    </tr>
  `;
} else {
  return `
    <tr>
      <td>${displayName}</td>
        <td>${item.number || ''}</td>
        <td>${item.wa_id}</td>
        <td>${item.description || ''}</td>
        <td>${item.date || ''}</td>
        <td>${item.period || ''}</td>
        <td>${item.address || ''}</td>
        <td>${item.city || ''}</td>
      <td>
        <button type="button"
          class="btn btn-sm btn-outline-success"
          data-ticket-id="${item.id}"
          data-type="maintenance">
          Marcar como resolvido
        </button>
      </td>
    </tr>
  `;
}
    }).join('');
  }

  // Inicializa
  fetchTickets();
  // Opcional: atualizar de tempos em tempos
  setInterval(fetchTickets, 20000);
});


