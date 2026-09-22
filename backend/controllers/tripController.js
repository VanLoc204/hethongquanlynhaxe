const tripService = require('../services/tripService');
const Trip = require('../models/Trip');

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
    const { plateNumber, type, totalSeats, amenities, images, seatLayout } = req.body;

    if (!plateNumber || !type || !totalSeats) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp biển số xe, loại xe và tổng số ghế.'
      });
    }

    const bus = await tripService.createBus({ plateNumber, type, totalSeats, amenities, images, seatLayout });

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
    const { plateNumber, type, totalSeats, amenities, images, status, seatLayout, activeStatus, maintenanceInfo } = req.body;

    const bus = await tripService.updateBus(id, { plateNumber, type, totalSeats, amenities, images, status, seatLayout, activeStatus, maintenanceInfo });

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
    const { startPoint, endPoint, distance, duration, stops } = req.body;
    if (!startPoint || !endPoint || !distance || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin tuyến đường.'
      });
    }

    const status = req.user.role === 'ops_manager' ? 'pending' : 'approved';
    const route = await tripService.createRoute({ startPoint, endPoint, distance, duration, status, stops });

    res.status(201).json({
      success: true,
      message: status === 'pending' 
        ? 'Tạo tuyến đường thành công, vui lòng chờ Quản lý nhà xe duyệt.'
        : 'Tạo tuyến đường thành công.',
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
    const { startPoint, endPoint, distance, duration, status, stops } = req.body;

    const route = await tripService.updateRoute(id, { startPoint, endPoint, distance, duration, status, stops });

    res.status(200).json({
      success: true,
      message: status
        ? `Đã cập nhật trạng thái phê duyệt tuyến đường thành: ${status}`
        : 'Cập nhật tuyến đường thành công.',
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

    if (driver && driver.phone) {
      const otherTrip = await Trip.findOne({
        _id: { $ne: id },
        'driver.phone': driver.phone,
        busId: { $ne: busId }
      }).populate('busId');
      
      if (otherTrip) {
        return res.status(400).json({
          success: false,
          message: `Tài xế ${driver.name || 'này'} đã được phân công lái xe khác (${otherTrip.busId?.plateNumber || 'biển số khác'}). Một tài xế chỉ được chạy một chiếc xe duy nhất.`
        });
      }
    }

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

// @desc    Auto schedule trips
// @route   POST /api/v1/trips/ops/trips/auto-schedule
// @access  Private (Ops Manager)
exports.autoScheduleTrips = async (req, res) => {
  try {
    const { startDate, endDate, configs } = req.body;
    if (!startDate || !endDate || !configs || !Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Ngày bắt đầu, Ngày kết thúc và Danh sách cấu hình xếp lịch.'
      });
    }

    const result = await tripService.autoScheduleTrips({ startDate, endDate, configs });
    res.status(201).json({
      success: true,
      message: `Xếp lịch tự động thành công. Đã tạo ${result.createdCount} chuyến xe.`,
      createdCount: result.createdCount
    });
  } catch (error) {
    console.error('Lỗi xếp lịch tự động:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xếp lịch tự động.'
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

// @desc    Update trip journey status (driver portal)
// @route   PATCH /api/v1/trips/:id/update-journey
// @access  Private (Driver)
exports.updateJourneyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'start', 'update', 'complete'

    const trip = await tripService.getTripModel(id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến xe.'
      });
    }

    // Combine pickup and dropoff points in order
    const stops = [];
    if (trip.pickupPoints && trip.pickupPoints.length > 0) {
      trip.pickupPoints.forEach(p => stops.push({ ...p.toObject(), type: 'pickup' }));
    }
    if (trip.dropoffPoints && trip.dropoffPoints.length > 0) {
      trip.dropoffPoints.forEach(d => stops.push({ ...d.toObject(), type: 'dropoff' }));
    }

    if (stops.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Chuyến xe này không có điểm dừng nào được định nghĩa.'
      });
    }

    const now = new Date();

    if (action === 'start') {
      const startTimeLimit = new Date(trip.departureTime.getTime() - 5 * 60 * 1000);
      if (now < startTimeLimit) {
        const diffMs = startTimeLimit - now;
        const diffMins = Math.ceil(diffMs / (60 * 1000));
        return res.status(400).json({
          success: false,
          message: `Chuyến xe chưa đến giờ khởi hành. Bạn chỉ được phép bắt đầu hành trình trước giờ xuất phát tối đa 5 phút (vui lòng chờ thêm ${diffMins} phút).`
        });
      }

      trip.journeyStatus = 'in_transit';
      trip.currentStopIndex = 0;
      trip.journeyLogs = [{
        time: now,
        location: stops[0].location,
        address: stops[0].address,
        desc: `Xe xuất phát từ ${stops[0].location}.`
      }];
    } else if (action === 'update') {
      if (trip.currentStopIndex < 0) {
        return res.status(400).json({
          success: false,
          message: 'Chuyến xe chưa bắt đầu khởi hành.'
        });
      }
      const nextIndex = trip.currentStopIndex + 1;
      if (nextIndex >= stops.length - 1) {
        return res.status(400).json({
          success: false,
          message: 'Đây là điểm cuối, vui lòng chọn kết thúc hành trình.'
        });
      }
      trip.currentStopIndex = nextIndex;
      trip.journeyLogs.push({
        time: now,
        location: stops[nextIndex].location,
        address: stops[nextIndex].address,
        desc: `Xe đã đến ${stops[nextIndex].location}.`
      });
    } else if (action === 'complete') {
      trip.journeyStatus = 'completed';
      trip.currentStopIndex = stops.length - 1;
      trip.journeyLogs.push({
        time: now,
        location: stops[stops.length - 1].location,
        address: stops[stops.length - 1].address,
        desc: `Xe đã đến bến đích an toàn tại ${stops[stops.length - 1].location}.`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Hành động không hợp lệ. Hỗ trợ: start, update, complete'
      });
    }

    await trip.save();
    await trip.populate('routeId');
    await trip.populate('busId');

    res.status(200).json({
      success: true,
      message: 'Cập nhật hành trình thành công.',
      trip
    });
  } catch (error) {
    console.error('Lỗi cập nhật hành trình:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật hành trình.'
    });
  }
};

// @desc    Get all maintenance records
// @route   GET /api/v1/trips/fleet/maintenance-records
// @access  Private (Fleet Manager)
exports.getMaintenanceRecords = async (req, res) => {
  try {
    const records = await tripService.getMaintenanceRecords();
    res.status(200).json({
      success: true,
      records
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách lịch sử bảo trì:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách lịch sử bảo trì.'
    });
  }
};

// @desc    Create a completed maintenance record
// @route   POST /api/v1/trips/fleet/maintenance-records
// @access  Private (Fleet Manager)
exports.createMaintenanceRecord = async (req, res) => {
  try {
    const { busId, plateNumber, type, description, garage, cost, startDate, endDate } = req.body;
    if (!busId || !plateNumber || !description || !garage || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin bảo trì.'
      });
    }

    const record = await tripService.createMaintenanceRecord({
      busId,
      plateNumber,
      type,
      description,
      garage,
      cost,
      startDate,
      endDate
    });

    res.status(201).json({
      success: true,
      message: 'Hoàn tất bảo trì phương tiện thành công.',
      record
    });
  } catch (error) {
    console.error('Lỗi lưu lịch sử bảo trì:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lưu lịch sử bảo trì.'
    });
  }
};

