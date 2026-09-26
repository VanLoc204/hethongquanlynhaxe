const express = require('express');
const { getTargets, saveTarget } = require('../controllers/targetController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager'), getTargets)
  .post(restrictTo('general_manager', 'admin'), saveTarget);

module.exports = router;
