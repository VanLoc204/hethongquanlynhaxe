const bookingRepository = require('../repositories/bookingRepository');
const tripRepository = require('../repositories/tripRepository');
const userService = require('./userService');
const { sendBookingInvoiceEmail } = require('./emailService');
const mongoose = require('mongoose');
const User = require('../models/User');

class BookingService {
  async fetchTripDetails(tripId) {
    const trip = await tripRepository.findByIdWithPopulate(tripId);
    if (!trip) {
      throw new Error('Chuyến đi không tồn tại.');
    }
    return trip;
  }

  async createBooking(bookingData) {
    const { 
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
    } = bookingData;

    // 1. Verify trip exists
    const trip = await this.fetchTripDetails(tripId);

    // 2. Check seat availability in local database
    const existingBookings = await bookingRepository.find({ tripId, status: { $ne: 'cancelled' } });
    const alreadyBookedSeats = existingBookings.flatMap(b => b.seats);
    const doubleBooked = seats.filter(seat => alreadyBookedSeats.includes(seat));

    if (doubleBooked.length > 0) {
      throw new Error(`Ghế ${doubleBooked.join(', ')} đã có người đặt trước. Vui lòng chọn ghế khác.`);
    }

    // 3. Generate unique orderCode
    let orderCode = Math.floor(100000 + Math.random() * 900000);
    let orderCodeExists = await bookingRepository.findOne({ orderCode });
    while (orderCodeExists) {
      orderCode = Math.floor(100000 + Math.random() * 900000);
      orderCodeExists = await bookingRepository.findOne({ orderCode });
    }

    let paymentExpiresAt = null;
    if (paymentType === 'later') {
      paymentExpiresAt = new Date();
      paymentExpiresAt.setDate(paymentExpiresAt.getDate() + 5);
    }

    // 4. Tính giá vé thực tế tại thời điểm đặt (sau khi áp pricing rules)
    const pricePerSeat = await this._getActualPriceForTrip(trip);
    const originalAmount = pricePerSeat * seats.length;

    const isGuest = !userId || userId === 'user_guest' || userId === 'guest';

    // 5. Khấu trừ Voucher khuyến mãi nếu có (CHỈ DÀNH CHO THÀNH VIÊN ĐÃ ĐĂNG NHẬP)
    let actualVoucherDiscount = 0;
    let appliedVoucherCode = '';
    if (!isGuest && voucherCode && String(voucherCode).trim()) {
      const Promotion = require('../models/Promotion');
      const cleanCode = String(voucherCode).trim().toUpperCase();
      const promo = await Promotion.findOne({ code: cleanCode, status: 'active' });
      if (promo) {
        // Kiểm tra điều kiện tối thiểu nếu có
        if (!promo.minOrderValue || originalAmount >= promo.minOrderValue) {
          appliedVoucherCode = promo.code;
          if (promo.discountType === 'percentage') {
            actualVoucherDiscount = Math.round((originalAmount * promo.discountValue) / 100);
            if (promo.maxDiscountAmount > 0 && actualVoucherDiscount > promo.maxDiscountAmount) {
              actualVoucherDiscount = promo.maxDiscountAmount;
            }
          } else {
            actualVoucherDiscount = Math.min(originalAmount, promo.discountValue);
          }
          // Tăng lượt sử dụng
          promo.usedCount = (promo.usedCount || 0) + 1;
          await promo.save();
          console.log(`[Promotion System] Applied voucher ${appliedVoucherCode}, discount: ${actualVoucherDiscount} VND`);
        }
      }
    }

    const amountAfterVoucher = Math.max(0, originalAmount - actualVoucherDiscount);

    // 6. Khấu trừ điểm tích lũy thành viên (1 điểm = 1 VNĐ) nếu có yêu cầu (CHỈ DÀNH CHO THÀNH VIÊN ĐÃ ĐĂNG NHẬP)
    let customerUser = null;
    let actualPointsUsed = 0;
    if (!isGuest) {
      if (userId && userId !== 'user_guest' && userId !== 'guest' && userId.match(/^[0-9a-fA-F]{24}$/)) {
        customerUser = await User.findById(userId);
      }
      if (!customerUser && customerPhone) {
        customerUser = await User.findOne({ phone: customerPhone.trim(), role: 'customer' });
      }

      if (customerUser) {
        const availablePoints = customerUser.points || 0;
        const maxPointsCanUse = Math.min(availablePoints, amountAfterVoucher);
        actualPointsUsed = Math.min(Math.max(0, Number(pointsUsed) || 0), maxPointsCanUse);

        if (actualPointsUsed > 0) {
          customerUser.points = Math.max(0, (customerUser.points || 0) - actualPointsUsed);
          await customerUser.save();
          console.log(`[Points System] Deducted ${actualPointsUsed} points from customer ${customerUser.phone}. Remaining points: ${customerUser.points}`);
        }
      }
    }

    const finalAmount = Math.max(0, amountAfterVoucher - actualPointsUsed);

    // Nếu thanh toán ngay và số tiền còn lại bằng 0 (đã trả đủ 100% bằng điểm/voucher)
    const isFullyPaidByPoints = paymentType === 'immediate' && finalAmount === 0 && (actualPointsUsed > 0 || actualVoucherDiscount > 0);
    const bookingStatus = isFullyPaidByPoints ? 'paid' : 'pending';

    // 7. Save booking kèm chi tiết điểm, voucher và giá thực tế
    const booking = await bookingRepository.create({
      tripId,
      userId: isGuest ? 'user_guest' : (customerUser ? customerUser._id.toString() : userId),
      seats,
      pickup,
      dropoff,
      customerName,
      customerPhone,
      customerBirthYear,
      customerCCCD,
      customerEmail: customerEmail || '',
      paymentType: paymentType || 'immediate',
      paymentExpiresAt,
      orderCode,
      status: bookingStatus,
      pricePerSeat,
      originalAmount,
      voucherCode: appliedVoucherCode,
      voucherDiscount: actualVoucherDiscount,
      pointsUsed: actualPointsUsed,
      discountFromPoints: actualPointsUsed,
      totalAmount: finalAmount
    });

    // Nếu đã thanh toán đủ bằng điểm, tự động khóa ghế ngay lập tức
    if (isFullyPaidByPoints) {
      trip.bookedSeats = [...(trip.bookedSeats || []), ...seats];
      await tripRepository.save(trip);

      const seatLockService = require('./seatLockService');
      seatLockService.unlockSeats(tripId.toString(), seats);
      seatLockService.broadcast(tripId.toString(), 'BOOKED_SEATS', {
        tripId: tripId.toString(),
        bookedSeats: seats
      });
    }

    return booking;
  }

