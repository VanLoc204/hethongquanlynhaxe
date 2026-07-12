const User = require('../models/User');

// @desc    Get all staff members
// @route   GET /api/v1/users/staff
// @access  Private (General Manager / Admin)
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: { $ne: 'customer' } }).select('-password');
    res.status(200).json({
      success: true,
      count: staff.length,
      staff
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách nhân viên.',
      error: error.message
    });
  }
};

// @desc    Create a new staff member
// @route   POST /api/v1/users/staff
// @access  Private (General Manager / Admin)
exports.createStaff = async (req, res) => {
  try {
    const { name, email, phone, password, role, status } = req.body;

    // Check if phone already registered
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được đăng ký sử dụng.'
      });
    }

    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được đăng ký sử dụng.'
        });
      }
    }

    const staff = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'driver',
      status: status || 'active'
    });

    // Don't return password in response
    const staffData = staff.toObject();
    delete staffData.password;

    res.status(201).json({
      success: true,
      message: 'Thêm nhân viên mới thành công.',
      staff: staffData
    });
  } catch (error) {
    console.error('Lỗi tạo nhân viên:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi thêm nhân viên.',
      error: error.message
    });
  }
};

// @desc    Update a staff member
// @route   PUT /api/v1/users/staff/:id
// @access  Private (General Manager / Admin)
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status, password } = req.body;

    let staff = await User.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên.'
      });
    }

    // If phone is changed, check uniqueness
    if (phone && phone !== staff.phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại này đã được đăng ký sử dụng.'
        });
      }
      staff.phone = phone;
    }

    // If email is changed, check uniqueness
    if (email && email !== staff.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được đăng ký sử dụng.'
        });
      }
      staff.email = email;
    }

    if (name) staff.name = name;
    if (role) staff.role = role;
    if (status) staff.status = status;
    if (password) staff.password = password; // Trigger save hook bcrypt

    await staff.save();

    const staffData = staff.toObject();
    delete staffData.password;

    res.status(200).json({
      success: true,
      message: 'Cập nhật nhân viên thành công.',
      staff: staffData
    });
  } catch (error) {
    console.error('Lỗi cập nhật nhân viên:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật nhân viên.',
      error: error.message
    });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/v1/users/staff/:id
// @access  Private (General Manager / Admin)
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await User.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên.'
      });
    }

    await staff.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa nhân viên thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa nhân viên:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa nhân viên.',
      error: error.message
    });
  }
};
