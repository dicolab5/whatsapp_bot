const Services = require('../models/Services');

async function list(req, res) {
  try {
    const { topicId } = req.params;
    const services = await Services.listServices(topicId);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
}

async function create(req, res) {
  try {
    const { topic_id, service_type, active = true, sort_order = 0 } = req.body;
    if (!topic_id || !service_type) return res.status(400).json({ error: 'Dados obrigatórios ausentes' });

    const [id] = await Services.createService({ topic_id, service_type, active, sort_order });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { service_type, active, sort_order } = req.body;
    await Services.updateService(id, { service_type, active, sort_order, updated_at: new Date() });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await Services.deleteService(id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar serviço' });
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
};
