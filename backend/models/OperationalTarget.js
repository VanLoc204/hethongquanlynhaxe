const mongoose = require('mongoose');

const operationalTargetSchema = new mongoose.Schema(
  {
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
    revenueTarget: {
      type: Number,
      required: true,
      default: 200000000 // Chuẩn hóa 200 Triệu VNĐ quy mô doanh số thực tế
    },
    occupancyTarget: {
      type: Number,
      required: true,
      default: 20 // Mặc định 20% tỷ lệ lấp đầy ghế thực tế
    },
    fuelBudget: {
      type: Number,
      default: 30000000
    },
    maintenanceBudget: {
      type: Number,
      default: 15000000
    },
    otherBudget: {
      type: Number,
      default: 5000000
    },
    counterTarget: {
      type: Number,
      default: 140000000 // 140 Triệu VNĐ vé quầy (70%)
    },
    onlineTarget: {
      type: Number,
      default: 60000000 // 60 Triệu VNĐ vé online PayOS (30%)
    },
    branchTargets: [
      {
        branchId: { type: String, enum: ['sg', 'dl', 'ct'] },
        target: { type: Number, default: 0 }
      }
    ],
    notes: {
      type: String,
      default: 'Chỉ tiêu vận hành định hướng kinh doanh tháng.'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness per month and year
operationalTargetSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('OperationalTarget', operationalTargetSchema);
