// src/routes/salesRoutes.js
const express = require('express');
const SaleController = require('../controllers/SaleController');

const router = express.Router();

router.post('/', SaleController.create);
router.get('/', SaleController.list);

module.exports = router;
