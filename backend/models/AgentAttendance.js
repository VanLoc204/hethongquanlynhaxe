const mongoose = require('mongoose');

/**
 * AgentAttendance Schema - Bảng Riêng Chấm Công Quầy Bán Vé
 * Mở rộng từ bảng chung Attendance (1-1 relationship qua attendanceId)
 * Chứa các thông tin tiền quỹ đầu ca, doanh thu chốt ca và đối soát tiền mặt.
 */
const agentAttendanceSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
      unique: true,
      index: true
    },
    initialCash: {
      type: Number,
      default: 0
    },
    cashCollected: {
      type: Number,
      default: 0
    },
    cashHandover: {
      type: Number,
      default: 0
    },
    cashDiscrepancy: {
      type: Number,
      default: 0
    },
    totalTicketsSold: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AgentAttendance', agentAttendanceSchema);
