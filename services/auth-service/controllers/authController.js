const authService = require('../services/authService');

// @desc    Register a new customer
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ các thông tin: Họ tên, Số điện thoại, Mật khẩu.'
      });
    }

    const { user, token } = await authService.registerUser({ name, email, phone, password });

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
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đăng ký tài khoản.'
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
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
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi đăng nhập.'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
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
    res.status(404).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy thông tin cá nhân.'
    });
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await authService.updateUserDetails(req.user.id, { name, email });

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
    res.status(400).json({
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

    await authService.updatePassword(req.user.id, { currentPassword, newPassword });

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
