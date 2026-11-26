const mongoose = require('mongoose');

const routeDemandLogSchema = new mongoose.Schema(
  {
    // Chuỗi gốc người dùng nhập vào ô tìm kiếm
    fromRaw: {
      type: String,
      default: '',
      trim: true
    },
    toRaw: {
      type: String,
      default: '',
      trim: true
    },

    // Tỉnh/Thành phố sau khi chuẩn hóa bởi Gemini AI
    fromNormalized: {
      type: String,
      default: 'Toàn quốc',
      trim: true,
      index: true
    },
    toNormalized: {
      type: String,
      default: 'Toàn quốc',
      trim: true,
      index: true
    },

    // Tỉnh/Thành phân giải bởi Gemini AI
    fromProvince: {
      type: String,
      default: ''
    },
    toProvince: {
      type: String,
      default: ''
    },

    // Cụm chặng do Gemini AI chuẩn hóa (VD: "An Giang ➔ Lâm Đồng (Đà Lạt)")
    regionCluster: {
      type: String,
      default: '',
      index: true
    },

    // Phân loại hình thức tìm kiếm: Cặp chặng 2 chiều, chỉ tìm Điểm đến, hoặc chỉ tìm Điểm đi
    demandType: {
      type: String,
      enum: ['full_route', 'destination_only', 'origin_only'],
      default: 'full_route',
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

