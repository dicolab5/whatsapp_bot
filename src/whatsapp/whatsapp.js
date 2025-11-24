// ==============================
// src/whatsapp.js - Código adaptado combinado

const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('../database/db');

let lastQr = null;
let isReady = false;
let clientInitialized = false;

// Configuração do cliente WhatsApp com LocalAuth e args para Render
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process',
      '--no-zygote'
    ]
  },
  webVersion: '2.2412.54',
  webVersionCache: {
    type: 'local',
    path: './wwebjs_cache.json'
  }
});

// Mantém o render acordado
setInterval(() => console.log("Heartbeat..."), 1000 * 60 * 4);

// Eventos do cliente
client.on('qr', (qr) => {
  console.log('QR code atualizado (use /qr no painel para escanear).');
  lastQr = qr;
  isReady = false;
});

client.on('ready', () => {
  console.log('WhatsApp client pronto!');
  isReady = true;
  lastQr = null;
});

client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação', msg);
  isReady = false;
});

client.on('disconnected', (reason) => {
  console.error('Cliente desconectado', reason);
  isReady = false;
});

// Status do QR para painel admin
function getQrStatus() {
  return { qr: lastQr, ready: isReady };
}

// Status geral do bot
function getBotStatus() {
  return { ready: isReady };
}

// Função para iniciar o client sob demanda
async function startClient() {
  if (!clientInitialized) {
    clientInitialized = true;
    await client.initialize();
  }
}

// Função para parar o client sob demanda
async function stopClient() {
  if (clientInitialized) {
    try {
      await client.destroy(); // Encerra Puppeteer/browser, fecha conexão
      clientInitialized = false;
      isReady = false;
      lastQr = null;
      console.log('Client WhatsApp parado!');
    } catch (err) {
      console.error('Erro ao parar client:', err);
    }
  }
}

async function syncContacts() {
  if (!isReady) return;

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
      const isBusiness = !!c.isBusiness || !!c.isEnterprise;

      if (isGroup) {
        skipped++;
        continue;
      }

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
    console.error("syncContacts erro:", err);
  }
}

// Texto do menu principal mais completo e amigável
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

// Função para normalizar texto (remover acentos, caixa baixa, trim)
function normalizeText(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Detecção de saudações para responder com o menu
function isGreeting(text) {
  const t = normalizeText(text);
  const greetings = [
    'oi', 'ola', 'ola!', 'ola.', 'bom dia', 'boa tarde', 'boa noite',
    'eai', 'e ai', 'opa', 'fala', 'salve'
  ];
  return greetings.some(g => t === g || t.startsWith(g));
}

// Detecção de opt-out (sair/parar)
function isOptOut(text) {
  const t = normalizeText(text);
  return t === 'sair' || t === 'parar';
}

// Normaliza o ID do WhatsApp (aqui mantém padrão, mas pode adaptar se quiser)
function normalizeWaId(raw) {
  return raw;
}

// Evento de mensagem principal com lógica detalhada do chatbot
client.on('message', async (msg) => {
  try {
    if (!isReady) return;

    const chat = await msg.getChat();
    if (chat.isGroup) return; // ignora grupos

    const from = msg.from;
    const body = (msg.body || '').trim();
    const normalized = normalizeText(body);

    // Opt-out imediato
    if (isOptOut(body)) {
      await handleOptOut(from);
      return;
    }

    // Saudação com menu
    if (isGreeting(body)) {
      await client.sendMessage(from, getMainMenuText());
      return;
    }

    // Menu principal opções (1,2,3,4)
    const choice = normalized.replace(/\s+/g, '');

    if (choice === '1') {
      await handleOptIn(from);
      return;
    }

    if (choice === '2') {
      await handleDailyPromotions(from);
      return;
    }

    if (choice === '3') {
      await handleHumanSupport(from);
      return;
    }

    if (choice === '4') {
      await handleMaintenanceSchedule(from);
      return;
    }

    // Caso o contato está aguardando atendimento humano, só registra logs (não implementado aqui)
    const waId = normalizeWaId(from);
    const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();

    if (contact && contact.needs_human) {
      // Aqui poderia logar mensagens para atendimento humano, por enquanto só retorna
      return;
    }

    // Tratamento de mensagens após opção 4 (agendamento) pendente
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

    // Se é número inválido (1 a 9, exceto opções válidas), reenviar menu
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

// Handlers detalhados

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
    'Perfeito! ✅ Você agora está cadastrado para receber ofertas, novidades e promoções da SuperTI.\n\n' +
    'Quando quiser parar de receber, basta enviar "SAIR".'
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
    'Pronto! ❌ Você não receberá mais ofertas e campanhas automáticas da SuperTI.\n\n' +
    'Se quiser voltar a receber no futuro, envie "Oi" e escolha a opção 1.'
  );
}

async function handleDailyPromotions(from) {
  const text =
    '📢 Promoções de hoje na SuperTI:\n\n' +
    '- Upgrade para SSD com desconto.\n' +
    '- Limpeza completa + pasta térmica.\n' +
    '- Ofertas em monitores e periféricos.\n\n' +
    'Para falar com um atendente, responda com "3".';

  await client.sendMessage(from, text);
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
    'Um atendente da SuperTI vai te responder em breve. 👨‍💻\n\n' +
    'Nosso horário de atendimento é de segunda a sexta, das 09h às 18h.'
  );
}

async function handleMaintenanceSchedule(from) {
  const waId = normalizeWaId(from);
  const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();

  // cria um registro inicial, o resto das mensagens serão anexadas como pending
  await db('maintenance_requests').insert({
    contact_id: contact ? contact.id : null,
    wa_id: waId,
    raw_message: 'Início de agendamento (opção 4).',
    status: 'pending'
  });

  const text =
    'Para agendar uma visita de manutenção, responda com:\n' +
    '• Dia desejado (ex: 25/11)\n' +
    '• Período (manhã/tarde)\n' +
    '• Descrição rápida do problema.\n\n' +
    'Um atendente da SuperTI vai confirmar o horário com você.';

  await client.sendMessage(from, text);
}

module.exports = {
  client,
  startClient,
  stopClient,
  syncContacts,
  getQrStatus,
  getBotStatus
};
