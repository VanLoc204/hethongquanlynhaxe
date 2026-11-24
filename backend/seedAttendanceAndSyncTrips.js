/**
 * Script: seedAttendanceAndSyncTrips.js
 * Nhiệm vụ:
 * 1. Cập nhật trạng thái chuyến xe (Trip): Các chuyến có thời gian trong quá khứ được chuyển sang 'completed' (Hoàn thành)
 *    và gán currentStopIndex ở trạm đích cuối cùng để đồng bộ với màn hình Định vị giám sát và Bảng chấm công.
 * 2. Giữ nguyên 100% dữ liệu Tuyến đường (Route), trạm dừng và tọa độ GPS không đụng chạm.
 * 3. Tạo dữ liệu Chấm công chuẩn chỉnh ĐÚNG GIỜ và HOÀN THÀNH (status: 'closed', punctuality: 'on_time')
 *    cho 100% nhân viên trên hệ thống từ trước tới giờ:
 *    - Tổ lái (Tài xế & Phụ xe): Attendance + CrewAttendance liên kết trực tiếp với các chuyến xe đã chạy.
 *    - Nhân viên bán vé & Quản lý vé: Attendance + AgentAttendance + ShiftSession với đầy đủ quỹ đầu ca,
 *      tiền vé thu được, tiền bàn giao, chênh lệch = 0 (khớp 100%), số vé bán, đối soát verified.
 *    - Khối Quản lý & Điều hành (Ops Manager, Fleet Manager, GM, Admin): Attendance chuẩn ca hành chính.
 */

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/bus_management';

