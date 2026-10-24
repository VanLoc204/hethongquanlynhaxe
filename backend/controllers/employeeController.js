const User = require('../models/User');
const Trip = require('../models/Trip');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const ShiftSession = require('../models/ShiftSession');
const Booking = require('../models/Booking');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Payroll = require('../models/Payroll');
const WorkSchedule = require('../models/WorkSchedule');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { detectBranchFromLocation, getBranchById } = require('../constants/branches');

const generateTicketSignature = (bookingId) => {
  const secret = process.env.JWT_SECRET || 'anbinhlines_secret';
  return crypto.createHmac('sha256', secret).update(bookingId.toString()).digest('hex').substring(0, 16);
};

// @desc    Get all staff work schedules (queryable DB)
// @route   GET /api/v1/users/work-schedules
// @access  Private (Ops Manager, Admin, General Manager, Staff)
exports.getWorkSchedules = async (req, res) => {
  try {
    const { userId, role, status } = req.query;
    let query = {};
    if (userId) query.userId = userId;
    if (role) query.userRole = role;
    if (status) query.status = status;

    const schedules = await WorkSchedule.find(query)
      .populate('userId', 'name email phone role')
      .sort({ date: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: schedules.length,
      schedules
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách lịch làm việc:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lịch làm việc.' });
  }
};

// @desc    Get work schedule (assigned trips or fixed office shifts)
// @route   GET /api/v1/users/my-schedule
// @access  Private (Driver / Attendant / Ticket Agent / Ops)
exports.getMySchedule = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('phone role name').lean();
    if (!user) {
      return res.status(200).json({ success: true, fixedSchedule: true, trips: [], schedules: [] });
    }

    // Drivers and Attendants have flexible trip schedules; other roles work fixed office hours
    const isFixedSchedule = user.role !== 'driver' && user.role !== 'attendant';

    if (isFixedSchedule) {
      const schedules = await WorkSchedule.find({ userId: req.user.id }).sort({ date: 1 }).lean();
      return res.status(200).json({
        success: true,
        fixedSchedule: true,
        role: user.role,
        trips: [],
        schedules
      });
    }

    let query = {};
    if (user.role === 'driver') {
      query = { 'driver.phone': user.phone };
    } else if (user.role === 'attendant') {
      query = { 'assistant.phone': user.phone };
    }

    const trips = await Trip.find(query)
      .populate('routeId', 'startPoint endPoint distance duration stops')
      .populate('busId', 'plateNumber type totalSeats')
      .sort({ departureTime: 1 })
      .lean();

    res.status(200).json({
      success: true,
      fixedSchedule: false,
      count: trips.length,
      trips
    });
  } catch (error) {
    console.error('Lỗi lấy lịch làm việc:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy lịch làm việc.' });
  }
};

// @desc    Submit a leave request
// @route   POST /api/v1/users/leave
// @access  Private (All Staff)
exports.submitLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin: Ngày bắt đầu, Ngày kết thúc và Lý do xin nghỉ.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Ngày bắt đầu nghỉ phải trước ngày kết thúc.' });
    }

    const startStr = new Date(startDate).toLocaleDateString('vi-VN');
    const endStr = new Date(endDate).toLocaleDateString('vi-VN');
    const details = `Nghỉ từ ${startStr} đến ${endStr}. Lý do: ${reason}`;

    const leave = await LeaveRequest.create({
      userId: req.user.id,
      type: 'leave',
      typeName: 'Đơn xin nghỉ phép',
      details,
      startDate,
      endDate,
      reason
    });

    res.status(201).json({
      success: true,
      message: 'Nộp đơn xin nghỉ phép thành công.',
      leave
    });
  } catch (error) {
    console.error('Lỗi nộp đơn xin nghỉ phép:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi nộp đơn xin nghỉ.' });
  }
};

// @desc    Get my leave requests
// @route   GET /api/v1/users/leave
// @access  Private (All Staff)
exports.getMyLeaves = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-reject pending leave requests whose start date has passed
    await LeaveRequest.updateMany(
      { userId: req.user.id, status: 'pending', startDate: { $lt: today } },
      { $set: { status: 'rejected' } }
    );

    const leaves = await LeaveRequest.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn xin nghỉ:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh sách đơn xin nghỉ.' });
  }
};

// @desc    Get announcements/notifications by role
// @route   GET /api/v1/users/notifications
// @access  Private (All Staff)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientRole: { $in: ['all', req.user.role] }
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Lỗi lấy thông báo:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh sách thông báo.' });
  }
};

