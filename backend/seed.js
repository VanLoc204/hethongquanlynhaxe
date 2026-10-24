const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define connection URI (Docker port 27018 or local fallback)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

// ----------------------------------------
// 1. MODELS
// ----------------------------------------
const Route = require('./models/Route');
const Bus = require('./models/Bus');
const Trip = require('./models/Trip');
const Review = require('./models/Review');
const Booking = require('./models/Booking');
const ShiftSession = require('./models/ShiftSession');
const LeaveRequest = require('./models/LeaveRequest');
const WorkSchedule = require('./models/WorkSchedule');

const mockReviewsList = [
  { userName: "Nguyễn Văn Hùng", rating: 5, comment: "Xe đi rất êm, sạch sẽ, lái xe cẩn thận và đúng giờ. Tôi rất hài lòng." },
  { userName: "Trần Thị Lan", rating: 5, comment: "Nhà xe phục vụ tận tình, có nước uống và khăn lạnh đầy đủ. Wifi căng đét." },
  { userName: "Lê Minh Tuấn", rating: 4, comment: "Xe chất lượng cao, giường nằm thoải mái rộng rãi. Tuy nhiên xe xuất phát hơi trễ 5 phút." },
  { userName: "Phạm Thanh Thảo", rating: 5, comment: "Dịch vụ tuyệt vời. Khoang phòng limousine riêng tư, tivi xem phim rất thích." },
  { userName: "Hoàng Đức Anh", rating: 4, comment: "Giá cả hợp lý so với chất lượng phục vụ. Lần sau sẽ tiếp tục ủng hộ An Bình." }
];

async function seedReviewsForTrip(tripId) {
  for (const rev of mockReviewsList) {
    await Review.create({
      tripId,
      userName: rev.userName,
      rating: rev.rating,
      comment: rev.comment
    });
  }
}

// ----------------------------------------
// 2. SEED FUNCTION
// ----------------------------------------

