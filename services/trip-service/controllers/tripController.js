const tripService = require('../services/tripService');

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

    const trips = await tripService.searchTrips({ from, to, date });

    res.status(200).json({
      success: true,
      count: trips.length,
      trips
    });
  } catch (error) {
    console.error('Lỗi tìm kiếm chuyến đi:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tìm kiếm chuyến đi.'
    });
  }
};

// @desc    Get all routes (public view for home search dropdown)
// @route   GET /api/v1/trips/routes
// @access  Public
exports.getPublicRoutes = async (req, res) => {
  try {
    const data = await tripService.getSearchLocations();
    res.status(200).json({
      success: true,
      routes: data.routes,
      origins: data.origins,
      destinations: data.destinations
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách tuyến đường công khai:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách tuyến đường.'
    });
  }
};


// @desc    Get detailed trip by ID (with seat map info)
// @route   GET /api/v1/trips/:id
// @access  Public
exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const { trip, reviews } = await tripService.getTripById(id);

    res.status(200).json({
      success: true,
      trip,
      reviews
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin chi tiết chuyến đi:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy chi tiết chuyến đi.'
    });
  }
};


// @desc    Webhook handler for PayOS payments (booking & shipments)
// @route   POST /api/v1/trips/payment/webhook
// @access  Public
exports.payosWebhook = async (req, res) => {
  try {
    const { code, data, description } = req.body;
    console.log('[PayOS Webhook Received]:', JSON.stringify(req.body, null, 2));

    const result = await tripService.payosWebhook({ code, data, description });

    if (result) {
      const typeMsg = result.type === 'booking' 
        ? 'Thanh toán thành công qua PayOS Webhook' 
        : 'Thanh toán cước phí vận đơn thành công qua PayOS Webhook';
      
      return res.status(200).json({
        success: true,
        message: typeMsg
      });
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

    const shipment = await tripService.createShipment({
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
    });

    res.status(201).json({
      success: true,
      message: 'Tạo đơn gửi hàng thành công.',
      shipment
    });
  } catch (error) {
    console.error('Lỗi tạo đơn gửi hàng:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo đơn gửi hàng.'
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

    const shipment = await tripService.updateShipmentPayment(id, { paymentType });

    res.status(200).json({
      success: true,
      message: 'Cập nhật hình thức thanh toán vận đơn thành công.',
      shipment
    });
  } catch (error) {
    console.error('Lỗi cập nhật vận đơn:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật vận đơn.'
    });
  }
};

// @desc    Track shipment by shipmentId
// @route   GET /api/v1/trips/shipment/track/:id
// @access  Public
exports.trackShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const shipment = await tripService.trackShipment(id);

    res.status(200).json({
      success: true,
      shipment
    });
  } catch (error) {
    console.error('Lỗi tra cứu vận đơn:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tra cứu vận đơn.'
    });
  }
};

// @desc    Get all buses
// @route   GET /api/v1/trips/fleet/buses
// @access  Private (Fleet Manager)
exports.getBuses = async (req, res) => {
  try {
    const buses = await tripService.getBuses();
    res.status(200).json({
      success: true,
      count: buses.length,
      buses
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách xe:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách xe.'
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

    const bus = await tripService.createBus({ plateNumber, type, totalSeats, amenities, images });

    res.status(201).json({
      success: true,
      message: 'Thêm phương tiện mới thành công.',
      bus
    });
  } catch (error) {
    console.error('Lỗi tạo phương tiện:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo phương tiện.'
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

    const bus = await tripService.updateBus(id, { plateNumber, type, totalSeats, amenities, images });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin phương tiện thành công.',
      bus
    });
  } catch (error) {
    console.error('Lỗi cập nhật phương tiện:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật phương tiện.'
    });
  }
};

// @desc    Delete a bus
// @route   DELETE /api/v1/trips/fleet/buses/:id
// @access  Private (Fleet Manager)
exports.deleteBus = async (req, res) => {
  try {
    const { id } = req.params;
    await tripService.deleteBus(id);

    res.status(200).json({
      success: true,
      message: 'Xóa phương tiện thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa phương tiện:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa phương tiện.'
    });
  }
};

