// src/routes/reportRoutes.js
const express = require('express');
const ReportController = require('../controllers/ReportController');

const router = express.Router();

router.get('/', ReportController.getReport);

module.exports = router;
