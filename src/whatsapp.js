// src/whatsapp.js subir para o github
const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('./db');

let lastQr = null;
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

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

function getQrStatus() {
  return {
    qr: lastQr,
    ready: isReady
  };
}

// ====== SYNC CONTATOS (ajuste filtro se quiser) ======
async function syncContacts() {
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

    // Exemplo: só números começando em 5524
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
}

// ====== CHATBOT ======
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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isGreeting(text) {
  const t = normalizeText(text);

  const greetings = [
    'oi',
    'ola',
    'ola!',
    'ola.',
    'bom dia',
    'boa tarde',
    'boa noite',
    'eai',
    'e ai',
    'opa',
    'fala',
    'salve'
  ];

  return greetings.some(g => t === g || t.startsWith(g));
}

function isOptOut(text) {
  const t = normalizeText(text);
  return t === 'sair' || t === 'parar';
}

function normalizeWaId(raw) {
  return raw; // normalmente já vem no formato correto
}

client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const from = msg.from;
    const body = (msg.body || '').trim();
    const normalized = normalizeText(body);

    // OPT-OUT: SAIR
    if (isOptOut(body)) {
      await handleOptOut(from);
      return;
    }

    // Saudação inicial
    if (isGreeting(body)) {
      await client.sendMessage(from, getMainMenuText());
      return;
    }

    // Menu principal: opções numéricas
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

    // Se o contato já está aguardando atendimento humano, apenas loga a conversa e deixa para o humano
    const waId = normalizeWaId(from);
    const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();

    if (contact && contact.needs_human) {
      // aqui você poderia logar mensagens em outra tabela se quiser
      return;
    }

    // Se a última interação do contato foi opção 4 (agendamento),
    // gravamos a mensagem como pedido de manutenção
    // (simplificado: qualquer mensagem após escolher 4 vira pedido)
    const lastMaintenance = await db('maintenance_requests')
      .where({ wa_id: waId })
      .orderBy('created_at', 'desc')
      .first();

    // estratégia simples: se NÃO existe maintenance_request ainda, e a pessoa não digitou opção válida,
    // não fazemos nada; se já existe, assumimos que ela está descrevendo o problema
    if (lastMaintenance && lastMaintenance.status === 'pending') {
      await db('maintenance_requests').insert({
        contact_id: contact ? contact.id : null,
        wa_id: waId,
        raw_message: body,
        status: 'pending'
      });
      return;
    }

    // Se a mensagem é só um dígito inválido, reenviar menu
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

// ====== HANDLERS ======

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
  syncContacts,
  getQrStatus
};



