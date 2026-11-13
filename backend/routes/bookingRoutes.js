const express = require('express');
const router = express.Router();
const { createBooking, updateBookingPayment, payosWebhook, getMyBookings, getBookingByOrderCode, cancelExpiredBooking } = require('../controllers/bookingController');

// Booking routes
router.post('/book', createBooking);
router.patch('/book/:id', updateBookingPayment);
router.post('/payment/webhook', payosWebhook);
router.get('/order/:orderCode', getBookingByOrderCode);
router.get('/my-bookings/:userId', getMyBookings);
router.patch('/book/:id/cancel', cancelExpiredBooking);

module.exports = router;
