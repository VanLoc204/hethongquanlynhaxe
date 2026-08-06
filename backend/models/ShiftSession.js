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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ShiftSession', shiftSessionSchema);
