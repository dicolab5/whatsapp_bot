// src/models/Ticket.js corrigido para associar tickets ao usuário
const db = require('../database/db');

const Ticket = {
  async findHumanQueue(userId, limit = 100) {
    return db('whatsapp_contacts')
      .where({ user_id: userId, needs_human: true })
      .orderBy('updated_at', 'desc')
      .limit(limit);
  },

  async resolveHuman(id, userId) {
    await db('whatsapp_contacts')
      .where({ id, user_id: userId })
      .update({ needs_human: false, updated_at: db.fn.now() });
  },
};

module.exports = Ticket;


// // src/models/Ticket.js  
// const db = require('../database/db');

// const Ticket = {
//   async findHumanQueue(limit = 100) {
//     return await db('whatsapp_contacts')
//       .where('needs_human', true)
//       .orderBy('updated_at', 'desc')
//       .limit(limit);
//   },

//   async resolveHuman(id) {
//     await db('whatsapp_contacts')
//       .where({ id })
//       .update({ needs_human: false, updated_at: db.fn.now() });
//   }
// };

// module.exports = Ticket;
