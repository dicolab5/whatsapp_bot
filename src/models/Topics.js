const db = require('../database/db');

function listTopics() {
  return db('whatsapp_topics').orderBy('sort_order').orderBy('id');
}

function getTopicById(id) {
  return db('whatsapp_topics').where({ id }).first();
}

function createTopic(data) {
  return db('whatsapp_topics').insert(data).returning('id');
}

function updateTopic(id, data) {
  return db('whatsapp_topics').where({ id }).update(data);
}

function deleteTopic(id) {
  return db('whatsapp_topics').where({ id }).del();
}

module.exports = {
  listTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
};
