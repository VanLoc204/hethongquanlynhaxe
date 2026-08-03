const express = require('express');
const router = express.Router();
const { 
  searchTrips, 
  getTripById, 
  payosWebhook, 
  createShipment,
  updateShipmentPayment,
  trackShipment,
  getBuses,
  createBus,
  updateBus,
  deleteBus,
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  releaseSeats,
  getPublicRoutes,
  autoScheduleTrips
} = require('../controllers/tripController');
const { createBooking, updateBookingPayment, cancelExpiredBooking, getMyBookings } = require('../controllers/bookingController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// ==========================================
// Intercepted booking routes from Gateway
// ==========================================
// /api/v1/trips/book ...
router.post('/book', createBooking);
router.patch('/book/:id', updateBookingPayment);
router.patch('/book/:id/cancel', cancelExpiredBooking);

// /api/v1/trips/my-bookings/:userId ...
router.get('/my-bookings/:userId', getMyBookings);

// ==========================================
// Standard Trip / Route / Fleet / Shipment Routes
// ==========================================
// Search Route
router.get('/search', searchTrips);

// Get all routes (public view for search suggestions)
router.get('/routes', getPublicRoutes);

// PayOS Webhook Route
router.post('/payment/webhook', payosWebhook);

// Shipment Routes
router.post('/shipment/create', createShipment);
router.patch('/shipment/:id', updateShipmentPayment);
router.get('/shipment/track/:id', trackShipment);

// Fleet Bus Routes
router.get('/fleet/buses', protect, getBuses);
router.post('/fleet/buses', protect, restrictTo('fleet_manager', 'admin', 'general_manager'), createBus);
router.put('/fleet/buses/:id', protect, restrictTo('fleet_manager', 'admin', 'general_manager'), updateBus);
router.delete('/fleet/buses/:id', protect, restrictTo('fleet_manager', 'admin', 'general_manager'), deleteBus);

// Ops Route Routes
router.get('/ops/routes', protect, getRoutes);
router.post('/ops/routes', protect, restrictTo('ops_manager', 'admin', 'general_manager'), createRoute);
router.put('/ops/routes/:id', protect, restrictTo('ops_manager', 'admin', 'general_manager'), updateRoute);
router.delete('/ops/routes/:id', protect, restrictTo('ops_manager', 'admin', 'general_manager'), deleteRoute);

// Ops Trip Routes
router.get('/ops/trips', protect, getTrips);
router.post('/ops/trips', protect, restrictTo('ops_manager', 'admin', 'general_manager'), createTrip);
router.post('/ops/trips/auto-schedule', protect, restrictTo('ops_manager', 'admin', 'general_manager'), autoScheduleTrips);
router.put('/ops/trips/:id', protect, restrictTo('ops_manager', 'admin', 'general_manager'), updateTrip);
router.delete('/ops/trips/:id', protect, restrictTo('ops_manager', 'admin', 'general_manager'), deleteTrip);

// Internal: Release seats on booking cancellation
router.patch('/:id/release-seats', releaseSeats);

// Get Trip details Route (placed last due to dynamic parameter path)
router.get('/:id', getTripById);

module.exports = router;
