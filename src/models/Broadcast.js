// src/models/Broadcast.js corrigido para associar user_id
const db = require('../database/db');

const Broadcast = {
  async create({ user_id, name, message, image_url = null }) {
    const rows = await db('whatsapp_broadcasts')
      .insert({ user_id, name, message, image_url })
      .returning('id');
    return Array.isArray(rows) ? rows[0].id : rows[0];
  },

  async log({ user_id, broadcast_id, contact_id, wa_id, status, error_message = null }) {
    await db('whatsapp_broadcast_logs').insert({
      user_id,
      broadcast_id,
      contact_id,
      wa_id,
      status,
      error_message,
    });
  },

  async countTodaySends(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const res = await db('whatsapp_broadcast_logs')
      .where({ user_id: userId })
      .andWhere('sent_at', '>=', today)
      .count({ total: 'id' })
      .first();

    return Number(res.total || 0);
  },
};

module.exports = Broadcast;


// // src/models/Broadcast.js 
// const db = require('../database/db');

// const Broadcast = {
//   async create({ name, message }) {
//     // Retorna o id da campanha criada
//     return await db('whatsapp_broadcasts')
//       .insert({ name, message })
//       .returning('id')
//       .then(rows => Array.isArray(rows) ? rows[0].id : rows[0]);
//   },

//   async log({ broadcast_id, contact_id, wa_id, status, error_message = null }) {
//     await db('whatsapp_broadcast_logs').insert({
//       broadcast_id, contact_id, wa_id, status, error_message
//     });
//   },

//   async countTodaySends() {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const res = await db('whatsapp_broadcast_logs')
//       .where('sent_at', '>=', today)
//       .count({ total: 'id' }).first();
//     return Number(res.total || 0);
//   }
// };

// module.exports = Broadcast;
