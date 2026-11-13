const User = require('../models/User');

class UserRepository {
  async findStaff(filter = {}) {
    return await User.find({ role: { $ne: 'customer' }, ...filter }).select('-password');
  }

  async findByPhone(phone) {
    if (!phone) return null;
    return await User.findOne({ phone: String(phone).trim() });
  }

  async findByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim();
    return await User.findOne({ email: { $regex: new RegExp(`^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
  }

  async findById(id) {
    return await User.findById(id);
  }

  async create(userData) {
    return await User.create(userData);
  }

  async update(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  async save(userInstance) {
    return await userInstance.save();
  }

  async delete(userInstance) {
    return await userInstance.deleteOne();
  }
}

module.exports = new UserRepository();
