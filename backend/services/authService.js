const userRepository = require('../repositories/userRepository');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('./emailService');

// Bộ nhớ đệm in-memory lưu trữ OTP và Reset Token khôi phục mật khẩu (TTL 3 phút = 180s)
const forgotOtpStore = new Map();
const forgotResetTokenStore = new Map();

class AuthService {
  generateToken(user) {
    return jwt.sign(
      { id: user._id, name: user.name, role: user.role, branch: user.branch },
      process.env.JWT_SECRET || 'super_secret_jwt_key_for_smart_bus_system_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  validatePasswordPolicy(password) {
    if (!password || password.length < 8) {
      throw new Error('Mật khẩu phải chứa tối thiểu 8 ký tự.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z).');
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Mật khẩu phải chứa ít nhất 1 chữ cái in thường (a-z).');
    }
    if (!/\d/.test(password)) {
      throw new Error('Mật khẩu phải chứa ít nhất 1 chữ số (0-9).');
    }
    if (!/[@$!%*?&#_.-]/.test(password)) {
      throw new Error('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (@, $, !, %, *, #,...).');
    }
  }

  validateNamePolicy(name) {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Vui lòng nhập Họ và tên.');
    }
    if (cleanName.length < 2) {
      throw new Error('Họ và tên phải có tối thiểu 2 ký tự.');
    }
    if (cleanName.length > 50) {
      throw new Error('Họ và tên không được vượt quá 50 ký tự.');
    }
    if (/\d/.test(cleanName)) {
      throw new Error('Họ và tên không được chứa chữ số.');
    }
    const vietnameseNameRegex = /^[a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ\s]+$/;
    if (!vietnameseNameRegex.test(cleanName)) {
      throw new Error('Họ và tên chỉ được chứa chữ cái và khoảng trắng.');
    }
  }

  validateEmailPolicy(email) {
    const cleanEmail = (email || '').trim();
    if (!cleanEmail) {
      throw new Error('Vui lòng nhập Email.');
    }
    if (cleanEmail.length > 100) {
      throw new Error('Email không được vượt quá 100 ký tự.');
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Email không đúng định dạng.');
    }
  }

  async registerUser({ name, email, phone, password }) {
    // 0. Validate Name, Email, Password Policy
    this.validateNamePolicy(name);
    this.validateEmailPolicy(email);
    this.validatePasswordPolicy(password);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check existing phone
    const existingUserByPhone = await userRepository.findByPhone(phone);
    if (existingUserByPhone) {
      throw new Error('Số điện thoại này đã được sử dụng.');
    }

    // 2. Check existing email
    const existingUserByEmail = await userRepository.findByEmail(cleanEmail);
    if (existingUserByEmail) {
      throw new Error('Email này đã được sử dụng.');
    }

    // 3. Create User
    const user = await userRepository.create({
      name: cleanName,
      email: cleanEmail,
      phone,
      password,
      role: 'customer'
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  async loginUser({ loginKey, password }) {
    let key = (loginKey || '').trim();

    // 1. Chuẩn hóa Phone & Email đầu vào
    let cleanPhone = key.replace(/[\s\-\.]/g, '');
    if (cleanPhone.startsWith('+84')) cleanPhone = '0' + cleanPhone.slice(3);
    else if (cleanPhone.startsWith('84') && cleanPhone.length === 11) cleanPhone = '0' + cleanPhone.slice(2);

    // 2. Tìm người dùng theo SĐT hoặc Email
    let user = await userRepository.findByPhone(cleanPhone) || await userRepository.findByPhone(key);
    if (!user) {
      user = await userRepository.findByEmail(key);
    }

    // 1b. Support aliases for demo ticket agent credentials
    if (!user) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'ticket_agent@anbinhlines.vn' || lowerKey === 'ticket@anbinhlines.vn') {
        user = await userRepository.findByPhone('0944555666') || await userRepository.findByEmail('ticket@anbinhlines.vn');
      } else if (lowerKey === 'ticket_dl@anbinhlines.vn' || key === '0944111223' || key === '0944555661') {
        user = await userRepository.findByPhone('0944555661') || await userRepository.findByEmail('ticket_dl@anbinhlines.vn');
      } else if (lowerKey === 'ticket_ct@anbinhlines.vn' || key === '0944111224' || key === '0944555662') {
        user = await userRepository.findByPhone('0944555662') || await userRepository.findByEmail('ticket_ct@anbinhlines.vn');
      }
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
    this.validatePasswordPolicy(newPassword);

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
    this.validatePasswordPolicy(newPassword);

    const user = await userRepository.findByPhone(phone);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản với số điện thoại này.');
    }

    user.password = newPassword;
    await userRepository.save(user);
    return true;
  }

  // 1. Gửi mã OTP xác thực khôi phục mật khẩu qua Email (Hiệu lực 3 phút = 180s)
  async sendForgotPasswordOTP(rawEmail) {
    const email = (rawEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Email không đúng định dạng.');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản liên kết với email này.');
    }

    // Tạo mã OTP ngẫu nhiên 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInSec = 180; // 3 phút theo yêu cầu
    const expiresAt = Date.now() + expiresInSec * 1000;

    forgotOtpStore.set(email, { otp, expiresAt, attempts: 0 });

    // Tự động xóa khỏi bộ nhớ sau 180s
    setTimeout(() => {
      const current = forgotOtpStore.get(email);
      if (current && current.expiresAt <= Date.now()) {
        forgotOtpStore.delete(email);
      }
    }, expiresInSec * 1000);

    // Gửi email OTP bằng template chuẩn An Bình Lines đồng bộ như Hóa đơn vé xe
    try {
      await emailService.sendForgotPasswordOtpEmail(email, user.name, otp, 3);
    } catch (err) {
      console.warn('[Email OTP Warning]:', err.message);
    }

    console.log(`[Auth] Mã OTP khôi phục mật khẩu cho ${email}: ${otp} (Hiệu lực 3 phút)`);
    return { email, expiresIn: expiresInSec };
  }

  // 2. Xác thực mã OTP và cấp resetToken dùng 1 lần (10 phút)
  async verifyForgotPasswordOTP(rawEmail, rawOtp) {
    const email = (rawEmail || '').trim().toLowerCase();
    const otp = (rawOtp || '').trim();

    if (!email) throw new Error('Vui lòng cung cấp email.');
    if (!otp) throw new Error('Vui lòng nhập mã xác thực OTP.');

    const data = forgotOtpStore.get(email);
    if (!data || Date.now() > data.expiresAt) {
      forgotOtpStore.delete(email);
      throw new Error('Mã xác thực đã hết hạn hoặc không tồn tại.');
    }

    if (data.otp !== otp) {
      data.attempts = (data.attempts || 0) + 1;
      if (data.attempts >= 5) {
        forgotOtpStore.delete(email);
        throw new Error('Bạn đã nhập sai mã quá 5 lần. Vui lòng gửi lại mã mới.');
      }
      throw new Error('Mã xác thực không chính xác.');
    }

    // Xác thực thành công: xóa OTP, tạo resetToken 1 lần
    forgotOtpStore.delete(email);
    const resetToken = crypto.randomBytes(32).toString('hex');
    forgotResetTokenStore.set(email, {
      token: resetToken,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 phút
    });

    return { success: true, resetToken };
  }

  // 3. Đặt lại mật khẩu mới với resetToken
  async resetPasswordWithToken({ email: rawEmail, resetToken, newPassword }) {
    const email = (rawEmail || '').trim().toLowerCase();
    if (!email) throw new Error('Vui lòng cung cấp email.');
    if (!resetToken) throw new Error('Phiên đặt lại mật khẩu không hợp lệ.');

    const tokenData = forgotResetTokenStore.get(email);
    if (!tokenData || Date.now() > tokenData.expiresAt || tokenData.token !== resetToken) {
      forgotResetTokenStore.delete(email);
      throw new Error('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu.');
    }

    this.validatePasswordPolicy(newPassword);

    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Không tìm thấy tài khoản người dùng.');

    user.password = newPassword;
    await userRepository.save(user);

    forgotResetTokenStore.delete(email);
    return true;
  }
}

module.exports = new AuthService();
