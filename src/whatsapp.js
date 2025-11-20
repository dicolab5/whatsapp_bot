// src/whatsapp.js — versão estável igual ao projeto antigo

const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('./db');

let lastQr = null;
let isReady = false;

// ==============================
// CLIENT — CONFIGURAÇÃO IGUAL AO PROJETO ANTIGO
// ==============================

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
      '--disable-software-rasterizer'
    ]
  },
  webVersion: '2.2412.54',
  webVersionCache: {
    type: 'local',
    path: './wwebjs_cache.json'
  }
});

// Mantém o Render acordado
setInterval(() => console.log("Heartbeat..."), 1000 * 60 * 4);

// ==============================
// EVENTOS
// ==============================

client.on('qr', qr => {
  console.log("QR gerado.");
  lastQr = qr;
  isReady = false;
});

client.on('ready', () => {
  console.log("WhatsApp conectado.");
  isReady = true;
  lastQr = null;
});

client.on('auth_failure', msg => {
  console.error("Falha autenticacao", msg);
  isReady = false;
});

client.on('disconnected', reason => {
  console.error("WhatsApp desconectado:", reason);
  isReady = false;
});

// Painel admin
function getQrStatus() {
  return { qr: lastQr, ready: isReady };
}

// ==============================
// SINCRONIZAÇÃO
// ==============================

async function syncContacts() {
  if (!isReady) return;

  try {
    const contacts = await client.getContacts();

    for (const c of contacts) {
      if (!c.id?._serialized) continue;

      const waId = c.id._serialized;
      const number = c.number || null;
      const isGroup = !!c.isGroup;

      if (isGroup) continue;

      // Apenas 24 (igual antigo)
      if (!number || !String(number).startsWith('5524')) continue;

      await db('whatsapp_contacts')
        .insert({
          wa_id: waId,
          number,
          name: c.name || null,
          push_name: c.pushname || null,
          is_group: isGroup,
          is_business: c.isBusiness || false,
          updated_at: db.fn.now()
        })
        .onConflict('wa_id')
        .merge();
    }

  } catch (err) {
    console.error("syncContacts erro:", err);
  }
}

function getMainMenuText() {
    return `
📌 *MENU PRINCIPAL*

1️⃣ - Consultar algo  
2️⃣ - Abrir chamado  
3️⃣ - Falar com atendente  

Digite a opção desejada:
`;
}


// ==============================
// ATENDIMENTO / CHATBOT
// ==============================

function normalizeText(t) {
  return t.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isGreeting(t) {
  const n = normalizeText(t);
  const g = ['oi','ola','bom dia','boa tarde','boa noite','opa','fala'];
  return g.some(x => n === x || n.startsWith(x));
}

function isOptOut(t) {
  const n = normalizeText(t);
  return (n === 'sair' || n === 'parar');
}

client.on('message', async msg => {
  try {
    if (!isReady) return;

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const from = msg.from;
    const body = msg.body.trim();
    const norm = normalizeText(body);

    if (isOptOut(body)) return handleOptOut(from);
    if (isGreeting(body)) return client.sendMessage(from, getMainMenuText());

    const choice = norm.replace(/\s+/g, '');

    if (choice === '1') return handleOptIn(from);
    if (choice === '2') return handleDailyPromotions(from);
    if (choice === '3') return handleHumanSupport(from);
    if (choice === '4') return handleMaintenanceSchedule(from);

  } catch (err) {
    console.error("Listener erro:", err);
  }
});

// Handlers iguais ao anterior...
async function handleOptIn(from) {
  await db('whatsapp_contacts')
    .where({ wa_id: from })
    .update({ opt_in: true, updated_at: db.fn.now() });

  await client.sendMessage(from, 'Você agora recebe ofertas 👍');
}

async function handleOptOut(from) {
  await db('whatsapp_contacts')
    .where({ wa_id: from })
    .update({ opt_in: false, updated_at: db.fn.now() });

  await client.sendMessage(from, 'Você não receberá mais mensagens automáticas.');
}

async function handleDailyPromotions(from) {
  await client.sendMessage(from, 'Promoções de hoje...');
}

async function handleHumanSupport(from) {
  await db('whatsapp_contacts')
    .where({ wa_id: from })
    .update({ needs_human: true, updated_at: db.fn.now() });

  await client.sendMessage(from, 'Um atendente irá te responder.');
}

async function handleMaintenanceSchedule(from) {
  await client.sendMessage(from, 'Envie dia/horário e problema.');
}

// ==============================
// EXPORTS
// ==============================

module.exports = {
  client,
  syncContacts,
  getQrStatus
};
