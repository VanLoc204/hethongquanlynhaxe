const mongoose = require('mongoose');

const routeDemandLogSchema = new mongoose.Schema(
  {
    // Chuỗi gốc người dùng nhập vào ô tìm kiếm
    fromRaw: {
      type: String,
      required: [true, 'Điểm đi là bắt buộc.'],
      trim: true
    },
    toRaw: {
      type: String,
      required: [true, 'Điểm đến là bắt buộc.'],
      trim: true
    },

    // Tỉnh/Thành phố sau khi chuẩn hóa bởi AI hoặc bộ từ điển
    fromNormalized: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    toNormalized: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    // Ngày khách muốn đi (YYYY-MM-DD)
    searchDate: {
      type: String,
      default: ''
    },

    // Số lượng hành khách / số vé cần đặt
    passengers: {
      type: Number,
      default: 1,
      min: 1
    },

    // Kết quả tìm kiếm thực tế của hệ thống
    tripResultsCount: {
      type: Number,
      default: 0
    },
    hasResults: {
      type: Boolean,
      default: false,
      index: true
    },

    // Tuyến đường này trong hệ thống đã có chưa?
    // true = đã có tuyến nhưng hết vé/hết giờ; false = nhà xe chưa từng mở tuyến này
    isRouteExistingInSystem: {
      type: Boolean,
      default: false,
      index: true
    },

    // Mã hash IP / Session để hỗ trợ lọc request trùng hoặc spam
    clientIpHash: {
      type: String,
      default: '',
      select: false
    },

    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop'
    }
  },
  {
    timestamps: true
  }
);

// Chỉ mục phức hợp tối ưu cho Aggregation & thống kê Real-time
routeDemandLogSchema.index({ fromNormalized: 1, toNormalized: 1, hasResults: 1, createdAt: -1 });

module.exports = mongoose.model('RouteDemandLog', routeDemandLogSchema);

