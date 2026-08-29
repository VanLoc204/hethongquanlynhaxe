const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true
    },
    departureTime: {
      type: Date,
      required: [true, 'Thời gian xuất phát là bắt buộc.']
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Thời gian đến dự kiến là bắt buộc.']
    },
    price: {
      type: Number,
      required: [true, 'Giá vé là bắt buộc.']
    },
    pickupPoints: [
      {
        time: { type: String, required: true },
        location: { type: String, required: true },
        address: { type: String, required: true }
      }
    ],
    dropoffPoints: [
      {
        time: { type: String, required: true },
        location: { type: String, required: true },
        address: { type: String, required: true }
      }
    ],
    bookedSeats: [
      {
        type: String // List of seat codes booked, e.g. ["A1", "A3"]
      }
    ],
    ratings: {
      average: { type: Number, default: 5.0 },
      count: { type: Number, default: 0 }
    },
    policy: {
      cancellation: { type: String, default: 'Yêu cầu hủy vé trước 24 giờ so với giờ khởi hành để được hoàn 100% tiền vé. Hủy vé trong vòng 24 giờ không được hoàn tiền.' },
      luggage: { type: String, default: 'Hành khách được mang theo tối đa 20kg hành lý ký gửi miễn phí. Không mang động vật nuôi hoặc các chất cấm lên xe.' }
    },
    driver: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    assistant: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    journeyStatus: {
      type: String,
      enum: ['scheduled', 'in_transit', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    currentStopIndex: {
      type: Number,
      default: -1
    },
    journeyLogs: [
      {
        time: { type: Date, default: Date.now },
        location: { type: String },
        address: { type: String },
        desc: { type: String }
      }
    ]
  },
  {
    timestamps: true
  }
);

tripSchema.index({ routeId: 1 });
tripSchema.index({ departureTime: 1 });
tripSchema.index({ 'pickupPoints.location': 1 });
tripSchema.index({ 'dropoffPoints.location': 1 });
tripSchema.index({ routeId: 1, departureTime: 1 });
tripSchema.index({ 'driver.phone': 1 });
tripSchema.index({ 'assistant.phone': 1 });

module.exports = mongoose.model('Trip', tripSchema);
