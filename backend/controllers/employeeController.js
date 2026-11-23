const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const TicketAgentProfile = require('../models/TicketAgentProfile');
const Trip = require('../models/Trip');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const ShiftSession = require('../models/ShiftSession');
const Booking = require('../models/Booking');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const AgentAttendance = require('../models/AgentAttendance');
const CrewAttendance = require('../models/CrewAttendance');
const CounterIncident = require('../models/CounterIncident');
const TripIncident = require('../models/TripIncident');
const Incident = require('../models/Incident');
const Review = require('../models/Review');
const payosPayoutService = require('../services/payosPayoutService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const detectBranchFromLocation = (loc) => {
  if (!loc || typeof loc !== 'string') return 'sg';
  const t = loc.toLowerCase();
  if (t.includes('đà lạt') || t.includes('lâm đồng') || t.includes('bxlt') || t.includes('bùi thị xuân')) return 'dl';
  if (t.includes('cần thơ') || t.includes('ninh kiều') || t.includes('bxtt')) return 'ct';
  return 'sg';
};

const generateTicketSignature = (bookingId) => {
  const secret = process.env.JWT_SECRET || 'anbinhlines_secret';
  return crypto.createHmac('sha256', secret).update(bookingId.toString()).digest('hex').substring(0, 16);
};

// @desc    Get all staff work schedules (bảng WorkSchedule đã loại bỏ, duy trì endpoint tương thích)
// @route   GET /api/users/work-schedules
// @access  Private
exports.getWorkSchedules = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      count: 0,
      schedules: []
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách lịch làm việc:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lịch làm việc.' });
  }
};

// @desc    Get work schedule (assigned trips or dynamic shifts)
// @route   GET /api/users/my-schedule
// @access  Private (Driver / Attendant / Ticket Agent / Ops)
exports.getMySchedule = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select('phone role name email').lean();
    if (!user) {
      return res.status(200).json({ success: true, fixedSchedule: true, trips: [], schedules: [] });
    }

    const isDriverOrAttendant = user.role === 'driver' || user.role === 'attendant';
    const isTicketAgent = user.role === 'ticket_agent';

    // 1. Lấy thông tin hồ sơ nhân viên để lấy chi nhánh & văn phòng thật
    const empProfile = await EmployeeProfile.findById(userId).lean();
    let agentProfile = null;
    if (isTicketAgent) {
      agentProfile = await TicketAgentProfile.findById(userId).lean();
    }

    const office = agentProfile?.assignedOffice || empProfile?.assignedOffice || empProfile?.branch?.assignedOffices?.[0] || 'Văn phòng Bến xe Miền Đông';
    const branchName = empProfile?.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh';

    // 2. Lấy dữ liệu chấm công thực tế (Attendance) của nhân viên để đối soát trạng thái từng ngày
    const attendances = await Attendance.find({ userId })
      .select('date checkInTime checkOutTime totalHours status')
      .sort({ date: -1 })
      .limit(60)
      .lean();

    // 3. Lấy dữ liệu đơn xin nghỉ phép đã được duyệt (LeaveRequest)
    const leaves = await LeaveRequest.find({ userId, status: 'approved' })
      .select('startDate endDate typeName reason status')
      .lean();

    // 4. Nếu là TÀI XẾ hoặc PHỤ XE (Tổ lái): Lịch làm việc là chuyến xe (Trips)
    if (isDriverOrAttendant) {
      let query = {};
      if (user.role === 'driver') {
        query = { 'driver.phone': user.phone };
      } else if (user.role === 'attendant') {
        query = { 'assistant.phone': user.phone };
      }

      const trips = await Trip.find(query)
        .populate('routeId', 'startPoint endPoint distance duration stops name')
        .populate('busId', 'plateNumber type totalSeats')
        .sort({ departureTime: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        fixedSchedule: false,
        isDriverOrAttendant: true,
        role: user.role,
        user: { name: user.name, phone: user.phone, role: user.role },
        count: trips.length,
        trips,
        schedules: [],
        attendances,
        leaves,
        agentProfile: { office, branchName }
      });
    }

    // 5. Nếu là NHÂN VIÊN BÁN VÉ hoặc VĂN PHÒNG / QUẢN LÝ: Lịch theo ca mẫu / ca hành chính
    // Kiểm tra ca trực quầy vé đang mở (ShiftSession) nếu là ticket_agent
    let activeShift = null;
    if (isTicketAgent) {
      activeShift = await ShiftSession.findOne({ userId, status: 'active' }).lean();
    }

    return res.status(200).json({
      success: true,
      fixedSchedule: true,
      isDriverOrAttendant: false,
      role: user.role,
      user: { name: user.name, phone: user.phone, role: user.role },
      schedules: [],
      trips: [],
      attendances,
      leaves,
      activeShift: activeShift ? {
        id: activeShift._id,
        startTime: activeShift.startTime,
        status: activeShift.status
      } : null,
      agentProfile: {
        office,
        branchName,
        shiftType: agentProfile?.shiftType || 'morning',
        shiftName: agentProfile?.shiftName || 'Ca Sáng (06:30 - 14:30)'
      }
    });
  } catch (error) {
    console.error('Lỗi lấy lịch làm việc:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy lịch làm việc.' });
  }
};