  // Helper: Tính giá thực tế cho chuyến đi sau khi áp tất cả pricing rules hiện hành
  // Logic này mirror tripService.applyPricingRules() nhưng chỉ trả về giá số
  async _getActualPriceForTrip(trip) {
    try {
      const tripObj = trip.toObject ? trip.toObject() : trip;
      const basePrice = tripObj.price || 0;
      const departureDate = new Date(tripObj.departureTime);
      const dayOfWeek = departureDate.getDay();

      const activeRules = await mongoose.connection.db
        .collection('pricingrules')
        .find({ isActive: true })
        .toArray();

      let finalPrice = basePrice;

      const routeIdStr = tripObj.routeId?._id
        ? tripObj.routeId._id.toString()
        : (tripObj.routeId || '').toString();

      const busType = tripObj.busId?.type || '';

      for (const rule of activeRules) {
        const routeMatch = rule.routeId === 'all' || rule.routeId.toString() === routeIdStr;
        const busMatch = rule.busType === 'all' ||
          (busType && busType.toLowerCase().includes(rule.busType.toLowerCase()));
        const dayMatch = !rule.dayOfWeek?.length || rule.dayOfWeek.includes(dayOfWeek);

        if (routeMatch && busMatch && dayMatch) {
          if (rule.adjustmentType === 'percentage') {
            finalPrice = finalPrice * (1 + rule.adjustmentValue / 100);
          } else if (rule.adjustmentType === 'flat') {
            finalPrice = finalPrice + rule.adjustmentValue;
          }
        }
      }

      return Math.max(0, Math.round(finalPrice));
    } catch (err) {
      console.error('[BookingService] Error calculating actual price, using base price:', err.message);
      const tripObj = trip.toObject ? trip.toObject() : trip;
      return tripObj.price || 0;
    }
  }

