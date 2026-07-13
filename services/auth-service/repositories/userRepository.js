const User = require('../models/User');

class UserRepository {
  async findByPhone(phone) {
    return await User.findOne({ phone });
  }

  async findByEmail(email) {
    return await User.findOne({ email });
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
}

module.exports = new UserRepository();
