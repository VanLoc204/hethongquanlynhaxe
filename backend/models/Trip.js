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
        address: { type: String, required: true },
        lat: { type: Number },
        lng: { type: Number }
      }
    ],
    dropoffPoints: [
      {
        time: { type: String, required: true },
        location: { type: String, required: true },
        address: { type: String, required: true },
        lat: { type: Number },
        lng: { type: Number }
      }
    ],
    bookedSeats: [
      {
        type: String // List of seat codes booked, e.g. ["A1", "A3"]
      }
    ],
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    driver: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    assistantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assistant: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    needsReplacement: {
      type: Boolean,
      default: false
    },
    isReliever: {
      type: Boolean,
      default: false
    },
    journeyStatus: {
      type: String,
      enum: ['scheduled', 'in_transit', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    liveGps: {
      lat: { type: Number },
      lng: { type: Number },
      speed: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
      status: { type: String, default: 'moving' },
      isOffRoute: { type: Boolean, default: false },
      offRouteDistance: { type: Number, default: 0 },
      rerouteCoords: { type: Array, default: [] },
      lastUpdated: { type: Date }
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for dynamic ratings calculation
tripSchema.virtual('ratings').get(function () {
  return { average: 5.0, count: 0 };
});

tripSchema.index({ routeId: 1 });
tripSchema.index({ driverId: 1 });
tripSchema.index({ assistantId: 1 });
tripSchema.index({ departureTime: 1 });
tripSchema.index({ 'pickupPoints.location': 1 });
tripSchema.index({ 'dropoffPoints.location': 1 });
tripSchema.index({ routeId: 1, departureTime: 1 });
tripSchema.index({ 'driver.phone': 1 });
tripSchema.index({ 'assistant.phone': 1 });

module.exports = mongoose.model('Trip', tripSchema);
