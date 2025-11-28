const form = document.getElementById("filtroForm");
const tabelaBody = document.querySelector("#tabelaRegistros tbody");
const totalGeralEl = document.getElementById("totalGeral");
const totalVendasEl = document.getElementById("totalVendas");
const totalAssistenciasEl = document.getElementById("totalAssistencias");
const ticketMedioEl = document.getElementById("ticketMedio");
const vendedorSelect = document.getElementById("vendedor");

let graficoPagamento, graficoTipo;
let registrosGlobal = [];
let currentPage = 1;
const pageSize = 15;

// Carregar vendedores no select
async function carregarVendedores() {
  try {
    const res = await fetch('/api/vendors');
    const vendors = await res.json();
    vendors.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.name;
      vendedorSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar vendedores:', err);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const params = new URLSearchParams(new FormData(form));
  const res = await fetch(`/api/reports?${params.toString()}`);
  if (!res.ok) {
    alert('Erro ao buscar relatório');
    return;
  }
  const dados = await res.json();

  registrosGlobal = dados.registros;
  currentPage = 1;
  renderTabela(currentPage);

  // Resumo
  totalGeralEl.textContent = "R$ " + Number(dados.resumo.totalGeral).toFixed(2);
  totalVendasEl.textContent = "R$ " + Number(dados.resumo.totalVendas).toFixed(2);
  totalAssistenciasEl.textContent = "R$ " + Number(dados.resumo.totalAssistencias).toFixed(2);
  ticketMedioEl.textContent = "R$ " + Number(dados.resumo.ticketMedio).toFixed(2);

  // Gráfico de pagamentos
  if (graficoPagamento) graficoPagamento.destroy();
  const pagamentos = dados.graficos.pagamento || {};
  if (Object.keys(pagamentos).length > 0) {
    graficoPagamento = new Chart(document.getElementById("graficoPagamento"), {
      type: "pie",
      data: {
        labels: Object.keys(pagamentos),
        datasets: [{
          data: Object.values(pagamentos),
          backgroundColor: ["#4caf50", "#2196f3", "#ff9800", "#9c27b0"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  // Gráfico de tipos
  if (graficoTipo) graficoTipo.destroy();
  const tipos = dados.graficos.tipo || {};
  if (Object.keys(tipos).length > 0) {
    graficoTipo = new Chart(document.getElementById("graficoTipo"), {
      type: "doughnut",
      data: {
        labels: Object.keys(tipos),
        datasets: [{
          data: Object.values(tipos),
          backgroundColor: ["#2196f3", "#00bcd4"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
});

function renderTabela(page = 1) {
  tabelaBody.innerHTML = "";
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageRegistros = registrosGlobal.slice(start, end);

  pageRegistros.forEach(r => {
    const tipoBadge = r.tipo === 'venda' 
      ? '<span class="badge bg-primary">Venda</span>' 
      : '<span class="badge bg-info">Assistência</span>';
    
    tabelaBody.innerHTML += `
      <tr>
        <td>${r.id}</td>
        <td>${tipoBadge}</td>
        <td>${r.customer_name || ''}</td>
        <td>${r.customer_cpf || '-'}</td>
        <td>${r.vendor_name || '-'}</td>
        <td>R$ ${Number(r.total).toFixed(2)}</td>
        <td>${r.payment_method || ''}</td>
        <td>${new Date(r.data).toLocaleString('pt-BR')}</td>
      </tr>
    `;
  });

  const totalPages = Math.ceil(registrosGlobal.length / pageSize);
  document.getElementById("pageInfo").textContent = 
    `Página ${page} de ${totalPages || 1}`;
}

document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTabela(currentPage);
  }
});

document.getElementById("nextPage").addEventListener("click", () => {
  const totalPages = Math.ceil(registrosGlobal.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTabela(currentPage);
  }
});

// Inicializar
(function inicializar() {
  const hoje = new Date().toISOString().slice(0, 10);
  document.getElementById('dataInicio').value = hoje;
  document.getElementById('dataFim').value = hoje;
  carregarVendedores();
  form.dispatchEvent(new Event('submit'));
})();
