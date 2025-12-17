// src/routes/subscriptionRoutes.js (ou checkoutRoutes.js) 
const express = require("express");
const router = express.Router();
const db = require("../database/db"); // ajuste pro seu arquivo do knex

router.post("/payment", async (req, res) => {
  const { txid } = req.body;
  if (!txid) return res.status(400).json({ success: false, error: "txid ausente" });

  const sub = await db("subscriptions").where({ txid }).first();
  if (!sub) return res.status(404).json({ success: false, error: "Subscription não encontrada" });

  // Aqui você decide o “liberado”:
  await db("subscriptions")
    .where({ id: sub.id })
    .update({ status: "provisioned" }); // active ou "provisioned"

  return res.json({ success: true });
});

module.exports = router;