// Helper function to compute and upsert real MongoDB payroll record for any employee month/year
const computePayrollRecord = async (userId, userRole, qMonth, qYear) => {
  const roleSalary = {
    driver: { base: 12000000, allowance: 1000000, insurance: 500000 },
    attendant: { base: 8000000, allowance: 800000, insurance: 400000 },
    ticket_agent: { base: 7500000, allowance: 500000, insurance: 375000 },
    ticket_manager: { base: 15500000, allowance: 1500000, insurance: 775000 },
    fleet_manager: { base: 15000000, allowance: 1500000, insurance: 750000 },
    ops_manager: { base: 16000000, allowance: 1500000, insurance: 800000 },
    general_manager: { base: 20000000, allowance: 2000000, insurance: 1000000 },
    admin: { base: 18000000, allowance: 1800000, insurance: 900000 }
  };

  const details = roleSalary[userRole];
  if (!details) return null;

  const startOfMonth = new Date(qYear, qMonth - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(qYear, qMonth, 0, 23, 59, 59, 999);

  const absentSchedules = await WorkSchedule.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
    status: { $in: ['absent', 'leave'] }
  }).lean();

  const absentDates = new Set();
  absentSchedules.forEach(s => {
    if (s.date) {
      absentDates.add(new Date(s.date).toISOString().split('T')[0]);
    }
  });

  const approvedLeaves = await LeaveRequest.find({
    userId,
    status: 'approved',
    startDate: { $lte: endOfMonth },
    endDate: { $gte: startOfMonth }
  }).lean();

  approvedLeaves.forEach(l => {
    if (l.startDate && l.endDate) {
      let cur = new Date(Math.max(new Date(l.startDate).getTime(), startOfMonth.getTime()));
      const end = new Date(Math.min(new Date(l.endDate).getTime(), endOfMonth.getTime()));
      cur.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      while (cur <= end) {
        absentDates.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }
  });

  const absentDays = absentDates.size;
  const standardWorkingDays = 26;
  const dailyRate = details.base / standardWorkingDays;
  const absentDeduction = Math.round(absentDays * dailyRate);
  const netSalary = Math.max(0, details.base + details.allowance - details.insurance - absentDeduction);

  const fullUser = await User.findById(userId).select('name phone').lean();

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const isFuture = qYear > nowYear || (qYear === nowYear && qMonth > nowMonth);
  const status = isFuture ? 'pending' : 'paid';

  return await Payroll.findOneAndUpdate(
    { employeeId: userId, month: qMonth, year: qYear },
    {
      $set: {
        phone: fullUser?.phone || 'N/A',
        name: fullUser?.name || 'N/A',
        role: userRole,
        baseSalary: details.base,
        allowance: details.allowance,
        insuranceDeduction: details.insurance,
        absentDays,
        absentDeduction,
        netSalary,
        status,
        paymentDate: new Date(qYear, qMonth - 1, 5)
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
};

// @desc    Get real payroll details (Fixed Salary minus Absent Days)
// @route   GET /api/v1/users/salary
// @access  Private (All Staff & Managers)
exports.getMySalary = async (req, res) => {
  try {
    const qMonth = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const qYear = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    if (isNaN(qMonth) || qMonth < 1 || qMonth > 12 || isNaN(qYear)) {
      return res.status(400).json({ success: false, message: 'Tháng hoặc năm không hợp lệ.' });
    }

    const fullUser = await User.findById(req.user.id).select('createdAt').lean();
    const joinedDate = fullUser?.createdAt ? new Date(fullUser.createdAt) : new Date(2026, 6, 1);
    const joinedMonth = Math.min(joinedDate.getMonth() + 1, 7);
    const joinedYear = Math.min(joinedDate.getFullYear(), 2026);

    const payroll = await computePayrollRecord(req.user.id, req.user.role, qMonth, qYear);
    if (!payroll) {
      return res.status(403).json({ success: false, message: 'Vai trò này không nằm trong danh sách hưởng lương cố định nhân viên.' });
    }

    // Compute real historical payroll list from joinedMonth/joinedYear up to requested qMonth/qYear
    const history = [];
    for (let i = 0; i < 6; i++) {
      let m = qMonth - i;
      let y = qYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      if (y < joinedYear || (y === joinedYear && m < joinedMonth)) {
        break;
      }
      const hPayroll = await computePayrollRecord(req.user.id, req.user.role, m, y);
      if (hPayroll) {
        history.push(hPayroll);
      }
    }

    res.status(200).json({
      success: true,
      joinedMonth,
      joinedYear,
      payroll,
      history
    });
  } catch (error) {
    console.error('Lỗi tải thông tin lương:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải thông tin lương.' });
  }
};

// ==========================================
// TICKET AGENT SPECIFIC ENDPOINTS
// ==========================================

// Helper: Check if a date is a Vietnamese Holiday / Tet in 2026
const isHoliday = (date) => {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-indexed
  const day = d.getDate();
  const year = d.getFullYear();

  if (year === 2026) {
    // Tết Nguyên Đán 2026: 15/02/2026 -> 23/02/2026
    if (month === 2 && day >= 15 && day <= 23) return true;
    // Giỗ tổ & 30/4 - 1/5: 30/04/2026 -> 03/05/2026
    if ((month === 4 && day >= 30) || (month === 5 && day <= 3)) return true;
    // Quốc Khánh: 01/09/2026 -> 03/09/2026
    if (month === 9 && day >= 1 && day <= 3) return true;
  }
  // Tết Dương Lịch: 01/01 -> 02/01
  if (month === 1 && (day === 1 || day === 2)) return true;
  return false;
};

// @desc    Start shift session for ticket agent or ticket manager (with optional Face ID biometric check)
// @route   POST /api/v1/users/shift/start
// @access  Private (Ticket Agent, Ticket Manager, Admin)
exports.startShift = async (req, res) => {
  try {
    const {
      counterNumber,
      initialCash,
      notes,
      faceDescriptor,
      checkInPhoto,
      isLiveVerified,
      location,
      gpsLat,
      gpsLng
    } = req.body;

    if (!counterNumber) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số quầy vé hoặc vị trí trực để mở ca.' });
    }

    // Check if there is an active session
    const activeSession = await ShiftSession.findOne({ userId: req.user.id, status: 'active' }).lean();
    if (activeSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bạn đang có một ca làm việc đang mở. Vui lòng đóng ca trực cũ trước khi mở ca mới.',
        session: activeSession
      });
    }

    const user = await User.findById(req.user.id).select('+faceDescriptors +faceRegistered');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên.' });
    }

    let faceVerified = false;
    let faceDistance = null;

    if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      if (user.faceRegistered && Array.isArray(user.faceDescriptors) && user.faceDescriptors.length > 0) {
        // So khớp với mẫu khuôn mặt đã đăng ký
        const distances = user.faceDescriptors.map(stored => {
          let sum = 0;
          for (let i = 0; i < 128; i++) {
            sum += (faceDescriptor[i] - stored[i]) ** 2;
          }
          return Math.sqrt(sum);
        });
        const bestDistance = Math.min(...distances);
        const THRESHOLD = 0.42;

        if (bestDistance > THRESHOLD) {
          return res.status(401).json({
            success: false,
            message: `Khuôn mặt trước camera không trùng khớp với nhân viên ${user.name} (sai số: ${bestDistance.toFixed(4)}, ngưỡng cho phép: ${THRESHOLD}). Vui lòng không điểm danh hộ!`,
            faceDistance: bestDistance
          });
        }
        faceVerified = true;
        faceDistance = parseFloat(bestDistance.toFixed(4));
      } else {
        // Tự động kích hoạt Face ID cho nhân viên chưa có mẫu
        user.faceDescriptors = [faceDescriptor];
        user.faceRegistered = true;
        if (checkInPhoto) user.facePhoto = checkInPhoto;
        await user.save();
        faceVerified = true;
        faceDistance = 0.0;
      }
    }

    const startTime = new Date();
    const assignedBranch = user.branch?.branchId || detectBranchFromLocation(counterNumber || location);
    const session = await ShiftSession.create({
      userId: req.user.id,
      counterNumber,
      initialCash: Number(initialCash) || 0,
      notes: notes || '',
      startTime,
      status: 'active',
      faceVerified,
      faceDistance,
      isLiveVerified: Boolean(isLiveVerified),
      checkInPhoto: checkInPhoto || null,
      location: location || counterNumber,
      gpsLat: gpsLat || null,
      gpsLng: gpsLng || null,
      branchId: assignedBranch,
      officeName: location || counterNumber,
      reconciliationStatus: 'pending'
    });

    // Đồng bộ vào bảng Attendance để quản lý tập trung
    try {
      const dayStart = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
      await Attendance.findOneAndUpdate(
        { userId: req.user.id, date: dayStart },
        {
          $set: {
            userId: req.user.id,
            employeeName: user.name,
            employeePhone: user.phone,
            role: user.role,
            date: dayStart,
            checkInTime: startTime,
            status: 'active',
            faceVerified,
            faceDistance,
            isLiveVerified: Boolean(isLiveVerified),
            checkInPhoto: checkInPhoto || null,
            location: location || counterNumber,
            gpsLat: gpsLat || null,
            gpsLng: gpsLng || null,
            note: `Mở ca quầy: ${counterNumber}`
          }
        },
        { upsert: true, new: true }
      );
    } catch (attErr) {
      console.warn('Attendance sync error in startShift:', attErr.message);
    }

    res.status(201).json({
      success: true,
      message: faceVerified 
        ? `Xác thực khuôn mặt Face ID thành công! Mở ca làm việc tại ${counterNumber}.`
        : 'Mở ca làm việc tại quầy thành công.',
      session
    });
  } catch (error) {
    console.error('Lỗi mở ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi mở ca làm việc.' });
  }
};

