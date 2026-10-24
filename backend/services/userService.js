const userRepository = require('../repositories/userRepository');
const { getBranchById } = require('../constants/branches');

class UserService {
  async getStaffList(filter = {}) {
    return await userRepository.findStaff(filter);
  }

  async createStaff({ name, email, phone, password, role, status, branch }) {
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

    let branchData = undefined;
    if (branch && branch.branchId) {
      const bInfo = getBranchById(branch.branchId);
      branchData = {
        branchId: branch.branchId,
        branchName: bInfo ? bInfo.branchName : (branch.branchName || 'Chi nhánh TP. Hồ Chí Minh'),
        assignedOffices: Array.isArray(branch.assignedOffices) ? branch.assignedOffices : []
      };
    } else if (role === 'ticket_agent' || role === 'ticket_manager') {
      branchData = {
        branchId: 'sg',
        branchName: 'Chi nhánh TP. Hồ Chí Minh',
        assignedOffices: []
      };
    }

    const payload = {
      name,
      email,
      phone,
      password,
      role: role || 'driver',
      status: status || 'active'
    };
    if (branchData) payload.branch = branchData;

    const staff = await userRepository.create(payload);

    const staffData = staff.toObject();
    delete staffData.password;
    return staffData;
  }

  async updateStaff(id, { name, email, phone, role, status, password, branch }) {
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
    if (branch && branch.branchId) {
      const bInfo = getBranchById(branch.branchId);
      staff.branch = {
        branchId: branch.branchId,
        branchName: bInfo ? bInfo.branchName : (branch.branchName || staff.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh'),
        assignedOffices: Array.isArray(branch.assignedOffices) ? branch.assignedOffices : (staff.branch?.assignedOffices || [])
      };
    }

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
