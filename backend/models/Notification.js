const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề thông báo là bắt buộc.']
    },
    content: {
      type: String,
      required: [true, 'Nội dung thông báo là bắt buộc.']
    },
    recipientRole: {
      type: String,
      enum: ['all', 'driver', 'attendant', 'ticket_agent'],
      default: 'all',
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
