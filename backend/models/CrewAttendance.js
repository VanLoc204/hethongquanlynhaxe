const mongoose = require('mongoose');

/**
 * CrewAttendance Schema - Bảng Riêng Chấm Công Tổ Lái Xe (Tài xế & Phụ xe)
 * Mở rộng từ bảng chung Attendance (1-1 relationship qua attendanceId)
 * Chứa các thông tin đặc thù của chuyến xe vận tải hành khách.
 */
const crewAttendanceSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
      unique: true,
      index: true
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
      index: true
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null
    },
    roleInTrip: {
      type: String,
      enum: ['driver_main', 'attendant'],
      default: 'driver_main'
    },
    punctuality: {
      type: String,
      enum: ['on_time', 'late', 'early'],
      default: 'on_time'
    },
    actualDeparture: {
      type: Date,
      default: null
    },
    actualArrival: {
      type: Date,
      default: null
    },
    actualKm: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

crewAttendanceSchema.index({ tripId: 1 });

module.exports = mongoose.model('CrewAttendance', crewAttendanceSchema);
