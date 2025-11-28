// src/models/Product.js
const db = require('../database/db');

const Product = {
  async findAll() {
    return db('products').where('active', true).orderBy('name', 'asc');
  },

  async findById(id) {
    return db('products').where({ id }).first();
  },

  async create(data) {
    const [id] = await db('products').insert({
      name: data.name,
      sku: data.sku || null,
      price: data.price || 0,
      active: data.active !== undefined ? data.active : true
    }).returning('id');
    return this.findById(id);
  },

  async update(id, data) {
    await db('products')
      .where({ id })
      .update({
        name: data.name,
        sku: data.sku,
        price: data.price,
        active: data.active
      });
    return this.findById(id);
  }
};

module.exports = Product;
