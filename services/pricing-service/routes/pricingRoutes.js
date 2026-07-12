const express = require('express');
const { getRules, createRule, updateRule, deleteRule } = require('../controllers/pricingController');
const { protect, restrictTo } = require('../utils/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/rules')
  .get(getRules)
  .post(restrictTo('general_manager', 'admin'), createRule);

router.route('/rules/:id')
  .put(restrictTo('general_manager', 'admin'), updateRule)
  .delete(restrictTo('general_manager', 'admin'), deleteRule);

module.exports = router;
