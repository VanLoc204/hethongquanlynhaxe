const express = require('express');
const { getStaff, createStaff, updateStaff, deleteStaff, updateUserPoints, getUserById } = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { 
  getMySchedule, 
  submitLeave, 
  getMyLeaves, 
  getNotifications, 
  getMySalary,
  startShift,
  endShift,
  getCurrentShift,
  getShiftHistory,
  lookupTickets,
  createCounterBooking,
  cancelTicketAtCounter,
  verifyTicketQR,
  getTripBookings,
  checkInPassenger
} = require('../controllers/employeeController');

const router = express.Router();

// 1. Employee features mapping (Must be registered BEFORE /:id)
router.get('/my-schedule', protect, getMySchedule);
router.post('/leave', protect, submitLeave);
router.get('/leave', protect, getMyLeaves);
router.get('/notifications', protect, getNotifications);
router.get('/salary', protect, getMySalary);

// Ticket Agent specific routes
router.post('/shift/start', protect, startShift);
router.post('/shift/end', protect, endShift);
router.get('/shift/current', protect, getCurrentShift);
router.get('/shift/history', protect, getShiftHistory);
router.get('/agent/tickets', protect, lookupTickets);
router.post('/agent/book', protect, createCounterBooking);
router.post('/agent/cancel-ticket/:id', protect, cancelTicketAtCounter);
router.post('/agent/verify-ticket-qr', protect, verifyTicketQR);

// Attendant specific routes
router.get('/attendant/trip-bookings/:tripId', protect, getTripBookings);
router.post('/attendant/check-in/:bookingId', protect, checkInPassenger);
router.post('/attendant/verify-ticket-qr', protect, verifyTicketQR);


// 2. Dynamic ID routes
router.patch('/:id/points', updateUserPoints);
router.get('/:id', getUserById);

// 3. Apply protect to all staff admin routes
router.use(protect);

router.route('/staff')
  .get(restrictTo('general_manager', 'admin', 'ops_manager'), getStaff)
  .post(restrictTo('general_manager', 'admin'), createStaff);

router.route('/staff/:id')
  .put(restrictTo('general_manager', 'admin'), updateStaff)
  .delete(restrictTo('general_manager', 'admin'), deleteStaff);

module.exports = router;
