// src/controllers/AssistanceController.js corrigido para associar user_id
const Assistance = require('../models/Assistance');
const Maintenance = require('../models/Maintenance');
const db = require('../database/db');

const AssistanceController = {
  async create(req, res) {
    try {
      const userId = req.session.userId;
      const data = req.body;

      if (!data.customer_name || !data.payment_method) {
        return res.status(400).json({ error: 'Dados inválidos para assistência.' });
      }

      data.items = Array.isArray(data.items) ? data.items : [];
      data.user_id = userId;

      const assistance = await Assistance.createWithItems(data);

      if (data.ticket_id) {
        await Maintenance.resolve(data.ticket_id, userId);
      }

      return res.status(201).json(assistance);
    } catch (err) {
      console.error('Erro ao criar assistência:', err);
      return res.status(500).json({ error: 'Erro interno ao criar assistência.' });
    }
  },

  async list(req, res) {
    try {
      const userId = req.session.userId;
      const rows = await db('assistances')
        .where({ user_id: userId })
        .orderBy('closed_at', 'desc');
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar assistências.' });
    }
  },
};

module.exports = AssistanceController;


// // src/controllers/AssistanceController.js  
// const Assistance = require('../models/Assistance');
// const Maintenance = require('../models/Maintenance'); // já existe no seu projeto

// const AssistanceController = {
//   // POST /api/assistances
//   // body: { ticket_id, vendor_id, customer_name, customer_cpf,
//   //         work_description, labor_value, payment_method,
//   //         items: [{ product_id, quantity, unit_price }] }
//   async create(req, res) {
//     try {
//       const data = req.body;

//       if (!data.customer_name || !data.payment_method) {
//         return res.status(400).json({ error: 'Dados inválidos para assistência.' });
//       }

//       data.items = Array.isArray(data.items) ? data.items : [];

//       const assistance = await Assistance.createWithItems(data);

//       // se veio ticket_id (maintenance_requests.id), marca como resolvida
//       if (data.ticket_id) {
//         await Maintenance.resolve(data.ticket_id);
//       }

//       return res.status(201).json(assistance);
//     } catch (err) {
//       console.error('Erro ao criar assistência:', err);
//       return res.status(500).json({ error: 'Erro interno ao criar assistência.' });
//     }
//   },

//   // GET /api/assistances
//   async list(req, res) {
//     try {
//       const rows = await require('../database/db')('assistances')
//         .orderBy('closed_at', 'desc');
//       return res.json(rows);
//     } catch (err) {
//       return res.status(500).json({ error: 'Erro ao listar assistências.' });
//     }
//   }
// };

// module.exports = AssistanceController;
