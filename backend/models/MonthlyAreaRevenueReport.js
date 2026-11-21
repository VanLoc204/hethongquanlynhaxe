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
    // Khóa ngoại tham chiếu User._id của Quản lý bán vé nộp tờ trình báo cáo
    // Chi nhánh được lấy trực tiếp từ ticketManagerId.branch.branchId trong bảng User
    ticketManagerId: {
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
    // Khóa ngoại tham chiếu User._id của Lãnh đạo Ban Giám Đốc phê duyệt
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
    // Khối xác thực chữ ký số điện tử chống chỉnh sửa dữ liệu kế toán
    digitalSignature: {
      isSigned: { type: Boolean, default: false },
      signedAt: { type: Date, default: null },
      certCode: { type: String, default: '' },
      hash: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Tránh trùng lặp báo cáo cùng tháng/năm của cùng 1 Quản lý bán vé
monthlyAreaRevenueReportSchema.index({ ticketManagerId: 1, month: 1, year: 1 });

module.exports = mongoose.model('MonthlyAreaRevenueReport', monthlyAreaRevenueReportSchema);
