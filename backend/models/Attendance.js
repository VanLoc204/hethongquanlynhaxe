const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    // ── Liên kết nhân viên ────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId là bắt buộc.']
    },
    // Lưu lại tên + SĐT để tránh phải populate khi đọc bảng chấm công
    employeeName: {
      type: String,
      required: true
    },
    employeePhone: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['driver', 'attendant', 'ticket_agent', 'ticket_manager'],
      required: true
    },

    // ── Thời gian ─────────────────────────────────────────────────────────────
    // Ngày chấm công (normalize về 00:00:00 giờ địa phương để query theo ngày)
    date: {
      type: Date,
      required: true
    },
    checkInTime: {
      type: Date,
      default: null
    },
    checkOutTime: {
      type: Date,
      default: null
    },

    // ── Trạng thái ────────────────────────────────────────────────────────────
    /**
     * scheduled  - Chưa đến giờ ca trực
     * active     - Đang trong ca (đã check-in, chưa check-out)
     * closed     - Đã tan ca (đã check-out)
     * absent     - Vắng mặt (quá giờ mà chưa check-in)
     */
    status: {
      type: String,
      enum: ['scheduled', 'active', 'closed', 'absent'],
      default: 'scheduled'
    },

    // ── Xác thực nhận diện khuôn mặt ─────────────────────────────────────────
    faceVerified: {
      type: Boolean,
      default: false
    },
    // Khoảng cách Euclid nhỏ nhất khi nhận diện (để log/audit)
    faceDistance: {
      type: Number,
      default: null
    },
    // Xác thực người thật (Liveness Detection - Blink)
    isLiveVerified: {
      type: Boolean,
      default: false
    },
    // Ảnh chụp đối soát lúc Check-in (Base64 JPEG thumbnail)
    checkInPhoto: {
      type: String,
      default: null
    },
    // Ảnh chụp đối soát lúc Check-out
    checkOutPhoto: {
      type: String,
      default: null
    },

    // ── Thông tin vị trí ──────────────────────────────────────────────────────
    location: {
      type: String,
      default: 'Không xác định'
    },
    // Tọa độ GPS lúc check-in (nếu browser hỗ trợ)
    gpsLat: {
      type: Number,
      default: null
    },
    gpsLng: {
      type: Number,
      default: null
    },

    // ── Ghi chú ───────────────────────────────────────────────────────────────
    note: {
      type: String,
      default: ''
    },

    // ── Thông tin Chuyến xe liên kết ──────────────────────────────────────────
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null
    },
    tripRoute: {
      type: String,
      default: ''
    },
    busPlateNumber: {
      type: String,
      default: ''
    },
    scheduledDepartureTime: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index: mỗi nhân viên gắn với 1 chuyến xe (nếu chạy 2 chuyến/ngày sẽ có 2 bản ghi riêng biệt)
attendanceSchema.index({ userId: 1, tripId: 1 }, { unique: true, sparse: true });
attendanceSchema.index({ tripId: 1 });

// Index hỗ trợ query theo ngày (ops_manager đọc bảng)
attendanceSchema.index({ date: 1, role: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