async function run() {
  console.log('--- KẾT NỐI MONGODB ---');
  await mongoose.connect(MONGO_URI);
  console.log('Kết nối thành công tới:', MONGO_URI);

  const User = require('./models/User');
  const EmployeeProfile = require('./models/EmployeeProfile');
  const Trip = require('./models/Trip');
  const Route = require('./models/Route');
  const Bus = require('./models/Bus');
  const Attendance = require('./models/Attendance');
  const CrewAttendance = require('./models/CrewAttendance');
  const AgentAttendance = require('./models/AgentAttendance');
  const ShiftSession = require('./models/ShiftSession');

  // Mốc bắt đầu ngày hôm nay 24/11/2026 giờ VN (UTC: 2026-11-23T17:00:00.000Z)
  const startOf24NovVN = new Date('2026-11-23T17:00:00.000Z');

  // =========================================================================
  // BƯỚC 1: CẬP NHẬT TRẠNG THÁI CÁC CHUYẾN XE (TRIP)
  // =========================================================================
  console.log('\n--- BƯỚC 1: CẬP NHẬT TRẠNG THÁI CHUYẾN XE (TRIPS) ---');
  const allTrips = await Trip.find({}).populate('routeId').populate('busId');
  console.log('Tổng số chuyến xe trong hệ thống:', allTrips.length);

  let completedCount = 0;
  let scheduledCount = 0;

  for (const trip of allTrips) {
    const depTime = new Date(trip.departureTime);
    const arrTime = new Date(trip.arrivalTime);

    const totalStops = (trip.dropoffPoints && trip.dropoffPoints.length > 0)
      ? trip.dropoffPoints.length
      : 5;

    if (depTime < startOf24NovVN) {
      // 1. Chuyến xe diễn ra trước ngày 24/11/2026 -> ĐÃ HOÀN THÀNH
      trip.journeyStatus = 'completed';
      trip.currentStopIndex = totalStops - 1; // Đã tới trạm đích cuối
      
      // Tạo logs hành trình hoàn chỉnh nếu chưa có
      if (!trip.journeyLogs || trip.journeyLogs.length <= 1) {
        trip.journeyLogs = [
          {
            time: depTime,
            location: trip.pickupPoints?.[0]?.location || 'Bến xe xuất phát',
            address: trip.pickupPoints?.[0]?.address || 'Xuất bến đúng giờ',
            desc: 'Xe xuất bến đúng lịch trình, hành khách đã ổn định vị trí.'
          },
          {
            time: new Date(depTime.getTime() + (arrTime.getTime() - depTime.getTime()) * 0.5),
            location: 'Trạm dừng chân dọc tuyến',
            address: 'Trạm nghỉ giữa chặng',
            desc: 'Xe dừng nghỉ ngơi, tiếp nhiên liệu và đối soát an toàn kỹ thuật.'
          },
          {
            time: arrTime,
            location: trip.dropoffPoints?.[trip.dropoffPoints.length - 1]?.location || 'Bến xe đích',
            address: trip.dropoffPoints?.[trip.dropoffPoints.length - 1]?.address || 'Cập bến an toàn',
            desc: 'Chuyến xe đã hoàn thành toàn bộ hành trình. Trả khách an toàn, kết thúc chuyến.'
          }
        ];
      }
      // Điểm đích cuối cùng (Trạm trả cuối của chuyến)
      let destLat = null;
      let destLng = null;
      if (trip.dropoffPoints && trip.dropoffPoints.length > 0) {
        const lastDrop = trip.dropoffPoints[trip.dropoffPoints.length - 1];
        if (lastDrop && typeof lastDrop.lat === 'number') {
          destLat = lastDrop.lat;
          destLng = lastDrop.lng;
        }
      }
      if (!destLat && trip.routeId?.stops && trip.routeId.stops.length > 0) {
        const lastStop = trip.routeId.stops[trip.routeId.stops.length - 1];
        if (lastStop && typeof lastStop.lat === 'number') {
          destLat = lastStop.lat;
          destLng = lastStop.lng;
        }
      }
      if (destLat && destLng) {
        trip.liveGps = {
          lat: destLat,
          lng: destLng,
          speed: 0,
          heading: 0,
          lastUpdated: arrTime,
          isOffRoute: false
        };
      }
      await trip.save();
      completedCount++;
    } else {
      // 2. Chuyến xe từ ngày 24/11/2026 trở đi -> CHỜ XUẤT BẾN ('scheduled')
      // Chỉ khi tài xế bấm "BẮT ĐẦU & PHÁT GPS" trên ứng dụng, chuyến mới sang 'in_transit'
      trip.journeyStatus = 'scheduled';
      trip.currentStopIndex = -1;
      trip.journeyLogs = [];
      const firstStop = (trip.pickupPoints && trip.pickupPoints.length > 0)
        ? trip.pickupPoints[0]
        : null;
      if (firstStop && firstStop.lat && firstStop.lng) {
        trip.liveGps = {
          lat: firstStop.lat,
          lng: firstStop.lng,
          speed: 0,
          heading: 0,
          lastUpdated: depTime,
          isOffRoute: false
        };
      }
      await trip.save();
      scheduledCount++;
    }
  }

  console.log(`Kết quả cập nhật chuyến xe:`);
  console.log(` - Hoàn thành (trước 24/11/2026): ${completedCount} chuyến`);
  console.log(` - Chờ xuất bến (từ 24/11/2026 trở đi): ${scheduledCount} chuyến`);

  // =========================================================================
  // BƯỚC 2: CHUẨN BỊ DANH SÁCH NHÂN SỰ
  // =========================================================================
  console.log('\n--- BƯỚC 2: NẠP DANH SÁCH NHÂN SỰ THEO VAI TRÒ ---');
  const allUsers = await User.find({ status: { $ne: 'inactive' } }).lean();
  
  const drivers = allUsers.filter(u => u.role === 'driver');
  const attendants = allUsers.filter(u => u.role === 'attendant');
  const ticketAgents = allUsers.filter(u => u.role === 'ticket_agent');
  const ticketManagers = allUsers.filter(u => u.role === 'ticket_manager');
  const officeStaff = allUsers.filter(u => 
    ['ops_manager', 'fleet_manager', 'general_manager', 'admin'].includes(u.role)
  );

  console.log(` - Tài xế: ${drivers.length} người`);
  console.log(` - Phụ xe: ${attendants.length} người`);
  console.log(` - Nhân viên bán vé: ${ticketAgents.length} người`);
  console.log(` - Quản lý phòng vé: ${ticketManagers.length} người`);
  console.log(` - Cán bộ Quản lý & Điều hành: ${officeStaff.length} người`);

  // Map số điện thoại với User để liên kết chuyến xe
  const userByPhone = {};
  allUsers.forEach(u => {
    if (u.phone) userByPhone[u.phone] = u;
  });

  // Cập nhật văn phòng làm việc chuẩn cho nhân viên bán vé và quản lý vé
  const officeList = [
    { name: 'Văn phòng Sài Gòn (BXMĐ) - Quầy 01', branchId: 'sg', lat: 10.8204, lng: 106.6378 },
    { name: 'Văn phòng Sài Gòn (BXMT) - Quầy 02', branchId: 'sg', lat: 10.7411, lng: 106.6186 },
    { name: 'Văn phòng Cần Thơ - Quầy 01', branchId: 'ct', lat: 10.0152, lng: 105.7645 },
    { name: 'Văn phòng Đà Lạt - Quầy 01', branchId: 'dl', lat: 11.9404, lng: 108.4583 }
  ];

  for (let i = 0; i < ticketAgents.length; i++) {
    const agent = ticketAgents[i];
    const off = officeList[i % officeList.length];
    await EmployeeProfile.findByIdAndUpdate(agent._id, {
      $set: {
        assignedOffice: off.name,
        branchId: off.branchId,
        faceRegistered: true
      }
    }, { upsert: true });
  }

  for (let i = 0; i < ticketManagers.length; i++) {
    const mgr = ticketManagers[i];
    const off = officeList[i % officeList.length];
    await EmployeeProfile.findByIdAndUpdate(mgr._id, {
      $set: {
        assignedOffice: off.name,
        branchId: off.branchId,
        faceRegistered: true
      }
    }, { upsert: true });
  }

  // =========================================================================
  // BƯỚC 3: DỌN DẸP DỮ LIỆU CHẤM CÔNG CŨ VÀ TẠO MỚI TOÀN DIỆN
  // =========================================================================
  console.log('\n--- BƯỚC 3: DỌN DẸP DỮ LIỆU CHẤM CÔNG VÀ KHỞI TẠO MỚI ---');
  await Attendance.deleteMany({});
  await CrewAttendance.deleteMany({});
  await AgentAttendance.deleteMany({});
  await ShiftSession.deleteMany({});
  console.log('Đã làm sạch toàn bộ bản ghi chấm công cũ để tái tạo dữ liệu chuẩn xác.');

  // =========================================================================
  // BƯỚC 4: TẠO CHẤM CÔNG CHO TỔ LÁI XE (TÀI XẾ & PHỤ XE) THEO CÁC CHUYẾN ĐÃ HOÀN THÀNH
  // =========================================================================
  console.log('\n--- BƯỚC 4: TẠO CHẤM CÔNG CHO TỔ LÁI XE (TÀI XẾ & PHỤ XE) ---');
  const completedTrips = await Trip.find({ journeyStatus: 'completed' })
    .populate('routeId')
    .populate('busId')
    .sort({ departureTime: 1 });

  console.log(`Đang tạo dữ liệu chấm công cho ${completedTrips.length} chuyến xe đã hoàn thành...`);

  let crewAttCount = 0;

  for (const trip of completedTrips) {
    const depTime = new Date(trip.departureTime);
    const arrTime = new Date(trip.arrivalTime);
    const tripDate = new Date(depTime);
    tripDate.setUTCHours(0, 0, 0, 0);

    const routeName = trip.routeId 
      ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}`
      : 'Tuyến liên tỉnh';

    const busPlate = trip.busId?.plateNumber || 'Xe khách';
    const kmDistance = parseFloat(String(trip.routeId?.distance || '172').replace(/[^0-9.]/g, '')) || 172;

    // Tìm tài xế
    let driverUser = trip.driver?.phone ? userByPhone[trip.driver.phone] : null;
    if (!driverUser && drivers.length > 0) {
      driverUser = drivers[crewAttCount % drivers.length];
    }

    // Tìm phụ xe
    let attendantUser = trip.assistant?.phone ? userByPhone[trip.assistant.phone] : null;
    if (!attendantUser && attendants.length > 0) {
      attendantUser = attendants[crewAttCount % attendants.length];
    }

    // 1. Chấm công cho Tài xế
    if (driverUser) {
      // Check-in đúng giờ: trước giờ xuất phát 20 - 30 phút
      const driverCheckIn = new Date(depTime.getTime() - (25 + (crewAttCount % 6)) * 60 * 1000);
      // Check-out hoàn thành: sau giờ cập bến 15 - 25 phút
      const driverCheckOut = new Date(arrTime.getTime() + (18 + (crewAttCount % 5)) * 60 * 1000);
      const totalHours = Math.round(((driverCheckOut - driverCheckIn) / 3600000) * 10) / 10;

      const attDriver = new Attendance({
        userId: driverUser._id,
        date: tripDate,
        checkInTime: driverCheckIn,
        checkOutTime: driverCheckOut,
        totalHours,
        status: 'closed',
        attendanceType: 'crew',
        faceVerified: true,
        faceDistance: +(0.20 + (crewAttCount % 10) * 0.01).toFixed(2),
        isLiveVerified: true,
        gpsLat: trip.pickupPoints?.[0]?.lat || 10.8204,
        gpsLng: trip.pickupPoints?.[0]?.lng || 106.6378,
        note: `Chấm công hoàn thành chuyến xe ${routeName} (Biển số: ${busPlate})`
      });
      await attDriver.save();

      const crewDriver = new CrewAttendance({
        attendanceId: attDriver._id,
        tripId: trip._id,
        busId: trip.busId?._id || trip.busId,
        roleInTrip: 'driver_main',
        punctuality: 'on_time',
        actualDeparture: depTime,
        actualArrival: arrTime,
        actualKm: kmDistance
      });
      await crewDriver.save();
    }

    // 2. Chấm công cho Phụ xe
    if (attendantUser) {
      const attCheckIn = new Date(depTime.getTime() - (22 + (crewAttCount % 5)) * 60 * 1000);
      const attCheckOut = new Date(arrTime.getTime() + (20 + (crewAttCount % 6)) * 60 * 1000);
      const totalHours = Math.round(((attCheckOut - attCheckIn) / 3600000) * 10) / 10;

      const attAttendant = new Attendance({
        userId: attendantUser._id,
        date: tripDate,
        checkInTime: attCheckIn,
        checkOutTime: attCheckOut,
        totalHours,
        status: 'closed',
        attendanceType: 'crew',
        faceVerified: true,
        faceDistance: +(0.21 + (crewAttCount % 9) * 0.01).toFixed(2),
        isLiveVerified: true,
        gpsLat: trip.pickupPoints?.[0]?.lat || 10.8204,
        gpsLng: trip.pickupPoints?.[0]?.lng || 106.6378,
        note: `Chấm công phụ xe hoàn thành chuyến ${routeName} (Biển số: ${busPlate})`
      });
      await attAttendant.save();

      const crewAtt = new CrewAttendance({
        attendanceId: attAttendant._id,
        tripId: trip._id,
        busId: trip.busId?._id || trip.busId,
        roleInTrip: 'attendant',
        punctuality: 'on_time',
        actualDeparture: depTime,
        actualArrival: arrTime,
        actualKm: kmDistance
      });
      await crewAtt.save();
    }

    crewAttCount++;
  }

  console.log(`Đã tạo chấm công thành công cho tổ lái của ${crewAttCount} chuyến xe đã hoàn thành.`);

  // 4.1. Tạo chấm công cho các chuyến xe ĐANG CHẠY (in_transit) tại thời điểm hiện tại
  const inTransitTrips = await Trip.find({ journeyStatus: 'in_transit' })
    .populate('routeId')
    .populate('busId')
    .sort({ departureTime: 1 });

  console.log(`Đang tạo dữ liệu chấm công ĐANG TRỰC cho ${inTransitTrips.length} chuyến xe đang chạy...`);

  for (const trip of inTransitTrips) {
    const depTime = new Date(trip.departureTime);
    const tripDate = new Date(depTime);
    tripDate.setUTCHours(0, 0, 0, 0);

    const routeName = trip.routeId 
      ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}`
      : 'Tuyến liên tỉnh';

    const busPlate = trip.busId?.plateNumber || 'Xe khách';
    const kmDistance = parseFloat(String(trip.routeId?.distance || '172').replace(/[^0-9.]/g, '')) || 172;

    let driverUser = trip.driver?.phone ? userByPhone[trip.driver.phone] : null;
    if (!driverUser && drivers.length > 0) {
      driverUser = drivers[crewAttCount % drivers.length];
    }
    let attendantUser = trip.assistant?.phone ? userByPhone[trip.assistant.phone] : null;
    if (!attendantUser && attendants.length > 0) {
      attendantUser = attendants[crewAttCount % attendants.length];
    }

    if (driverUser) {
      const driverCheckIn = new Date(depTime.getTime() - (20 + (crewAttCount % 5)) * 60 * 1000);
      const attDriver = new Attendance({
        userId: driverUser._id,
        date: tripDate,
        checkInTime: driverCheckIn,
        checkOutTime: null,
        totalHours: 0,
        status: 'active',
        attendanceType: 'crew',
        faceVerified: true,
        faceDistance: 0.22,
        isLiveVerified: true,
        gpsLat: trip.pickupPoints?.[0]?.lat || 10.8204,
        gpsLng: trip.pickupPoints?.[0]?.lng || 106.6378,
        note: `Đang thực hiện ca lái chuyến xe ${routeName} (Biển số: ${busPlate})`
      });
      await attDriver.save();

      const crewDriver = new CrewAttendance({
        attendanceId: attDriver._id,
        tripId: trip._id,
        busId: trip.busId?._id || trip.busId,
        roleInTrip: 'driver_main',
        punctuality: 'on_time',
        actualDeparture: depTime,
        actualArrival: null,
        actualKm: Math.round(kmDistance * 0.4)
      });
      await crewDriver.save();
    }

    if (attendantUser) {
      const attCheckIn = new Date(depTime.getTime() - (18 + (crewAttCount % 4)) * 60 * 1000);
      const attAttendant = new Attendance({
        userId: attendantUser._id,
        date: tripDate,
        checkInTime: attCheckIn,
        checkOutTime: null,
        totalHours: 0,
        status: 'active',
        attendanceType: 'crew',
        faceVerified: true,
        faceDistance: 0.21,
        isLiveVerified: true,
        gpsLat: trip.pickupPoints?.[0]?.lat || 10.8204,
        gpsLng: trip.pickupPoints?.[0]?.lng || 106.6378,
        note: `Đang trực phục vụ hành khách chuyến ${routeName} (Biển số: ${busPlate})`
      });
      await attAttendant.save();

      const crewAtt = new CrewAttendance({
        attendanceId: attAttendant._id,
        tripId: trip._id,
        busId: trip.busId?._id || trip.busId,
        roleInTrip: 'attendant',
        punctuality: 'on_time',
        actualDeparture: depTime,
        actualArrival: null,
        actualKm: Math.round(kmDistance * 0.4)
      });
      await crewAtt.save();
    }
    crewAttCount++;
  }

  // =========================================================================
  // BƯỚC 5: TẠO DỮ LIỆU CHẤM CÔNG VÀ CA TRỰC CHO NHÂN VIÊN BÁN VÉ (TICKET AGENTS)
  // =========================================================================
  console.log('\n--- BƯỚC 5: TẠO CHẤM CÔNG CHO NHÂN VIÊN BÁN VÉ & QUẢN LÝ VÉ ---');
  
  // Tạo danh sách các ngày làm việc từ 01/08/2026 đến 24/11/2026
  const startDate = new Date('2026-08-01T00:00:00.000Z');
  const endDate = new Date('2026-11-24T00:00:00.000Z');
  
  const allAgents = [...ticketAgents, ...ticketManagers];
  let agentShiftCount = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const curDateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 1 = Monday...

    // Mỗi ngày phân công các nhân viên bán vé vào 2 ca
    for (let idx = 0; idx < allAgents.length; idx++) {
      const agent = allAgents[idx];
      const office = officeList[idx % officeList.length];

      // Phân chia ca sáng (06:00 - 14:00) hoặc ca chiều (14:00 - 22:00)
      const isMorningShift = (idx % 2 === 0);

      const checkInHour = isMorningShift ? 6 : 14;
      const checkOutHour = isMorningShift ? 14 : 22;

      // Check-in đúng giờ: trước ca 5-10 phút
      const checkInTime = new Date(`${curDateStr}T${String(checkInHour - 1).padStart(2, '0')}:${String(50 + (idx % 8)).padStart(2, '0')}:00.000+07:00`);
      // Check-out đúng giờ: sau ca 5-12 phút
      const checkOutTime = new Date(`${curDateStr}T${String(checkOutHour).padStart(2, '0')}:${String(5 + (idx % 8)).padStart(2, '0')}:00.000+07:00`);
      const totalHours = 8.0;

      // Thông số tài chính của quầy vé trong ca
      const initialCash = 2000000; // 2,000,000 đ tiền quỹ bàn giao đầu ca
      const ticketsSold = 22 + ((idx + dayOfWeek * 3) % 25); // Từ 22 đến 46 vé
      const avgPrice = 210000; // Giá vé trung bình
      const cashRevenue = ticketsSold * avgPrice * 0.7; // 70% khách trả tiền mặt
      const cashlessRevenue = ticketsSold * avgPrice * 0.3; // 30% khách quét mã QR/chuyển khoản
      const cashCollected = Math.round(cashRevenue / 1000) * 1000;
      const cashHandover = initialCash + cashCollected; // Bàn giao đủ 100%
      const cashDiscrepancy = 0; // Không lệch tiền, đối soát chuẩn 100%

      // 1. Bảng Attendance chung
      const attRecord = new Attendance({
        userId: agent._id,
        date: new Date(`${curDateStr}T00:00:00.000Z`),
        checkInTime,
        checkOutTime,
        totalHours,
        status: 'closed',
        attendanceType: 'agent',
        faceVerified: true,
        faceDistance: +(0.19 + (idx % 8) * 0.01).toFixed(2),
        isLiveVerified: true,
        gpsLat: office.lat,
        gpsLng: office.lng,
        note: `Chấm công ca ${isMorningShift ? 'sáng' : 'chiều'} tại ${office.name}`
      });
      await attRecord.save();

      // 2. Bảng AgentAttendance riêng cho quầy vé
      const agentAtt = new AgentAttendance({
        attendanceId: attRecord._id,
        counterNumber: office.name,
        initialCash,
        cashCollected,
        cashHandover,
        cashDiscrepancy,
        totalTicketsSold: ticketsSold
      });
      await agentAtt.save();

      // 3. Bảng ShiftSession ca trực bán vé
      const shiftSession = new ShiftSession({
        userId: agent._id,
        startTime: checkInTime,
        endTime: checkOutTime,
        initialCash,
        expectedInitialCash: initialCash,
        cashRevenue: cashCollected,
        cashlessRevenue: Math.round(cashlessRevenue / 1000) * 1000,
        status: 'closed',
        reconciliationStatus: 'verified',
        notes: `Hoàn tất ca trực tại ${office.name}. Quỹ tiền mặt và số lượng vé đối soát khớp 100%, đã bàn giao đầy đủ cho ca sau.`
      });
      await shiftSession.save();

      agentShiftCount++;
    }
  }

  console.log(`Đã tạo thành công ${agentShiftCount} ca trực và bản ghi chấm công cho toàn bộ nhân viên bán vé.`);

  // =========================================================================
  // BƯỚC 6: TẠO CHẤM CÔNG CHO KHỐI CÁN BỘ QUẢN LÝ & ĐIỀU HÀNH VĂN PHÒNG
  // =========================================================================
  console.log('\n--- BƯỚC 6: TẠO CHẤM CÔNG CHO KHỐI CÁN BỘ QUẢN LÝ VĂN PHÒNG ---');
  let officeAttCount = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek === 0) continue; // Nghỉ Chủ nhật

    const curDateStr = d.toISOString().split('T')[0];

    for (let i = 0; i < officeStaff.length; i++) {
      const staff = officeStaff[i];
      const checkInTime = new Date(`${curDateStr}T07:${String(48 + (i % 10)).padStart(2, '0')}:00.000+07:00`);
      const checkOutTime = new Date(`${curDateStr}T17:${String(15 + (i % 15)).padStart(2, '0')}:00.000+07:00`);

      const att = new Attendance({
        userId: staff._id,
        date: new Date(`${curDateStr}T00:00:00.000Z`),
        checkInTime,
        checkOutTime,
        totalHours: 8.0,
        status: 'closed',
        attendanceType: 'standard',
        faceVerified: true,
        faceDistance: +(0.18 + (i % 7) * 0.01).toFixed(2),
        isLiveVerified: true,
        gpsLat: 10.7626,
        gpsLng: 106.6601,
        note: `Chấm công đúng giờ ngày làm việc khối Văn phòng & Quản lý điều hành`
      });
      await att.save();
      officeAttCount++;
    }
  }

  console.log(`Đã tạo thành công ${officeAttCount} bản ghi chấm công cho Cán bộ Quản lý.`);

  // =========================================================================
  // TỔNG KẾT VÀ KIỂM TRA ĐỐI SOÁT
  // =========================================================================
  console.log('\n======================================================');
  console.log('--- BÁO CÁO TỔNG KẾT TOÀN DIỆN SAU KHI SEED ---');
  const finalAttCount = await Attendance.countDocuments();
  const finalCrewCount = await CrewAttendance.countDocuments();
  const finalAgentCount = await AgentAttendance.countDocuments();
  const finalShiftCount = await ShiftSession.countDocuments();

  const finalTrips = await Trip.find({}, 'journeyStatus');
  const tripSummary = finalTrips.reduce((acc, t) => {
    acc[t.journeyStatus] = (acc[t.journeyStatus] || 0) + 1;
    return acc;
  }, {});

  const routeCheck = await Route.find({}, 'startPoint endPoint stops');

  console.log(`1. Tổng bản ghi Chấm công (Attendance): ${finalAttCount}`);
  console.log(`2. Bản ghi Chấm công Tổ lái (CrewAttendance): ${finalCrewCount}`);
  console.log(`3. Bản ghi Chấm công Quầy vé (AgentAttendance): ${finalAgentCount}`);
  console.log(`4. Bản ghi Ca trực Bán vé (ShiftSession): ${finalShiftCount}`);
  console.log(`5. Trạng thái các Chuyến xe (Trips):`, tripSummary);
  console.log(`6. Tuyến đường (Routes) được bảo toàn nguyên vẹn: ${routeCheck.length} tuyến`);
  routeCheck.forEach(r => console.log(`   - ${r.startPoint} → ${r.endPoint} (${r.stops?.length || 0} trạm GPS chuẩn)`));
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('Đã ngắt kết nối MongoDB. Hoàn tất quá trình!');
}

run().catch(err => {
  console.error('LỖI THỰC THI SCRIPT:', err);
  process.exit(1);
});