  async updateBookingPayment(id, { paymentType }) {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      const err = new Error('Không tìm thấy thông tin đặt vé.');
      err.statusCode = 404;
      throw err;
    }
    
    booking.paymentType = paymentType;
    if (paymentType === 'later') {
      // Phân quyền: Khách vãng lai (Guest) không có quyền thanh toán sau
      if (!booking.userId || booking.userId === 'user_guest' || booking.userId === 'guest') {
        const err = new Error('Khách vãng lai không được phép chọn hình thức thanh toán sau. Vui lòng hoàn tất thanh toán trực tuyến ngay để giữ vé.');
        err.statusCode = 400;
        throw err;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      booking.paymentExpiresAt = expiresAt;
      booking.status = 'pending';
      await bookingRepository.save(booking);

      // Giải phóng khóa tạm thời và phát tán ghế đã giữ chỗ tới tất cả client
      const seatLockService = require('./seatLockService');
      seatLockService.unlockSeats(booking.tripId.toString(), booking.seats);
      seatLockService.broadcast(booking.tripId.toString(), 'BOOKED_SEATS', {
        tripId: booking.tripId.toString(),
        bookedSeats: booking.seats
      });

      try {
        const Trip = require('../models/Trip');
        const tripDoc = await Trip.findById(booking.tripId);
        if (tripDoc) {
          tripDoc.bookedSeats = [...new Set([...(tripDoc.bookedSeats || []), ...booking.seats])];
          await tripDoc.save();
        }
      } catch (e) { }
      // DO NOT send email here – email is only sent after successful payment (webhook)
    } else if (paymentType === 'immediate') {
      booking.status = 'pending';
      await bookingRepository.save(booking);
    }
    
    return booking;
  }

  async payosWebhook({ code, data, description }) {
    if (code === '00' && data) {
      const { orderCode, description: payosDesc } = data;
      const desc = payosDesc || description || '';
      
      let booking;
      if (orderCode) {
        booking = await bookingRepository.findOne({ orderCode: Number(orderCode) });
      }
      
      if (!booking && desc) {
        const match = desc.match(/[0-9a-fA-F]{24}/);
        if (match) {
          booking = await bookingRepository.findById(match[0]);
        }
      }

      if (booking) {
        booking.status = 'paid';
        await bookingRepository.save(booking);
        console.log(`[PayOS Webhook in booking-service] Payment confirmed. Booking ID: ${booking._id} status updated to paid.`);
        
        // Giải phóng khóa tạm thời và thông báo ghế đã thanh toán thành công
        const seatLockService = require('./seatLockService');
        seatLockService.unlockSeats(booking.tripId.toString(), booking.seats);
        seatLockService.broadcast(booking.tripId.toString(), 'BOOKED_SEATS', {
          tripId: booking.tripId.toString(),
          bookedSeats: booking.seats
        });

        try {
          const Trip = require('../models/Trip');
          const tripDoc = await Trip.findById(booking.tripId);
          if (tripDoc) {
            tripDoc.bookedSeats = [...new Set([...(tripDoc.bookedSeats || []), ...booking.seats])];
            await tripDoc.save();
          }
        } catch (tripSaveErr) {
          console.error('[BookingService Webhook] Error updating trip.bookedSeats:', tripSaveErr.message);
        }
        
        // 1. Lấy tổng tiền thực tế đã lưu trong booking (chính xác 100%)
        //    Không cần fetch trip lại và tính lại — giá đã được snapshot lúc đặt
        let trip = null;
        const totalPrice = booking.totalAmount || (booking.pricePerSeat * booking.seats.length) || 0;
        try {
          trip = await this.fetchTripDetails(booking.tripId);
        } catch (tripErr) {
          console.error('[BookingService Webhook] Error fetching trip details for email:', tripErr.message);
        }

        // 2. Crediting points based on membership tier rules
        // CHỈ TÍCH ĐIỂM THƯỞNG CHO THÀNH VIÊN ĐÃ ĐĂNG NHẬP (KHÔNG TÍCH ĐIỂM CHO KHÁCH VÃNG LAI)
        if (booking.userId && booking.userId !== 'user_guest' && booking.userId !== 'guest') {
          try {
            const user = await userService.getUserById(booking.userId);
            if (user) {
              const tier = user.membershipTier || 'Bronze';
              let multiplier = 0.01; // Bronze: 1%
              if (tier === 'Silver') multiplier = 0.02;
              else if (tier === 'Gold') multiplier = 0.03;
              else if (tier === 'Platinum') multiplier = 0.05;

              const earnedPoints = Math.floor(totalPrice * multiplier);

              if (earnedPoints > 0) {
                const updatedUser = await userService.updateUserPoints(booking.userId, earnedPoints);
                console.log(`[Points System] Successfully credited ${earnedPoints} points to user ${booking.userId}. New points: ${updatedUser.points}, Tier: ${updatedUser.membershipTier}`);
              }
            }
          } catch (pointsErr) {
            console.error('[Points System] Error updating user points:', pointsErr);
          }
        }

        // 3. Send Booking Invoice Email
        try {
          if (trip && booking.customerEmail) {
            await sendBookingInvoiceEmail(booking, trip);
            console.log(`[PayOS Webhook] Sent booking invoice email to ${booking.customerEmail}`);
          }
        } catch (mailErr) {
          console.error('[PayOS Webhook] Failed sending booking email:', mailErr);
        }

        return booking;
      }
    }
    return null;
  }

