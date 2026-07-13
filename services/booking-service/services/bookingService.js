const bookingRepository = require('../repositories/bookingRepository');
const { sendBookingInvoiceEmail } = require('./emailService');

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || 'http://trip-service:8003';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:8002';

class BookingService {
  async fetchTripDetails(tripId) {
    try {
      const res = await fetch(`${TRIP_SERVICE_URL}/${tripId}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`[BookingService] fetch trip failed. Status: ${res.status}, URL: ${res.url}, Body: ${text}`);
        throw new Error('Chuyến đi không tồn tại.');
      }
      const data = await res.json();
      if (!data.success || !data.trip) {
        throw new Error('Không lấy được chi tiết chuyến đi.');
      }
      return data.trip;
    } catch (err) {
      console.error('[BookingService] Error fetching trip details:', err.message);
      throw new Error(err.message || 'Lỗi liên kết thông tin chuyến đi.');
    }
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

    // 1. Verify trip exists in trip-service
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

    // 4. Save booking
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
      status: 'pending'
    });

    return booking;
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
      // ❌ DO NOT send email here – email is only sent after successful payment (webhook)
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
        
        // Crediting points based on membership tier rules
        try {
          const userRes = await fetch(`${USER_SERVICE_URL}/${booking.userId}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.success && userData.user) {
              const tier = userData.user.membershipTier || 'Bronze';
              let multiplier = 0.01; // Bronze: 1%
              if (tier === 'Silver') multiplier = 0.02;
              else if (tier === 'Gold') multiplier = 0.03;
              else if (tier === 'Platinum') multiplier = 0.05;

              const totalPrice = booking.totalPrice || 0;
              const earnedPoints = Math.floor(totalPrice * multiplier);

              if (earnedPoints > 0) {
                const updateRes = await fetch(`${USER_SERVICE_URL}/${booking.userId}/points`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ amount: earnedPoints })
                });
                if (updateRes.ok) {
                  const updatedUser = await updateRes.json();
                  console.log(`[Points System] Successfully credited ${earnedPoints} points to user ${booking.userId}. New points: ${updatedUser.points}, Tier: ${updatedUser.membershipTier}`);
                } else {
                  console.error(`[Points System] Failed to update user points: status ${updateRes.status}`);
                }
              }
            }
          }
        } catch (pointsErr) {
          console.error('[Points System] Error updating user points:', pointsErr);
        }

        try {
          const trip = await this.fetchTripDetails(booking.tripId);
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
      const releaseRes = await fetch(
        `${TRIP_SERVICE_URL}/${booking.tripId}/release-seats`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seats: booking.seats })
        }
      );
      if (!releaseRes.ok) {
        const txt = await releaseRes.text();
        console.warn(`[cancelBooking] release-seats returned ${releaseRes.status}: ${txt}`);
      } else {
        console.log(`[cancelBooking] Released seats ${booking.seats.join(',')} for trip ${booking.tripId}`);
      }
    } catch (releaseErr) {
      // Non-critical – booking is already cancelled in DB
      console.error('[cancelBooking] Failed to release seats in trip-service:', releaseErr.message);
    }

    return booking;
  }
}

module.exports = new BookingService();
