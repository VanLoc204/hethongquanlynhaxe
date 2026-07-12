const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Shipment = require('../models/Shipment');
const { sendBookingInvoiceEmail, sendShipmentInvoiceEmail } = require('../services/emailService');

// @desc    Search trips by origin, destination and date
// @route   GET /api/v1/trips/search
// @access  Public
exports.searchTrips = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Điểm đi (from), Điểm đến (to) và Ngày đi (date).'
      });
    }

    // 1. Standardize date range for GMT+7 (Vietnam Time)
    const startOfDay = new Date(`${date}T00:00:00.000+07:00`);
    const endOfDay = new Date(`${date}T23:59:59.999+07:00`);

    if (isNaN(startOfDay.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.'
      });
    }

    // 2. Find direct Route
    const route = await Route.findOne({
      startPoint: { $regex: new RegExp(`^${from.trim()}$`, 'i') },
      endPoint: { $regex: new RegExp(`^${to.trim()}$`, 'i') }
    });

    // 3. Build query for Trips (Only show trips in the future)
    const now = new Date();
    const minDepartureTime = startOfDay > now ? startOfDay : now;

    const query = {
      departureTime: {
        $gte: minDepartureTime,
        $lte: endOfDay
      }
    };

    const fromRegex = new RegExp(`^${from.trim()}$`, 'i');
    const toRegex = new RegExp(`^${to.trim()}$`, 'i');

    if (route) {
      query.$or = [
        { routeId: route._id },
        {
          'pickupPoints.location': { $regex: fromRegex },
          'dropoffPoints.location': { $regex: toRegex }
        }
      ];
    } else {
      query['pickupPoints.location'] = { $regex: fromRegex };
      query['dropoffPoints.location'] = { $regex: toRegex };
    }

    const trips = await Trip.find(query)
      .populate('routeId')
      .populate('busId')
      .sort({ departureTime: 1 });

    const tripsWithBookedSeats = await Promise.all(trips.map(async (t) => {
      const bookingsForTrip = await Booking.find({ tripId: t._id, status: { $ne: 'cancelled' } });
      const seatsList = bookingsForTrip.flatMap(b => b.seats);
      const tripObj = t.toObject();
      tripObj.bookedSeats = seatsList;
      return tripObj;
    }));

    res.status(200).json({
      success: true,
      count: trips.length,
      trips: tripsWithBookedSeats
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm chuyến đi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tìm kiếm chuyến đi.',
      error: error.message
    });
  }
};

// @desc    Get detailed trip by ID (with seat map info)
// @route   GET /api/v1/trips/:id
// @access  Public
exports.getTripById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Mã chuyến đi không hợp lệ.'
      });
    }

    const trip = await Trip.findById(req.params.id)
      .populate('routeId')
      .populate('busId');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến đi này.'
      });
    }

    const sisterTripIds = await Trip.find({ routeId: trip.routeId._id }).distinct('_id');
    const reviews = await Review.find({ tripId: { $in: sisterTripIds } }).sort({ createdAt: -1 });

    const bookingsForTrip = await Booking.find({ tripId: trip._id, status: { $ne: 'cancelled' } });
    const seatsList = bookingsForTrip.flatMap(b => b.seats);
    const tripObj = trip.toObject();
    tripObj.bookedSeats = seatsList;

    res.status(200).json({
      success: true,
      trip: tripObj,
      reviews
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin chi tiết chuyến đi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy chi tiết chuyến đi.',
      error: error.message
    });
  }
};

