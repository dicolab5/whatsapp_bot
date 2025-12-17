// src/models/Subscription.js
const db = require('../database/db');

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function calcExpiresDate(startDate, billingCycle) {
  if (billingCycle === 'annual') return addDays(startDate, 365);
  return addDays(startDate, 30);
}

module.exports = {
  async create(data) {
    const startDate = data.start_date ? new Date(data.start_date) : new Date();
    const expiresDate =
      data.expires_date ? new Date(data.expires_date) : calcExpiresDate(startDate, data.billing_cycle);

    return db('subscriptions')
      .insert({
        user_id: data.user_id,
        plan: data.plan,
        billing_cycle: data.billing_cycle,
        amount: data.amount,
        txid: data.txid ?? null,
        payload: data.payload ?? null,
        status: data.status ?? 'pending',
        start_date: startDate,
        expires_date: expiresDate,
        created_at: data.created_at ?? new Date()
      })
      .returning('*');
  },

  async findByTxid(txid) {
    return db('subscriptions').where({ txid }).first();
  },

  async updateStatus(txid, status) {
    return db('subscriptions').where({ txid }).update({ status });
  }
};