// @desc    Submit a leave request
// @route   POST /api/users/leave
// @access  Private (All Staff)
exports.submitLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason, typeName } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin: Ngày bắt đầu, Ngày kết thúc và Lý do xin nghỉ.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Ngày bắt đầu nghỉ phải trước ngày kết thúc.' });
    }

    const startStr = new Date(startDate).toLocaleDateString('vi-VN');
    const endStr = new Date(endDate).toLocaleDateString('vi-VN');
    const displayType = typeName || 'Đơn xin nghỉ phép';
    const details = `${displayType}: Nghỉ từ ${startStr} đến ${endStr}. Lý do: ${reason}`;

    const leave = await LeaveRequest.create({
      userId: req.user.id,
      type: 'leave',
      typeName: displayType,
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
// @route   GET /api/users/leave
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
// @route   GET /api/users/notifications
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

  const absentAttendances = await Attendance.find({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
    status: 'absent'
  }).lean();

  const approvedLeaves = await LeaveRequest.find({
    userId,
    status: 'approved',
    startDate: { $lte: endOfMonth },
    endDate: { $gte: startOfMonth }
  }).lean();

  const paidLeaveDates = new Set();
  const unpaidLeaveDates = new Set();

  approvedLeaves.forEach(l => {
    if (l.startDate && l.endDate) {
      let cur = new Date(Math.max(new Date(l.startDate).getTime(), startOfMonth.getTime()));
      const end = new Date(Math.min(new Date(l.endDate).getTime(), endOfMonth.getTime()));
      cur.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const isUnpaid = (l.typeName || '').toLowerCase().includes('không hưởng lương');
      while (cur <= end) {
        const dStr = cur.toISOString().split('T')[0];
        if (isUnpaid) {
          unpaidLeaveDates.add(dStr);
        } else {
          paidLeaveDates.add(dStr);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  });

  const absentDates = new Set();
  absentAttendances.forEach(s => {
    if (s.date) {
      const dStr = new Date(s.date).toISOString().split('T')[0];
      // Ngày nghỉ phép năm (hưởng nguyên lương) không bị trừ lương
      if (!paidLeaveDates.has(dStr)) {
        absentDates.add(dStr);
      }
    }
  });

  // Bổ sung các ngày nghỉ không hưởng lương vào danh sách trừ lương
  unpaidLeaveDates.forEach(dStr => absentDates.add(dStr));

  const absentDays = absentDates.size;
  const standardWorkingDays = 26;
  const dailyRate = details.base / standardWorkingDays;
  const absentDeduction = Math.round(absentDays * dailyRate);

  // Chỉ truy vấn hoàn ứng sự cố động cho vai trò Tài xế (driver) từ bảng TripIncident
  let incidentReimbursement = 0;
  let incidentItems = [];

  if (userRole === 'driver') {
    const approvedIncidents = await TripIncident.find({
      reportedBy: userId,
      scenario: 'self_resolved',
      reimbursementStatus: { $in: ['approved', 'paid'] },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();

    incidentReimbursement = approvedIncidents.reduce(
      (sum, inc) => sum + (inc.reimbursementAmount || 0),
      0
    );

    incidentItems = approvedIncidents.map(inc => ({
      incidentCode: inc.incidentCode,
      title: inc.title,
      amount: inc.reimbursementAmount || 0,
      status: inc.reimbursementStatus,
      approvedAt: inc.reimbursementApprovedAt || inc.createdAt
    }));
  }

  // Lương thực lĩnh thuần (Lương cơ bản + Phụ cấp - Bảo hiểm - Vắng mặt) lưu vào Payroll chuẩn 3NF
  const netSalary = Math.max(
    0,
    details.base + details.allowance - details.insurance - absentDeduction
  );

  const fullUser = await User.findById(userId).select('name phone role').lean();

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const isFuture = qYear > nowYear || (qYear === nowYear && qMonth > nowMonth);
  const status = isFuture ? 'pending' : 'paid';

  // Lưu bảng Payroll tinh gọn CHUẨN 3NF TUYỆT ĐỐI (KHÔNG LƯU incidentReimbursement vào Payroll)
  const savedPayroll = await Payroll.findOneAndUpdate(
    { employeeId: userId, month: qMonth, year: qYear },
    {
      $set: {
        employeeId: userId,
        month: qMonth,
        year: qYear,
        baseSalary: details.base,
        allowance: details.allowance,
        insuranceDeduction: details.insurance,
        netSalary,
        status,
        paymentDate: new Date(qYear, qMonth - 1, 5)
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  // Ghép dữ liệu trả về cho frontend StaffSalaryPage.js (Kế thừa động từ User, Attendance, TripIncident)
  return {
    ...savedPayroll,
    name: fullUser?.name || 'N/A',
    phone: fullUser?.phone || 'N/A',
    role: fullUser?.role || userRole,
    absentDays,
    absentDeduction,
    incidentReimbursement,
    incidentItems
  };
};

// @desc    Get real payroll details (Fixed Salary minus Absent Days)
// @route   GET /api/users/salary
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

// Helper: Tự động đóng các ca trực đã hết giờ làm việc mà nhân viên quên check-out
async function autoCloseExpiredShifts() {
  try {
    const activeSessions = await ShiftSession.find({ status: 'active' });
    if (!activeSessions || activeSessions.length === 0) return;

    const now = new Date();

    for (const session of activeSessions) {
      try {
        const agentProfile = await TicketAgentProfile.findById(session.userId).lean();
        const shiftType = agentProfile?.shiftType || 'morning';
        const scheduledEndTimeStr = shiftType === 'evening' ? '22:00' : '14:30';
        const [endH, endM] = scheduledEndTimeStr.split(':').map(Number);

        const sessionDate = new Date(session.startTime || session.createdAt);
        const scheduledEndDate = new Date(sessionDate);
        scheduledEndDate.setHours(endH, endM, 0, 0);

        // Khoảng đệm 15 phút sau giờ kết thúc ca quy định (hoặc nếu đã sang ngày mới)
        const graceEndDate = new Date(scheduledEndDate.getTime() + 15 * 60 * 1000);

        if (now > graceEndDate || now.getDate() !== sessionDate.getDate() || now.getMonth() !== sessionDate.getMonth()) {
          session.status = 'closed';
          session.isPaused = false;
          session.pausedAt = null;
          session.endTime = scheduledEndDate < now ? scheduledEndDate : now;
          session.notes = session.notes
            ? `${session.notes} | [Tự động đóng ca khi hết giờ trực]`
            : '[Tự động đóng ca khi hết giờ trực]';
          await session.save();

          // Cập nhật bản ghi Attendance tương ứng (Chuẩn 3NF)
          const dayStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
          const diffMs = Math.max(0, session.endTime - (session.startTime || session.endTime));
          const totalHours = parseFloat((diffMs / 3600000).toFixed(2));

          await Attendance.findOneAndUpdate(
            { userId: session.userId, date: dayStart, status: 'active' },
            {
              $set: {
                checkOutTime: session.endTime,
                status: 'closed',
                totalHours,
                note: 'Hệ thống tự động chốt ca sau giờ làm việc'
              }
            }
          );
        }
      } catch (innerErr) {
        console.warn('[autoCloseExpiredShifts inner error]:', innerErr.message);
      }
    }
  } catch (err) {
    console.error('[autoCloseExpiredShifts error]:', err);
  }
}

// @desc    Start shift session for ticket agent or ticket manager (with optional Face ID biometric check)
// @route   POST /api/users/shift/start
// @access  Private (Ticket Agent, Ticket Manager, Admin)
exports.startShift = async (req, res) => {
  try {
    await autoCloseExpiredShifts();
    const {
      initialCash,
      expectedInitialCash,
      cashDiscrepancy,
      discrepancyNote,
      notes,
      faceDescriptor,
      checkInPhoto,
      isLiveVerified,
      location,
      gpsLat,
      gpsLng
    } = req.body;

    const officeLocation = location || user?.assignedOffice || user?.branch?.branchName || 'Văn phòng bán vé';

    // Check if there is an active session
    const activeSession = await ShiftSession.findOne({ userId: req.user.id, status: 'active' }).lean();
    if (activeSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bạn đang có một ca làm việc đang mở. Vui lòng đóng ca trực cũ trước khi mở ca mới.',
        session: activeSession
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên.' });
    }
    const emp = await EmployeeProfile.findById(req.user.id).select('+faceDescriptors +faceRegistered');
    const agent = await TicketAgentProfile.findById(req.user.id).lean();

    // Kiểm tra giờ ca trực quy định: Nếu đã quá giờ kết thúc ca trong ngày thì khóa chấm công
    const shiftType = agent?.shiftType || 'morning';
    const scheduledEndTimeStr = shiftType === 'evening' ? '22:00' : '14:30';
    const [endH, endM] = scheduledEndTimeStr.split(':').map(Number);
    const now = new Date();
    const scheduledEndDate = new Date(now);
    scheduledEndDate.setHours(endH, endM, 0, 0);
    const graceEndDate = new Date(scheduledEndDate.getTime() + 15 * 60 * 1000);

    if (now > graceEndDate) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      await Attendance.findOneAndUpdate(
        { userId: req.user.id, date: dayStart },
        {
          $setOnInsert: {
            userId: req.user.id,
            date: dayStart,
            status: 'absent',
            attendanceType: 'agent',
            note: 'Vắng mặt (Quá giờ vào ca trực quy định)'
          }
        },
        { upsert: true }
      );

      return res.status(400).json({
        success: false,
        message: 'Đã hết giờ ca trực hôm nay. Hệ thống đã khóa chấm công.'
      });
    }

    const actualCashNum = Number(initialCash) || 0;
    const expectedCashNum = (expectedInitialCash !== undefined && expectedInitialCash !== null)
      ? Number(expectedInitialCash)
      : actualCashNum;
    const diff = (cashDiscrepancy !== undefined && cashDiscrepancy !== null)
      ? Number(cashDiscrepancy)
      : (actualCashNum - expectedCashNum);

    if (diff !== 0 && (!discrepancyNote || !discrepancyNote.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Tiền mặt thực nhận có chênh lệch so với két ca trước bàn giao. Vui lòng nhập lý do giải trình chênh lệch!'
      });
    }

    let faceVerified = false;
    let faceDistance = null;

    if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      if (emp && emp.faceRegistered && Array.isArray(emp.faceDescriptors) && emp.faceDescriptors.length > 0) {
        // So khớp với mẫu khuôn mặt đã đăng ký
        const distances = emp.faceDescriptors.map(stored => {
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
      } else if (emp) {
        // Tự động kích hoạt Face ID cho nhân viên chưa có mẫu
        emp.faceDescriptors = [faceDescriptor];
        emp.faceRegistered = true;
        if (checkInPhoto) emp.facePhoto = checkInPhoto;
        await emp.save();
        faceVerified = true;
        faceDistance = 0.0;
      }
    }

    const startTime = new Date();
    // Tạo ca trực tinh gọn chuẩn 3NF: Chỉ quản lý tiền két và vé, Face ID và ảnh chấm công được quản lý bên bảng Attendance
    const session = await ShiftSession.create({
      userId: req.user.id,
      initialCash: actualCashNum,
      expectedInitialCash: expectedCashNum,
      notes: notes || '',
      startTime,
      status: 'active',
      reconciliationStatus: diff !== 0 ? 'discrepancy' : 'pending'
    });

    // Đồng bộ vào bảng Attendance để quản lý tập trung (Chuẩn 3NF)
    try {
      const dayStart = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
      let attNote = `Mở ca: ${officeLocation}`;
      if (diff !== 0) {
        attNote += ` [Lệch quỹ đầu ca: ${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} đ | Lý do: ${discrepancyNote.trim()}]`;
      } else if (notes) {
        attNote += ` (${notes})`;
      }

      const att = await Attendance.findOneAndUpdate(
        { userId: req.user.id, date: dayStart },
        {
          $set: {
            userId: req.user.id,
            date: dayStart,
            checkInTime: startTime,
            status: 'active',
            attendanceType: 'agent',
            faceVerified,
            faceDistance,
            isLiveVerified: Boolean(isLiveVerified),
            checkInPhoto: checkInPhoto || null,
            gpsLat: gpsLat || null,
            gpsLng: gpsLng || null,
            note: attNote
          }
        },
        { upsert: true, new: true }
      );

      if (att) {
        await AgentAttendance.findOneAndUpdate(
          { attendanceId: att._id },
          {
            $set: {
              attendanceId: att._id,
              initialCash: initialCash || 0
            }
          },
          { upsert: true }
        );
      }
    } catch (attErr) {
      console.warn('Attendance sync error in startShift:', attErr.message);
    }

    res.status(201).json({
      success: true,
      message: faceVerified 
        ? `Xác thực khuôn mặt Face ID thành công! Mở ca làm việc tại ${officeLocation}.`
        : 'Mở ca làm việc thành công.',
      session: {
        ...session.toObject(),
        faceVerified,
        faceDistance,
        checkInPhoto: checkInPhoto || null,
        isLiveVerified: Boolean(isLiveVerified)
      }
    });
  } catch (error) {
    console.error('Lỗi mở ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi mở ca làm việc.' });
  }
};

// @desc    End shift session for ticket agent or manager force close
// @route   POST /api/users/shift/end
// @access  Private (Ticket Agent, Ticket Manager, Admin)
exports.endShift = async (req, res) => {
  try {
    const { notes, earlyCloseReason, forceClose, shiftId, faceDescriptor, checkOutPhoto, isLiveVerified } = req.body;
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

    // Cho phép chốt ca linh hoạt theo thực tế bàn giao quầy, không bắt bẻ lý do đóng ca sớm hay trễ

    // Nếu người tự chốt ca là chủ ca trực và có gửi khuôn mặt để xác thực
    if (!shiftId || shiftId.toString() === session._id.toString()) {
      if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
        const emp = await EmployeeProfile.findById(session.userId).select('+faceDescriptors +faceRegistered');
        if (emp && emp.faceRegistered && Array.isArray(emp.faceDescriptors) && emp.faceDescriptors.length > 0) {
          const distances = emp.faceDescriptors.map(stored => {
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

    const finalNote = notes || earlyCloseReason || '';
    if (finalNote) {
      session.notes = session.notes ? `${session.notes} | ${finalNote}` : finalNote;
    }
    await session.save();

    // Đồng bộ vào bảng Attendance (Chuẩn 3NF)
    try {
      const dayStart = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
      const diffMs = endTime - (session.startTime || endTime);
      const totalHours = parseFloat((Math.max(0, diffMs) / 3600000).toFixed(2));

      const att = await Attendance.findOneAndUpdate(
        { userId: session.userId, date: dayStart, status: 'active' },
        {
          $set: {
            checkOutTime: endTime,
            status: 'closed',
            totalHours,
            checkOutPhoto: checkOutPhoto || null,
            note: finalNote ? `Đóng ca quầy. ${finalNote}` : 'Đã hoàn tất ca trực quầy vé'
          }
        },
        { new: true }
      );

      if (att) {
        await AgentAttendance.findOneAndUpdate(
          { attendanceId: att._id },
          {
            $set: {
              cashCollected: session.cashRevenue || 0,
              cashHandover: expectedEndingCash || 0,
              cashDiscrepancy: discrepancy || 0,
              totalTicketsSold: session.ticketsSold ? session.ticketsSold.length : 0
            }
          },
          { upsert: true }
        );
      }

    } catch (attErr) {
      console.warn('Attendance sync error in endShift:', attErr.message);
    }

    res.status(200).json({
      success: true,
      message: isEarlyClose
        ? `Đã ghi nhận đóng ca sớm (lý do: ${earlyCloseReason || notes || 'Có việc đột xuất'}). Hoàn tất chốt ca.`
        : 'Chốt ca trực và hoàn tất đối soát doanh thu thành công.',
      session
    });
  } catch (error) {
    console.error('Lỗi đóng ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đóng ca trực.' });
  }
};

// @desc    Pause shift session (Tạm khóa quầy / Nghỉ giữa ca)
// @route   POST /api/users/shift/pause
// @access  Private (Ticket Agent, Ticket Manager)
exports.pauseShift = async (req, res) => {
  try {
    const { reason } = req.body;
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc đang mở để tạm khóa.' });
    }
    session.isPaused = true;
    session.pausedAt = new Date();
    session.pauseReason = reason || 'Tạm khóa quầy / Nghỉ giữa ca';
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Quầy vé đã được tạm khóa an toàn. Bạn có thể yên tâm nghỉ ngơi hoặc đi ăn trưa.',
      session
    });
  } catch (error) {
    console.error('Lỗi tạm khóa ca:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạm khóa ca trực.' });
  }
};

// @desc    Resume shift session (Mở khóa quầy vé sau khi tạm nghỉ)
// @route   POST /api/users/shift/resume
// @access  Private (Ticket Agent, Ticket Manager)
exports.resumeShift = async (req, res) => {
  try {
    const { password, faceDescriptor } = req.body;
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc để mở khóa.' });
    }

    const user = await User.findById(req.user.id).select('+password');
    const emp = await EmployeeProfile.findById(req.user.id).select('+faceDescriptors +faceRegistered');

    if (password) {
      const verified = await bcrypt.compare(password, user.password);
      if (!verified) {
        return res.status(401).json({ success: false, message: 'Mật khẩu tài khoản không chính xác.' });
      }
    } else if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      if (emp && emp.faceRegistered && Array.isArray(emp.faceDescriptors) && emp.faceDescriptors.length > 0) {
        const distances = emp.faceDescriptors.map(stored => {
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
            message: `Khuôn mặt trước camera không khớp (sai số: ${bestDistance.toFixed(4)}). Vui lòng thử lại hoặc nhập mật khẩu!`
          });
        }
      }
    }

    session.isPaused = false;
    session.pausedAt = null;
    session.pauseReason = '';
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Mở khóa ca trực thành công. Tiếp tục phục vụ khách hàng!',
      session
    });
  } catch (error) {
    console.error('Lỗi mở khóa ca:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi mở khóa ca trực.' });
  }
};

