// src/models/Promo.js corrigido para incluir userId
const db = require('../database/db');

const tableName = 'whatsapp_promo';

async function getAll(userId) {
  return db(tableName)
    .where({ user_id: userId })
    .orderBy('created_at', 'desc');
}

async function getById(id, userId) {
  return db(tableName)
    .where({ id, user_id: userId })
    .first();
}

async function create(data) {
  const [newPromo] = await db(tableName)
    .insert(data)
    .returning('*');
  return newPromo;
}

async function update(id, userId, data) {
  await db(tableName)
    .where({ id, user_id: userId })
    .update(data);
  return getById(id, userId);
}

async function remove(id, userId) {
  return db(tableName)
    .where({ id, user_id: userId })
    .del();
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};


// // src/models/Promo.js 
// const db = require('../database/db');

// const tableName = 'whatsapp_promo';

// async function getAll() {
//   return await db(tableName).orderBy('created_at', 'desc');
// }

// async function getById(id) {
//   return await db(tableName).where({ id }).first();
// }

// async function create(data) {
//   const [newPromo] = await db(tableName).insert(data).returning('*');
//   return newPromo;
// }

// async function update(id, data) {
//   await db(tableName).where({ id }).update(data);
//   return getById(id);
// }

// async function remove(id) {
//   return await db(tableName).where({ id }).del();
// }

// module.exports = {
//   getAll,
//   getById,
//   create,
//   update,
//   remove,
// };