// @desc    End shift session for ticket agent or manager force close
// @route   POST /api/v1/users/shift/end
// @access  Private (Ticket Agent, Ticket Manager, Admin)
exports.endShift = async (req, res) => {
  try {
    const { notes, shiftId, faceDescriptor, checkOutPhoto, isLiveVerified } = req.body;
    let session = null;

    // Quản lý phòng vé, Giám đốc hoặc Admin có quyền chốt ca cho bất kỳ quầy nào bằng shiftId
    if (shiftId && ['ticket_manager', 'general_manager', 'admin'].includes(req.user.role)) {
      session = await ShiftSession.findById(shiftId);
    } else {
      session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc hoạt động nào để chốt ca.' });
    }

    if (session.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Ca làm việc này đã được chốt sổ trước đó.' });
    }

    // Nếu người tự chốt ca là chủ ca trực và có gửi khuôn mặt để xác thực
    if (!shiftId || shiftId.toString() === session._id.toString()) {
      if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
        const user = await User.findById(session.userId).select('+faceDescriptors +faceRegistered');
        if (user && user.faceRegistered && Array.isArray(user.faceDescriptors) && user.faceDescriptors.length > 0) {
          const distances = user.faceDescriptors.map(stored => {
            let sum = 0;
            for (let i = 0; i < 128; i++) {
              sum += (faceDescriptor[i] - stored[i]) ** 2;
            }
            return Math.sqrt(sum);
          });
          const bestDistance = Math.min(...distances);
          const THRESHOLD = 0.42;

          if (bestDistance > THRESHOLD) {
            return res.status(401).json({
              success: false,
              message: `Khuôn mặt trước camera không trùng khớp với nhân viên mở ca (sai số: ${bestDistance.toFixed(4)}, ngưỡng: ${THRESHOLD}). Yêu cầu đúng nhân viên bàn giao ca trực!`,
              faceDistance: bestDistance
            });
          }
        }
      }
    }

    const endTime = new Date();
    session.status = 'closed';
    session.endTime = endTime;
    if (checkOutPhoto) {
      session.checkOutPhoto = checkOutPhoto;
    }
    if (notes) {
      session.notes = session.notes ? `${session.notes} | ${notes}` : notes;
    }
    await session.save();

    // Đồng bộ vào bảng Attendance
    try {
      const dayStart = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
      await Attendance.findOneAndUpdate(
        { userId: session.userId, date: dayStart, status: 'active' },
        {
          $set: {
            checkOutTime: endTime,
            status: 'closed',
            checkOutPhoto: checkOutPhoto || null,
            note: notes ? `Đóng ca quầy. Ghi chú: ${notes}` : 'Đã hoàn tất ca trực quầy vé'
          }
        }
      );
    } catch (attErr) {
      console.warn('Attendance sync error in endShift:', attErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Chốt ca trực và hoàn tất đối soát doanh thu thành công.',
      session
    });
  } catch (error) {
    console.error('Lỗi đóng ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đóng ca trực.' });
  }
};

exports.getCurrentShift = async (req, res) => {
  try {
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' })
      .populate({
        path: 'ticketsSold',
        select: 'orderCode customerName customerPhone seats pricePerSeat totalAmount paymentMethod status createdAt tripId',
        populate: {
          path: 'tripId',
          select: 'routeId busId departureTime price',
          populate: [
            { path: 'routeId', select: 'startPoint endPoint name' },
            { path: 'busId', select: 'plateNumber type price' }
          ]
        }
      })
      .lean();
    res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Lỗi lấy ca trực hiện tại:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy thông tin ca trực.' });
  }
};

