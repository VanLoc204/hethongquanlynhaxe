const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  sendForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetForgotPasswordWithToken
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.post('/forgotpassword/send-otp', sendForgotPasswordOTP);
router.post('/forgotpassword/verify-otp', verifyForgotPasswordOTP);
router.post('/forgotpassword/reset', resetForgotPasswordWithToken);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
