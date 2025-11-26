// public/js/tickets-page.js 
document.addEventListener('DOMContentLoaded', () => {
  const humanBody = document.getElementById('ticketsHumanBody');
  const maintBody = document.getElementById('ticketsMaintBody');

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
              <form method="POST" action="/api/tickets/${item.id}/resolve-human" style="display:inline;">
                <button type="submit" class="btn btn-sm btn-outline-success">Marcar como atendido</button>
              </form>
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
              <form method="POST" action="/api/tickets/${item.id}/resolve-maintenance" style="display:inline;">
                <button type="submit" class="btn btn-sm btn-outline-success">Marcar como resolvido</button>
              </form>
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


