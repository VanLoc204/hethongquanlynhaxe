const express = require('express');
const router = express.Router();
const { 
  searchTrips, 
  getTripById, 
  createBooking, 
  payosWebhook, 
  updateBookingPayment,
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
  deleteTrip
} = require('../controllers/tripController');

// Search Route
router.get('/search', searchTrips);

// Create Booking Route
router.post('/book', createBooking);

// Update Booking Payment Route
router.patch('/book/:id', updateBookingPayment);

// PayOS Webhook Route
router.post('/payment/webhook', payosWebhook);

// Shipment Routes
router.post('/shipment/create', createShipment);
router.patch('/shipment/:id', updateShipmentPayment);
router.get('/shipment/track/:id', trackShipment);

const { protect, restrictTo } = require('../middlewares/authMiddleware');

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
router.put('/ops/trips/:id', protect, restrictTo('ops_manager', 'admin', 'general_manager'), updateTrip);
router.delete('/ops/trips/:id', protect, restrictTo('ops_manager', 'admin', 'general_manager'), deleteTrip);

// Get Trip details Route (placed last due to dynamic parameter path)
router.get('/:id', getTripById);

module.exports = router;
