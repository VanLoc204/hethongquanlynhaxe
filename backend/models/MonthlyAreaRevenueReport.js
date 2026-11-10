const mongoose = require('mongoose');

const monthlyAreaRevenueReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    ticketManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    branchId: {
      type: String,
      default: 'sg',
      index: true
    },
    branchName: {
      type: String,
      default: 'Chi nhánh TP. Hồ Chí Minh'
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
    // Mục 1 & 2: Tổng doanh thu và phân loại dòng tiền
    summary: {
      totalRevenue: { type: Number, default: 0 },
      cashRevenue: { type: Number, default: 0 },
      cashlessRevenue: { type: Number, default: 0 },
      cashRate: { type: Number, default: 0 },
      cashlessRate: { type: Number, default: 0 },
      totalTickets: { type: Number, default: 0 },
      shiftsCount: { type: Number, default: 0 }
    },
    // Mục 3: Thống kê doanh thu theo từng quầy / điểm bán vé thuộc khu vực
    counterBreakdown: [
      {
        counter: { type: String, required: true },
        shiftsCount: { type: Number, default: 0 },
        totalCash: { type: Number, default: 0 },
        totalCashless: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        ticketsCount: { type: Number, default: 0 },
        rate: { type: Number, default: 0 }
      }
    ],
    // Mục 4: Thống kê doanh thu theo từng nhân viên bán vé trong chi nhánh
    staffBreakdown: [
      {
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        staffName: { type: String, required: true },
        phone: { type: String, default: '' },
        shiftsCount: { type: Number, default: 0 },
        totalCash: { type: Number, default: 0 },
        totalCashless: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        ticketsCount: { type: Number, default: 0 },
        rate: { type: Number, default: 0 }
      }
    ],
    ticketManagerNotes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    directorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    directorNotes: {
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

// Tránh trùng lặp báo cáo cùng tháng/năm/chi nhánh
monthlyAreaRevenueReportSchema.index({ branchId: 1, month: 1, year: 1 });

module.exports = mongoose.model('MonthlyAreaRevenueReport', monthlyAreaRevenueReportSchema);

