// src/routes/authRoutes.js 
const express = require('express');
const AuthController = require('../controllers/AuthController');
const router = express.Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/enable-2fa', AuthController.enable2FA);
router.post('/verify-2fa', AuthController.verify2FA);
router.post('/disable-2fa', AuthController.disable2FA);

module.exports = router;
