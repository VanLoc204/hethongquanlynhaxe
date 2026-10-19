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

// ─── Route dùng riêng cho Tài xế / Phụ xe ────────────────────────────────────
// Xem lịch sử chấm công của mình (kèm trạng thái hôm nay)
router.get('/mine', protect, restrictTo('driver', 'attendant'), getMyAttendance);

// Chấm công vào ca bằng khuôn mặt
router.post('/check-in', protect, restrictTo('driver', 'attendant'), checkIn);

// Chấm công tan ca bằng khuôn mặt
router.post('/check-out', protect, restrictTo('driver', 'attendant'), checkOut);

// Đặt lại (reset) bản ghi ca trực hôm nay để phục vụ test/demo
router.delete(
  '/reset-today',
  protect,
  restrictTo('driver', 'attendant', 'ops_manager', 'general_manager', 'admin'),
  resetTodayAttendance
);

// ─── Route dùng cho Quản lý Vận tải / Giám đốc / Admin ───────────────────────
// Xem bảng chấm công hôm nay (query: ?date=YYYY-MM-DD để xem ngày khác)
router.get(
  '/today',
  protect,
  restrictTo('ops_manager', 'general_manager', 'fleet_manager', 'admin'),
  getTodayAttendance
);

// Đăng ký khuôn mặt cho nhân viên (ops_manager thực hiện hộ hoặc tài xế / phụ xe tự chụp đăng ký lần đầu)
// Body: { userId?, faceDescriptors: [[128 số], ...], facePhoto?: string }
router.post(
  '/register-face',
  protect,
  restrictTo('ops_manager', 'general_manager', 'admin', 'driver', 'attendant'),
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