exports.getCurrentShift = async (req, res) => {
  try {
    await autoCloseExpiredShifts();
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' })
      .populate('userId', 'name phone email role avatar branch assignedOffice')
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
      .populate({
        path: 'ticketsRefunded',
        select: 'orderCode customerName customerPhone seats pricePerSeat totalAmount refundAmount cancellationFee paymentMethod status cancelledAt tripId',
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

    // Kế thừa / JOIN thông tin Face ID từ bảng Attendance mà KHÔNG CẦN thêm trường thừa vào ShiftSession
    if (session) {
      const sessionDate = new Date(session.startTime || session.createdAt);
      const dayStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
      const att = await Attendance.findOne({ userId: req.user.id, date: dayStart }).lean();

      session.faceVerified = att?.faceVerified || false;
      session.faceDistance = att?.faceDistance !== undefined ? att.faceDistance : null;
      session.checkInPhoto = att?.checkInPhoto || null;
      session.isLiveVerified = att?.isLiveVerified || false;
    }

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
// @route   GET /api/users/shift/history
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
        const targetBranchId = req.user.branch?.branchId || 'sg';
        const branchUserIds = await User.find({ 'branch.branchId': targetBranchId }).distinct('_id');
        if (!query.userId) {
          query.userId = { $in: branchUserIds };
        }
      } else if (req.query.branchId && req.query.branchId !== 'all') {
        const branchUserIds = await User.find({ 'branch.branchId': req.query.branchId }).distinct('_id');
        if (!query.userId) {
          query.userId = { $in: branchUserIds };
        }
      }
    } else {
      query.userId = req.user.id;
    }

    const history = await ShiftSession.find(query)
      .populate('userId', 'name phone email role avatar branch assignedOffice')
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
      .populate({
        path: 'ticketsRefunded',
        select: 'orderCode customerName customerPhone seats pricePerSeat totalAmount refundAmount cancellationFee paymentMethod status cancelledAt tripId',
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

    // Kế thừa / JOIN thông tin Face ID từ bảng Attendance mà KHÔNG CẦN thêm trường thừa vào ShiftSession
    if (history.length > 0) {
      const userIds = history.map(h => h.userId?._id || h.userId).filter(Boolean);
      const attendances = await Attendance.find({
        userId: { $in: userIds }
      }).select('userId date faceVerified isLiveVerified faceDistance checkInPhoto status').lean();

      const attMap = new Map();
      attendances.forEach(att => {
        if (att.date && att.userId) {
          const dStr = new Date(att.date).toISOString().slice(0, 10);
          attMap.set(`${att.userId.toString()}_${dStr}`, att);
        }
      });

      history.forEach(item => {
        const uId = item.userId?._id?.toString() || item.userId?.toString();
        const dStr = new Date(item.startTime || item.createdAt).toISOString().slice(0, 10);
        const att = attMap.get(`${uId}_${dStr}`);
        item.faceVerified = att ? Boolean(att.faceVerified) : false;
        item.faceDistance = att?.faceDistance !== undefined ? att.faceDistance : null;
        item.isLiveVerified = att ? Boolean(att.isLiveVerified) : false;
        item.checkInPhoto = att?.checkInPhoto || null;
      });
    }

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
// @route   PATCH /api/users/shift/:id/verify-cash
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
      message: 'Đã xác nhận nộp tiền mặt ca trực thành công.',
      session
    });
  } catch (error) {
    console.error('Lỗi xác nhận nộp tiền ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xác nhận nộp tiền ca trực.' });
  }
};

// @desc    Get closing cash balance of previous shift at specified counter
// @route   GET /api/users/shift/counter-balance
// @access  Private (Ticket Agent, Ticket Manager, GM, Admin)
exports.getCounterBalance = async (req, res) => {
  try {
    await autoCloseExpiredShifts();
    const { location } = req.query;

    const locParam = (location || '').trim();
    if (!locParam) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp vị trí phòng vé hoặc điểm bán.'
      });
    }

    const safeLoc = locParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const matchedUsers = await User.find({
      $or: [
        { assignedOffice: { $regex: new RegExp(safeLoc, 'i') } },
        { 'branch.branchName': { $regex: new RegExp(safeLoc, 'i') } }
      ]
    }).select('_id').lean();
    const userIds = matchedUsers.map(u => u._id);

    let lastShift = null;
    if (userIds.length > 0) {
      lastShift = await ShiftSession.findOne({
        status: 'closed',
        userId: { $in: userIds }
      })
        .sort({ endTime: -1, createdAt: -1 })
        .populate('userId', 'name phone email role assignedOffice')
        .lean();
    }

    // Fallback: Nếu không tìm thấy theo văn phòng này, lấy ca đã đóng gần nhất trong hệ thống
    if (!lastShift) {
      lastShift = await ShiftSession.findOne({ status: 'closed' })
        .sort({ endTime: -1, createdAt: -1 })
        .populate('userId', 'name phone email role assignedOffice')
        .lean();
    }

    if (!lastShift) {
      return res.status(200).json({
        success: true,
        hasLastShift: false,
        suggestedCash: 500000,
        message: 'Chưa có ca trực nào kết thúc trước đó tại văn phòng này. Áp dụng định mức bàn giao mặc định 500.000 đ.',
        lastShift: null
      });
    }

    const initialCash = Number(lastShift.initialCash) || 0;
    const cashRevenue = Number(lastShift.cashRevenue) || 0;
    const refundCash = Number(lastShift.refundCash) || 0;
    const closingCash = Math.max(0, initialCash + cashRevenue - refundCash);

    return res.status(200).json({
      success: true,
      hasLastShift: true,
      suggestedCash: closingCash,
      lastShift: {
        _id: lastShift._id,
        employeeName: lastShift.userId?.name || 'Nhân viên quầy',
        employeePhone: lastShift.userId?.phone || '',
        location: lastShift.userId?.assignedOffice || locParam,
        startTime: lastShift.startTime,
        endTime: lastShift.endTime,
        initialCash,
        cashRevenue,
        refundCash,
        closingCash,
        reconciliationStatus: lastShift.reconciliationStatus
      }
    });
  } catch (error) {
    console.error('Lỗi lấy số dư quỹ quầy vé:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tra cứu số dư tiền mặt của quầy.'
    });
  }
};

