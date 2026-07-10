const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define connection URI (Docker port 27018 or local fallback)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

// ----------------------------------------
// 1. SCHEMAS
// ----------------------------------------

const RouteSchema = new mongoose.Schema({
  startPoint: { type: String, required: true },
  endPoint: { type: String, required: true },
  distance: { type: String, required: true },
  duration: { type: String, required: true }
}, { timestamps: true });

const BusSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, unique: true },
  type: { type: String, required: true }, // e.g. Limousine 22 Phòng (WC)
  totalSeats: { type: Number, required: true },
  amenities: [{ type: String }],
  images: [{ type: String }]
}, { timestamps: true });

const TripSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  price: { type: Number, required: true },
  pickupPoints: [{
    time: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true }
  }],
  dropoffPoints: [{
    time: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true }
  }],
  bookedSeats: [{ type: String }],
  ratings: {
    average: { type: Number, default: 5.0 },
    count: { type: Number, default: 0 }
  },
  policy: {
    cancellation: { type: String, default: 'Yêu cầu hủy vé trước 24 giờ so với giờ khởi hành để được hoàn 100% tiền vé. Hủy vé trong vòng 24 giờ không được hoàn tiền.' },
    luggage: { type: String, default: 'Hành khách được mang theo tối đa 20kg hành lý ký gửi miễn phí. Không mang động vật nuôi hoặc các chất cấm lên xe.' }
  }
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true }
}, { timestamps: true });

const BookingSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  userId: { type: String, required: true },
  seats: [{ type: String, required: true }],
  pickup: { type: String, required: true },
  dropoff: { type: String, required: true },
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'paid' }
}, { timestamps: true });

