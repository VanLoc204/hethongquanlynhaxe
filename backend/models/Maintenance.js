const mongoose = require('mongoose');

/**
 * Model Maintenance (Bảng Quản Lý Kỹ Thuật & Nhật Ký Biến Động Vận Hành)
 * 
 * Lưu trữ toàn bộ các đợt bảo dưỡng định kỳ, sửa chữa sự cố,
 * cũng như các biến động điều chuyển bãi lưu (inactive) và xuất bến (ready).
 */
const maintenanceSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Mã xe là bắt buộc.']
    },
    type: {
      type: String,
      enum: ['maintenance', 'repairing', 'inactive', 'ready'],
      default: 'maintenance'
    },
    description: {
      type: String,
      required: [true, 'Nội dung thực hiện là bắt buộc.']
    },
    garage: {
      type: String,
      default: '-'
    },
    cost: {
      type: Number,
      default: 0,
      min: [0, 'Chi phí không thể âm.']
    },
    estimatedCost: {
      type: Number,
      default: 0
    },
    isMajor: {
      type: Boolean,
      default: false
    },
    approvalStatus: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected'],
      default: 'approved'
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    approvalNote: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema, 'maintenances');
