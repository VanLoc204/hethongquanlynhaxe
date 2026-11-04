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
      default: 1000000000 // Default 1 Billion VND
    },
    occupancyTarget: {
      type: Number,
      required: true,
      default: 80 // Default 80% seat occupancy
    },
    fuelBudget: {
      type: Number,
      default: 150000000
    },
    maintenanceBudget: {
      type: Number,
      default: 50000000
    },
    otherBudget: {
      type: Number,
      default: 30000000
    },
    counterTarget: {
      type: Number,
      default: 600000000 // 600 Million VND counter sales target
    },
    onlineTarget: {
      type: Number,
      default: 400000000 // 400 Million VND online sales target
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
