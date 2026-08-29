const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['leave', 'maintenance', 'incident'],
      default: 'leave'
    },
    typeName: {
      type: String,
      default: 'Đơn xin nghỉ phép'
    },
    details: {
      type: String
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    reason: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
