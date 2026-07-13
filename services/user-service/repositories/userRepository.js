const User = require('../models/User');

class UserRepository {
  async findStaff() {
    return await User.find({ role: { $ne: 'customer' } }).select('-password');
  }

  async findByPhone(phone) {
    return await User.findOne({ phone });
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findById(id) {
    return await User.findById(id);
  }

  async create(staffData) {
    return await User.create(staffData);
  }

  async save(userInstance) {
    return await userInstance.save();
  }

  async delete(userInstance) {
    return await userInstance.deleteOne();
  }
}

module.exports = new UserRepository();
