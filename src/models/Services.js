// src/models/Services.js corrigido para incluir userId nas operações
const db = require('../database/db');

function listServices(userId, topicId) {
  return db('whatsapp_topic_services')
    .where({ user_id: userId, topic_id: topicId })
    .orderBy('sort_order')
    .orderBy('id');
}

function getServiceById(id, userId) {
  return db('whatsapp_topic_services')
    .where({ id, user_id: userId })
    .first();
}

function createService(data) {
  return db('whatsapp_topic_services')
    .insert(data)
    .returning('id');
}

function updateService(id, userId, data) {
  return db('whatsapp_topic_services')
    .where({ id, user_id: userId })
    .update(data);
}

function deleteService(id, userId) {
  return db('whatsapp_topic_services')
    .where({ id, user_id: userId })
    .del();
}

module.exports = {
  listServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};


// const db = require('../database/db');

// function listServices(topicId) {
//   return db('whatsapp_topic_services')
//     .where({ topic_id: topicId })
//     .orderBy('sort_order')
//     .orderBy('id');
// }

// function getServiceById(id) {
//   return db('whatsapp_topic_services').where({ id }).first();
// }

// function createService(data) {
//   return db('whatsapp_topic_services').insert(data).returning('id');
// }

// function updateService(id, data) {
//   return db('whatsapp_topic_services').where({ id }).update(data);
// }

// function deleteService(id) {
//   return db('whatsapp_topic_services').where({ id }).del();
// }

// module.exports = {
//   listServices,
//   getServiceById,
//   createService,
//   updateService,
//   deleteService,
// };
