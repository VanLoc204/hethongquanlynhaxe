const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true
    },
    userName: {
      type: String,
      required: [true, 'Tên người dùng là bắt buộc.']
    },
    rating: {
      type: Number,
      required: [true, 'Điểm đánh giá là bắt buộc.'],
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: [true, 'Nội dung nhận xét là bắt buộc.']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Review', reviewSchema);
