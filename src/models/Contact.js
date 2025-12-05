// src/models/Contact.js corrigido para incluir userId nas consultas
const db = require('../database/db');

const Contact = {
  async findAll(userId, { limit = 500, search = '' } = {}) {
    let query = db('whatsapp_contacts')
      .where({ user_id: userId, is_group: false });

    if (search) {
      query = query.andWhere(function () {
        this.whereILike('name', `%${search}%`)
          .orWhereILike('push_name', `%${search}%`)
          .orWhereILike('number', `%${search}%`);
      });
    }

    return query.orderBy('name', 'asc').limit(limit);
  },

  async toggleOptIn(id, userId) {
    const contact = await db('whatsapp_contacts')
      .where({ id, user_id: userId })
      .first();
    if (!contact) return null;

    const newValue = !contact.opt_in;

    await db('whatsapp_contacts')
      .where({ id, user_id: userId })
      .update({ opt_in: newValue, updated_at: db.fn.now() });

    return newValue;
  },

  async clearAll(userId) {
    await db('whatsapp_contacts')
      .where({ user_id: userId })
      .del();
  },
};

module.exports = Contact;


// // src/models/Contact.js 
// const db = require('../database/db');

// const Contact = {
//   async findAll({ limit = 500, search = '' } = {}) {
//     let query = db('whatsapp_contacts').where('is_group', false);
//     if (search) {
//       query = query.andWhere(function () {
//         this.whereILike('name', `%${search}%`)
//           .orWhereILike('push_name', `%${search}%`)
//           .orWhereILike('number', `%${search}%`);
//       });
//     }
//     return query.orderBy('name', 'asc').limit(limit);
//   },

//   async toggleOptIn(id) {
//     const contact = await db('whatsapp_contacts').where({ id }).first();
//     if (!contact) return null;
//     const newValue = !contact.opt_in;
//     await db('whatsapp_contacts').where({ id }).update({ opt_in: newValue, updated_at: db.fn.now() });
//     return newValue;
//   },

//   async clearAll() {
//     await db('whatsapp_contacts').del();
//   }
// };

// module.exports = Contact;
