const mongoose = require('mongoose');

const employeeProfileSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    employeeCode: {
      type: String,
      required: [true, 'Mã nhân viên là bắt buộc.'],
      unique: true,
      uppercase: true,
      trim: true
    },
    branch: {
      branchId: {
        type: String,
        enum: ['sg', 'dl', 'ct'],
        default: 'sg'
      },
      branchName: {
        type: String,
        default: 'Chi nhánh TP. Hồ Chí Minh'
      }
    },
    // Dữ liệu sinh trắc học điểm danh Face ID
    faceDescriptors: {
      type: [[Number]],
      select: false,
      default: []
    },
    faceRegistered: {
      type: Boolean,
      default: false
    },
    facePhoto: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);
