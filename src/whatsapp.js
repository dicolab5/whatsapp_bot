// src/whatsapp.js — versão compatível com Render + chatbot completo

const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('./db');

let lastQr = null;
let isReady = false;

// ==============================
// CLIENT CONFIG PARA O RENDER
// ==============================

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session' // mantém a sessão ativa no Render
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  }
});

// Mantém o Render acordado
setInterval(() => {
  console.log("Heartbeat: serviço ativo...");
}, 1000 * 60 * 4); // 4 min

// ==============================
// EVENTOS DO WHATSAPP
// ==============================

client.on('qr', (qr) => {
  console.log('QR code gerado. Use /qr para escanear.');
  lastQr = qr;
  isReady = false;
});

client.on('ready', () => {
  console.log('WhatsApp conectado e pronto!');
  isReady = true;
  lastQr = null;
});

client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação', msg);
  isReady = false;
});

client.on('disconnected', (reason) => {
  console.error('WhatsApp desconectado:', reason);
  isReady = false;
});

// Status para painel
function getQrStatus() {
  return { qr: lastQr, ready: isReady };
}

// ==============================
// SINCRONIZAÇÃO DE CONTATOS
// ==============================

async function syncContacts() {
  if (!isReady) {
    console.log("syncContacts ignorado — WhatsApp não está pronto.");
    return;
  }

  try {
    const contacts = await client.getContacts();

    let imported = 0;
    let skipped = 0;

    for (const c of contacts) {
      if (!c.id || !c.id._serialized) continue;

      const waId = c.id._serialized;
      const number = c.number || null;
      const name = c.name || null;
      const pushName = c.pushname || null;
      const isGroup = !!c.isGroup;
      const isBusiness = !!c.isEnterprise;

      if (isGroup) {
        skipped++;
        continue;
      }

      // Filtro: apenas números começando em 5524
      if (!number || !String(number).startsWith('5524')) {
        skipped++;
        continue;
      }

      await db('whatsapp_contacts')
        .insert({
          wa_id: waId,
          number,
          name,
          push_name: pushName,
          is_group: isGroup,
          is_business: isBusiness,
          updated_at: db.fn.now()
        })
        .onConflict('wa_id')
        .merge();

      imported++;
    }

    console.log(`Sincronizados ${imported} contatos. Ignorados ${skipped}.`);
  } catch (err) {
    console.error("Erro no syncContacts:", err);
  }
}

// ==============================
// CHATBOT
// ==============================

function getMainMenuText() {
  return (
    'Olá! 👋 Seja bem-vindo ao atendente virtual da SuperTI.\n\n' +
    '1️⃣ Para receber ofertas, novidades e promoções diárias (opt-in).\n' +
    '2️⃣ Para saber as promoções de hoje.\n' +
    '3️⃣ Para falar com um atendente humano.\n' +
    '4️⃣ Para agendar uma visita de manutenção.\n\n' +
    'Responda apenas com o número da opção desejada.\n\n' +
    'Se quiser parar de receber ofertas, envie "SAIR".'
  );
}

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isGreeting(text) {
  const t = normalizeText(text);

  const greetings = [
    'oi', 'ola', 'ola!', 'ola.', 'bom dia',
    'boa tarde', 'boa noite', 'eai',
    'e ai', 'opa', 'fala', 'salve'
  ];

  return greetings.some(g => t === g || t.startsWith(g));
}

function isOptOut(text) {
  const t = normalizeText(text);
  return t === 'sair' || t === 'parar';
}

function normalizeWaId(raw) {
  return raw;
}

// ==============================
// LISTENER DE MENSAGENS
// ==============================

client.on('message', async (msg) => {
  try {
    if (!isReady) {
      console.log("Mensagem ignorada — WhatsApp não está pronto.");
      return;
    }

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const from = msg.from;
    const body = (msg.body || '').trim();
    const normalized = normalizeText(body);

    // OPT-OUT
    if (isOptOut(body)) {
      await handleOptOut(from);
      return;
    }

    // Cumprimentos
    if (isGreeting(body)) {
      await client.sendMessage(from, getMainMenuText());
      return;
    }

    const choice = normalized.replace(/\s+/g, '');

    if (choice === '1') return handleOptIn(from);
    if (choice === '2') return handleDailyPromotions(from);
    if (choice === '3') return handleHumanSupport(from);
    if (choice === '4') return handleMaintenanceSchedule(from);

    // Atendimento humano
    const waId = normalizeWaId(from);
    const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();

    if (contact && contact.needs_human) {
      return;
    }

    // Solicitação de manutenção (pendente)
    const lastMaintenance = await db('maintenance_requests')
      .where({ wa_id: waId })
      .orderBy('created_at', 'desc')
      .first();

    if (lastMaintenance && lastMaintenance.status === 'pending') {
      await db('maintenance_requests').insert({
        contact_id: contact ? contact.id : null,
        wa_id: waId,
        raw_message: body,
        status: 'pending'
      });
      return;
    }

    // Opção inválida
    if (/^[0-9]$/.test(choice)) {
      await client.sendMessage(
        from,
        'Não entendi a opção digitada.\n\n' + getMainMenuText()
      );
    }

  } catch (err) {
    console.error('Erro no listener de mensagem:', err);
  }
});

// ==============================
// HANDLERS
// ==============================

async function handleOptIn(from) {
  const waId = normalizeWaId(from);

  await db('whatsapp_contacts')
    .where({ wa_id: waId })
    .update({
      opt_in: true,
      updated_at: db.fn.now()
    });

  await client.sendMessage(
    from,
    'Perfeito! ✅ Você agora está cadastrado para receber ofertas da SuperTI.\n\n'
    + 'Para parar de receber, envie "SAIR".'
  );
}

async function handleOptOut(from) {
  const waId = normalizeWaId(from);

  await db('whatsapp_contacts')
    .where({ wa_id: waId })
    .update({
      opt_in: false,
      updated_at: db.fn.now()
    });

  await client.sendMessage(
    from,
    'Pronto! ❌ Você não receberá mais mensagens automáticas.\n'
    + 'Se quiser voltar, envie "Oi" e escolha a opção 1.'
  );
}

async function handleDailyPromotions(from) {
  await client.sendMessage(
    from,
    '📢 Promoções de hoje:\n\n'
    + '- Upgrade SSD com desconto.\n'
    + '- Limpeza + pasta térmica.\n'
    + '- Ofertas em monitores.\n\n'
    + 'Para atendimento humano, envie "3".'
  );
}

async function handleHumanSupport(from) {
  const waId = normalizeWaId(from);

  await db('whatsapp_contacts')
    .where({ wa_id: waId })
    .update({
      needs_human: true,
      updated_at: db.fn.now()
    });

  await client.sendMessage(
    from,
    'Um atendente vai te responder em breve. 👨‍💻\n'
    + 'Seg–Sex • 09h–18h.'
  );
}

async function handleMaintenanceSchedule(from) {
  const waId = normalizeWaId(from);
  const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();

  await db('maintenance_requests').insert({
    contact_id: contact ? contact.id : null,
    wa_id: waId,
    raw_message: 'Início de agendamento.',
    status: 'pending'
  });

  await client.sendMessage(
    from,
    'Para agendar manutenção, envie:\n'
    + '• Dia desejado (ex: 25/11)\n'
    + '• Período (manhã/tarde)\n'
    + '• Descrição do problema'
  );
}

// ==============================
// EXPORTS
// ==============================

module.exports = {
  client,
  syncContacts,
  getQrStatus
};
