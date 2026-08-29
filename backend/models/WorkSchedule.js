const mongoose = require('mongoose');

const workScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'full_day'],
      default: 'full_day'
    },
    shiftName: {
      type: String,
      default: 'Ca Hành Chính 8h'
    },
    startTime: {
      type: String,
      default: '08:00'
    },
    endTime: {
      type: String,
      default: '17:00'
    },
    workHours: {
      type: Number,
      default: 8
    },
    salaryType: {
      type: String,
      default: 'Lương cố định tháng'
    },
    status: {
      type: String,
      enum: ['scheduled', 'present', 'late', 'absent', 'leave'],
      default: 'present'
    },
    notes: {
      type: String,
      default: 'Lịch làm việc cố định 8 tiếng/ngày (Sáng 08:00-12:00, Chiều 13:00-17:00)'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WorkSchedule', workScheduleSchema);
