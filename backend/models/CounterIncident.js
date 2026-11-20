const mongoose = require('mongoose');

/**
 * CounterIncident Schema - Bảng Sự Cố Phòng Vé (Chuẩn 3NF Tuyệt Đối)
 * Chỉ lưu các thông tin thực sự thuộc về sự cố quầy bán vé.
 * KẾ THỪA QUA JOIN BẢNG User (reportedBy):
 * - Vị trí làm việc (Văn phòng): reportedBy.assignedOffice
 * - Chi nhánh: reportedBy.branch
 * - Họ tên & SĐT nhân viên báo cáo: reportedBy.name, reportedBy.phone
 * LOẠI BỎ: Không lưu branchId, không lưu location, không lưu images/estimatedCost không dùng.
 */
const counterIncidentSchema = new mongoose.Schema(
  {
    incidentCode: {
      type: String,
      unique: true,
      required: true
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề tóm tắt sự cố là bắt buộc.']
    },
    category: {
      type: String,
      enum: ['equipment', 'network', 'fund', 'service', 'other'],
      default: 'equipment'
    },
    severity: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium'
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Nhân viên báo cáo sự cố là bắt buộc.']
    },
    details: {
      type: String,
      required: [true, 'Mô tả chi tiết sự cố đang xảy ra là bắt buộc.']
    },
    initialAction: {
      type: String,
      default: ''
    },
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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CounterIncident', counterIncidentSchema);
