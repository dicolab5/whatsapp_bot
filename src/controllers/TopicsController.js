// src/controllers/TopicsController.js corrigido para incluir userId nas operações
const Topics = require('../models/Topics');

async function list(req, res) {
  try {
    const userId = req.session.userId;
    const topics = await Topics.listTopics(userId);
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar tópicos' });
  }
}

async function create(req, res) {
  try {
    const userId = req.session.userId;
    const { name, active = true, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'O nome é obrigatório' });

    const [id] = await Topics.createTopic({
      user_id: userId,
      name,
      active,
      sort_order,
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tópico' });
  }
}

async function update(req, res) {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { name, active, sort_order } = req.body;

    const updated = await Topics.updateTopic(id, userId, {
      name,
      active,
      sort_order,
      updated_at: new Date(),
    });

    if (!updated) return res.status(404).json({ error: 'Tópico não encontrado' });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tópico' });
  }
}

async function remove(req, res) {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const deleted = await Topics.deleteTopic(id, userId);
    if (!deleted) return res.status(404).json({ error: 'Tópico não encontrado' });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar tópico' });
  }
}

module.exports = { list, create, update, remove };


// // src/controllers/TopicsController.js
// const Topics = require('../models/Topics');

// async function list(req, res) {
//   try {
//     const topics = await Topics.listTopics();
//     res.json(topics);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao listar tópicos' });
//   }
// }

// async function create(req, res) {
//   try {
//     console.log('Dados recebidos:', req.body);  // <-- Debug
//     const { name, active = true, sort_order = 0 } = req.body;
//     if (!name) return res.status(400).json({ error: 'O nome é obrigatório' });

//     const [id] = await Topics.createTopic({ name, active, sort_order });
//     res.status(201).json({ id });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Erro ao criar tópico' });
//   }
// }

// async function update(req, res) {
//   try {
//     const { id } = req.params;
//     const { name, active, sort_order } = req.body;
//     await Topics.updateTopic(id, { name, active, sort_order, updated_at: new Date() });
//     res.sendStatus(204);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao atualizar tópico' });
//   }
// }

// async function remove(req, res) {
//   try {
//     const { id } = req.params;
//     await Topics.deleteTopic(id);
//     res.sendStatus(204);
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao deletar tópico' });
//   }
// }

// module.exports = {
//   list,
//   create,
//   update,
//   remove,
// };
