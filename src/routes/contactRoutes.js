// src/routes/contactRoutes.js
const express = require('express');
const ContactController = require('../controllers/ContactController');
const router = express.Router();

// List contacts (API for AJAX frontend)
router.get('/', ContactController.list);

// Toggle opt-in
router.post('/:id/toggle-optin', ContactController.toggleOptIn);

// Clear all contacts
router.post('/clear', ContactController.clearContacts);

module.exports = router;

