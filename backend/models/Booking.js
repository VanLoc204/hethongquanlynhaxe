const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    seats: [
      {
        type: String,
        required: true
      }
    ],
    pickup: {
      type: String,
      required: true
    },
    dropoff: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending'
    },
    customerName: {
      type: String,
      required: true
    },
    customerPhone: {
      type: String,
      required: true
    },
    customerBirthYear: {
      type: Number,
      required: true
    },
    customerCCCD: {
      type: String,
      required: true
    },
    customerEmail: {
      type: String
    },
    paymentType: {
      type: String,
      enum: ['immediate', 'later'],
      default: 'immediate'
    },
    paymentExpiresAt: {
      type: Date
    },
    orderCode: {
      type: Number,
      unique: true
    },
    boarded: {
      type: Boolean,
      default: false
    },
    boardedAt: {
      type: Date
    },
    // Giá vé thực tế tại thời điểm đặt (sau khi áp pricing rules & promotions)
    pricePerSeat: {
      type: Number,
      default: 0
    },
    // Tổng tiền thực tế của booking này = pricePerSeat × seats.length
    totalAmount: {
      type: Number,
      default: 0
    },
    // ─── Thông tin Hủy vé & Hoàn tiền (payOS Payout / Tiền mặt) ───────────────
    cancellationFee: {
      type: Number,
      default: 0
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundMethod: {
      type: String,
      enum: ['payos_payout', 'bank_transfer', 'cash', 'account_balance', null],
      default: null
    },
    bankInfo: {
      bankCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      transactionCode: { type: String, default: '' },
      payoutStatus: { type: String, default: '' }
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancellationReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
