const Attendance = require('../models/Attendance');
const CrewAttendance = require('../models/CrewAttendance');
const AgentAttendance = require('../models/AgentAttendance');
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const Trip = require('../models/Trip');
const ShiftSession = require('../models/ShiftSession');
const LeaveRequest = require('../models/LeaveRequest');
require('../models/Route');
require('../models/Bus');

// ─── Helper: lấy ngày và khoảng thời gian theo múi giờ Việt Nam (UTC+7) ───────────
function getDayRangeVN(dateStr) {
  let targetStr = dateStr;
  if (!targetStr) {
    const vnDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const y = vnDate.getFullYear();
    const m = String(vnDate.getMonth() + 1).padStart(2, '0');
    const d = String(vnDate.getDate()).padStart(2, '0');
    targetStr = `${y}-${m}-${d}`;
  }
  const dayStart = new Date(`${targetStr}T00:00:00.000+07:00`);
  const dayEnd = new Date(`${targetStr}T23:59:59.999+07:00`);
  return { dateStr: targetStr, dayStart, dayEnd };
}

// ─── Helper: tính khoảng cách Euclid giữa 2 descriptor 128D ───────────────
function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += (desc1[i] - desc2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// ─── Helper: format giờ HH:MM:SS ──────────────────────────────────────────
function formatTime(date) {
  if (!date) return '--:--:--';
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  });
}

