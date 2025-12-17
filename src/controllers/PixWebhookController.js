// src/controllers/PixWebhookController.js
const crypto = require('crypto');
const db = require('../database/db');

// ----------------- AUTH / HMAC -----------------
function verifyWebhook(req) {
  const secret = process.env.PIX_WEBHOOK_SECRET;
  const ts = req.header('X-Timestamp') || '';
  const sigHex = (req.header('X-Signature') || '').trim().toLowerCase();

  if (!secret || !ts || !sigHex || !req.rawBody) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;

  // anti-replay: 5 minutos
  if (Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) return false;

  const data = Buffer.concat([
    Buffer.from(String(ts), 'utf8'),
    Buffer.from('.', 'utf8'),
    req.rawBody
  ]);

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  // valida hex e compara em tempo constante [web:113]
  if (!/^[0-9a-f]+$/i.test(sigHex) || sigHex.length !== expectedHex.length) return false;

  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(sigHex, 'hex');
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b); // [web:113]
}

// ----------------- HELPERS -----------------
function extractTxid(text) {
  // Pega "TX" + hex do texto da notificação.
  // Corta em 25 pra casar com o que você gera/salva.
  const m = String(text).match(/\bTX[0-9a-f]{6,64}\b/i);
  if (!m) return null;
  return m[0].slice(0, 25); // mantém o case original
}

function calcExpires(billing_cycle) {
  return billing_cycle === 'annual'
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

// ----------------- CONTROLLER -----------------
module.exports = {
  async handle(req, res) {
    try {
      // Debug de chegada
      console.log('---- PIX WEBHOOK HIT (controller) ----');
      console.log('[PIX] meta:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        ip: req.ip,
        hasRawBody: !!req.rawBody,
        ts: req.header('X-Timestamp'),
        sigLen: (req.header('X-Signature') || '').length
      });
      console.log('[PIX] body:', req.body);
      console.log('[PIX] rawBody:', req.rawBody ? req.rawBody.toString('utf8') : null);
      console.log('--------------------------------------');

      if (!verifyWebhook(req)) return res.sendStatus(401);

      const { mensagem } = req.body || {};
      if (!mensagem) return res.status(400).json({ error: 'mensagem ausente' });

      const txidFromText = extractTxid(mensagem);
      console.log('[PIX] extracted txid:', txidFromText);

      if (!txidFromText) {
        return res.status(202).json({ ok: true, matched: false, reason: 'txid_not_found' });
      }

      // Busca por TXID (sem filtrar status, pra não “perder” por inconsistência)
      const sub = await db('subscriptions as s')
        .select('s.id', 's.user_id', 's.plan', 's.billing_cycle', 's.amount', 's.txid', 's.status', 's.created_at')
        .whereRaw('lower(s.txid) = lower(?)', [txidFromText])
        .orderBy('s.created_at', 'desc')
        .first();

      console.log('[PIX] subscription:', sub);

      if (!sub) {
        return res.status(202).json({ ok: true, matched: false, reason: 'subscription_not_found', txid: txidFromText });
      }

      // Idempotência
      if (sub.status === 'active') {
        return res.json({
          ok: true,
          matched: true,
          alreadyActive: true,
          strategy: 'txid_only',
          txid: txidFromText,
          subscriptionId: sub.id,
          userId: sub.user_id
        });
      }

      const expires = calcExpires(sub.billing_cycle);

      await db.transaction(async trx => {
        const updatedSub = await trx('subscriptions')
          .where({ id: sub.id })
          .update({
            status: 'active',
            payment_method: 'pix_notification',
            payment_id: txidFromText
          });

        const updatedUser = await trx('users')
          .where({ id: sub.user_id })
          .update({
            account_type: sub.plan,
            billing_cycle: sub.billing_cycle,
            subscription_expires: expires
          });

        console.log('[PIX] rows affected:', { updatedSub, updatedUser });
      }); // transação Knex [web:307]

      return res.json({
        ok: true,
        matched: true,
        strategy: 'txid_only',
        txid: txidFromText,
        subscriptionId: sub.id,
        userId: sub.user_id
      });
    } catch (err) {
      console.error('pix webhook error:', err);
      return res.sendStatus(500);
    }
  }
};
