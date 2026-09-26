const express = require('express');
const router = express.Router();
const {
  getPromotions,
  createPromotion,
  updatePromotion,
  togglePromotionStatus,
  deletePromotion,
  validatePromotion,
} = require('../controllers/promotionController');

router.route('/')
  .get(getPromotions)
  .post(createPromotion);

router.post('/validate', validatePromotion);

router.route('/:id')
  .put(updatePromotion)
  .delete(deletePromotion);

router.patch('/:id/toggle-status', togglePromotionStatus);

module.exports = router;
