// src/routes/pixWebhookRoutes.js
const router = require('express').Router();
const PixWebhookController = require('../controllers/PixWebhookController');

router.post('/webhook', PixWebhookController.handle);

module.exports = router;


// const router = require('express').Router();
// const PixWebhookController = require('../controllers/PixWebhookController');

// router.post('/webhook', PixWebhookController.handle);

// module.exports = router;
