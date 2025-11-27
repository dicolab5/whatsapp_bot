// // src/whatsapp/whatsapp.js
const { client, startClient, stopClient, getQrStatus, getBotStatus } = require('./client');
const { normalizeText, isGreeting, isOptOut, normalizeWaId } = require('./utils');
const { handleOptIn, handleOptOut, handleDailyPromotions, handleHumanSupport } = require('./optHandlers');
const { pendingMaintenanceUsers, handleMaintenanceSchedule, processMaintenanceStep } = require('./maintenanceHandler');
const db = require('../database/db'); // ✅ ADICIONE ESSA LINHA

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

// Inicialize o client assim que este módulo for carregado
startClient().catch(console.error);

client.on('message', async (msg) => {
  try {
    //console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);    
    
    // ✅ SALVAR CONTATO AUTOMATICAMENTE (SEM getContact!)
    if (!msg.from.endsWith('@g.us')) { 
      await db('whatsapp_contacts')
        .insert({
          wa_id: msg.from,           // ✅ Só o WA ID (sempre disponível)
          number: null,              // ✅ Sem getContact()
          name: null,                // ✅ Sem getContact()
          push_name: null,           // ✅ Sem getContact()
          updated_at: db.fn.now()
        })
        .onConflict('wa_id')
        .merge();
    }

    // ✅ SALVAR CONTATO AUTOMATICAMENTE (COM getContact - COMENTADO)
    // if (!msg.from.endsWith('@g.us')) { // Não é grupo
    //   const contact = await msg.getContact();
    //   await db('whatsapp_contacts')
    //     .insert({
    //       wa_id: msg.from,
    //       number: contact.number || null,
    //       name: contact.name || null,
    //       push_name: contact.pushname || null,
    //       updated_at: db.fn.now()
    //     })
    //     .onConflict('wa_id')
    //     .merge();
    // }

    if (!client.isReady) {
      console.log('Cliente não está pronto. Ignorando mensagem.');
      return;
    }

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const from = normalizeWaId(msg.from);  // Uso consistente
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

    if (pendingMaintenanceUsers[from]) {
      await processMaintenanceStep(msg);
      return;
    }

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

    // Opção inválida
    if (/^[0-9]$/.test(choice)) {
      await client.sendMessage(from, 'Não entendi a opção digitada.\n\n' + getMainMenuText());
    }
  } catch (err) {
    console.error('Erro no listener de mensagem:', err);
  }
});

// Sincroniza contatos do WhatsApp para o banco de dados
async function syncContacts() {
  if (!client.isReady) return;
  
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

    console.log(`✅ Sincronizados ${imported} contatos. Ignorados ${skipped}.`);
  } catch (err) {
    // ✅ TRATAMENTO ESPECÍFICO para erro WhatsApp Web.js
    if (err.message.includes('getIsMyContact') || err.message.includes('Evaluation failed')) {
      console.log('⚠️ syncContacts desabilitado temporariamente (WhatsApp Web.js aguardando update)');
    } else {
      console.error("❌ syncContacts erro inesperado:", err.message);
    }
  }
}

//não apagar!!! Ainda poderá ser usado como referência.
// async function syncContacts() {
//   if (!client.isReady) return;
//   try {
//     const contacts = await client.getContacts();

//     let imported = 0;
//     let skipped = 0;

//     for (const c of contacts) {
//       if (!c.id || !c.id._serialized) continue;

//       const waId = c.id._serialized;
//       const number = c.number || null;
//       const name = c.name || null;
//       const pushName = c.pushname || null;
//       const isGroup = !!c.isGroup;
//       const isBusiness = !!c.isBusiness || !!c.isEnterprise;

//       if (isGroup) {
//         skipped++;
//         continue;
//       }

//       if (!number || !String(number).startsWith('5524')) {
//         skipped++;
//         continue;
//       }

//       await db('whatsapp_contacts')
//         .insert({
//           wa_id: waId,
//           number,
//           name,
//           push_name: pushName,
//           is_group: isGroup,
//           is_business: isBusiness,
//           updated_at: db.fn.now()
//         })
//         .onConflict('wa_id')
//         .merge();

//       imported++;
//     }

//     console.log(`Sincronizados ${imported} contatos. Ignorados ${skipped}.`);
//   } catch (err) {
//     console.error("syncContacts erro:", err);
//   }
// }

module.exports = {
  client,
  startClient,
  stopClient,
  syncContacts,
  getQrStatus,
  getBotStatus,
};
