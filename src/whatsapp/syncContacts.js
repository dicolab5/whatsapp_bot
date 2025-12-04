// src/whatsapp/syncContacts.js
const db = require("../database/db");
const WhatsAppManager = require("./manager");

module.exports = {
  syncContacts: async (userId) => {
    const client = await WhatsAppManager.getClient(userId);

    if (!client || !client.isReady) return;

    const contacts = await client.getContacts();

    let imported = 0;
    let skipped = 0;

    for (const c of contacts) {
      if (!c.id || !c.id._serialized) continue;

      const waId = c.id._serialized;

      if (c.isGroup) {
        skipped++;
        continue;
      }

      const number = c.number || null;

      if (!number || !String(number).startsWith("5524")) {
        skipped++;
        continue;
      }

      await db("whatsapp_contacts")
        .insert({
          user_id: userId,
          wa_id: waId,
          number,
          name: c.name || null,
          push_name: c.pushname || null,
          is_group: !!c.isGroup,
          is_business: !!c.isBusiness || !!c.isEnterprise,
          updated_at: db.fn.now(),
        })
        .onConflict(["user_id", "wa_id"])
        .merge();

      imported++;
    }

    console.log(
      `✔️ User ${userId}: ${imported} contatos importados — ${skipped} ignorados`
    );
  },
};
