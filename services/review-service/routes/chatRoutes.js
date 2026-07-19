const express = require('express');
const rateLimit = require('express-rate-limit');
const { handleChat } = require('../controllers/chatController');

const router = express.Router();

// Rate limiter: Max 60 requests per 15 minutes from an IP to prevent Gemini API quota abuse
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều câu hỏi trong thời gian ngắn. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /chat
router.post('/chat', chatLimiter, handleChat);

module.exports = router;
