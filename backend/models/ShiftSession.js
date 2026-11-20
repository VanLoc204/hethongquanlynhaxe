const mongoose = require('mongoose');

const shiftSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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
    expectedInitialCash: {
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
    refundCash: {
      type: Number,
      default: 0
    },
    ticketsSold: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
      }
    ],
    ticketsRefunded: [
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
