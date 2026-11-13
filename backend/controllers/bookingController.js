const bookingService = require('../services/bookingService');
const payosPaymentService = require('../services/payosPaymentService');

// @desc    Create a new booking and save to MongoDB
// @route   POST /book
// @access  Public
exports.createBooking = async (req, res) => {
  try {
    let { 
      tripId, 
      userId, 
      seats, 
      pickup, 
      dropoff,
      customerName,
      customerPhone,
      customerBirthYear,
      customerCCCD,
      customerEmail,
      paymentType,
      pointsUsed = 0,
      voucherCode = ''
    } = req.body;

    const isGuest = !userId || userId === 'user_guest' || userId === 'guest';
    const finalUserId = isGuest ? 'user_guest' : userId;

    if (!tripId || !seats || !seats.length || !pickup || !dropoff || 
        !customerName || !customerPhone || !customerBirthYear || !customerCCCD) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin đặt vé và thông tin khách hàng.'
      });
    }

    // Phân quyền bảo mật: Khách vãng lai (Guest - Không đăng nhập)
    // 1. KHÔNG ĐƯỢC dùng Voucher và Điểm thưởng
    // 2. KHÔNG ĐƯỢC phép thanh toán sau (bắt buộc thanh toán ngay)
    if (isGuest) {
      pointsUsed = 0;
      voucherCode = '';
      paymentType = 'immediate';
    }

    const booking = await bookingService.createBooking({
      tripId, 
      userId: finalUserId, 
      seats, 
      pickup, 
      dropoff,
      customerName, 
      customerPhone, 
      customerBirthYear,
      customerCCCD, 
      customerEmail, 
      paymentType, 
      pointsUsed, 
      voucherCode
    });

    // Tạo liên kết thanh toán payOS trực tiếp nếu thanh toán ngay và còn số tiền cần thanh toán
    let payosData = null;
    if (booking.paymentType === 'immediate' && booking.totalAmount > 0) {
      try {
        const linkRes = await payosPaymentService.createPaymentLink({
          orderCode: booking.orderCode,
          amount: booking.totalAmount,
          description: `SmartBus ${booking.orderCode}`,
          buyerName: booking.customerName,
          buyerEmail: booking.customerEmail,
          buyerPhone: booking.customerPhone
        });
        if (linkRes && linkRes.success) {
          payosData = linkRes;
        }
      } catch (payosErr) {
        console.warn('[payOS Link creation] Error:', payosErr.message);
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'Tạo thông tin đặt vé thành công.', 
      booking,
      payosData 
    });
  } catch (error) {
    console.error('Lỗi lưu thông tin đặt vé:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lưu thông tin đặt vé.'
    });
  }
};

// @desc    Update booking payment type (immediate / later)
// @route   PATCH /book/:id
// @access  Public
exports.updateBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentType } = req.body;
    const booking = await bookingService.updateBookingPayment(id, { paymentType });
    res.status(200).json({ success: true, message: 'Cập nhật hình thức thanh toán thành công.', booking });
  } catch (error) {
    console.error('Lỗi cập nhật đặt vé:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật thông tin đặt vé.'
    });
  }
};

// @desc    Webhook handler for PayOS payments
// @route   POST /payment/webhook
// @access  Public
exports.payosWebhook = async (req, res) => {
  try {
    const { code, data, description } = req.body;
    console.log('[PayOS Webhook Received in booking-service]:', JSON.stringify(req.body, null, 2));

    const booking = await bookingService.payosWebhook({ code, data, description });

    if (booking) {
      return res.status(200).json({ success: true, message: 'Thanh toán thành công qua PayOS Webhook' });
    }
    res.status(200).json({ success: true, message: 'Nhận dữ liệu webhook thành công' });
  } catch (error) {
    console.error('[PayOS Webhook Error in booking-service]:', error);
    res.status(500).json({ success: false, message: 'Lỗi xử lý webhook' });
  }
};

// @desc    Get booking by orderCode
// @route   GET /order/:orderCode
// @access  Public
exports.getBookingByOrderCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const booking = await bookingService.getBookingByOrderCode(orderCode);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé.' });
    }
    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error('Lỗi lấy trạng thái vé theo mã:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tra cứu mã vé.' });
  }
};

// @desc    Get all bookings for a specific user (sorted newest first)
// @route   GET /my-bookings/:userId
// @access  Public
exports.getMyBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await bookingService.getMyBookings(userId);
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Lỗi lấy danh sách vé:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy danh sách vé.' });
  }
};

// @desc    Cancel a pending booking (expired or user-requested)
// @route   PATCH /book/:id/cancel
// @access  Public
exports.cancelExpiredBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await bookingService.cancelBooking(id);
    res.status(200).json({ success: true, message: 'Vé đã được hủy.', booking });
  } catch (error) {
    console.error('Lỗi hủy vé:', error);
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};
