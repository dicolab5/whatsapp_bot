const db = require('../database/db');

function listServices(topicId) {
  return db('whatsapp_topic_services')
    .where({ topic_id: topicId })
    .orderBy('sort_order')
    .orderBy('id');
}

function getServiceById(id) {
  return db('whatsapp_topic_services').where({ id }).first();
}

function createService(data) {
  return db('whatsapp_topic_services').insert(data).returning('id');
}

function updateService(id, data) {
  return db('whatsapp_topic_services').where({ id }).update(data);
}

function deleteService(id) {
  return db('whatsapp_topic_services').where({ id }).del();
}

module.exports = {
  listServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