// @desc    Get shift history
// @route   GET /api/v1/users/shift/history
// @access  Private (Ticket Agent, Ticket Manager, GM, Admin)
exports.getShiftHistory = async (req, res) => {
  try {
    let query = {};
    if (['ticket_manager', 'general_manager', 'admin'].includes(req.user.role)) {
      if (req.query.userId && req.query.userId !== 'all') query.userId = req.query.userId;
      if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
      if (req.query.date === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.startTime = { $gte: start, $lte: end };
      }
      if (req.user.role === 'ticket_manager') {
        query.branchId = req.user.branch?.branchId || 'sg';
      } else if (req.query.branchId && req.query.branchId !== 'all') {
        query.branchId = req.query.branchId;
      }
    } else {
      query.userId = req.user.id;
    }

    const history = await ShiftSession.find(query)
      .populate('userId', 'name phone email role avatar')
      .populate({
        path: 'ticketsSold',
        select: 'orderCode customerName customerPhone seats pricePerSeat totalAmount paymentMethod status createdAt tripId',
        populate: {
          path: 'tripId',
          select: 'routeId busId departureTime price',
          populate: [
            { path: 'routeId', select: 'startPoint endPoint name' },
            { path: 'busId', select: 'plateNumber type price' }
          ]
        }
      })
      .sort({ startTime: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Lỗi lấy lịch sử ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy lịch sử ca trực.' });
  }
};

// @desc    Verify and reconcile cash collection from ticket shift
// @route   PATCH /api/v1/users/shift/:id/verify-cash
// @access  Private (Ticket Manager, GM, Admin)
exports.verifyShiftCash = async (req, res) => {
  try {
    const { id } = req.params;
    const { reconciliationStatus = 'verified', notes } = req.body;

    const session = await ShiftSession.findById(id).populate('userId', 'name phone role branch');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca trực.' });
    }

    if (req.user.role === 'ticket_manager') {
      const myBranch = req.user.branch?.branchId || 'sg';
      const sessionBranch = session.branchId || session.userId?.branch?.branchId || 'sg';
      if (sessionBranch !== myBranch) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền xác nhận nộp tiền ca trực thuộc chi nhánh của mình.'
        });
      }
    }

    session.reconciliationStatus = reconciliationStatus;
    session.reconciledBy = req.user.id;
    session.reconciledAt = new Date();
    if (notes) {
      session.reconciliationNotes = notes;
    }
    await session.save();

    res.status(200).json({
      success: true,
      message: `Đã xác nhận nộp tiền mặt ca trực quầy ${session.counterNumber} thành công.`,
      session
    });
  } catch (error) {
    console.error('Lỗi xác nhận nộp tiền ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xác nhận nộp tiền ca trực.' });
  }
};

