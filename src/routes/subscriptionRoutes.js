// src/routes/subscriptionRoutes.js
const express = require('express');
const { createCheckout, pagSeguroWebhook } = require('../controllers/SubscriptionController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.post('/checkout', requireAuth, createCheckout); // aqui sim
router.post('/webhook/pagseguro', express.json(), pagSeguroWebhook); // sem auth

module.exports = router;
