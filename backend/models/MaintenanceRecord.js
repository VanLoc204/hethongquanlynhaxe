const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Mã xe là bắt buộc.']
    },
    plateNumber: {
      type: String,
      required: [true, 'Biển số xe là bắt buộc.']
    },
    type: {
      type: String,
      enum: ['maintenance', 'repairing'],
      default: 'maintenance'
    },
    description: {
      type: String,
      required: [true, 'Nội dung thực hiện là bắt buộc.']
    },
    garage: {
      type: String,
      required: [true, 'Garage/Nơi thực hiện là bắt buộc.']
    },
    cost: {
      type: Number,
      required: [true, 'Chi phí là bắt buộc.'],
      min: [0, 'Chi phí không thể âm.']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