// @desc    Create a new booking and save to MongoDB
// @route   POST /api/v1/trips/book
// @access  Public
exports.createBooking = async (req, res) => {
  try {
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
    } = req.body;

    if (!tripId || !userId || !seats || !seats.length || !pickup || !dropoff || 
        !customerName || !customerPhone || !customerBirthYear || !customerCCCD) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin đặt vé và thông tin khách hàng.'
      });
    }

    const tripObj = await Trip.findById(tripId);
    if (!tripObj) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến đi.'
      });
    }

    const existingBookings = await Booking.find({ tripId, status: { $ne: 'cancelled' } });
    const alreadyBookedSeats = existingBookings.flatMap(b => b.seats);
    const doubleBooked = seats.filter(seat => alreadyBookedSeats.includes(seat));

    if (doubleBooked.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ghế ${doubleBooked.join(', ')} đã có người đặt trước. Vui lòng chọn ghế khác.`
      });
    }

    let orderCode = Math.floor(100000 + Math.random() * 900000);
    let orderCodeExists = await Booking.findOne({ orderCode });
    while (orderCodeExists) {
      orderCode = Math.floor(100000 + Math.random() * 900000);
      orderCodeExists = await Booking.findOne({ orderCode });
    }

    let paymentExpiresAt = null;
    if (paymentType === 'later') {
      paymentExpiresAt = new Date();
      paymentExpiresAt.setDate(paymentExpiresAt.getDate() + 5);
    }

    const booking = await Booking.create({
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

    res.status(201).json({
      success: true,
      message: 'Tạo thông tin đặt vé thành công.',
      booking
    });
  } catch (error) {
    console.error('Lỗi lưu thông tin đặt vé:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lưu thông tin đặt vé.',
      error: error.message
    });
  }
};

// @desc    Webhook handler for PayOS payments (booking & shipments)
// @route   POST /api/v1/trips/payment/webhook
// @access  Public
exports.payosWebhook = async (req, res) => {
  try {
    const { code, data } = req.body;
    console.log('[PayOS Webhook Received]:', JSON.stringify(req.body, null, 2));
    
    if (code === '00' && data) {
      const { orderCode, description } = data;
      
      let booking;
      if (orderCode) {
        booking = await Booking.findOne({ orderCode: Number(orderCode) });
      }
      
      if (!booking && description) {
        const match = description.match(/[0-9a-fA-F]{24}/);
        if (match) {
          booking = await Booking.findById(match[0]);
        }
      }

      if (booking) {
        booking.status = 'paid';
        await booking.save();
        console.log(`[PayOS Webhook] Payment confirmed. Booking ID: ${booking._id} status updated to paid.`);
        
        // Send email invoice for booking
        try {
          const trip = await Trip.findById(booking.tripId).populate('routeId').populate('busId');
          if (trip && booking.customerEmail) {
            await sendBookingInvoiceEmail(booking, trip);
            console.log(`[PayOS Webhook] Sent booking invoice email to ${booking.customerEmail}`);
          }
        } catch (mailErr) {
          console.error('[PayOS Webhook] Failed sending booking email:', mailErr);
        }

        return res.status(200).json({
          success: true,
          message: 'Thanh toán thành công qua PayOS Webhook'
        });
      } else {
        // Try finding a shipment matching the orderCode
        let shipment;
        if (orderCode) {
          shipment = await Shipment.findOne({ orderCode: Number(orderCode) });
        }

        if (!shipment && description) {
          const match = description.match(/[0-9a-fA-F]{24}/);
          if (match) {
            shipment = await Shipment.findById(match[0]);
          }
        }

        if (shipment) {
          shipment.paymentStatus = 'paid';
          await shipment.save();
          console.log(`[PayOS Webhook] Payment confirmed. Shipment ID: ${shipment.shipmentId} status updated to paid.`);

          // Send email invoice for shipment
          try {
            if (shipment.senderEmail) {
              await sendShipmentInvoiceEmail(shipment);
              console.log(`[PayOS Webhook] Sent shipment invoice email to ${shipment.senderEmail}`);
            }
          } catch (mailErr) {
            console.error('[PayOS Webhook] Failed sending shipment email:', mailErr);
          }

          return res.status(200).json({
            success: true,
            message: 'Thanh toán cước phí vận đơn thành công qua PayOS Webhook'
          });
        }

        console.warn(`[PayOS Webhook] No booking or shipment found matching orderCode ${orderCode}`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Nhận dữ liệu webhook thành công'
    });
  } catch (error) {
    console.error('[PayOS Webhook Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý webhook'
    });
  }
};

// @desc    Update booking payment type to later
// @route   PATCH /api/v1/trips/book/:id
// @access  Public
exports.updateBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentType } = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đặt vé.'
      });
    }
    
    booking.paymentType = paymentType;
    if (paymentType === 'later') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);
      booking.paymentExpiresAt = expiresAt;
      booking.status = 'pending';
      await booking.save();

      // Send email invoice for pay later hold confirmation
      try {
        const trip = await Trip.findById(booking.tripId).populate('routeId').populate('busId');
        if (trip && booking.customerEmail) {
          await sendBookingInvoiceEmail(booking, trip);
        }
      } catch (mailErr) {
        console.error('Lỗi gửi email xác nhận đặt chỗ:', mailErr);
      }
    } else if (paymentType === 'immediate') {
      booking.status = 'pending';
      await booking.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Cập nhật hình thức thanh toán thành công.',
      booking
    });
  } catch (error) {
    console.error('Lỗi cập nhật đặt vé:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật thông tin đặt vé.',
      error: error.message
    });
  }
};

// @desc    Create a new shipment
// @route   POST /api/v1/trips/shipment/create
// @access  Public
exports.createShipment = async (req, res) => {
  try {
    const {
      senderName,
      senderPhone,
      senderEmail,
      receiverName,
      receiverPhone,
      fromCity,
      toCity,
      weight,
      content,
      fee,
      paymentType
    } = req.body;

    if (!senderName || !senderPhone || !receiverName || !receiverPhone || !fromCity || !toCity || !weight || !fee) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin gửi hàng.'
      });
    }

    const shipmentId = 'SHIP-' + Math.floor(100000 + Math.random() * 900000);

    let orderCode = Math.floor(100000 + Math.random() * 900000);
    let orderCodeExists = await Shipment.findOne({ orderCode });
    while (orderCodeExists) {
      orderCode = Math.floor(100000 + Math.random() * 900000);
      orderCodeExists = await Shipment.findOne({ orderCode });
    }

    const history = [
      {
        status: 'Collected',
        time: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
        detail: 'Hệ thống tiếp nhận thông tin đơn hàng.'
      }
    ];

    const shipment = await Shipment.create({
      shipmentId,
      senderName,
      senderPhone,
      senderEmail: senderEmail || '',
      receiverName,
      receiverPhone,
      fromCity,
      toCity,
      weight,
      content: content || '',
      fee,
      status: 'Collected',
      paymentStatus: 'pending',
      paymentType: paymentType || 'immediate',
      orderCode,
      history
    });

    res.status(201).json({
      success: true,
      message: 'Tạo đơn gửi hàng thành công.',
      shipment
    });
  } catch (error) {
    console.error('Lỗi tạo đơn gửi hàng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo đơn gửi hàng.',
      error: error.message
    });
  }
};

// @desc    Update shipment payment status
// @route   PATCH /api/v1/trips/shipment/:id
// @access  Public
exports.updateShipmentPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentType } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin vận đơn.'
      });
    }

    shipment.paymentType = paymentType;
    if (paymentType === 'later') {
      shipment.paymentStatus = 'pending';
      await shipment.save();

      // Send email invoice for pay later shipment
      try {
        if (shipment.senderEmail) {
          await sendShipmentInvoiceEmail(shipment);
        }
      } catch (mailErr) {
        console.error('Lỗi gửi email thông báo ký gửi:', mailErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật hình thức thanh toán vận đơn thành công.',
      shipment
    });
  } catch (error) {
    console.error('Lỗi cập nhật vận đơn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật vận đơn.',
      error: error.message
    });
  }
};

// @desc    Track shipment by shipmentId
// @route   GET /api/v1/trips/shipment/track/:id
// @access  Public
exports.trackShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const shipment = await Shipment.findOne({ shipmentId: { $regex: new RegExp(`^${id.trim()}$`, 'i') } });
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã vận đơn.'
      });
    }
    res.status(200).json({
      success: true,
      shipment
    });
  } catch (error) {
    console.error('Lỗi tra cứu vận đơn:', error);
    res.status(200).json({
      success: false,
      message: 'Lỗi hệ thống khi tra cứu vận đơn.',
      error: error.message
    });
  }
};

// @desc    Get all buses
// @route   GET /api/v1/trips/fleet/buses
// @access  Private (Fleet Manager)
exports.getBuses = async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: buses.length,
      buses
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách xe:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách xe.',
      error: error.message
    });
  }
};

// @desc    Create a new bus
// @route   POST /api/v1/trips/fleet/buses
// @access  Private (Fleet Manager)
exports.createBus = async (req, res) => {
  try {
    const { plateNumber, type, totalSeats, amenities, images } = req.body;

    if (!plateNumber || !type || !totalSeats) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp biển số xe, loại xe và tổng số ghế.'
      });
    }

    const busExists = await Bus.findOne({ plateNumber: plateNumber.trim() });
    if (busExists) {
      return res.status(400).json({
        success: false,
        message: 'Biển số xe này đã tồn tại trong hệ thống.'
      });
    }

    const bus = await Bus.create({
      plateNumber: plateNumber.trim(),
      type,
      totalSeats: Number(totalSeats),
      amenities: amenities || [],
      images: images || []
    });

    res.status(201).json({
      success: true,
      message: 'Thêm phương tiện mới thành công.',
      bus
    });
  } catch (error) {
    console.error('Lỗi tạo phương tiện:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo phương tiện.',
      error: error.message
    });
  }
};

// @desc    Update a bus
// @route   PUT /api/v1/trips/fleet/buses/:id
// @access  Private (Fleet Manager)
exports.updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const { plateNumber, type, totalSeats, amenities, images } = req.body;

    let bus = await Bus.findById(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phương tiện.'
      });
    }

    if (plateNumber && plateNumber.trim() !== bus.plateNumber) {
      const busExists = await Bus.findOne({ plateNumber: plateNumber.trim() });
      if (busExists) {
        return res.status(400).json({
          success: false,
          message: 'Biển số xe này đã tồn tại ở một xe khác.'
        });
      }
      bus.plateNumber = plateNumber.trim();
    }

    if (type) bus.type = type;
    if (totalSeats !== undefined) bus.totalSeats = Number(totalSeats);
    if (amenities) bus.amenities = amenities;
    if (images) bus.images = images;

    await bus.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin phương tiện thành công.',
      bus
    });
  } catch (error) {
    console.error('Lỗi cập nhật phương tiện:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật phương tiện.',
      error: error.message
    });
  }
};

// @desc    Delete a bus
// @route   DELETE /api/v1/trips/fleet/buses/:id
// @access  Private (Fleet Manager)
exports.deleteBus = async (req, res) => {
  try {
    const { id } = req.params;

    const bus = await Bus.findById(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phương tiện.'
      });
    }

    await bus.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa phương tiện thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa phương tiện:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa phương tiện.',
      error: error.message
    });
  }
};

// @desc    Get all routes
// @route   GET /api/v1/trips/ops/routes
// @access  Private (Ops Manager)
exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: routes.length,
      routes
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách tuyến đường:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách tuyến đường.',
      error: error.message
    });
  }
};

// @desc    Create a new route
// @route   POST /api/v1/trips/ops/routes
// @access  Private (Ops Manager)
exports.createRoute = async (req, res) => {
  try {
    const { startPoint, endPoint, distance, duration } = req.body;
    if (!startPoint || !endPoint || !distance || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin tuyến đường.'
      });
    }

    const route = await Route.create({
      startPoint,
      endPoint,
      distance,
      duration
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tuyến đường thành công.',
      route
    });
  } catch (error) {
    console.error('Lỗi tạo tuyến đường:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo tuyến đường.',
      error: error.message
    });
  }
};

// @desc    Update a route
// @route   PUT /api/v1/trips/ops/routes/:id
// @access  Private (Ops Manager)
exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { startPoint, endPoint, distance, duration } = req.body;

    let route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tuyến đường.'
      });
    }

    if (startPoint) route.startPoint = startPoint;
    if (endPoint) route.endPoint = endPoint;
    if (distance) route.distance = distance;
    if (duration) route.duration = duration;

    await route.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật tuyến đường thành công.',
      route
    });
  } catch (error) {
    console.error('Lỗi cập nhật tuyến đường:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật tuyến đường.',
      error: error.message
    });
  }
};

// @desc    Delete a route
// @route   DELETE /api/v1/trips/ops/routes/:id
// @access  Private (Ops Manager)
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tuyến đường.'
      });
    }

    // Check if any trip is associated with this route
    const tripCount = await Trip.countDocuments({ routeId: id });
    if (tripCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tuyến đường này vì có chuyến xe đang hoạt động.'
      });
    }

    await route.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa tuyến đường thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa tuyến đường:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa tuyến đường.',
      error: error.message
    });
  }
};

// @desc    Get all trips (ops view)
// @route   GET /api/v1/trips/ops/trips
// @access  Private (Ops Manager)
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('routeId')
      .populate('busId')
      .sort({ departureTime: -1 });
    
    // Add bookedSeats dynamically for dashboard monitoring
    const tripsWithBookings = await Promise.all(trips.map(async (t) => {
      const bookingsForTrip = await Booking.find({ tripId: t._id, status: { $ne: 'cancelled' } });
      const seatsList = bookingsForTrip.flatMap(b => b.seats);
      const tripObj = t.toObject();
      tripObj.bookedSeats = seatsList;
      return tripObj;
    }));

    res.status(200).json({
      success: true,
      count: tripsWithBookings.length,
      trips: tripsWithBookings
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách chuyến xe:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách chuyến xe.',
      error: error.message
    });
  }
};

// @desc    Create a new trip
// @route   POST /api/v1/trips/ops/trips
// @access  Private (Ops Manager)
exports.createTrip = async (req, res) => {
  try {
    const { routeId, busId, departureTime, arrivalTime, price, pickupPoints, dropoffPoints, policy } = req.body;

    if (!routeId || !busId || !departureTime || !arrivalTime || !price) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp các trường bắt buộc: Tuyến đường, Xe, Giờ đi, Giờ đến và Giá vé.'
      });
    }

    const trip = await Trip.create({
      routeId,
      busId,
      departureTime: new Date(departureTime),
      arrivalTime: new Date(arrivalTime),
      price: Number(price),
      pickupPoints: pickupPoints || [],
      dropoffPoints: dropoffPoints || [],
      policy: policy || {
        cancellation: 'Yêu cầu hủy vé trước 24 giờ so với giờ khởi hành để được hoàn 100% tiền vé. Hủy vé trong vòng 24 giờ không được hoàn tiền.',
        luggage: 'Hành khách được mang theo tối đa 20kg hành lý ký gửi miễn phí. Không mang động vật nuôi hoặc các chất cấm lên xe.'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tạo chuyến xe thành công.',
      trip
    });
  } catch (error) {
    console.error('Lỗi tạo chuyến xe:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo chuyến xe.',
      error: error.message
    });
  }
};

// @desc    Update a trip
// @route   PUT /api/v1/trips/ops/trips/:id
// @access  Private (Ops Manager)
exports.updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { routeId, busId, departureTime, arrivalTime, price, pickupPoints, dropoffPoints, policy, driver, assistant } = req.body;

    let trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến xe.'
      });
    }

    if (routeId) trip.routeId = routeId;
    if (busId) trip.busId = busId;
    if (departureTime) trip.departureTime = new Date(departureTime);
    if (arrivalTime) trip.arrivalTime = new Date(arrivalTime);
    if (price !== undefined) trip.price = Number(price);
    if (pickupPoints) trip.pickupPoints = pickupPoints;
    if (dropoffPoints) trip.dropoffPoints = dropoffPoints;
    if (policy) trip.policy = policy;
    if (driver) trip.driver = driver;
    if (assistant) trip.assistant = assistant;

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật chuyến xe thành công.',
      trip
    });
  } catch (error) {
    console.error('Lỗi cập nhật chuyến xe:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật chuyến xe.',
      error: error.message
    });
  }
};

// @desc    Delete a trip
// @route   DELETE /api/v1/trips/ops/trips/:id
// @access  Private (Ops Manager)
exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến xe.'
      });
    }

    // Check if trip has any active bookings (status !== cancelled)
    const bookingsCount = await Booking.countDocuments({ tripId: id, status: { $ne: 'cancelled' } });
    if (bookingsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa chuyến xe vì có hành khách đã đặt vé.'
      });
    }

    await trip.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa chuyến xe thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa chuyến xe:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa chuyến xe.',
      error: error.message
    });
  }
};
