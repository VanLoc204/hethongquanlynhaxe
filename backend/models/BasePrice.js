const mongoose = require('mongoose');

const basePriceSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Tuyến đường là bắt buộc.']
    },
    routeName: {
      type: String,
      required: true
    },
    busType: {
      type: String,
      required: [true, 'Loại xe là bắt buộc.']
    },
    price: {
      type: Number,
      required: [true, 'Giá vé cơ bản là bắt buộc.'],
      min: [0, 'Giá vé không thể âm.']
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness of Route + Bus Type combination
basePriceSchema.index({ routeId: 1, busType: 1 }, { unique: true });

module.exports = mongoose.model('BasePrice', basePriceSchema);
