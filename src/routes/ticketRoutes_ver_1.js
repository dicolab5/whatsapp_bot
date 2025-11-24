// src/routes/ticketRoutes.js
const express = require('express');
const TicketController = require('../controllers/TicketController');
const router = express.Router();

// List tickets (API endpoints)
router.get('/human', TicketController.listHuman);
router.get('/maintenance', TicketController.listMaintenance);

// Resolve tickets
router.post('/:id/resolve-human', TicketController.resolveHuman);
router.post('/:id/resolve-maintenance', TicketController.resolveMaintenance);

module.exports = router;
