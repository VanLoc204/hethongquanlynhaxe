const userRepository = require('../repositories/userRepository');
const EmployeeProfile = require('../models/EmployeeProfile');
const TicketAgentProfile = require('../models/TicketAgentProfile');

class UserService {
  async getStaffList(filter = {}) {
    const userFilter = { role: { $ne: 'customer' } };
    if (filter.role) {
      userFilter.role = filter.role;
    }

    // Branch filtering via EmployeeProfile
    if (filter['branch.branchId']) {
      const bId = filter['branch.branchId'];
      const matchedProfiles = await EmployeeProfile.find({ 'branch.branchId': bId }).select('_id').lean();
      const matchedIds = matchedProfiles.map(p => p._id);
      userFilter._id = { $in: matchedIds };
    }

    const users = await userRepository.findStaff(userFilter);
    if (!users || users.length === 0) return [];

    const userIds = users.map(u => u._id);
    const [empProfiles, agentProfiles] = await Promise.all([
      EmployeeProfile.find({ _id: { $in: userIds } }).select('+faceDescriptors').lean(),
      TicketAgentProfile.find({ _id: { $in: userIds } }).lean()
    ]);

    const empMap = new Map(empProfiles.map(e => [e._id.toString(), e]));
    const agentMap = new Map(agentProfiles.map(a => [a._id.toString(), a]));

    return users.map(u => {
      const uObj = typeof u.toObject === 'function' ? u.toObject() : { ...u };
      delete uObj.password;
      const emp = empMap.get(u._id.toString());
      const agent = agentMap.get(u._id.toString());

      const branch = emp?.branch ? { ...emp.branch } : {
        branchId: 'sg',
        branchName: 'Chi nhánh TP. Hồ Chí Minh'
      };

      let assignedOffice = '';
      let shiftType = 'morning';
      let shiftName = 'Ca Sáng (06:30 - 14:30)';

      if (['ticket_agent', 'ticket_manager'].includes(u.role)) {
        assignedOffice = agent?.assignedOffice || (branch.branchId === 'dl' ? 'Văn phòng Bến xe Liên Tỉnh' : branch.branchId === 'ct' ? 'Văn phòng Bến xe Trung Tâm' : 'Văn phòng Bến xe Miền Đông');
        shiftType = agent?.shiftType || 'morning';
        shiftName = agent?.shiftName || (shiftType === 'evening' ? 'Ca Chiều (14:00 - 22:00)' : 'Ca Sáng (06:30 - 14:30)');
        branch.assignedOffices = [assignedOffice];
      }

      return {
        ...uObj,
        employeeCode: emp?.employeeCode || '',
        faceRegistered: Boolean(emp?.faceRegistered && Array.isArray(emp?.faceDescriptors) && emp?.faceDescriptors?.length > 0),
        branch,
        assignedOffice,
        shiftType,
        shiftName
      };
    });
  }

