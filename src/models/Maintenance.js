// src/models/Maintenance.js
const db = require('../database/db');

const Maintenance = {
  async findPending(limit = 100) {
    return await db('maintenance_requests as mr')
      .leftJoin('whatsapp_contacts as c', 'c.id', 'mr.contact_id')
      .select(
        'mr.id', 'mr.wa_id', 'mr.raw_message', 'mr.status', 'mr.created_at',
        'c.name', 'c.push_name', 'c.number'
      )
      .where('mr.status', 'pending')
      .orderBy('mr.created_at', 'desc')
      .limit(limit);
  },

  async resolve(id) {
    await db('maintenance_requests').where({ id }).update({ status: 'done' });
  }
};

module.exports = Maintenance;