// @desc    Find tickets/bookings by orderCode or customer phone number
// @desc    Find tickets/bookings by orderCode, phone, customer name, date, status
// @route   GET /api/v1/users/agent/tickets
// @access  Private (Ticket Agent)
exports.lookupTickets = async (req, res) => {
  try {
    const { query, date, dateType = 'departure', status } = req.query;

    let filter = {};

    if (query && query.trim()) {
      const q = query.trim();
      if (/^\d+$/.test(q)) {
        // numeric query: can be orderCode (6-digits) or phone number
        if (q.length === 6) {
          filter.orderCode = Number(q);
        } else {
          filter.customerPhone = new RegExp(q, 'i');
        }
      } else {
        filter.customerName = new RegExp(q, 'i');
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    let bookings = await Booking.find(filter)
      .populate({
        path: 'tripId',
        populate: [
          { path: 'routeId', select: 'startPoint endPoint distance duration estimatedHours' },
          { path: 'busId', select: 'plateNumber type totalSeats' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    // Helper format date sang YYYY-MM-DD theo local time
    const toYMD = (dInput) => {
      if (!dInput) return '';
      const d = new Date(dInput);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    // Filter theo ngày nếu có tham số date
    if (date && date.trim()) {
      const targetDate = date.trim();
      bookings = bookings.filter(b => {
        const depDate = b.tripId?.departureTime ? toYMD(b.tripId.departureTime) : '';
        const bookDate = toYMD(b.createdAt);

        if (dateType === 'departure') {
          return depDate === targetDate;
        } else if (dateType === 'booking') {
          return bookDate === targetDate;
        } else {
          // 'both': hoặc ngày khởi hành hôm nay hoặc ngày đặt hôm nay
          return depDate === targetDate || bookDate === targetDate;
        }
      });
    }

    const bookingsWithQr = bookings.map(b => ({
      ...b,
      qrSignature: generateTicketSignature(b._id)
    }));

    res.status(200).json({
      success: true,
      count: bookingsWithQr.length,
      bookings: bookingsWithQr
    });
  } catch (error) {
    console.error('Lỗi tra cứu vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tra cứu thông tin vé.' });
  }
};

// @desc    Submit booking directly at counter (automatically link and paid)
// @route   POST /api/v1/users/agent/book
// @access  Private (Ticket Agent)
exports.createCounterBooking = async (req, res) => {
  try {
    const { tripId, seats, pickup, dropoff, customerName, customerPhone, paymentMethod } = req.body;
    
    if (!tripId || !seats || !seats.length || !pickup || !dropoff || !customerName || !customerPhone || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các trường thông tin bắt buộc.' });
    }

    // 1. Verify active shift session exists
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });
    if (!session) {
      return res.status(400).json({ success: false, message: 'Vui lòng mở ca trực tại quầy (Nhập mã quầy & Tiền đầu ca) trước khi đặt vé.' });
    }

    // 2. Fetch Trip
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Chuyến xe không tồn tại.' });
    }

    if (new Date(trip.departureTime) < new Date()) {
      return res.status(400).json({ success: false, message: 'Không thể bán vé cho chuyến xe đã khởi hành hoặc đã qua giờ xuất phát.' });
    }

    // 3. Check seat conflicts
    const existingBookings = await Booking.find({ tripId, status: { $ne: 'cancelled' } }).lean();
    const alreadyBookedSeats = existingBookings.flatMap(b => b.seats);
    const doubleBooked = seats.filter(seat => alreadyBookedSeats.includes(seat));
    if (doubleBooked.length > 0) {
      return res.status(400).json({ success: false, message: `Ghế ${doubleBooked.join(', ')} đã bị đặt chọn. Vui lòng thử ghế khác.` });
    }

    // 4. Link/Credit Membership points
    let passenger = await User.findOne({ phone: customerPhone, role: 'customer' });
    if (!passenger) {
      // Auto-register membership account on their behalf
      const salt = await bcrypt.genSalt(10);
      const tempPassword = await bcrypt.hash('123456', salt);
      passenger = await User.create({
        name: customerName,
        phone: customerPhone,
        password: tempPassword,
        role: 'customer',
        status: 'active',
        points: 0,
        membershipTier: 'Bronze'
      });
      console.log(`[Counter Registration] Auto registered new customer account with phone ${customerPhone}`);
    }

    // 5. Generate unique orderCode
    let orderCode = Math.floor(100000 + Math.random() * 900000);
    let orderCodeExists = await Booking.findOne({ orderCode }).lean();
    while (orderCodeExists) {
      orderCode = Math.floor(100000 + Math.random() * 900000);
      orderCodeExists = await Booking.findOne({ orderCode }).lean();
    }

    // 6. Create booking with status PAID
    const booking = await Booking.create({
      tripId,
      userId: passenger._id.toString(),
      seats,
      pickup,
      dropoff,
      customerName,
      customerPhone,
      customerBirthYear: 2000,          // Dummy fallback
      customerCCCD: 'COUNTER_BOOKING',  // Dummy fallback
      status: 'paid',                   // Counter booking is paid immediately
      paymentType: 'immediate',
      orderCode
    });

    // 7. Update Trip bookedSeats map
    trip.bookedSeats = [...(trip.bookedSeats || []), ...seats];
    await trip.save();

    // 8. Update cashier session sales
    const totalPrice = trip.price * seats.length;
    if (paymentMethod === 'cash') {
      session.cashRevenue += totalPrice;
    } else {
      session.cashlessRevenue += totalPrice;
    }
    session.ticketsSold.push(booking._id);
    await session.save();

    // 9. Credit Points to Customer
    const tier = passenger.membershipTier || 'Bronze';
    let multiplier = 0.01;
    if (tier === 'Silver') multiplier = 0.02;
    else if (tier === 'Gold') multiplier = 0.03;
    else if (tier === 'Platinum') multiplier = 0.05;

    const earnedPoints = Math.floor(totalPrice * multiplier);
    passenger.points += earnedPoints;

    // Evaluate tier promotions
    if (passenger.points >= 2000) passenger.membershipTier = 'Platinum';
    else if (passenger.points >= 1000) passenger.membershipTier = 'Gold';
    else if (passenger.points >= 500) passenger.membershipTier = 'Silver';

    await passenger.save();

    const bookingJson = booking.toJSON();
    bookingJson.qrSignature = generateTicketSignature(booking._id);

    res.status(201).json({
      success: true,
      message: 'Đặt và thanh toán vé tại quầy thành công.',
      booking: bookingJson
    });

  } catch (error) {
    console.error('Lỗi đặt vé tại quầy:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đặt vé tại quầy.' });
  }
};

// @desc    Cancel ticket directly at counter (applying refund schedule rules)
// @route   POST /api/v1/users/agent/cancel-ticket/:id
// @access  Private (Ticket Agent)
exports.cancelTicketAtCounter = async (req, res) => {
  try {
    // Check if active shift session exists
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });
    if (!session) {
      return res.status(400).json({ success: false, message: 'Vui lòng mở ca trực tại quầy trước khi thực hiện hủy vé và hoàn tiền.' });
    }

    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin vé.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Vé này đã được hủy trước đó.', booking });
    }

    const trip = await Trip.findById(booking.tripId);
    if (!trip) {
      return res.status(444).json({ success: false, message: 'Không tìm thấy chuyến đi liên quan để kiểm tra lịch trình.' });
    }

    // Calculation constants
    const totalPrice = trip.price * booking.seats.length;
    const ticketCount = booking.seats.length;
    const departureTime = new Date(trip.departureTime);
    const now = new Date();
    const diffMs = departureTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    const holiday = isHoliday(trip.departureTime);
    let feePercent = 1.0; // default 100% fee if time constraints not satisfied

    if (!holiday) {
      // REGULAR DAYS (Ngày thường)
      if (ticketCount >= 1 && ticketCount <= 3) {
        if (diffHours >= 4) {
          feePercent = 0.1; // 10%
        } else if (diffHours >= 0.5 && diffHours < 4) {
          feePercent = 0.3; // 30%
        } else {
          feePercent = 1.0; // 100%
        }
      } else if (ticketCount >= 4 && ticketCount <= 9) {
        if (diffHours >= 24) {
          feePercent = 0.1;
        } else {
          feePercent = 1.0;
        }
      } else if (ticketCount >= 10) {
        if (diffHours >= 48) {
          feePercent = 0.1;
        } else {
          feePercent = 1.0;
        }
      }
    } else {
      // HOLIDAYS & TET (Ngày Lễ, Tết)
      if (ticketCount >= 1 && ticketCount <= 3) {
        if (diffHours >= 24) {
          feePercent = 0.3;
        } else {
          feePercent = 1.0;
        }
      } else if (ticketCount >= 4 && ticketCount <= 9) {
        if (diffHours >= 48) {
          feePercent = 0.3;
        } else {
          feePercent = 1.0;
        }
      } else if (ticketCount >= 10) {
        if (diffHours >= 72) {
          feePercent = 0.3;
        } else {
          feePercent = 1.0;
        }
      }
    }

    const cancellationFee = totalPrice * feePercent;
    const refundAmount = totalPrice - cancellationFee;

    // Apply Cancellation and release seats
    booking.status = 'cancelled';
    booking.cancellationFee = cancellationFee;
    booking.refundAmount = refundAmount;
    await booking.save();

    // Release seats
    trip.bookedSeats = (trip.bookedSeats || []).filter(seat => !booking.seats.includes(seat));
    await trip.save();

    // Deduct from overall sales accordingly (refunding)
    if (session) {
      // Deduct the refunded amount from the corresponding pocket
      // For simplicity, we just reduce it from cash/cashless depending on original payment method
      // (refunded at counter)
      // Since booking doesn't hold paymentMethod, we can assume refund reduces cashless (if booking had orderCode etc)
      // Or default to cash deduction
      session.cashRevenue = Math.max(0, session.cashRevenue - refundAmount);
      await session.save();
    }

    res.status(200).json({
      success: true,
      message: 'Hủy vé và đối chiếu phạt hoàn trả thành công.',
      refundSummary: {
        totalPrice,
        ticketCount,
        isHoliday: holiday,
        diffHours: Math.round(diffHours * 10) / 10,
        feePercent: feePercent * 100,
        cancellationFee,
        refundAmount
      },
      booking
    });

  } catch (error) {
    console.error('Lỗi khi hủy vé trực tiếp:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xử lý hoàn trả hủy vé.' });
  }
};

