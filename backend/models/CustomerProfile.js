const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    points: {
      type: Number,
      default: 150 // Điểm thưởng chào mừng mặc định
    },
    membershipTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
