// src/controllers/ServicesController.js corrigido para incluir userId nas operações
const Services = require('../models/Services');

async function list(req, res) {
  try {
    const userId = req.session.userId;
    const { topicId } = req.params;
    const services = await Services.listServices(userId, topicId);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
}

async function create(req, res) {
  try {
    const userId = req.session.userId;
    const { topic_id, service_type, active = true, sort_order = 0 } = req.body;
    if (!topic_id || !service_type) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }

    const [id] = await Services.createService({
      user_id: userId,
      topic_id,
      service_type,
      active,
      sort_order,
    });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
}

async function update(req, res) {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { service_type, active, sort_order } = req.body;

    const updated = await Services.updateService(id, userId, {
      service_type,
      active,
      sort_order,
      updated_at: new Date(),
    });
    if (!updated) return res.status(404).json({ error: 'Serviço não encontrado' });

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
}

async function remove(req, res) {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const deleted = await Services.deleteService(id, userId);
    if (!deleted) return res.status(404).json({ error: 'Serviço não encontrado' });

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar serviço' });
  }
}

module.exports = { list, create, update, remove };


// const Services = require('../models/Services');

// async function list(req, res) {
//   try {
//     const { topicId } = req.params;
//     const services = await Services.listServices(topicId);
//     res.json(services);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao listar serviços' });
//   }
// }

// async function create(req, res) {
//   try {
//     const { topic_id, service_type, active = true, sort_order = 0 } = req.body;
//     if (!topic_id || !service_type) return res.status(400).json({ error: 'Dados obrigatórios ausentes' });

//     const [id] = await Services.createService({ topic_id, service_type, active, sort_order });
//     res.status(201).json({ id });
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao criar serviço' });
//   }
// }

// async function update(req, res) {
//   try {
//     const { id } = req.params;
//     const { service_type, active, sort_order } = req.body;
//     await Services.updateService(id, { service_type, active, sort_order, updated_at: new Date() });
//     res.sendStatus(204);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao atualizar serviço' });
//   }
// }

// async function remove(req, res) {
//   try {
//     const { id } = req.params;
//     await Services.deleteService(id);
//     res.sendStatus(204);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao deletar serviço' });
//   }
// }

// module.exports = {
//   list,
//   create,
//   update,
//   remove,
// };
