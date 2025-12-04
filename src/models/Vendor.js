// src/models/Vendor.js corrigido para incluir userId nas operações
const db = require('../database/db');

const Vendor = {
  async findAll(userId) {
    return db('vendors')
      .where({ user_id: userId, active: true })
      .orderBy('name', 'asc');
  },

  async findById(id, userId) {
    return db('vendors')
      .where({ id, user_id: userId })
      .first();
  },

  async create(userId, data) {
    const [inserted] = await db('vendors')
      .insert({
        user_id: userId,
        name: data.name,
        cpf: data.cpf || null,
        phone: data.phone || null,
        commission_percent: data.commission_percent || 0,
        active: data.active !== undefined ? data.active : true,
      })
      .returning('id');

    const id = inserted.id || inserted;
    return this.findById(id, userId);
  },

  async update(id, userId, data) {
    await db('vendors')
      .where({ id, user_id: userId })
      .update({
        name: data.name,
        cpf: data.cpf,
        phone: data.phone,
        commission_percent: data.commission_percent,
        active: data.active,
      });

    return this.findById(id, userId);
  },
};

module.exports = Vendor;


// // src/models/Vendor.js
// const db = require('../database/db');

// const Vendor = {
//   async findAll() {
//     return db('vendors').where('active', true).orderBy('name', 'asc');
//   },

//   async findById(id) {
//     return db('vendors').where({ id }).first();
//   },

//   async create(data) {
//     const [id] = await db('vendors').insert({
//       name: data.name,
//       cpf: data.cpf || null,
//       phone: data.phone || null,
//       commission_percent: data.commission_percent || 0,
//       active: data.active !== undefined ? data.active : true
//     }).returning('id');
//     return this.findById(id);
//   },

//   async update(id, data) {
//     await db('vendors')
//       .where({ id })
//       .update({
//         name: data.name,
//         cpf: data.cpf,
//         phone: data.phone,
//         commission_percent: data.commission_percent,
//         active: data.active
//       });
//     return this.findById(id);
//   }
// };

// module.exports = Vendor;
