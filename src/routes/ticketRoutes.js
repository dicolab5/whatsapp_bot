const express = require('express');
const TicketController = require('../controllers/TicketController');
const router = express.Router();

// List tickets (API endpoints)
router.get('/human', TicketController.listHuman);
router.get('/maintenance', TicketController.listMaintenance);

// Resolve tickets (POST + redirect)
router.post('/:id/resolve-human', TicketController.resolveHuman);
router.post('/:id/resolve-maintenance', TicketController.resolveMaintenance);

// Páginas de feedback (GET)
router.get('/:id/resolve-human', TicketController.resolveHumanPage);
router.get('/:id/resolve-maintenance', TicketController.resolveMaintenancePage);

module.exports = router;
