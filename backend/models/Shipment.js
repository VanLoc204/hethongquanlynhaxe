const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderPhone: {
      type: String,
      required: true
    },
    senderEmail: {
      type: String
    },
    receiverName: {
      type: String,
      required: true
    },
    receiverPhone: {
      type: String,
      required: true
    },
    fromCity: {
      type: String,
      required: true
    },
    toCity: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      required: true
    },
    content: {
      type: String
    },
    fee: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Collected', 'In Transit', 'Arrived', 'Delivered', 'Cancelled'],
      default: 'Collected'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    paymentType: {
      type: String,
      enum: ['immediate', 'later'],
      default: 'immediate'
    },
    orderCode: {
      type: Number,
      unique: true
    },
    history: [
      {
        status: { type: String, required: true },
        time: { type: String, required: true },
        detail: { type: String, required: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Shipment', shipmentSchema);
