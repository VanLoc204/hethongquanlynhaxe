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
  getPublicRoutes
} = require('../controllers/tripController');

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

// Internal: Release seats on booking cancellation (called by booking-service)
router.patch('/:id/release-seats', releaseSeats);

// Get Trip details Route (placed last due to dynamic parameter path)
router.get('/:id', getTripById);

module.exports = router;
