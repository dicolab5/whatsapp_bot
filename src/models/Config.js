// src/models/Config.js 
const db = require('../database/db');

module.exports = {
  findById(id) {
    return db('users')
      .where({ id })
      .select('username', 'email', 'full_name', 'cpf', 'phone', 'account_type', 'subscription_expires')
      .first();
  },

  updateEmail(id, email) {
    return db('users').where({ id }).update({ email });
  },

  updateFullName(id, full_name) {
    return db('users').where({ id }).update({ full_name });
  },

  updatePhone(id, phone) {
    return db('users').where({ id }).update({ phone });
  },

  updateCPF(id, cpf) {
    return db('users').where({ id }).update({ cpf });
  },

  getPasswordHash(id) {
    return db('users').where({ id }).select('password_hash').first();
  },

  updatePassword(id, hash) {
    return db('users').where({ id }).update({ password_hash: hash });
  },

  getSubscription(id) {
    return db('users')
      .where({ id })
      .select('account_type', 'subscription_expires')
      .first();
  }
};
