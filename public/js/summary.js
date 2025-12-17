// public/js/summary.js
document.addEventListener('DOMContentLoaded', async () => {
    const toggler = document.getElementById('customNavbarToggler');
    const nav = document.getElementById('navbarNav');

    if (toggler) {
        toggler.addEventListener('click', () => {
            nav.classList.toggle('show');
        });
    }

    try {
        const res = await fetch('/api/summary/summary', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error('Erro ao carregar resumo');

        const data = await res.json();

        document.getElementById('botStatusText').innerText =
            data.botStatus === 'ready' ? 'Conectado' : 'Desconectado';

        const statusBox = document.getElementById('botStatusBox');

        if (data.botStatus === 'ready') {
            statusBox.classList.remove('alert-danger');
            statusBox.classList.add('alert-success');
        } else {
            statusBox.classList.remove('alert-success');
            statusBox.classList.add('alert-danger');
        }

        document.getElementById('currentPlan').innerText = data.plan || '-';
        document.getElementById('planExpires').innerText =
            data.planExpires
                ? new Date(data.planExpires).toLocaleDateString('pt-BR')
                : '-';

        document.getElementById('metricContacts').innerText = data.contacts ?? 0;
        document.getElementById('metricCampaigns').innerText = data.campaigns ?? 0;
        document.getElementById('metricOpenTickets').innerText = data.openTickets ?? 0;
        document.getElementById('metricTodayMessages').innerText = data.todayMessages ?? 0;
    } catch (err) {
        console.error('Erro ao carregar /api/summary/summary:', err);
    }
});