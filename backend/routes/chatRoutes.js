const express = require('express');
const rateLimit = require('express-rate-limit');
const { handleChat } = require('../controllers/chatController');

const router = express.Router();

// Rate limiter: Giới hạn tối đa 60 câu hỏi / 15 phút cho mỗi IP để chống spam
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 60,
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều câu hỏi trong thời gian ngắn. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

// Hỗ trợ cả 2 endpoint: POST / và POST /chat
router.post('/', chatLimiter, handleChat);
router.post('/chat', chatLimiter, handleChat);

module.exports = router;
