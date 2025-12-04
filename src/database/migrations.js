// src/database/migrations.js
require('dotenv').config();
const db = require('./db');

async function runMigrations() {
  // ============================
  // OPCIONAL: ZERAR O BANCO
  // ============================
  // Descomenta quando quiser limpar tudo.
  /*
  console.log('⚠️ TRUNCATE/DROP em todas as tabelas relacionadas ao app...');
  await db.raw(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('knex_migrations', 'knex_migrations_lock')
      ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  */

  // ============================
  // TABELA users (BASE)
  // ============================
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('email').unique().nullable();
      table.string('password_hash').notNullable();

      // Tipo de conta e cobrança
      table.boolean('is_admin').defaultTo(false);
      table.enu('account_type', ['free', 'starter', 'professional', 'enterprise'])
        .notNullable()
        .defaultTo('free');
      table.enu('billing_cycle', ['monthly', 'annual']).nullable();
      table.date('subscription_expires').nullable();

      // 2FA
      table.boolean('two_factor_enabled').defaultTo(false);
      table.string('two_factor_secret').nullable();

      // Dados adicionais
      table.string('cpf').nullable();
      table.string('phone').nullable();

      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });

    // usuário admin inicial
    const adminUser = process.env.ADMIN_USER;
    const adminPassHash = process.env.ADMIN_PASS_HASH;
    if (adminUser && adminPassHash) {
      await db('users').insert({
        username: adminUser,
        password_hash: adminPassHash,
        is_admin: true,
        account_type: 'enterprise',
        billing_cycle: null,
        subscription_expires: null,
      });
    }
  }

  // ============================
  // TABELA whatsapp_contacts
  // ============================
  const hasContacts = await db.schema.hasTable('whatsapp_contacts');
  if (!hasContacts) {
    await db.schema.createTable('whatsapp_contacts', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.string('wa_id').notNullable(); // ex: "559999999999@c.us"
      table.string('number');
      table.string('name');
      table.string('push_name');
      table.boolean('is_group').defaultTo(false);
      table.boolean('is_business').defaultTo(false);
      table.boolean('opt_in').defaultTo(false);
      table.boolean('needs_human').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());

      // unique composto
      table.unique(['user_id', 'wa_id'], 'whatsapp_contacts_user_wa_unique');
    });
  } else {
    // garantir colunas extras + unique correto
    const hasNeedsHuman = await db.schema.hasColumn('whatsapp_contacts', 'needs_human');
    const hasUserIdCol = await db.schema.hasColumn('whatsapp_contacts', 'user_id');

    await db.schema.alterTable('whatsapp_contacts', (table) => {
      if (!hasUserIdCol) {
        table.integer('user_id').unsigned().nullable()
          .references('id').inTable('users').onDelete('CASCADE').index();
      }
      if (!hasNeedsHuman) {
        table.boolean('needs_human').defaultTo(false);
      }
      table.dropUnique(['wa_id'], 'whatsapp_contacts_wa_id_unique');
      table.unique(['user_id', 'wa_id'], 'whatsapp_contacts_user_wa_unique');
    });
  }

  // ============================
  // TABELA whatsapp_topics
  // ============================
  const hasTopics = await db.schema.hasTable('whatsapp_topics');
  if (!hasTopics) {
    await db.schema.createTable('whatsapp_topics', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.string('name').notNullable();
      table.boolean('active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA whatsapp_topic_services
  // ============================
  const hasServices = await db.schema.hasTable('whatsapp_topic_services');
  if (!hasServices) {
    await db.schema.createTable('whatsapp_topic_services', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.integer('topic_id').unsigned()
        .references('id').inTable('whatsapp_topics').onDelete('CASCADE');
      table.enu('service_type', ['instalacao', 'manutencao']).notNullable();
      table.boolean('active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA whatsapp_promo
  // ============================
  const hasWhatsAppPromo = await db.schema.hasTable('whatsapp_promo');
  if (!hasWhatsAppPromo) {
    await db.schema.createTable('whatsapp_promo', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.string('title').notNullable();
      table.text('description').notNullable();
      table.boolean('active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA products
  // ============================
  const hasProducts = await db.schema.hasTable('products');
  if (!hasProducts) {
    await db.schema.createTable('products', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.string('name').notNullable();
      table.string('sku').nullable();
      table.decimal('price', 10, 2).notNullable().defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA vendors
  // ============================
  const hasVendors = await db.schema.hasTable('vendors');
  if (!hasVendors) {
    await db.schema.createTable('vendors', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.string('name').notNullable();
      table.string('cpf').nullable();
      table.string('phone').nullable();
      table.decimal('commission_percent', 5, 2).defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA whatsapp_broadcasts
  // ============================
  const hasBroadcasts = await db.schema.hasTable('whatsapp_broadcasts');
  if (!hasBroadcasts) {
    await db.schema.createTable('whatsapp_broadcasts', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.string('name').notNullable();
      table.text('message').notNullable();
      table.string('image_url').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  } else {
    const hasUserIdCol = await db.schema.hasColumn('whatsapp_broadcasts', 'user_id');
    const hasImageUrl = await db.schema.hasColumn('whatsapp_broadcasts', 'image_url');
    await db.schema.alterTable('whatsapp_broadcasts', (table) => {
      if (!hasUserIdCol) {
        table.integer('user_id').unsigned().nullable()
          .references('id').inTable('users').onDelete('CASCADE').index();
      }
      if (!hasImageUrl) {
        table.string('image_url').nullable();
      }
    });
  }

  // ============================
  // TABELA whatsapp_broadcast_logs
  // ============================
  const hasBroadcastLogs = await db.schema.hasTable('whatsapp_broadcast_logs');
  if (!hasBroadcastLogs) {
    await db.schema.createTable('whatsapp_broadcast_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.integer('broadcast_id').unsigned()
        .references('id').inTable('whatsapp_broadcasts');
      table.integer('contact_id').unsigned()
        .references('id').inTable('whatsapp_contacts');
      table.string('wa_id').notNullable();
      table.string('status').notNullable();
      table.text('error_message');
      table.timestamp('sent_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA maintenance_requests
  // ============================
  const hasMaintenance = await db.schema.hasTable('maintenance_requests');
  if (!hasMaintenance) {
    await db.schema.createTable('maintenance_requests', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.integer('contact_id').unsigned()
        .references('id').inTable('whatsapp_contacts');
      table.string('wa_id').notNullable();
      table.text('raw_message').notNullable();
      table.string('date');
      table.string('period');
      table.string('address');
      table.string('city');
      table.text('description');
      table.string('status').notNullable().defaultTo('pending');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA sales
  // ============================
  const hasSales = await db.schema.hasTable('sales');
  if (!hasSales) {
    await db.schema.createTable('sales', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.integer('ticket_id').unsigned()
        .references('id').inTable('whatsapp_contacts');
      table.integer('vendor_id').unsigned()
        .references('id').inTable('vendors');
      table.string('customer_name').notNullable();
      table.string('customer_cpf').nullable();
      table.string('payment_method').notNullable();
      table.decimal('subtotal', 10, 2).notNullable().defaultTo(0);
      table.decimal('discount', 10, 2).notNullable().defaultTo(0);
      table.decimal('total', 10, 2).notNullable().defaultTo(0);
      table.timestamp('sale_date').defaultTo(db.fn.now());
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA sale_items
  // ============================
  const hasSaleItems = await db.schema.hasTable('sale_items');
  if (!hasSaleItems) {
    await db.schema.createTable('sale_items', (table) => {
      table.increments('id').primary();

      table.integer('sale_id').unsigned()
        .references('id').inTable('sales').onDelete('CASCADE');
      table.integer('product_id').unsigned()
        .references('id').inTable('products');
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
      table.decimal('line_total', 10, 2).notNullable().defaultTo(0);
    });
  }

  // ============================
  // TABELA assistances
  // ============================
  const hasAssistances = await db.schema.hasTable('assistances');
  if (!hasAssistances) {
    await db.schema.createTable('assistances', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE').index();

      table.integer('ticket_id').unsigned()
        .references('id').inTable('maintenance_requests');
      table.integer('vendor_id').unsigned()
        .references('id').inTable('vendors');
      table.string('customer_name').notNullable();
      table.string('customer_cpf').nullable();
      table.text('work_description').nullable();
      table.decimal('labor_value', 10, 2).notNullable().defaultTo(0);
      table.decimal('products_total', 10, 2).notNullable().defaultTo(0);
      table.decimal('total', 10, 2).notNullable().defaultTo(0);
      table.string('payment_method').notNullable();
      table.timestamp('closed_at').defaultTo(db.fn.now());
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA assistance_items
  // ============================
  const hasAssistanceItems = await db.schema.hasTable('assistance_items');
  if (!hasAssistanceItems) {
    await db.schema.createTable('assistance_items', (table) => {
      table.increments('id').primary();
      table.integer('assistance_id').unsigned()
        .references('id').inTable('assistances').onDelete('CASCADE');
      table.integer('product_id').unsigned()
        .references('id').inTable('products');
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
      table.decimal('line_total', 10, 2).notNullable().defaultTo(0);
    });
  }

  // ============================
  // TABELA subscriptions
  // ============================
  const hasSubscriptions = await db.schema.hasTable('subscriptions');
  if (!hasSubscriptions) {
    await db.schema.createTable('subscriptions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.enu('plan', ['free', 'starter', 'professional', 'enterprise']).notNullable();
      table.enu('billing_cycle', ['monthly', 'annual']).notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.date('start_date').notNullable();
      table.date('expires_date').notNullable();
      table.string('status').defaultTo('active');
      table.string('payment_method').nullable();
      table.string('payment_id').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // ============================
  // TABELA whatsapp_user_states
  // ============================
  const hasUserStates = await db.schema.hasTable('whatsapp_user_states');
  if (!hasUserStates) {
    await db.schema.createTable('whatsapp_user_states', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('wa_id').notNullable().index();
      table.integer('step').notNullable().defaultTo(1);
      table.jsonb('data').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      table.unique(['user_id', 'wa_id']);
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

