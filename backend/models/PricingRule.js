const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên quy định giá vé là bắt buộc.']
    },
    routeId: {
      type: String, // Store route _id as string or 'all'
      default: 'all'
    },
    routeName: {
      type: String, // Store user-friendly route name
      default: 'Tất cả các tuyến'
    },
    busType: {
      type: String, // 'Giường nằm', 'Ghế ngồi', 'Limousine', 'all'
      default: 'all'
    },
    dayOfWeek: {
      type: [Number], // 0: CN, 1: T2, ..., 6: T7
      default: []
    },
    adjustmentType: {
      type: String,
      enum: ['percentage', 'flat'],
      default: 'percentage'
    },
    adjustmentValue: {
      type: Number,
      required: [true, 'Giá trị điều chỉnh là bắt buộc.']
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
