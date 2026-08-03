const express = require('express');
const router = express.Router();
const { createBooking, updateBookingPayment, payosWebhook, getMyBookings, cancelExpiredBooking } = require('../controllers/bookingController');

// Booking routes
router.post('/book', createBooking);
router.patch('/book/:id', updateBookingPayment);
router.post('/payment/webhook', payosWebhook);
router.get('/my-bookings/:userId', getMyBookings);
router.patch('/book/:id/cancel', cancelExpiredBooking);

module.exports = router;
