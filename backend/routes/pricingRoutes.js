const express = require('express');
const { 
  getRules, 
  createRule, 
  updateRule, 
  deleteRule,
  getBasePrices,
  setBasePrice,
  lookupPrice,
  getExecutiveAiChat,
  getDemandAnalytics,
} = require('../controllers/pricingController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

// GM Executive AI Chat Assistant & Analytics
router.post('/gm-ai-chat', restrictTo('general_manager', 'admin'), getExecutiveAiChat);
router.get('/demand-analytics', restrictTo('general_manager', 'admin'), getDemandAnalytics);

// Pricing rules / Adjustments routes
router.route('/rules')
  .get(getRules)
  .post(restrictTo('general_manager', 'admin'), createRule);

router.route('/rules/:id')
  .put(restrictTo('general_manager', 'admin'), updateRule)
  .delete(restrictTo('general_manager', 'admin'), deleteRule);

// Base Prices management routes
router.route('/base-prices')
  .get(getBasePrices)
  .post(restrictTo('general_manager', 'admin'), setBasePrice);

router.route('/base-prices/lookup')
  .get(lookupPrice);

module.exports = router;
