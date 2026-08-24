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

const mockReviewsList = [
  { userName: "Nguyễn Văn Hùng", rating: 5, comment: "Xe đi rất êm, sạch sẽ, lái xe cẩn thận và đúng giờ. Tôi rất hài lòng." },
  { userName: "Trần Thị Lan", rating: 5, comment: "Nhà xe phục vụ tận tình, có nước uống và khăn lạnh đầy đủ. Wifi căng đét." },
  { userName: "Lê Minh Tuấn", rating: 4, comment: "Xe chất lượng cao, giường nằm thoải mái rộng rãi. Tuy nhiên xe xuất phát hơi trễ 5 phút." },
  { userName: "Phạm Thanh Thảo", rating: 5, comment: "Dịch vụ tuyệt vời. Khoang phòng limousine riêng tư, tivi xem phim rất thích." },
  { userName: "Hoàng Đức Anh", rating: 4, comment: "Giá cả hợp lý so với chất lượng phục vụ. Lần sau sẽ tiếp tục ủng hộ Á Đông." }
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
        name: 'Quản Lý Xe Á Đông',
        email: 'fleet@adongtravel.vn',
        phone: '0988888888',
        role: 'fleet_manager',
      },
      {
        name: 'Quản Lý Vận Tải Á Đông',
        email: 'ops@adongtravel.vn',
        phone: '0977777777',
        role: 'ops_manager',
      },
      {
        name: 'Giám Đốc Á Đông',
        email: 'director@adongtravel.vn',
        phone: '0966555666', // Unique phone for GM
        role: 'general_manager',
      },
      {
        name: 'Quản Trị Viên Hệ Thống',
        email: 'admin@adongtravel.vn',
        phone: '0955555666', // Unique phone for Admin
        role: 'admin',
      },
      {
        name: 'Nhân Viên Bán Vé',
        email: 'ticket@adongtravel.vn',
        phone: '0944555666', // Unique phone for Ticket Agent
        role: 'ticket_agent',
      },
      // Drivers (Tài xế)
      {
        name: 'Tài xế Á Đông',
        email: 'driver1@adongtravel.vn',
        phone: '0933333333',
        role: 'driver',
      },
      {
        name: 'Trần Minh Tâm',
        email: 'driver2@adongtravel.vn',
        phone: '0987654321',
        role: 'driver',
      },
      {
        name: 'Nguyễn Văn Hùng',
        email: 'driver3@adongtravel.vn',
        phone: '0912345678',
        role: 'driver',
      },
      {
        name: 'Lê Hoàng Nam',
        email: 'driver4@adongtravel.vn',
        phone: '0909090909',
        role: 'driver',
      },
      // Attendants (Phụ xe)
      {
        name: 'Phạm Quốc Bảo',
        email: 'attendant1@adongtravel.vn',
        phone: '0944444444',
        role: 'attendant',
      },
      {
        name: 'Hoàng Văn Tuấn',
        email: 'attendant2@adongtravel.vn',
        phone: '0966666666',
        role: 'attendant',
      },
      {
        name: 'Đỗ Đức Mạnh',
        email: 'attendant3@adongtravel.vn',
        phone: '0955555555',
        role: 'attendant',
      },
      {
        name: 'Nguyễn Tiến Dũng',
        email: 'attendant4@adongtravel.vn',
        phone: '0977889900',
        role: 'attendant',
      }
    ];

    // Seed all staff/system users
    for (const u of systemUsers) {
      await mongoose.connection.collection('users').insertOne({
        ...u,
        password: hashedPassword,
        status: 'active',
        points: 150,
        membershipTier: 'Bronze',
        createdAt: new Date(),
        updatedAt: new Date()
      });
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
      duration: '7 giờ 50 phút'
    });

    const r2 = await Route.create({
      startPoint: 'Hồ Chí Minh',
      endPoint: 'Cần Thơ',
      distance: '172km',
      duration: '3 giờ'
    });

    const r3 = await Route.create({
      startPoint: 'Đà Lạt',
      endPoint: 'Hồ Chí Minh',
      distance: '305km',
      duration: '7 giờ'
    });

    const r4 = await Route.create({
      startPoint: 'Cần Thơ',
      endPoint: 'Hồ Chí Minh',
      distance: '172km',
      duration: '3 giờ'
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

    // Staff pairs for assignment:
    const pair1 = { driver: { name: 'Tài xế Á Đông', phone: '0933333333' }, assistant: { name: 'Phạm Quốc Bảo', phone: '0944444444' } };
    const pair2 = { driver: { name: 'Trần Minh Tâm', phone: '0987654321' }, assistant: { name: 'Hoàng Văn Tuấn', phone: '0966666666' } };
    const pair3 = { driver: { name: 'Nguyễn Văn Hùng', phone: '0912345678' }, assistant: { name: 'Đỗ Đức Mạnh', phone: '0955555555' } };
    const pair4 = { driver: { name: 'Lê Hoàng Nam', phone: '0909090909' }, assistant: { name: 'Nguyễn Tiến Dũng', phone: '0977889900' } };
    const pair5 = { driver: { name: 'Nguyễn Văn An', phone: '0912999999' }, assistant: { name: 'Trần Văn Bình', phone: '0988999999' } };

    // We will seed trips for today, tomorrow and the next 5 days
    for (let i = 0; i < 7; i++) {
      // Trip 1: HCM to Da Lat - Xe Giường Nằm 44 Chỗ (23:00)
      const t1 = await Trip.create({
        routeId: r1._id,
        busId: b5._id,
        departureTime: getDateAt(i, 23, 0),
        arrivalTime: getDateAt(i + 1, 6, 50),
        price: 400000,
        pickupPoints: [
          { time: '23:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' },
          { time: '23:40', location: 'Văn Phòng Thủ Đức', address: '802-804 Song Hành Xa Lộ Hà Nội, Hiệp Phú, Quận 9, Hồ Chí Minh' },
          { time: '00:00', location: 'Bến Xe Miền Đông Mới', address: '501 Hoàng Hữu Nam, Long Thạnh Mỹ, Quận 9, Hồ Chí Minh' },
          { time: '00:10', location: 'Ngã 4 Vũng Tàu', address: 'QL1A, Long Bình, Biên Hòa, Đồng Nai' }
        ],
        dropoffPoints: [
          { time: '03:00', location: 'Ngã 3 Madagui', address: 'QL20, Đạ Huoai, Lâm Đồng' },
          { time: '04:00', location: 'Coop Mart Bảo Lộc', address: 'Trần Phú, Phường 2, Bảo Lộc, Lâm Đồng' },
          { time: '05:00', location: 'Di Linh', address: 'QL20, Di Linh, Lâm Đồng' },
          { time: '05:30', location: 'Ngã ba Liên Khương', address: 'QL20, Đức Trọng, Lâm Đồng' },
          { time: '06:50', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }
        ],
        bookedSeats: [],
        ratings: { average: 4.7, count: 44 },
        ...pair1
      });
      await seedReviewsForTrip(t1._id);

      // Trip 2: HCM to Da Lat - Xe Giường Nằm 44 Chỗ (08:00)
      const t2 = await Trip.create({
        routeId: r1._id,
        busId: b5._id,
        departureTime: getDateAt(i, 8, 0),
        arrivalTime: getDateAt(i, 15, 30),
        price: 400000,
        pickupPoints: [
          { time: '08:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' },
          { time: '08:45', location: 'Bến Xe Miền Đông Mới', address: '501 Hoàng Hữu Nam, Long Thạnh Mỹ, Quận 9, Hồ Chí Minh' }
        ],
        dropoffPoints: [
          { time: '14:00', location: 'Bảo Lộc', address: 'Trần Phú, Bảo Lộc, Lâm Đồng' },
          { time: '15:30', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }
        ],
        bookedSeats: [],
        ratings: { average: 4.5, count: 22 },
        ...pair4
      });
      await seedReviewsForTrip(t2._id);

      // Trip 3: Can Tho to HCM - Xe Ghế Ngồi 16 Chỗ (14:30)
      const t3 = await Trip.create({
        routeId: r4._id,
        busId: b1._id,
        departureTime: getDateAt(i, 14, 30),
        arrivalTime: getDateAt(i, 17, 30),
        price: 150000,
        pickupPoints: [
          { time: '14:30', location: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn cầu Cần Thơ, Hưng Thành, Cái Răng, Cần Thơ' }
        ],
        dropoffPoints: [
          { time: '17:30', location: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, An Lạc, Bình Tân, Hồ Chí Minh' }
        ],
        bookedSeats: [],
        ratings: { average: 4.6, count: 15 },
        ...pair3
      });
      await seedReviewsForTrip(t3._id);

      // Trip 4: Da Lat to HCM - Xe Giường Nằm 44 Chỗ (22:30)
      const t4 = await Trip.create({
        routeId: r3._id,
        busId: b5._id,
        departureTime: getDateAt(i, 22, 30),
        arrivalTime: getDateAt(i + 1, 5, 30),
        price: 400000,
        pickupPoints: [
          { time: '22:30', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }
        ],
        dropoffPoints: [
          { time: '04:30', location: 'Văn Phòng Thủ Đức', address: '802-804 Xa Lộ Hà Nội, Hồ Chí Minh' },
          { time: '05:30', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }
        ],
        bookedSeats: [],
        ratings: { average: 4.8, count: 32 },
        ...pair4
      });
      await seedReviewsForTrip(t4._id);

      // Trip 5: HCM to Can Tho - Xe Ghế Ngồi 16 Chỗ (09:30)
      const t5 = await Trip.create({
        routeId: r2._id,
        busId: b1._id,
        departureTime: getDateAt(i, 9, 30),
        arrivalTime: getDateAt(i, 12, 30),
        price: 150000,
        pickupPoints: [{ time: '09:30', location: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, An Lạc, Bình Tân, Hồ Chí Minh' }],
        dropoffPoints: [{ time: '12:30', location: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn cầu Cần Thơ, Hưng Thành, Cái Răng, Cần Thơ' }],
        bookedSeats: [],
        ratings: { average: 4.4, count: 12 },
        ...pair3
      });
      await seedReviewsForTrip(t5._id);

      // Trip 6: HCM to Da Lat - Xe Ghế Ngồi 29 Chỗ (06:30)
      const t6 = await Trip.create({
        routeId: r1._id,
        busId: b2._id,
        departureTime: getDateAt(i, 6, 30),
        arrivalTime: getDateAt(i, 14, 20),
        price: 220000,
        pickupPoints: [{ time: '06:30', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }],
        dropoffPoints: [{ time: '14:20', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
        bookedSeats: [],
        ratings: { average: 4.2, count: 8 },
        ...pair2
      });
      await seedReviewsForTrip(t6._id);

      // Trip 7: HCM to Da Lat - Xe Ghế Ngồi 45 Chỗ (12:00)
      const t7 = await Trip.create({
        routeId: r1._id,
        busId: b3._id,
        departureTime: getDateAt(i, 12, 0),
        arrivalTime: getDateAt(i, 19, 50),
        price: 200000,
        pickupPoints: [{ time: '12:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }],
        dropoffPoints: [{ time: '19:50', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
        bookedSeats: [],
        ratings: { average: 4.1, count: 19 },
        ...pair5
      });
      await seedReviewsForTrip(t7._id);

      // Trip 8: Da Lat to HCM - Xe Ghế Ngồi 29 Chỗ (16:00)
      const t8 = await Trip.create({
        routeId: r3._id,
        busId: b2._id,
        departureTime: getDateAt(i, 16, 0),
        arrivalTime: getDateAt(i, 23, 0),
        price: 220000,
        pickupPoints: [{ time: '16:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
        dropoffPoints: [{ time: '23:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }],
        bookedSeats: [],
        ratings: { average: 4.9, count: 5 },
        ...pair2
      });
      await seedReviewsForTrip(t8._id);

      // Trip 9: Da Lat to HCM - Xe Ghế Ngồi 45 Chỗ (13:00)
      const t9 = await Trip.create({
        routeId: r3._id,
        busId: b3._id,
        departureTime: getDateAt(i, 13, 0),
        arrivalTime: getDateAt(i, 20, 0),
        price: 200000,
        pickupPoints: [{ time: '13:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }],
        dropoffPoints: [{ time: '20:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }],
        bookedSeats: [],
        ratings: { average: 4.5, count: 35 },
        ...pair1
      });
      await seedReviewsForTrip(t9._id);

      // Seed bookings and sync bookedSeats for day 0 (today) and day 1 (tomorrow)
      if (i === 0) {
        // Bookings for t1 (today)
        await Booking.create({
          tripId: t1._id,
          userId: customer1Id,
          seats: ['A01', 'A02'],
          pickup: 'Văn Phòng Tân Bình',
          dropoff: 'Văn Phòng Đà Lạt',
          status: 'paid',
          customerName: 'Nguyễn Văn Khách',
          customerPhone: '0901234567',
          customerBirthYear: 1990,
          customerCCCD: '123456789012',
          customerEmail: 'khach1@gmail.com',
          paymentType: 'immediate',
          orderCode: 100001
        });
        t1.bookedSeats.push('A01', 'A02');
        await t1.save();

        await Booking.create({
          tripId: t1._id,
          userId: customer2Id,
          seats: ['A05'],
          pickup: 'Văn Phòng Tân Bình',
          dropoff: 'Văn Phòng Đà Lạt',
          status: 'pending',
          customerName: 'Trần Thị Khách',
          customerPhone: '0902345678',
          customerBirthYear: 1995,
          customerCCCD: '987654321098',
          customerEmail: 'khach2@gmail.com',
          paymentType: 'later',
          paymentExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          orderCode: 100002
        });
        t1.bookedSeats.push('A05');
        await t1.save();

        // Bookings for t2 (today)
        await Booking.create({
          tripId: t2._id,
          userId: customer1Id,
          seats: ['A03'],
          pickup: 'Văn Phòng Tân Bình',
          dropoff: 'Văn Phòng Đà Lạt',
          status: 'paid',
          customerName: 'Nguyễn Văn Khách',
          customerPhone: '0901234567',
          customerBirthYear: 1990,
          customerCCCD: '123456789012',
          customerEmail: 'khach1@gmail.com',
          paymentType: 'immediate',
          orderCode: 100003
        });
        t2.bookedSeats.push('A03');
        await t2.save();
      } else if (i === 1) {
        // Bookings for t6 (tomorrow)
        await Booking.create({
          tripId: t6._id,
          userId: customer2Id,
          seats: ['01', '02'],
          pickup: 'Văn Phòng Tân Bình',
          dropoff: 'Văn Phòng Đà Lạt',
          status: 'paid',
          customerName: 'Trần Thị Khách',
          customerPhone: '0902345678',
          customerBirthYear: 1995,
          customerCCCD: '987654321098',
          customerEmail: 'khach2@gmail.com',
          paymentType: 'immediate',
          orderCode: 100004
        });
        t6.bookedSeats.push('01', '02');
        await t6.save();
      }
    }

    console.log('Successfully seeded all Route, Bus, Trip, Review and Booking data!');
  } catch (error) {
    console.error('Error seeding DB:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedDB();

