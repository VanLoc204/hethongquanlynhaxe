const express = require('express');
const { getStaff, createStaff, updateStaff, deleteStaff, updateUserPoints, getUserById, getMemberByPhone } = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { 
  getMySchedule, 
  getWorkSchedules,
  submitLeave, 
  getMyLeaves, 
  getNotifications, 
  getMySalary,
  startShift,
  endShift,
  pauseShift,
  resumeShift,
  verifyShiftCash,
  getCounterBalance,
  getCurrentShift,
  getShiftHistory,
  lookupTickets,
  createCounterBooking,
  cancelTicketAtCounter,
  resendTicketNotification,
  getBanksList,
  verifyTicketQR,
  getTripBookings,
  checkInPassenger,
  getAllLeaves,
  updateLeaveStatus,
  getManagerAttendance,
  createIncidentReport,
  getTicketRevenueReport,
  getTicketIncidents,
  createTicketIncident,
  updateTicketIncident,
  getTicketFeedbacks,
  createTicketFeedback,
  resolveTicketFeedback,
  replyTicketFeedback,
  createDriverIncident,
  getDriverIncidents,
  getOpsIncidents,
  reviewIncidentReimbursement,
  updateIncidentAssistance
} = require('../controllers/employeeController');

const {
  submitTripReport,
  getTripReportByTripId,
  getTripReports,
  getTripReportById,
  signTripReport,
  autoMidnightCheck
} = require('../controllers/tripReportController');

const {
  getMonthlyPreview,
  submitMonthlyReport,
  getAgentReports,
  getManagerReports,
  getReportDetail,
  signApproveReport,
  rejectReport
} = require('../controllers/monthlyTicketReportController');

const {
  getAreaRevenuePreview,
  submitAreaRevenueReport,
  getAreaRevenueReports,
  getAreaRevenueReportById,
  approveAreaRevenueReport,
  rejectAreaRevenueReport
} = require('../controllers/areaRevenueReportController');

const router = express.Router();

// 1. Employee features mapping (Must be registered BEFORE /:id)
router.get('/my-schedule', protect, getMySchedule);
router.get('/work-schedules', protect, getWorkSchedules);
router.post('/leave', protect, submitLeave);
router.get('/leave', protect, getMyLeaves);
router.get('/notifications', protect, getNotifications);
router.get('/salary', protect, getMySalary);

// Ticket Agent & Shift specific routes
router.post('/shift/start', protect, startShift);
router.post('/shift/end', protect, endShift);
router.post('/shift/pause', protect, pauseShift);
router.post('/shift/resume', protect, resumeShift);
router.patch('/shift/:id/verify-cash', protect, restrictTo('ticket_manager', 'general_manager', 'admin'), verifyShiftCash);
router.get('/shift/current', protect, getCurrentShift);
router.get('/shift/counter-balance', protect, getCounterBalance);
router.get('/shift/history', protect, getShiftHistory);
router.get('/agent/tickets', protect, lookupTickets);
router.post('/agent/book', protect, createCounterBooking);
router.post('/agent/cancel-ticket/:id', protect, cancelTicketAtCounter);
router.post('/agent/resend-ticket/:id', protect, resendTicketNotification);
router.get('/member-by-phone/:phone', getMemberByPhone);
router.get('/banks-list', protect, getBanksList);
router.post('/agent/verify-ticket-qr', protect, verifyTicketQR);

// Attendant specific routes
router.get('/attendant/trip-bookings/:tripId', protect, getTripBookings);
router.post('/attendant/check-in/:bookingId', protect, checkInPassenger);
router.post('/attendant/verify-ticket-qr', protect, verifyTicketQR);
router.post('/attendant/trip-reports', protect, restrictTo('attendant', 'ops_manager', 'admin'), submitTripReport);
router.get('/attendant/trip-reports/by-trip/:tripId', protect, getTripReportByTripId);


// 3. Apply protect to all staff admin routes
router.use(protect);

router.route('/staff')
  .get(restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'ticket_manager'), getStaff)
  .post(restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'ticket_manager'), createStaff);

router.route('/staff/:id')
  .put(restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'ticket_manager'), updateStaff)
  .delete(restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'ticket_manager'), deleteStaff);

router.get('/admin/leaves', restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'ticket_manager'), getAllLeaves);
router.patch('/admin/leaves/:id', restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'ticket_manager'), updateLeaveStatus);
router.get('/admin/attendance', restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'ticket_manager'), getManagerAttendance);
router.post('/admin/incidents', restrictTo('general_manager', 'admin', 'ops_manager', 'fleet_manager', 'driver', 'attendant'), createIncidentReport);

