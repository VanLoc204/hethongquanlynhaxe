const mongoose = require('mongoose');

/**
 * TripIncident Schema - Bảng Sự Cố Chuyến Xe Trên Tuyến (Tài xế & Điều hành vận tải)
 * Chuyên trách quản lý sự cố hỏng hóc kỹ thuật xe, cứu hộ cứu viện và hoàn ứng chi phí dọc đường.
 * Tách biệt 100% với sự cố quầy bán vé.
 */
const tripIncidentSchema = new mongoose.Schema(
  {
    incidentCode: {
      type: String,
      unique: true,
      required: true
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề sự cố là bắt buộc.']
    },
    category: {
      type: String,
      enum: ['vehicle', 'traffic', 'tire', 'engine', 'other'],
      default: 'vehicle'
    },
    severity: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium'
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Chuyến xe phát sinh sự cố là bắt buộc.']
    },
    scenario: {
      type: String,
      enum: ['self_resolved', 'need_assistance'],
      default: 'self_resolved'
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tài xế báo cáo sự cố là bắt buộc.']
    },
    location: {
      type: String,
      default: 'Trên tuyến đường'
    },
    details: {
      type: String,
      required: [true, 'Mô tả chi tiết sự cố là bắt buộc.']
    },
    initialAction: {
      type: String,
      default: ''
    },
    images: [
      {
        type: String
      }
    ],

    // Nghiệp vụ Hoàn ứng chi phí (Trường hợp tự chi trả sửa chữa)
    reimbursementAmount: {
      type: Number,
      default: 0
    },
    reimbursementStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected', 'paid'],
      default: 'none'
    },
    reimbursementApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reimbursementApprovedAt: {
      type: Date
    },
    reimbursementNote: {
      type: String,
      default: ''
    },

    // Nghiệp vụ Cứu viện điều phối (Trường hợp xe hỏng nặng cần ứng cứu)
    assistanceStatus: {
      type: String,
      enum: ['none', 'pending', 'contacted', 'dispatched', 'resolved'],
      default: 'none'
    },
    assistanceNotes: {
      type: String,
      default: ''
    },

    // Trạng thái chung
    status: {
      type: String,
      enum: ['open', 'processing', 'resolved', 'closed'],
      default: 'open'
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    },
    estimatedCost: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TripIncident', tripIncidentSchema, 'incidents');
