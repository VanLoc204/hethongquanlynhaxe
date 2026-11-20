const seatLockService = require('../services/seatLockService');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');

// @desc    Stream seat lock events via Server-Sent Events (SSE)
// @route   GET /api/trips/:id/seat-locks/stream
exports.streamSeatLocks = async (req, res) => {
  const { id: tripId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering if any
  res.flushHeaders?.();

  seatLockService.subscribe(tripId, res);

  // Heartbeat ping every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeat);
  });
};

// @desc    Get all current locked seats for a trip
// @route   GET /api/trips/:id/locked-seats
exports.getLockedSeats = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const lockedSeats = seatLockService.getLockedSeats(tripId);
    res.status(200).json({ success: true, tripId, lockedSeats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lock a seat for 5 minutes
// @route   POST /api/trips/:id/lock-seat
exports.lockSeat = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { seat, clientId } = req.body;

    if (!seat || !clientId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã ghế và mã định danh client.' });
    }

    // Verify trip exists and seat is not already booked
    const trip = await Trip.findById(tripId).select('bookedSeats');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Chuyến xe không tồn tại.' });
    }

    const isBookedInDoc = (trip.bookedSeats || []).includes(seat);
    const existingPaidBooking = !isBookedInDoc ? await Booking.findOne({
      tripId,
      seats: seat,
      status: { $in: ['paid', 'confirmed'] }
    }) : null;

    if (isBookedInDoc || existingPaidBooking) {
      return res.status(400).json({ success: false, message: `Ghế ${seat} đã được đặt mua trước đó.` });
    }

    const result = seatLockService.lockSeat(tripId, seat, clientId);
    if (!result.success) {
      return res.status(409).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unlock a seat
// @route   POST /api/trips/:id/unlock-seat
exports.unlockSeat = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { seat, clientId } = req.body;

    if (!seat) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã ghế cần mở khóa.' });
    }

    const result = seatLockService.unlockSeat(tripId, seat, clientId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unlock all seats held by a client
// @route   POST /api/trips/:id/unlock-all-my-seats
exports.unlockAllMySeats = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { clientId, seats } = req.body;

    if (Array.isArray(seats)) {
      seatLockService.unlockSeats(tripId, seats, clientId);
    }
    res.status(200).json({ success: true, message: 'Đã giải phóng các ghế giữ chỗ.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
