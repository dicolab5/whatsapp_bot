// src/whatsapp/optHandlers.js
const db = require('../database/db');
const { client } = require('./client');
const { normalizeWaId } = require('./utils');

// async function handleOptIn(from) {
//   const waId = normalizeWaId(from);
//   await db('whatsapp_contacts').where({ wa_id: waId }).update({ opt_in: true, updated_at: db.fn.now() });
//   await client.sendMessage(from, 'Perfeito! ✅ Você agora está cadastrado para receber ofertas, novidades e promoções da SuperTI.\n\nQuando quiser parar de receber, basta enviar "SAIR".');
// }

// // src/whatsapp/optHandlers.js
// async function handleOptIn(from) {
//   const waId = normalizeWaId(from);
  
//   // ✅ NOVA LÓGICA: Buscar contato do WhatsApp e salvar/upsert
//   try {
//     const contact = await client.getContactById(waId);
    
//     await db('whatsapp_contacts')
//       .insert({
//         wa_id: waId,
//         number: contact.number || null,
//         name: contact.name || null,
//         push_name: contact.pushname || null,
//         is_group: false,
//         is_business: contact.isBusiness || false,
//         opt_in: true,
//         updated_at: db.fn.now()
//       })
//       .onConflict('wa_id')
//       .merge(); // Atualiza se existir, cria se não existir
    
//   } catch (err) {
//     console.warn('Erro ao buscar dados do contato:', err.message);
//     // Fallback: só atualiza opt_in se já existir
//     await db('whatsapp_contacts').where({ wa_id: waId }).update({ 
//       opt_in: true, 
//       updated_at: db.fn.now() 
//     });
//   }
  
//   await client.sendMessage(from, 
//     'Perfeito! ✅ Você agora está cadastrado para receber ofertas, novidades e promoções da SuperTI.\n\n' +
//     'Quando quiser parar de receber, basta enviar "SAIR".'
//   );
// }

async function handleOptIn(from) {
  const waId = normalizeWaId(from);
  
  // ✅ SIMPLIFICADO: Sem getContactById()
  await db('whatsapp_contacts')
    .insert({
      wa_id: waId,
      opt_in: true,
      updated_at: db.fn.now()
    })
    .onConflict('wa_id')
    .merge();
  
  await client.sendMessage(from, 
    'Perfeito! ✅ Você agora está cadastrado para receber ofertas, novidades e promoções da SuperTI.\n\nQuando quiser parar de receber, basta enviar "SAIR".'
  );
}


// sair do opt-in
async function handleOptOut(from) {
  const waId = normalizeWaId(from);
  await db('whatsapp_contacts').where({ wa_id: waId }).update({ opt_in: false, updated_at: db.fn.now() });
  await client.sendMessage(from, 'Pronto! ❌ Você não receberá mais ofertas e campanhas automáticas da SuperTI.\n\nSe quiser voltar a receber no futuro, envie "Oi" e escolha a opção 1.');
}

async function handleDailyPromotions(from) {
  const promos = await db('whatsapp_promo').where({ active: true }).orderBy('created_at', 'desc');

  if (promos.length === 0) {
    await client.sendMessage(from, 'No momento não temos promoções ativas. Volte mais tarde!');
    return;
  }

  let text = '📢 Promoções de hoje na SuperTI:\n\n';

  promos.forEach((promo, index) => {
    text += `${index + 1}. ${promo.title}\n${promo.description}\n\n`;
  });

  text += 'Para falar com um atendente, responda com "3".';

  await client.sendMessage(from, text);
}

async function handleHumanSupport(from) {
  const waId = normalizeWaId(from);
  await db('whatsapp_contacts').where({ wa_id: waId }).update({ needs_human: true, updated_at: db.fn.now() });
  await client.sendMessage(from, 'Um atendente da SuperTI vai te responder em breve. 👨‍💻\n\nNosso horário de atendimento é de segunda a sexta, das 09h às 18h.');
}

module.exports = {
  handleOptIn,
  handleOptOut,
  handleDailyPromotions,
  handleHumanSupport,
};
