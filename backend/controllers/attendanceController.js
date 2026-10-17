const Attendance = require('../models/Attendance');
const User = require('../models/User');

// ─── Helper: lấy ngày hôm nay (00:00:00 +0700) ────────────────────────────
function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function getTodayEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
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

// ─── Helper: tìm khoảng cách nhỏ nhất giữa descriptor mới với tất cả mẫu ──
function findBestMatch(incomingDescriptor, storedDescriptors) {
  let minDistance = Infinity;
  for (const stored of storedDescriptors) {
    const dist = euclideanDistance(incomingDescriptor, stored);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}

// ─── Helper: format giờ HH:MM:SS ──────────────────────────────────────────
function formatTime(date) {
  if (!date) return '--:--:--';
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ĐĂNG KÝ KHUÔN MẶT (ops_manager thực hiện hộ)
// POST /api/v1/attendance/register-face
// Body: { userId, faceDescriptors: [[128 số], ...] }
// ═══════════════════════════════════════════════════════════════════════════
exports.registerFace = async (req, res) => {
  try {
    const { userId, faceDescriptors } = req.body;

    if (!userId || !faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu userId hoặc faceDescriptors không hợp lệ.'
      });
    }

    // Kiểm tra mỗi descriptor phải có đúng 128 chiều
    for (const desc of faceDescriptors) {
      if (!Array.isArray(desc) || desc.length !== 128) {
        return res.status(400).json({
          success: false,
          message: `Descriptor không hợp lệ: cần mảng 128 chiều, nhận được ${Array.isArray(desc) ? desc.length : typeof desc} chiều.`
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });
    }

    if (user.role !== 'driver' && user.role !== 'attendant') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ có thể đăng ký khuôn mặt cho Tài xế hoặc Phụ xe.'
      });
    }

    // Lưu descriptors vào user (ghi đè nếu đăng ký lại)
    user.faceDescriptors = faceDescriptors;
    user.faceRegistered = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Đã đăng ký khuôn mặt thành công cho ${user.name} (${faceDescriptors.length} mẫu).`,
      data: {
        userId: user._id,
        name: user.name,
        faceRegistered: true,
        samplesCount: faceDescriptors.length
      }
    });
  } catch (err) {
    console.error('[registerFace Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký khuôn mặt.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. CHECK-IN (Bắt đầu ca trực)
// POST /api/v1/attendance/check-in
// Body: { faceDescriptor: [128 số], location?, gpsLat?, gpsLng? }
// ═══════════════════════════════════════════════════════════════════════════
exports.checkIn = async (req, res) => {
  try {
    const { faceDescriptor, location, gpsLat, gpsLng } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'faceDescriptor không hợp lệ (cần mảng 128D).'
      });
    }

    // Lấy user với faceDescriptors từ DB
    const user = await User.findById(userId).select('+faceDescriptors +faceRegistered');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

    if (!user.faceRegistered || !user.faceDescriptors || user.faceDescriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa đăng ký khuôn mặt. Vui lòng liên hệ Quản lý Vận tải để đăng ký.'
      });
    }

    // Nhận diện khuôn mặt: so sánh với tất cả mẫu đã lưu với ngưỡng chuẩn xác cao chống điểm danh hộ
    const THRESHOLD = 0.38; // Ngưỡng sinh trắc học nghiêm ngặt (người thật <= 0.37, người khác >= 0.42)
    const distances = user.faceDescriptors.map(stored => euclideanDistance(faceDescriptor, stored));
    const bestDistance = Math.min(...distances);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

    // Điều kiện kép: khoảng cách gần nhất <= 0.38 VÀ trung bình các mẫu <= 0.42
    if (bestDistance > THRESHOLD || avgDistance > 0.42) {
      return res.status(401).json({
        success: false,
        message: `Khuôn mặt trước camera không trùng khớp với tài xế ${user.name} (sai số: ${bestDistance.toFixed(4)}, ngưỡng cho phép: ${THRESHOLD}). Vui lòng không điểm danh hộ!`,
        faceDistance: bestDistance
      });
    }

    // Kiểm tra đã check-in hôm nay chưa
    const todayStart = getTodayStart();
    const existing = await Attendance.findOne({ userId, date: todayStart });

    if (existing) {
      if (existing.status === 'active') {
        return res.status(400).json({
          success: false,
          message: `Bạn đã bắt đầu ca từ ${formatTime(existing.checkInTime)}. Hãy tan ca khi kết thúc ca trực.`,
          data: existing
        });
      }
      if (existing.status === 'closed') {
        return res.status(400).json({
          success: false,
          message: `Bạn đã hoàn thành ca hôm nay (vào ${formatTime(existing.checkInTime)} — tan ${formatTime(existing.checkOutTime)}).`
        });
      }
    }

    // Tạo bản ghi chấm công mới kèm ảnh đối soát và cờ liveness
    const { checkInPhoto, isLiveVerified } = req.body;
    const now = new Date();
    const attendance = await Attendance.findOneAndUpdate(
      { userId, date: todayStart },
      {
        $set: {
          userId,
          employeeName: user.name,
          employeePhone: user.phone,
          role: user.role,
          date: todayStart,
          checkInTime: now,
          status: 'active',
          faceVerified: true,
          faceDistance: parseFloat(bestDistance.toFixed(4)),
          isLiveVerified: Boolean(isLiveVerified),
          checkInPhoto: checkInPhoto || null,
          location: location || 'Không xác định',
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Check-in thành công! Xin chào ${user.name} — Chúc bạn một ca trực thuận lợi.`,
      data: {
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
// 3. CHECK-OUT (Tan ca)
// POST /api/v1/attendance/check-out
// Body: { faceDescriptor: [128 số], checkOutPhoto?: string }
// ═══════════════════════════════════════════════════════════════════════════
exports.checkOut = async (req, res) => {
  try {
    const { faceDescriptor, checkOutPhoto } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'faceDescriptor không hợp lệ.'
      });
    }

    const user = await User.findById(userId).select('+faceDescriptors');
    if (!user || !user.faceDescriptors || user.faceDescriptors.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa đăng ký khuôn mặt.' });
    }

    // Xác thực khuôn mặt trước khi cho tan ca (ngưỡng nghiêm ngặt 0.38)
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

    // Tìm bản ghi active hôm nay
    const todayStart = getTodayStart();
    const attendance = await Attendance.findOne({ userId, date: todayStart, status: 'active' });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa bắt đầu ca trực hôm nay. Vui lòng check-in trước.'
      });
    }

    const now = new Date();
    attendance.checkOutTime = now;
    attendance.status = 'closed';
    if (checkOutPhoto) {
      attendance.checkOutPhoto = checkOutPhoto;
    }
    await attendance.save();

    // Tính tổng giờ làm việc
    const diffMs = now - attendance.checkInTime;
    const totalHours = Math.floor(diffMs / 3_600_000);
    const totalMinutes = Math.floor((diffMs % 3_600_000) / 60_000);

    return res.status(200).json({
      success: true,
      message: `Tan ca thành công! Bạn đã làm việc ${totalHours} giờ ${totalMinutes} phút hôm nay.`,
      data: {
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
// GET /api/v1/attendance/mine?limit=30
// ═══════════════════════════════════════════════════════════════════════════
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const limit = parseInt(req.query.limit) || 30;

    const records = await Attendance.find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    // Lấy thông tin faceDescriptors của user để hỗ trợ frontend xác thực thời gian thực
    const user = await User.findById(userId).select('name phone role faceRegistered faceDescriptors').lean();

    // Kiểm tra hôm nay có bản ghi chưa
    const todayStart = getTodayStart();
    const todayRecord = records.find(r => {
      const d = new Date(r.date);
      return d.getTime() === todayStart.getTime();
    });

    return res.status(200).json({
      success: true,
      faceRegistered: user ? Boolean(user.faceRegistered) : false,
      faceDescriptors: user && user.faceDescriptors ? user.faceDescriptors : [],
      todayStatus: todayRecord ? todayRecord.status : 'not_checked',
      todayRecord: todayRecord || null,
      history: records.map(r => ({
        date: new Date(r.date).toLocaleDateString('vi-VN'),
        checkInTime: formatTime(r.checkInTime),
        checkOutTime: formatTime(r.checkOutTime),
        status: r.status,
        faceVerified: r.faceVerified,
        faceDistance: r.faceDistance,
        isLiveVerified: r.isLiveVerified || false,
        checkInPhoto: r.checkInPhoto || null,
        location: r.location
      }))
    });
  } catch (err) {
    console.error('[getMyAttendance Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy lịch sử chấm công.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. XEM BẢNG CHẤM CÔNG HÔM NAY (ops_manager / gm / admin)
// GET /api/v1/attendance/today?date=YYYY-MM-DD
// ═══════════════════════════════════════════════════════════════════════════
exports.getTodayAttendance = async (req, res) => {
  try {
    // Cho phép xem bảng theo ngày chỉ định (mặc định là hôm nay)
    let targetDate;
    if (req.query.date) {
      const parts = req.query.date.split('-');
      targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
    } else {
      targetDate = getTodayStart();
    }

    // Lấy tất cả bản ghi chấm công hôm nay (driver + attendant)
    const records = await Attendance.find({ date: targetDate }).lean();

    // Lấy tất cả driver + attendant trong hệ thống để phát hiện vắng mặt
    const allStaff = await User.find({
      role: { $in: ['driver', 'attendant'] },
      status: 'active'
    }).select('_id name phone role faceRegistered').lean();

    // Map bản ghi chấm công theo userId
    const recordMap = {};
    for (const rec of records) {
      recordMap[rec.userId.toString()] = rec;
    }

    // Gộp: nhân viên có bản ghi → dùng bản ghi, không có → absent
    const now = new Date();
    const attendance = allStaff.map(staff => {
      const rec = recordMap[staff._id.toString()];
      if (rec) {
        return {
          id: rec._id.toString(),
          userId: staff._id.toString(),
          name: staff.name,
          phone: staff.phone,
          role: staff.role,
          faceRegistered: staff.faceRegistered,
          status: rec.status,
          checkInTime: formatTime(rec.checkInTime),
          checkOutTime: formatTime(rec.checkOutTime),
          faceVerified: rec.faceVerified,
          faceDistance: rec.faceDistance,
          isLiveVerified: rec.isLiveVerified || false,
          checkInPhoto: rec.checkInPhoto || null,
          checkOutPhoto: rec.checkOutPhoto || null,
          location: rec.location,
          gps: rec.gpsLat && rec.gpsLng ? `${rec.gpsLat.toFixed(4)}°N, ${rec.gpsLng.toFixed(4)}°E` : '--',
          note: rec.note || ''
        };
      } else {
        // Nhân viên chưa có bản ghi chấm công hôm nay
        return {
          id: null,
          userId: staff._id.toString(),
          name: staff.name,
          phone: staff.phone,
          role: staff.role,
          faceRegistered: staff.faceRegistered,
          status: 'scheduled',
          checkInTime: '--:--:--',
          checkOutTime: '--:--:--',
          faceVerified: false,
          faceDistance: null,
          isLiveVerified: false,
          checkInPhoto: null,
          checkOutPhoto: null,
          location: '--',
          gps: '--',
          note: ''
        };
      }
    });

    // Tính stats KPI
    const stats = {
      totalScheduled: attendance.length,
      activeDirect: attendance.filter(a => a.status === 'active').length,
      closedShift: attendance.filter(a => a.status === 'closed').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      scheduled: attendance.filter(a => a.status === 'scheduled').length,
      faceRegisteredCount: attendance.filter(a => a.faceRegistered).length
    };

    const dateStr = targetDate.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return res.status(200).json({
      success: true,
      date: dateStr,
      stats,
      attendance
    });
  } catch (err) {
    console.error('[getTodayAttendance Error]:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy bảng chấm công.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. THỐNG KÊ TỔNG HỢP (general_manager)
// GET /api/v1/attendance/stats?month=10&year=2026
// ═══════════════════════════════════════════════════════════════════════════
exports.getAttendanceStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1; // 1-12

    // Thống kê theo 12 tháng trong năm
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

    // Chi tiết tháng hiện tại
    const firstDayOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const lastDayOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Nhân viên vắng mặt nhiều nhất tháng này
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

    // Tổng số nhân viên active trong hệ thống
    const totalStaff = await User.countDocuments({
      role: { $in: ['driver', 'attendant'] },
      status: 'active'
    });

    // Tổng số đã đăng ký khuôn mặt
    const faceRegisteredCount = await User.countDocuments({
      role: { $in: ['driver', 'attendant'] },
      status: 'active',
      faceRegistered: true
    });

    // KPI tháng đang xem
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
