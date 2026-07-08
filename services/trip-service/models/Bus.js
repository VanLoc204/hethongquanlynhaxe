const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    plateNumber: {
      type: String,
      required: [true, 'Biển số xe là bắt buộc.'],
      unique: true
    },
    type: {
      type: String,
      required: [true, 'Loại xe là bắt buộc.'] // e.g. Limousine 22 Phòng (WC)
    },
    totalSeats: {
      type: Number,
      required: [true, 'Số lượng ghế là bắt buộc.']
    },
    amenities: [
      {
        type: String
      }
    ],
    images: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Bus', busSchema);
