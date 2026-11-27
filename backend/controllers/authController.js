const authService = require('../services/authService');
const CustomerProfile = require('../models/CustomerProfile');
const EmployeeProfile = require('../models/EmployeeProfile');
const TicketAgentProfile = require('../models/TicketAgentProfile');

// Helper build full user response from separated profiles
async function buildUserResponse(user) {
  const base = {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status || 'active'
  };

  if (user.role === 'customer') {
    const cust = await CustomerProfile.findById(user._id).lean();
    return {
      ...base,
      points: cust?.points ?? 0,
      membershipTier: cust?.membershipTier || 'Bronze'
    };
  }

  // Employee
  const emp = await EmployeeProfile.findById(user._id).select('+faceDescriptors').lean();
  let branch = emp?.branch || { branchId: 'sg', branchName: 'Chi nhánh TP. Hồ Chí Minh' };
  let assignedOffice = '';
  let shiftType = '';
  let shiftName = '';

  if (['ticket_agent', 'ticket_manager'].includes(user.role)) {
    const agent = await TicketAgentProfile.findById(user._id).lean();
    assignedOffice = agent?.assignedOffice || (branch.branchId === 'dl' ? 'Văn phòng Bến xe Liên Tỉnh' : branch.branchId === 'ct' ? 'Văn phòng Bến xe Trung Tâm' : 'Văn phòng Bến xe Miền Đông');
    shiftType = agent?.shiftType || 'morning';
    shiftName = agent?.shiftName || 'Ca Sáng (06:30 - 14:30)';
    branch = {
      ...branch,
      assignedOffices: [assignedOffice]
    };
  }

  const hasFaceEnrolled = Boolean(emp?.faceRegistered && Array.isArray(emp?.faceDescriptors) && emp?.faceDescriptors?.length > 0);

  return {
    ...base,
    employeeCode: emp?.employeeCode || '',
    branch,
    assignedOffice,
    shiftType,
    shiftName,
    faceRegistered: hasFaceEnrolled,
    facePhoto: emp?.facePhoto || null,
    points: 0,
    membershipTier: 'Bronze'
  };
}

// @desc    Send OTP to email for registration verification
// @route   POST /api/auth/register/send-otp
// @access  Public
exports.sendRegisterOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp địa chỉ email.'
      });
    }

    const result = await authService.sendRegisterOTP(email);
    res.status(200).json({
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn (vui lòng kiểm tra Hộp thư đến hoặc Spam).',
      expiresIn: result.expiresIn,
      emailSent: result.emailSent
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Không thể gửi mã xác thực email.'
    });
  }
};

// @desc    Verify OTP for registration
// @route   POST /api/auth/register/verify-otp
// @access  Public
exports.verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và mã xác thực OTP 6 số.'
      });
    }

    const result = await authService.verifyRegisterOTP(email, otp);
    res.status(200).json({
      success: true,
      message: result.message || 'Xác thực email thành công.',
      verificationToken: result.verificationToken
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
    });
  }
};

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, verificationToken } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ các thông tin: Họ tên, Email, Số điện thoại, Mật khẩu.'
      });
    }

    const { user, token } = await authService.registerUser({ name, email, phone, password, verificationToken });
    
    // Tự động tạo CustomerProfile cho khách hàng mới đăng ký
    await CustomerProfile.findOneAndUpdate(
      { _id: user._id },
      { $setOnInsert: { points: 150, membershipTier: 'Bronze' } },
      { upsert: true, new: true }
    );

    const userRes = await buildUserResponse(user);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      token,
      user: userRes,
      serverBootId: req.serverBootId || req.app?.locals?.serverBootId || ''
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đăng ký tài khoản.'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { loginKey, password } = req.body;

    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Số điện thoại/Email và Mật khẩu.'
      });
    }

    const { user, token } = await authService.loginUser({ loginKey, password });
    const userRes = await buildUserResponse(user);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: userRes,
      serverBootId: req.serverBootId || req.app?.locals?.serverBootId || ''
    });
  } catch (error) {
    console.warn(`[Auth] Đăng nhập không thành công: ${error.message} (Tài khoản: ${req.body?.loginKey})`);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đăng nhập.'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
    const userRes = await buildUserResponse(user);
    res.status(200).json({
      success: true,
      user: userRes,
      serverBootId: req.serverBootId || req.app?.locals?.serverBootId || ''
    });
  } catch (error) {
    console.error('Lỗi lấy profile:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy thông tin cá nhân.'
    });
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
  try {
    const { name, email } = req.body;
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên.' });
    }
    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Họ và tên tối thiểu 2 ký tự.' });
    }
    if (trimmedName.length > 50) {
      return res.status(400).json({ success: false, message: 'Họ và tên không quá 50 ký tự.' });
    }
    if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/.test(trimmedName)) {
      return res.status(400).json({ success: false, message: 'Họ và tên chỉ được chứa chữ cái.' });
    }

    if (!trimmedEmail) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Email không đúng định dạng.' });
    }

    const user = await authService.updateUserDetails(req.user.id, { name: trimmedName, email: trimmedEmail });
    const userRes = await buildUserResponse(user);

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công.',
      user: userRes
    });
  } catch (error) {
    console.error('Lỗi cập nhật profile:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật thông tin cá nhân.'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này.'
      });
    }
    next();
  };
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const trimmedCurrent = (currentPassword || '').trim();
    const trimmedNew = (newPassword || '').trim();

    if (!trimmedCurrent || !trimmedNew) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    if (trimmedNew.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới tối thiểu 8 ký tự.'
      });
    }

    if (trimmedCurrent === trimmedNew) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng mật khẩu cũ.'
      });
    }

    await authService.updatePassword(req.user.id, { currentPassword: trimmedCurrent, newPassword: trimmedNew });

    res.status(200).json({
      success: true,
      message: 'Thay đổi mật khẩu thành công.'
    });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đổi mật khẩu.'
    });
  }
};

