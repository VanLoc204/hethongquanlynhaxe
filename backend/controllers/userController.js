const userService = require('../services/userService');
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');

// @desc    Get all staff members
// @route   GET /api/users/staff
// @access  Private (General Manager / Admin / Ops Manager / Fleet Manager / Ticket Manager)
exports.getStaff = async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role === 'ticket_manager') {
      let branchId = req.user.branch?.branchId;
      if (!branchId) {
        const emp = await EmployeeProfile.findById(req.user.id).lean();
        branchId = emp?.branch?.branchId;
      }
      if (branchId) {
        filter = {
          role: 'ticket_agent',
          'branch.branchId': branchId
        };
      } else {
        // If ticket manager has no branch configured, do not return staff from other branches
        filter = {
          role: 'ticket_agent',
          'branch.branchId': '__unassigned__'
        };
      }
    }
    const staff = await userService.getStaffList(filter);
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
// @route   POST /api/users/staff
// @access  Private (General Manager / Admin / Ops Manager / Ticket Manager)
exports.createStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      status,
      branch,
      assignedOffice,
      shiftType,
      shiftName
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên nhân viên.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại làm tài khoản đăng nhập.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email liên hệ.' });
    }

    // Phân quyền: Quản lý vận tải / đội xe chỉ được tạo tài khoản tài xế hoặc phụ xe
    if (['ops_manager', 'fleet_manager'].includes(req.user.role)) {
      if (!['driver', 'attendant'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý vận tải / đội xe chỉ có quyền tạo tài khoản tài xế hoặc phụ xe.'
        });
      }
    }

    // Phân quyền: Quản lý phòng vé chỉ được tạo tài khoản nhân viên bán vé thuộc chi nhánh mình
    let branchData = branch;
    if (req.user.role === 'ticket_manager') {
      if (role !== 'ticket_agent') {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền tạo tài khoản nhân viên bán vé.'
        });
      }
      let mgrBranch = req.user.branch;
      if (!mgrBranch || !mgrBranch.branchId) {
        const emp = await EmployeeProfile.findById(req.user.id).lean();
        mgrBranch = emp?.branch;
      }
      if (!mgrBranch || !mgrBranch.branchId) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản Quản lý phòng vé chưa được thiết lập chi nhánh trực thuộc.'
        });
      }
      branchData = mgrBranch;
    }

    const staff = await userService.createStaff({
      name,
      email,
      phone,
      password,
      role,
      status,
      branch: branchData,
      assignedOffice,
      shiftType,
      shiftName
    });

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
// @route   PUT /api/users/staff/:id
// @access  Private (General Manager / Admin / Ops Manager)
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      role,
      status,
      password,
      assignedOffice,
      shiftType,
      shiftName
    } = req.body;

    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên nhân viên.' });
    }
    if (phone !== undefined && (!phone || !phone.trim())) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại làm tài khoản đăng nhập.' });
    }
    if (email !== undefined && (!email || !email.trim())) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email liên hệ.' });
    }

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

    // Phân quyền: Quản lý phòng vé chỉ được sửa nhân viên bán vé
    if (req.user.role === 'ticket_manager') {
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản nhân sự.'
        });
      }
      if (targetUser.role !== 'ticket_agent') {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền cập nhật tài khoản nhân viên bán vé.'
        });
      }
      let mgrBranchId = req.user.branch?.branchId;
      if (!mgrBranchId) {
        const emp = await EmployeeProfile.findById(req.user.id).lean();
        mgrBranchId = emp?.branch?.branchId;
      }
      const targetEmp = await EmployeeProfile.findById(id).lean();
      if (mgrBranchId && targetEmp?.branch?.branchId && targetEmp.branch.branchId !== mgrBranchId) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền cập nhật nhân viên thuộc chi nhánh của mình.'
        });
      }
      if (role && role !== 'ticket_agent') {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ được gán vai trò nhân viên bán vé.'
        });
      }
    }

    let branchData = req.body.branch;
    if (req.user.role === 'ticket_manager') {
      branchData = req.user.branch;
    }

    const staff = await userService.updateStaff(id, {
      name,
      email,
      phone,
      role,
      status,
      password,
      branch: branchData,
      assignedOffice,
      shiftType,
      shiftName
    });

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
// @route   DELETE /api/users/staff/:id
// @access  Private (General Manager / Admin / Ops Manager / Ticket Manager)
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

    // Phân quyền: Quản lý phòng vé chỉ được xóa nhân viên bán vé thuộc chi nhánh mình
    if (req.user.role === 'ticket_manager') {
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản nhân sự.'
        });
      }
      if (targetUser.role !== 'ticket_agent') {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền xóa tài khoản nhân viên bán vé.'
        });
      }
      let mgrBranchId = req.user.branch?.branchId;
      if (!mgrBranchId) {
        const currentMgr = await User.findById(req.user.id).select('branch').lean();
        mgrBranchId = currentMgr?.branch?.branchId;
      }
      if (mgrBranchId && targetUser.branch?.branchId && targetUser.branch.branchId !== mgrBranchId) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền xóa nhân viên thuộc chi nhánh của mình.'
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
// @route   PATCH /api/users/:id/points
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
// @route   GET /api/users/:id
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

// @desc    Get member loyalty points and tier by phone
// @route   GET /api/users/member-by-phone/:phone
// @access  Public / Protected
exports.getMemberByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số điện thoại.' });
    }
    const cleanPhone = phone.trim();
    const user = await User.findOne({ phone: cleanPhone, role: 'customer' }).select('name phone points membershipTier email');
    if (!user) {
      return res.status(200).json({
        success: true,
        isMember: false,
        message: 'Khách hàng chưa đăng ký thành viên.',
        member: null
      });
    }
    return res.status(200).json({
      success: true,
      isMember: true,
      member: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        points: user.points !== undefined && user.points !== null ? user.points : 0,
        membershipTier: user.membershipTier || 'Bronze'
      }
    });
  } catch (error) {
    console.error('Lỗi tra cứu thành viên theo SĐT:', error);
    res.status(500).json({ success: false, message: 'Lỗi tra cứu thông tin thành viên.' });
  }
};
