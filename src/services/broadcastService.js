// src/services/broadcastService.js corrigido 
const db = require('../database/db');
const { client } = require('../whatsapp/whatsapp');
const { MessageMedia } = require('whatsapp-web.js');
const path = require('node:path');
const fs = require('node:fs');

const MIN_DELAY_MS = 4000;
const MAX_DELAY_MS = 9000;
const MAX_PER_BATCH = 40;
const MAX_DAILY_TOTAL = 200;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const crypto = require('crypto'); // Adiciona para usar randomInt

function randomDelay() {
  // Gera um valor seguro no intervalo [MIN_DELAY_MS, MAX_DELAY_MS)
  return MIN_DELAY_MS + crypto.randomInt(MAX_DELAY_MS - MIN_DELAY_MS);
}

async function countTodaySends() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const res = await db('whatsapp_broadcast_logs')
    .where('sent_at', '>=', today)
    .count({ total: 'id' })
    .first();
  return Number(res.total || 0);
}

/**
 * Cria e envia broadcast.
 * 
 * @param {string} name Nome da campanha
 * @param {string} message Texto da mensagem
 * @param {string|null} imageUrl URL relativa da imagem (ex: 'img/xyz.png') ou null
 * @param {object} filters Filtros { onlyOptIn: boolean, onlyNonGroup: boolean }
 * @param {number[]} contactIds Array de IDs de contatos (opcional)
 * @param {number|null} reuseBroadcastId Se informado, reutiliza campanha existente (não cria nova)
 */
async function createAndSendBroadcast({ 
  name, 
  message, 
  imageUrl = null, 
  filters = {}, 
  contactIds = [],
  reuseBroadcastId = null 
}) {
  const sentToday = await countTodaySends();
  if (sentToday >= MAX_DAILY_TOTAL) {
    throw new Error('Limite diário de envios atingido, tente novamente amanhã.');
  }

  const cleanImageUrl = imageUrl ? imageUrl.replace(/^\/+/, '') : null;

  let broadcastId;

  if (reuseBroadcastId) {
    // Reuso da campanha existente - não cria nova
    broadcastId = reuseBroadcastId;
  } else {
    // Cria nova campanha no banco
    broadcastId = await db('whatsapp_broadcasts')
      .insert({ name, message, image_url: cleanImageUrl })
      .returning('id')
      .then(rows => Array.isArray(rows) ? rows[0].id : rows[0]);
  }

  let query = db('whatsapp_contacts').whereNotNull('wa_id');

  if (contactIds.length > 0) {
    query = query.whereIn('id', contactIds);
  } else {
    if (filters.onlyOptIn) {
      query = query.andWhere('opt_in', true);
    }
    if (filters.onlyNonGroup !== false) {
      query = query.andWhere('is_group', false);
    }
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
      if (cleanImageUrl) {
        const absolutePath = path.resolve(__dirname, '..', '..', 'public', cleanImageUrl);

        if (!fs.existsSync(absolutePath)) {
          throw new Error(`Arquivo de imagem não encontrado: ${absolutePath}`);
        }

        const media = MessageMedia.fromFilePath(absolutePath);
        await client.sendMessage(waId, media, { caption: message });
      } else {
        await client.sendMessage(waId, message);
      }

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

    await sleep(randomDelay());
  }

  console.log(`Broadcast "${name}" finalizado. Total enviados: ${sentCount}.`);

  return { broadcastId, sentCount };
}

module.exports = {
  createAndSendBroadcast
};



