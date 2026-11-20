const mongoose = require('mongoose');

const ticketAgentProfileSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Văn phòng / Điểm bán vé làm việc cố định
    assignedOffice: {
      type: String,
      required: [true, 'Văn phòng làm việc là bắt buộc.'],
      default: 'Văn phòng Bến xe Miền Đông'
    },
    // Khung giờ làm việc cố định trong tuần (Không luân phiên)
    shiftType: {
      type: String,
      enum: ['morning', 'evening'],
      default: 'morning'
    },
    shiftName: {
      type: String,
      default: 'Ca Sáng (06:30 - 14:30)'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TicketAgentProfile', ticketAgentProfileSchema);
