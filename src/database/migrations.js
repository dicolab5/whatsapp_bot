// src/database/migrations.js  
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

if (hasBroadcasts) {
  const hasImageUrl = await db.schema.hasColumn('whatsapp_broadcasts', 'image_url');
  if (!hasImageUrl) {
    await db.schema.alterTable('whatsapp_broadcasts', (table) => {
      table.string('image_url').nullable();
    });
  }
} else {
  await db.schema.createTable('whatsapp_broadcasts', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('message').notNullable();
    table.string('image_url').nullable();
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

if (hasMaintenance) {
  const hasDate = await db.schema.hasColumn('maintenance_requests', 'date');
  const hasPeriod = await db.schema.hasColumn('maintenance_requests', 'period');
  const hasAddress = await db.schema.hasColumn('maintenance_requests', 'address');
  const hasCity = await db.schema.hasColumn('maintenance_requests', 'city');
  const hasDescription = await db.schema.hasColumn('maintenance_requests', 'description');

  await db.schema.alterTable('maintenance_requests', (table) => {
    if (!hasDate) table.string('date');
    if (!hasPeriod) table.string('period');
    if (!hasAddress) table.string('address');
    if (!hasCity) table.string('city');
    if (!hasDescription) table.text('description');
  });
} else {
  await db.schema.createTable('maintenance_requests', (table) => {
    table.increments('id').primary();
    table.integer('contact_id').references('id').inTable('whatsapp_contacts');
    table.string('wa_id').notNullable();
    table.text('raw_message').notNullable(); // pode manter para histórico bruto, opcional
    table.string('date');
    table.string('period');
    table.string('address');
    table.string('city');
    table.text('description');
    table.string('status').notNullable().defaultTo('pending');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });
}

// Tabela de tópicos de manutenção
const hasTopics = await db.schema.hasTable('whatsapp_topics');
if (!hasTopics) {
  await db.schema.createTable('whatsapp_topics', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();      // ex: "Portões eletrônico"
    table.boolean('active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });
}

// Tabela de tipos de serviço (instalação / manutenção) por tópico
const hasServices = await db.schema.hasTable('whatsapp_topic_services');
if (!hasServices) {
  await db.schema.createTable('whatsapp_topic_services', (table) => {
    table.increments('id').primary();
    table
      .integer('topic_id')
      .unsigned()
      .references('id')
      .inTable('whatsapp_topics')
      .onDelete('CASCADE');
    table.enu('service_type', ['instalacao', 'manutencao']).notNullable();
    table.boolean('active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });
}

// Tabela de promoções diárias
const hasWhatsAppPromo = await db.schema.hasTable('whatsapp_promo');
if (!hasWhatsAppPromo) {
  await db.schema.createTable('whatsapp_promo', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
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


