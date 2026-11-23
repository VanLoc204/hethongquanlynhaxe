const mongoose = require('mongoose');

/**
 * Model MonthlyFleetExpenseReport (Chuẩn hóa cơ sở dữ liệu - Normalized 3NF)
 * 
 * Bảng này CHỈ lưu trữ các trường dữ liệu thực thể riêng biệt của báo cáo,
 * tham chiếu ID của các bảng liên quan (User, Maintenance).
 */
const monthlyFleetExpenseReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fleetManagerId: {
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
    // Chỉ lưu danh sách ID các phiếu bảo trì/sửa chữa nghiệm thu trong kỳ báo cáo
    maintenanceRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Maintenance'
      }
    ],
    // Ghi chú, giải trình của Quản lý Xe (Dữ liệu do người dùng nhập)
    fleetManagerNotes: {
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
    // Ý kiến chỉ đạo, nhận xét của Ban Giám Đốc (Dữ liệu do người dùng nhập)
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
    // Khối chữ ký số chứng thực điện tử
    digitalSignature: {
      isSigned: { type: Boolean, default: false },
      signerName: { type: String, default: '' },
      signedAt: { type: Date, default: null },
      certificateSerial: { type: String, default: '' },
      signatureHash: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

monthlyFleetExpenseReportSchema.index({ month: 1, year: 1, branchId: 1 });

module.exports = mongoose.model('MonthlyFleetExpenseReport', monthlyFleetExpenseReportSchema);
