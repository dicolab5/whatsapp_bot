// src/routes/assistancesRoutes.js
const express = require('express');
const AssistanceController = require('../controllers/AssistanceController');

const router = express.Router();

router.post('/', AssistanceController.create);
router.get('/', AssistanceController.list);

module.exports = router;