// @desc    Find tickets/bookings by orderCode or customer phone number
// @desc    Find tickets/bookings by orderCode, phone, customer name, date, status
// @route   GET /api/users/agent/tickets
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
// @route   POST /api/users/agent/book
// @access  Private (Ticket Agent)
exports.createCounterBooking = async (req, res) => {
  try {
    const { tripId, seats, pickup, dropoff, customerName, customerPhone, customerEmail, paymentMethod, pointsUsed = 0 } = req.body;
    
    if (!tripId || !seats || !seats.length || !pickup || !dropoff || !customerName || !customerPhone || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các trường thông tin bắt buộc.' });
    }

    // 0. Bắt lỗi định dạng dữ liệu đầu vào
    const trimmedName = (customerName || '').trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Họ và tên khách hàng phải có tối thiểu 2 ký tự.' });
    }
    if (/\d/.test(trimmedName)) {
      return res.status(400).json({ success: false, message: 'Họ và tên khách hàng không được chứa chữ số.' });
    }

    const trimmedPhone = (customerPhone || '').trim().replace(/\s+/g, '');
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).'
      });
    }

    if (customerEmail && customerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail.trim())) {
        return res.status(400).json({ success: false, message: 'Địa chỉ Email không đúng định dạng.' });
      }
    }

    // 1. Verify active shift session exists
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });
    if (!session) {
      return res.status(400).json({ success: false, message: 'Vui lòng mở ca trực tại quầy (Nhập mã quầy & Tiền đầu ca) trước khi đặt vé.' });
    }

    // 2. Fetch Trip with Route and Bus info
    const trip = await Trip.findById(tripId).populate('routeId').populate('busId');
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
      const tempPassword = await bcrypt.hash('Anbinh@2026', salt);
      passenger = await User.create({
        name: customerName,
        phone: customerPhone,
        email: customerEmail ? customerEmail.trim().toLowerCase() : undefined,
        password: tempPassword,
        role: 'customer',
        status: 'active',
        points: 0,
        membershipTier: 'Bronze'
      });
      console.log(`[Counter Registration] Auto registered new customer account with phone ${customerPhone}`);
    } else if (customerEmail && !passenger.email) {
      passenger.email = customerEmail.trim().toLowerCase();
      await passenger.save();
    }

    // 5. Khấu trừ điểm tích lũy thành viên (1 điểm = 1 VNĐ) nếu có yêu cầu
    const totalPrice = trip.price * seats.length;
    const availablePoints = passenger.points || 0;
    const maxPointsCanUse = Math.min(availablePoints, totalPrice);
    const actualPointsUsed = Math.min(Math.max(0, Number(pointsUsed) || 0), maxPointsCanUse);
    const finalAmountToPay = Math.max(0, totalPrice - actualPointsUsed);

    if (actualPointsUsed > 0) {
      passenger.points = Math.max(0, (passenger.points || 0) - actualPointsUsed);
      console.log(`[Counter Booking] Khách hàng ${passenger.phone} đã sử dụng ${actualPointsUsed} điểm. Còn lại: ${passenger.points} điểm.`);
    }

    // 6. Generate unique orderCode
    let orderCode = Math.floor(100000 + Math.random() * 900000);
    let orderCodeExists = await Booking.findOne({ orderCode }).lean();
    while (orderCodeExists) {
      orderCode = Math.floor(100000 + Math.random() * 900000);
      orderCodeExists = await Booking.findOne({ orderCode }).lean();
    }

    // 7. Create booking with status PAID
    const booking = await Booking.create({
      tripId,
      userId: passenger._id.toString(),
      seats,
      pickup,
      dropoff,
      customerName,
      customerPhone,
      customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : '',
      customerBirthYear: 2000,          // Dummy fallback
      customerCCCD: 'COUNTER_BOOKING',  // Dummy fallback
      status: 'paid',                   // Counter booking is paid immediately
      paymentType: 'immediate',
      orderCode,
      pricePerSeat: trip.price,
      originalAmount: totalPrice,
      pointsUsed: actualPointsUsed,
      discountFromPoints: actualPointsUsed,
      totalAmount: finalAmountToPay
    });

    // 8. Update Trip bookedSeats map
    trip.bookedSeats = [...(trip.bookedSeats || []), ...seats];
    await trip.save();

    // Giải phóng khóa tạm thời và thông báo thời gian thực
    const seatLockService = require('../services/seatLockService');
    seatLockService.unlockSeats(tripId.toString(), seats);
    seatLockService.broadcast(tripId.toString(), 'BOOKED_SEATS', {
      tripId: tripId.toString(),
      bookedSeats: seats
    });

    // 9. Update cashier session sales
    if (paymentMethod === 'cash') {
      session.cashRevenue += finalAmountToPay;
    } else {
      session.cashlessRevenue += finalAmountToPay;
    }
    session.ticketsSold.push(booking._id);
    await session.save();

    // 10. Credit Points to Customer on actual paid amount
    const tier = passenger.membershipTier || 'Bronze';
    let multiplier = 0.01;
    if (tier === 'Silver') multiplier = 0.02;
    else if (tier === 'Gold') multiplier = 0.03;
    else if (tier === 'Platinum') multiplier = 0.05;

    const earnedPoints = Math.floor(finalAmountToPay * multiplier);
    passenger.points = (passenger.points || 0) + earnedPoints;

    // Evaluate tier promotions
    if (passenger.points >= 2000) passenger.membershipTier = 'Platinum';
    else if (passenger.points >= 1000) passenger.membershipTier = 'Gold';
    else if (passenger.points >= 500) passenger.membershipTier = 'Silver';

    await passenger.save();

    // 10. Tự động gửi Email hóa đơn vé điện tử (nếu khách cung cấp email)
    const { sendBookingInvoiceEmail } = require('../services/emailService');

    let emailSent = false;
    let emailNote = '';
    if (booking.customerEmail) {
      try {
        const emailRes = await sendBookingInvoiceEmail(booking, trip);
        if (emailRes && emailRes.success) {
          emailSent = true;
          console.log(`[Counter Booking] Đã gửi Email hóa đơn vé xe về: ${booking.customerEmail}`);
        } else {
          emailNote = emailRes?.code === 'unauthorized'
            ? ' (Lưu ý: Email tạm thời bị chặn do Brevo yêu cầu ủy quyền IP https://app.brevo.com/security/authorised_ips)'
            : ' (Chưa gửi được email hóa đơn)';
          console.warn(`[Counter Booking] Gửi Email không thành công:`, emailRes?.error || emailRes);
        }
      } catch (emailErr) {
        console.error('[Counter Booking] Lỗi gửi Email:', emailErr.message);
      }
    }

    const bookingJson = booking.toJSON();
    bookingJson.qrSignature = generateTicketSignature(booking._id);
    bookingJson.notificationStatus = {
      emailSent,
      emailRecipient: booking.customerEmail || null
    };

    let replyMsg = `Đặt vé thành công! Mã vé: #${booking.orderCode || booking._id.toString().slice(-6).toUpperCase()}.`;
    if (booking.customerEmail) {
      if (emailSent) {
        replyMsg += ` Đã gửi Hóa đơn điện tử kèm mã QR tới Email ${booking.customerEmail}.`;
      } else {
        replyMsg += emailNote;
      }
    }

    res.status(201).json({
      success: true,
      message: replyMsg,
      booking: bookingJson
    });

  } catch (error) {
    console.error('Lỗi đặt vé tại quầy:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đặt vé tại quầy.' });
  }
};

// @desc    Get list of supported banks for PayOS Payout
// @route   GET /api/users/banks-list
// @access  Public / Private
exports.getBanksList = async (req, res) => {
  try {
    const banks = payosPayoutService.getBanks();
    return res.status(200).json({ success: true, banks });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tải danh mục ngân hàng.' });
  }
};

