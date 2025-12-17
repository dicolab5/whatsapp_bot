// src/routes/userRoutes.js
const express = require('express');
const UserController = require('../controllers/UserController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// Registro (público)
router.post('/register', UserController.register);

// Dados básicos por id (se ainda quiser usar)
router.get('/info/:userId', requireAuth, UserController.getUserInfo);

// Dados de cobrança do usuário logado (para subscription.js)
router.get('/me/billing', requireAuth, UserController.getMyBilling);

module.exports = router;


// // src/routes/userRoutes.js
// const express = require('express');
// const UserController = require('../controllers/UserController');
// const router = express.Router();

// // Registro (público)
// router.post('/register', UserController.register);

// // Retorna dados do usuário logado
// router.get('/info/:userId', UserController.getUserInfo);

// module.exports = router;
