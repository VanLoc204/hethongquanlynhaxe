const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: false
    },
    userName: {
      type: String,
      required: [true, 'Tên người dùng là bắt buộc.']
    },
    customerName: {
      type: String
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
    customerPhone: {
      type: String,
      default: ''
    },
    branchId: {
      type: String,
      default: 'sg'
    },
    category: {
      type: String,
      default: 'bus_quality' // 'bus_quality' | 'service' | 'staff' | 'general'
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

// Đồng bộ customerName và userName khi lưu
reviewSchema.pre('save', function (next) {
  if (this.userName && !this.customerName) {
    this.customerName = this.userName;
  } else if (this.customerName && !this.userName) {
    this.userName = this.customerName;
  }
  next();
});

module.exports = mongoose.model('Review', reviewSchema);

