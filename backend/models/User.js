const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Họ tên là bắt buộc.']
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows null/missing values while maintaining uniqueness for provided emails
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Vui lòng cung cấp email hợp lệ.'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc.'],
      unique: true
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc.']
    },
    role: {
      type: String,
      enum: [
        'customer',
        'driver',
        'attendant',
        'ticket_agent',
        'ticket_manager',
        'fleet_manager',
        'ops_manager',
        'general_manager',
        'admin'
      ],
      default: 'customer'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Encrypt password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
