const express = require('express');
const router = express.Router();
const promoController = require('../controllers/PromoController');

router.get('/', promoController.listPromos);
router.get('/:id', promoController.getPromo);
router.post('/', promoController.createPromo);
router.put('/:id', promoController.updatePromo);
router.delete('/:id', promoController.deletePromo);

module.exports = router;