// @desc    Verify QR ticket and check-in passenger
// @route   POST /api/v1/users/agent/verify-ticket-qr
// @access  Private (Driver / Attendant / Agent)
exports.verifyTicketQR = async (req, res) => {
  try {
    const { ticketId, signature } = req.body;
    if (!ticketId || !signature) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã vé và chữ ký xác thực.' });
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = generateTicketSignature(ticketId);
    if (signature !== expectedSignature) {
      return res.status(401).json({ success: false, message: 'Mã QR không hợp lệ hoặc chữ ký bị giả mạo!' });
    }

    const booking = await Booking.findById(ticketId).populate({
      path: 'tripId',
      populate: [
        { path: 'routeId', select: 'startPoint endPoint' },
        { path: 'busId', select: 'plateNumber type' }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin vé trên hệ thống.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cảnh báo: Vé này đã bị hủy hoàn, không thể lên xe!' });
    }

    if (booking.boarded) {
      const timeStr = new Date(booking.boardedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(booking.boardedAt).toLocaleDateString('vi-VN');
      return res.status(400).json({
        success: false,
        message: `Vé này đã được duyệt lên xe trước đó (quét lúc ${timeStr} ngày ${dateStr}). Yêu cầu kiểm tra trùng nhận diện!`,
        booking
      });
    }

    // Set check-in status
    booking.boarded = true;
    booking.boardedAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Soát vé thành công! Mời hành khách lên xe.',
      booking
    });

  } catch (error) {
    console.error('Lỗi khi quét soát vé QR:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi quét xác nhận vé.' });
  }
};

// @desc    Get bookings/passengers for a specific trip
// @route   GET /api/v1/users/attendant/trip-bookings/:tripId
// @access  Private (Attendant / Staff)
exports.getTripBookings = async (req, res) => {
  try {
    const { tripId } = req.params;
    const bookings = await Booking.find({
      tripId,
      status: { $ne: 'cancelled' }
    }).sort({ boarded: 1, createdAt: 1 }).lean();

    // Map bookings to calculate and append qrSignature
    const bookingsWithSignature = bookings.map(b => ({
      ...b,
      qrSignature: generateTicketSignature(b._id)
    }));

    res.status(200).json({
      success: true,
      count: bookingsWithSignature.length,
      bookings: bookingsWithSignature
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách hành khách:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh sách hành khách.' });
  }
};


// @desc    Manual check-in for a passenger by Booking ID
// @route   POST /api/v1/users/attendant/check-in/:bookingId
// @access  Private (Attendant / Staff)
exports.checkInPassenger = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đặt vé.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Vé này đã bị hủy hoàn, không thể check-in.' });
    }

    if (booking.boarded) {
      return res.status(400).json({ success: false, message: 'Hành khách này đã được xác nhận lên xe trước đó.' });
    }

    booking.boarded = true;
    booking.boardedAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Check-in hành khách lên xe thành công.',
      booking
    });
  } catch (error) {
    console.error('Lỗi check-in hành khách:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi check-in hành khách.' });
  }
};

// @desc    Get all leave requests (for managers)
// @route   GET /api/v1/users/admin/leaves
// @access  Private (Managers / Admin)
exports.getAllLeaves = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-reject pending leave requests whose start date has passed
    await LeaveRequest.updateMany(
      { status: 'pending', startDate: { $lt: today } },
      { $set: { status: 'rejected' } }
    );

    let query = {};
    if (req.user.role === 'ticket_manager') {
      const branchId = req.user.branch?.branchId || 'sg';
      const ticketAgents = await User.find({
        role: 'ticket_agent',
        'branch.branchId': branchId
      }).select('_id').lean();
      const agentIds = ticketAgents.map(a => a._id);
      query.userId = { $in: agentIds };
    }

    const leaves = await LeaveRequest.find(query)
      .populate('userId', 'name role email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn nghỉ:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh sách đơn nghỉ.' });
  }
};

