// src/services/broadcastService.js 
const db = require('../database/db');
const { client } = require('../whatsapp/whatsapp');

// Configs anti-ban básicas (ajuste conforme sua realidade)
const MIN_DELAY_MS = 4000;      // 4s
const MAX_DELAY_MS = 9000;      // 9s
const MAX_PER_BATCH = 40;       // máximo por campanha / execução quando não há seleção manual
const MAX_DAILY_TOTAL = 200;    // limite diário simplificado

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

async function countTodaySends() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const res = await db('whatsapp_broadcast_logs')
    .where('sent_at', '>=', today)
    .count({ total: 'id' })
    .first();
  return Number(res.total || 0);
}

/**
 * name: nome da campanha
 * message: texto da mensagem
 * filters: { onlyOptIn: boolean, onlyNonGroup: boolean }
 * contactIds: array de IDs específicos de whatsapp_contacts (opcional)
 */
async function createAndSendBroadcast({ name, message, filters = {}, contactIds = [] }) {
  const sentToday = await countTodaySends();
  if (sentToday >= MAX_DAILY_TOTAL) {
    throw new Error('Limite diário de envios atingido, tente novamente amanhã.');
  }

  const broadcastId = await db('whatsapp_broadcasts')
    .insert({ name, message })
    .returning('id')
    .then((rows) => (Array.isArray(rows) ? rows[0].id : rows[0]));

  let query = db('whatsapp_contacts').whereNotNull('wa_id');

  // Se veio lista de IDs, envia só para eles
  if (contactIds && contactIds.length > 0) {
    query = query.whereIn('id', contactIds);
  } else {
    // Modo “automático”: filtra por opt-in e não-grupo
    if (filters.onlyOptIn) {
      query = query.andWhere('opt_in', true);
    }
    if (filters.onlyNonGroup !== false) {
      query = query.andWhere('is_group', false);
    }
    // Limita tamanho do lote
    query = query.limit(MAX_PER_BATCH);
  }

  const contacts = await query;

  console.log(`Iniciando broadcast "${name}" para ${contacts.length} contatos.`);

  let sentCount = 0;

  for (const contact of contacts) {
    const todayCount = await countTodaySends();
    if (todayCount >= MAX_DAILY_TOTAL) {
      console.warn('Limite diário atingido durante o envio. Parando.');
      break;
    }

    const waId = contact.wa_id;
    try {
      await client.sendMessage(waId, message);
      sentCount++;

      await db('whatsapp_broadcast_logs').insert({
        broadcast_id: broadcastId,
        contact_id: contact.id,
        wa_id: waId,
        status: 'sent'
      });

      console.log(`Enviado para ${waId}`);
    } catch (err) {
      console.error(`Erro ao enviar para ${waId}`, err.message);

      await db('whatsapp_broadcast_logs').insert({
        broadcast_id: broadcastId,
        contact_id: contact.id,
        wa_id: waId,
        status: 'failed',
        error_message: err.message
      });
    }

    // Delay aleatório entre envios
    await sleep(randomDelay());
  }

  console.log(`Broadcast "${name}" finalizado. Total enviados: ${sentCount}.`);

  return { broadcastId, sentCount };
}

module.exports = {
  createAndSendBroadcast
};

