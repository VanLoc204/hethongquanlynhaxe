const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
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
      enum: ['equipment', 'network', 'fund', 'service', 'vehicle', 'traffic', 'tire', 'engine', 'other'],
      default: 'vehicle'
    },
    severity: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium'
    },
    source: {
      type: String,
      enum: ['counter', 'driver_on_route'],
      default: 'counter'
    },
    // Kịch bản sự cố trên tuyến (Dành cho tài xế)
    // self_resolved: TH A - Tài xế tự xử lý xong, báo chi phí xin hoàn tiền
    // need_assistance: TH B - Xe hỏng nặng, tài xế không tự sửa được, cần điều phối hỗ trợ
    scenario: {
      type: String,
      enum: ['self_resolved', 'need_assistance'],
      default: 'self_resolved'
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip'
    },
    location: {
      type: String,
      default: ''
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    details: {
      type: String,
      required: [true, 'Chi tiết sự cố là bắt buộc.']
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

    // Nghiệp vụ Hoàn ứng chi phí (Trường hợp A: tài xế tự chi trả)
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

    // Nghiệp vụ Cứu viện điều phối (Trường hợp B: cần ứng cứu)
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

module.exports = mongoose.model('Incident', incidentSchema);
