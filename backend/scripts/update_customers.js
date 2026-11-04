const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

const customerAccounts = [
  {
    oldEmail: 'khach1@gmail.com',
    phone: '0901234567',
    name: 'Nguyễn Minh Tuấn',
    email: 'tuan.nguyenminh@gmail.com',
    membershipTier: 'Bronze',
    points: 150
  },
  {
    oldEmail: 'khach2@gmail.com',
    phone: '0902345678',
    name: 'Trần Thu Hà',
    email: 'ha.tranthu@gmail.com',
    membershipTier: 'Silver',
    points: 450
  },
  {
    oldEmail: 'hovanloc.lv@gmail.com',
    phone: '0829927690',
    name: 'Hồ Văn Lộc',
    email: 'hovanloc.lv@gmail.com',
    membershipTier: 'Platinum',
    points: 1250
  },
  {
    phone: '0918112233',
    name: 'Phạm Văn Minh',
    email: 'minh.phamvan@gmail.com',
    membershipTier: 'Gold',
    points: 850
  },
  {
    phone: '0937445566',
    name: 'Lê Thị Hoài',
    email: 'hoai.lethi@gmail.com',
    membershipTier: 'Bronze',
    points: 250
  }
];

async function updateCustomers() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const usersColl = mongoose.connection.collection('users');
  const hashedPassword = await bcrypt.hash('123456', 10);

  for (const cust of customerAccounts) {
    const existing = await usersColl.findOne({
      $or: [
        { phone: cust.phone },
        { email: cust.email },
        ...(cust.oldEmail ? [{ email: cust.oldEmail }] : [])
      ]
    });

    if (existing) {
      await usersColl.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: cust.name,
            email: cust.email,
            phone: cust.phone,
            membershipTier: cust.membershipTier || existing.membershipTier || 'Bronze',
            points: cust.points !== undefined ? cust.points : (existing.points || 150),
            role: 'customer',
            status: 'active',
            updatedAt: new Date()
          }
        }
      );
      console.log(`[UPDATED CUSTOMER] SĐT ${cust.phone}: "${existing.name}" -> "${cust.name}" (${cust.email})`);
    } else {
      await usersColl.insertOne({
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        password: hashedPassword,
        role: 'customer',
        status: 'active',
        points: cust.points || 150,
        membershipTier: cust.membershipTier || 'Bronze',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`[CREATED CUSTOMER] SĐT ${cust.phone}: "${cust.name}" (${cust.email})`);
    }
  }

  // Also update customerName/customerEmail in Bookings if any
  const bookingsColl = mongoose.connection.collection('bookings');
  for (const cust of customerAccounts) {
    await bookingsColl.updateMany(
      { customerPhone: cust.phone },
      { $set: { customerName: cust.name, customerEmail: cust.email } }
    );
  }
  console.log('Updated associated Bookings customerName & customerEmail.');

  console.log('\n--- TỔNG KẾT TÀI KHOẢN KHÁCH HÀNG (CUSTOMER) TRONG MONGODB ---');
  const allCust = await usersColl.find({ role: 'customer' }).toArray();
  allCust.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name} | SĐT: ${c.phone} | Email: ${c.email} | Hạng: ${c.membershipTier} (${c.points} điểm)`);
  });

  await mongoose.disconnect();
}

updateCustomers().catch(err => {
  console.error(err);
  process.exit(1);
});
