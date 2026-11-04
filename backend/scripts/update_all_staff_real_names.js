const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

const updatedStaffList = [
  // ─── 1. BAN GIÁM ĐỐC & QUẢN LÝ ĐIỀU HÀNH ─────────────────────────────────
  {
    oldIdentifier: 'admin@anbinhlines.vn',
    phone: '0955555666',
    name: 'Trần Quốc Huy',
    email: 'huy.tranquoc@anbinhlines.vn',
    role: 'admin'
  },
  {
    oldIdentifier: 'director@anbinhlines.vn',
    phone: '0966555666',
    name: 'Nguyễn An Bình',
    email: 'binh.nguyenan@anbinhlines.vn',
    role: 'general_manager'
  },
  {
    oldIdentifier: 'ops@anbinhlines.vn',
    phone: '0977777777',
    name: 'Lê Trọng Nghĩa',
    email: 'nghia.letrong@anbinhlines.vn',
    role: 'ops_manager'
  },
  {
    oldIdentifier: 'fleet@anbinhlines.vn',
    phone: '0988888888',
    name: 'Phạm Minh Tuấn',
    email: 'tuan.phamminh@anbinhlines.vn',
    role: 'fleet_manager'
  },

  // ─── 2. CHI NHÁNH TP. HỒ CHÍ MINH (sg) ──────────────────────────────────
  {
    oldIdentifier: 'ticket_manager@anbinhlines.vn',
    phone: '0944999888',
    name: 'Võ Hoàng Nam',
    email: 'nam.vohoang@anbinhlines.vn',
    role: 'ticket_manager',
    branch: {
      branchId: 'sg',
      branchName: 'Chi nhánh TP. Hồ Chí Minh',
      assignedOffices: ['Văn phòng Sài Gòn (BXMĐ)', 'Văn phòng Sài Gòn (BXMT)']
    }
  },
  {
    oldIdentifier: 'ticket@anbinhlines.vn',
    phone: '0944555666',
    name: 'Nguyễn Thị Mai',
    email: 'mai.nguyenthi@anbinhlines.vn',
    role: 'ticket_agent',
    branch: {
      branchId: 'sg',
      branchName: 'Chi nhánh TP. Hồ Chí Minh',
      assignedOffices: ['Văn phòng Sài Gòn (BXMĐ)']
    }
  },
  {
    oldIdentifier: 'ticket_sg_bxmt@anbinhlines.vn',
    phone: '0944555667',
    name: 'Đặng Thanh Trúc',
    email: 'truc.dangthanh@anbinhlines.vn',
    role: 'ticket_agent',
    branch: {
      branchId: 'sg',
      branchName: 'Chi nhánh TP. Hồ Chí Minh',
      assignedOffices: ['Văn phòng Sài Gòn (BXMT)']
    }
  },

  // ─── 3. CHI NHÁNH ĐÀ LẠT (dl) ───────────────────────────────────────────
  {
    oldIdentifier: 'ticket_manager_dl@anbinhlines.vn',
    phone: '0944999881',
    name: 'Bùi Hải Đăng',
    email: 'dang.buihai@anbinhlines.vn',
    role: 'ticket_manager',
    branch: {
      branchId: 'dl',
      branchName: 'Chi nhánh Đà Lạt',
      assignedOffices: ['Văn phòng Đà Lạt (BX Liên Tỉnh)', 'Văn phòng Đà Lạt (Bùi Thị Xuân)']
    }
  },
  {
    oldIdentifier: 'ticket_dl@anbinhlines.vn',
    phone: '0944555661',
    name: 'Lâm Mộng Điệp',
    email: 'diep.lammong@anbinhlines.vn',
    role: 'ticket_agent',
    branch: {
      branchId: 'dl',
      branchName: 'Chi nhánh Đà Lạt',
      assignedOffices: ['Văn phòng Đà Lạt (BX Liên Tỉnh)']
    }
  },
  {
    oldIdentifier: 'ticket_dl_btx@anbinhlines.vn',
    phone: '0944555663',
    name: 'Hoàng Thu Thảo',
    email: 'thao.hoangthu@anbinhlines.vn',
    role: 'ticket_agent',
    branch: {
      branchId: 'dl',
      branchName: 'Chi nhánh Đà Lạt',
      assignedOffices: ['Văn phòng Đà Lạt (Bùi Thị Xuân)']
    }
  },

  // ─── 4. CHI NHÁNH CẦN THƠ (ct) ──────────────────────────────────────────
  {
    oldIdentifier: 'ticket_manager_ct@anbinhlines.vn',
    phone: '0944999882',
    name: 'Phan Thành Đạt',
    email: 'dat.phanthanh@anbinhlines.vn',
    role: 'ticket_manager',
    branch: {
      branchId: 'ct',
      branchName: 'Chi nhánh Cần Thơ',
      assignedOffices: ['Văn phòng Cần Thơ (BX Trung Tâm)', 'Văn phòng Cần Thơ (Ninh Kiều)']
    }
  },
  {
    oldIdentifier: 'ticket_ct@anbinhlines.vn',
    phone: '0944555662',
    name: 'Trương Mỹ Duyên',
    email: 'duyen.truongmy@anbinhlines.vn',
    role: 'ticket_agent',
    branch: {
      branchId: 'ct',
      branchName: 'Chi nhánh Cần Thơ',
      assignedOffices: ['Văn phòng Cần Thơ (BX Trung Tâm)']
    }
  },
  {
    oldIdentifier: 'ticket_ct_nk@anbinhlines.vn',
    phone: '0944555664',
    name: 'Nguyễn Quốc Khánh',
    email: 'khanh.nguyenquoc@anbinhlines.vn',
    role: 'ticket_agent',
    branch: {
      branchId: 'ct',
      branchName: 'Chi nhánh Cần Thơ',
      assignedOffices: ['Văn phòng Cần Thơ (Ninh Kiều)']
    }
  },

  // ─── 5. TÀI XẾ CÓ TÊN CHỨC VỤ ───────────────────────────────────────────
  {
    oldIdentifier: 'driver1@anbinhlines.vn',
    phone: '0933333333',
    name: 'Đỗ Hoàng Long',
    email: 'long.dohoang@anbinhlines.vn',
    role: 'driver'
  }
];

