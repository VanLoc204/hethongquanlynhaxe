const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mã nhân viên là bắt buộc.']
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại nhân viên là bắt buộc.']
    },
    name: {
      type: String,
      required: [true, 'Tên nhân viên là bắt buộc.']
    },
    role: {
      type: String,
      required: [true, 'Vai trò là bắt buộc.']
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
    absentDays: {
      type: Number,
      default: 0,
      min: 0
    },
    absentDeduction: {
      type: Number,
      default: 0,
      min: 0
    },
    incidentReimbursement: {
      type: Number,
      default: 0,
      min: 0
    },
    incidentItems: [
      {
        incidentCode: { type: String },
        title: { type: String },
        amount: { type: Number, default: 0 },
        status: { type: String },
        approvedAt: { type: Date }
      }
    ],
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

// Ensure an employee has only one payroll record per month/year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
