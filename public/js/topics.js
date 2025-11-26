// public/js/topics.js
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

  // Carrega tópicos do backend
  async function loadTopics() {
    topicsList.innerHTML = '';
    servicesSection.style.display = 'none';
    currentTopicId = null;

    const res = await fetch('/api/topics');
    const topics = await res.json();

    if (topics.length === 0) {
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

  // Carrega serviços de um tópico
  async function loadServices(topicId) {
    servicesList.innerHTML = '';
    const res = await fetch(`/api/services/${topicId}`);
    const services = await res.json();

    if (services.length === 0) {
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

  // Salvar tópico no backend
  formTopic.onsubmit = async (e) => {
    e.preventDefault();
    const id = topicIdInput.value;
    const data = {
      name: topicNameInput.value.trim(),
      active: topicActiveInput.checked
    };

    if (id) {
      await fetch(`/api/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    modalTopic.hide();
    loadTopics();
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

  // Salvar serviço no backend
  formService.onsubmit = async (e) => {
    e.preventDefault();
    const id = serviceIdInput.value;
    const data = {
      topic_id: currentTopicId,
      service_type: serviceTypeInput.value,
      active: serviceActiveInput.checked
    };

    if (id) {
      await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
    modalService.hide();
    loadServices(currentTopicId);
  };

  // Deletar serviço
  async function deleteService(serviceId) {
    if (!confirm('Confirma exclusão?')) return;
    await fetch(`/api/services/${serviceId}`, { method: 'DELETE' });
    loadServices(currentTopicId);
  }

  // Inicializa carregando tópicos
  loadTopics();
});
