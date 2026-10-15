const bookingRepository = require('../repositories/bookingRepository');
const tripRepository = require('../repositories/tripRepository');
const userService = require('./userService');
const { sendBookingInvoiceEmail } = require('./emailService');
const mongoose = require('mongoose');

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
      paymentType
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
    //    Đây là nguồn sự thật cho báo cáo doanh thu - không được tính lại sau
    const pricePerSeat = await this._getActualPriceForTrip(trip);
    const totalAmount = pricePerSeat * seats.length;

    // 5. Save booking kèm giá thực tế tại thời điểm đặt
    const booking = await bookingRepository.create({
      tripId,
      userId,
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
      status: 'pending',
      pricePerSeat,
      totalAmount
    });

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
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      booking.paymentExpiresAt = expiresAt;
      booking.status = 'pending';
      await bookingRepository.save(booking);
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
    booking.status = 'cancelled';
    await bookingRepository.save(booking);

    // Release seats back to trip-service so seat map is updated
    try {
      const trip = await tripRepository.findById(booking.tripId);
      if (trip) {
        trip.bookedSeats = (trip.bookedSeats || []).filter(s => !booking.seats.includes(s));
        await tripRepository.save(trip);
        console.log(`[cancelBooking] Released seats ${booking.seats.join(',')} for trip ${booking.tripId}`);
      }
    } catch (releaseErr) {
      console.error('[cancelBooking] Failed to release seats:', releaseErr.message);
    }

    return booking;
  }
}

module.exports = new BookingService();
