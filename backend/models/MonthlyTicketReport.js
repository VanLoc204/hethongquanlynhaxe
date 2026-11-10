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
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    branchId: {
      type: String,
      enum: ['sg', 'dl', 'ct'],
      default: 'sg',
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
    summary: {
      totalShifts: { type: Number, default: 0 },
      totalTickets: { type: Number, default: 0 },
      cashRevenue: { type: Number, default: 0 },
      cashlessRevenue: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      initialCashHandover: { type: Number, default: 0 }
    },
    shiftIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShiftSession'
      }
    ],
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

// Tránh 1 agent nộp trùng nhiều báo cáo cho cùng 1 tháng/năm khi báo cáo đã được duyệt hoặc đang chờ duyệt
monthlyTicketReportSchema.index({ agentId: 1, month: 1, year: 1 });

module.exports = mongoose.model('MonthlyTicketReport', monthlyTicketReportSchema);

