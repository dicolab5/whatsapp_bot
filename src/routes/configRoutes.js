// src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const ConfigController = require('../controllers/ConfigController');

router.get('/profile', ConfigController.getProfile);
router.put('/email', ConfigController.updateEmail);
router.put('/phone', ConfigController.updatePhone);
router.put('/cpf', ConfigController.updateCPF);
router.put('/password', ConfigController.updatePassword);
router.get('/subscription', ConfigController.subscription);

module.exports = router;
