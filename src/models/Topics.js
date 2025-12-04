// src/models/Topics.js corrigido para incluir userId nas operações
const db = require('../database/db');

function listTopics(userId) {
  return db('whatsapp_topics')
    .where({ user_id: userId })
    .orderBy('sort_order')
    .orderBy('id');
}

function getTopicById(id, userId) {
  return db('whatsapp_topics')
    .where({ id, user_id: userId })
    .first();
}

function createTopic(data) {
  return db('whatsapp_topics')
    .insert(data)
    .returning('id');
}

function updateTopic(id, userId, data) {
  return db('whatsapp_topics')
    .where({ id, user_id: userId })
    .update(data);
}

function deleteTopic(id, userId) {
  return db('whatsapp_topics')
    .where({ id, user_id: userId })
    .del();
}

module.exports = {
  listTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
};


// // src/models/Topics.js
// const db = require('../database/db');

// function listTopics() {
//   return db('whatsapp_topics').orderBy('sort_order').orderBy('id');
// }

// function getTopicById(id) {
//   return db('whatsapp_topics').where({ id }).first();
// }

// function createTopic(data) {
//   return db('whatsapp_topics').insert(data).returning('id');
// }

// function updateTopic(id, data) {
//   return db('whatsapp_topics').where({ id }).update(data);
// }

// function deleteTopic(id) {
//   return db('whatsapp_topics').where({ id }).del();
// }

// module.exports = {
//   listTopics,
//   getTopicById,
//   createTopic,
//   updateTopic,
//   deleteTopic,
// };