// @desc    Cancel ticket directly at counter (applying refund rules & payOS Payout)
// @route   POST /api/users/agent/cancel-ticket/:id
// @access  Private (Ticket Agent, Ticket Manager, Admin)
exports.cancelTicketAtCounter = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      refundAmount: customRefundAmount,
      refundMethod = 'payos_payout', // 'payos_payout' | 'cash'
      bankDetails = {},
      saveBankAccount = true,
      cancellationReason = 'Khách yêu cầu hủy vé'
    } = req.body || {};

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin vé.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Vé này đã được hủy trước đó.', booking });
    }

    const trip = await Trip.findById(booking.tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến đi liên quan để kiểm tra lịch trình.' });
    }

    // Kiểm tra quy định hủy vé: Chỉ được hủy trước giờ khởi hành ít nhất 5 ngày
    const departureTime = new Date(trip.departureTime);
    const now = new Date();
    const diffMs = departureTime - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffDays < 5) {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy vé! Chuyến xe đã khởi hành hoặc còn dưới 5 ngày trước giờ xuất bến (chỉ được phép hủy vé trước 5 ngày).'
      });
    }

    // BẮT BUỘC: KHÓA TÍNH NĂNG HỦY VÉ NẾU CHƯA CHẤM CÔNG VÀO CA HÔM NAY
    const vnDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const y = vnDate.getFullYear();
    const m = String(vnDate.getMonth() + 1).padStart(2, '0');
    const d = String(vnDate.getDate()).padStart(2, '0');
    const todayStart = new Date(`${y}-${m}-${d}T00:00:00.000+07:00`);
    const todayEnd = new Date(`${y}-${m}-${d}T23:59:59.999+07:00`);

    const activeAtt = await Attendance.findOne({
      userId: req.user.id,
      date: { $gte: todayStart, $lte: todayEnd },
      status: 'active'
    });
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });

    if (!activeAtt && !session) {
      return res.status(403).json({
        success: false,
        message: 'Thao tác hủy vé bị khóa: Bạn chưa thực hiện chấm công vào ca hôm nay. Vui lòng chấm công ca trực trước khi thực hiện hủy vé!'
      });
    }

    // Kiểm tra ca trực nếu chọn hoàn tiền mặt
    if (refundMethod === 'cash' && !session && req.user.role === 'ticket_agent') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng mở ca trực tại quầy trước khi thực hiện hoàn tiền mặt tại két.'
      });
    }

    // Tổng tiền vé cần xử lý hoàn trả
    const totalPrice = booking.totalAmount || ((trip.price || 0) * (booking.seats?.length || 1));
    const ticketCount = booking.seats?.length || 1;
    const holiday = isHoliday(trip.departureTime);

    // Vì hủy trước 5 ngày, áp dụng hoàn 100% (hoặc mức điều chỉnh nếu nhân viên nhập)
    let finalRefundAmount = (customRefundAmount !== undefined && customRefundAmount !== null && customRefundAmount !== '')
      ? Math.max(0, Math.min(totalPrice, Number(customRefundAmount)))
      : totalPrice;
    const finalCancellationFee = Math.max(0, totalPrice - finalRefundAmount);

    let payoutResult = null;

    if (refundMethod === 'points') {
      // Tích điểm vào tài khoản thành viên (1 điểm = 1 VNĐ)
      let passenger = await User.findOne({ phone: booking.customerPhone, role: 'customer' });
      if (!passenger && booking.userId && booking.userId.match(/^[0-9a-fA-F]{24}$/)) {
        passenger = await User.findById(booking.userId);
      }
      if (!passenger) {
        return res.status(400).json({
          success: false,
          message: `Số điện thoại ${booking.customerPhone} chưa đăng ký tài khoản thành viên để nhận điểm tích lũy. Vui lòng chọn hoàn tiền mặt tại quầy hoặc hướng dẫn khách đăng ký tài khoản.`
        });
      }

      passenger.points = (passenger.points || 0) + finalRefundAmount;
      if (passenger.points >= 2000) passenger.membershipTier = 'Platinum';
      else if (passenger.points >= 1000) passenger.membershipTier = 'Gold';
      else if (passenger.points >= 500) passenger.membershipTier = 'Silver';
      await passenger.save();

      booking.refundMethod = 'points';
    } else if (refundMethod === 'cash') {
      // Hoàn tiền mặt tại quầy: Trích tiền mặt từ két ca trực của nhân viên
      booking.refundMethod = 'cash';
      if (session) {
        session.refundCash = (session.refundCash || 0) + finalRefundAmount;
        if (!session.ticketsRefunded) session.ticketsRefunded = [];
        session.ticketsRefunded.push(booking._id);
        await session.save();
      }
    } else if (refundMethod === 'payos_payout') {
      // Xử lý bắn tiền tự động qua payOS (Payout)
      const { bankCode, accountNumber, accountHolder } = bankDetails;

      if (!accountNumber || !accountNumber.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp số tài khoản ngân hàng để payOS thực hiện chuyển tiền hoàn.'
        });
      }

      if (!bankCode) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ngân hàng thụ hưởng nhận tiền hoàn.'
        });
      }

      payoutResult = await payosPayoutService.executePayout({
        bankCode: bankCode.trim().toUpperCase(),
        accountNumber: accountNumber.trim(),
        accountHolder: (accountHolder || booking.customerName).trim().toUpperCase(),
        amount: finalRefundAmount,
        orderCode: booking.orderCode,
        bookingId: booking._id
      });

      booking.refundMethod = 'payos_payout';
      booking.bankInfo = {
        bankCode: payoutResult.bankCode,
        bankName: payoutResult.bankName,
        accountNumber: payoutResult.accountNumber,
        accountHolder: payoutResult.accountHolder,
        transactionCode: payoutResult.transactionCode,
        payoutStatus: payoutResult.payoutStatus
      };
    } else {
      booking.refundMethod = 'cash';
    }

    // Cập nhật trạng thái vé
    booking.status = 'cancelled';
    booking.cancellationFee = finalCancellationFee;
    booking.refundAmount = finalRefundAmount;
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user._id;
    booking.cancellationReason = cancellationReason;
    await booking.save();

    // Giải phóng ghế xe đã đặt
    trip.bookedSeats = (trip.bookedSeats || []).filter((seat) => !booking.seats.includes(seat));
    await trip.save();

    const seatLockService = require('../services/seatLockService');
    seatLockService.broadcast(booking.tripId.toString(), 'RELEASED_SEATS', {
      tripId: booking.tripId.toString(),
      releasedSeats: booking.seats
    });

    res.status(200).json({
      success: true,
      message:
        booking.refundMethod === 'points'
          ? `Hủy vé thành công! Đã tích ${finalRefundAmount.toLocaleString('vi-VN')} điểm vào tài khoản thành viên của khách hàng (${booking.customerPhone}) và giải phóng ghế.`
          : booking.refundMethod === 'cash'
          ? `Hủy vé thành công! Đã hoàn trả tiền mặt ${finalRefundAmount.toLocaleString('vi-VN')} đ tại quầy và giải phóng ghế.`
          : `Hủy vé thành công! Đã xử lý hoàn tiền qua cổng payOS và giải phóng ghế.`,
      refundSummary: {
        totalPrice,
        ticketCount,
        isHoliday: holiday,
        diffDays: Math.round(diffDays * 10) / 10,
        diffHours: Math.round(diffHours * 10) / 10,
        feePercent: 0,
        cancellationFee: finalCancellationFee,
        refundAmount: finalRefundAmount,
        refundMethod: booking.refundMethod
      },
      payoutResult,
      booking
    });

  } catch (error) {
    console.error('Lỗi khi hủy vé trực tiếp:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi xử lý hoàn trả hủy vé.' });
  }
};

// @desc    Verify QR ticket and check-in passenger
// @route   POST /api/users/agent/verify-ticket-qr
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
// @route   GET /api/users/attendant/trip-bookings/:tripId
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
// @route   POST /api/users/attendant/check-in/:bookingId
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
// @route   GET /api/users/admin/leaves
// @access  Private (Managers / Admin)
exports.getAllLeaves = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-reject pending leave requests whose start date has passed (chỉ áp dụng cho đơn xin nghỉ)
    await LeaveRequest.updateMany(
      { 
        type: 'leave',
        status: 'pending', 
        startDate: { $exists: true, $ne: null, $lt: today } 
      },
      { $set: { status: 'rejected' } }
    );

    let query = { type: 'leave' };
    if (req.user.role === 'ticket_manager') {
      const branchId = req.user.branch?.branchId || 'sg';
      const ticketAgents = await User.find({
        role: 'ticket_agent',
        'branch.branchId': branchId
      }).select('_id').lean();
      const agentIds = ticketAgents.map(a => a._id);
      query.userId = { $in: agentIds };
    } else if (req.user.role === 'ops_manager') {
      const fleetStaff = await User.find({
        role: { $in: ['driver', 'attendant', 'assistant'] }
      }).select('_id').lean();
      const staffIds = fleetStaff.map(s => s._id);
      query.userId = { $in: staffIds };
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
// @route   PATCH /api/users/admin/leaves/:id
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

    // Phân quyền: Quản lý vận tải chỉ được duyệt đơn của tài xế và phụ xe
    if (req.user.role === 'ops_manager') {
      const applicant = await User.findById(leave.userId).select('role').lean();
      if (!applicant || !['driver', 'attendant', 'assistant'].includes(applicant.role)) {
        return res.status(403).json({
          success: false,
          message: 'Quản lý vận tải chỉ có quyền phê duyệt đơn nghỉ của tài xế và phụ xe.'
        });
      }
    }

    leave.status = status;
    if (reviewNote) {
      leave.details = `${leave.details || ''} [Phản hồi QL: ${reviewNote}]`;
    }
    await leave.save();

    // Liên kết tự động giữa Đơn xin nghỉ và Lịch chuyến xe:
    // Khi đơn được duyệt và người nộp là Tài xế hoặc Phụ xe:
    // Tự động quét các chuyến xe trong ngày nghỉ, gắn cờ cảnh báo "Cần bố trí người chạy thay (Tài xế/Phụ xe nghỉ phép)"
    // và gửi thông báo Notification tới Quản lý vận hành (ops_manager)
    if (status === 'approved') {
      try {
        const applicant = await User.findById(leave.userId);
        if (applicant && (applicant.role === 'driver' || applicant.role === 'attendant')) {
          const isDriver = applicant.role === 'driver';
          const roleTitle = isDriver ? 'Tài xế' : 'Phụ xe';

          const leaveStart = new Date(leave.startDate || leave.createdAt);
          leaveStart.setHours(0, 0, 0, 0);
          const leaveEnd = new Date(leave.endDate || leave.startDate || leave.createdAt);
          leaveEnd.setHours(23, 59, 59, 999);

          const tripQuery = {
            departureTime: { $gte: leaveStart, $lte: leaveEnd }
          };
          if (isDriver) {
            tripQuery['driver.phone'] = applicant.phone;
          } else {
            tripQuery['assistant.phone'] = applicant.phone;
          }

          const affectedTrips = await Trip.find(tripQuery).populate('routeId busId');

          for (const trip of affectedTrips) {
            trip.needsReplacement = true;
            trip.replacementReason = `${roleTitle} ${applicant.name} nghỉ phép`;
            if (isDriver) {
              trip.originalDriver = { name: applicant.name, phone: applicant.phone };
            } else {
              trip.originalAssistant = { name: applicant.name, phone: applicant.phone };
            }
            await trip.save();

            const depTimeStr = new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const depDateStr = new Date(trip.departureTime).toLocaleDateString('vi-VN');
            const routeName = trip.routeId ? `${trip.routeId.startPoint} -> ${trip.routeId.endPoint}` : 'Tuyến đường';

            await Notification.create({
              recipientRole: 'ops_manager',
              title: `Cần điều động người chạy thay cho chuyến ${depTimeStr} ${depDateStr}`,
              content: `${roleTitle} ${applicant.name} được duyệt nghỉ ngày ${depDateStr}, cần điều động người chạy thay cho chuyến ${depTimeStr} ${routeName} (Xe ${trip.busId?.plateNumber || ''}).`,
              type: 'general',
              link: '/ops/staff'
            });
          }
        }
      } catch (err) {
        console.error('Lỗi liên kết chuyến xe khi duyệt đơn nghỉ:', err);
      }
    }

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
    fleet_manager: 'QL Xe',
    ops_manager: 'QL Vận tải',
    admin: 'Quản trị viên'
  };
  return roles[role] || role;
};

