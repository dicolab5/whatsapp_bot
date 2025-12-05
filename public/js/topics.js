// public/js/topics.js

// Helper global para CSRF
async function getCsrfToken() {
  if (window.__csrfToken) return window.__csrfToken;

  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  const data = await res.json();
  window.__csrfToken = data.csrfToken;
  console.log('🔑 TOKEN CSRF (topics.js):', window.__csrfToken);
  return window.__csrfToken;
}

async function csrfFetch(url, options = {}) {
  const token = await getCsrfToken();

  const headers = new Headers(options.headers || {});
  // Só define Content-Type se não tiver ainda (para não quebrar FormData, etc)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('CSRF-Token', token); // lido pelo csurf em req.headers['csrf-token']

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const topicsList = document.getElementById('topicsList');
  const servicesSection = document.getElementById('servicesSection');
  const servicesList = document.getElementById('servicesList');
  const selectedTopicName = document.getElementById('selectedTopicName');

  let currentTopicId = null;

  // Modal bootstrap instances
  const modalTopic = new bootstrap.Modal(document.getElementById('modalTopic'));
  const modalService = new bootstrap.Modal(document.getElementById('modalService'));

  // Form elements
  const formTopic = document.getElementById('formTopic');
  const topicIdInput = document.getElementById('topicId');
  const topicNameInput = document.getElementById('topicName');
  const topicActiveInput = document.getElementById('topicActive');

  const formService = document.getElementById('formService');
  const serviceIdInput = document.getElementById('serviceId');
  const serviceTypeInput = document.getElementById('serviceType');
  const serviceActiveInput = document.getElementById('serviceActive');

  // Carrega tópicos do backend (GET não precisa de CSRF)
  async function loadTopics() {
    topicsList.innerHTML = '';
    servicesSection.style.display = 'none';
    currentTopicId = null;

    const res = await fetch('/api/topics', { credentials: 'same-origin' });
    const topics = await res.json();

    if (!Array.isArray(topics) || topics.length === 0) {
      topicsList.innerHTML = '<li class="list-group-item">Nenhum tópico cadastrado.</li>';
      return;
    }

    topics.forEach(topic => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.textContent = topic.name;
      li.style.cursor = 'pointer';
      li.onclick = () => selectTopic(topic);
      topicsList.appendChild(li);
    });
  }

  // Seleciona tópico, exibe serviços
  async function selectTopic(topic) {
    currentTopicId = topic.id;
    selectedTopicName.textContent = `Tópico: ${topic.name}`;
    servicesSection.style.display = 'block';
    await loadServices(currentTopicId);
  }

  // Carrega serviços de um tópico (GET)
  async function loadServices(topicId) {
    servicesList.innerHTML = '';
    const res = await fetch(`/api/services/${topicId}`, { credentials: 'same-origin' });
    const services = await res.json();

    if (!Array.isArray(services) || services.length === 0) {
      servicesList.innerHTML = '<li class="list-group-item">Nenhum serviço cadastrado para este tópico.</li>';
      return;
    }

    services.forEach(service => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';

      const label = service.service_type === 'instalacao' ? 'Instalação' : 'Manutenção';
      li.textContent = `${label}`;

      const btnGroup = document.createElement('div');

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-outline-primary me-2';
      btnEdit.textContent = 'Editar';
      btnEdit.onclick = () => openServiceModal(service);

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Excluir';
      btnDelete.onclick = () => deleteService(service.id);

      btnGroup.appendChild(btnEdit);
      btnGroup.appendChild(btnDelete);

      li.appendChild(btnGroup);
      servicesList.appendChild(li);
    });
  }

  // Abrir modal para adicionar tópico novo
  document.getElementById('btnAddTopic').onclick = () => {
    topicIdInput.value = '';
    topicNameInput.value = '';
    topicActiveInput.checked = true;
    modalTopic.show();
  };

  // Salvar tópico no backend (POST/PUT com CSRF)
  formTopic.onsubmit = async (e) => {
    e.preventDefault();
    const id = topicIdInput.value;
    const data = {
      name: topicNameInput.value.trim(),
      active: topicActiveInput.checked
    };

    try {
      if (id) {
        await csrfFetch(`/api/topics/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        await csrfFetch('/api/topics', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      modalTopic.hide();
      loadTopics();
    } catch (err) {
      console.error('Erro ao salvar tópico:', err);
      alert('Erro ao salvar tópico.');
    }
  };

  // Abrir modal para adicionar serviço novo
  document.getElementById('btnAddService').onclick = () => {
    if (!currentTopicId) {
      alert('Selecione um tópico primeiro.');
      return;
    }
    serviceIdInput.value = '';
    serviceTypeInput.value = '';
    serviceActiveInput.checked = true;
    modalService.show();
  };

  // Abrir modal para editar serviço
  function openServiceModal(service) {
    serviceIdInput.value = service.id;
    serviceTypeInput.value = service.service_type;
    serviceActiveInput.checked = service.active;
    modalService.show();
  }

  // Salvar serviço no backend (POST/PUT com CSRF)
  formService.onsubmit = async (e) => {
    e.preventDefault();
    const id = serviceIdInput.value;
    const data = {
      topic_id: currentTopicId,
      service_type: serviceTypeInput.value,
      active: serviceActiveInput.checked
    };

    try {
      if (id) {
        await csrfFetch(`/api/services/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        await csrfFetch('/api/services', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
      modalService.hide();
      loadServices(currentTopicId);
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      alert('Erro ao salvar serviço.');
    }
  };

  // Deletar serviço (DELETE com CSRF)
  async function deleteService(serviceId) {
    if (!confirm('Confirma exclusão?')) return;
    try {
      await csrfFetch(`/api/services/${serviceId}`, { method: 'DELETE' });
      loadServices(currentTopicId);
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
      alert('Erro ao excluir serviço.');
    }
  }

  // Inicializa carregando tópicos
  loadTopics();
});