// 4. Ticket Manager Reports, Incidents, & Customer Feedback
router.get('/ticket-manager/revenue-report', restrictTo('ticket_manager', 'general_manager', 'admin'), getTicketRevenueReport);
router.get('/ticket-manager/incidents', restrictTo('ticket_manager', 'general_manager', 'admin', 'ticket_agent'), getTicketIncidents);
router.post('/ticket-manager/incidents', restrictTo('ticket_manager', 'general_manager', 'admin', 'ticket_agent'), createTicketIncident);
router.patch('/ticket-manager/incidents/:id', restrictTo('ticket_manager', 'general_manager', 'admin'), updateTicketIncident);
router.get('/ticket-manager/feedbacks', restrictTo('ticket_manager', 'general_manager', 'admin'), getTicketFeedbacks);
router.post('/ticket-manager/feedbacks', restrictTo('ticket_manager', 'general_manager', 'admin', 'ticket_agent'), createTicketFeedback);
router.patch('/ticket-manager/feedbacks/:id/resolve', restrictTo('ticket_manager', 'general_manager', 'admin'), resolveTicketFeedback);
router.patch('/ticket-manager/feedbacks/:id/reply', restrictTo('ticket_manager', 'general_manager', 'admin'), replyTicketFeedback);

// 5. On-Route Driver Incidents (Chỉ dành cho Tài xế báo cáo & Quản lý vận tải xử lý)
router.post('/driver/incidents', restrictTo('driver', 'admin'), createDriverIncident);
router.get('/driver/incidents', restrictTo('driver', 'admin'), getDriverIncidents);
router.get('/ops/incidents', restrictTo('ops_manager', 'admin', 'general_manager'), getOpsIncidents);
router.patch('/ops/incidents/:id/reimbursement', restrictTo('ops_manager', 'admin'), reviewIncidentReimbursement);
router.patch('/ops/incidents/:id/assistance', restrictTo('ops_manager', 'admin'), updateIncidentAssistance);

// 6. Trip Reports (Báo cáo thống kê hành khách chuyến xe - Phụ xe nộp & Quản lý vận tải ký duyệt điện tử)
router.get('/ops/trip-reports', restrictTo('ops_manager', 'attendant', 'general_manager', 'admin'), getTripReports);
router.get('/ops/trip-reports/:id', restrictTo('ops_manager', 'attendant', 'general_manager', 'admin'), getTripReportById);
router.patch('/ops/trip-reports/:id/sign', restrictTo('ops_manager', 'general_manager', 'admin'), signTripReport);
router.post('/ops/trip-reports/auto-midnight-check', restrictTo('ops_manager', 'admin'), autoMidnightCheck);

// 7. Monthly Ticket Revenue Reports (Báo cáo doanh thu tháng - Nhân viên bán vé nộp & Quản lý phòng vé ký duyệt điện tử)
router.get('/monthly-reports/preview', protect, restrictTo('ticket_agent', 'ticket_manager', 'general_manager', 'admin'), getMonthlyPreview);
router.post('/monthly-reports/submit', protect, restrictTo('ticket_agent', 'admin'), submitMonthlyReport);
router.get('/monthly-reports/my-reports', protect, restrictTo('ticket_agent', 'admin'), getAgentReports);
router.get('/monthly-reports/manager', protect, restrictTo('ticket_manager', 'general_manager', 'admin'), getManagerReports);
router.get('/monthly-reports/:id', protect, restrictTo('ticket_agent', 'ticket_manager', 'general_manager', 'admin'), getReportDetail);
router.patch('/monthly-reports/:id/sign', protect, restrictTo('ticket_manager', 'general_manager', 'admin'), signApproveReport);
router.patch('/monthly-reports/:id/reject', protect, restrictTo('ticket_manager', 'general_manager', 'admin'), rejectReport);

// 8. Monthly Area Revenue Reports (Báo cáo doanh thu khu vực hàng tháng - Quản lý phòng vé nộp & Ban Giám đốc ký duyệt điện tử)
router.get('/area-revenue-reports/preview', protect, restrictTo('ticket_manager', 'general_manager', 'admin'), getAreaRevenuePreview);
router.post('/area-revenue-reports/submit', protect, restrictTo('ticket_manager', 'admin'), submitAreaRevenueReport);
router.get('/area-revenue-reports', protect, restrictTo('ticket_manager', 'general_manager', 'admin'), getAreaRevenueReports);
router.get('/area-revenue-reports/:id', protect, restrictTo('ticket_manager', 'general_manager', 'admin'), getAreaRevenueReportById);
router.patch('/area-revenue-reports/:id/approve', protect, restrictTo('general_manager', 'admin'), approveAreaRevenueReport);
router.patch('/area-revenue-reports/:id/reject', protect, restrictTo('general_manager', 'admin'), rejectAreaRevenueReport);

// 2. Dynamic ID routes (placed at the end to prevent route hijacking)
router.patch('/:id/points', updateUserPoints);
router.get('/:id', getUserById);

module.exports = router;
