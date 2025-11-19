// src/whatsapp.js
const { Client } = require('whatsapp-web.js');
const db = require('./db');

let lastQr = null;
let isReady = false;

// Criação do client com flags corretas para Render/Cloud
const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--no-zygote'
    ]
  }
});

// === Eventos Principais ===
client.on('qr', (qr) => {
  console.log('QR code recebido (acesse /qr no painel para escanear)');
  lastQr = qr;
  isReady = false;
});

client.on('ready', () => {
  console.log('WhatsApp client pronto!');
  isReady = true;
  lastQr = null;
});

client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação:', msg);
  isReady = false;
});

client.on('disconnected', (reason) => {
  console.error('WhatsApp desconectado:', reason);
  isReady = false;
});

// === Funções de status para o painel e as rotas ===
function getQrStatus() {
  return {
    qr: lastQr,
    ready: isReady
  };
}
function getBotStatus() {
  return { ready: isReady };
}

// === Sincronizar contatos (exemplo filtrando apenas números 5524) ===
async function syncContacts() {
  if (!isReady) throw new Error('WhatsApp ainda não conectado.');
  const contacts = await client.getContacts();

  let imported = 0, skipped = 0;
  for (const c of contacts) {
    if (!c.id || !c.id._serialized) continue;
    const waId = c.id._serialized;
    const number = c.number || null;
    const name = c.name || null;
    const pushName = c.pushname || null;
    // Exemplo: filtra só do DDD 24 (ajuste ou remova se necessário)
    if (!number || !String(number).startsWith('5524')) { skipped++; continue; }
    await db('whatsapp_contacts')
      .insert({
        wa_id: waId,
        number,
        name,
        push_name: pushName,
        is_group: !!c.isGroup,
        is_business: !!c.isEnterprise,
        updated_at: db.fn.now()
      })
      .onConflict('wa_id').merge();
    imported++;
  }
  console.log(`Sincronizados ${imported} contatos. Ignorados ${skipped}.`);
}

// === Listener de mensagens básicas (menu de exemplo) ===
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
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function isGreeting(text) {
  const t = normalizeText(text);
  return ['oi','ola','ola!','ola.','bom dia','boa tarde','boa noite','eai','e ai','opa','fala','salve']
    .some(g => t === g || t.startsWith(g));
}
function isOptOut(text) {
  const t = normalizeText(text);
  return t === 'sair' || t === 'parar';
}
function normalizeWaId(raw) { return raw; }

client.on('message', async (msg) => {
  try {
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

    // Saudação/menu
    if (isGreeting(body)) {
      await client.sendMessage(from, getMainMenuText());
      return;
    }

    // Menu de opções
    const choice = normalized.replace(/\s+/g, '');
    if (choice === '1')      { await handleOptIn(from);   return; }
    if (choice === '2')      { await handleDailyPromotions(from); return; }
    if (choice === '3')      { await handleHumanSupport(from);    return; }
    if (choice === '4')      { await handleMaintenanceSchedule(from); return; }

    // Resposta numérica inválida (exemplo)
    if (/^[0-9]$/.test(choice)) {
      await client.sendMessage(from, 'Não entendi a opção digitada.\n\n' + getMainMenuText());
    }
  } catch (err) {
    console.error('Erro no listener de mensagem:', err);
  }
});

// ===== Handlers resumido =====
async function handleOptIn(from) {
  const waId = normalizeWaId(from);
  await db('whatsapp_contacts').where({ wa_id: waId }).update({ opt_in: true, updated_at: db.fn.now() });
  await client.sendMessage(from, 'Perfeito! ✅ Você agora está cadastrado para receber ofertas da SuperTI. Quando quiser parar, basta enviar "SAIR".');
}
async function handleOptOut(from) {
  const waId = normalizeWaId(from);
  await db('whatsapp_contacts').where({ wa_id: waId }).update({ opt_in: false, updated_at: db.fn.now() });
  await client.sendMessage(from, 'Pronto! ❌ Você não receberá mais ofertas da SuperTI. Para voltar, envie "Oi" e opção 1.');
}
async function handleDailyPromotions(from) {
  await client.sendMessage(from,
    '📢 Promoções de hoje na SuperTI:\n' +
    '- Upgrade para SSD com desconto.\n' +
    '- Limpeza completa + pasta térmica.\n' +
    '- Ofertas em monitores e periféricos.\n\n' +
    'Para falar com um atendente, responda "3".'
  );
}
async function handleHumanSupport(from) {
  const waId = normalizeWaId(from);
  await db('whatsapp_contacts').where({ wa_id: waId }).update({ needs_human: true, updated_at: db.fn.now() });
  await client.sendMessage(from, 'Um atendente vai te responder em breve. 👨‍💻 Atendimento: seg a sex, 09h-18h.');
}
async function handleMaintenanceSchedule(from) {
  const waId = normalizeWaId(from);
  const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();
  await db('maintenance_requests').insert({
    contact_id: contact ? contact.id : null,
    wa_id: waId,
    raw_message: 'Início de agendamento (opção 4).',
    status: 'pending'
  });
  await client.sendMessage(from,
    'Para agendar, envie:\n• Dia (ex: 25/11)\n• Período (manhã/tarde)\n• Descrição do problema.\nUm atendente vai confirmar com você!');
}

// ==== EXPORT ====
module.exports = {
  client,
  syncContacts,
  getQrStatus,
  getBotStatus
};
