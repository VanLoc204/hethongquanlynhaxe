const mongoose = require('mongoose');

const pricingProposalSchema = new mongoose.Schema(
  {
    proposerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người lập đề xuất là bắt buộc.'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề đề xuất giá là bắt buộc.'],
      trim: true
    },
    proposalCategory: {
      type: String,
      enum: ['adjustment', 'base_price'],
      default: 'adjustment',
      index: true
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Tuyến đường áp dụng là bắt buộc.']
    },
    busType: {
      type: String,
      default: 'all'
    },
    proposalType: {
      type: String,
      enum: ['percentage', 'fixed_price', 'flat'],
      default: 'percentage'
    },
    currentPrice: {
      type: Number,
      default: 0
    },
    proposedPrice: {
      type: Number,
      required: [true, 'Giá vé đề xuất là bắt buộc.']
    },
    effectiveFrom: {
      type: Date,
      required: [true, 'Ngày bắt đầu áp dụng là bắt buộc.']
    },
    effectiveTo: {
      type: Date
    },
    reason: {
      type: String,
      required: [true, 'Lý do đề xuất giá là bắt buộc.']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewNote: {
      type: String,
      default: ''
    },
    reviewedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

pricingProposalSchema.index({ status: 1, createdAt: -1 });
pricingProposalSchema.index({ routeId: 1, status: 1 });
pricingProposalSchema.index({ proposalCategory: 1, status: 1 });

module.exports = mongoose.model('PricingProposal', pricingProposalSchema);