async function updateStaffRealNames() {
  console.log('Đang kết nối MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối thành công!\n');

  const usersColl = mongoose.connection.collection('users');
  const hashedPassword = await bcrypt.hash('123456', 10);

  for (const staff of updatedStaffList) {
    const existing = await usersColl.findOne({
      $or: [
        { phone: staff.phone },
        { email: staff.email },
        { email: staff.oldIdentifier }
      ]
    });

    const updateFields = {
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      status: 'active',
      updatedAt: new Date()
    };

    if (staff.branch) {
      updateFields.branch = staff.branch;
    }

    if (existing) {
      await usersColl.updateOne(
        { _id: existing._id },
        { $set: updateFields }
      );
      console.log(`[ĐÃ ĐỔI TÊN] SĐT ${staff.phone}: "${existing.name}" -> "${staff.name}" (${staff.email})`);
    } else {
      await usersColl.insertOne({
        ...updateFields,
        password: hashedPassword,
        points: 150,
        membershipTier: 'Bronze',
        faceRegistered: false,
        faceDescriptors: [],
        createdAt: new Date()
      });
      console.log(`[TẠO MỚI] SĐT ${staff.phone}: "${staff.name}" (${staff.email})`);
    }
  }

  console.log('\n--- TỔNG KẾT DANH SÁCH NHÂN SỰ ĐÃ ĐƯỢC CHUẨN HÓA HỌ TÊN THẬT ---');
  const allUpdated = await usersColl.find({
    role: { $in: ['admin', 'general_manager', 'ops_manager', 'fleet_manager', 'ticket_manager', 'ticket_agent', 'driver'] }
  }).sort({ role: 1 }).toArray();

  allUpdated.forEach((u, i) => {
    const branchText = u.branch?.branchName ? `[${u.branch.branchName}]` : '';
    console.log(`${i + 1}. [${u.role}] ${u.name} | SĐT: ${u.phone} | Email: ${u.email} ${branchText}`);
  });

  await mongoose.disconnect();
  console.log('\nCập nhật họ tên nhân sự thành công!');
}

updateStaffRealNames().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
