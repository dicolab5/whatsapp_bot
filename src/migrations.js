// src/migrations.js subir para o github
require('dotenv').config();
const db = require('./db');

async function runMigrations() {
  const hasContacts = await db.schema.hasTable('whatsapp_contacts');
  if (!hasContacts) {
    await db.schema.createTable('whatsapp_contacts', (table) => {
      table.increments('id').primary();
      table.string('wa_id').unique().notNullable();     // ex: 559999999999@c.us
      table.string('number');
      table.string('name');
      table.string('push_name');
      table.boolean('is_group').defaultTo(false);
      table.boolean('is_business').defaultTo(false);
      table.boolean('opt_in').defaultTo(false);
      table.boolean('needs_human').defaultTo(false);    // NOVO: fila de atendimento humano
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  } else {
    // garantir coluna needs_human se a tabela já existia
    const hasNeedsHuman = await db.schema.hasColumn('whatsapp_contacts', 'needs_human');
    if (!hasNeedsHuman) {
      await db.schema.alterTable('whatsapp_contacts', (table) => {
        table.boolean('needs_human').defaultTo(false);
      });
    }
  }

  const hasBroadcasts = await db.schema.hasTable('whatsapp_broadcasts');
  if (!hasBroadcasts) {
    await db.schema.createTable('whatsapp_broadcasts', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('message').notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  const hasBroadcastLogs = await db.schema.hasTable('whatsapp_broadcast_logs');
  if (!hasBroadcastLogs) {
    await db.schema.createTable('whatsapp_broadcast_logs', (table) => {
      table.increments('id').primary();
      table.integer('broadcast_id').references('id').inTable('whatsapp_broadcasts');
      table.integer('contact_id').references('id').inTable('whatsapp_contacts');
      table.string('wa_id').notNullable();
      table.string('status').notNullable();
      table.text('error_message');
      table.timestamp('sent_at').defaultTo(db.fn.now());
    });
  }

  const hasMaintenance = await db.schema.hasTable('maintenance_requests');
  if (!hasMaintenance) {
    await db.schema.createTable('maintenance_requests', (table) => {
      table.increments('id').primary();
      table.integer('contact_id').references('id').inTable('whatsapp_contacts');
      table.string('wa_id').notNullable();
      table.text('raw_message').notNullable();       // texto que o cliente enviou
      table.string('status').notNullable().defaultTo('pending'); // pending, contacted, done
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  console.log('Migrations concluídas');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runMigrations;


