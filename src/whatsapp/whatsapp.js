// src/whatsapp.js - Código corrigido completo adaptado

const { Client, LocalAuth } = require('whatsapp-web.js');
const db = require('../database/db');
// Estado de contexto para agendamento pendente
const pendingMaintenanceUsers = {};

let lastQr = null;
let isReady = false;
let clientInitialized = false;

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

setInterval(() => console.log("Heartbeat..."), 1000 * 60 * 4);

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
  return { qr: lastQr, ready: isReady };
}

function getBotStatus() {
  return { ready: isReady };
}

async function startClient() {
  if (!clientInitialized) {
    clientInitialized = true;
    await client.initialize();
  }
}

async function stopClient() {
  if (clientInitialized) {
    try {
      await client.destroy();
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
    'oi', 'ola', 'ola!', 'ola.', 'bom dia', 'boa tarde', 'boa noite',
    'eai', 'e ai', 'opa', 'fala', 'salve'
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

client.on('message', async (msg) => {
  try {
    if (!isReady) return;

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const from = msg.from;
    const body = (msg.body || '').trim();
    const normalized = normalizeText(body);

    if (isOptOut(body)) {
      await handleOptOut(from);
      return;
    }

    if (isGreeting(body)) {
      await client.sendMessage(from, getMainMenuText());
      return;
    }

    // Verifica se o usuário está em fluxo de agendamento
    if (pendingMaintenanceUsers[from]) {
      const state = pendingMaintenanceUsers[from];

      // Simular digitação antes de enviar respostas no fluxo
      await chat.sendStateTyping();
      await new Promise(resolve => setTimeout(resolve, 1200));
      await chat.clearState();

      if (normalized === 'cancelar') {
        delete pendingMaintenanceUsers[from];
        await client.sendMessage(from, 'Agendamento cancelado. Para iniciar novamente, envie "4".');
        return;
      }

      if (state.step === 1) {
        state.data.date = body;
        state.step = 2;
        await client.sendMessage(from, "Agora, informe o período (manhã ou tarde):");
      } else if (state.step === 2) {
        state.data.period = body;
        state.step = 3;
        await client.sendMessage(from, "Informe o endereço completo:");
      } else if (state.step === 3) {
        state.data.address = body;
        state.step = 4;
        await client.sendMessage(from, "Informe a cidade:");
      } else if (state.step === 4) {
        state.data.city = body;
        state.step = 5;
        await client.sendMessage(from, "Descreva o problema:");
      } else if (state.step === 5) {
        state.data.description = body;
        state.step = 6;
        await client.sendMessage(from, 'Confirma o agendamento? Responda "sim" para confirmar ou "não" para cancelar.');
      } else if (state.step === 6) {
        if (normalized === 'sim') {
          const contact = await db('whatsapp_contacts').where({ wa_id: from }).first();
          await db('maintenance_requests').insert({
            contact_id: contact ? contact.id : null,
            wa_id: from,
            raw_message: `Agendamento: data ${state.data.date}, período ${state.data.period}, endereço ${state.data.address}, cidade ${state.data.city}, descrição ${state.data.description}`,
            date: state.data.date,
            period: state.data.period,
            address: state.data.address,
            city: state.data.city,
            description: state.data.description,
            status: 'pending'
          });
          delete pendingMaintenanceUsers[from];
          await client.sendMessage(from, "Agendamento registrado! Um atendente irá confirmar em breve.");
        } else if (normalized === 'nao' || normalized === 'não') {
          delete pendingMaintenanceUsers[from];
          await client.sendMessage(from, "Agendamento cancelado. Para iniciar novamente, envie '4'.");
        } else {
          await client.sendMessage(from, 'Resposta inválida. Por favor, responda "sim" para confirmar ou "não" para cancelar.');
        }
      }
      return;
    }

    // Fora do fluxo, tratar opções do menu normalmente
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

    const waId = normalizeWaId(from);
    const contact = await db('whatsapp_contacts').where({ wa_id: waId }).first();

    if (contact && contact.needs_human) {
      return;
    }

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
  pendingMaintenanceUsers[waId] = { step: 1, data: {} };

  const text =
    'Para agendar uma visita, informe na ordem:\n' +
    '1️⃣ Data desejada (ex: 25/11)\n' +
    '2️⃣ Período (manhã/tarde)\n' +
    '3️⃣ Endereço completo\n' +
    '4️⃣ Cidade\n' +
    '5️⃣ Breve descrição do problema\n\n' +
    'Responda com cada item em uma mensagem, seguindo a ordem e aguarde a próxima instrução a cada passo.';
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