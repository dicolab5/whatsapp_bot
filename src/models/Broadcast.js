// src/models/Broadcast.js
const db = require('../database/db');

const Broadcast = {
  async create({ name, message }) {
    // Retorna o id da campanha criada
    return await db('whatsapp_broadcasts')
      .insert({ name, message })
      .returning('id')
      .then(rows => Array.isArray(rows) ? rows[0].id : rows[0]);
  },

  async log({ broadcast_id, contact_id, wa_id, status, error_message = null }) {
    await db('whatsapp_broadcast_logs').insert({
      broadcast_id, contact_id, wa_id, status, error_message
    });
  },

  async countTodaySends() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const res = await db('whatsapp_broadcast_logs')
      .where('sent_at', '>=', today)
      .count({ total: 'id' }).first();
    return Number(res.total || 0);
  }
};

module.exports = Broadcast;
