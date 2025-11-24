// src/routes/broadcastRoutes.js
const express = require('express');
const BroadcastController = require('../controllers/BroadcastController');
const router = express.Router();

// Send broadcast
router.post('/send', BroadcastController.send);

module.exports = router;