  async createStaff({ name, email, phone, password, role, status, branch, assignedOffice, shiftType, shiftName }) {
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

    const targetRole = role || 'driver';
    const branchId = branch?.branchId || 'sg';
    const branchName = branch?.branchName || (branchId === 'dl' ? 'Chi nhánh Đà Lạt' : branchId === 'ct' ? 'Chi nhánh Cần Thơ' : 'Chi nhánh TP. Hồ Chí Minh');

    const payload = {
      name,
      email,
      phone,
      password,
      role: targetRole,
      status: status || 'active'
    };

    const staff = await userRepository.create(payload);

    // Sinh mã nhân viên theo phân hệ
    const prefixMap = {
      driver: 'TX',
      attendant: 'TV',
      ticket_agent: `NV-${branchId.toUpperCase()}`,
      ticket_manager: `QL-${branchId.toUpperCase()}`,
      fleet_manager: 'DX',
      ops_manager: 'VH',
      general_manager: 'GD',
      admin: 'AD'
    };
    const prefix = prefixMap[targetRole] || 'NV';
    const count = await EmployeeProfile.countDocuments({});
    let seq = count + 1;
    let employeeCode = `${prefix}-${String(seq).padStart(3, '0')}`;
    while (await EmployeeProfile.exists({ employeeCode })) {
      seq++;
      employeeCode = `${prefix}-${String(seq).padStart(3, '0')}`;
    }

    await EmployeeProfile.create({
      _id: staff._id,
      employeeCode,
      branch: {
        branchId,
        branchName
      },
      faceRegistered: false,
      faceDescriptors: [],
      facePhoto: null
    });

    // Cấu hình riêng cho Nhân viên bán vé
    let finalOffice = '';
    let finalShiftType = 'morning';
    let finalShiftName = 'Ca Sáng (06:30 - 14:30)';

    if (['ticket_agent', 'ticket_manager'].includes(targetRole)) {
      finalOffice = assignedOffice || (branchId === 'dl' ? 'Văn phòng Bến xe Liên Tỉnh' : branchId === 'ct' ? 'Văn phòng Bến xe Trung Tâm' : 'Văn phòng Bến xe Miền Đông');
      finalShiftType = shiftType || 'morning';
      finalShiftName = shiftName || (finalShiftType === 'evening' ? 'Ca Chiều (14:00 - 22:00)' : 'Ca Sáng (06:30 - 14:30)');

      await TicketAgentProfile.create({
        _id: staff._id,
        assignedOffice: finalOffice,
        shiftType: finalShiftType,
        shiftName: finalShiftName
      });
    }

    const staffData = staff.toObject();
    delete staffData.password;
    staffData.employeeCode = employeeCode;
    staffData.branch = {
      branchId,
      branchName,
      assignedOffices: finalOffice ? [finalOffice] : []
    };
    staffData.assignedOffice = finalOffice;
    staffData.assignedCounter = finalCounter;
    staffData.shiftType = finalShiftType;
    staffData.shiftName = finalShiftName;
    return staffData;
  }

  async updateStaff(id, { name, email, phone, role, status, password, branch, assignedOffice, shiftType, shiftName }) {
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
    if (password !== undefined && password) staff.password = password;

    await userRepository.save(staff);

    // Cập nhật EmployeeProfile
    const branchId = branch?.branchId;
    const branchName = branch?.branchName || (branchId === 'dl' ? 'Chi nhánh Đà Lạt' : branchId === 'ct' ? 'Chi nhánh Cần Thơ' : 'Chi nhánh TP. Hồ Chí Minh');
    if (branchId) {
      await EmployeeProfile.findByIdAndUpdate(
        id,
        {
          $set: {
            'branch.branchId': branchId,
            'branch.branchName': branchName
          }
        },
        { upsert: true }
      );
    }

    // Cập nhật TicketAgentProfile nếu vai trò phòng vé
    const targetRole = role || staff.role;
    let finalOffice = '';
    let finalShiftType = 'morning';
    let finalShiftName = 'Ca Sáng (06:30 - 14:30)';

    if (['ticket_agent', 'ticket_manager'].includes(targetRole)) {
      finalOffice = assignedOffice || (branchId === 'dl' ? 'Văn phòng Bến xe Liên Tỉnh' : branchId === 'ct' ? 'Văn phòng Bến xe Trung Tâm' : 'Văn phòng Bến xe Miền Đông');
      finalShiftType = shiftType || 'morning';
      finalShiftName = shiftName || (finalShiftType === 'evening' ? 'Ca Chiều (14:00 - 22:00)' : 'Ca Sáng (06:30 - 14:30)');

      await TicketAgentProfile.findByIdAndUpdate(
        id,
        {
          $set: {
            assignedOffice: finalOffice,
            shiftType: finalShiftType,
            shiftName: finalShiftName
          }
        },
        { upsert: true }
      );
    }

    const staffData = staff.toObject();
    delete staffData.password;
    staffData.branch = {
      branchId: branchId || 'sg',
      branchName: branchName || 'Chi nhánh TP. Hồ Chí Minh',
      assignedOffices: finalOffice ? [finalOffice] : []
    };
    staffData.assignedOffice = finalOffice;
    staffData.shiftType = finalShiftType;
    staffData.shiftName = finalShiftName;
    return staffData;
  }

  async deleteStaff(id) {
    const staff = await userRepository.findById(id);
    if (!staff) {
      throw new Error('Không tìm thấy thông tin nhân viên.');
    }
    await Promise.all([
      userRepository.delete(staff),
      EmployeeProfile.deleteOne({ _id: id }),
      TicketAgentProfile.deleteOne({ _id: id })
    ]);
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