// @desc    Get all routes
// @route   GET /api/v1/trips/ops/routes
// @access  Private (Ops Manager)
exports.getRoutes = async (req, res) => {
  try {
    const routes = await tripService.getRoutes();
    res.status(200).json({
      success: true,
      count: routes.length,
      routes
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách tuyến đường:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách tuyến đường.'
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

    const route = await tripService.createRoute({ startPoint, endPoint, distance, duration });

    res.status(201).json({
      success: true,
      message: 'Tạo tuyến đường thành công.',
      route
    });
  } catch (error) {
    console.error('Lỗi tạo tuyến đường:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo tuyến đường.'
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

    const route = await tripService.updateRoute(id, { startPoint, endPoint, distance, duration });

    res.status(200).json({
      success: true,
      message: 'Cập nhật tuyến đường thành công.',
      route
    });
  } catch (error) {
    console.error('Lỗi cập nhật tuyến đường:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật tuyến đường.'
    });
  }
};

// @desc    Delete a route
// @route   DELETE /api/v1/trips/ops/routes/:id
// @access  Private (Ops Manager)
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    await tripService.deleteRoute(id);

    res.status(200).json({
      success: true,
      message: 'Xóa tuyến đường thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa tuyến đường:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa tuyến đường.'
    });
  }
};

// @desc    Get all trips (ops view)
// @route   GET /api/v1/trips/ops/trips
// @access  Private (Ops Manager)
exports.getTrips = async (req, res) => {
  try {
    const trips = await tripService.getTrips();
    res.status(200).json({
      success: true,
      count: trips.length,
      trips
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách chuyến xe:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách chuyến xe.'
    });
  }
};

// @desc    Create a new trip
// @route   POST /api/v1/trips/ops/trips
// @access  Private (Ops Manager)
exports.createTrip = async (req, res) => {
  try {
    const { routeId, busId, departureTime, arrivalTime, pickupPoints, dropoffPoints, policy } = req.body;

    if (!routeId || !busId || !departureTime || !arrivalTime) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp các trường bắt buộc: Tuyến đường, Xe, Giờ đi và Giờ đến.'
      });
    }

    const trip = await tripService.createTrip({ routeId, busId, departureTime, arrivalTime, pickupPoints, dropoffPoints, policy });

    res.status(201).json({
      success: true,
      message: 'Tạo chuyến xe thành công.',
      trip
    });
  } catch (error) {
    console.error('Lỗi tạo chuyến xe:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi tạo chuyến xe.'
    });
  }
};

// @desc    Update a trip
// @route   PUT /api/v1/trips/ops/trips/:id
// @access  Private (Ops Manager)
exports.updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { routeId, busId, departureTime, arrivalTime, pickupPoints, dropoffPoints, policy, driver, assistant } = req.body;

    const trip = await tripService.updateTrip(id, { routeId, busId, departureTime, arrivalTime, pickupPoints, dropoffPoints, policy, driver, assistant });

    res.status(200).json({
      success: true,
      message: 'Cập nhật chuyến xe thành công.',
      trip
    });
  } catch (error) {
    console.error('Lỗi cập nhật chuyến xe:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật chuyến xe.'
    });
  }
};

// @desc    Delete a trip
// @route   DELETE /api/v1/trips/ops/trips/:id
// @access  Private (Ops Manager)
exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    await tripService.deleteTrip(id);

    res.status(200).json({
      success: true,
      message: 'Xóa chuyến xe thành công.'
    });
  } catch (error) {
    console.error('Lỗi xóa chuyến xe:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xóa chuyến xe.'
    });
  }
};
// @desc    Release booked seats back (called by booking-service on cancellation)
// @route   PATCH /api/v1/trips/:id/release-seats
// @access  Internal (no auth required - internal service call)
exports.releaseSeats = async (req, res) => {
  try {
    const { id } = req.params;
    const { seats } = req.body;
    if (!seats || !Array.isArray(seats)) {
      return res.status(400).json({ success: false, message: 'seats array is required.' });
    }
    const trip = await tripService.getTripModel(id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });
    // Remove the cancelled seats from bookedSeats
    trip.bookedSeats = (trip.bookedSeats || []).filter(s => !seats.includes(s));
    await trip.save();
    console.log(`[Trip] Released seats ${seats.join(',')} for trip ${id}`);
    res.status(200).json({ success: true, releasedSeats: seats, remaining: trip.bookedSeats });
  } catch (err) {
    console.error('[Trip] releaseSeats error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
