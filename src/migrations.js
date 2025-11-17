require('dotenv').config();
const db = require('./db');

async function runMigrations() {
  const hasContacts = await db.schema.hasTable('whatsapp_contacts');
  if (!hasContacts) {
    await db.schema.createTable('whatsapp_contacts', (table) => {
      table.increments('id').primary();
      table.string('wa_id').unique().notNullable();     // ex: 559999999999@c.us
      table.string('number');                           // ex: 559999999999
      table.string('name');                             // nome na agenda
      table.string('push_name');                        // nome de perfil
      table.boolean('is_group').defaultTo(false);
      table.boolean('is_business').defaultTo(false);
      table.boolean('opt_in').defaultTo(false);         // se aceitou receber campanhas
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  const hasBroadcasts = await db.schema.hasTable('whatsapp_broadcasts');
  if (!hasBroadcasts) {
    await db.schema.createTable('whatsapp_broadcasts', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();               // nome da campanha
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
      table.string('status').notNullable();             // sent, failed
      table.text('error_message');
      table.timestamp('sent_at').defaultTo(db.fn.now());
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
