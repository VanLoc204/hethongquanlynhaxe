const mongoose = require('mongoose');

/**
 * Attendance Schema - Bảng Chấm Công Cơ Sở (Lớp Chung cho toàn bộ nhân sự)
 * Chuẩn hóa 3NF: Chỉ lưu thông tin cốt lõi bắt buộc, loại bỏ hoàn toàn dữ liệu dư thừa.
 * Các thông tin chuyến xe (Tài xế/Phụ xe) -> Chuyển sang bảng CrewAttendance
 * Các thông tin quỹ tiền & ca trực bán vé -> Quản lý bởi bảng ShiftSession riêng
 */
const attendanceSchema = new mongoose.Schema(
  {
    // ── Khóa ngoại duy nhất tới nhân viên ────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId là bắt buộc.'],
      index: true
    },

    // ── Thời gian làm việc ───────────────────────────────────────────────────
    // Ngày chấm công (chuẩn hóa về 00:00:00 để truy vấn theo ngày/tháng)
    date: {
      type: Date,
      required: true,
      index: true
    },
    checkInTime: {
      type: Date,
      default: null
    },
    checkOutTime: {
      type: Date,
      default: null
    },
    totalHours: {
      type: Number,
      default: 0
    },

    // ── Trạng thái chấm công ─────────────────────────────────────────────────
    /**
     * scheduled - Đã phân công / Chờ đến ca
     * active    - Đang trong ca làm việc (đã check-in)
     * closed    - Đã hoàn thành ca / Tan ca (đã check-out)
     * absent    - Vắng mặt (quá giờ quy định mà chưa check-in)
     */
    status: {
      type: String,
      enum: ['scheduled', 'active', 'closed', 'absent'],
      default: 'scheduled',
      index: true
    },

    // ── Phân loại ca làm việc ────────────────────────────────────────────────
    /**
     * standard - Nhân sự giờ làm bình thường (Văn phòng, Quản lý, Giám đốc)
     * crew     - Tổ lái xe (Tài xế & Phụ xe) -> Có bảng con CrewAttendance
     * agent    - Nhân viên quầy vé (Ca trực quản lý bởi ShiftSession)
     */
    attendanceType: {
      type: String,
      enum: ['standard', 'crew', 'agent'],
      default: 'standard',
      index: true
    },

    // ── Xác thực Face ID & Sinh trắc học ─────────────────────────────────────
    faceVerified: {
      type: Boolean,
      default: false
    },
    // Sai số khoảng cách Euclid (ngưỡng chuẩn <= 0.38)
    faceDistance: {
      type: Number,
      default: null
    },
    // Kiểm tra liveness / nhấp nháy mắt
    isLiveVerified: {
      type: Boolean,
      default: false
    },
    // Ảnh chụp đối soát lúc Check-in
    checkInPhoto: {
      type: String,
      default: null
    },
    // Ảnh chụp đối soát lúc Check-out
    checkOutPhoto: {
      type: String,
      default: null
    },

    // ── Tọa độ GPS thực tế lúc thao tác ──────────────────────────────────────
    gpsLat: {
      type: Number,
      default: null
    },
    gpsLng: {
      type: Number,
      default: null
    },

    // ── Ghi chú nghiệp vụ ────────────────────────────────────────────────────
    note: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Index hỗ trợ tìm kiếm nhanh theo nhân viên và ngày
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
