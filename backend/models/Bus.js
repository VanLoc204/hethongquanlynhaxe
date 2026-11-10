const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    plateNumber: {
      type: String,
      required: [true, 'Biển số xe là bắt buộc.'],
      unique: true
    },
    type: {
      type: String,
      required: [true, 'Loại xe là bắt buộc.'] // e.g. Limousine 22 Phòng (WC)
    },
    totalSeats: {
      type: Number,
      required: [true, 'Số lượng ghế là bắt buộc.']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    amenities: [
      {
        type: String
      }
    ],
    images: [
      {
        type: String
      }
    ],
    seatLayout: {
      columns: { type: Number },
      lowerFloor: { type: mongoose.Schema.Types.Mixed },
      upperFloor: { type: mongoose.Schema.Types.Mixed }
    },
    activeStatus: {
      type: String,
      enum: ['ready', 'maintenance', 'repairing', 'inactive'],
      default: 'ready'
    },
    maintenanceInfo: {
      description: { type: String },
      garage: { type: String },
      estimatedCompletion: { type: Date },
      estimatedCost: { type: Number },
      isMajor: { type: Boolean, default: false },
      approvalStatus: {
        type: String,
        enum: ['auto_approved', 'pending_approval', 'approved', 'rejected', null],
        default: 'auto_approved'
      },
      proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      approvalNote: { type: String, default: '' },
      rejectionReason: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Bus', busSchema);
