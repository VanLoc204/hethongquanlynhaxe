const express = require('express');
const router = express.Router();
const {
  searchTrips,
  resolveSemanticLocation,
  getUpcomingTrips,
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
  autoScheduleTrips,
  updateJourneyStatus,
  getMaintenanceRecords,
  createMaintenanceRecord,
  getMaintenanceApprovals,
  reviewMaintenanceApproval,
  getFleetForecast,
  getBusStatusLogs,
  createBusStatusLog,
  getPunctualityReport,
  updateTripPunctuality,
  updateLiveGps
} = require('../controllers/tripController');
const { createBooking, updateBookingPayment, cancelExpiredBooking, getMyBookings } = require('../controllers/bookingController');
const {
  getFleetExpensePreview,
  submitFleetExpenseReport,
  getFleetExpenseReports,
  getFleetExpenseReportById,
  approveFleetExpenseReport,
  rejectFleetExpenseReport
} = require('../controllers/fleetExpenseReportController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// ==========================================
// Intercepted booking routes from Gateway
// ==========================================
// /api/trips/book ...
router.post('/book', createBooking);
router.patch('/book/:id', updateBookingPayment);
router.patch('/book/:id/cancel', cancelExpiredBooking);

// /api/trips/my-bookings/:userId ...
router.get('/my-bookings/:userId', getMyBookings);

// ==========================================
// Standard Trip / Route / Fleet / Shipment Routes
// ==========================================
// Search Route
router.get('/search', searchTrips);
router.get('/resolve-location', resolveSemanticLocation);
router.post('/resolve-location', resolveSemanticLocation);
router.get('/upcoming', getUpcomingTrips);

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

// Fleet Maintenance Routes
router.get('/fleet/forecast', protect, getFleetForecast);
router.get('/fleet/status-logs', protect, getBusStatusLogs);
router.post('/fleet/status-logs', protect, createBusStatusLog);
router.get('/fleet/maintenance-records', protect, getMaintenanceRecords);
router.post('/fleet/maintenance-records', protect, restrictTo('fleet_manager', 'admin', 'general_manager'), createMaintenanceRecord);
router.get('/fleet/maintenance-approvals', protect, restrictTo('general_manager', 'admin', 'fleet_manager'), getMaintenanceApprovals);
router.patch('/fleet/maintenance-approvals/:id', protect, restrictTo('general_manager', 'admin'), reviewMaintenanceApproval);

// Fleet Monthly Expense Reports (Quản lý chi tiêu Đội xe hàng tháng)
router.get('/fleet-expense-reports/preview', protect, restrictTo('fleet_manager', 'general_manager', 'admin'), getFleetExpensePreview);
router.post('/fleet-expense-reports/submit', protect, restrictTo('fleet_manager', 'admin'), submitFleetExpenseReport);
router.get('/fleet-expense-reports', protect, restrictTo('fleet_manager', 'general_manager', 'admin'), getFleetExpenseReports);
router.get('/fleet-expense-reports/:id', protect, restrictTo('fleet_manager', 'general_manager', 'admin'), getFleetExpenseReportById);
router.patch('/fleet-expense-reports/:id/approve', protect, restrictTo('general_manager', 'admin'), approveFleetExpenseReport);
router.patch('/fleet-expense-reports/:id/reject', protect, restrictTo('general_manager', 'admin'), rejectFleetExpenseReport);

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

// Ops Punctuality & Operations Report Routes
router.get('/ops/reports/punctuality', protect, restrictTo('ops_manager', 'general_manager', 'admin'), getPunctualityReport);
router.patch('/ops/trips/:id/punctuality', protect, restrictTo('ops_manager', 'general_manager', 'admin'), updateTripPunctuality);

// Driver Live GPS Tracking & Telemetry
router.put('/:id/live-gps', protect, updateLiveGps);

const {
  streamSeatLocks,
  getLockedSeats,
  lockSeat,
  unlockSeat,
  unlockAllMySeats
} = require('../controllers/seatLockController');

// Driver Journey Updates
router.patch('/:id/update-journey', protect, updateJourneyStatus);

// Realtime Seat Locking routes (5 phút)
router.get('/:id/seat-locks/stream', streamSeatLocks);
router.get('/:id/locked-seats', getLockedSeats);
router.post('/:id/lock-seat', lockSeat);
router.post('/:id/unlock-seat', unlockSeat);
router.post('/:id/unlock-all-my-seats', unlockAllMySeats);

// Get Trip details Route (placed last due to dynamic parameter path)
router.get('/:id', getTripById);

module.exports = router;