// @desc    Update a leave request status (approve/reject)
// @route   PATCH /api/v1/users/admin/leaves/:id
// @access  Private (Managers / Admin)
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái phê duyệt không hợp lệ. Phải là approved hoặc rejected.'
      });
    }

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn xin nghỉ phép.'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Đơn xin nghỉ phép này đã được xử lý từ trước.'
      });
    }

    // Phân quyền: Quản lý phòng vé chỉ được duyệt đơn của nhân viên bán vé thuộc chi nhánh mình
    if (req.user.role === 'ticket_manager') {
      const applicant = await User.findById(leave.userId).select('role branch').lean();
      if (!applicant || applicant.role !== 'ticket_agent') {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền phê duyệt đơn nghỉ của nhân viên bán vé.'
        });
      }
      const myBranch = req.user.branch?.branchId || 'sg';
      const applicantBranch = applicant.branch?.branchId || 'sg';
      if (applicantBranch !== myBranch) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý phòng vé chỉ có quyền phê duyệt đơn nghỉ của nhân viên thuộc chi nhánh mình.'
        });
      }
    }

    leave.status = status;
    if (reviewNote) {
      leave.details = `${leave.details || ''} [Phản hồi QL: ${reviewNote}]`;
    }
    await leave.save();

    // Gửi thông báo cho nhân viên nộp đơn
    try {
      await Notification.create({
        recipientRole: 'ticket_agent',
        title: status === 'approved' ? 'Đơn xin nghỉ phép ĐÃ ĐƯỢC DUYỆT' : 'Đơn xin nghỉ phép BỊ TỪ CHỐI',
        content: `Đơn xin nghỉ phép của bạn đã được quản lý ${status === 'approved' ? 'chấp thuận' : 'từ chối'}.${reviewNote ? ` Ghi chú: ${reviewNote}` : ''}`,
        type: 'general',
        link: '/staff-leave'
      });
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} đơn xin nghỉ phép thành công.`,
      leave
    });
  } catch (error) {
    console.error('Lỗi cập nhật đơn nghỉ:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật trạng thái đơn nghỉ.' });
  }
};

// Helper for role labels
const getRoleLabelHelper = (role) => {
  const roles = {
    driver: 'Tài xế',
    attendant: 'Phụ xe',
    ticket_agent: 'Bán vé',
    fleet_manager: 'QL Đội xe',
    ops_manager: 'QL Vận tải',
    admin: 'Quản trị viên'
  };
  return roles[role] || role;
};

// @desc    Get real-time attendance monitoring report for today
// @route   GET /api/v1/users/admin/attendance
// @access  Private (Managers / Admin)
exports.getManagerAttendance = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const now = new Date();

    // 1. Fetch staff members: ops_manager only manages drivers & attendants
    const isOps = req.user?.role === 'ops_manager';
    const allowedRoles = isOps
      ? ['driver', 'attendant']
      : ['driver', 'attendant', 'ticket_agent', 'ops_manager', 'fleet_manager'];

    const staffMembers = await User.find({
      role: { $in: allowedRoles }
    }).select('name role email phone').lean();

    // 2. Fetch today's trips (to determine required check-in time & route for drivers & attendants)
    const todayTrips = await Trip.find({
      departureTime: { $gte: todayStart, $lte: todayEnd }
    }).populate('routeId busId').lean();

    // 3. Fetch today's shift sessions (check-in / check-out records)
    const todaySessions = await ShiftSession.find({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    // 4. Fetch today's approved leave requests
    const approvedLeaves = await LeaveRequest.find({
      status: 'approved',
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart }
    }).lean();

    // 5. Fetch today's work schedules (if any)
    const workSchedules = await WorkSchedule.find({
      date: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    const attendanceList = [];

    let activeDirectCount = 0;
    let closedShiftCount = 0;
    let absentCount = 0;
    let standbyCount = 0;

    for (const staff of staffMembers) {
      const staffIdStr = staff._id.toString();
      const staffPhone = staff.phone;

      // Find if driver/attendant is assigned to any trip today
      let assignedTrip = null;
      if (staff.role === 'driver') {
        assignedTrip = todayTrips.find(t => t.driver?.phone === staffPhone);
      } else if (staff.role === 'attendant') {
        assignedTrip = todayTrips.find(t => t.assistant?.phone === staffPhone);
      }

      // Find if employee has a work schedule today
      const schedule = workSchedules.find(s => s.userId?.toString() === staffIdStr);

      // Track all staff members for today's attendance roster
      const isScheduled = true;

      // Check if employee has an approved leave request for today
      const leave = approvedLeaves.find(l => l.userId?.toString() === staffIdStr);

      // Check if employee has checked in today (ShiftSession)
      const session = todaySessions.find(s => s.userId?.toString() === staffIdStr);

      let recordStatus = 'scheduled'; 
      let statusLabel = 'Chờ đến ca';
      let startTimeStr = '--:--:--';
      let endTimeStr = '--:--:--';
      let locationStr = 'Chưa check-in';
      let gpsStr = '--';
      let verificationStr = 'Chưa ghi nhận';
      let punctuality = 'Đúng giờ';

      if (leave) {
        recordStatus = 'approved_leave';
        statusLabel = 'Đã duyệt nghỉ (Có phép)';
        locationStr = 'Nghỉ phép theo đơn';
        verificationStr = 'Hợp lệ (Đơn duyệt nghỉ)';
        punctuality = 'Nghỉ phép';
      } else if (session) {
        startTimeStr = new Date(session.startTime).toLocaleTimeString('vi-VN');
        endTimeStr = session.endTime ? new Date(session.endTime).toLocaleTimeString('vi-VN') : '--:--:--';
        if (session.counterNumber) {
          locationStr = session.counterNumber;
        } else if (assignedTrip) {
          locationStr = `${assignedTrip.routeId?.startPoint || 'Bến xe'} (Xe ${assignedTrip.busId?.plateNumber || ''})`;
        } else if (staff.role === 'driver' || staff.role === 'attendant') {
          locationStr = 'Bãi xe / Trực điều động';
        } else {
          locationStr = 'Quầy vé / Văn phòng';
        }
        gpsStr = '10.8204° N, 106.6378° E';
        verificationStr = 'Hợp lệ (GPS / Wifi VP)';

        // Determine required check-in time:
        let requiredStartTime = null;
        if (assignedTrip) {
          requiredStartTime = new Date(assignedTrip.departureTime);
        } else if (staff.role === 'driver' || staff.role === 'attendant') {
          requiredStartTime = new Date(session.startTime);
        } else {
          requiredStartTime = new Date(todayStart);
          requiredStartTime.setHours(8, 0, 0, 0);
        }

        const isLate = new Date(session.startTime) > requiredStartTime;
        punctuality = isLate ? 'Vào trễ' : 'Đúng quy định';

        if (session.status === 'closed') {
          recordStatus = 'closed';
          statusLabel = isLate ? 'Đã tan ca (Vào trễ)' : 'Đã tan ca (Đúng giờ)';
          closedShiftCount++;
        } else {
          recordStatus = 'active';
          statusLabel = isLate ? 'Đang trực (Vào trễ)' : 'Đang trực (Đúng quy định)';
          activeDirectCount++;
        }
      } else {
        // No Session & No Leave
        if (staff.role === 'driver' || staff.role === 'attendant') {
          if (assignedTrip) {
            const departureDate = new Date(assignedTrip.departureTime);
            if (now > departureDate) {
              recordStatus = 'absent';
              statusLabel = 'Vắng mặt (Chưa nhận chuyến)';
              verificationStr = 'Cảnh báo: Quá giờ xuất bến chưa nhận ca';
              punctuality = 'Vắng mặt';
              absentCount++;
            } else {
              recordStatus = 'scheduled';
              statusLabel = 'Chưa đến giờ xuất bến';
              verificationStr = 'Chờ nhận xe & xuất bến';
              punctuality = 'Chưa tới ca';
            }
            locationStr = `Lịch chuyến ${assignedTrip.routeId?.startPoint || 'Bến xe'} ⇄ ${assignedTrip.routeId?.endPoint || ''} (${departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`;
          } else {
            // Tài xế / Phụ xe không có chuyến chạy hôm nay:
            // Theo quy trình vận tải đường dài, nhân sự tổ lái chạy theo tua xoay vòng.
            // Ngày không có chuyến chạy là ngày nghỉ phục hồi sức khỏe theo tua hoặc sẵn sàng điều động dự phòng.
            recordStatus = 'standby';
            statusLabel = 'Nghỉ giữa ca tua / Chờ điều động';
            verificationStr = 'Hợp lệ (Nghỉ phục hồi thể lực theo tua)';
            punctuality = 'Nghỉ giữa tua';
            locationStr = 'Đội xe / Bến xe (Sẵn sàng điều động)';
            standbyCount++;
          }
        } else {
          // Khối nhân viên văn phòng / Bán vé: Giờ hành chính 08:00 AM
          const requiredStartTime = new Date(todayStart);
          requiredStartTime.setHours(8, 0, 0, 0);

          if (now > requiredStartTime) {
            recordStatus = 'absent';
            statusLabel = 'Vắng mặt (Không phép)';
            verificationStr = 'Cảnh báo: Cả ca không chấm công';
            punctuality = 'Vắng mặt';
            absentCount++;
          } else {
            recordStatus = 'scheduled';
            statusLabel = 'Chưa đến giờ ca trực';
            verificationStr = 'Chờ check-in';
            punctuality = 'Chưa tới ca';
          }
          locationStr = 'Lịch ca hành chính';
        }
      }

      attendanceList.push({
        id: staff._id,
        name: staff.name,
        role: staff.role,
        roleName: getRoleLabelHelper(staff.role),
        phone: staff.phone,
        status: recordStatus,
        statusLabel,
        punctuality,
        startTime: startTimeStr,
        endTime: endTimeStr,
        location: locationStr,
        gps: gpsStr,
        verification: verificationStr,
        assignedTrip: assignedTrip ? {
          route: `${assignedTrip.routeId?.startPoint || ''} ⇄ ${assignedTrip.routeId?.endPoint || ''}`,
          departureTime: new Date(assignedTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          plateNumber: assignedTrip.busId?.plateNumber || ''
        } : null
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalScheduled: attendanceList.length,
        activeDirect: activeDirectCount,
        closedShift: closedShiftCount,
        absent: absentCount,
        standby: standbyCount
      },
      attendance: attendanceList
    });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu chấm công thật:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy báo cáo chấm công.' });
  }
};

// @desc    Ghi nhận báo cáo sự cố hành trình & kỹ thuật phương tiện
// @route   POST /api/v1/users/admin/incidents
// @access  Private (Ops Manager, Driver, Attendant, Fleet Manager, Admin)
exports.createIncidentReport = async (req, res) => {
  try {
    const { typeName, severity, details, estimatedCost, location, tripCode, category } = req.body;
    
    if (!details) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mô tả chi tiết sự cố.' });
    }

    const formattedDetails = `[Phân loại: ${category || 'Sự cố kỹ thuật'}] [Mức độ: ${severity || 'Vừa'}] [Hiện trường: ${location || 'Trên đường'}] ${tripCode ? `[Chuyến: ${tripCode}] ` : ''}${details}${estimatedCost ? ` [Chi phí ước tính: ${Number(estimatedCost).toLocaleString('vi-VN')} đ]` : ''}`;

    const incident = await LeaveRequest.create({
      userId: req.user.id,
      type: 'incident',
      typeName: typeName || `Sự cố: ${category || 'Hành trình xe'}`,
      details: formattedDetails,
      startDate: new Date(),
      endDate: new Date(),
      reason: details,
      status: 'pending'
    });

    await incident.populate('userId', 'name role email phone');

    try {
      await Notification.create({
        title: `[Cảnh báo Sự Cố] ${typeName || 'Sự cố lộ trình & phương tiện'}`,
        content: `${req.user.name} vừa báo cáo sự cố: ${formattedDetails}. Quản lý vận tải và kỹ thuật cần phối hợp xử lý.`,
        recipientRole: 'ops_manager'
      });
    } catch (notifErr) {
      console.warn('Không tạo được thông báo:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Ghi nhận báo cáo sự cố thành công!',
      incident
    });
  } catch (error) {
    console.error('Lỗi tạo báo cáo sự cố:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi ghi nhận sự cố.' });
  }
};


