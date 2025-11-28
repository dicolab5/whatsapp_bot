// src/controllers/SaleController.js
const Sale = require('../models/Sale');
const Ticket = require('../models/Ticket');
const db = require('../database/db');

const SaleController = {
  async create(req, res) {
    try {
      const data = req.body;

      if (!data.customer_name || !data.payment_method || !Array.isArray(data.items) || !data.items.length) {
        return res.status(400).json({ error: 'Dados inválidos para venda.' });
      }

      const sale = await Sale.createWithItems(data);

      if (data.ticket_id) {
        await Ticket.resolveHuman(data.ticket_id);
      }

      return res.status(201).json(sale);
    } catch (err) {
      console.error('Erro ao criar venda:', err);
      return res.status(500).json({ error: 'Erro interno ao criar venda.' });
    }
  },

  async list(req, res) {
    try {
      const rows = await db('sales').orderBy('sale_date', 'desc');
      return res.json(rows);
    } catch (err) {
      console.error('Erro ao listar vendas:', err);
      return res.status(500).json({ error: 'Erro ao listar vendas.' });
    }
  }
};

module.exports = SaleController;
