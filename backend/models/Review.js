const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // Khóa ngoại tham chiếu Trip._id (Chuyến xe được đánh giá)
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: false
    },
    // Khóa ngoại tham chiếu Booking._id để lấy thông tin hành khách ở tầng Logic
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false
    },
    // Khóa ngoại tham chiếu User._id nếu khách hàng đã có tài khoản
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
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
    },
    category: {
      type: String,
      default: 'bus_quality' // 'bus_quality' | 'service' | 'staff' | 'general' | 'ticket_counter'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'resolved'],
      default: 'pending'
    },
    // Quản lý phòng vé trả lời bình luận của khách hàng
    replyContent: {
      type: String,
      default: ''
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: {
      type: Date
    },
    isReplied: {
      type: Boolean,
      default: false
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Review', reviewSchema);
