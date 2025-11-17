const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE
  },
  pool: {
    min: 0,
    max: 10
  }
});

module.exports = db;

// const knex = require('knex');

// // Altere aqui para 'pg' | 'mysql2' | 'sqlite3'
// const DB_CLIENT = process.env.DB_CLIENT || 'sqlite3';

// const configByClient = {
//   pg: {
//     client: 'pg',
//     connection: {
//       host: process.env.PG_HOST || 'localhost',
//       port: process.env.PG_PORT || 5432,
//       user: process.env.PG_USER || 'postgres',
//       password: process.env.PG_PASSWORD || 'postgres',
//       database: process.env.PG_DATABASE || 'whatsapp_bot'
//     }
//   },
//   mysql2: {
//     client: 'mysql2',
//     connection: {
//       host: process.env.MY_HOST || 'localhost',
//       port: process.env.MY_PORT || 3306,
//       user: process.env.MY_USER || 'root',
//       password: process.env.MY_PASSWORD || '',
//       database: process.env.MY_DATABASE || 'whatsapp_bot'
//     }
//   },
//   sqlite3: {
//     client: 'sqlite3',
//     connection: {
//       filename: './whatsapp_bot.sqlite'
//     },
//     useNullAsDefault: true
//   }
// };

// const db = knex(configByClient[DB_CLIENT]);

// module.exports = db;
