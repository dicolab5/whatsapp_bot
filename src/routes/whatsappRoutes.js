// src/routes/whatsappRoutes.js - Multi-instância (SEM parâmetros opcionais) 
const express = require('express');
const WhatsAppManager = require('../whatsapp/manager');
//const { syncContacts } = require('../whatsapp/whatsapp'); // Manter sync antigo por enquanto
const { syncContacts } = require('../whatsapp/syncContacts');
const router = express.Router();

// ======================================
// STATUS - Multi-usuário (COM e SEM userId)
// ======================================
router.get('/bot-status/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const status = WhatsAppManager.getStatus(userId);
  res.json({ userId, ...status });
});

router.get('/bot-status', async (req, res) => {
  // SEM userId na URL → usa da sessão ou fallback 5
  const userId = req.session?.userId;
  res.redirect(`/api/whatsapp/bot-status/${userId}`);
});

router.get('/qr/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const status = WhatsAppManager.getStatus(userId);
  res.json({ userId, ...status });
});

router.get('/qr', async (req, res) => {
  const userId = req.session?.userId;
  res.redirect(`/api/whatsapp/qr/${userId}`);
});

// ======================================
// START/STOP Client - Multi-usuário
// ======================================
router.post('/start/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    //await WhatsAppManager.getClient(userId);
    const { startWhatsApp } = require('../whatsapp/whatsapp');
    await startWhatsApp(userId);
    const status = WhatsAppManager.getStatus(userId);
    res.json({ 
      message: `Iniciando client WhatsApp para user ${userId}`,
      status 
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar client: ' + err.message });
  }
});

router.post('/stop/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    await WhatsAppManager.destroyClient(userId);
    res.json({ message: `Client WhatsApp do user ${userId} parado` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao parar client: ' + err.message });
  }
});

// ======================================
// SYNC Contatos - Multi-usuário
// ======================================
router.get('/sync-contacts/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    await syncContacts(userId);
    res.json({ message: `Sincronizados contatos do user ${userId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sync-contacts', async (req, res) => {
  const userId = req.session?.userId;
  res.redirect(`/api/whatsapp/sync-contacts/${userId}`);
});

// ======================================
// STATUS das conversas ativas do usuário
// ======================================
router.get('/active-chats/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const states = await WhatsAppManager.getUserStates(userId);
    res.json({ userId, activeChats: states });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// BACKWARDS COMPATIBILITY (rotas antigas)
// ======================================
router.get('/generate-qr', async (req, res) => {
  const userId = req.session?.userId;
  res.redirect(`/api/whatsapp/start/${userId}`);
});

router.get('/stop-bot', async (req, res) => {
  const userId = req.session?.userId;
  res.redirect(`/api/whatsapp/stop/${userId}`);
});

module.exports = router;
