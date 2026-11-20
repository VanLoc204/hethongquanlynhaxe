const mongoose = require('mongoose');

const monthlyTicketReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    // Khóa ngoại tham chiếu User._id của nhân viên bán vé
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    },
    agentNotes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    managerNotes: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    digitalSignature: {
      isSigned: { type: Boolean, default: false },
      signerName: { type: String, default: '' },
      signedAt: { type: Date, default: null },
      certCode: { type: String, default: '' },
      hash: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Tránh 1 nhân viên nộp trùng nhiều báo cáo cho cùng 1 tháng/năm
monthlyTicketReportSchema.index({ userId: 1, month: 1, year: 1 });

module.exports = mongoose.model('MonthlyTicketReport', monthlyTicketReportSchema);
