const mongoose = require('mongoose');

const shiftSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    counterNumber: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    initialCash: {
      type: Number,
      default: 0
    },
    cashRevenue: {
      type: Number,
      default: 0
    },
    cashlessRevenue: {
      type: Number,
      default: 0
    },
    ticketsSold: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
      }
    ],
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active'
    },
    notes: {
      type: String
    },
    faceVerified: {
      type: Boolean,
      default: false
    },
    faceDistance: {
      type: Number,
      default: null
    },
    isLiveVerified: {
      type: Boolean,
      default: false
    },
    checkInPhoto: {
      type: String,
      default: null
    },
    checkOutPhoto: {
      type: String,
      default: null
    },
    location: {
      type: String,
      default: ''
    },
    gpsLat: {
      type: Number,
      default: null
    },
    gpsLng: {
      type: Number,
      default: null
    },
    // ─── Phân cấp Chi nhánh & Đối soát quỹ thu ngân ───────────────────────────
    branchId: {
      type: String,
      enum: ['sg', 'dl', 'ct'],
      default: 'sg',
      index: true
    },
    officeName: {
      type: String,
      default: ''
    },
    reconciliationStatus: {
      type: String,
      enum: ['pending', 'verified', 'discrepancy'],
      default: 'pending',
      index: true
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reconciledAt: {
      type: Date,
      default: null
    },
    reconciliationNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ShiftSession', shiftSessionSchema);
