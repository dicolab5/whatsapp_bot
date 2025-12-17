// src/routes/comprovanteRoutes.js
const express = require("express");
const router = express.Router();

const db = require("../database/db");              // seu knex instance
const upload = require("../config/multerConfig");  // seu multer (com mkdirSync)

// helper: calcula expiração (DATE) no Postgres
function expiryRawForCycle(trx, billingCycle) {
  if (billingCycle === "annual") {
    return trx.raw("CURRENT_DATE + INTERVAL '1 year'");
  }
  // default monthly
  return trx.raw("CURRENT_DATE + INTERVAL '1 month'");
}

router.post("/upload-receipt", upload.single("receipt"), async (req, res) => {
  const { txid } = req.body;

  if (!txid || !req.file) {
    return res.status(400).json({ success: false, error: "Arquivo/txid ausente." });
  }

  // se você está salvando em public/uploads/receipts, a URL pública costuma ser essa:
  const urlFile = "/uploads/receipts/" + req.file.filename;

  try {
    await db.transaction(async (trx) => {
      // 1) acha subscription pelo txid
      const sub = await trx("subscriptions").where({ txid }).first();
      if (!sub) throw new Error("Pagamento não encontrado.");

      // 2) salva comprovante
      await trx("comprovantes").insert({
        subscription_id: sub.id,
        url_file: urlFile,
        status: "pending",
      });

      // 3) (opcional) marca subscription como liberada provisoriamente
      await trx("subscriptions")
        .where({ id: sub.id })
        .update({ status: "provisioned" });

      // 4) atualiza user para liberar acesso
      await trx("users")
        .where({ id: sub.user_id })
        .update({
          account_type: sub.plan,
          billing_cycle: sub.billing_cycle,
          subscription_expires: expiryRawForCycle(trx, sub.billing_cycle),
        });
    });

    return res.json({ success: true });
  } catch (err) {
    // se quiser logar: console.error(err);
    return res.status(400).json({ success: false, error: err.message || "Erro ao enviar comprovante." });
  }
});

module.exports = router;


// // src/routes/comprovanteRoutes.js
// const express = require("express");
// const router = express.Router();
// const db = require("../database/db");
// const upload = require("../config/multerConfig");

// router.post("/upload-receipt", upload.single("receipt"), async (req, res) => {
//   const { txid } = req.body;
//   if (!txid || !req.file) {
//     return res.status(400).json({ success: false, error: "Arquivo/txid ausente." });
//   }

//   const urlFile = "/uploads/receipts/" + req.file.filename;

//   try {
//     await db.transaction(async (trx) => {
//       // 1) subscription pelo txid
//       const sub = await trx("subscriptions").where({ txid }).first();
//       if (!sub) throw new Error("Pagamento não encontrado.");

//       // 2) grava comprovante
//       await trx("comprovantes").insert({
//         subscription_id: sub.id,
//         url_file: urlFile,
//         status: "pending",
//       });

//       // 3) libera assinatura (opcional, mas recomendado p/ rastrear estado)
//       await trx("subscriptions")
//         .where({ id: sub.id })
//         .update({ status: "provisioned" }); // ou "active"

//       // 4) libera usuário conforme plano/ciclo da subscription
//       // aqui usa o que já está gravado na subscription: plan, billing_cycle, expires_date...
//       await trx("users")
//         .where({ id: sub.user_id })
//         .update({
//           account_type: sub.plan,
//           billing_cycle: sub.billing_cycle,
//           subscription_expires: sub.expires_date, // ou expires_date -> subscription_expires
//         });
//     });

//     return res.json({ success: true });
//   } catch (err) {
//     const msg = err.message === "Pagamento não encontrado."
//       ? err.message
//       : "Erro ao processar comprovante.";
//     return res.status(400).json({ success: false, error: msg });
//   }
// });

// module.exports = router;


// // // src/routes/comprovanteRoutes.js
// // const express = require("express");
// // const router = express.Router();
// // const db = require("../database/db");


// // const upload = require("../config/multerConfig"); // ajuste se o caminho for diferente
// // // const db = require("../db"); // seu knex/db

// // router.post("/upload-receipt", upload.single("receipt"), async (req, res) => {
// //   const { txid } = req.body;
// //   if (!txid || !req.file) return res.status(400).json({ success: false, error: "Arquivo/txid ausente." });

// //   const sub = await db("subscriptions").where({ txid }).first();
// //   if (!sub) return res.status(404).json({ success: false, error: "Pagamento não encontrado." });

// //   // Se você salvar dentro de public/uploads/receipts, a URL pública pode ser:
// //   const urlFile = "/uploads/receipts/" + req.file.filename;

// //   await db("comprovantes").insert({
// //     subscription_id: sub.id,
// //     url_file: urlFile,
// //     status: "pending",
// //   });

// //   return res.json({ success: true });
// // });

// // module.exports = router;


// // // // src/routes/comprovanteRoutes.js
// // // const express = require("express");
// // // const router = express.Router();

// // // const multer = require("multer");
// // // const path = require("path");
// // // // const db = require("../db"); // ajuste pro seu caminho do knex/db

// // // const storage = multer.diskStorage({
// // //   destination: (req, file, cb) =>
// // //     cb(null, path.join(process.cwd(), "public", "uploads", "receipts")),
// // //   filename: (req, file, cb) => {
// // //     const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
// // //     cb(null, unique + path.extname(file.originalname));
// // //   },
// // // });

// // // const upload = multer({ storage });

// // // router.post("/upload-receipt", upload.single("receipt"), async (req, res) => {
// // //   const { txid } = req.body;
// // //   if (!txid || !req.file) return res.status(400).json({ success: false, error: "Arquivo/txid ausente." });

// // //   const sub = await db("subscriptions").where({ txid }).first();
// // //   if (!sub) return res.status(404).json({ success: false, error: "Pagamento não encontrado." });

// // //   const urlFile = "/uploads/receipts/" + req.file.filename;

// // //   await db("comprovantes").insert({
// // //     subscription_id: sub.id,
// // //     url_file: urlFile,
// // //     status: "pending",
// // //   });

// // //   return res.json({ success: true });
// // // });

// // // module.exports = router;
