const express = require('express');
const { getStaff, createStaff, updateStaff, deleteStaff, updateUserPoints, getUserById } = require('../controllers/userController');
const { protect, restrictTo } = require('../utils/authMiddleware');

const router = express.Router();

// Internal/public routes
router.patch('/:id/points', updateUserPoints);
router.get('/:id', getUserById);

// Apply protect to all staff routes
router.use(protect);

router.route('/staff')
  .get(restrictTo('general_manager', 'admin', 'ops_manager'), getStaff)
  .post(restrictTo('general_manager', 'admin'), createStaff);

router.route('/staff/:id')
  .put(restrictTo('general_manager', 'admin'), updateStaff)
  .delete(restrictTo('general_manager', 'admin'), deleteStaff);

module.exports = router;
