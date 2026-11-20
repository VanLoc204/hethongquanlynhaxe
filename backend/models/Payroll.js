const mongoose = require('mongoose');

/**
 * Payroll Schema - Bảng Quyết Toán Lương Nhân Sự (Chuẩn 3NF Tuyệt Đối)
 * Chỉ lưu trữ các dữ liệu chốt số tài chính của kỳ lương (tháng/năm).
 * Toàn bộ thông tin nhân thân (name, phone, role) kế thừa trực tiếp từ bảng User (employeeId).
 * Các sự cố hoàn ứng được truy vấn trực tiếp từ bảng TripIncident.
 */
const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mã nhân viên là bắt buộc.']
    },
    month: {
      type: Number,
      required: [true, 'Tháng nhận lương là bắt buộc.'],
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: [true, 'Năm nhận lương là bắt buộc.']
    },
    baseSalary: {
      type: Number,
      required: [true, 'Lương cơ bản là bắt buộc.'],
      min: 0
    },
    allowance: {
      type: Number,
      required: [true, 'Phụ cấp là bắt buộc.'],
      min: 0
    },
    insuranceDeduction: {
      type: Number,
      required: [true, 'Khấu trừ bảo hiểm là bắt buộc.'],
      min: 0
    },
    netSalary: {
      type: Number,
      required: [true, 'Thực lĩnh là bắt buộc.'],
      min: 0
    },
    status: {
      type: String,
      enum: ['paid', 'pending'],
      default: 'paid'
    },
    paymentDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Đảm bảo mỗi nhân viên chỉ có duy nhất 1 bản ghi quyết toán lương cho mỗi kỳ tháng/năm
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
