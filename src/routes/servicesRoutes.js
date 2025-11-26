const express = require('express');
const router = express.Router();
const ServicesController = require('../controllers/ServicesController');

router.get('/:topicId', ServicesController.list);
router.post('/', ServicesController.create);
router.put('/:id', ServicesController.update);
router.delete('/:id', ServicesController.remove);

module.exports = router;
