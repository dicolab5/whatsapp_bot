// src/db.js para usar no render.com
const knex = require('knex');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: isProduction
      ? { rejectUnauthorized: false }  // Render/Cloud geralmente precisam disso
      : false
  },
  pool: {
    min: 0,
    max: 10
  }
});

module.exports = db;

// //para usar localmente
// const knex = require('knex');
// require('dotenv').config();

// const db = knex({
//   client: 'pg',
//   connection: {
//     host: process.env.PG_HOST,
//     port: process.env.PG_PORT,
//     user: process.env.PG_USER,
//     password: process.env.PG_PASSWORD,
//     database: process.env.PG_DATABASE
//   },
//   pool: {
//     min: 0,
//     max: 10
//   }
// });


// module.exports = db;
