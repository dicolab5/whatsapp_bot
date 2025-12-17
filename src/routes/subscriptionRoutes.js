// src/routes/subscriptionRoutes.js  
const router = require('express').Router();
const SubscriptionController = require('../controllers/SubscriptionController');

// Criar checkout (PIX manual)
router.post('/checkout', SubscriptionController.createCheckout);

// Verificar status por TXID
router.get('/status', SubscriptionController.getStatusByTxid);

module.exports = router;

