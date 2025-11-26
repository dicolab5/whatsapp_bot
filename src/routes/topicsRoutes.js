const express = require('express');
const router = express.Router();
const TopicsController = require('../controllers/TopicsController');

router.get('/', TopicsController.list);
router.post('/', TopicsController.create);
router.put('/:id', TopicsController.update);
router.delete('/:id', TopicsController.remove);

module.exports = router;
