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
  getUnmetDemandAnalytics,
  createPricingProposal,
  getPricingProposals,
  reviewPricingProposal,
  deletePricingProposal
} = require('../controllers/pricingController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

// Pricing proposals (Ticket Manager -> General Manager)
router.route('/proposals')
  .get(restrictTo('ticket_manager', 'general_manager', 'admin'), getPricingProposals)
  .post(restrictTo('ticket_manager', 'general_manager', 'admin'), createPricingProposal);

router.patch('/proposals/:id/review', restrictTo('general_manager', 'admin'), reviewPricingProposal);
router.delete('/proposals/:id', restrictTo('ticket_manager', 'general_manager', 'admin'), deletePricingProposal);

// GM Executive AI Chat Assistant & Analytics
router.post('/gm-ai-chat', restrictTo('general_manager', 'admin'), getExecutiveAiChat);
router.get('/demand-analytics', restrictTo('general_manager', 'admin'), getDemandAnalytics);
router.get('/unmet-demand', restrictTo('general_manager', 'admin'), getUnmetDemandAnalytics);

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
