const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_for_smart_bus_system_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new customer
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validation
    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ các thông tin: Họ tên, Số điện thoại, Mật khẩu.'
      });
    }

    // Check if user already exists (by phone)
    const existingUserByPhone = await User.findOne({ phone });
    if (existingUserByPhone) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được sử dụng.'
      });
    }

    // Check if user already exists (by email, if provided)
    if (email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng.'
        });
      }
    }

    // Create User (default role is customer)
    const user = await User.create({
      name,
      email: email || undefined,
      phone,
      password,
      role: 'customer' // Guest registers as customer (member)
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        points: user.points || 150,
        membershipTier: user.membershipTier || 'Bronze'
      }
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng ký tài khoản.',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { loginKey, password } = req.body; // loginKey can be email or phone

    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Số điện thoại/Email và Mật khẩu.'
      });
    }

    // Find user by phone or email
    let user = await User.findOne({ phone: loginKey });
    if (!user) {
      user = await User.findOne({ email: loginKey });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Tài khoản của bạn đã bị ${user.status === 'suspended' ? 'đình chỉ' : 'khóa'}.`
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác.'
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        points: user.points || 150,
        membershipTier: user.membershipTier || 'Bronze'
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng nhập.',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // req.user will be populated by authMiddleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng.'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        points: user.points || 150,
        membershipTier: user.membershipTier || 'Bronze'
      }
    });
  } catch (error) {
    console.error('Lỗi lấy profile:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin cá nhân.',
      error: error.message
    });
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        points: user.points || 150,
        membershipTier: user.membershipTier || 'Bronze'
      }
    });
  } catch (error) {
    console.error('Lỗi cập nhật profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật thông tin cá nhân.'
    });
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    const user = await User.findById(req.user.id);

    // Check current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Thay đổi mật khẩu thành công.'
    });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đổi mật khẩu.'
    });
  }
};

// @desc    Forgot password (simple reset/simulation)
// @route   POST /api/v1/auth/forgotpassword
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

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với số điện thoại này.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mật khẩu mới đã được thiết lập thành công.'
    });
  } catch (error) {
    console.error('Lỗi khôi phục mật khẩu:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi phục hồi mật khẩu.'
    });
  }
};
