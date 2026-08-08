const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    startDate: {
      type: Date,
      required: [true, 'Ngày bắt đầu nghỉ là bắt buộc.']
    },
    endDate: {
      type: Date,
      required: [true, 'Ngày kết thúc nghỉ là bắt buộc.']
    },
    reason: {
      type: String,
      required: [true, 'Lý do nghỉ là bắt buộc.']
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
