// src/models/Ticket.js
const db = require('../database/db');

const Ticket = {
  async findHumanQueue(limit = 100) {
    return await db('whatsapp_contacts')
      .where('needs_human', true)
      .orderBy('updated_at', 'desc')
      .limit(limit);
  },

  async resolveHuman(id) {
    await db('whatsapp_contacts')
      .where({ id })
      .update({ needs_human: false, updated_at: db.fn.now() });
  }
};

module.exports = Ticket;
