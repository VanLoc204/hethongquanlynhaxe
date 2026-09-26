const express = require('express');
const { 
  getSystemHealth, 
  getAuditLogs, 
  getSystemErrors, 
  checkDbHealth, 
  clearRedisCache 
} = require('../controllers/systemController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply authentication & admin authorization
router.use(protect);
router.use(restrictTo('admin', 'general_manager'));

router.get('/health', getSystemHealth);
router.get('/logs', getAuditLogs);
router.get('/errors', getSystemErrors);
router.post('/db/health-check', checkDbHealth);
router.post('/redis/clear', clearRedisCache);

module.exports = router;
