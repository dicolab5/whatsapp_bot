// src/models/User.js
const db = require('../database/db');
const bcrypt = require('bcrypt');

async function findByUsernameOrEmail(username, email) {
  return db('users').where('username', username).orWhere('email', email).first();
}

// src/models/User.js - ADICIONE esta função
async function createTrialUser(data) {
  const { username, email, password } = data;
  const password_hash = await bcrypt.hash(password, 10);

  // SEMPRE: FREE com 7 dias trial PROFESSIONAL
  const now = new Date();
  const subscription_expires = new Date(now);
  subscription_expires.setDate(now.getDate() + 7);

  return db('users').insert({
    username,
    email,
    password_hash,
    account_type: 'professional',           // Volta para free após trial
    billing_cycle: null,            // Sem cobrança ainda
    subscription_expires,           // 7 dias como Professional
    is_admin: false,
    two_factor_enabled: false,
    two_factor_secret: null
  });
}

module.exports = { findByUsernameOrEmail, createTrialUser };
