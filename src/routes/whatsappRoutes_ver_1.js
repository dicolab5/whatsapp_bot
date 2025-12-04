// src/routes/whatsappRoutes.js
const express = require('express');
const { getQrStatus, getBotStatus, startClient, stopClient, syncContacts } = require('../whatsapp/whatsapp');
const router = express.Router();

// Status
router.get('/bot-status', (req, res) => res.json(getBotStatus()));
router.get('/qr', (req, res) => res.json(getQrStatus()));

// Start/stop client
router.get('/generate-qr', async (req, res) => {
  try {
    await startClient();
    res.json({ message: 'Iniciando geração do QR code. Aguarde para escanear.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar geração do QR: ' + err.message });
  }
});

// Stop client
router.get('/stop-bot', async (req, res) => {
  try {
    await stopClient();
    res.json({ message: 'Client parado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao parar o client: ' + err.message });
  }
});

module.exports = router;
