const mongoose = require('mongoose');

const tripReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true
    },
    routeInfo: {
      startPoint: { type: String, default: '' },
      endPoint: { type: String, default: '' },
      routeName: { type: String, default: '' },
      departureTime: { type: Date },
      arrivalTime: { type: Date },
      plateNumber: { type: String, default: '' },
      busType: { type: String, default: '' },
      driverName: { type: String, default: '' },
      driverPhone: { type: String, default: '' },
      assistantName: { type: String, default: '' },
      assistantPhone: { type: String, default: '' }
    },
    attendantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submissionType: {
      type: String,
      enum: ['manual', 'auto_midnight'],
      default: 'manual'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    },
    stats: {
      totalSeats: { type: Number, default: 0 },
      totalBooked: { type: Number, default: 0 },
      totalBoarded: { type: Number, default: 0 },
      totalNoShow: { type: Number, default: 0 },
      occupancyRate: { type: Number, default: 0 } // Percentage: (totalBoarded / totalSeats) * 100
    },
    passengers: [
      {
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Booking'
        },
        seats: [{ type: String }],
        customerName: { type: String, default: '' },
        customerPhone: { type: String, default: '' },
        customerCCCD: { type: String, default: '' },
        pickup: { type: String, default: '' },
        dropoff: { type: String, default: '' },
        boarded: { type: Boolean, default: false },
        boardedAt: { type: Date },
        pricePerSeat: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 }
      }
    ],
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    approvalNotes: {
      type: String,
      default: ''
    },
    digitalSignature: {
      isSigned: { type: Boolean, default: false },
      signerName: { type: String, default: '' },
      signerRole: { type: String, default: '' },
      signerPhone: { type: String, default: '' },
      signedAt: { type: Date },
      signatureHash: { type: String, default: '' },
      certificateCode: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

tripReportSchema.index({ tripId: 1 });
tripReportSchema.index({ attendantId: 1 });
tripReportSchema.index({ approvalStatus: 1 });
tripReportSchema.index({ submittedAt: 1 });
tripReportSchema.index({ 'routeInfo.departureTime': 1 });

module.exports = mongoose.model('TripReport', tripReportSchema);

