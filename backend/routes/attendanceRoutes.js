const express = require('express');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const {
  registerFace,
  checkIn,
  checkOut,
  resetTodayAttendance,
  getTodayAttendance,
  getMyAttendance,
  getAttendanceStats
} = require('../controllers/attendanceController');

const router = express.Router();

// ─── Route dùng riêng cho Nhân viên (Tài xế / Phụ xe / Bán vé / Quản lý) ────
// Xem lịch sử chấm công của mình (kèm trạng thái hôm nay & Face ID)
router.get(
  '/mine',
  protect,
  restrictTo('driver', 'attendant', 'ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager', 'general_manager', 'admin'),
  getMyAttendance
);

// Chấm công vào ca bằng khuôn mặt
router.post(
  '/check-in',
  protect,
  restrictTo('driver', 'attendant', 'ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager', 'general_manager', 'admin'),
  checkIn
);

// Chấm công tan ca bằng khuôn mặt
router.post(
  '/check-out',
  protect,
  restrictTo('driver', 'attendant', 'ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager', 'general_manager', 'admin'),
  checkOut
);

// Đặt lại (reset) bản ghi ca trực hôm nay để phục vụ test/demo
router.delete(
  '/reset-today',
  protect,
  restrictTo('driver', 'attendant', 'ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager', 'general_manager', 'admin'),
  resetTodayAttendance
);

// ─── Route dùng cho Quản lý Vận tải / Quản lý Đội xe / Quản lý Phòng vé / Giám đốc / Admin ───────────────────────
// Xem bảng chấm công hôm nay (query: ?date=YYYY-MM-DD để xem ngày khác)
router.get(
  '/today',
  protect,
  restrictTo('ops_manager', 'general_manager', 'fleet_manager', 'ticket_manager', 'admin'),
  getTodayAttendance
);

// Đăng ký khuôn mặt cho nhân viên
// Body: { userId?, faceDescriptors: [[128 số], ...], facePhoto?: string }
router.post(
  '/register-face',
  protect,
  restrictTo('ops_manager', 'general_manager', 'admin', 'ticket_manager', 'fleet_manager', 'driver', 'attendant', 'ticket_agent'),
  registerFace
);

// ─── Route thống kê tổng hợp cho Giám đốc ────────────────────────────────────
// Query: ?month=10&year=2026
router.get(
  '/stats',
  protect,
  restrictTo('general_manager', 'admin'),
  getAttendanceStats
);

module.exports = router;
