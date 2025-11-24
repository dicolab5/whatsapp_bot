// src/models/Contact.js
const db = require('../database/db');

const Contact = {
  async findAll({ limit = 500, search = '' } = {}) {
    let query = db('whatsapp_contacts').where('is_group', false);
    if (search) {
      query = query.andWhere(function () {
        this.whereILike('name', `%${search}%`)
          .orWhereILike('push_name', `%${search}%`)
          .orWhereILike('number', `%${search}%`);
      });
    }
    return query.orderBy('name', 'asc').limit(limit);
  },

  async toggleOptIn(id) {
    const contact = await db('whatsapp_contacts').where({ id }).first();
    if (!contact) return null;
    const newValue = !contact.opt_in;
    await db('whatsapp_contacts').where({ id }).update({ opt_in: newValue, updated_at: db.fn.now() });
    return newValue;
  },

  async clearAll() {
    await db('whatsapp_contacts').del();
  }
};

module.exports = Contact;
