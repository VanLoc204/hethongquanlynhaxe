const userRepository = require('../repositories/userRepository');

class UserService {
  async getStaffList() {
    return await userRepository.findStaff();
  }

  async createStaff({ name, email, phone, password, role, status }) {
    // Check phone uniqueness
    const userExists = await userRepository.findByPhone(phone);
    if (userExists) {
      throw new Error('Số điện thoại này đã được đăng ký sử dụng.');
    }

    // Check email uniqueness
    if (email) {
      const emailExists = await userRepository.findByEmail(email);
      if (emailExists) {
        throw new Error('Email này đã được đăng ký sử dụng.');
      }
    }

    const staff = await userRepository.create({
      name,
      email,
      phone,
      password,
      role: role || 'driver',
      status: status || 'active'
    });

    const staffData = staff.toObject();
    delete staffData.password;
    return staffData;
  }

  async updateStaff(id, { name, email, phone, role, status, password }) {
    const staff = await userRepository.findById(id);
    if (!staff) {
      throw new Error('Không tìm thấy thông tin nhân viên.');
    }

    // If phone is changed, check uniqueness
    if (phone && phone !== staff.phone) {
      const phoneExists = await userRepository.findByPhone(phone);
      if (phoneExists) {
        throw new Error('Số điện thoại này đã được đăng ký sử dụng.');
      }
      staff.phone = phone;
    }

    // If email is changed, check uniqueness
    if (email && email !== staff.email) {
      const emailExists = await userRepository.findByEmail(email);
      if (emailExists) {
        throw new Error('Email này đã được đăng ký sử dụng.');
      }
      staff.email = email;
    }

    if (name !== undefined) staff.name = name;
    if (role !== undefined) staff.role = role;
    if (status !== undefined) staff.status = status;
    if (password !== undefined) staff.password = password;

    await userRepository.save(staff);

    const staffData = staff.toObject();
    delete staffData.password;
    return staffData;
  }

  async deleteStaff(id) {
    const staff = await userRepository.findById(id);
    if (!staff) {
      throw new Error('Không tìm thấy thông tin nhân viên.');
    }
    await userRepository.delete(staff);
    return true;
  }

  async updateUserPoints(id, amount) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('Không tìm thấy người dùng.');
    }

    user.points = (user.points || 0) + amount;

    // Evaluate tier
    if (user.points >= 1500) {
      user.membershipTier = 'Platinum';
    } else if (user.points >= 1000) {
      user.membershipTier = 'Gold';
    } else if (user.points >= 500) {
      user.membershipTier = 'Silver';
    } else {
      user.membershipTier = 'Bronze';
    }

    await userRepository.save(user);
    return user;
  }

  async getUserById(id) {
    return await userRepository.findById(id);
  }
}

module.exports = new UserService();
