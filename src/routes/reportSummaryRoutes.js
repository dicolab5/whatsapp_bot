// src/routes/reportSummaryRoutes.js
const express = require('express');
const router = express.Router();
const SummaryController = require('../controllers/SummaryController');
const { requireAuth } = require('../middlewares/auth');

router.get('/summary', requireAuth, SummaryController.summary);

module.exports = router;


// // src/routes/reportSummaryRoutes.js
// const express = require('express');
// const router = express.Router();
// const ReportController = require('../controllers/SummaryController');
// const { requireAuth } = require('../middlewares/auth');

// router.get('/summary', requireAuth, ReportController.summary);

// module.exports = router;
