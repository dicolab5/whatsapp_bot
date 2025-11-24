// src/controllers/TicketController.js 
const Ticket = require('../models/Ticket');
const Maintenance = require('../models/Maintenance');

const TicketController = {
  // Fila humana
  async listHuman(req, res) {
    const humanQueue = await Ticket.findHumanQueue();
    res.json(humanQueue);
  },

  async resolveHuman(req, res) {
    await Ticket.resolveHuman(req.params.id);
    res.json({ success: true });
  },

  // Solicitações de manutenção
  async listMaintenance(req, res) {
    const maintenance = await Maintenance.findPending();
    res.json(maintenance);
  },

  async resolveMaintenance(req, res) {
    await Maintenance.resolve(req.params.id);
    res.json({ success: true });
  }
};

module.exports = TicketController;
