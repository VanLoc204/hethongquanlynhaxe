const Attendance = require('../models/Attendance');
const User = require('../models/User');
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
// POST /api/v1/attendance/register-face
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

    if (!['driver', 'attendant', 'ticket_agent', 'ticket_manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ có thể đăng ký khuôn mặt cho Tài xế, Phụ xe, Nhân viên bán vé hoặc Quản lý phòng vé.'
      });
    }

    user.faceDescriptors = faceDescriptors;
    user.faceRegistered = true;
    if (facePhoto) {
      user.facePhoto = facePhoto;
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Đã đăng ký khuôn mặt thành công cho ${user.name} (${faceDescriptors.length} mẫu).`,
      data: {
        userId: user._id,
        name: user.name,
        faceRegistered: true,
        facePhoto: user.facePhoto,
        samplesCount: faceDescriptors.length
      }
    });
  } catch (err) {
    console.error('[registerFace Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký khuôn mặt.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. CHECK-IN (Bắt đầu ca trực theo chuyến xe)
// POST /api/v1/attendance/check-in
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

    const user = await User.findById(userId).select('+faceDescriptors +faceRegistered');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

    if (!user.faceRegistered || !user.faceDescriptors || user.faceDescriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa đăng ký khuôn mặt Face ID. Vui lòng liên hệ Quản lý Vận tải để được kích hoạt khuôn mặt.'
      });
    }

    // Nhận diện khuôn mặt sinh trắc học
    const THRESHOLD = 0.38;
    const distances = user.faceDescriptors.map(stored => euclideanDistance(faceDescriptor, stored));
    const bestDistance = Math.min(...distances);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

    if (bestDistance > THRESHOLD || avgDistance > 0.42) {
      return res.status(401).json({
        success: false,
        message: `Khuôn mặt trước camera không trùng khớp với tài xế ${user.name} (sai số: ${bestDistance.toFixed(4)}, ngưỡng cho phép: ${THRESHOLD}). Vui lòng không điểm danh hộ!`,
        faceDistance: bestDistance
      });
    }

    const now = new Date();
    const { dayStart, dayEnd } = getDayRangeVN();

    // Xác định chuyến xe cần Check-in
    let targetTrip = null;
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
          const existingForTrip = await Attendance.findOne({ userId, tripId: t._id });
          if (!existingForTrip || existingForTrip.status !== 'closed') {
            targetTrip = t;
            break;
          }
        }
        if (!targetTrip) targetTrip = assignedTrips[assignedTrips.length - 1];
      }
    }

    // Kiểm tra trạng thái nếu đã check-in cho chuyến này rồi
    if (targetTrip) {
      const existing = await Attendance.findOne({ userId, tripId: targetTrip._id });
      if (existing) {
        if (existing.status === 'active') {
          return res.status(400).json({
            success: false,
            message: `Bạn đã bắt đầu ca cho chuyến này từ ${formatTime(existing.checkInTime)}. Hãy tan ca (Check-out) khi hoàn thành chuyến đi!`,
            data: existing
          });
        }
        if (existing.status === 'closed') {
          return res.status(400).json({
            success: false,
            message: `Bạn đã hoàn thành ca cho chuyến này (vào lúc ${formatTime(existing.checkInTime)} — tan ca ${formatTime(existing.checkOutTime)}).`
          });
        }
      }
    }

    const routeName = targetTrip?.routeId?.name || (targetTrip?.routeId?.startPoint ? `${targetTrip.routeId.startPoint} -> ${targetTrip.routeId.endPoint}` : 'Theo lịch phân công');
    const plateNumber = targetTrip?.busId?.plateNumber || '--';
    const scheduledDepTime = targetTrip?.departureTime || null;

    const filter = targetTrip ? { userId, tripId: targetTrip._id } : { userId, date: dayStart };
    const attendance = await Attendance.findOneAndUpdate(
      filter,
      {
        $set: {
          userId,
          employeeName: user.name,
          employeePhone: user.phone,
          role: user.role,
          date: dayStart,
          tripId: targetTrip ? targetTrip._id : null,
          tripRoute: routeName,
          busPlateNumber: plateNumber,
          scheduledDepartureTime: scheduledDepTime,
          checkInTime: now,
          status: 'active',
          faceVerified: true,
          faceDistance: parseFloat(bestDistance.toFixed(4)),
          isLiveVerified: Boolean(isLiveVerified),
          checkInPhoto: checkInPhoto || null,
          location: location || 'Tại bến xuất bến',
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
          note: `Đã check-in thành công`
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Check-in thành công chuyến ${routeName} (${plateNumber})! Xin chào ${user.name} — Chúc bạn một chuyến đi thượng lộ bình an.`,
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
// 3. CHECK-OUT (Tan ca chuyến xe)
// POST /api/v1/attendance/check-out
// Body: { faceDescriptor, tripId?, checkOutPhoto?, location? }
// ═══════════════════════════════════════════════════════════════════════════
exports.checkOut = async (req, res) => {
  try {
    const { faceDescriptor, tripId, checkOutPhoto, location } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ success: false, message: 'Dữ liệu khuôn mặt không hợp lệ.' });
    }

    const user = await User.findById(userId).select('+faceDescriptors');
    if (!user || !user.faceDescriptors || user.faceDescriptors.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa đăng ký khuôn mặt.' });
    }

    const THRESHOLD = 0.38;
    const distances = user.faceDescriptors.map(stored => euclideanDistance(faceDescriptor, stored));
    const bestDistance = Math.min(...distances);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    if (bestDistance > THRESHOLD || avgDistance > 0.42) {
      return res.status(401).json({
        success: false,
        message: `Khuôn mặt không trùng khớp với tài xế ${user.name} khi tan ca (sai số: ${bestDistance.toFixed(4)}, ngưỡng: ${THRESHOLD}).`,
        faceDistance: bestDistance
      });
    }

    // Tìm bản ghi đang active của nhân viên
    let query = { userId, status: 'active' };
    if (tripId) {
      query.tripId = tripId;
    }
    const attendance = await Attendance.findOne(query).sort({ checkInTime: -1 });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa có chuyến xe nào đang trực ca để tan ca. Vui lòng check-in trước khi chạy chuyến!'
      });
    }

    const now = new Date();
    attendance.checkOutTime = now;
    attendance.status = 'closed';
    if (checkOutPhoto) attendance.checkOutPhoto = checkOutPhoto;
    if (location) {
      attendance.note = attendance.note ? `${attendance.note} | Tan ca: ${location}` : `Tan ca: ${location}`;
    }
    await attendance.save();

    const diffMs = now - (attendance.checkInTime || now);
    const totalHours = Math.floor(diffMs / 3_600_000);
    const totalMinutes = Math.floor((diffMs % 3_600_000) / 60_000);

    return res.status(200).json({
      success: true,
      message: `Tan ca thành công cho chuyến ${attendance.tripRoute || ''}! Thời gian thực hiện: ${totalHours} giờ ${totalMinutes} phút.`,
      data: {
        tripId: attendance.tripId,
        tripRoute: attendance.tripRoute,
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
// 4. XEM LỊCH SỬ CHẤM CÔNG CỦA BẢN THÂN (driver / attendant)
// GET /api/v1/attendance/mine
// ═══════════════════════════════════════════════════════════════════════════
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const limit = parseInt(req.query.limit) || 100;

    const user = await User.findById(userId).select('name phone role faceRegistered facePhoto +faceDescriptors').lean();

    const records = await Attendance.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const { dayStart, dayEnd } = getDayRangeVN();

    // ── Đối với Nhân viên Bán vé / Quản lý phòng vé: lấy dữ liệu từ ShiftSession ──
    if (user && ['ticket_agent', 'ticket_manager'].includes(user.role)) {
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
      if (req.query.counterNumber && req.query.counterNumber !== 'all') {
        shiftQuery.counterNumber = req.query.counterNumber;
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

      // Kết hợp thêm các bản ghi chấm công từ collection 'Attendance' của nhân viên bán vé
      const attTicketQuery = { userId, role: { $in: ['ticket_agent', 'ticket_manager'] } };
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

      let totalWorkHours = 0;
      let totalCashRevenue = 0;
      let totalCashlessRevenue = 0;
      let totalTicketsSold = 0;
      let faceVerifiedCount = 0;
      let verifiedCashCount = 0;
      let activeShiftsCount = 0;
      let closedShiftsCount = 0;

      const nowTime = new Date();
      const combinedHistory = [];
      const seenDates = new Set();

      // 1. Nạp từ ca trực quầy bán vé (ShiftSession)
      shiftHistory.forEach(s => {
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
        totalCashRevenue += Number(s.cashRevenue || 0);
        totalCashlessRevenue += Number(s.cashlessRevenue || 0);
        const ticketsCount = Number(s.ticketsSold?.length || 0);
        totalTicketsSold += ticketsCount;
        if (s.faceVerified) faceVerifiedCount += 1;
        if (s.reconciliationStatus === 'verified') verifiedCashCount += 1;

        const dateKey = new Date(s.startTime).toLocaleDateString('vi-VN');
        seenDates.add(dateKey);

        combinedHistory.push({
          id: s._id,
          tripRoute: s.counterNumber || 'Quầy vé trực',
          busPlateNumber: `Quỹ: ${(s.initialCash || 0).toLocaleString('vi-VN')}đ`,
          counterNumber: s.counterNumber || 'Quầy vé trực',
          officeName: s.officeName || 'Văn phòng chi nhánh',
          branchId: s.branchId || 'sg',
          date: dateKey,
          startTime: s.startTime,
          endTime: s.endTime,
          checkInTime: formatTime(s.startTime),
          checkOutTime: s.endTime ? formatTime(s.endTime) : '--:--:--',
          durationHours: durationH,
          status: s.status,
          initialCash: s.initialCash || 0,
          cashRevenue: s.cashRevenue || 0,
          cashlessRevenue: s.cashlessRevenue || 0,
          totalRevenue: Number(s.cashRevenue || 0) + Number(s.cashlessRevenue || 0),
          ticketsCount,
          reconciliationStatus: s.reconciliationStatus || 'pending',
          faceVerified: Boolean(s.faceVerified),
          faceDistance: s.faceDistance,
          isLiveVerified: Boolean(s.isLiveVerified),
          checkInPhoto: s.checkInPhoto || null,
          checkOutPhoto: s.checkOutPhoto || null,
          location: s.location || s.counterNumber,
          notes: s.notes || ''
        });
      });

      // 2. Bổ sung các bản ghi chấm công từ 'Attendance' chưa có trong ShiftSession
      attTicketRecords.forEach(att => {
        const attDateKey = new Date(att.date || att.checkInTime || att.createdAt).toLocaleDateString('vi-VN');
        if (!seenDates.has(attDateKey)) {
          let durationH = 0;
          if (att.status === 'active') {
            activeShiftsCount += 1;
            const diffMs = Math.max(0, nowTime - new Date(att.checkInTime || att.createdAt));
            durationH = +(diffMs / 3600000).toFixed(1);
          } else {
            closedShiftsCount += 1;
            if (att.checkOutTime && att.checkInTime) {
              const diffMs = Math.max(0, new Date(att.checkOutTime) - new Date(att.checkInTime));
              durationH = +(diffMs / 3600000).toFixed(1);
            } else {
              durationH = 8.0;
            }
          }
          totalWorkHours += durationH;
          if (att.faceVerified) faceVerifiedCount += 1;

          combinedHistory.push({
            id: att._id,
            tripRoute: att.location || 'Quầy vé trực',
            busPlateNumber: 'Quầy bán vé',
            counterNumber: att.location || 'Quầy vé trực',
            officeName: 'Văn phòng chi nhánh',
            branchId: 'sg',
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
            location: att.location || 'Quầy vé',
            notes: att.note || ''
          });
        }
      });

      combinedHistory.sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));

      const approvedLeaves = await LeaveRequest.find({
        userId,
        status: 'approved'
      }).lean();

      const totalShifts = shiftHistory.length;
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

      return res.status(200).json({
        success: true,
        faceRegistered: Boolean(user.faceRegistered),
        facePhoto: user.facePhoto || null,
        faceDescriptors: Array.isArray(user.faceDescriptors) ? user.faceDescriptors : [],
        todayDuties: [],
        activeTrip: null,
        todayStatus: activeShift ? 'active' : latestShift && new Date(latestShift.startTime) >= dayStart ? latestShift.status : 'not_checked',
        todayRecord: activeShift || (latestShift && new Date(latestShift.startTime) >= dayStart ? latestShift : null),
        history: combinedHistory,
        summary
      });
    }

    // ── Đối với Tài xế & Phụ xe: Xử lý ca trực hôm nay & dữ liệu thật từ MongoDB ──
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

    const now = new Date();
    const todayDuties = myTodayTrips.map(t => {
      const routeName = t.routeId?.name || (t.routeId?.startPoint ? `${t.routeId.startPoint} -> ${t.routeId.endPoint}` : 'Chuyến xe theo phân công');
      const rec = records.find(r => r.tripId && r.tripId.toString() === t._id.toString());
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
      let activeTripInfo = null;
      if (activeAttendanceRecord.tripId) {
        activeTripInfo = await Trip.findById(activeAttendanceRecord.tripId)
          .populate('routeId', 'name startPoint endPoint')
          .populate('busId', 'plateNumber')
          .lean();
      }

      const activeRouteName = activeAttendanceRecord.tripRoute ||
        (activeTripInfo?.routeId?.name || (activeTripInfo?.routeId?.startPoint ? `${activeTripInfo.routeId.startPoint} -> ${activeTripInfo.routeId.endPoint}` : 'Chuyến xe đang phục vụ'));
      const activePlate = activeAttendanceRecord.busPlateNumber || activeTripInfo?.busId?.plateNumber || '--';

      todayDuties.unshift({
        tripId: activeAttendanceRecord.tripId || activeTripInfo?._id || null,
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
      todayRecord = records.find(r => r.tripId && r.tripId.toString() === activeDuty.tripId.toString() && r.status !== 'scheduled') || null;
    }
    if (!todayRecord) {
      todayRecord = records.find(r => {
        if (r.tripId && todayDuties.some(d => d.tripId && d.tripId.toString() === r.tripId.toString())) return true;
        const dIn = r.checkInTime ? new Date(r.checkInTime) : null;
        if (dIn && dIn >= dayStart && dIn <= dayEnd) return true;
        const dOut = r.checkOutTime ? new Date(r.checkOutTime) : null;
        if (dOut && dOut >= dayStart && dOut <= dayEnd) return true;
        const dDate = r.date ? new Date(r.date) : null;
        if (dDate && dDate >= dayStart && dDate <= dayEnd) return true;
        return false;
      }) || null;
    }

    // ── XÂY DỰNG LỊCH SỬ CHẤM CÔNG THẬT TỪ MONGODB (KẾT HỢP ATTENDANCE & TRIP) ──
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
        { scheduledDepartureTime: { $gte: from, $lte: to } },
        { createdAt: { $gte: from, $lte: to } }
      ];
      tripHistoryQuery.departureTime = { $gte: from, $lte: to };
    } else if (req.query.fromDate) {
      const from = new Date(req.query.fromDate);
      from.setHours(0, 0, 0, 0);
      attHistoryQuery.$or = [
        { date: { $gte: from } },
        { checkInTime: { $gte: from } },
        { scheduledDepartureTime: { $gte: from } },
        { createdAt: { $gte: from } }
      ];
      tripHistoryQuery.departureTime = { $gte: from };
    } else if (req.query.toDate) {
      const to = new Date(req.query.toDate);
      to.setHours(23, 59, 59, 999);
      attHistoryQuery.$or = [
        { date: { $lte: to } },
        { checkInTime: { $lte: to } },
        { scheduledDepartureTime: { $lte: to } },
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
        { scheduledDepartureTime: { $gte: startOfMonth, $lte: endOfMonth } },
        { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
      ];
      tripHistoryQuery.departureTime = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // 1. Lấy dữ liệu từ collection 'attendances' trong MongoDB
    const attRecords = await Attendance.find(attHistoryQuery)
      .sort({ date: -1, checkInTime: -1, createdAt: -1 })
      .limit(limit)
      .lean();

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

    // 3. Kết hợp (Merge) hai nguồn dữ liệu thật trong MongoDB
    const mergedList = [];
    const usedTripIds = new Set();
    const usedAttIds = new Set();

    // 3.1. Chuyến xe từ collection 'trips'
    for (const trip of assignedTrips) {
      const tIdStr = trip._id.toString();
      usedTripIds.add(tIdStr);

      const routeName = trip.routeId?.name || (trip.routeId?.startPoint ? `${trip.routeId.startPoint} -> ${trip.routeId.endPoint}` : 'Chuyến xe theo phân công');
      const plateNumber = trip.busId?.plateNumber || '--';
      const depDate = new Date(trip.departureTime);
      const isPastDeparture = now > depDate;

      const matchedAtt = attRecords.find(r => r.tripId && r.tripId.toString() === tIdStr);

      if (matchedAtt) {
        usedAttIds.add(matchedAtt._id.toString());
        let durationH = 0;
        if (matchedAtt.status === 'active' && matchedAtt.checkInTime) {
          const diffMs = Math.max(0, now - new Date(matchedAtt.checkInTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else if (matchedAtt.checkInTime && matchedAtt.checkOutTime) {
          const diffMs = Math.max(0, new Date(matchedAtt.checkOutTime) - new Date(matchedAtt.checkInTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else if (trip.arrivalTime && trip.departureTime) {
          const diffMs = Math.max(0, new Date(trip.arrivalTime) - new Date(trip.departureTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else {
          durationH = 6.0;
        }

        mergedList.push({
          id: matchedAtt._id,
          tripId: trip._id,
          tripRoute: matchedAtt.tripRoute || routeName,
          busPlateNumber: matchedAtt.busPlateNumber || plateNumber,
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
          faceVerified: Boolean(matchedAtt.faceVerified),
          faceDistance: matchedAtt.faceDistance,
          isLiveVerified: Boolean(matchedAtt.isLiveVerified),
          checkInPhoto: matchedAtt.checkInPhoto || null,
          checkOutPhoto: matchedAtt.checkOutPhoto || null,
          location: matchedAtt.location || (trip.routeId?.startPoint ? `Bến xe ${trip.routeId.startPoint}` : 'Bến xe trung tâm'),
          note: matchedAtt.note || ''
        });
      } else {
        let tripStatus = 'scheduled';
        let checkInTimeStr = '--:--:--';
        let checkOutTimeStr = '--:--:--';
        let durationH = 0;

        if (trip.arrivalTime && trip.departureTime) {
          const diffMs = Math.max(0, new Date(trip.arrivalTime) - new Date(trip.departureTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else {
          durationH = 6.0;
        }

        if (trip.journeyStatus === 'completed') {
          tripStatus = 'closed';
          checkInTimeStr = formatTime(depDate);
          checkOutTimeStr = trip.arrivalTime ? formatTime(trip.arrivalTime) : '--:--:--';
        } else if (trip.journeyStatus === 'in_transit') {
          tripStatus = 'active';
          checkInTimeStr = formatTime(depDate);
          const diffMs = Math.max(0, now - depDate);
          durationH = +(diffMs / 3600000).toFixed(1);
        } else if (isPastDeparture) {
          tripStatus = 'absent';
        }

        mergedList.push({
          id: `trip_${trip._id}`,
          tripId: trip._id,
          tripRoute: routeName,
          busPlateNumber: plateNumber,
          date: depDate.toLocaleDateString('vi-VN'),
          rawDate: depDate,
          scheduledDepartureTime: formatShortTime(depDate),
          rawScheduledDepartureTime: depDate,
          checkInTime: checkInTimeStr,
          rawCheckInTime: trip.journeyStatus === 'completed' || trip.journeyStatus === 'in_transit' ? depDate : null,
          checkOutTime: checkOutTimeStr,
          rawCheckOutTime: trip.arrivalTime || null,
          durationHours: durationH,
          status: tripStatus,
          faceVerified: false,
          faceDistance: null,
          isLiveVerified: false,
          checkInPhoto: null,
          checkOutPhoto: null,
          location: trip.routeId?.startPoint ? `Bến xe ${trip.routeId.startPoint}` : 'Bến xe trung tâm',
          note: trip.journeyStatus === 'completed' ? 'Chuyến xe đã hoàn thành theo lịch trình' : ''
        });
      }
    }

    // 3.2. Bổ sung các bản ghi trong 'attendances' không gắn với chuyến xe nào ở trên
    for (const att of attRecords) {
      if (!usedAttIds.has(att._id.toString())) {
        let durationH = 0;
        if (att.status === 'active' && att.checkInTime) {
          const diffMs = Math.max(0, now - new Date(att.checkInTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else if (att.checkInTime && att.checkOutTime) {
          const diffMs = Math.max(0, new Date(att.checkOutTime) - new Date(att.checkInTime));
          durationH = +(diffMs / 3600000).toFixed(1);
        } else {
          durationH = 6.0;
        }

        mergedList.push({
          id: att._id,
          tripId: att.tripId || null,
          tripRoute: att.tripRoute || 'Ca trực tăng cường / Tăng ca',
          busPlateNumber: att.busPlateNumber || '--',
          date: new Date(att.date || att.checkInTime || att.createdAt).toLocaleDateString('vi-VN'),
          rawDate: att.date || att.checkInTime || att.createdAt,
          scheduledDepartureTime: att.scheduledDepartureTime ? formatShortTime(att.scheduledDepartureTime) : '--:--',
          rawScheduledDepartureTime: att.scheduledDepartureTime || null,
          checkInTime: formatTime(att.checkInTime),
          rawCheckInTime: att.checkInTime || null,
          checkOutTime: formatTime(att.checkOutTime),
          rawCheckOutTime: att.checkOutTime || null,
          durationHours: durationH,
          status: att.status,
          faceVerified: Boolean(att.faceVerified),
          faceDistance: att.faceDistance,
          isLiveVerified: Boolean(att.isLiveVerified),
          checkInPhoto: att.checkInPhoto || null,
          checkOutPhoto: att.checkOutPhoto || null,
          location: att.location || 'Bến xe',
          note: att.note || ''
        });
      }
    }

    mergedList.sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0));

    let finalHistory = mergedList;
    if (req.query.status && req.query.status !== 'all') {
      finalHistory = finalHistory.filter(item => item.status === req.query.status);
    }
    if (req.query.faceVerified !== undefined && req.query.faceVerified !== 'all') {
      const wantVerified = req.query.faceVerified === 'true';
      finalHistory = finalHistory.filter(item => item.faceVerified === wantVerified);
    }

    let totalWorkHours = 0;
    let activeTripsCount = 0;
    let closedTripsCount = 0;
    let absentTripsCount = 0;
    let faceVerifiedCount = 0;

    finalHistory.forEach(r => {
      totalWorkHours += (r.durationHours || 0);
      if (r.status === 'active') activeTripsCount += 1;
      else if (r.status === 'closed') closedTripsCount += 1;
      else if (r.status === 'absent') absentTripsCount += 1;
      if (r.faceVerified) faceVerifiedCount += 1;
    });

    const combinedCrewHistory = finalHistory.slice(0, limit);

    const approvedLeaves = await LeaveRequest.find({
      userId,
      status: 'approved'
    }).lean();

    const totalTrips = finalHistory.length;
    const faceRate = totalTrips > 0 ? Math.round((faceVerifiedCount / totalTrips) * 100) : 100;
    const expectedDays = 26;
    let attendanceRate = Math.min(100, Math.round(((closedTripsCount + approvedLeaves.length) / expectedDays) * 100));
    if (closedTripsCount >= 18) attendanceRate = Math.min(100, Math.max(95, attendanceRate));

    const crewSummary = {
      totalTrips,
      activeTripsCount,
      closedTripsCount,
      absentTripsCount,
      totalWorkHours: +totalWorkHours.toFixed(1),
      avgHoursPerTrip: totalTrips > 0 ? +(totalWorkHours / totalTrips).toFixed(1) : 0,
      faceVerifiedCount,
      faceRate,
      leaveDaysCount: approvedLeaves.length,
      attendanceRate
    };

    return res.status(200).json({
      success: true,
      faceRegistered: user ? Boolean(user.faceRegistered) : false,
      faceDescriptors: user && user.faceDescriptors ? user.faceDescriptors : [],
      todayDuties,
      activeTrip: activeDuty,
      todayStatus: finalTodayStatus,
      todayRecord,
      history: combinedCrewHistory,
      summary: crewSummary
    });
  } catch (err) {
    console.error('[getMyAttendance Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy lịch sử chấm công.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. XEM BẢNG CHẤM CÔNG THEO DÕI TỔ LÁI (ops_manager / gm / admin)
// GET /api/v1/attendance/today?date=YYYY-MM-DD
// Logic dữ liệu thật theo từng Chuyến xe (Trip):
// - Nếu ngày đó tài xế chạy 2 chuyến xe thì check-in/out riêng 2 lần độc lập
// - Quá thời gian xe bắt đầu chạy (now > departureTime) mà chưa chấm công -> Đánh "Vắng không phép" (absent)
// - Chỉ dùng để theo dõi chấm công & xác thực hình ảnh, không đăng ký Face ID ở chức năng này
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

    // 2. Lấy thông tin tài khoản của toàn bộ Tài xế & Phụ xe đang hoạt động
    const allStaff = await User.find({
      role: { $in: ['driver', 'attendant'] },
      status: 'active'
    }).select('_id name phone role faceRegistered facePhoto').lean();

    const staffByPhone = {};
    const staffByName = {};
    allStaff.forEach(s => {
      if (s.phone) staffByPhone[s.phone] = s;
      if (s.name) staffByName[s.name.trim().toLowerCase()] = s;
    });

    // 3. Lấy tất cả bản ghi chấm công liên quan đến ngày hoặc các chuyến xe này
    const tripIds = trips.map(t => t._id);
    const records = await Attendance.find({
      $or: [
        { tripId: { $in: tripIds } },
        { date: { $gte: dayStart, $lte: dayEnd } }
      ]
    }).lean();

    const attMap = {};
    records.forEach(r => {
      if (r.tripId) {
        attMap[`${r.userId}_${r.tripId}`] = r;
        attMap[`${r.employeePhone}_${r.tripId}`] = r;
      } else {
        attMap[`${r.userId}`] = r;
        attMap[`${r.employeePhone}`] = r;
      }
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

        const rec = attMap[`${staff._id}_${trip._id}`] || attMap[`${staff.phone}_${trip._id}`];
        let status = 'scheduled';
        let note = '';

        if (rec) {
          status = rec.status;
          note = rec.note || '';
        } else if (isPastDeparture) {
          // LOGIC QUAN TRỌNG: Quá giờ xe chạy mà chưa check-in -> VẮNG KHÔNG PHÉP
          status = 'absent';
          note = `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`;
          
          // Tự động đồng bộ bản ghi vắng vào DB nếu nhân viên có tài khoản
          if (staff._id) {
            Attendance.findOneAndUpdate(
              { userId: staff._id, tripId: trip._id },
              {
                $setOnInsert: {
                  userId: staff._id,
                  employeeName: staff.name,
                  employeePhone: staff.phone,
                  role: 'driver',
                  date: dayStart,
                  tripId: trip._id,
                  tripRoute: routeName,
                  busPlateNumber: plateNumber,
                  scheduledDepartureTime: depDate,
                  status: 'absent',
                  faceVerified: false,
                  note: `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`
                }
              },
              { upsert: true }
            ).catch(err => console.error('[Auto Absent Driver Err]:', err));
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
          location: rec?.location || (status === 'absent' ? 'Chưa có mặt tại bến' : 'Chờ xuất bến'),
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

        const rec = attMap[`${staff._id}_${trip._id}`] || attMap[`${staff.phone}_${trip._id}`];
        let status = 'scheduled';
        let note = '';

        if (rec) {
          status = rec.status;
          note = rec.note || '';
        } else if (isPastDeparture) {
          // LOGIC QUAN TRỌNG: Quá giờ xe chạy mà chưa check-in -> VẮNG KHÔNG PHÉP
          status = 'absent';
          note = `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`;

          if (staff._id) {
            Attendance.findOneAndUpdate(
              { userId: staff._id, tripId: trip._id },
              {
                $setOnInsert: {
                  userId: staff._id,
                  employeeName: staff.name,
                  employeePhone: staff.phone,
                  role: 'attendant',
                  date: dayStart,
                  tripId: trip._id,
                  tripRoute: routeName,
                  busPlateNumber: plateNumber,
                  scheduledDepartureTime: depDate,
                  status: 'absent',
                  faceVerified: false,
                  note: `Quá giờ xuất bến ${overdueMinutes} phút chưa check-in (Vắng không phép)`
                }
              },
              { upsert: true }
            ).catch(err => console.error('[Auto Absent Assistant Err]:', err));
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
          location: rec?.location || (status === 'absent' ? 'Chưa có mặt tại bến' : 'Chờ xuất bến'),
          gps: rec?.gpsLat && rec?.gpsLng ? `${rec.gpsLat.toFixed(4)}°N, ${rec.gpsLng.toFixed(4)}°E` : '--'
        });
      }
    }

    // 5. Thêm các nhân viên đội xe KHÔNG có chuyến nào hôm nay (để Quản lý nắm thông tin)
    const unassignedStaff = allStaff
      .filter(s => !staffAssignedMap[s._id.toString()])
      .map(s => ({
        id: `unassigned_${s._id}`,
        dutyId: `unassigned_${s._id}`,
        tripId: null,
        tripRoute: 'Không có chuyến phân công hôm nay',
        busPlateNumber: '--',
        scheduledDepartureTime: null,
        departureTimeStr: '--:--',
        userId: s._id.toString(),
        name: s.name,
        phone: s.phone,
        role: s.role,
        faceRegistered: Boolean(s.faceRegistered),
        facePhoto: s.facePhoto || null,
        status: 'off',
        isPastDeparture: false,
        overdueMinutes: 0,
        note: 'Nghỉ theo lịch phân công',
        checkInTime: '--:--:--',
        checkOutTime: '--:--:--',
        faceVerified: false,
        faceDistance: null,
        isLiveVerified: false,
        checkInPhoto: null,
        checkOutPhoto: null,
        location: '--',
        gps: '--'
      }));

    // 6. Tính toán các chỉ số KPI thống kê
    const activeDirect = duties.filter(d => d.status === 'active').length;
    const closedShift = duties.filter(d => d.status === 'closed').length;
    const absent = duties.filter(d => d.status === 'absent').length;
    const scheduled = duties.filter(d => d.status === 'scheduled').length;
    const faceRegisteredCount = allStaff.filter(s => s.faceRegistered).length;

    const stats = {
      totalTrips: trips.length,
      totalScheduled: duties.length,
      activeDirect,
      closedShift,
      absent,
      scheduled,
      unassignedCount: unassignedStaff.length,
      totalStaff: allStaff.length,
      faceRegisteredCount
    };

    return res.status(200).json({
      success: true,
      date: dateStr,
      stats,
      tripsCount: trips.length,
      attendance: duties,
      unassignedStaff
    });
  } catch (err) {
    console.error('[getTodayAttendance Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu chấm công.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. THỐNG KÊ TỔNG HỢP THEO THÁNG (general_manager)
// GET /api/v1/attendance/stats?month=10&year=2026
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
          name: { $first: '$employeeName' },
          phone: { $first: '$employeePhone' },
          role: { $first: '$role' },
          absentDays: { $sum: 1 }
        }
      },
      { $sort: { absentDays: -1 } },
      { $limit: 10 }
    ]);

    const totalStaff = await User.countDocuments({
      role: { $in: ['driver', 'attendant'] },
      status: 'active'
    });

    const faceRegisteredCount = await User.countDocuments({
      role: { $in: ['driver', 'attendant'] },
      status: 'active',
      faceRegistered: true
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
        name: a.name,
        phone: a.phone,
        role: a.role,
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
// DELETE /api/v1/attendance/reset-today
// ═══════════════════════════════════════════════════════════════════════════
exports.resetTodayAttendance = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);
    const { dayStart, dayEnd } = getDayRangeVN();

    // 1. Xóa toàn bộ bản ghi chấm công ca trực hôm nay của nhân viên
    const attResult = await Attendance.deleteMany({
      userId,
      $or: [
        { date: { $gte: dayStart, $lte: dayEnd } },
        { createdAt: { $gte: dayStart, $lte: dayEnd } }
      ]
    });

    // 2. Tìm và đồng bộ đặt lại các chuyến xe hôm nay của nhân viên
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

      // Nếu giờ xuất bến đã trôi qua trong quá khứ (khiến hệ thống tự động đánh Vắng không phép),
      // tự động cập nhật lại giờ xuất bến lùi sau thời điểm hiện tại 20 phút để phục vụ kiểm thử
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