// @desc    Forgot password (simple reset/simulation)
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;

    if (!phone || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số điện thoại và mật khẩu mới.'
      });
    }

    await authService.forgotPassword({ phone, newPassword });

    res.status(200).json({
      success: true,
      message: 'Mật khẩu mới đã được thiết lập thành công.'
    });
  } catch (error) {
    console.error('Lỗi khôi phục mật khẩu:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi phục hồi mật khẩu.'
    });
  }
};

// @desc    Send OTP to email for password recovery
// @route   POST /api/auth/forgotpassword/send-otp
// @access  Public
exports.sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email của tài khoản.'
      });
    }

    const result = await authService.sendForgotPasswordOTP(email);
    res.status(200).json({
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn (vui lòng kiểm tra cả Hộp thư đến và Spam).',
      expiresIn: result.expiresIn,
      emailSent: result.emailSent
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Không thể gửi mã xác thực.'
    });
  }
};

// @desc    Verify OTP for password recovery
// @route   POST /api/auth/forgotpassword/verify-otp
// @access  Public
exports.verifyForgotPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và mã xác thực OTP.'
      });
    }

    const result = await authService.verifyForgotPasswordOTP(email, otp);
    res.status(200).json({
      success: true,
      message: 'Xác thực mã OTP thành công.',
      resetToken: result.resetToken
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Xác thực mã OTP thất bại.'
    });
  }
};

// @desc    Reset password with verified resetToken
// @route   POST /api/auth/forgotpassword/reset
// @access  Public
exports.resetForgotPasswordWithToken = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin: email, token và mật khẩu mới.'
      });
    }

    await authService.resetPasswordWithToken({ email, resetToken, newPassword });
    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Đặt lại mật khẩu thất bại.'
    });
  }
};

// @desc    Send OTP to email for authenticated change password (2FA)
// @route   POST /api/auth/changepassword/send-otp
// @access  Private
exports.sendChangePasswordOTP = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.sendChangePasswordOTP(req.user.id, { currentPassword, newPassword });
    res.status(200).json({
      success: true,
      message: result.emailSent
        ? 'Mã xác thực OTP đã được gửi đến email của bạn.'
        : 'Mã xác thực OTP đã được tạo trong hệ thống.',
      email: result.email,
      expiresIn: result.expiresIn,
      otp: result.otp,
      emailSent: result.emailSent,
      emailError: result.emailError
    });
  } catch (error) {
    console.error('Lỗi gửi OTP đổi mật khẩu:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Không thể gửi mã xác thực.'
    });
  }
};

// @desc    Verify OTP and update password (2FA)
// @route   PUT /api/auth/changepassword/verify-and-update
// @access  Private
exports.verifyChangePasswordOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã xác thực OTP.'
      });
    }

    await authService.verifyAndChangePassword(req.user.id, otp);
    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công.'
    });
  } catch (error) {
    console.error('Lỗi xác thực OTP đổi mật khẩu:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Mã xác thực không chính xác hoặc đã hết hạn.'
    });
  }
};