async function seedDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB on port 27018.');

    // Clear existing data (Xóa sạch dữ liệu trước khi tạo mới)
    await Route.deleteMany({});
    await Bus.deleteMany({});
    await Trip.deleteMany({});
    await Review.deleteMany({});
    await Booking.deleteMany({});
    await ShiftSession.deleteMany({});
    await LeaveRequest.deleteMany({});
    
    try {
      await mongoose.connection.collection('shipments').deleteMany({});
      console.log('Cleared all existing Shipment data.');
    } catch (e) {
      // shipments collection might not exist yet
    }

    try {
      await mongoose.connection.collection('baseprices').deleteMany({});
      console.log('Cleared all existing BasePrice data.');
    } catch (e) {
      // baseprices collection might not exist yet
    }

    try {
      // Reset the users collection completely
      await mongoose.connection.collection('users').deleteMany({});
      console.log('Cleared all existing User data.');
    } catch (e) {
      // users collection might not exist yet
    }

    console.log('Cleared all existing database collections.');

    // ========================================
    // Seed System and Customer Accounts
    // Mật khẩu mặc định: 123456
    // ========================================
    const hashedPassword = await bcrypt.hash('123456', 10);

    const systemUsers = [
      // Managers & Admin
      {
        name: 'Quản Lý Xe An Bình',
        email: 'fleet@anbinhlines.vn',
        phone: '0988888888',
        role: 'fleet_manager',
      },
      {
        name: 'Quản Lý Vận Tải An Bình',
        email: 'ops@anbinhlines.vn',
        phone: '0977777777',
        role: 'ops_manager',
      },
      {
        name: 'Giám Đốc An Bình',
        email: 'director@anbinhlines.vn',
        phone: '0966555666', // Unique phone for GM
        role: 'general_manager',
      },
      {
        name: 'Quản Trị Viên Hệ Thống',
        email: 'admin@anbinhlines.vn',
        phone: '0955555666', // Unique phone for Admin
        role: 'admin',
      },
      // Quản lý phòng vé & Nhân viên bán vé Chi nhánh TP. Hồ Chí Minh
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
        name: 'Nhân Viên Bán Vé Sài Gòn',
        email: 'ticket@anbinhlines.vn',
        phone: '0944555666',
        role: 'ticket_agent',
        branch: {
          branchId: 'sg',
          branchName: 'Chi nhánh TP. Hồ Chí Minh',
          assignedOffices: ['Văn phòng Sài Gòn (BXMĐ)']
        }
      },
      // Quản lý phòng vé & Nhân viên bán vé Chi nhánh Đà Lạt
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
        name: 'Nhân Viên Bán Vé Đà Lạt',
        email: 'ticket_dl@anbinhlines.vn',
        phone: '0944555661',
        role: 'ticket_agent',
        branch: {
          branchId: 'dl',
          branchName: 'Chi nhánh Đà Lạt',
          assignedOffices: ['Văn phòng Đà Lạt (BX Liên Tỉnh)']
        }
      },
      // Quản lý phòng vé & Nhân viên bán vé Chi nhánh Cần Thơ
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
      {
        name: 'Nhân Viên Bán Vé Cần Thơ',
        email: 'ticket_ct@anbinhlines.vn',
        phone: '0944555662',
        role: 'ticket_agent',
        branch: {
          branchId: 'ct',
          branchName: 'Chi nhánh Cần Thơ',
          assignedOffices: ['Văn phòng Cần Thơ (BX Trung Tâm)']
        }
      },
      // Drivers (Tài xế)
      {
        name: 'Tài xế An Bình',
        email: 'driver1@anbinhlines.vn',
        phone: '0933333333',
        role: 'driver',
      },
      {
        name: 'Trần Minh Tâm',
        email: 'driver2@anbinhlines.vn',
        phone: '0987654321',
        role: 'driver',
      },
      {
        name: 'Nguyễn Văn Hùng',
        email: 'driver3@anbinhlines.vn',
        phone: '0912345678',
        role: 'driver',
      },
      {
        name: 'Lê Hoàng Nam',
        email: 'driver4@anbinhlines.vn',
        phone: '0909090909',
        role: 'driver',
      },
      {
        name: 'Nguyễn Văn An',
        email: 'driver5@anbinhlines.vn',
        phone: '0912999999',
        role: 'driver',
      },
      {
        name: 'Trần Văn Bình',
        email: 'driver6@anbinhlines.vn',
        phone: '0988999999',
        role: 'driver',
      },
      {
        name: 'Phạm Minh Hải',
        email: 'driver7@anbinhlines.vn',
        phone: '0934567890',
        role: 'driver',
      },
      {
        name: 'Vũ Hoàng Long',
        email: 'driver8@anbinhlines.vn',
        phone: '0945678901',
        role: 'driver',
      },
      {
        name: 'Đỗ Tiến Đạt',
        email: 'driver9@anbinhlines.vn',
        phone: '0956789012',
        role: 'driver',
      },
      // Attendants (Phụ xe)
      {
        name: 'Phạm Quốc Bảo',
        email: 'attendant1@anbinhlines.vn',
        phone: '0944444444',
        role: 'attendant',
      },
      {
        name: 'Hoàng Văn Tuấn',
        email: 'attendant2@anbinhlines.vn',
        phone: '0966666666',
        role: 'attendant',
      },
      {
        name: 'Đỗ Đức Mạnh',
        email: 'attendant3@anbinhlines.vn',
        phone: '0955555555',
        role: 'attendant',
      },
      {
        name: 'Nguyễn Tiến Dũng',
        email: 'attendant4@anbinhlines.vn',
        phone: '0977889900',
        role: 'attendant',
      },
      {
        name: 'Bùi Hữu Nghĩa',
        email: 'attendant5@anbinhlines.vn',
        phone: '0967890123',
        role: 'attendant',
      },
      {
        name: 'Nguyễn Hải Đăng',
        email: 'attendant6@anbinhlines.vn',
        phone: '0978901234',
        role: 'attendant',
      },
      {
        name: 'Phan Văn Trị',
        email: 'attendant7@anbinhlines.vn',
        phone: '0989012345',
        role: 'attendant',
      },
      {
        name: 'Lê Hồng Phong',
        email: 'attendant8@anbinhlines.vn',
        phone: '0990123456',
        role: 'attendant',
      },
      {
        name: 'Nguyễn Huỳnh Đức',
        email: 'attendant9@anbinhlines.vn',
        phone: '0901238888',
        role: 'attendant',
      }
    ];

    // Seed all staff/system users
    const staffIds = {};
    for (const u of systemUsers) {
      const result = await mongoose.connection.collection('users').insertOne({
        ...u,
        password: hashedPassword,
        status: 'active',
        points: 150,
        membershipTier: 'Bronze',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      staffIds[u.email] = result.insertedId;
    }

    // Seed Customer accounts
    const cust1 = await mongoose.connection.collection('users').insertOne({
      name: 'Nguyễn Văn Khách',
      email: 'khach1@gmail.com',
      phone: '0901234567',
      password: hashedPassword,
      role: 'customer',
      status: 'active',
      points: 150,
      membershipTier: 'Bronze',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const cust2 = await mongoose.connection.collection('users').insertOne({
      name: 'Trần Thị Khách',
      email: 'khach2@gmail.com',
      phone: '0902345678',
      password: hashedPassword,
      role: 'customer',
      status: 'active',
      points: 450,
      membershipTier: 'Silver',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const customer1Id = cust1.insertedId.toString();
    const customer2Id = cust2.insertedId.toString();

    console.log('Successfully seeded system users, drivers, assistants, and customers.');

    // 2.1 Seed Routes
    const r1 = await Route.create({
      startPoint: 'Hồ Chí Minh',
      endPoint: 'Đà Lạt',
      distance: '310km',
      duration: '7 giờ 50 phút',
      stops: [
        { name: 'VP Tân Bình', address: '266 Đồng Đen, P.10, Tân Bình, TP.HCM', type: 'start' },
        { name: 'Bến Xe Miền Đông', address: '292 Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM', type: 'waypoint' },
        { name: 'Trạm dừng chân Lê Hoàng (Đồng Nai)', address: 'QL20, Thống Nhất, Đồng Nai', type: 'waypoint' },
        { name: 'Bảo Lộc', address: 'Trạm dừng Chân Tâm Châu, Bảo Lộc, Lâm Đồng', type: 'waypoint' },
        { name: 'Đức Trọng', address: 'QL20, Thị trấn Liên Nghĩa, Đức Trọng', type: 'waypoint' },
        { name: 'VP Đà Lạt (Đích)', address: '01 Tô Hiến Thành, Phường 3, Đà Lạt', type: 'end' }
      ]
    });

    const r2 = await Route.create({
      startPoint: 'Hồ Chí Minh',
      endPoint: 'Cần Thơ',
      distance: '172km',
      duration: '3 giờ',
      stops: [
        { name: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, An Lạc, Bình Tân, TP.HCM', type: 'start' },
        { name: 'Trạm dừng chân Minh Phát (Tỉnh Long An)', address: 'Cao tốc TP.HCM - Trung Lương', type: 'waypoint' },
        { name: 'Trạm dừng chân Cai Lậy (Tiền Giang)', address: 'QL1A, Cai Lậy, Tiền Giang', type: 'waypoint' },
        { name: 'Cầu Mỹ Thuận (Vĩnh Long)', address: 'Thành phố Vĩnh Long', type: 'waypoint' },
        { name: 'Bến Xe Trung Tâm Cần Thơ (Đích)', address: 'Đường dẫn cầu Cần Thơ, Hưng Thạnh, Cái Răng, Cần Thơ', type: 'end' }
      ]
    });

    const r3 = await Route.create({
      startPoint: 'Đà Lạt',
      endPoint: 'Hồ Chí Minh',
      distance: '305km',
      duration: '7 giờ',
      stops: [
        { name: 'VP Đà Lạt', address: '01 Tô Hiến Thành, Phường 3, Đà Lạt', type: 'start' },
        { name: 'Đức Trọng', address: 'QL20, Thị trấn Liên Nghĩa, Đức Trọng', type: 'waypoint' },
        { name: 'Bảo Lộc', address: 'Trạm dừng Chân Tâm Châu, Bảo Lộc', type: 'waypoint' },
        { name: 'Nút giao Dầu Giây', address: 'Cao tốc Dầu Giây - TP.HCM', type: 'waypoint' },
        { name: 'VP Tân Bình (Đích)', address: '266 Đồng Đen, P.10, Tân Bình, TP.HCM', type: 'end' }
      ]
    });

    const r4 = await Route.create({
      startPoint: 'Cần Thơ',
      endPoint: 'Hồ Chí Minh',
      distance: '172km',
      duration: '3 giờ',
      stops: [
        { name: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn cầu Cần Thơ, Cái Răng, Cần Thơ', type: 'start' },
        { name: 'Cầu Mỹ Thuận', address: 'Vĩnh Long', type: 'waypoint' },
        { name: 'Trạm dừng chân Minh Phát', address: 'Tiền Giang', type: 'waypoint' },
        { name: 'Bến Xe Miền Tây (Đích)', address: '395 Kinh Dương Vương, Bình Tân, TP.HCM', type: 'end' }
      ]
    });

    console.log('Created Routes.');

    // 2.2 Seed Buses
    const b1 = await Bus.create({
      plateNumber: '51B-016.16',
      type: 'Xe Ghế Ngồi 16 Chỗ',
      totalSeats: 16,
      amenities: ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh'],
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80']
    });

    const b2 = await Bus.create({
      plateNumber: '51B-029.29',
      type: 'Xe Ghế Ngồi 29 Chỗ',
      totalSeats: 29,
      amenities: ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh'],
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80']
    });

    const b3 = await Bus.create({
      plateNumber: '51B-045.45',
      type: 'Xe Ghế Ngồi 45 Chỗ',
      totalSeats: 45,
      amenities: ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh'],
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80']
    });

    const b4 = await Bus.create({
      plateNumber: '51B-009.09',
      type: 'Limousine Ghế Ngồi 9 Chỗ',
      totalSeats: 9,
      amenities: ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh', 'Sạc điện thoại'],
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80']
    });

    const b5 = await Bus.create({
      plateNumber: '51B-044.44',
      type: 'Xe Giường Nằm 44 Chỗ',
      totalSeats: 44,
      amenities: ['Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh', 'Gối nằm', 'Chăn đắp'],
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80']
    });

    console.log('Created Buses.');

    // Seed Base Prices for all combinations of Route + Bus Type
    const basePrices = [
      // Route r1 (HCM -> Da Lat)
      { routeId: r1._id, routeName: `${r1.startPoint} → ${r1.endPoint}`, busType: b5.type, price: 400000, createdAt: new Date(), updatedAt: new Date() },
      { routeId: r1._id, routeName: `${r1.startPoint} → ${r1.endPoint}`, busType: b2.type, price: 220000, createdAt: new Date(), updatedAt: new Date() },
      { routeId: r1._id, routeName: `${r1.startPoint} → ${r1.endPoint}`, busType: b3.type, price: 200000, createdAt: new Date(), updatedAt: new Date() },
      { routeId: r1._id, routeName: `${r1.startPoint} → ${r1.endPoint}`, busType: b4.type, price: 350000, createdAt: new Date(), updatedAt: new Date() },
      
      // Route r2 (HCM -> Can Tho)
      { routeId: r2._id, routeName: `${r2.startPoint} → ${r2.endPoint}`, busType: b5.type, price: 165000, createdAt: new Date(), updatedAt: new Date() },
      { routeId: r2._id, routeName: `${r2.startPoint} → ${r2.endPoint}`, busType: b1.type, price: 150000, createdAt: new Date(), updatedAt: new Date() },
      
      // Route r3 (Da Lat -> HCM)
      { routeId: r3._id, routeName: `${r3.startPoint} → ${r3.endPoint}`, busType: b5.type, price: 400000, createdAt: new Date(), updatedAt: new Date() },

      // Route r4 (Can Tho -> HCM)
      { routeId: r4._id, routeName: `${r4.startPoint} → ${r4.endPoint}`, busType: b5.type, price: 165000, createdAt: new Date(), updatedAt: new Date() },
      { routeId: r4._id, routeName: `${r4.startPoint} → ${r4.endPoint}`, busType: b1.type, price: 150000, createdAt: new Date(), updatedAt: new Date() },
    ];

    await mongoose.connection.collection('baseprices').insertMany(basePrices);
    console.log('Seeded Base Prices.');

    // 2.3 Seed Trips
    const today = new Date();
    const getDateAt = (daysFromToday, hours, minutes) => {
      const d = new Date(today);
      d.setDate(today.getDate() + daysFromToday);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    // Dedicated 1-Bus 1-Team Staff Assignment Pairs:
    const teamB1 = { driver: { name: 'Tài xế An Bình', phone: '0933333333' }, assistant: { name: 'Phạm Quốc Bảo', phone: '0944444444' } }; // Bus 51B-016.16 (Cần Thơ)
    const teamB2 = { driver: { name: 'Trần Minh Tâm', phone: '0987654321' }, assistant: { name: 'Hoàng Văn Tuấn', phone: '0966666666' } }; // Bus 51B-029.29 (Đà Lạt)
    const teamB3 = { driver: { name: 'Nguyễn Văn Hùng', phone: '0912345678' }, assistant: { name: 'Đỗ Đức Mạnh', phone: '0955555555' } }; // Bus 51B-045.45 (Đà Lạt)
    const teamB4 = { driver: { name: 'Lê Hoàng Nam', phone: '0909090909' }, assistant: { name: 'Nguyễn Tiến Dũng', phone: '0977889900' } }; // Bus 51B-009.09 (Đà Lạt Limo)
    const teamB5 = { driver: { name: 'Nguyễn Văn An', phone: '0912999999' }, assistant: { name: 'Bùi Hữu Nghĩa', phone: '0967890123' } }; // Bus 51B-044.44 (Đà Lạt Giường Nằm)

    // Seed trips for -30 days to +90 days (3-4 full months of identical weekly schedules with clean Outbound -> Return pairings)
    const customerList = [
      { name: 'Nguyễn Văn Khách', email: 'khach1@gmail.com', phone: '0901234567', id: customer1Id },
      { name: 'Trần Thị Khách', email: 'khach2@gmail.com', phone: '0902345678', id: customer2Id },
      { name: 'Phạm Văn Minh', email: 'minh.pham@gmail.com', phone: '0918112233', id: customer1Id },
      { name: 'Lê Thi Hoài', email: 'hoai.le@gmail.com', phone: '0937445566', id: customer2Id },
      { name: 'Hoàng Anh Tuấn', email: 'tuan.hoang@gmail.com', phone: '0982778899', id: customer1Id }
    ];

    let globalOrderCode = 100001;

    for (let i = -30; i <= 90; i++) {
      const targetDate = getDateAt(i, 0, 0);
      const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
      
      // FIXED WEEKLY SCHEDULE MATRIX:
      // Group A (Bus 2 & Bus 4): Mon (1), Wed (3), Fri (5), Sun (0) -> Outbound (HCM -> Đà Lạt); Tue, Thu, Sat -> Return (Đà Lạt -> HCM)
      // Group B (Bus 3 & Bus 5): Mon (1), Wed (3), Fri (5), Sun (0) -> Return (Đà Lạt -> HCM); Tue, Thu, Sat -> Outbound (HCM -> Đà Lạt)
      // This ensures EVERY DAY has BOTH Outbound and Return trips, and EVERY driver/attendant team has a clean Outbound -> Return shift pairing!
      const isGroupAOutbound = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5 || dayOfWeek === 0;
      const shouldSeedReviews = Math.abs(i) <= 3;

      // --- BUS 1: 51B-016.16 (Tuyến HCM ⇄ Cần Thơ, chạy cả Lượt đi 09:30 & Lượt về 14:30 HÀNG NGÀY) ---
      const t_b1_out = await Trip.create({
        routeId: r2._id,
        busId: b1._id,
        departureTime: getDateAt(i, 9, 30),
        arrivalTime: getDateAt(i, 12, 30),
        price: 150000,
        pickupPoints: [{ time: '09:30', location: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, Hồ Chí Minh' }],
        dropoffPoints: [{ time: '12:30', location: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn cầu Cần Thơ, Cần Thơ' }],
        bookedSeats: [],
        ratings: { average: 4.6, count: 16 },
        ...teamB1
      });
      if (shouldSeedReviews) await seedReviewsForTrip(t_b1_out._id);

      const t_b1_ret = await Trip.create({
        routeId: r4._id,
        busId: b1._id,
        departureTime: getDateAt(i, 14, 30),
        arrivalTime: getDateAt(i, 17, 30),
        price: 150000,
        pickupPoints: [{ time: '14:30', location: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn cầu Cần Thơ, Cần Thơ' }],
        dropoffPoints: [{ time: '17:30', location: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, Hồ Chí Minh' }],
        bookedSeats: [],
        ratings: { average: 4.7, count: 18 },
        ...teamB1
      });
      if (shouldSeedReviews) await seedReviewsForTrip(t_b1_ret._id);

      // --- BUS 2: 51B-029.29 (Tuyến HCM ⇄ Đà Lạt, 29 chỗ) [Team B2] ---
      let t_b2;
      if (isGroupAOutbound) {
        // Lượt đi: HCM -> Đà Lạt (06:30 -> 14:00)
        t_b2 = await Trip.create({
          routeId: r1._id,
          busId: b2._id,
          departureTime: getDateAt(i, 6, 30),
          arrivalTime: getDateAt(i, 14, 0),
          price: 220000,
          pickupPoints: [{ time: '06:30', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Tân Bình, Hồ Chí Minh' }],
          dropoffPoints: [{ time: '14:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          bookedSeats: [],
          ratings: { average: 4.5, count: 20 },
          ...teamB2
        });
      } else {
        // Lượt về: Đà Lạt -> HCM (16:00 -> 23:00)
        t_b2 = await Trip.create({
          routeId: r3._id,
          busId: b2._id,
          departureTime: getDateAt(i, 16, 0),
          arrivalTime: getDateAt(i, 23, 0),
          price: 220000,
          pickupPoints: [{ time: '16:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          dropoffPoints: [{ time: '23:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Tân Bình, Hồ Chí Minh' }],
          bookedSeats: [],
          ratings: { average: 4.6, count: 25 },
          ...teamB2
        });
      }
      if (shouldSeedReviews) await seedReviewsForTrip(t_b2._id);

      // --- BUS 4: 51B-009.09 (Limousine HCM ⇄ Đà Lạt, 9 chỗ) [Team B4] ---
      let t_b4;
      if (isGroupAOutbound) {
        // Lượt đi: HCM -> Đà Lạt (08:00 -> 15:00)
        t_b4 = await Trip.create({
          routeId: r1._id,
          busId: b4._id,
          departureTime: getDateAt(i, 8, 0),
          arrivalTime: getDateAt(i, 15, 0),
          price: 350000,
          pickupPoints: [{ time: '08:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }],
          dropoffPoints: [{ time: '15:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          bookedSeats: [],
          ratings: { average: 4.9, count: 9 },
          ...teamB4
        });
      } else {
        // Lượt về: Đà Lạt -> HCM (13:00 -> 20:00)
        t_b4 = await Trip.create({
          routeId: r3._id,
          busId: b4._id,
          departureTime: getDateAt(i, 13, 0),
          arrivalTime: getDateAt(i, 20, 0),
          price: 350000,
          pickupPoints: [{ time: '13:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          dropoffPoints: [{ time: '20:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }],
          bookedSeats: [],
          ratings: { average: 4.8, count: 9 },
          ...teamB4
        });
      }
      if (shouldSeedReviews) await seedReviewsForTrip(t_b4._id);

      // --- BUS 3: 51B-045.45 (Tuyến HCM ⇄ Đà Lạt, 45 chỗ) [Team B3] ---
      let t_b3;
      if (!isGroupAOutbound) {
        // Lượt đi: HCM -> Đà Lạt (12:00 -> 19:00)
        t_b3 = await Trip.create({
          routeId: r1._id,
          busId: b3._id,
          departureTime: getDateAt(i, 12, 0),
          arrivalTime: getDateAt(i, 19, 0),
          price: 200000,
          pickupPoints: [{ time: '12:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }],
          dropoffPoints: [{ time: '19:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          bookedSeats: [],
          ratings: { average: 4.4, count: 30 },
          ...teamB3
        });
      } else {
        // Lượt về: Đà Lạt -> HCM (12:00 -> 19:00)
        t_b3 = await Trip.create({
          routeId: r3._id,
          busId: b3._id,
          departureTime: getDateAt(i, 12, 0),
          arrivalTime: getDateAt(i, 19, 0),
          price: 200000,
          pickupPoints: [{ time: '12:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          dropoffPoints: [{ time: '19:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }],
          bookedSeats: [],
          ratings: { average: 4.5, count: 32 },
          ...teamB3
        });
      }
      if (shouldSeedReviews) await seedReviewsForTrip(t_b3._id);

      // --- BUS 5: 51B-044.44 (Giường Nằm Đêm HCM ⇄ Đà Lạt, 44 chỗ) [Team B5] ---
      let t_b5;
      if (!isGroupAOutbound) {
        // Lượt đi: HCM -> Đà Lạt (23:00 -> 06:00 hôm sau)
        t_b5 = await Trip.create({
          routeId: r1._id,
          busId: b5._id,
          departureTime: getDateAt(i, 23, 0),
          arrivalTime: getDateAt(i + 1, 6, 0),
          price: 400000,
          pickupPoints: [{ time: '23:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }],
          dropoffPoints: [{ time: '06:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          bookedSeats: [],
          ratings: { average: 4.8, count: 44 },
          ...teamB5
        });
      } else {
        // Lượt về: Đà Lạt -> HCM (22:30 -> 05:30 hôm sau)
        t_b5 = await Trip.create({
          routeId: r3._id,
          busId: b5._id,
          departureTime: getDateAt(i, 22, 30),
          arrivalTime: getDateAt(i + 1, 5, 30),
          price: 400000,
          pickupPoints: [{ time: '22:30', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
          dropoffPoints: [{ time: '05:30', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }],
          bookedSeats: [],
          ratings: { average: 4.9, count: 40 },
          ...teamB5
        });
      }
      if (shouldSeedReviews) await seedReviewsForTrip(t_b5._id);

      // Seed Sales Bookings for past days (i <= 0) to provide realistic 3-month sales/revenue data
      if (i <= 0) {
        const sampleTrips = [t_b1_out, t_b1_ret, t_b2, t_b3, t_b4, t_b5];
        for (const tripObj of sampleTrips) {
          const bookedCount = Math.floor(Math.random() * 5) + 2; // 2 to 6 booked seats per trip
          const seatNumbers = Array.from({ length: bookedCount }, (_, idx) => `A0${idx + 1}`);
          tripObj.bookedSeats = seatNumbers;
          await tripObj.save();

          const cust = customerList[Math.abs(i) % customerList.length];
          const ticketPrice = tripObj.price || 150000;
          await Booking.create({
            tripId: tripObj._id,
            userId: cust.id,
            seats: seatNumbers,
            pickup: tripObj.pickupPoints[0]?.location || 'Bến xe',
            dropoff: tripObj.dropoffPoints[0]?.location || 'Bến xe',
            status: 'paid',
            customerName: cust.name,
            customerPhone: cust.phone,
            customerBirthYear: 1992,
            customerCCCD: '123456789012',
            customerEmail: cust.email,
            paymentType: 'immediate',
            pricePerSeat: ticketPrice,
            totalAmount: ticketPrice * seatNumbers.length,
            paymentMethod: (globalOrderCode % 3 === 0) ? 'vietqr' : 'cash',
            orderCode: globalOrderCode++
          });
        }
      }
    }

    // Seed Real ShiftSessions linked to real Bookings
    const allBookings = await Booking.find({}).lean();
    const ticketAgentUser = staffIds['ticket@anbinhlines.vn'];
    const ticketManagerUser = staffIds['ticket_manager@anbinhlines.vn'];

    if (ticketAgentUser && allBookings.length > 0) {
      const bBatch1 = allBookings.slice(0, 15);
      const bBatch2 = allBookings.slice(15, 27);
      const bBatchActive = allBookings.slice(27, 35);

      const calcShiftRev = (batch) => {
        let cash = 0;
        let cashless = 0;
        batch.forEach(b => {
          const amt = b.totalAmount || (b.pricePerSeat || 150000) * (b.seats?.length || 1);
          if (b.paymentMethod === 'vietqr') cashless += amt;
          else cash += amt;
        });
        return { cash, cashless };
      };

      const rev1 = calcShiftRev(bBatch1);
      const rev2 = calcShiftRev(bBatch2);
      const revActive = calcShiftRev(bBatchActive);

      const nowTime = new Date();
      const todayDate = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());

      const ticketAgentDl = staffIds['ticket_dl@anbinhlines.vn'];
      const ticketManagerDl = staffIds['ticket_manager_dl@anbinhlines.vn'];

      await ShiftSession.create([
        {
          userId: ticketAgentUser,
          counterNumber: 'Văn phòng Sài Gòn (BXMĐ) - Quầy số 1',
          startTime: new Date(todayDate.getTime() + 7 * 3600 * 1000),
          endTime: null,
          initialCash: 1000000,
          cashRevenue: revActive.cash,
          cashlessRevenue: revActive.cashless,
          ticketsSold: bBatchActive.map(b => b._id),
          status: 'active',
          branchId: 'sg',
          officeName: 'Văn phòng Sài Gòn (BXMĐ)',
          reconciliationStatus: 'pending',
          notes: 'Ca trực mở bán sáng hôm nay. Quầy phục vụ khách tuyến Sài Gòn đi Đà Lạt và Cần Thơ.'
        },
        {
          userId: ticketManagerUser,
          counterNumber: 'Văn phòng Sài Gòn (BXMĐ) - Quầy Giám sát',
          startTime: new Date(todayDate.getTime() + 7 * 3600 * 1000),
          endTime: null,
          initialCash: 2000000,
          cashRevenue: 0,
          cashlessRevenue: 0,
          ticketsSold: [],
          status: 'active',
          branchId: 'sg',
          officeName: 'Văn phòng Sài Gòn (BXMĐ)',
          reconciliationStatus: 'pending',
          notes: 'Quản lý trực ca điều hành chi nhánh TP.HCM, đối soát quỹ thu ngân ngày hôm nay.'
        },
        {
          userId: ticketAgentUser,
          counterNumber: 'Văn phòng Sài Gòn (BXMĐ) - Quầy số 1',
          startTime: new Date(todayDate.getTime() - 24 * 3600 * 1000 + 7 * 3600 * 1000),
          endTime: new Date(todayDate.getTime() - 24 * 3600 * 1000 + 15 * 3600 * 1000 + 30 * 60 * 1000),
          initialCash: 1000000,
          cashRevenue: rev1.cash,
          cashlessRevenue: rev1.cashless,
          ticketsSold: bBatch1.map(b => b._id),
          status: 'closed',
          branchId: 'sg',
          officeName: 'Văn phòng Sài Gòn (BXMĐ)',
          reconciliationStatus: 'verified',
          reconciledBy: ticketManagerUser,
          reconciledAt: new Date(todayDate.getTime() - 24 * 3600 * 1000 + 16 * 3600 * 1000),
          notes: `Chốt ca đối soát đủ ${bBatch1.length} vé bán khớp 100% hóa đơn. Đã nộp tiền mặt cho thủ quỹ chi nhánh.`
        },
        {
          userId: ticketAgentDl || ticketAgentUser,
          counterNumber: 'Văn phòng Đà Lạt (BX Liên Tỉnh) - Quầy số 1',
          startTime: new Date(todayDate.getTime() - 24 * 3600 * 1000 + 8 * 3600 * 1000),
          endTime: new Date(todayDate.getTime() - 24 * 3600 * 1000 + 16 * 3600 * 1000 + 30 * 60 * 1000),
          initialCash: 1000000,
          cashRevenue: rev2.cash,
          cashlessRevenue: rev2.cashless,
          ticketsSold: bBatch2.map(b => b._id),
          status: 'closed',
          branchId: 'dl',
          officeName: 'Văn phòng Đà Lạt (BX Liên Tỉnh)',
          reconciliationStatus: 'verified',
          reconciledBy: ticketManagerDl || ticketManagerUser,
          reconciledAt: new Date(todayDate.getTime() - 24 * 3600 * 1000 + 17 * 3600 * 1000),
          notes: `Ca trực chi nhánh Đà Lạt. Đã nộp tiền mặt cho quản lý phòng vé Đà Lạt.`
        }
      ]);
      console.log('Seeded realistic ShiftSessions with real bookings.');
    }

    // Seed generic approval requests (LeaveRequest model)
    const mockLeaves = [
      {
        userId: staffIds['driver1@anbinhlines.vn'],
        type: 'leave',
        typeName: 'Đơn xin nghỉ phép',
        details: 'Nghỉ từ 29/08/2026 đến 30/08/2026. Lý do: Giải quyết việc gia đình ở quê.',
        startDate: new Date('2026-08-29T00:00:00.000Z'),
        endDate: new Date('2026-08-30T00:00:00.000Z'),
        reason: 'Giải quyết việc gia đình ở quê.',
        status: 'pending'
      },
      {
        userId: staffIds['driver2@anbinhlines.vn'],
        type: 'leave',
        typeName: 'Đơn xin nghỉ phép',
        details: 'Nghỉ từ 10/08/2026 đến 12/08/2026. Lý do: Bận việc cá nhân.',
        startDate: new Date('2026-08-10T00:00:00.000Z'),
        endDate: new Date('2026-08-12T00:00:00.000Z'),
        reason: 'Bận việc cá nhân.',
        status: 'approved'
      },
      {
        userId: staffIds['ticket@anbinhlines.vn'],
        type: 'leave',
        typeName: 'Đơn xin nghỉ phép',
        details: 'Nghỉ từ 25/08/2026 đến 26/08/2026. Lý do: Nghỉ khám bệnh định kỳ.',
        startDate: new Date('2026-08-25T00:00:00.000Z'),
        endDate: new Date('2026-08-26T00:00:00.000Z'),
        reason: 'Nghỉ khám bệnh định kỳ.',
        status: 'pending'
      },
      {
        userId: staffIds['driver1@anbinhlines.vn'],
        type: 'maintenance',
        typeName: 'Đề xuất bảo trì xe',
        details: 'Yêu cầu thay dầu nhớt định kỳ & má phanh trước cho xe giường nằm 51B-044.44.',
        status: 'pending'
      },
      {
        userId: staffIds['attendant1@anbinhlines.vn'],
        type: 'incident',
        typeName: 'Báo cáo sự cố lộ trình',
        details: 'Hỏng lốp xe giữa chặng tại Madagui, đề xuất chi phí vá vỏ xe 200,000đ.',
        status: 'pending'
      }
    ];

    for (const request of mockLeaves) {
      if (request.userId) {
        await LeaveRequest.create(request);
      }
    }

    // Seed WorkSchedules for all operational staff (8h/day fixed shift)
    const allUsers = await mongoose.connection.collection('users').find({}).toArray();
    const opsStaff = allUsers.filter(u => u.role !== 'customer');

    for (let day = -30; day <= 60; day++) {
      const scheduleDate = getDateAt(day, 0, 0);
      for (const staffUser of opsStaff) {
        await WorkSchedule.create({
          userId: staffUser._id,
          userName: staffUser.name,
          userRole: staffUser.role,
          date: scheduleDate,
          shiftType: 'full_day',
          shiftName: 'Ca Hành Chính 8h',
          startTime: '08:00',
          endTime: '17:00',
          workHours: 8,
          salaryType: 'Lương cố định tháng',
          status: 'present',
          notes: 'Lịch cố định 8 tiếng/ngày (Sáng 08:00-12:00, Chiều 13:00-17:00). Lương cố định tháng.'
        });
      }
    }
    console.log('Seeded WorkSchedules for all operational staff.');

    console.log('Successfully seeded all Route, Bus, Trip, Review, Booking and WorkSchedule data!');
  } catch (error) {
    console.error('Error seeding DB:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedDB();