  async getBookingByOrderCode(orderCode) {
    return await bookingRepository.findOne({ orderCode: Number(orderCode) });
  }

  async getMyBookings(userId) {
    // Return ALL bookings (including cancelled) for user, sorted newest first
    return await bookingRepository.find({ userId }, { sort: { createdAt: -1 } });
  }

  async cancelBooking(id) {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      const err = new Error('Không tìm thấy vé.');
      err.statusCode = 404;
      throw err;
    }
    if (booking.status === 'cancelled') return booking; // idempotent

    // Kiểm tra thời gian khởi hành: Chỉ được hủy trước giờ khởi hành ít nhất 5 ngày
    const trip = await tripRepository.findById(booking.tripId);
    if (trip) {
      const departureTime = new Date(trip.departureTime);
      const now = new Date();
      const diffMs = departureTime - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < 5 && booking.status === 'paid') {
        const err = new Error('Không thể hủy vé! Chuyến xe đã khởi hành hoặc còn dưới 5 ngày trước giờ xuất bến (chỉ được phép hủy vé trước 5 ngày).');
        err.statusCode = 400;
        throw err;
      }
    }

    // Nếu vé đã thanh toán (paid), hoàn trả 100% bằng ĐIỂM TÍCH LŨY cho tài khoản thành viên
    if (booking.status === 'paid') {
      const refundPoints = (booking.totalAmount || 0) + (booking.pointsUsed || 0);
      let customerUser = null;
      if (booking.userId && booking.userId.match(/^[0-9a-fA-F]{24}$/)) {
        customerUser = await User.findById(booking.userId);
      }
      if (!customerUser && booking.customerPhone) {
        customerUser = await User.findOne({ phone: booking.customerPhone.trim(), role: 'customer' });
      }

      if (customerUser && refundPoints > 0) {
        customerUser.points = (customerUser.points || 0) + refundPoints;
        if (customerUser.points >= 2000) customerUser.membershipTier = 'Platinum';
        else if (customerUser.points >= 1000) customerUser.membershipTier = 'Gold';
        else if (customerUser.points >= 500) customerUser.membershipTier = 'Silver';
        await customerUser.save();
        console.log(`[Points System] Refunded ${refundPoints} points to customer ${customerUser.phone}. New points: ${customerUser.points}`);
      }

      booking.refundMethod = 'points';
      booking.refundAmount = refundPoints;
      booking.cancellationFee = 0;
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await bookingRepository.save(booking);

    // Release seats back to trip-service so seat map is updated
    try {
      if (trip) {
        trip.bookedSeats = (trip.bookedSeats || []).filter(s => !booking.seats.includes(s));
        await tripRepository.save(trip);
        console.log(`[cancelBooking] Released seats ${booking.seats.join(',')} for trip ${booking.tripId}`);

        const seatLockService = require('./seatLockService');
        seatLockService.broadcast(booking.tripId.toString(), 'RELEASED_SEATS', {
          tripId: booking.tripId.toString(),
          releasedSeats: booking.seats
        });
      }
    } catch (releaseErr) {
      console.error('[cancelBooking] Failed to release seats:', releaseErr.message);
    }

    return booking;
  }
}

module.exports = new BookingService();
