// src/controllers/ContactController.js
const db = require('../database/db');

const ContactController = {
  async list(req, res) {
    const contacts = await db('whatsapp_contacts').where('is_group', false).orderBy('name', 'asc').limit(500);
    res.json(contacts);
  },

  async toggleOptIn(req, res) {
    const id = parseInt(req.params.id, 10);
    const contact = await db('whatsapp_contacts').where({ id }).first();
    if (!contact) return res.status(404).send('Contato não encontrado');
    const newValue = !contact.opt_in;
    await db('whatsapp_contacts').where({ id }).update({ opt_in: newValue, updated_at: db.fn.now() });
    res.json({ success: true, opt_in: newValue });
  },

  async clearContacts(req, res) {
    await db('whatsapp_contacts').del();
    res.json({ success: true });
  }
};

module.exports = ContactController;
