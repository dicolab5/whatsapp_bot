// src/whatsapp/optHandlers.js
const db = require("../database/db");
const WhatsAppManager = require("./manager");
const { normalizeWaId } = require("./utils");

module.exports = {
  // OPT‑IN
  handleOptIn: async (from, userId) => {
    const client = await WhatsAppManager.getClient(userId);
    const waId = normalizeWaId(from);

    await db("whatsapp_contacts")
      .insert({
        user_id: userId,
        wa_id: waId,
        opt_in: true,
        updated_at: db.fn.now(),
      })
      .onConflict(["user_id", "wa_id"])
      .merge();

    await client.sendMessage(
      from,
      'Perfeito! ✅ Você agora está cadastrado para receber ofertas, novidades e promoções da SuperTI.\n\nQuando quiser parar de receber, basta enviar "SAIR".'
    );
  },

  // OPT‑OUT
  handleOptOut: async (from, userId) => {
    const client = await WhatsAppManager.getClient(userId);
    const waId = normalizeWaId(from);

    await db("whatsapp_contacts")
      .where({ user_id: userId, wa_id: waId })
      .update({ opt_in: false, updated_at: db.fn.now() });

    await client.sendMessage(
      from,
      'Pronto! ❌ Você não receberá mais ofertas e campanhas automáticas da SuperTI.\n\nSe quiser voltar a receber no futuro, envie "Oi" e escolha a opção 1.'
    );
  },

  // PROMOÇÕES DIÁRIAS
  handleDailyPromotions: async (from, userId) => {
    const client = await WhatsAppManager.getClient(userId);

    const promos = await db("whatsapp_promo")
      .where({ user_id: userId, active: true })
      .orderBy("created_at", "desc");

    if (!promos.length) {
      await client.sendMessage(
        from,
        "No momento não temos promoções ativas. Volte mais tarde!"
      );
      return;
    }

    let text = "📢 Promoções de hoje na SuperTI:\n\n";

    promos.forEach((promo, index) => {
      text += `${index + 1}. ${promo.title}\n${promo.description}\n\n`;
    });

    text += 'Para falar com um atendente, responda com "3".';

    await client.sendMessage(from, text);
  },

  // SUPORTE HUMANO
  handleHumanSupport: async (from, userId) => {
    const client = await WhatsAppManager.getClient(userId);
    const waId = normalizeWaId(from);

    await db("whatsapp_contacts")
      .where({ user_id: userId, wa_id: waId })
      .update({ needs_human: true, updated_at: db.fn.now() });

    await client.sendMessage(
      from,
      "Um atendente da SuperTI vai te responder em breve. 👨‍💻\n\nNosso horário de atendimento é de segunda a sexta, das 09h às 18h."
    );
  },
};

