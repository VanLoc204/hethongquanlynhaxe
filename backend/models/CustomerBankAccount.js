const mongoose = require('mongoose');

const customerBankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerPhone: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    bankCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    bankName: {
      type: String,
      required: true,
      trim: true
    },
    bin: {
      type: String,
      default: ''
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true
    },
    accountHolder: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

customerBankAccountSchema.index({ customerPhone: 1, isDefault: 1 });

module.exports = mongoose.model('CustomerBankAccount', customerBankAccountSchema);

