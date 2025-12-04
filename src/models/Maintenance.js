// src/models/Maintenance.js corrigido para associar manutenções ao usuário
const db = require('../database/db');

const Maintenance = {
  async findPending(userId, limit = 100) {
    return db('maintenance_requests as mr')
      .leftJoin('whatsapp_contacts as c', function () {
        this.on('c.id', '=', 'mr.contact_id')
            .andOn('c.user_id', '=', 'mr.user_id');
      })
      .select(
        'mr.id',
        'mr.wa_id',
        'mr.description',
        'mr.date',
        'mr.period',
        'mr.address',
        'mr.city',
        'mr.status',
        'mr.created_at',
        'c.name',
        'c.push_name',
        'c.number'
      )
      .where('mr.user_id', userId)
      .andWhere('mr.status', 'pending')
      .orderBy('mr.created_at', 'desc')
      .limit(limit);
  },

  async resolve(id, userId) {
    await db('maintenance_requests')
      .where({ id, user_id: userId })
      .update({ status: 'done' });
  },
};

module.exports = Maintenance;


// // src/models/Maintenance.js
// const db = require('../database/db');

// const Maintenance = {
  
//   async findPending(limit = 100) {
//     return await db('maintenance_requests as mr')
//       .leftJoin('whatsapp_contacts as c', 'c.id', 'mr.contact_id')
//       .select(
//         'mr.id', 'mr.wa_id', 'mr.description', 'mr.date', 'mr.period',
//         'mr.address', 'mr.city', 'mr.status', 'mr.created_at',
//         'c.name', 'c.push_name', 'c.number'
//       )
//       .where('mr.status', 'pending')
//       .orderBy('mr.created_at', 'desc')
//       .limit(limit);
//   },
//   async resolve(id) {
//     await db('maintenance_requests').where({ id }).update({ status: 'done' });
//   }
// };

// module.exports = Maintenance;