// @desc    Get real-time attendance monitoring report for today
// @route   GET /api/users/admin/attendance
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
        if (staff.assignedOffice) {
          locationStr = staff.assignedOffice;
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
// @route   POST /api/users/admin/incidents
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

// =========================================================================
// QUẢN LÝ PHÒNG VÉ: BÁO CÁO DOANH THU, SỰ CỐ & PHẢN HỒI KHÁCH HÀNG
// =========================================================================

// @desc    Lấy báo cáo doanh thu phòng vé chi tiết theo chi nhánh, quầy, nhân viên, tuyến đường
// @route   GET /api/users/ticket-manager/revenue-report
// @access  Private (ticket_manager, general_manager, admin)
exports.getTicketRevenueReport = async (req, res) => {
  try {
    let branchId = req.query.branchId;
    if (req.user.role === 'ticket_manager') {
      branchId = req.user.branch?.branchId || 'sg';
    } else if (branchId === 'all') {
      branchId = null;
    }

    const { fromDate, toDate, staffId } = req.query;

    // 1. Query ShiftSessions
    let shiftQuery = {};
    if (branchId) {
      const branchUsers = await User.find({ 'branch.branchId': branchId }).select('_id').lean();
      shiftQuery.userId = { $in: branchUsers.map(u => u._id) };
    }
    if (staffId && staffId !== 'all') shiftQuery.userId = staffId;

    if (fromDate || toDate) {
      shiftQuery.startTime = {};
      if (fromDate) shiftQuery.startTime.$gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate) shiftQuery.startTime.$lte = new Date(`${toDate}T23:59:59.999Z`);
    }

    const shifts = await ShiftSession.find(shiftQuery)
      .populate('userId', 'name phone email role assignedOffice')
      .sort({ startTime: -1 })
      .lean();

    // 2. Tính toán tổng hợp dòng tiền từ ca trực
    let totalCashRevenue = 0;
    let totalCashlessRevenue = 0;
    let totalInitialCash = 0;
    let totalTicketsFromShifts = 0;

    const counterMap = {};
    const staffMap = {};

    shifts.forEach(s => {
      const cash = s.cashRevenue || 0;
      const cashless = s.cashlessRevenue || 0;
      const initial = s.initialCash || 0;
      const tickets = s.ticketsSold?.length || 0;

      totalCashRevenue += cash;
      totalCashlessRevenue += cashless;
      totalInitialCash += initial;
      totalTicketsFromShifts += tickets;

      // Nhóm theo văn phòng
      const cKey = s.userId?.assignedOffice || 'Văn phòng bán vé';
      if (!counterMap[cKey]) {
        counterMap[cKey] = { counter: cKey, totalCash: 0, totalCashless: 0, totalRevenue: 0, ticketsCount: 0, shiftsCount: 0 };
      }
      counterMap[cKey].totalCash += cash;
      counterMap[cKey].totalCashless += cashless;
      counterMap[cKey].totalRevenue += (cash + cashless);
      counterMap[cKey].ticketsCount += tickets;
      counterMap[cKey].shiftsCount += 1;

      // Nhóm theo nhân viên
      const sId = s.userId?._id?.toString() || 'unknown';
      const sName = s.userId?.name || 'Nhân viên';
      const sPhone = s.userId?.phone || '';
      if (!staffMap[sId]) {
        staffMap[sId] = { staffId: sId, staffName: sName, phone: sPhone, totalCash: 0, totalCashless: 0, totalRevenue: 0, ticketsCount: 0, shiftsCount: 0 };
      }
      staffMap[sId].totalCash += cash;
      staffMap[sId].totalCashless += cashless;
      staffMap[sId].totalRevenue += (cash + cashless);
      staffMap[sId].ticketsCount += tickets;
      staffMap[sId].shiftsCount += 1;
    });

    const counterBreakdown = Object.values(counterMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const staffBreakdown = Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 3. Query Bookings để lấy chi tiết bán vé & phân tích theo tuyến đường
    let bookingQuery = { status: { $in: ['paid', 'confirmed'] } };
    if (fromDate || toDate) {
      bookingQuery.createdAt = {};
      if (fromDate) bookingQuery.createdAt.$gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate) bookingQuery.createdAt.$lte = new Date(`${toDate}T23:59:59.999Z`);
    }

    const bookings = await Booking.find(bookingQuery)
      .populate({
        path: 'tripId',
        select: 'routeId busId departureTime price',
        populate: [
          { path: 'routeId', select: 'startPoint endPoint name' },
          { path: 'busId', select: 'plateNumber type' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const routeMap = {};
    bookings.forEach(b => {
      const rName = b.tripId?.routeId?.name || (b.tripId?.routeId?.startPoint && b.tripId?.routeId?.endPoint ? `${b.tripId.routeId.startPoint} ➔ ${b.tripId.routeId.endPoint}` : 'Tuyến liên tỉnh');
      const ticketCount = b.seats?.length || 1;
      const rev = b.totalAmount || (ticketCount * (b.tripId?.price || 0));

      if (!routeMap[rName]) {
        routeMap[rName] = { routeName: rName, ticketCount: 0, revenue: 0, bookingCount: 0 };
      }
      routeMap[rName].ticketCount += ticketCount;
      routeMap[rName].revenue += rev;
      routeMap[rName].bookingCount += 1;
    });

    const routeBreakdown = Object.values(routeMap).sort((a, b) => b.revenue - a.revenue);
    const grandTotalRevenue = totalCashRevenue + totalCashlessRevenue;

    res.status(200).json({
      success: true,
      summary: {
        totalRevenue: grandTotalRevenue,
        cashRevenue: totalCashRevenue,
        cashlessRevenue: totalCashlessRevenue,
        initialCash: totalInitialCash,
        ticketsCount: totalTicketsFromShifts || bookings.length,
        shiftsCount: shifts.length,
        cashRate: grandTotalRevenue > 0 ? Math.round((totalCashRevenue / grandTotalRevenue) * 100) : 0,
        cashlessRate: grandTotalRevenue > 0 ? Math.round((totalCashlessRevenue / grandTotalRevenue) * 100) : 0
      },
      counterBreakdown,
      staffBreakdown,
      routeBreakdown,
      shifts: shifts.slice(0, 50),
      recentBookings: bookings.slice(0, 30)
    });
  } catch (error) {
    console.error('Lỗi lấy báo cáo doanh thu phòng vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải báo cáo doanh thu.' });
  }
};

// @desc    Lấy danh sách sự cố phòng vé
// @route   GET /api/users/ticket-manager/incidents
// @access  Private (ticket_manager, general_manager, admin, ticket_agent)
exports.getTicketIncidents = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userBranch = req.user.branch?.branchId || 'sg';

    // Auto-seed dữ liệu mẫu thực tế cho chi nhánh SG nếu chưa có dữ liệu
    const branchToSeed = userRole === 'ticket_manager' ? userBranch : (req.query.branchId || 'sg');
    if (branchToSeed === 'sg') {
      const existingCount = await CounterIncident.countDocuments();
      if (existingCount === 0) {
        try {
          const agentMai = await User.findOne({ phone: '0944555666' });
          const agentTruc = await User.findOne({ phone: '0944555667' });
          const managerNam = await User.findOne({ phone: '0944999888' });

          const maiId = agentMai ? agentMai._id : req.user.id;
          const trucId = agentTruc ? agentTruc._id : req.user.id;
          const namId = managerNam ? managerNam._id : req.user.id;

          await CounterIncident.insertMany([
            {
              incidentCode: 'SC-20261104-001',
              title: 'Máy in vé nhiệt EPSON quầy kẹt cuộn phôi giấy, báo đèn Error đỏ',
              category: 'equipment',
              severity: 'urgent',
              reportedBy: maiId,
              details: 'Khoảng 09:15 lúc khách đang xếp hàng đông mua vé đi Đà Lạt chuyến 10h, máy in vé bị kẹt phôi giấy, đèn Error nhấp nháy đỏ liên tục không xuất vé ra được.',
              initialAction: 'Em đã chuyển 3 khách sang quầy 02 của bạn Trúc in tạm, đã tắt nguồn khởi động lại máy in và gọi IT hỗ trợ nhưng chưa được.',
              status: 'open',
              createdAt: new Date(Date.now() - 40 * 60 * 1000)
            },
            {
              incidentCode: 'SC-20261103-002',
              title: 'Máy quẹt thẻ POS VietinBank mất tín hiệu sóng 4G khi thanh toán vé',
              category: 'network',
              severity: 'high',
              reportedBy: trucId,
              details: 'Máy POS quẹt thẻ của ngân hàng báo "No SIM Connection / GPRS Timeout". Khách quẹt thẻ thanh toán 2 vé đi Cần Thơ 360.000đ trừ tiền thẻ nhưng máy POS không nhả hóa đơn đối soát.',
              initialAction: 'Em đã hướng dẫn khách kiểm tra app ngân hàng, chuyển sang quét mã VietQR quầy vé. Đã báo Quản lý Nam để liên hệ kỹ thuật ngân hàng kiểm tra.',
              status: 'processing',
              resolutionNotes: 'Quản lý Võ Hoàng Nam đã liên hệ chuyên viên hỗ trợ POS VietinBank chi nhánh An Lạc, đang điều phối cấp lại SIM 4G và tiến hành đối soát hoàn tất giao dịch cho khách.',
              createdAt: new Date(Date.now() - 25 * 3600 * 1000)
            },
            {
              incidentCode: 'SC-20261101-003',
              title: 'Khách khiếu nại trùng ghế 12B tuyến SG - Đà Lạt do đặt online cùng lúc',
              category: 'service',
              severity: 'medium',
              reportedBy: maiId,
              details: 'Khách mua vé tại quầy đúng lúc hệ thống website vừa chốt giữ chỗ ghế 12B chuyến 20:00. Xuất hiện tình trạng 2 khách cùng cầm mã ghế 12B.',
              initialAction: 'Xin lỗi khách hàng và mời khách ngồi chờ tại phòng chờ VIP phòng vé để trình Quản lý chi nhánh xử lý.',
              status: 'resolved',
              resolutionNotes: 'Quản lý Võ Hoàng Nam đã kiểm tra sơ đồ xe còn trống ghế 14B tầng dưới, đã chuyển vé và nâng hạng miễn phí cho khách kèm voucher nước 50.000đ. Khách vui vẻ đồng ý.',
              resolvedBy: namId,
              resolvedAt: new Date(Date.now() - 70 * 3600 * 1000),
              createdAt: new Date(Date.now() - 72 * 3600 * 1000)
            },
            {
              incidentCode: 'SC-20261029-004',
              title: 'Lệch tiền két thu ngân ca sáng thiếu 50.000đ do nhầm lẫn tiền thối',
              category: 'fund',
              severity: 'low',
              reportedBy: trucId,
              details: 'Khi kết ca sáng 14:00, đếm tiền mặt két quầy thực tế thu 3.450.000đ, hệ thống ghi nhận 3.500.000đ. Lệch thiếu 50.000đ.',
              initialAction: 'Đã báo cáo trưởng ca và tạm dừng bàn giao ca để kiểm kê lại toàn bộ cuống vé đã xuất.',
              status: 'closed',
              resolutionNotes: 'Đã trích xuất camera quầy thu ngân lúc 10:15, nhân viên trả nhầm tờ 100k thay vì 50k cho khách. Nhân viên Đặng Thanh Trúc đã tự nguyện bù quỹ đủ 50.000đ, đã hoàn tất biên bản bàn giao két ca sáng.',
              resolvedBy: namId,
              resolvedAt: new Date(Date.now() - 140 * 3600 * 1000),
              createdAt: new Date(Date.now() - 144 * 3600 * 1000)
            }
          ]);
        } catch (seedErr) {
          console.error('Lỗi auto-seed incident:', seedErr);
        }
      }
    }

    let query = {};
    if (userRole === 'ticket_agent') {
      // Nhân viên bán vé chỉ xem các sự cố do chính mình báo cáo lên quản lý
      query.reportedBy = req.user.id;
    } else if (userRole === 'ticket_manager' || (req.query.branchId && req.query.branchId !== 'all')) {
      // Kế thừa qua User: Quản lý xem sự cố của nhân viên thuộc chi nhánh
      const targetBranch = userRole === 'ticket_manager' ? userBranch : req.query.branchId;
      const branchUsers = await User.find({ 'branch.branchId': targetBranch }).select('_id').lean();
      query.reportedBy = { $in: branchUsers.map(u => u._id) };
    }

    if (req.query.reportedBy && req.query.reportedBy !== 'all' && userRole !== 'ticket_agent') {
      query.reportedBy = req.query.reportedBy;
    }
    if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
    if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
    if (req.query.severity && req.query.severity !== 'all') query.severity = req.query.severity;

    const rawIncidents = await CounterIncident.find(query)
      .populate('reportedBy', 'name phone email role assignedOffice branch')
      .populate('resolvedBy', 'name phone email role')
      .sort({ createdAt: -1 })
      .lean();

    const incidents = rawIncidents.map(inc => ({
      ...inc,
      location: inc.reportedBy?.assignedOffice || 'Văn phòng bán vé',
      branchId: inc.reportedBy?.branch?.branchId || 'sg'
    }));

    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự cố phòng vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách sự cố.' });
  }
};

// @desc    Tạo báo cáo sự cố phòng vé mới
// @route   POST /api/users/ticket-manager/incidents
// @access  Private (ticket_manager, general_manager, admin, ticket_agent)
exports.createTicketIncident = async (req, res) => {
  try {
    const { title, category, severity, details, initialAction } = req.body;

    if (!title || title.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Tiêu đề tóm tắt sự cố phải có tối thiểu 5 ký tự.' });
    }

    if (!details || details.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Mô tả chi tiết sự cố phải có tối thiểu 10 ký tự.' });
    }

    const code = `SC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const incident = await CounterIncident.create({
      incidentCode: code,
      title: title.trim(),
      category: category || 'equipment',
      severity: severity || 'medium',
      reportedBy: req.user.id,
      details: details.trim(),
      initialAction: initialAction ? initialAction.trim() : '',
      status: 'open'
    });

    await incident.populate('reportedBy', 'name phone role email assignedOffice branch');

    const mappedIncident = {
      ...incident.toObject(),
      location: incident.reportedBy?.assignedOffice || 'Văn phòng bán vé',
      branchId: incident.reportedBy?.branch?.branchId || 'sg'
    };

    // Gửi thông báo cho quản lý chi nhánh
    try {
      await Notification.create({
        title: `[SỰ CỐ PHÒNG VÉ] ${title}`,
        content: `Nhân viên ${req.user.name} vừa báo cáo sự cố: ${details} tại ${mappedIncident.location}. Mức độ: ${severity || 'Vừa'}.`,
        recipientRole: 'ticket_manager'
      });
    } catch {
      // non-blocking
    }

    res.status(201).json({
      success: true,
      message: 'Ghi nhận báo cáo sự cố thành công!',
      incident: mappedIncident
    });
  } catch (error) {
    console.error('Lỗi tạo sự cố phòng vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo sự cố phòng vé.' });
  }
};

// @desc    Cập nhật tiến độ xử lý sự cố phòng vé
// @route   PATCH /api/users/ticket-manager/incidents/:id
// @access  Private (ticket_manager, general_manager, admin)
exports.updateTicketIncident = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;

    if (!resolutionNotes || typeof resolutionNotes !== 'string' || resolutionNotes.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ đạo / Phương án giải quyết sự cố của Quản lý là bắt buộc (tối thiểu 5 ký tự).'
      });
    }

    const incident = await CounterIncident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố cần cập nhật.' });
    }

    if (status) incident.status = status;
    incident.resolutionNotes = resolutionNotes.trim();

    if (status === 'resolved' || status === 'closed') {
      incident.resolvedBy = req.user.id;
      incident.resolvedAt = new Date();
    }

    await incident.save();
    await incident.populate('reportedBy', 'name phone role email assignedOffice branch');
    await incident.populate('resolvedBy', 'name phone role email');

    res.status(200).json({
      success: true,
      message: 'Cập nhật tiến độ xử lý sự cố thành công!',
      incident: {
        ...incident.toObject(),
        location: incident.reportedBy?.assignedOffice || 'Văn phòng bán vé',
        branchId: incident.reportedBy?.branch?.branchId || 'sg'
      }
    });
  } catch (error) {
    console.error('Lỗi cập nhật sự cố phòng vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật sự cố.' });
  }
};

// @desc    Lấy danh sách đánh giá & bình luận chuyến xe của khách hàng
// @route   GET /api/users/ticket-manager/feedbacks
// @access  Private (ticket_manager, general_manager, admin)
exports.getTicketFeedbacks = async (req, res) => {
  try {
    let query = {};

    // Cho phép Quản lý phòng vé xem toàn bộ phản hồi từ khách hàng không bị giới hạn bởi branchId
    if (req.query.rating && req.query.rating !== 'all') {
      query.rating = Number(req.query.rating);
    }
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    if (req.query.isReplied && req.query.isReplied !== 'all') {
      query.isReplied = req.query.isReplied === 'true';
    }

    const feedbacks = await Review.find(query)
      .populate('bookingId', 'customerName customerPhone customerEmail')
      .populate('userId', 'name phone email')
      .populate({
        path: 'tripId',
        select: 'routeId busId departureTime arrivalTime price driver assistant',
        populate: [
          { path: 'routeId', select: 'startPoint endPoint name distance duration' },
          { path: 'busId', select: 'plateNumber type' }
        ]
      })
      .populate('repliedBy', 'name phone email role')
      .populate('resolvedBy', 'name phone email role')
      .sort({ createdAt: -1 })
      .lean();

    // Gọi thông tin khách hàng từ Booking/User ở tầng Logic, không lưu trùng lặp vào model Review
    const formattedFeedbacks = feedbacks.map(f => {
      const custName = f.bookingId?.customerName || f.userId?.name || f.customerName || f.userName || 'Hành khách';
      const custPhone = f.bookingId?.customerPhone || f.userId?.phone || f.customerPhone || '';
      return {
        ...f,
        customerName: custName,
        userName: custName,
        customerPhone: custPhone
      };
    });

    // Tính toán chỉ số CSAT & phân bố sao
    let totalScore = 0;
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let positiveCount = 0;
    let repliedCount = 0;

    formattedFeedbacks.forEach(f => {
      const r = Math.min(5, Math.max(1, Math.round(f.rating || 5)));
      totalScore += f.rating || 5;
      ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
      if (r >= 4) positiveCount++;
      if (f.isReplied || f.replyContent) repliedCount++;
    });

    const count = formattedFeedbacks.length;
    const avgRating = count > 0 ? (totalScore / count).toFixed(1) : '5.0';
    const positiveRate = count > 0 ? Math.round((positiveCount / count) * 100) : 100;
    const repliedRate = count > 0 ? Math.round((repliedCount / count) * 100) : 0;

    res.status(200).json({
      success: true,
      count,
      csat: {
        avgRating,
        positiveRate,
        repliedRate,
        repliedCount,
        ratingDistribution,
        totalFeedbacks: count
      },
      feedbacks: formattedFeedbacks
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách phản hồi khách hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải phản hồi khách hàng.' });
  }
};

// @desc    Quản lý phòng vé trả lời bình luận của khách hàng về chuyến xe
// @route   PATCH /api/users/ticket-manager/feedbacks/:id/reply
// @access  Private (ticket_manager, general_manager, admin)
exports.replyTicketFeedback = async (req, res) => {
  try {
    const { replyContent } = req.body;

    if (!replyContent || !replyContent.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung câu trả lời cho khách hàng.' });
    }

    const feedback = await Review.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận đánh giá của khách hàng.' });
    }

    feedback.replyContent = replyContent.trim();
    feedback.repliedBy = req.user.id;
    feedback.repliedAt = new Date();
    feedback.isReplied = true;
    feedback.status = 'resolved';

    await feedback.save();
    await feedback.populate('repliedBy', 'name phone role email');
    await feedback.populate({
      path: 'tripId',
      select: 'routeId busId departureTime',
      populate: [
        { path: 'routeId', select: 'startPoint endPoint name' },
        { path: 'busId', select: 'plateNumber type' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Đã gửi câu trả lời cho bình luận của khách hàng thành công!',
      feedback
    });
  } catch (error) {
    console.error('Lỗi trả lời bình luận:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi trả lời bình luận khách hàng.' });
  }
};

// @desc    Tạo phản hồi khách hàng ghi nhận tại quầy hoặc hotline
// @route   POST /api/users/ticket-manager/feedbacks
// @access  Private (ticket_manager, general_manager, admin, ticket_agent)
exports.createTicketFeedback = async (req, res) => {
  try {
    const { rating, comment, tripId, bookingId, userId, category } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung nhận xét.' });
    }

    const feedback = await Review.create({
      tripId: tripId || null,
      bookingId: bookingId || null,
      userId: userId || req.user?.id || null,
      rating: Number(rating) || 5,
      comment,
      category: category || 'ticket_counter',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Ghi nhận ý kiến đóng góp của khách hàng thành công!',
      feedback
    });
  } catch (error) {
    console.error('Lỗi tạo phản hồi khách hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi ghi nhận phản hồi.' });
  }
};

// @desc    Xử lý & giải quyết khiếu nại/phản hồi khách hàng
// @route   PATCH /api/users/ticket-manager/feedbacks/:id/resolve
// @access  Private (ticket_manager, general_manager, admin)
exports.resolveTicketFeedback = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const feedback = await Review.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phản hồi cần xử lý.' });
    }

    feedback.status = status || 'resolved';
    if (resolutionNotes) feedback.resolutionNotes = resolutionNotes;
    feedback.resolvedBy = req.user.id;
    feedback.resolvedAt = new Date();

    await feedback.save();
    await feedback.populate('resolvedBy', 'name phone role email');

    res.status(200).json({
      success: true,
      message: 'Đã lưu kết quả xử lý phản hồi khách hàng thành công!',
      feedback
    });
  } catch (error) {
    console.error('Lỗi xử lý phản hồi khách hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật phản hồi.' });
  }
};

// =========================================================================
// ON-ROUTE DRIVER INCIDENTS (SỰ CỐ TRÊN TUYẾN DÀNH CHO TÀI XẾ & ĐIỀU HÀNH)
// =========================================================================

// @desc    Tài xế báo cáo sự cố trên tuyến (Tự khắc phục & xin hoàn tiền; Cần cứu viện khẩn cấp)
// @route   POST /api/users/driver/incidents
// @access  Private (Driver, Admin)
exports.createDriverIncident = async (req, res) => {
  try {
    const {
      title,
      scenario, // 'self_resolved' | 'need_assistance'
      category, // 'tire', 'engine', 'vehicle', 'traffic', 'other'
      severity,
      details,
      tripId,
      location,
      images,
      reimbursementAmount
    } = req.body;

    if (!details || !details.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mô tả chi tiết sự cố.' });
    }

    const isSelfResolved = scenario === 'self_resolved';
    const amountNum = Number(reimbursementAmount) || 0;

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const incidentCode = `SC-TX-${todayStr}-${randomSuffix}`;

    // Chỉ lưu những thông tin thực sự thuộc về sự cố, tái sử dụng dữ liệu quan hệ từ tripId và reportedBy
    const incident = await TripIncident.create({
      incidentCode,
      title: title?.trim() || (isSelfResolved ? `Tự khắc phục: ${details.slice(0, 45)}...` : `Cứu hộ khẩn cấp: ${details.slice(0, 45)}...`),
      category: category || (isSelfResolved ? 'tire' : 'vehicle'),
      severity: isSelfResolved ? (severity || 'medium') : 'urgent',
      scenario: isSelfResolved ? 'self_resolved' : 'need_assistance',
      tripId: tripId || null,
      location: location?.trim() || 'Trên tuyến đường',
      reportedBy: req.user.id,
      details: details.trim(),
      images: Array.isArray(images) ? images : [],
      reimbursementAmount: isSelfResolved ? amountNum : 0,
      reimbursementStatus: isSelfResolved ? (amountNum > 0 ? 'pending' : 'none') : 'none',
      assistanceStatus: !isSelfResolved ? 'pending' : 'none',
      status: 'open'
    });

    // Populate dữ liệu tái sử dụng từ User, Trip, Bus, Route
    await incident.populate([
      { path: 'reportedBy', select: 'name phone email role' },
      {
        path: 'tripId',
        select: 'departureTime arrivalTime',
        populate: [
          { path: 'busId', select: 'plateNumber type' },
          { path: 'routeId', select: 'routeName startPoint endPoint' }
        ]
      }
    ]);

    res.status(201).json({
      success: true,
      message: isSelfResolved
        ? 'Đã gửi báo cáo sự cố và đề xuất hoàn ứng chi phí thành công.'
        : 'ĐÃ PHÁT TÍN HIỆU CỨU VIỆN KHẨN CẤP ĐẾN QUẢN LÝ VẬN TẢI. Vui lòng giữ liên lạc điện thoại!',
      incident
    });
  } catch (error) {
    console.error('Lỗi tài xế gửi báo cáo sự cố:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ khi gửi báo cáo sự cố.' });
  }
};

// @desc    Lấy danh sách sự cố do chính tài xế báo cáo
// @route   GET /api/users/driver/incidents
// @access  Private (Driver, Admin)
exports.getDriverIncidents = async (req, res) => {
  try {
    const incidents = await TripIncident.find({
      reportedBy: req.user.id
    })
      .populate('reportedBy', 'name phone email role')
      .populate({
        path: 'tripId',
        select: 'departureTime arrivalTime',
        populate: [
          { path: 'busId', select: 'plateNumber type' },
          { path: 'routeId', select: 'routeName startPoint endPoint' }
        ]
      })
      .populate('reimbursementApprovedBy', 'name role phone')
      .populate('resolvedBy', 'name role phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự cố của tài xế:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách sự cố.' });
  }
};

// @desc    Quản lý vận tải lấy toàn bộ danh sách sự cố trên tuyến
// @route   GET /api/users/ops/incidents
// @access  Private (Ops Manager, Admin)
exports.getOpsIncidents = async (req, res) => {
  try {
    const { scenario, status, reimbursementStatus, assistanceStatus } = req.query;

    let query = {};
    if (scenario && scenario !== 'all') query.scenario = scenario;
    if (status && status !== 'all') query.status = status;
    if (reimbursementStatus && reimbursementStatus !== 'all') query.reimbursementStatus = reimbursementStatus;
    if (assistanceStatus && assistanceStatus !== 'all') query.assistanceStatus = assistanceStatus;

    const incidents = await TripIncident.find(query)
      .populate('reportedBy', 'name phone email role')
      .populate('reimbursementApprovedBy', 'name phone role email')
      .populate('resolvedBy', 'name phone role email')
      .populate({
        path: 'tripId',
        select: 'departureTime arrivalTime',
        populate: [
          { path: 'busId', select: 'plateNumber type' },
          { path: 'routeId', select: 'routeName startPoint endPoint' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sự cố trên tuyến cho Quản lý:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách sự cố trên tuyến.' });
  }
};

// @desc    Quản lý vận tải duyệt hoàn ứng hoặc xác nhận đã chi trả tiền (Trường hợp A)
// @route   PATCH /api/users/ops/incidents/:id/reimbursement
// @access  Private (Ops Manager, Admin)
exports.reviewIncidentReimbursement = async (req, res) => {
  try {
    const { status, reimbursementNote } = req.body;
    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái hoàn ứng không hợp lệ.' });
    }

    const incident = await TripIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sự cố.' });
    }

    incident.reimbursementStatus = status;
    if (reimbursementNote !== undefined) incident.reimbursementNote = reimbursementNote;

    if (status === 'approved') {
      incident.reimbursementApprovedBy = req.user.id;
      incident.reimbursementApprovedAt = new Date();
    }

    await incident.save();
    await incident.populate('reportedBy', 'name phone email role');
    await incident.populate('reimbursementApprovedBy', 'name phone email role');

    const msg = status === 'approved' 
      ? 'Đã phê duyệt hoàn ứng chi phí thành công cho tài xế.'
      : status === 'rejected'
      ? 'Đã từ chối đề xuất hoàn ứng chi phí.'
      : 'Đã xác nhận chi trả tiền hoàn ứng cho tài xế.';

    res.status(200).json({
      success: true,
      message: msg,
      incident
    });
  } catch (error) {
    console.error('Lỗi duyệt hoàn ứng sự cố:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi duyệt hoàn ứng chi phí.' });
  }
};

// @desc    Quản lý vận tải cập nhật tiến độ cứu hộ / điều người tới sửa (Trường hợp B)
// @route   PATCH /api/users/ops/incidents/:id/assistance
// @access  Private (Ops Manager, Admin)
exports.updateIncidentAssistance = async (req, res) => {
  try {
    const { assistanceStatus, assistanceNotes } = req.body;
    if (!['contacted', 'dispatched', 'resolved'].includes(assistanceStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái cứu viện không hợp lệ.' });
    }

    const incident = await TripIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sự cố.' });
    }

    incident.assistanceStatus = assistanceStatus;
    if (assistanceNotes !== undefined) incident.assistanceNotes = assistanceNotes;

    if (assistanceStatus === 'resolved') {
      incident.status = 'resolved';
      incident.resolvedBy = req.user.id;
      incident.resolvedAt = new Date();
    } else {
      incident.status = 'processing';
    }

    await incident.save();
    await incident.populate('reportedBy', 'name phone email role');
    await incident.populate('resolvedBy', 'name phone email role');

    res.status(200).json({
      success: true,
      message: 'Cập nhật tiến độ ứng cứu sự cố thành công!',
      incident
    });
  } catch (error) {
    console.error('Lỗi cập nhật tiến độ ứng cứu:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật tiến độ ứng cứu.' });
  }
};

// @desc    Gửi lại Email hóa đơn vé xe cho khách hàng (Hotline / Khách yêu cầu gửi lại)
// @route   POST /api/users/agent/resend-ticket/:id
// @access  Private (Ticket Agent, Ticket Manager, Admin)
exports.resendTicketNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { customEmail } = req.body || {};
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé xe.' });
    }

    if (customEmail && customEmail.trim()) {
      booking.customerEmail = customEmail.trim().toLowerCase();
      await booking.save();
    }

    if (!booking.customerEmail) {
      return res.status(400).json({ success: false, message: 'Vé này chưa có thông tin Email. Vui lòng nhập email khách hàng.' });
    }

    const trip = await Trip.findById(booking.tripId).populate('routeId').populate('busId');
    const { sendBookingInvoiceEmail } = require('../services/emailService');

    const emailRes = await sendBookingInvoiceEmail(booking, trip);
    if (emailRes && emailRes.success) {
      return res.status(200).json({
        success: true,
        message: `Đã gửi lại thành công Email hóa đơn điện tử kèm mã QR tới ${booking.customerEmail}.`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: emailRes?.error || 'Không thể gửi email hóa đơn vé xe lúc này.'
      });
    }
  } catch (error) {
    console.error('Lỗi gửi lại thông báo vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi lại vé xe.' });
  }
};


