// src/database/migrations.js   
require('dotenv').config();
const db = require('./db');

async function runMigrations() {
  // Tabela de contatos do WhatsApp
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

  // Garantir UNIQUE (user_id, wa_id) em whatsapp_contacts para multi-usuário
  try {
    const hasContacts = await db.schema.hasTable('whatsapp_contacts');
    if (hasContacts) {
      await db.schema.alterTable('whatsapp_contacts', (table) => {
        // remover unique antigo só em wa_id, se ainda existir em algum ambiente
        table.dropUnique(['wa_id'], 'whatsapp_contacts_wa_id_unique');
        // garantir unique composto (user_id, wa_id)
        table.unique(['user_id', 'wa_id'], 'whatsapp_contacts_user_wa_unique');
      });
    }
  } catch (err) {
    console.warn('⚠️ Erro ao ajustar unique de whatsapp_contacts:', err.message);
  }

  // Tabela de transmissões (broadcasts) do WhatsApp
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

  // Tabela de logs de envios de transmissões
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

  // Tabela de solicitações de manutenção via WhatsApp
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

  // tabelas diversas para vendas, manutenção e outros
  // Tabela de produtos
  const hasProducts = await db.schema.hasTable('products');
  if (!hasProducts) {
    await db.schema.createTable('products', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('sku').nullable();
      table.decimal('price', 10, 2).notNullable().defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // Tabela de vendedores / atendentes
  const hasVendors = await db.schema.hasTable('vendors');
  if (!hasVendors) {
    await db.schema.createTable('vendors', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('cpf').nullable();
      table.string('phone').nullable();
      table.decimal('commission_percent', 5, 2).defaultTo(0); // ex: 5.00 = 5%
      table.boolean('active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // Tabela de vendas
  const hasSales = await db.schema.hasTable('sales');
  if (!hasSales) {
    await db.schema.createTable('sales', (table) => {
      table.increments('id').primary();
      table
        .integer('ticket_id')
        .unsigned()
        .references('id')
        .inTable('whatsapp_contacts'); // ou outra tabela de tickets, se criar
      table
        .integer('vendor_id')
        .unsigned()
        .references('id')
        .inTable('vendors');
      table.string('customer_name').notNullable();
      table.string('customer_cpf').nullable();
      table.string('payment_method').notNullable(); // dinheiro, pix, cartão...
      table.decimal('subtotal', 10, 2).notNullable().defaultTo(0);
      table.decimal('discount', 10, 2).notNullable().defaultTo(0);
      table.decimal('total', 10, 2).notNullable().defaultTo(0);
      table.timestamp('sale_date').defaultTo(db.fn.now());
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // Itens da venda (N produtos por venda)
  const hasSaleItems = await db.schema.hasTable('sale_items');
  if (!hasSaleItems) {
    await db.schema.createTable('sale_items', (table) => {
      table.increments('id').primary();
      table
        .integer('sale_id')
        .unsigned()
        .references('id')
        .inTable('sales')
        .onDelete('CASCADE');
      table
        .integer('product_id')
        .unsigned()
        .references('id')
        .inTable('products');
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
      table.decimal('line_total', 10, 2).notNullable().defaultTo(0);
    });
  }

  // Tabela de assistências (manutenções concluídas)
  const hasAssistances = await db.schema.hasTable('assistances');
  if (!hasAssistances) {
    await db.schema.createTable('assistances', (table) => {
      table.increments('id').primary();
      table
        .integer('ticket_id')
        .unsigned()
        .references('id')
        .inTable('maintenance_requests'); // ligação com a solicitação de manutenção
      table
        .integer('vendor_id')
        .unsigned()
        .references('id')
        .inTable('vendors');
      table.string('customer_name').notNullable();
      table.string('customer_cpf').nullable();
      table.text('work_description').nullable(); // conclusão do atendimento
      table.decimal('labor_value', 10, 2).notNullable().defaultTo(0);
      table.decimal('products_total', 10, 2).notNullable().defaultTo(0);
      table.decimal('total', 10, 2).notNullable().defaultTo(0);
      table.string('payment_method').notNullable();
      table.timestamp('closed_at').defaultTo(db.fn.now());
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // Itens de produtos usados na assistência
  const hasAssistanceItems = await db.schema.hasTable('assistance_items');
  if (!hasAssistanceItems) {
    await db.schema.createTable('assistance_items', (table) => {
      table.increments('id').primary();
      table
        .integer('assistance_id')
        .unsigned()
        .references('id')
        .inTable('assistances')
        .onDelete('CASCADE');
      table
        .integer('product_id')
        .unsigned()
        .references('id')
        .inTable('products');
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
      table.decimal('line_total', 10, 2).notNullable().defaultTo(0);
    });
  }

  // Tabela de usuários do sistema
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
      table.enu('billing_cycle', ['monthly', 'annual'])
        .nullable(); // free pode ficar null
      table.date('subscription_expires').nullable(); // free ou vitalício = null

      // 2FA
      table.boolean('two_factor_enabled').defaultTo(false);
      table.string('two_factor_secret').nullable();

      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });

    // criar usuário admin inicial se variáveis de ambiente existirem
    const adminUser = process.env.ADMIN_USER;
    const adminPassHash = process.env.ADMIN_PASS_HASH;
    if (adminUser && adminPassHash) {
      await db('users').insert({
        username: adminUser,
        password_hash: adminPassHash,
        is_admin: true,
        account_type: 'enterprise', // admin com plano máximo
        billing_cycle: null,
        subscription_expires: null
      });
    }
  } else {
    const hasAccountType = await db.schema.hasColumn('users', 'account_type');
    const hasBillingCycle = await db.schema.hasColumn('users', 'billing_cycle');
    const hasSubscriptionExpires = await db.schema.hasColumn('users', 'subscription_expires');
    const hasCpf = await db.schema.hasColumn('users', 'cpf');
    const hasPhone = await db.schema.hasColumn('users', 'phone');

    // adicionar colunas de conta e cobrança se não existirem
    if (!hasAccountType || !hasBillingCycle || !hasSubscriptionExpires) {
      await db.schema.alterTable('users', (table) => {
        if (!hasAccountType) {
          table.enu('account_type', ['free', 'starter', 'professional', 'enterprise'])
            .notNullable()
            .defaultTo('free');
        }
        if (!hasBillingCycle) {
          table.enu('billing_cycle', ['monthly', 'annual']).nullable();
        }
        if (!hasSubscriptionExpires) {
          table.date('subscription_expires').nullable();
        }
      });
    }

    // adicionar cpf e phone se não existirem
    if (!hasCpf || !hasPhone) {
      await db.schema.alterTable('users', (table) => {
        if (!hasCpf) table.string('cpf').nullable();
        if (!hasPhone) table.string('phone').nullable();
      });
    }
  }

  // Histórico de assinaturas (CORRIGIDO)
  const hasSubscriptions = await db.schema.hasTable('subscriptions');
  if (!hasSubscriptions) {
    await db.schema.createTable('subscriptions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.enu('plan', ['free', 'starter', 'professional', 'enterprise']).notNullable();
      table.enu('billing_cycle', ['monthly', 'annual']).notNullable();
      table.decimal('amount', 10, 2).notNullable();     // R$ 29,90 etc.
      table.date('start_date').notNullable();
      table.date('expires_date').notNullable();
      table.string('status').defaultTo('active');        // active, expired, canceled
      table.string('payment_method').nullable();         // pix, cartao, boleto
      table.string('payment_id').nullable();             // ID da transação
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  //==================================================================================
  // Adicionar user_id em tabelas que precisam referenciar o usuário dono da conta   |
  //==================================================================================

  const tablesToUpdate = [
    'whatsapp_contacts',
    'whatsapp_broadcasts', 
    'maintenance_requests',
    'whatsapp_promo',
    'sales',
    'assistances',
    'vendors',
    'whatsapp_broadcast_logs',
    'whatsapp_topic_services',
    'whatsapp_topics',
    'products'
  ];

  for (const tableName of tablesToUpdate) {
    try {
      const hasUserId = await db.schema.hasColumn(tableName, 'user_id');
      if (!hasUserId) {
        await db.schema.alterTable(tableName, (table) => {
          table.integer('user_id')
            .unsigned()
            .notNullable() //notNullable : como conf normal
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
            .index();
        });
        console.log(`✅ Coluna user_id adicionada na tabela ${tableName}`);
      } else {
        console.log(`ℹ️  Tabela ${tableName} já tem user_id`);
      }
    } catch (err) {
      console.warn(`⚠️  Erro ao processar tabela ${tableName}:`, err.message);
    }
  }

    // Tabela de estados dos usuários no atendimento via WhatsApp
    const hasUserStates = await db.schema.hasTable('whatsapp_user_states');
    if (!hasUserStates) {
        await db.schema.createTable('whatsapp_user_states', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.string('wa_id').notNullable().index();
            table.integer('step').notNullable().defaultTo(1);
            table.jsonb('data').nullable();  // { topicId, date, address... }
            table.timestamp('created_at').defaultTo(db.fn.now());
            table.timestamp('updated_at').defaultTo(db.fn.now());
            table.unique(['user_id', 'wa_id']); // 1 estado por wa_id por user
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


