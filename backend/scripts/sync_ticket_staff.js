const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

const targetStaff = [
  // ─── 1. Quản lý phòng vé (ticket_manager) ──────────────────────────────────
  {
    name: 'Quản Lý Phòng Vé Sài Gòn',
    email: 'ticket_manager@anbinhlines.vn',
    phone: '0944999888',
    role: 'ticket_manager',
    branch: {
      branchId: 'sg',
      branchName: 'Chi nhánh TP. Hồ Chí Minh',
      assignedOffices: ['Văn phòng Sài Gòn (BXMĐ)', 'Văn phòng Sài Gòn (BXMT)']
    }
  },
  {
    name: 'Quản Lý Phòng Vé Đà Lạt',
    email: 'ticket_manager_dl@anbinhlines.vn',
    phone: '0944999881',
    role: 'ticket_manager',
    branch: {
      branchId: 'dl',
      branchName: 'Chi nhánh Đà Lạt',
      assignedOffices: ['Văn phòng Đà Lạt (BX Liên Tỉnh)', 'Văn phòng Đà Lạt (Bùi Thị Xuân)']
    }
  },
  {
    name: 'Quản Lý Phòng Vé Cần Thơ',
    email: 'ticket_manager_ct@anbinhlines.vn',
    phone: '0944999882',
    role: 'ticket_manager',
    branch: {
      branchId: 'ct',
      branchName: 'Chi nhánh Cần Thơ',
      assignedOffices: ['Văn phòng Cần Thơ (BX Trung Tâm)', 'Văn phòng Cần Thơ (Ninh Kiều)']
    }
  },

  // ─── 2. Nhân viên bán vé (ticket_agent) kèm khu vực/văn phòng ──────────────
  // Chi nhánh TP. Hồ Chí Minh
  {
    name: 'Nhân Viên Bán Vé Sài Gòn (BXMĐ)',
    email: 'ticket@anbinhlines.vn',
    phone: '0944555666',
    role: 'ticket_agent',
    branch: {
      branchId: 'sg',
      branchName: 'Chi nhánh TP. Hồ Chí Minh',
      assignedOffices: ['Văn phòng Sài Gòn (BXMĐ)']
    }
  },
  {
    name: 'Nhân Viên Bán Vé Sài Gòn (BXMT)',
    email: 'ticket_sg_bxmt@anbinhlines.vn',
    phone: '0944555667',
    role: 'ticket_agent',
    branch: {
      branchId: 'sg',
      branchName: 'Chi nhánh TP. Hồ Chí Minh',
      assignedOffices: ['Văn phòng Sài Gòn (BXMT)']
    }
  },

  // Chi nhánh Đà Lạt
  {
    name: 'Nhân Viên Bán Vé Đà Lạt (BX Liên Tỉnh)',
    email: 'ticket_dl@anbinhlines.vn',
    phone: '0944555661',
    role: 'ticket_agent',
    branch: {
      branchId: 'dl',
      branchName: 'Chi nhánh Đà Lạt',
      assignedOffices: ['Văn phòng Đà Lạt (BX Liên Tỉnh)']
    }
  },
  {
    name: 'Nhân Viên Bán Vé Đà Lạt (Bùi Thị Xuân)',
    email: 'ticket_dl_btx@anbinhlines.vn',
    phone: '0944555663',
    role: 'ticket_agent',
    branch: {
      branchId: 'dl',
      branchName: 'Chi nhánh Đà Lạt',
      assignedOffices: ['Văn phòng Đà Lạt (Bùi Thị Xuân)']
    }
  },

  // Chi nhánh Cần Thơ
  {
    name: 'Nhân Viên Bán Vé Cần Thơ (BX Trung Tâm)',
    email: 'ticket_ct@anbinhlines.vn',
    phone: '0944555662',
    role: 'ticket_agent',
    branch: {
      branchId: 'ct',
      branchName: 'Chi nhánh Cần Thơ',
      assignedOffices: ['Văn phòng Cần Thơ (BX Trung Tâm)']
    }
  },
  {
    name: 'Nhân Viên Bán Vé Cần Thơ (Ninh Kiều)',
    email: 'ticket_ct_nk@anbinhlines.vn',
    phone: '0944555664',
    role: 'ticket_agent',
    branch: {
      branchId: 'ct',
      branchName: 'Chi nhánh Cần Thơ',
      assignedOffices: ['Văn phòng Cần Thơ (Ninh Kiều)']
    }
  }
];

async function run() {
  console.log('Connecting to:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  const usersColl = mongoose.connection.collection('users');
  const hashedPassword = await bcrypt.hash('123456', 10);

  for (const staff of targetStaff) {
    const existing = await usersColl.findOne({
      $or: [{ phone: staff.phone }, { email: staff.email }]
    });

    if (existing) {
      await usersColl.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: staff.name,
            role: staff.role,
            branch: staff.branch,
            status: 'active',
            updatedAt: new Date()
          }
        }
      );
      console.log(`[UPDATED] ${staff.role} - ${staff.name} (${staff.phone}) -> Chi nhánh: ${staff.branch.branchName}`);
    } else {
      await usersColl.insertOne({
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        password: hashedPassword,
        role: staff.role,
        branch: staff.branch,
        status: 'active',
        points: 150,
        membershipTier: 'Bronze',
        faceRegistered: false,
        faceDescriptors: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`[CREATED] ${staff.role} - ${staff.name} (${staff.phone}) -> Chi nhánh: ${staff.branch.branchName}`);
    }
  }

  // Cập nhật cho bất kỳ nhân viên bán vé nào khác còn sót lại chưa có branch
  const unassignedAgents = await usersColl.find({
    role: 'ticket_agent',
    $or: [{ branch: { $exists: false } }, { 'branch.branchId': { $exists: false } }]
  }).toArray();

  if (unassignedAgents.length > 0) {
    console.log(`Tìm thấy ${unassignedAgents.length} ticket_agent chưa có branch, tự động gán về Chi nhánh TP.HCM...`);
    for (const agent of unassignedAgents) {
      await usersColl.updateOne(
        { _id: agent._id },
        {
          $set: {
            branch: {
              branchId: 'sg',
              branchName: 'Chi nhánh TP. Hồ Chí Minh',
              assignedOffices: ['Văn phòng Sài Gòn (BXMĐ)']
            },
            updatedAt: new Date()
          }
        }
      );
    }
  }

  console.log('\n--- TỔNG KẾT TÀI KHOẢN PHÒNG VÉ HIỆN TẠI TRONG MONGODB ---');
  const allTicketStaff = await usersColl.find(
    { role: { $in: ['ticket_manager', 'ticket_agent'] } },
    { projection: { name: 1, email: 1, phone: 1, role: 1, branch: 1, status: 1 } }
  ).toArray();

  allTicketStaff.forEach((u, i) => {
    console.log(`${i + 1}. [${u.role}] ${u.name} | SĐT: ${u.phone} | Chi nhánh: ${u.branch?.branchName || 'N/A'} | Khu vực: ${u.branch?.assignedOffices?.join(', ') || 'N/A'}`);
  });

  await mongoose.disconnect();
  console.log('\nĐã hoàn thành!');
}

run().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
