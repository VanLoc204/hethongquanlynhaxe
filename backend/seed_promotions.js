const mongoose = require('mongoose');
const Promotion = require('./models/Promotion');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

const samplePromotions = [
  {
    code: 'ANBINH2026',
    title: 'Chào Xuân 2026 - Giảm 50.000đ trực tiếp',
    description: 'Ưu đãi đặc biệt đầu năm cho tất cả hành khách đặt vé tuyến đường dài.',
    discountType: 'fixed_amount',
    discountValue: 50000,
    maxDiscountAmount: 50000,
    minOrderValue: 200000,
    usageLimit: 500,
    usedCount: 142,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    status: 'active',
    createdBy: 'Ban Giám Đốc',
  },
  {
    code: 'HEVUI15',
    title: 'Ưu Đãi Hè Rực Rỡ - Giảm 15% Vé Limousine',
    description: 'Giảm ngay 15% tổng hóa đơn đặt vé VIP Limousine các tuyến Sài Gòn - Đà Lạt / Nha Trang.',
    discountType: 'percentage',
    discountValue: 15,
    maxDiscountAmount: 100000,
    minOrderValue: 350000,
    usageLimit: 300,
    usedCount: 88,
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-09-30'),
    status: 'active',
    createdBy: 'Phòng Marketing',
  },
  {
    code: 'BANMOI20',
    title: 'Chào Bạn Mới - Giảm 20% Đơn Đầu Tiên',
    description: 'Dành riêng cho khách hàng mới đăng ký tài khoản lần đầu trên ứng dụng An Bỉnh Lines.',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscountAmount: 70000,
    minOrderValue: 150000,
    usageLimit: 1000,
    usedCount: 315,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    status: 'active',
    createdBy: 'Ban Giám Đốc',
  },
  {
    code: 'TRIANVIP',
    title: 'Mã Tri ân Khách Hàng VIP - Giảm 100.000đ',
    description: 'Voucher độc quyền dành riêng cho khách hàng thành viên Vàng & Kim Cương.',
    discountType: 'fixed_amount',
    discountValue: 100000,
    maxDiscountAmount: 100000,
    minOrderValue: 500000,
    usageLimit: 200,
    usedCount: 45,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-11-30'),
    status: 'active',
    createdBy: 'Chăm sóc Khách hàng',
  },
  {
    code: 'TETAM2026',
    title: 'Voucher Tết Âm Lịch 2026 (Hết hạn)',
    description: 'Mã ưu đãi đặt vé xe đợt Tết Nguyên Đán vừa qua.',
    discountType: 'fixed_amount',
    discountValue: 30000,
    maxDiscountAmount: 30000,
    minOrderValue: 300000,
    usageLimit: 400,
    usedCount: 400,
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-02-15'),
    status: 'expired',
    createdBy: 'Phòng Marketing',
  },
];

async function seedPromotions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    await Promotion.deleteMany({});
    console.log('Cleared existing promotions.');

    const created = await Promotion.insertMany(samplePromotions);
    console.log(`Seeded ${created.length} sample promotions successfully!`);
  } catch (err) {
    console.error('Error seeding promotions:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedPromotions();
