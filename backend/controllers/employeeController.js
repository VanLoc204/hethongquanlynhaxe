const User = require('../models/User');
const Trip = require('../models/Trip');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const ShiftSession = require('../models/ShiftSession');
const Booking = require('../models/Booking');
const Payroll = require('../models/Payroll');
const WorkSchedule = require('../models/WorkSchedule');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const generateTicketSignature = (bookingId) => {
  const secret = process.env.JWT_SECRET || 'adongtravel_secret';
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
      .populate('routeId', 'startPoint endPoint distance duration')
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

// @desc    Get mock payroll details (Fixed Salary)
// @route   GET /api/v1/users/salary
// @access  Private (All Staff)
exports.getMySalary = async (req, res) => {
  try {
    const qMonth = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const qYear = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    if (isNaN(qMonth) || qMonth < 1 || qMonth > 12 || isNaN(qYear)) {
      return res.status(400).json({ success: false, message: 'Tháng hoặc năm không hợp lệ.' });
    }

    // Query MongoDB for the payroll record
    let payroll = await Payroll.findOne({
      employeeId: req.user.id,
      month: qMonth,
      year: qYear
    }).lean();

    // If not found, compute it and save it to MongoDB as a permanent record
    if (!payroll) {
      const roleSalary = {
        driver: { base: 12000000, allowance: 1000000, insurance: 500000 },
        attendant: { base: 8000000, allowance: 800000, insurance: 400000 },
        ticket_agent: { base: 7500000, allowance: 500000, insurance: 375000 },
        fleet_manager: { base: 15000000, allowance: 1500000, insurance: 750000 },
        ops_manager: { base: 16000000, allowance: 1500000, insurance: 800000 }
      };

      const details = roleSalary[req.user.role];
      if (!details) {
        return res.status(403).json({ success: false, message: 'Vai trò này không nằm trong danh sách hưởng lương cố định nhân viên.' });
      }

      const netSalary = details.base + details.allowance - details.insurance;

      const fullUser = await User.findById(req.user.id).select('name phone').lean();

      const newPayroll = await Payroll.create({
        employeeId: req.user.id,
        phone: fullUser?.phone || 'N/A',
        name: fullUser?.name || 'N/A',
        role: req.user.role,
        month: qMonth,
        year: qYear,
        baseSalary: details.base,
        allowance: details.allowance,
        insuranceDeduction: details.insurance,
        netSalary,
        status: 'paid',
        paymentDate: new Date(qYear, qMonth - 1, 5)
      });
      
      payroll = newPayroll.toObject();
    }

    res.status(200).json({
      success: true,
      payroll
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

// @desc    Start shift session for ticket agent
// @route   POST /api/v1/users/shift/start
// @access  Private (Ticket Agent)
exports.startShift = async (req, res) => {
  try {
    const { counterNumber, initialCash } = req.body;
    if (!counterNumber) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số quầy vé để mở ca.' });
    }

    // Check if there is an active session
    const activeSession = await ShiftSession.findOne({ userId: req.user.id, status: 'active' }).lean();
    if (activeSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bạn đang có một ca làm việc hoạt động. Vui lòng đóng ca trực cũ trước.',
        session: activeSession
      });
    }

    const session = await ShiftSession.create({
      userId: req.user.id,
      counterNumber,
      initialCash: Number(initialCash) || 0,
      startTime: new Date(),
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Mở ca làm việc tại quầy thành công.',
      session
    });
  } catch (error) {
    console.error('Lỗi mở ca trực:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi mở ca làm việc.' });
  }
};

// @desc    End shift session for ticket agent
// @route   POST /api/v1/users/shift/end
// @access  Private (Ticket Agent)
exports.endShift = async (req, res) => {
  try {
    const { notes } = req.body;
    const session = await ShiftSession.findOne({ userId: req.user.id, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc hoạt động nào của bạn.' });
    }

    session.status = 'closed';
    session.endTime = new Date();
    if (notes) {
      session.notes = notes;
    }
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Đóng ca trực và tổng kết thành công.',
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
        populate: {
          path: 'tripId',
          populate: [
            { path: 'routeId', select: 'startPoint endPoint' },
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
// @access  Private (Ticket Agent)
exports.getShiftHistory = async (req, res) => {
  try {
    const history = await ShiftSession.find({ userId: req.user.id })
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

// @desc    Find tickets/bookings by orderCode or customer phone number
// @route   GET /api/v1/users/agent/tickets
// @access  Private (Ticket Agent)
exports.lookupTickets = async (req, res) => {
  try {
    const { query } = req.query; // can be orderCode or phone number
    if (!query) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp SĐT hoặc Mã Vé để tìm kiếm.' });
    }

    let filter = {};
    if (/^\d+$/.test(query)) {
      // numeric query: can be orderCode (6-digits) or phone number
      if (query.length === 6) {
        filter = { orderCode: Number(query) };
      } else {
        filter = { customerPhone: query };
      }
    } else {
      filter = { customerName: new RegExp(query, 'i') };
    }

    const bookings = await Booking.find(filter)
      .populate({
        path: 'tripId',
        populate: [
          { path: 'routeId', select: 'startPoint endPoint' },
          { path: 'busId', select: 'plateNumber type' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    const bookingsWithQr = bookings.map(b => ({
      ...b,
      qrSignature: generateTicketSignature(b._id)
    }));

    res.status(200).json({
      success: true,
      count: bookings.length,
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
    const leaves = await LeaveRequest.find()
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
    const { status } = req.body; // 'approved' or 'rejected'

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

    leave.status = status;
    await leave.save();

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