function formatShortTime(date) {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ĐĂNG KÝ KHUÔN MẶT (Quản lý vận tải thực hiện tại Quản lý tài khoản đội xe)
// POST /api/attendance/register-face
// ═══════════════════════════════════════════════════════════════════════════
exports.registerFace = async (req, res) => {
  try {
    let { userId, faceDescriptors, facePhoto } = req.body;

    // Nếu không truyền userId thì tự lấy userId từ tài khoản đang đăng nhập
    if (!userId && req.user) {
      userId = req.user.id || req.user._id;
    }

    if (!userId || !faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu userId hoặc faceDescriptors không hợp lệ.'
      });
    }

    for (const desc of faceDescriptors) {
      if (!Array.isArray(desc) || desc.length !== 128) {
        return res.status(400).json({
          success: false,
          message: `Descriptor không hợp lệ: cần mảng 128 chiều.`
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });
    }

    if (!['driver', 'attendant', 'ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager', 'general_manager', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ có thể đăng ký khuôn mặt cho nhân sự thuộc hệ thống nhà xe.'
      });
    }

    const emp = await EmployeeProfile.findByIdAndUpdate(
      userId,
      {
        faceDescriptors,
        faceRegistered: true,
        ...(facePhoto ? { facePhoto } : {})
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Đã đăng ký khuôn mặt thành công cho ${user.name} (${faceDescriptors.length} mẫu).`,
      data: {
        userId: user._id,
        name: user.name,
        faceRegistered: true,
        facePhoto: emp.facePhoto,
        samplesCount: faceDescriptors.length
      }
    });
  } catch (err) {
    console.error('[registerFace Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký khuôn mặt.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. CHECK-IN (Bắt đầu ca trực theo chuyến xe / ngày công)
// POST /api/attendance/check-in
// Body: { faceDescriptor, tripId?, location?, gpsLat?, gpsLng?, checkInPhoto?, isLiveVerified? }
// ═══════════════════════════════════════════════════════════════════════════
exports.checkIn = async (req, res) => {
  try {
    const { faceDescriptor, tripId, location, gpsLat, gpsLng, checkInPhoto, isLiveVerified } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu nhận diện khuôn mặt không hợp lệ (cần mảng 128D).'
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

    const emp = await EmployeeProfile.findById(userId).select('+faceDescriptors +faceRegistered assignedOffice branchId');
    if (!emp || !emp.faceRegistered || !emp.faceDescriptors || emp.faceDescriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa đăng ký khuôn mặt Face ID. Vui lòng liên hệ Quản lý Vận tải để được kích hoạt khuôn mặt.'
      });
    }

    // Nhận diện khuôn mặt sinh trắc học
    const THRESHOLD = 0.38;
    const distances = emp.faceDescriptors.map(stored => euclideanDistance(faceDescriptor, stored));
    const bestDistance = Math.min(...distances);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

    if (bestDistance > THRESHOLD || avgDistance > 0.42) {
      return res.status(401).json({
        success: false,
        message: `Khuôn mặt trước camera không trùng khớp với nhân sự ${user.name} (sai số: ${bestDistance.toFixed(4)}, ngưỡng cho phép: ${THRESHOLD}). Vui lòng không điểm danh hộ!`,
        faceDistance: bestDistance
      });
    }

    const now = new Date();
    const { dayStart, dayEnd } = getDayRangeVN();

    // Xác định nhóm nhân sự và bảng mở rộng
    const isCrewRole = ['driver', 'attendant'].includes(user.role);
    const isAgentRole = user.role === 'ticket_agent';
    const attendanceType = isCrewRole ? 'crew' : (isAgentRole ? 'agent' : 'standard');

    let targetTrip = null;

    if (isCrewRole) {
      if (tripId) {
        targetTrip = await Trip.findById(tripId).populate('routeId').populate('busId');
      }

      if (!targetTrip) {
        // Tìm chuyến xe phân công cho nhân viên này trong hôm nay
        const query = {
          departureTime: { $gte: new Date(now.getTime() - 4 * 3600 * 1000), $lte: dayEnd },
          journeyStatus: { $ne: 'cancelled' }
        };
        if (user.role === 'driver') {
          query['driver.phone'] = user.phone;
        } else {
          query['assistant.phone'] = user.phone;
        }

        const assignedTrips = await Trip.find(query)
          .sort({ departureTime: 1 })
          .populate('routeId')
          .populate('busId');

        if (assignedTrips.length > 0) {
          for (const t of assignedTrips) {
            // Kiểm tra xem đã có bản ghi chấm công cho chuyến xe này chưa
            const existingCrew = await CrewAttendance.findOne({ tripId: t._id });
            if (existingCrew) {
              const existingAtt = await Attendance.findById(existingCrew.attendanceId);
              if (!existingAtt || existingAtt.status !== 'closed') {
                targetTrip = t;
                break;
              }
            } else {
              targetTrip = t;
              break;
            }
          }
          if (!targetTrip) targetTrip = assignedTrips[assignedTrips.length - 1];
        }
      }
    }

    // Kiểm tra trạng thái nếu đã check-in cho chuyến này rồi
    if (targetTrip) {
      const existingCrew = await CrewAttendance.findOne({ tripId: targetTrip._id });
      if (existingCrew) {
        const existingAtt = await Attendance.findById(existingCrew.attendanceId);
        if (existingAtt && existingAtt.userId.toString() === userId.toString()) {
          if (existingAtt.status === 'active') {
            return res.status(400).json({
              success: false,
              message: `Bạn đã bắt đầu ca cho chuyến này từ ${formatTime(existingAtt.checkInTime)}. Hãy tan ca (Check-out) khi hoàn thành chuyến đi!`,
              data: existingAtt
            });
          }
          if (existingAtt.status === 'closed') {
            return res.status(400).json({
              success: false,
              message: `Bạn đã hoàn thành ca cho chuyến này (vào lúc ${formatTime(existingAtt.checkInTime)} — tan ca ${formatTime(existingAtt.checkOutTime)}).`
            });
          }
        }
      }
    } else if (!isCrewRole) {
      // Đối với nhân sự văn phòng / Quản lý / Quầy vé
      const existingToday = await Attendance.findOne({ userId, date: dayStart });
      if (existingToday) {
        if (existingToday.status === 'active') {
          return res.status(400).json({
            success: false,
            message: `Bạn đã bắt đầu ca làm việc hôm nay từ ${formatTime(existingToday.checkInTime)}. Hãy chọn 'Tan ca' (Check-out) khi hoàn thành ngày làm việc!`,
            data: existingToday
          });
        }
        if (existingToday.status === 'closed') {
          return res.status(400).json({
            success: false,
            message: `Bạn đã hoàn thành ca làm việc hôm nay (Vào ca: ${formatTime(existingToday.checkInTime)} — Tan ca: ${formatTime(existingToday.checkOutTime)}).`
          });
        }
      }
    }

    const routeName = targetTrip?.routeId?.name || (targetTrip?.routeId?.startPoint ? `${targetTrip.routeId.startPoint} -> ${targetTrip.routeId.endPoint}` : 'Ca làm việc tiêu chuẩn');
    const plateNumber = targetTrip?.busId?.plateNumber || '--';

    // 1. Lưu bản ghi vào bảng chung Attendance (Chuẩn hóa 3NF - chỉ lưu userId)
    let attendance = null;
    if (targetTrip) {
      // Tìm xem có attendance liên kết với crew này chưa
      const existingCrew = await CrewAttendance.findOne({ tripId: targetTrip._id });
      if (existingCrew && existingCrew.attendanceId) {
        attendance = await Attendance.findById(existingCrew.attendanceId);
      }
    } else {
      attendance = await Attendance.findOne({ userId, date: dayStart });
    }

    if (!attendance) {
      attendance = new Attendance({
        userId,
        date: dayStart
      });
    }

    attendance.checkInTime = now;
    attendance.status = 'active';
    attendance.attendanceType = attendanceType;
    attendance.faceVerified = true;
    attendance.faceDistance = parseFloat(bestDistance.toFixed(4));
    attendance.isLiveVerified = Boolean(isLiveVerified);
    attendance.checkInPhoto = checkInPhoto || null;
    attendance.gpsLat = gpsLat || null;
    attendance.gpsLng = gpsLng || null;
    attendance.note = targetTrip ? `Check-in chuyến ${routeName} (${plateNumber})` : 'Đã check-in thành công ca làm việc';

    await attendance.save();

    // 2. Lưu vào bảng mở rộng đặc thù tương ứng
    if (isCrewRole && targetTrip) {
      const punctuality = targetTrip.departureTime && now > new Date(targetTrip.departureTime) ? 'late' : 'on_time';
      await CrewAttendance.findOneAndUpdate(
        { attendanceId: attendance._id },
        {
          $set: {
            attendanceId: attendance._id,
            tripId: targetTrip._id,
            busId: targetTrip.busId?._id || targetTrip.busId || null,
            roleInTrip: user.role === 'attendant' ? 'attendant' : 'driver_main',
            punctuality,
            actualDeparture: now
          }
        },
        { upsert: true, new: true }
      );
    } else if (isAgentRole) {
      await AgentAttendance.findOneAndUpdate(
        { attendanceId: attendance._id },
        {
          $set: {
            attendanceId: attendance._id,
            initialCash: 0
          }
        },
        { upsert: true, new: true }
      );

      // Đồng bộ mở ShiftSession cho nhân viên bán vé nếu chưa có ca đang mở
      try {
        await ShiftSession.findOneAndUpdate(
          { userId, status: 'active' },
          {
            $setOnInsert: {
              userId,
              initialCash: 0,
              startTime: now,
              status: 'active'
            }
          },
          { upsert: true }
        );
      } catch (e) {}
    }

    const roleGreeting = 
      user.role === 'ops_manager' ? 'Quản lý Vận tải' :
      user.role === 'fleet_manager' ? 'Quản lý Đội xe' :
      user.role === 'ticket_manager' ? 'Quản lý Phòng vé' :
      user.role === 'driver' ? 'Tài xế' :
      user.role === 'attendant' ? 'Phụ xe' :
      user.role === 'ticket_agent' ? 'Nhân viên Bán vé' :
      'Nhân viên';

    const successMessage = targetTrip
      ? `Check-in thành công chuyến ${routeName} (${plateNumber})! Xin chào ${roleGreeting} ${user.name} — Chúc bạn một chuyến đi thượng lộ bình an.`
      : `Check-in thành công ca làm việc! Xin chào ${roleGreeting} ${user.name} — Chúc bạn một ngày làm việc hiệu quả và thành công.`;

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        tripId: targetTrip?._id || null,
        tripRoute: routeName,
        busPlateNumber: plateNumber,
        checkInTime: formatTime(attendance.checkInTime),
        status: attendance.status,
        faceVerified: true,
        faceDistance: attendance.faceDistance,
        isLiveVerified: attendance.isLiveVerified,
        checkInPhoto: attendance.checkInPhoto
      }
    });
  } catch (err) {
    console.error('[checkIn Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi check-in.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. CHECK-OUT (Tan ca chuyến xe / Kết thúc ngày làm việc)
// POST /api/attendance/check-out
// Body: { faceDescriptor, tripId?, checkOutPhoto?, location? }
// ═══════════════════════════════════════════════════════════════════════════
exports.checkOut = async (req, res) => {
  try {
    const { faceDescriptor, tripId, checkOutPhoto, location } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ success: false, message: 'Dữ liệu khuôn mặt không hợp lệ.' });
    }

    const user = await User.findById(userId);
    const emp = await EmployeeProfile.findById(userId).select('+faceDescriptors');
    if (!emp || !emp.faceDescriptors || emp.faceDescriptors.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa đăng ký khuôn mặt.' });
    }

    const THRESHOLD = 0.38;
    const distances = emp.faceDescriptors.map(stored => euclideanDistance(faceDescriptor, stored));
    const bestDistance = Math.min(...distances);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    if (bestDistance > THRESHOLD || avgDistance > 0.42) {
      return res.status(401).json({
        success: false,
        message: `Khuôn mặt không trùng khớp với ${user.name} khi tan ca (sai số: ${bestDistance.toFixed(4)}, ngưỡng: ${THRESHOLD}).`,
        faceDistance: bestDistance
      });
    }

    // Tìm bản ghi đang active của nhân viên
    let attendance = null;
    let crewRecord = null;

    if (tripId) {
      crewRecord = await CrewAttendance.findOne({ tripId }).populate('tripId').populate('busId');
      if (crewRecord && crewRecord.attendanceId) {
        attendance = await Attendance.findOne({ _id: crewRecord.attendanceId, userId, status: 'active' });
      }
    }

    if (!attendance) {
      attendance = await Attendance.findOne({ userId, status: 'active' }).sort({ checkInTime: -1 });
    }

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa có ca làm việc nào đang mở để tan ca. Vui lòng check-in vào ca trước!'
      });
    }

    const now = new Date();
    attendance.checkOutTime = now;
    attendance.status = 'closed';
    if (checkOutPhoto) attendance.checkOutPhoto = checkOutPhoto;
    if (location) {
      attendance.note = attendance.note ? `${attendance.note} | Tan ca: ${location}` : `Tan ca: ${location}`;
    }

    const diffMs = now - (attendance.checkInTime || now);
    const totalHours = Math.floor(diffMs / 3_600_000);
    const totalMinutes = Math.floor((diffMs % 3_600_000) / 60_000);
    attendance.totalHours = parseFloat((Math.max(0, diffMs) / 3600000).toFixed(2));

    await attendance.save();

    // Cập nhật bảng con tương ứng
    let tripRoute = 'Ca làm việc';
    if (attendance.attendanceType === 'crew') {
      if (!crewRecord) {
        crewRecord = await CrewAttendance.findOne({ attendanceId: attendance._id }).populate({
          path: 'tripId',
          populate: { path: 'routeId busId' }
        });
      }
      if (crewRecord) {
        crewRecord.actualArrival = now;
        await crewRecord.save();
        tripRoute = crewRecord.tripId?.routeId?.name || (crewRecord.tripId?.routeId?.startPoint ? `${crewRecord.tripId.routeId.startPoint} -> ${crewRecord.tripId.routeId.endPoint}` : 'Chuyến xe');
      }
    } else if (attendance.attendanceType === 'agent') {
      // Đồng bộ đóng ShiftSession nếu có
      try {
        await ShiftSession.findOneAndUpdate(
          { userId, status: 'active' },
          {
            $set: {
              status: 'closed',
              endTime: now,
              checkOutPhoto: checkOutPhoto || null
            }
          }
        );
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      message: `Tan ca thành công (${tripRoute})! Thời gian thực hiện: ${totalHours} giờ ${totalMinutes} phút. Chúc bạn nghỉ ngơi vui vẻ!`,
      data: {
        tripId: crewRecord?.tripId?._id || null,
        tripRoute,
        checkInTime: formatTime(attendance.checkInTime),
        checkOutTime: formatTime(attendance.checkOutTime),
        totalWork: `${totalHours}h ${totalMinutes}m`,
        status: 'closed'
      }
    });
  } catch (err) {
    console.error('[checkOut Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi check-out.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. XEM LỊCH SỬ CHẤM CÔNG CỦA BẢN THÂN
// GET /api/attendance/mine
// ═══════════════════════════════════════════════════════════════════════════
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const limit = parseInt(req.query.limit) || 100;

    const user = await User.findById(userId).select('name phone role').lean();
    const emp = await EmployeeProfile.findById(userId).select('faceRegistered facePhoto assignedOffice branchId +faceDescriptors').lean();

    const { dayStart, dayEnd } = getDayRangeVN();

    // ── Đối với Nhân viên Bán vé / Quản lý / Điều hành: lấy dữ liệu từ ShiftSession & Attendance ──
    if (user && ['ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager', 'general_manager', 'admin'].includes(user.role)) {
      const activeShift = await ShiftSession.findOne({ userId, status: 'active' }).lean();
      const latestShift = activeShift || (await ShiftSession.findOne({ userId }).sort({ startTime: -1 }).lean());

      const shiftQuery = { userId };
      
      if (req.query.fromDate && req.query.toDate) {
        const from = new Date(req.query.fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(req.query.toDate);
        to.setHours(23, 59, 59, 999);
        shiftQuery.startTime = { $gte: from, $lte: to };
      } else if (req.query.fromDate) {
        const from = new Date(req.query.fromDate);
        from.setHours(0, 0, 0, 0);
        shiftQuery.startTime = { $gte: from };
      } else if (req.query.toDate) {
        const to = new Date(req.query.toDate);
        to.setHours(23, 59, 59, 999);
        shiftQuery.startTime = { $lte: to };
      } else if (req.query.month && req.query.year && req.query.month !== 'all' && req.query.year !== 'all') {
        const m = parseInt(req.query.month, 10);
        const y = parseInt(req.query.year, 10);
        const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0);
        const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
        shiftQuery.startTime = { $gte: startOfMonth, $lte: endOfMonth };
      }

      if (req.query.status && req.query.status !== 'all') {
        shiftQuery.status = req.query.status;
      }
      if (req.query.reconciliationStatus && req.query.reconciliationStatus !== 'all') {
        shiftQuery.reconciliationStatus = req.query.reconciliationStatus;
      }
      if (req.query.faceVerified !== undefined && req.query.faceVerified !== 'all') {
        shiftQuery.faceVerified = req.query.faceVerified === 'true';
      }

      const shiftHistory = await ShiftSession.find(shiftQuery)
        .sort({ startTime: -1 })
        .limit(limit)
        .lean();

      // Kết hợp thêm các bản ghi chấm công từ collection 'Attendance'
      const attTicketQuery = { userId };
      if (req.query.fromDate && req.query.toDate) {
        const from = new Date(req.query.fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(req.query.toDate);
        to.setHours(23, 59, 59, 999);
        attTicketQuery.$or = [
          { date: { $gte: from, $lte: to } },
          { checkInTime: { $gte: from, $lte: to } }
        ];
      } else if (req.query.fromDate) {
        const from = new Date(req.query.fromDate);
        from.setHours(0, 0, 0, 0);
        attTicketQuery.$or = [{ date: { $gte: from } }, { checkInTime: { $gte: from } }];
      } else if (req.query.toDate) {
        const to = new Date(req.query.toDate);
        to.setHours(23, 59, 59, 999);
        attTicketQuery.$or = [{ date: { $lte: to } }, { checkInTime: { $lte: to } }];
      }

      const attTicketRecords = await Attendance.find(attTicketQuery)
        .sort({ checkInTime: -1, date: -1 })
        .limit(limit)
        .lean();

      const attTicketDateMap = {};
      attTicketRecords.forEach(att => {
        const dKey = new Date(att.date || att.checkInTime || att.createdAt).toLocaleDateString('vi-VN');
        attTicketDateMap[dKey] = att;
      });

      let totalWorkHours = 0;
      let totalCashRevenue = 0;
      let totalCashlessRevenue = 0;
      let totalTicketsSold = 0;
      let faceVerifiedCount = 0;
      let activeShiftsCount = 0;
      let closedShiftsCount = 0;

      const combinedHistory = [];
      const seenDates = new Set();
      const nowTime = Date.now();

      // 1. Nạp từ ca trực quầy bán vé (ShiftSession)
      shiftHistory.forEach(s => {
        const sDateKey = new Date(s.startTime).toLocaleDateString('vi-VN');
        seenDates.add(sDateKey);

        const cashRev = s.cashRevenue || 0;
        const cashlessRev = s.cashlessRevenue || 0;
        const totalRev = cashRev + cashlessRev;
        const tickets = Array.isArray(s.ticketsSold) ? s.ticketsSold.length : (s.ticketsSold || 0);

        let durationH = 0;
        if (s.status === 'active') {
          activeShiftsCount += 1;
          const diffMs = Math.max(0, nowTime - new Date(s.startTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else {
          closedShiftsCount += 1;
          if (s.endTime && s.startTime) {
            const diffMs = Math.max(0, new Date(s.endTime) - new Date(s.startTime));
            durationH = +(diffMs / 3600000).toFixed(1);
          } else {
            durationH = 8.0;
          }
        }

        totalWorkHours += durationH;
        totalCashRevenue += cashRev;
        totalCashlessRevenue += cashlessRev;
        totalTicketsSold += tickets;
        const matchedAtt = attTicketDateMap[sDateKey];
        if (matchedAtt?.faceVerified) faceVerifiedCount += 1;

        combinedHistory.push({
          id: s._id,
          tripRoute: emp?.assignedOffice || 'Quầy vé trực',
          busPlateNumber: 'Quầy bán vé',
          officeName: emp?.assignedOffice || 'Văn phòng Bến xe Miền Đông',
          branchId: emp?.branchId || 'sg',
          date: sDateKey,
          startTime: s.startTime,
          endTime: s.endTime,
          checkInTime: formatTime(s.startTime),
          checkOutTime: s.endTime ? formatTime(s.endTime) : '--:--:--',
          durationHours: durationH,
          status: s.status,
          initialCash: s.initialCash || 0,
          cashRevenue: cashRev,
          cashlessRevenue: cashlessRev,
          totalRevenue: totalRev,
          ticketsCount: tickets,
          reconciliationStatus: s.reconciliationStatus || 'verified',
          faceVerified: Boolean(matchedAtt?.faceVerified),
          faceDistance: matchedAtt?.faceDistance ?? null,
          isLiveVerified: Boolean(matchedAtt?.isLiveVerified),
          checkInPhoto: matchedAtt?.checkInPhoto || null,
          checkOutPhoto: matchedAtt?.checkOutPhoto || null,
          location: emp?.assignedOffice || 'Văn phòng bán vé',
          notes: s.notes || ''
        });
      });

      // 2. Bổ sung các bản ghi chấm công từ 'Attendance' chưa có trong ShiftSession
      attTicketRecords.forEach(att => {
        const attDateKey = new Date(att.date || att.checkInTime || att.createdAt).toLocaleDateString('vi-VN');
        if (!seenDates.has(attDateKey)) {
          let durationH = att.totalHours || 0;
          if (att.status === 'active') {
            activeShiftsCount += 1;
            const diffMs = Math.max(0, nowTime - new Date(att.checkInTime || att.createdAt));
            durationH = +(diffMs / 3600000).toFixed(1);
          } else {
            closedShiftsCount += 1;
            if (att.checkOutTime && att.checkInTime) {
              const diffMs = Math.max(0, new Date(att.checkOutTime) - new Date(att.checkInTime));
              durationH = +(diffMs / 3600000).toFixed(1);
            } else if (!durationH) {
              durationH = 8.0;
            }
          }
          totalWorkHours += durationH;
          if (att.faceVerified) faceVerifiedCount += 1;

          const office = emp?.assignedOffice || 'Văn phòng bán vé';

          combinedHistory.push({
            id: att._id,
            tripRoute: office,
            busPlateNumber: 'Văn phòng vé',
            officeName: office,
            branchId: emp?.branchId || 'sg',
            date: attDateKey,
            startTime: att.checkInTime || att.createdAt,
            endTime: att.checkOutTime || null,
            checkInTime: formatTime(att.checkInTime),
            checkOutTime: att.checkOutTime ? formatTime(att.checkOutTime) : '--:--:--',
            durationHours: durationH,
            status: att.status,
            initialCash: 0,
            cashRevenue: 0,
            cashlessRevenue: 0,
            totalRevenue: 0,
            ticketsCount: 0,
            reconciliationStatus: 'verified',
            faceVerified: Boolean(att.faceVerified),
            faceDistance: att.faceDistance,
            isLiveVerified: Boolean(att.isLiveVerified),
            checkInPhoto: att.checkInPhoto || null,
            checkOutPhoto: att.checkOutPhoto || null,
            location: office,
            notes: att.note || ''
          });
        }
      });

      combinedHistory.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));

      const approvedLeaves = await LeaveRequest.find({
        userId,
        status: 'approved'
      }).lean();

      const totalShifts = shiftHistory.length || combinedHistory.length;
      const faceRate = totalShifts > 0 ? Math.round((faceVerifiedCount / totalShifts) * 100) : 100;
      const expectedDays = 26;
      let attendanceRate = Math.min(100, Math.round(((totalShifts + approvedLeaves.length) / expectedDays) * 100));
      if (totalShifts >= 18) attendanceRate = Math.min(100, Math.max(95, attendanceRate));

      const summary = {
        totalShifts,
        activeShiftsCount,
        closedShiftsCount,
        totalWorkHours: +totalWorkHours.toFixed(1),
        avgHoursPerShift: totalShifts > 0 ? +(totalWorkHours / totalShifts).toFixed(1) : 0,
        totalRevenue: totalCashRevenue + totalCashlessRevenue,
        totalCashRevenue,
        totalCashlessRevenue,
        totalTicketsSold,
        faceVerifiedCount,
        faceRate,
        leaveDaysCount: approvedLeaves.length,
        attendanceRate
      };

      const todayAttRecord = await Attendance.findOne({ userId, date: dayStart }).sort({ createdAt: -1 });
      let currentTodayStatus = 'not_checked';
      let currentTodayRecord = null;

      if (activeShift) {
        currentTodayStatus = 'active';
        currentTodayRecord = activeShift;
      } else if (todayAttRecord && todayAttRecord.status === 'active') {
        currentTodayStatus = 'active';
        currentTodayRecord = todayAttRecord;
      } else if (todayAttRecord && todayAttRecord.status === 'closed') {
        currentTodayStatus = 'closed';
        currentTodayRecord = todayAttRecord;
      } else if (latestShift && new Date(latestShift.startTime) >= dayStart) {
        currentTodayStatus = latestShift.status;
        currentTodayRecord = latestShift;
      }

      const hasFaceEnrolled = Boolean(emp && emp.faceRegistered && Array.isArray(emp.faceDescriptors) && emp.faceDescriptors.length > 0);
      return res.status(200).json({
        success: true,
        faceRegistered: hasFaceEnrolled,
        facePhoto: emp?.facePhoto || null,
        faceDescriptors: emp && Array.isArray(emp.faceDescriptors) ? emp.faceDescriptors : [],
        todayDuties: [],
        activeTrip: null,
        todayStatus: currentTodayStatus,
        todayRecord: currentTodayRecord,
        history: combinedHistory,
        summary
      });
    }

    // ── Đối với Tài xế & Phụ xe: Dữ liệu chuẩn hóa 3NF từ Attendance + CrewAttendance + Trip ──
    const tripQuery = {
      departureTime: { $gte: dayStart, $lte: dayEnd },
      journeyStatus: { $ne: 'cancelled' }
    };
    if (user?.role === 'driver') {
      tripQuery['driver.phone'] = user.phone;
    } else {
      tripQuery['assistant.phone'] = user?.phone;
    }

    const myTodayTrips = await Trip.find(tripQuery)
      .sort({ departureTime: 1 })
      .populate('routeId', 'name startPoint endPoint')
      .populate('busId', 'plateNumber')
      .lean();

    // Lấy các bản ghi attendance của user
    const records = await Attendance.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Lấy danh sách crew_attendances tương ứng
    const attIds = records.map(r => r._id);
    const crewRecords = await CrewAttendance.find({ attendanceId: { $in: attIds } })
      .populate({ path: 'tripId', populate: { path: 'routeId busId' } })
      .populate('busId')
      .lean();

    const crewMap = {};
    crewRecords.forEach(c => {
      crewMap[c.attendanceId.toString()] = c;
    });

    const now = new Date();
    const todayDuties = myTodayTrips.map(t => {
      const routeName = t.routeId?.name || (t.routeId?.startPoint ? `${t.routeId.startPoint} -> ${t.routeId.endPoint}` : 'Chuyến xe theo phân công');
      const matchedCrew = crewRecords.find(c => c.tripId && (c.tripId._id || c.tripId).toString() === t._id.toString());
      const rec = matchedCrew ? records.find(r => r._id.toString() === matchedCrew.attendanceId.toString()) : null;
      const isPastDeparture = now > new Date(t.departureTime);

      let status = 'scheduled';
      let checkInTime = '--:--:--';
      let checkOutTime = '--:--:--';
      if (rec) {
        status = rec.status;
        checkInTime = formatTime(rec.checkInTime);
        checkOutTime = formatTime(rec.checkOutTime);
      } else if (isPastDeparture) {
        status = 'absent';
      }

      return {
        tripId: t._id,
        route: routeName,
        plateNumber: t.busId?.plateNumber || '--',
        departureTime: t.departureTime,
        departureTimeStr: formatShortTime(t.departureTime),
        status,
        checkInTime,
        checkOutTime,
        isPastDeparture
      };
    });

    const activeAttendanceRecord = records.find(r => r.status === 'active') || null;

    if (activeAttendanceRecord && !todayDuties.some(d => d.status === 'active')) {
      const activeCrew = crewMap[activeAttendanceRecord._id.toString()];
      const activeTripInfo = activeCrew?.tripId || null;
      const activeRouteName = activeTripInfo?.routeId?.name || (activeTripInfo?.routeId?.startPoint ? `${activeTripInfo.routeId.startPoint} -> ${activeTripInfo.routeId.endPoint}` : 'Chuyến xe đang phục vụ');
      const activePlate = activeCrew?.busId?.plateNumber || activeTripInfo?.busId?.plateNumber || '--';

      todayDuties.unshift({
        tripId: activeTripInfo?._id || null,
        route: activeRouteName,
        plateNumber: activePlate,
        departureTime: activeTripInfo?.departureTime || activeAttendanceRecord.checkInTime,
        departureTimeStr: formatShortTime(activeTripInfo?.departureTime || activeAttendanceRecord.checkInTime),
        status: 'active',
        checkInTime: formatTime(activeAttendanceRecord.checkInTime),
        checkOutTime: '--:--:--',
        isPastDeparture: false
      });
    }

    const activeDuty = todayDuties.find(d => d.status === 'active') || todayDuties.find(d => d.status === 'scheduled') || todayDuties[0] || null;

    let finalTodayStatus = 'not_checked';
    if (activeAttendanceRecord) {
      finalTodayStatus = 'active';
    } else if (activeDuty && activeDuty.status) {
      finalTodayStatus = activeDuty.status;
    } else {
      const closedToday = records.find(r => {
        const d = new Date(r.checkInTime || r.createdAt);
        return d >= dayStart && d <= dayEnd && r.status === 'closed';
      });
      if (closedToday) {
        finalTodayStatus = 'closed';
      }
    }

    let todayRecord = activeAttendanceRecord;
    if (!todayRecord && activeDuty && activeDuty.tripId) {
      const matchedCrew = crewRecords.find(c => c.tripId && (c.tripId._id || c.tripId).toString() === activeDuty.tripId.toString());
      if (matchedCrew) {
        todayRecord = records.find(r => r._id.toString() === matchedCrew.attendanceId.toString() && r.status !== 'scheduled') || null;
      }
    }

    // ── XÂY DỰNG LỊCH SỬ CHẤM CÔNG THẬT TỪ MONGODB (3NF MERGE) ──
    const attHistoryQuery = { userId };
    const tripHistoryQuery = { journeyStatus: { $ne: 'cancelled' } };

    if (user?.role === 'driver') {
      tripHistoryQuery['driver.phone'] = user.phone;
    } else {
      tripHistoryQuery['assistant.phone'] = user?.phone;
    }

    if (req.query.fromDate && req.query.toDate) {
      const from = new Date(req.query.fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(req.query.toDate);
      to.setHours(23, 59, 59, 999);
      attHistoryQuery.$or = [
        { date: { $gte: from, $lte: to } },
        { checkInTime: { $gte: from, $lte: to } },
        { createdAt: { $gte: from, $lte: to } }
      ];
      tripHistoryQuery.departureTime = { $gte: from, $lte: to };
    } else if (req.query.fromDate) {
      const from = new Date(req.query.fromDate);
      from.setHours(0, 0, 0, 0);
      attHistoryQuery.$or = [
        { date: { $gte: from } },
        { checkInTime: { $gte: from } },
        { createdAt: { $gte: from } }
      ];
      tripHistoryQuery.departureTime = { $gte: from };
    } else if (req.query.toDate) {
      const to = new Date(req.query.toDate);
      to.setHours(23, 59, 59, 999);
      attHistoryQuery.$or = [
        { date: { $lte: to } },
        { checkInTime: { $lte: to } },
        { createdAt: { $lte: to } }
      ];
      tripHistoryQuery.departureTime = { $lte: to };
    } else if (req.query.month && req.query.year && req.query.month !== 'all' && req.query.year !== 'all') {
      const m = parseInt(req.query.month, 10);
      const y = parseInt(req.query.year, 10);
      const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
      attHistoryQuery.$or = [
        { date: { $gte: startOfMonth, $lte: endOfMonth } },
        { checkInTime: { $gte: startOfMonth, $lte: endOfMonth } },
        { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
      ];
      tripHistoryQuery.departureTime = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // 1. Lấy dữ liệu từ collection 'attendances' trong MongoDB
    const attRecords = await Attendance.find(attHistoryQuery)
      .sort({ date: -1, checkInTime: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Nạp crew_attendances tương ứng
    const histAttIds = attRecords.map(r => r._id);
    const histCrewRecords = await CrewAttendance.find({ attendanceId: { $in: histAttIds } })
      .populate({ path: 'tripId', populate: { path: 'routeId busId' } })
      .populate('busId')
      .lean();

    const histCrewMap = {};
    histCrewRecords.forEach(c => {
      histCrewMap[c.attendanceId.toString()] = c;
    });

    // 2. Lấy dữ liệu chuyến xe phân công từ collection 'trips' trong MongoDB
    let assignedTrips = [];
    if (user?.phone) {
      assignedTrips = await Trip.find(tripHistoryQuery)
        .sort({ departureTime: -1 })
        .populate('routeId', 'name startPoint endPoint')
        .populate('busId', 'plateNumber')
        .limit(limit)
        .lean();
    }

    // 3. Kết hợp (Merge) dữ liệu thật trong MongoDB
    const mergedList = [];
    const usedTripIds = new Set();
    const usedAttIds = new Set();

    // 3.1. Duyệt chuyến xe từ collection 'trips'
    for (const trip of assignedTrips) {
      const tIdStr = trip._id.toString();
      usedTripIds.add(tIdStr);

      const routeName = trip.routeId?.name || (trip.routeId?.startPoint ? `${trip.routeId.startPoint} -> ${trip.routeId.endPoint}` : 'Chuyến xe theo phân công');
      const plateNumber = trip.busId?.plateNumber || '--';
      const depDate = new Date(trip.departureTime);
      const isPastDeparture = now > depDate;

      // Tìm bản ghi attendance thông qua crew_attendances
      const matchedCrew = histCrewRecords.find(c => c.tripId && (c.tripId._id || c.tripId).toString() === tIdStr);
      const matchedAtt = matchedCrew ? attRecords.find(r => r._id.toString() === matchedCrew.attendanceId.toString()) : null;

      if (matchedAtt) {
        usedAttIds.add(matchedAtt._id.toString());
        let durationH = matchedAtt.totalHours || 0;
        if (matchedAtt.status === 'active' && matchedAtt.checkInTime) {
          const diffMs = Math.max(0, now - new Date(matchedAtt.checkInTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else if (matchedAtt.checkInTime && matchedAtt.checkOutTime) {
          const diffMs = Math.max(0, new Date(matchedAtt.checkOutTime) - new Date(matchedAtt.checkInTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else if (!durationH && trip.arrivalTime && trip.departureTime) {
          const diffMs = Math.max(0, new Date(trip.arrivalTime) - new Date(trip.departureTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else if (!durationH) {
          durationH = 6.0;
        }

        mergedList.push({
          id: matchedAtt._id,
          tripId: trip._id,
          tripRoute: routeName,
          busPlateNumber: plateNumber,
          date: new Date(matchedAtt.date || matchedAtt.checkInTime || depDate).toLocaleDateString('vi-VN'),
          rawDate: matchedAtt.date || matchedAtt.checkInTime || depDate,
          scheduledDepartureTime: formatShortTime(depDate),
          rawScheduledDepartureTime: depDate,
          checkInTime: formatTime(matchedAtt.checkInTime),
          rawCheckInTime: matchedAtt.checkInTime || null,
          checkOutTime: formatTime(matchedAtt.checkOutTime),
          rawCheckOutTime: matchedAtt.checkOutTime || null,
          durationHours: durationH,
          status: matchedAtt.status,
          faceVerified: matchedAtt.faceVerified,
          faceDistance: matchedAtt.faceDistance,
          isLiveVerified: Boolean(matchedAtt.isLiveVerified),
          checkInPhoto: matchedAtt.checkInPhoto || null,
          checkOutPhoto: matchedAtt.checkOutPhoto || null,
          location: emp?.assignedOffice || 'Tại bến xuất phát',
          notes: matchedAtt.note || ''
        });
      } else {
        const tripStatus = isPastDeparture ? 'absent' : 'scheduled';
        const tripDuration = trip.arrivalTime ? +((new Date(trip.arrivalTime) - depDate) / 3600000).toFixed(1) : 6.0;

        mergedList.push({
          id: `trip_${trip._id}`,
          tripId: trip._id,
          tripRoute: routeName,
          busPlateNumber: plateNumber,
          date: depDate.toLocaleDateString('vi-VN'),
          rawDate: depDate,
          scheduledDepartureTime: formatShortTime(depDate),
          rawScheduledDepartureTime: depDate,
          checkInTime: '--:--:--',
          rawCheckInTime: null,
          checkOutTime: '--:--:--',
          rawCheckOutTime: null,
          durationHours: isPastDeparture ? 0 : tripDuration,
          status: tripStatus,
          faceVerified: false,
          faceDistance: null,
          isLiveVerified: false,
          checkInPhoto: null,
          checkOutPhoto: null,
          location: emp?.assignedOffice || 'Chưa check-in',
          notes: isPastDeparture ? 'Quá giờ khởi hành chưa check-in (Vắng)' : 'Chờ khởi hành'
        });
      }
    }

    // 3.2. Bổ sung các bản ghi 'Attendance' chưa khớp với chuyến xe nào
    for (const att of attRecords) {
      if (usedAttIds.has(att._id.toString())) continue;

      const crewInfo = histCrewMap[att._id.toString()];
      const tInfo = crewInfo?.tripId;
      const routeName = tInfo?.routeId?.name || (tInfo?.routeId?.startPoint ? `${tInfo.routeId.startPoint} -> ${tInfo.routeId.endPoint}` : 'Ca làm việc');
      const plateNumber = crewInfo?.busId?.plateNumber || tInfo?.busId?.plateNumber || '--';

      let durationH = att.totalHours || 0;
      if (att.status === 'active' && att.checkInTime) {
        const diffMs = Math.max(0, now - new Date(att.checkInTime));
        durationH = +(diffMs / 3600000).toFixed(1);
      } else if (att.checkInTime && att.checkOutTime) {
        const diffMs = Math.max(0, new Date(att.checkOutTime) - new Date(att.checkInTime));
        durationH = +(diffMs / 3600000).toFixed(1);
      } else if (!durationH) {
        durationH = 6.0;
      }

      mergedList.push({
        id: att._id,
        tripId: tInfo?._id || null,
        tripRoute: routeName,
        busPlateNumber: plateNumber,
        date: new Date(att.date || att.checkInTime || att.createdAt).toLocaleDateString('vi-VN'),
        rawDate: att.date || att.checkInTime || att.createdAt,
        scheduledDepartureTime: '--:--',
        rawScheduledDepartureTime: null,
        checkInTime: formatTime(att.checkInTime),
        rawCheckInTime: att.checkInTime || null,
        checkOutTime: formatTime(att.checkOutTime),
        rawCheckOutTime: att.checkOutTime || null,
        durationHours: durationH,
        status: att.status,
        faceVerified: att.faceVerified,
        faceDistance: att.faceDistance,
        isLiveVerified: Boolean(att.isLiveVerified),
        checkInPhoto: att.checkInPhoto || null,
        checkOutPhoto: att.checkOutPhoto || null,
        location: emp?.assignedOffice || 'Tại bến xe',
        notes: att.note || ''
      });
    }

    // Lọc theo query status nếu có
    let finalHistory = mergedList;
    if (req.query.status && req.query.status !== 'all') {
      finalHistory = finalHistory.filter(item => item.status === req.query.status);
    }
    if (req.query.faceVerified !== undefined && req.query.faceVerified !== 'all') {
      const wantVerified = req.query.faceVerified === 'true';
      finalHistory = finalHistory.filter(item => item.faceVerified === wantVerified);
    }

    finalHistory.sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0));

    // Tính toán chỉ số KPI tóm tắt
    const totalShifts = finalHistory.length;
    const activeShiftsCount = finalHistory.filter(h => h.status === 'active').length;
    const closedShiftsCount = finalHistory.filter(h => h.status === 'closed').length;
    const absentShiftsCount = finalHistory.filter(h => h.status === 'absent').length;
    const totalWorkHours = finalHistory.reduce((acc, h) => acc + (h.durationHours || 0), 0);
    const faceVerifiedCount = finalHistory.filter(h => h.faceVerified).length;
    const faceRate = totalShifts > 0 ? Math.round((faceVerifiedCount / totalShifts) * 100) : 100;

    const approvedLeaves = await LeaveRequest.find({
      userId,
      status: 'approved'
    }).lean();

    const expectedDays = 26;
    let attendanceRate = Math.min(100, Math.round(((closedShiftsCount + activeShiftsCount + approvedLeaves.length) / expectedDays) * 100));
    if (totalShifts >= 18) attendanceRate = Math.min(100, Math.max(95, attendanceRate));

    const summary = {
      totalShifts,
      activeShiftsCount,
      closedShiftsCount,
      absentShiftsCount,
      totalWorkHours: +totalWorkHours.toFixed(1),
      avgHoursPerShift: totalShifts > 0 ? +(totalWorkHours / totalShifts).toFixed(1) : 0,
      faceVerifiedCount,
      faceRate,
      leaveDaysCount: approvedLeaves.length,
      attendanceRate
    };

    const hasFaceEnrolled = Boolean(emp && emp.faceRegistered && Array.isArray(emp.faceDescriptors) && emp.faceDescriptors.length > 0);
    return res.status(200).json({
      success: true,
      faceRegistered: hasFaceEnrolled,
      facePhoto: emp?.facePhoto || null,
      faceDescriptors: emp && Array.isArray(emp.faceDescriptors) ? emp.faceDescriptors : [],
      todayDuties,
      activeTrip: activeDuty?.status === 'active' ? activeDuty : null,
      todayStatus: finalTodayStatus,
      todayRecord,
      history: finalHistory,
      summary
    });
  } catch (err) {
    console.error('[getMyAttendance Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy lịch sử chấm công.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. GIÁM SÁT TOÀN BỘ CHẤM CÔNG HÔM NAY (ops_manager / ticket_manager)
// GET /api/attendance/today?date=2026-10-18&role=all
// ═══════════════════════════════════════════════════════════════════════════
exports.getTodayAttendance = async (req, res) => {
  try {
    const { dateStr, dayStart, dayEnd } = getDayRangeVN(req.query.date);

    // 1. Lấy tất cả các Chuyến xe trong ngày được chọn
    const trips = await Trip.find({
      departureTime: { $gte: dayStart, $lte: dayEnd },
      journeyStatus: { $ne: 'cancelled' }
    })
      .sort({ departureTime: 1 })
      .populate('routeId', 'name startPoint endPoint')
      .populate('busId', 'plateNumber type')
      .lean();

    // 2. Lấy thông tin tài khoản của toàn bộ nhân viên & quản lý đang hoạt động
    const roleFilter = req.query.role;
    const allStaffRoles = ['driver', 'attendant', 'ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager'];

    const allStaff = await User.find({
      role: { $in: allStaffRoles },
      status: 'active'
    }).select('_id name phone role branch').lean();

    const staffIds = allStaff.map(s => s._id);
    const empProfiles = await EmployeeProfile.find({
      _id: { $in: staffIds }
    }).select('_id faceRegistered facePhoto faceDescriptors').lean();

    const empMap = {};
    empProfiles.forEach(ep => {
      empMap[ep._id.toString()] = ep;
    });

    const staffByPhone = {};
    const staffByName = {};
    allStaff.forEach(s => {
      const ep = empMap[s._id.toString()];
      const enrichedStaff = {
        ...s,
        faceRegistered: Boolean(ep?.faceRegistered && Array.isArray(ep?.faceDescriptors) && ep?.faceDescriptors?.length > 0),
        facePhoto: ep?.facePhoto || null
      };
      if (s.phone) staffByPhone[s.phone] = enrichedStaff;
      if (s.name) staffByName[s.name.trim().toLowerCase()] = enrichedStaff;
    });

    // 3. Lấy tất cả bản ghi chấm công trong ngày từ bảng chung Attendance
    const records = await Attendance.find({
      date: { $gte: dayStart, $lte: dayEnd }
    }).lean();

    const attIds = records.map(r => r._id);
    const crewRecords = await CrewAttendance.find({ attendanceId: { $in: attIds } }).lean();
    const agentRecords = await AgentAttendance.find({ attendanceId: { $in: attIds } }).lean();

    const crewByTripAndUser = {};
    crewRecords.forEach(c => {
      if (c.tripId) {
        crewByTripAndUser[c.tripId.toString()] = c;
      }
    });

    const attMap = {};
    records.forEach(r => {
      attMap[r.userId.toString()] = r;
    });

    // Lấy danh sách đơn nghỉ phép hợp lệ trong ngày
    const approvedLeaves = await LeaveRequest.find({
      status: 'approved',
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    }).lean();
    const leaveMap = {};
    approvedLeaves.forEach(l => {
      leaveMap[l.userId.toString()] = l;
    });

    const now = new Date();
    const duties = [];
    const staffAssignedMap = {};

    // 4. Duyệt qua từng chuyến xe để tạo danh sách phân công nhiệm vụ chấm công
    for (const trip of trips) {
      const routeName = trip.routeId?.name || (trip.routeId?.startPoint ? `${trip.routeId.startPoint} -> ${trip.routeId.endPoint}` : 'Tuyến chưa đặt tên');
      const plateNumber = trip.busId?.plateNumber || '--';
      const depDate = new Date(trip.departureTime);
      const isPastDeparture = now > depDate;
      const overdueMinutes = isPastDeparture ? Math.floor((now - depDate) / 60000) : 0;

      // 4.1. Nhiệm vụ Tài xế (Driver Duty)
      if (trip.driver?.phone || trip.driver?.name) {
        const staff = staffByPhone[trip.driver.phone] || staffByName[trip.driver.name?.trim().toLowerCase()] || {
          _id: null,
          name: trip.driver.name,
          phone: trip.driver.phone,
          role: 'driver',
          faceRegistered: false,
          facePhoto: null
        };

        if (staff._id) staffAssignedMap[staff._id.toString()] = true;

        const crewItem = crewByTripAndUser[trip._id.toString()];
        const rec = crewItem ? records.find(r => r._id.toString() === crewItem.attendanceId.toString()) : (staff._id ? attMap[staff._id.toString()] : null);
        let status = 'scheduled';
        let note = '';

        if (rec) {
          status = rec.status;
          note = rec.note || '';
        } else if (isPastDeparture) {
          status = 'absent';
          note = `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`;
          
          // Tự động đồng bộ bản ghi vắng vào DB nếu nhân viên có tài khoản (3NF)
          if (staff._id) {
            Attendance.findOneAndUpdate(
              { userId: staff._id, date: dayStart },
              {
                $setOnInsert: {
                  userId: staff._id,
                  date: dayStart,
                  status: 'absent',
                  attendanceType: 'crew',
                  faceVerified: false,
                  note: `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`
                }
              },
              { upsert: true, new: true }
            ).then(newAtt => {
              if (newAtt) {
                CrewAttendance.findOneAndUpdate(
                  { attendanceId: newAtt._id },
                  {
                    $setOnInsert: {
                      attendanceId: newAtt._id,
                      tripId: trip._id,
                      busId: trip.busId?._id || trip.busId,
                      roleInTrip: 'driver_main',
                      punctuality: 'late'
                    }
                  },
                  { upsert: true }
                ).catch(e => {});
              }
            }).catch(err => console.error('[Auto Absent Driver Err]:', err));
          }
        }

        duties.push({
          id: rec?._id || `duty_${trip._id}_driver`,
          dutyId: `${trip._id}_driver`,
          tripId: trip._id,
          tripRoute: routeName,
          busPlateNumber: plateNumber,
          scheduledDepartureTime: depDate,
          departureTimeStr: formatShortTime(depDate),
          userId: staff._id ? staff._id.toString() : null,
          name: staff.name,
          phone: staff.phone,
          role: 'driver',
          faceRegistered: Boolean(staff.faceRegistered),
          facePhoto: staff.facePhoto || null,
          status,
          isPastDeparture,
          overdueMinutes,
          note,
          checkInTime: formatTime(rec?.checkInTime),
          checkOutTime: formatTime(rec?.checkOutTime),
          faceVerified: rec ? rec.faceVerified : false,
          faceDistance: rec?.faceDistance !== undefined ? rec.faceDistance : null,
          isLiveVerified: rec ? Boolean(rec.isLiveVerified) : false,
          checkInPhoto: rec?.checkInPhoto || null,
          checkOutPhoto: rec?.checkOutPhoto || null,
          location: status === 'absent' ? 'Chưa có mặt tại bến' : 'Chờ xuất bến',
          gps: rec?.gpsLat && rec?.gpsLng ? `${rec.gpsLat.toFixed(4)}°N, ${rec.gpsLng.toFixed(4)}°E` : '--'
        });
      }

      // 4.2. Nhiệm vụ Phụ xe (Assistant Duty)
      if (trip.assistant?.phone || trip.assistant?.name) {
        const staff = staffByPhone[trip.assistant.phone] || staffByName[trip.assistant.name?.trim().toLowerCase()] || {
          _id: null,
          name: trip.assistant.name,
          phone: trip.assistant.phone,
          role: 'attendant',
          faceRegistered: false,
          facePhoto: null
        };

        if (staff._id) staffAssignedMap[staff._id.toString()] = true;

        const crewItem = crewByTripAndUser[trip._id.toString()];
        const rec = crewItem ? records.find(r => r._id.toString() === crewItem.attendanceId.toString()) : (staff._id ? attMap[staff._id.toString()] : null);
        let status = 'scheduled';
        let note = '';

        if (rec) {
          status = rec.status;
          note = rec.note || '';
        } else if (isPastDeparture) {
          status = 'absent';
          note = `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`;

          if (staff._id) {
            Attendance.findOneAndUpdate(
              { userId: staff._id, date: dayStart },
              {
                $setOnInsert: {
                  userId: staff._id,
                  date: dayStart,
                  status: 'absent',
                  attendanceType: 'crew',
                  faceVerified: false,
                  note: `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`
                }
              },
              { upsert: true, new: true }
            ).then(newAtt => {
              if (newAtt) {
                CrewAttendance.findOneAndUpdate(
                  { attendanceId: newAtt._id },
                  {
                    $setOnInsert: {
                      attendanceId: newAtt._id,
                      tripId: trip._id,
                      busId: trip.busId?._id || trip.busId,
                      roleInTrip: 'attendant',
                      punctuality: 'late'
                    }
                  },
                  { upsert: true }
                ).catch(e => {});
              }
            }).catch(err => console.error('[Auto Absent Assistant Err]:', err));
          }
        }

        duties.push({
          id: rec?._id || `duty_${trip._id}_attendant`,
          dutyId: `${trip._id}_attendant`,
          tripId: trip._id,
          tripRoute: routeName,
          busPlateNumber: plateNumber,
          scheduledDepartureTime: depDate,
          departureTimeStr: formatShortTime(depDate),
          userId: staff._id ? staff._id.toString() : null,
          name: staff.name,
          phone: staff.phone,
          role: 'attendant',
          faceRegistered: Boolean(staff.faceRegistered),
          facePhoto: staff.facePhoto || null,
          status,
          isPastDeparture,
          overdueMinutes,
          note,
          checkInTime: formatTime(rec?.checkInTime),
          checkOutTime: formatTime(rec?.checkOutTime),
          faceVerified: rec ? rec.faceVerified : false,
          faceDistance: rec?.faceDistance !== undefined ? rec.faceDistance : null,
          isLiveVerified: rec ? Boolean(rec.isLiveVerified) : false,
          checkInPhoto: rec?.checkInPhoto || null,
          checkOutPhoto: rec?.checkOutPhoto || null,
          location: status === 'absent' ? 'Chưa có mặt tại bến' : 'Chờ xuất bến',
          gps: rec?.gpsLat && rec?.gpsLng ? `${rec.gpsLat.toFixed(4)}°N, ${rec.gpsLng.toFixed(4)}°E` : '--'
        });
      }
    }

    // 4.3. Bổ sung nhân sự Quản lý & Văn phòng (ops_manager, fleet_manager, ticket_manager, ticket_agent)
    const officeStaff = allStaff.filter(s => ['ticket_agent', 'ticket_manager', 'ops_manager', 'fleet_manager'].includes(s.role));
    for (const staff of officeStaff) {
      staffAssignedMap[staff._id.toString()] = true;
      const rec = attMap[staff._id.toString()];
      const leave = leaveMap[staff._id.toString()];
      let status = 'scheduled';
      let note = '';
      let isPastDeparture = false;

      let shiftEndTime = new Date(dayEnd);
      if (staff.role === 'ticket_agent') {
        const isEvening = staff.shiftType === 'evening';
        shiftEndTime = new Date(dayStart);
        shiftEndTime.setHours(isEvening ? 22 : 14, isEvening ? 0 : 30, 0, 0);
      } else {
        shiftEndTime = new Date(dayStart);
        shiftEndTime.setHours(17, 0, 0, 0);
      }

      if (rec) {
        status = rec.status;
        note = rec.note || '';
      } else if (leave) {
        status = 'on_leave';
        note = `Nghỉ phép (${leave.leaveType || 'Có đơn đã duyệt'})`;
      } else if (now > shiftEndTime || dayEnd < now) {
        status = 'absent';
        isPastDeparture = true;
        note = 'Hết ca trực chưa chấm công (Vắng không phép)';
      } else {
        status = 'scheduled';
        note = 'Chờ nhận ca làm việc';
      }

      const roleRouteName = 
        staff.role === 'ops_manager' ? 'Điều hành & Giám sát Vận tải' :
        staff.role === 'fleet_manager' ? 'Quản lý & Bảo dưỡng Đội xe' :
        staff.role === 'ticket_manager' ? 'Quản lý & Giám sát Phòng vé' :
        'Trực ca quầy vé & CSKH';

      const roleLocation = 
        staff.role === 'ops_manager' ? 'Trung tâm Điều hành Vận tải TP.HCM' :
        staff.role === 'fleet_manager' ? 'Trạm Quản lý Đội xe' :
        staff.role === 'ticket_manager' ? 'Văn phòng Quản lý Phòng vé' :
        'Quầy vé bến xe';

      duties.push({
        id: rec?._id || `duty_${staff._id}_${staff.role}`,
        dutyId: `duty_${staff._id}_${staff.role}`,
        tripId: null,
        tripRoute: roleRouteName,
        busPlateNumber: roleLocation,
        scheduledDepartureTime: null,
        departureTimeStr: '07:30',
        userId: staff._id.toString(),
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        faceRegistered: Boolean(staff.faceRegistered),
        facePhoto: staff.facePhoto || null,
        status,
        isPastDeparture,
        overdueMinutes: 0,
        note: note || (status === 'scheduled' ? 'Chờ nhận ca làm việc' : ''),
        checkInTime: formatTime(rec?.checkInTime),
        checkOutTime: formatTime(rec?.checkOutTime),
        faceVerified: rec ? rec.faceVerified : false,
        faceDistance: rec?.faceDistance !== undefined ? rec.faceDistance : null,
        isLiveVerified: rec ? Boolean(rec.isLiveVerified) : false,
        checkInPhoto: rec?.checkInPhoto || null,
        checkOutPhoto: rec?.checkOutPhoto || null,
        location: roleLocation,
        gps: rec?.gpsLat && rec?.gpsLng ? `${rec.gpsLat.toFixed(4)}°N, ${rec.gpsLng.toFixed(4)}°E` : '--'
      });
    }

    // 5. Thống kê tổng hợp KPI
    let finalDuties = duties;
    if (roleFilter && roleFilter !== 'all') {
      finalDuties = duties.filter(d => d.role === roleFilter);
    }

    const totalAssigned = finalDuties.length;
    const checkedInCount = finalDuties.filter(d => d.status === 'active' || d.status === 'closed').length;
    const closedCount = finalDuties.filter(d => d.status === 'closed').length;
    const activeCount = finalDuties.filter(d => d.status === 'active').length;
    const absentCount = finalDuties.filter(d => d.status === 'absent').length;
    const scheduledCount = finalDuties.filter(d => d.status === 'scheduled').length;

    const stats = {
      totalAssigned,
      checkedInCount,
      activeCount,
      closedCount,
      absentCount,
      scheduledCount,
      attendanceRate: totalAssigned > 0 ? Math.round((checkedInCount / totalAssigned) * 100) : 0
    };

    // Danh sách nhân sự chưa được phân công nhiệm vụ hôm nay
    const unassignedStaff = allStaff
      .filter(s => !staffAssignedMap[s._id.toString()])
      .map(s => ({
        id: s._id,
        name: s.name,
        phone: s.phone,
        role: s.role,
        faceRegistered: Boolean(s.faceRegistered),
        facePhoto: s.facePhoto || null
      }));

    return res.status(200).json({
      success: true,
      date: dateStr,
      stats,
      tripsCount: trips.length,
      attendance: finalDuties,
      unassignedStaff
    });
  } catch (err) {
    console.error('[getTodayAttendance Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu chấm công.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. THỐNG KÊ TỔNG HỢP THEO THÁNG (general_manager)
// GET /api/attendance/stats?month=10&year=2026
// ═══════════════════════════════════════════════════════════════════════════
exports.getAttendanceStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const monthlyStats = [];
    for (let m = 1; m <= 12; m++) {
      const firstDay = new Date(year, m - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(year, m, 0, 23, 59, 59, 999);

      const [totalRecords, presentRecords, absentRecords] = await Promise.all([
        Attendance.countDocuments({ date: { $gte: firstDay, $lte: lastDay } }),
        Attendance.countDocuments({
          date: { $gte: firstDay, $lte: lastDay },
          status: { $in: ['active', 'closed'] }
        }),
        Attendance.countDocuments({
          date: { $gte: firstDay, $lte: lastDay },
          status: 'absent'
        })
      ]);

      monthlyStats.push({
        month: m,
        year,
        label: `T${m}/${year}`,
        totalRecords,
        presentRecords,
        absentRecords,
        attendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0
      });
    }

    const firstDayOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const lastDayOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Chuẩn hóa 3NF: $lookup sang bảng users để lấy name, phone, role
    const absentDetails = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
          status: 'absent'
        }
      },
      {
        $group: {
          _id: '$userId',
          absentDays: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          absentDays: 1,
          name: '$userInfo.name',
          phone: '$userInfo.phone',
          role: '$userInfo.role'
        }
      },
      { $sort: { absentDays: -1 } },
      { $limit: 10 }
    ]);

    const totalStaff = await User.countDocuments({
      role: { $in: ['driver', 'attendant'] },
      status: 'active'
    });

    const activeStaff = await User.find({
      role: { $in: ['driver', 'attendant'] },
      status: 'active'
    }).select('_id').lean();
    const activeStaffIds = activeStaff.map(s => s._id);

    const faceRegisteredCount = await EmployeeProfile.countDocuments({
      _id: { $in: activeStaffIds },
      faceRegistered: true,
      'faceDescriptors.0': { $exists: true }
    });

    const currentMonthStats = monthlyStats.find(s => s.month === month) || {};

    return res.status(200).json({
      success: true,
      year,
      currentMonth: month,
      kpi: {
        totalStaff,
        faceRegisteredCount,
        faceRegistrationRate: totalStaff > 0 ? Math.round((faceRegisteredCount / totalStaff) * 100) : 0,
        presentThisMonth: currentMonthStats.presentRecords || 0,
        absentThisMonth: currentMonthStats.absentRecords || 0,
        attendanceRate: currentMonthStats.attendanceRate || 0
      },
      monthlyStats,
      topAbsent: absentDetails.map(a => ({
        name: a.name || 'Nhân viên',
        phone: a.phone || '--',
        role: a.role || 'driver',
        absentDays: a.absentDays
      }))
    });
  } catch (err) {
    console.error('[getAttendanceStats Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thống kê chấm công.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. ĐẶT LẠI (RESET) DỮ LIỆU CA TRỰC HÔM NAY ĐỂ PHỤC VỤ TEST / DEMO
// DELETE /api/attendance/reset-today
// ═══════════════════════════════════════════════════════════════════════════
exports.resetTodayAttendance = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);
    const { dayStart, dayEnd } = getDayRangeVN();

    // Tìm các bản ghi Attendance hôm nay của user
    const todayAtts = await Attendance.find({
      userId,
      $or: [
        { date: { $gte: dayStart, $lte: dayEnd } },
        { createdAt: { $gte: dayStart, $lte: dayEnd } }
      ]
    }).select('_id');

    const attIds = todayAtts.map(a => a._id);

    // 1. Xóa các bản ghi con liên kết tương ứng
    await CrewAttendance.deleteMany({ attendanceId: { $in: attIds } });
    await AgentAttendance.deleteMany({ attendanceId: { $in: attIds } });

    // 2. Xóa toàn bộ bản ghi chấm công ca trực hôm nay của nhân viên
    const attResult = await Attendance.deleteMany({ _id: { $in: attIds } });

    // 3. Tìm và đồng bộ đặt lại các chuyến xe hôm nay của nhân viên
    const tripFilter = {
      departureTime: { $gte: dayStart, $lte: dayEnd }
    };
    if (user?.role === 'driver') {
      tripFilter['driver.phone'] = user.phone;
    } else if (user?.role === 'attendant') {
      tripFilter['assistant.phone'] = user.phone;
    }

    const todayTrips = await Trip.find(tripFilter);
    const now = new Date();

    for (const t of todayTrips) {
      t.journeyStatus = 'scheduled';
      t.currentStopIndex = -1;
      t.journeyLogs = [];
      t.liveGps = null;

      // Nếu giờ xuất bến đã trôi qua trong quá khứ, tự động lùi sau 20 phút để phục vụ kiểm thử
      if (new Date(t.departureTime) < now) {
        t.departureTime = new Date(now.getTime() + 20 * 60 * 1000);
      }
      await t.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Đã đặt lại dữ liệu ca trực và đồng bộ chuyến xe hôm nay thành công.',
      deletedCount: attResult.deletedCount,
      resetTripsCount: todayTrips.length
    });
  } catch (err) {
    console.error('[resetTodayAttendance Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đặt lại dữ liệu ca trực.' });
  }
};
