const userService = require('../services/userService');
const User = require('../models/User');

// @desc    Get all staff members
// @route   GET /api/v1/users/staff
// @access  Private (General Manager / Admin / Ops Manager / Fleet Manager)
exports.getStaff = async (req, res) => {
  try {
    const staff = await userService.getStaffList();
    res.status(200).json({
      success: true,
      count: staff.length,
      staff
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách nhân viên.'
    });
  }
};

// @desc    Create a new staff member
// @route   POST /api/v1/users/staff
// @access  Private (General Manager / Admin / Ops Manager)
exports.createStaff = async (req, res) => {
  try {
    const { name, email, phone, password, role, status } = req.body;

    // Phân quyền: Quản lý vận tải / đội xe chỉ được tạo tài khoản tài xế hoặc phụ xe
    if (['ops_manager', 'fleet_manager'].includes(req.user.role)) {
      if (!['driver', 'attendant'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý vận tải / đội xe chỉ có quyền tạo tài khoản tài xế hoặc phụ xe.'
        });
      }
    }

    const staff = await userService.createStaff({ name, email, phone, password, role, status });

    res.status(201).json({
      success: true,
      message: 'Thêm tài khoản nhân viên mới thành công.',
      staff
    });
  } catch (error) {
    console.error('Lỗi tạo nhân viên:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thêm nhân viên.'
    });
  }
};

// @desc    Update a staff member
// @route   PUT /api/v1/users/staff/:id
// @access  Private (General Manager / Admin / Ops Manager)
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status, password } = req.body;

    // Phân quyền: Quản lý vận tải / đội xe chỉ được sửa tài xế hoặc phụ xe
    if (['ops_manager', 'fleet_manager'].includes(req.user.role)) {
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản nhân sự.'
        });
      }
      if (!['driver', 'attendant'].includes(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý vận tải / đội xe chỉ có quyền cập nhật tài khoản tài xế hoặc phụ xe.'
        });
      }
      if (role && !['driver', 'attendant'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý vận tải / đội xe chỉ được gán vai trò tài xế hoặc phụ xe.'
        });
      }
    }

    const staff = await userService.updateStaff(id, { name, email, phone, role, status, password });

    res.status(200).json({
      success: true,
      message: 'Cập nhật nhân viên thành công.',
      staff
    });
  } catch (error) {
    console.error('Lỗi cập nhật nhân viên:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật nhân viên.'
    });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/v1/users/staff/:id
// @access  Private (General Manager / Admin / Ops Manager)
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Phân quyền: Quản lý vận tải / đội xe chỉ được xóa tài xế hoặc phụ xe
    if (['ops_manager', 'fleet_manager'].includes(req.user.role)) {
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản nhân sự.'
        });
      }
      if (!['driver', 'attendant'].includes(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý vận tải / đội xe chỉ có quyền xóa tài khoản tài xế hoặc phụ xe.'
        });
      }
    }

    await userService.deleteStaff(id);

    res.status(200).json({
      success: true,
      message: 'Xóa nhân viên thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa nhân viên:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa nhân viên.'
    });
  }
};

// @desc    Update user points
// @route   PATCH /api/v1/users/:id/points
// @access  Internal
exports.updateUserPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số điểm hợp lệ.'
      });
    }

    const user = await userService.updateUserPoints(id, Number(amount));

    res.status(200).json({
      success: true,
      message: 'Cập nhật điểm thành công.',
      points: user.points,
      membershipTier: user.membershipTier
    });
  } catch (error) {
    console.error('Lỗi cập nhật điểm người dùng:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật điểm.'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Internal
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.'
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
        points: user.points,
        membershipTier: user.membershipTier
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin người dùng:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy thông tin người dùng.'
    });
  }
};
