const userRepository = require('../repositories/userRepository');
const jwt = require('jsonwebtoken');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_for_smart_bus_system_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  async registerUser({ name, email, phone, password }) {
    // 1. Check existing phone
    const existingUserByPhone = await userRepository.findByPhone(phone);
    if (existingUserByPhone) {
      throw new Error('Số điện thoại này đã được sử dụng.');
    }

    // 2. Check existing email (if provided)
    if (email) {
      const existingUserByEmail = await userRepository.findByEmail(email);
      if (existingUserByEmail) {
        throw new Error('Email này đã được sử dụng.');
      }
    }

    // 3. Create User
    const user = await userRepository.create({
      name,
      email: email || undefined,
      phone,
      password,
      role: 'customer'
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  async loginUser({ loginKey, password }) {
    // 1. Find user by phone or email
    let user = await userRepository.findByPhone(loginKey);
    if (!user) {
      user = await userRepository.findByEmail(loginKey);
    }

    if (!user) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    // 2. Check status
    if (user.status !== 'active') {
      const reason = user.status === 'suspended' ? 'đình chỉ' : 'khóa';
      throw new Error(`Tài khoản của bạn đã bị ${reason}.`);
    }

    // 3. Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async getUserProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy thông tin người dùng.');
    }
    return user;
  }

  async updateUserDetails(userId, { name, email }) {
    const user = await userRepository.update(userId, { name, email });
    if (!user) {
      throw new Error('Không tìm thấy thông tin người dùng.');
    }
    return user;
  }

  async updatePassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy thông tin người dùng.');
    }

    if (!(await user.comparePassword(currentPassword))) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }

    user.password = newPassword;
    await userRepository.save(user);
    return true;
  }

  async forgotPassword({ phone, newPassword }) {
    const user = await userRepository.findByPhone(phone);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản với số điện thoại này.');
    }

    user.password = newPassword;
    await userRepository.save(user);
    return true;
  }
}

module.exports = new AuthService();
