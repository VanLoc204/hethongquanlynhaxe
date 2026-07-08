const express = require('express');
const { register, login, getMe, updateDetails, updatePassword, forgotPassword } = require('../controllers/authController');
const protect = require('../utils/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