const Route = mongoose.model('Route', RouteSchema);
const Bus = mongoose.model('Bus', BusSchema);
const Trip = mongoose.model('Trip', TripSchema);
const Review = mongoose.model('Review', ReviewSchema);
const Booking = mongoose.model('Booking', BookingSchema);

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
    console.log('Cleared all existing Route, Bus, Trip, Review and Booking data.');

    // ========================================
    // Seed Tài Khoản Hệ Thống (All Roles)
    // Mật khẩu mặc định: 123456
    // ========================================
    try {
      const hashedPassword = await bcrypt.hash('123456', 10);

      const systemUsers = [
        {
          name: 'Quản Lý Xe Á Đông',
          email: 'fleet@smartbus.vn',
          phone: '0988888888',
          role: 'fleet_manager',
        },
        {
          name: 'Quản Lý Vận Tải Á Đông',
          email: 'ops@smartbus.vn',
          phone: '0977777777',
          role: 'ops_manager',
        },
        {
          name: 'Giám Đốc Á Đông',
          email: 'director@smartbus.vn',
          phone: '0966666666',
          role: 'general_manager',
        },
        {
          name: 'Quản Trị Viên Hệ Thống',
          email: 'admin@smartbus.vn',
          phone: '0955555555',
          role: 'admin',
        },
        {
          name: 'Nhân Viên Bán Vé',
          email: 'ticket@smartbus.vn',
          phone: '0944444444',
          role: 'ticket_agent',
        },
        {
          name: 'Tài Xế Nguyễn Văn A',
          email: 'driver@smartbus.vn',
          phone: '0933333333',
          role: 'driver',
        }
      ];

      // Remove old system accounts (keep customer accounts untouched)
      const systemRoles = ['fleet_manager', 'ops_manager', 'general_manager', 'admin', 'ticket_agent', 'driver'];
      await mongoose.connection.collection('users').deleteMany({ role: { $in: systemRoles } });

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

      console.log('');
      console.log('===== TÀI KHOẢN HỆ THỐNG (mật khẩu: 123456) =====');
      console.log('fleet_manager   -> SĐT: 0988888888');
      console.log('ops_manager     -> SĐT: 0977777777');
      console.log('general_manager -> SĐT: 0966666666');
      console.log('admin           -> SĐT: 0955555555');
      console.log('ticket_agent    -> SĐT: 0944444444');
      console.log('driver          -> SĐT: 0933333333');
      console.log('===================================================');
      console.log('');
    } catch (userErr) {
      console.error('Error seeding system users:', userErr);
    }


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

    console.log('Created Routes.');

    // 2.2 Seed Buses
    const b1 = await Bus.create({
      plateNumber: '49B-022.22',
      type: 'Limousine 22 Phòng (WC)',
      totalSeats: 22,
      amenities: [
        'Tivi LED', 'Toilet', 'Sạc điện thoại', 'Đèn đọc sách', 'Rèm cửa',
        'Chăn đắp', 'Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh', 'Gối nằm',
        'Búa phá kính'
      ],
      images: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80'
      ]
    });

    const b2 = await Bus.create({
      plateNumber: '51B-123.45',
      type: 'Limousine 34 Giường',
      totalSeats: 34,
      amenities: [
        'Sạc điện thoại', 'Wifi', 'Nước uống', 'Điều hòa', 'Khăn lạnh', 'Gối nằm'
      ],
      images: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
      ]
    });

    console.log('Created Buses.');

    // 2.3 Seed Trips
    const today = new Date();
    const getDateAt = (daysFromToday, hours, minutes) => {
      const d = new Date(today);
      d.setDate(today.getDate() + daysFromToday);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    // We will seed trips for today, tomorrow and the next 5 days
    for (let i = 0; i < 7; i++) {
      // Trip 1: HCM to Da Lat - Limousine 22
      const t1 = await Trip.create({
        routeId: r1._id,
        busId: b1._id,
        departureTime: getDateAt(i, 23, 0), // 23:00
        arrivalTime: getDateAt(i + 1, 6, 50), // 06:50 next day
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
        ratings: {
          average: 4.7,
          count: 44
        }
      });
      await seedReviewsForTrip(t1._id);

      // Seed bookings dynamically for t1
      await Booking.create({
        tripId: t1._id,
        userId: 'user_mock_1',
        seats: ['A1', 'A3'],
        pickup: 'Văn Phòng Tân Bình',
        dropoff: 'Văn Phòng Đà Lạt',
        status: 'paid'
      });
      await Booking.create({
        tripId: t1._id,
        userId: 'user_mock_2',
        seats: ['B5'],
        pickup: 'Văn Phòng Thủ Đức',
        dropoff: 'Di Linh',
        status: 'paid'
      });

      // Trip 2: HCM to Da Lat - Limousine 34
      const t2 = await Trip.create({
        routeId: r1._id,
        busId: b2._id,
        departureTime: getDateAt(i, 8, 0), // 08:00
        arrivalTime: getDateAt(i, 15, 30), // 15:30 same day
        price: 290000,
        pickupPoints: [
          { time: '08:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' },
          { time: '08:45', location: 'Bến Xe Miền Đông Mới', address: '501 Hoàng Hữu Nam, Long Thạnh Mỹ, Quận 9, Hồ Chí Minh' }
        ],
        dropoffPoints: [
          { time: '14:00', location: 'Bảo Lộc', address: 'Trần Phú, Bảo Lộc, Lâm Đồng' },
          { time: '15:30', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }
        ],
        bookedSeats: [],
        ratings: {
          average: 4.5,
          count: 22
        }
      });
      await seedReviewsForTrip(t2._id);

      // Seed bookings dynamically for t2
      await Booking.create({
        tripId: t2._id,
        userId: 'user_mock_3',
        seats: ['A5', 'A7'],
        pickup: 'Văn Phòng Tân Bình',
        dropoff: 'Văn Phòng Đà Lạt',
        status: 'paid'
      });
      await Booking.create({
        tripId: t2._id,
        userId: 'user_mock_4',
        seats: ['A11'],
        pickup: 'Bến Xe Miền Đông Mới',
        dropoff: 'Bảo Lộc',
        status: 'paid'
      });

      // Trip 3: HCM to Can Tho - Limousine 34
      const t3 = await Trip.create({
        routeId: r2._id,
        busId: b2._id,
        departureTime: getDateAt(i, 13, 0), // 13:00
        arrivalTime: getDateAt(i, 16, 0), // 16:00
        price: 165000,
        pickupPoints: [
          { time: '13:00', location: 'Bến Xe Miền Tây', address: '395 Kinh Dương Vương, An Lạc, Bình Tân, Hồ Chí Minh' }
        ],
        dropoffPoints: [
          { time: '16:00', location: 'Bến Xe Trung Tâm Cần Thơ', address: 'Đường dẫn cầu Cần Thơ, Hưng Thành, Cái Răng, Cần Thơ' }
        ],
        bookedSeats: [],
        ratings: {
          average: 4.6,
          count: 15
        }
      });
      await seedReviewsForTrip(t3._id);

      // Trip 4: Da Lat to HCM - Limousine 22
      const t4 = await Trip.create({
        routeId: r3._id,
        busId: b1._id,
        departureTime: getDateAt(i, 22, 30), // 22:30
        arrivalTime: getDateAt(i + 1, 5, 30), // 05:30 next day
        price: 400000,
        pickupPoints: [
          { time: '22:30', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }
        ],
        dropoffPoints: [
          { time: '04:30', location: 'Văn Phòng Thủ Đức', address: '802-804 Xa Lộ Hà Nội, Hồ Chí Minh' },
          { time: '05:30', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Hồ Chí Minh' }
        ],
        bookedSeats: [],
        ratings: {
          average: 4.8,
          count: 32
        }
      });
      await seedReviewsForTrip(t4._id);

      // Seed bookings dynamically for t4
      await Booking.create({
        tripId: t4._id,
        userId: 'user_mock_5',
        seats: ['A1', 'B1'],
        pickup: 'Văn Phòng Đà Lạt',
        dropoff: 'Văn Phòng Tân Bình',
        status: 'paid'
      });
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
