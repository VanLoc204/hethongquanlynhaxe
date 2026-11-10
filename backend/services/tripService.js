const mongoose = require('mongoose');
const tripRepository = require('../repositories/tripRepository');
const routeRepository = require('../repositories/routeRepository');
const busRepository = require('../repositories/busRepository');
const bookingRepository = require('../repositories/bookingRepository');
const shipmentRepository = require('../repositories/shipmentRepository');
const reviewRepository = require('../repositories/reviewRepository');
const maintenanceRepository = require('../repositories/maintenanceRepository');
const { sendShipmentInvoiceEmail } = require('./emailService');

class TripService {
  async applyPricingRules(tripObj) {
    if (!tripObj) return tripObj;

    try {
      const departureDate = new Date(tripObj.departureTime);
      const day = departureDate.getDay();

      const activeRules = await mongoose.connection.db.collection('pricingrules')
        .find({ isActive: true })
        .toArray();

      let finalPrice = tripObj.price;
      
      let routeIdStr = '';
      if (tripObj.routeId) {
        routeIdStr = tripObj.routeId._id ? tripObj.routeId._id.toString() : tripObj.routeId.toString();
      }
      
      let busType = '';
      if (tripObj.busId) {
        busType = tripObj.busId.type || '';
      }

      for (const rule of activeRules) {
        const routeMatch = rule.routeId === 'all' || (routeIdStr && rule.routeId.toString() === routeIdStr);

        let busMatch = false;
        if (rule.busType === 'all') {
          busMatch = true;
        } else if (busType) {
          busMatch = busType.toLowerCase().includes(rule.busType.toLowerCase());
        }

        const dayMatch = rule.dayOfWeek.length === 0 || rule.dayOfWeek.includes(day);

        if (routeMatch && busMatch && dayMatch) {
          if (rule.adjustmentType === 'percentage') {
            finalPrice = finalPrice * (1 + rule.adjustmentValue / 100);
          } else if (rule.adjustmentType === 'flat') {
            finalPrice = finalPrice + rule.adjustmentValue;
          }
        }
      }

      tripObj.price = Math.max(0, Math.round(finalPrice));
    } catch (err) {
      console.error('Error applying pricing rules:', err);
    }

    return tripObj;
  }

  async searchTrips({ from, to, date }) {
    // 1. Standardize date range for GMT+7 (Vietnam Time)
    const startOfDay = new Date(`${date}T00:00:00.000+07:00`);
    const endOfDay = new Date(`${date}T23:59:59.999+07:00`);

    if (isNaN(startOfDay.getTime())) {
      throw new Error('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.');
    }

    const resolveAbbr = (text) => {
      if (!text) return '';
      const clean = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[\.,]/g, '')
        .toLowerCase()
        .trim();


      const map = {
        'sg': 'Hồ Chí Minh',
        'hcm': 'Hồ Chí Minh',
        'tphcm': 'Hồ Chí Minh',
        'tp hcm': 'Hồ Chí Minh',
        'hn': 'Hà Nội',
        'nt': 'Nha Trang',
        'dl': 'Đà Lạt',
        'dn': 'Đà Nẵng',
        'vt': 'Vũng Tàu',
        'ct': 'Cần Thơ',
        'hp': 'Hải Phòng'
      };
      return map[clean] || text;
    };

    const searchFrom = resolveAbbr(from);
    const searchTo = resolveAbbr(to);

    // Find all route IDs matching the "from" startPoint
    const routesFrom = await routeRepository.find({
      startPoint: { $regex: new RegExp(searchFrom.trim(), 'i') }
    });
    const routeIdsFrom = routesFrom.map(r => r._id);

    // Find all route IDs matching the "to" endPoint
    const routesTo = await routeRepository.find({
      endPoint: { $regex: new RegExp(searchTo.trim(), 'i') }
    });
    const routeIdsTo = routesTo.map(r => r._id);

    // 3. Build query for Trips (Only show trips in the future)
    const now = new Date();
    const minDepartureTime = startOfDay > now ? startOfDay : now;

    const query = {
      departureTime: {
        $gte: minDepartureTime,
        $lte: endOfDay
      }
    };

    const fromRegex = new RegExp(searchFrom.trim(), 'i');
    const toRegex = new RegExp(searchTo.trim(), 'i');

    const fromConditions = [];
    if (routeIdsFrom.length > 0) {
      fromConditions.push({ routeId: { $in: routeIdsFrom } });
    }
    fromConditions.push({ 'pickupPoints.location': { $regex: fromRegex } });

    const toConditions = [];
    if (routeIdsTo.length > 0) {
      toConditions.push({ routeId: { $in: routeIdsTo } });
    }
    toConditions.push({ 'dropoffPoints.location': { $regex: toRegex } });

    query.$and = [
      { $or: fromConditions },
      { $or: toConditions }
    ];


    const trips = await tripRepository.findWithPopulate(query, { departureTime: 1 });

    const tripsWithBookedSeats = [];
    for (const t of trips) {
      const routeIdStr = t.routeId?._id ? t.routeId._id.toString() : (t.routeId ? t.routeId.toString() : '');
      const busType = t.busId?.type || '';

      if (!routeIdStr || !busType) continue;

      const basePriceDoc = await mongoose.connection.db.collection('baseprices').findOne({
        routeId: new mongoose.Types.ObjectId(routeIdStr),
        busType: busType
      });

      // Filter out trips that do not have base price set
      if (!basePriceDoc || basePriceDoc.price === undefined || basePriceDoc.price === null) {
        continue;
      }

      const bookingsForTrip = await bookingRepository.find({ tripId: t._id, status: { $ne: 'cancelled' } });
      const seatsList = bookingsForTrip.flatMap(b => b.seats);
      let tripObj = t.toObject();
      tripObj.bookedSeats = seatsList;
      tripObj = await this.applyPricingRules(tripObj);
      tripsWithBookedSeats.push(tripObj);
    }

    return tripsWithBookedSeats;
  }

  async getTripById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Mã chuyến đi không hợp lệ.');
    }

    const trip = await tripRepository.findByIdWithPopulate(id);
    if (!trip) {
      const err = new Error('Không tìm thấy chuyến đi này.');
      err.statusCode = 404;
      throw err;
    }

    const sisterTripIds = await tripRepository.distinct('_id', { routeId: trip.routeId._id });
    const reviews = await reviewRepository.find({ tripId: { $in: sisterTripIds } });

    const bookingsForTrip = await bookingRepository.find({ tripId: trip._id, status: { $ne: 'cancelled' } });
    const seatsList = bookingsForTrip.flatMap(b => b.seats);
    let tripObj = trip.toObject();
    tripObj.bookedSeats = seatsList;
    tripObj = await this.applyPricingRules(tripObj);

    return { trip: tripObj, reviews };
  }

  async payosWebhook({ code, data, description }) {
    if (code === '00' && data) {
      // 1. First, process via bookingService locally (no HTTP request)
      try {
        const bookingService = require('./bookingService');
        const bookingResult = await bookingService.payosWebhook({ code, data, description });
        if (bookingResult) {
          console.log('[PayOS Webhook] Handled locally by bookingService.');
          return { type: 'booking', doc: bookingResult };
        }
      } catch (err) {
        console.error('[PayOS Webhook] Error calling bookingService webhook locally:', err.message);
      }

      // 2. If not handled by bookingService, try finding a shipment matching the orderCode
      const { orderCode, description: payosDesc } = data;
      const desc = payosDesc || description || '';

      let shipment;
      if (orderCode) {
        shipment = await shipmentRepository.findOne({ orderCode: Number(orderCode) });
      }

      if (!shipment && desc) {
        const match = desc.match(/[0-9a-fA-F]{24}/);
        if (match) {
          shipment = await shipmentRepository.findById(match[0]);
        }
      }

      if (shipment) {
        shipment.paymentStatus = 'paid';
        await shipmentRepository.save(shipment);
        console.log(`[PayOS Webhook] Payment confirmed. Shipment ID: ${shipment.shipmentId} status updated to paid.`);

        try {
          if (shipment.senderEmail) {
            await sendShipmentInvoiceEmail(shipment);
            console.log(`[PayOS Webhook] Sent shipment invoice email to ${shipment.senderEmail}`);
          }
        } catch (mailErr) {
          console.error('[PayOS Webhook] Failed sending shipment email:', mailErr);
        }

        return { type: 'shipment', doc: shipment };
      }

      console.warn(`[PayOS Webhook] No booking or shipment found matching orderCode ${orderCode}`);
    }
    return null;
  }

  async createShipment(shipmentData) {
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
    } = shipmentData;

    const shipmentId = 'SHIP-' + Math.floor(100000 + Math.random() * 900000);

    let orderCode = Math.floor(100000 + Math.random() * 900000);
    let orderCodeExists = await shipmentRepository.findOne({ orderCode });
    while (orderCodeExists) {
      orderCode = Math.floor(100000 + Math.random() * 900000);
      orderCodeExists = await shipmentRepository.findOne({ orderCode });
    }

    const history = [
      {
        status: 'Collected',
        time: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
        detail: 'Hệ thống tiếp nhận thông tin đơn hàng.'
      }
    ];

    const shipment = await shipmentRepository.create({
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

    return shipment;
  }

  async updateShipmentPayment(id, { paymentType }) {
    const shipment = await shipmentRepository.findById(id);
    if (!shipment) {
      const err = new Error('Không tìm thấy thông tin vận đơn.');
      err.statusCode = 404;
      throw err;
    }

    shipment.paymentType = paymentType;
    if (paymentType === 'later') {
      shipment.paymentStatus = 'pending';
      await shipmentRepository.save(shipment);

      try {
        if (shipment.senderEmail) {
          await sendShipmentInvoiceEmail(shipment);
        }
      } catch (mailErr) {
        console.error('Lỗi gửi email thông báo ký gửi:', mailErr);
      }
    }

    return shipment;
  }

  async trackShipment(id) {
    const shipment = await shipmentRepository.findOne({ shipmentId: { $regex: new RegExp(`^${id.trim()}$`, 'i') } });
    if (!shipment) {
      const err = new Error('Không tìm thấy mã vận đơn.');
      err.statusCode = 404;
      throw err;
    }
    return shipment;
  }

  async getBuses() {
    return await busRepository.find({}, { createdAt: -1 });
  }

  async createBus(busData) {
    const { plateNumber, type, totalSeats, amenities, images, seatLayout } = busData;

    const busExists = await busRepository.findOne({ plateNumber: plateNumber.trim() });
    if (busExists) {
      throw new Error('Biển số xe này đã tồn tại trong hệ thống.');
    }

    const bus = await busRepository.create({
      plateNumber: plateNumber.trim(),
      type,
      totalSeats: Number(totalSeats),
      amenities: amenities || [],
      images: images || [],
      status: 'pending',
      seatLayout: seatLayout || {}
    });

    return bus;
  }

  async updateBus(id, busData) {
    const { plateNumber, type, totalSeats, amenities, images, status, seatLayout, activeStatus, maintenanceInfo } = busData;

    let bus = await busRepository.findById(id);
    if (!bus) {
      const err = new Error('Không tìm thấy phương tiện.');
      err.statusCode = 404;
      throw err;
    }

    if (plateNumber && plateNumber.trim() !== bus.plateNumber) {
      const busExists = await busRepository.findOne({ plateNumber: plateNumber.trim() });
      if (busExists) {
        throw new Error('Biển số xe này đã tồn tại ở một xe khác.');
      }
      bus.plateNumber = plateNumber.trim();
    }

    if (type) bus.type = type;
    if (totalSeats !== undefined) bus.totalSeats = Number(totalSeats);
    if (amenities) bus.amenities = amenities;
    if (images) bus.images = images;
    if (status) bus.status = status;
    if (seatLayout) {
      bus.seatLayout = seatLayout;
      bus.markModified('seatLayout');
    }
    if (activeStatus) bus.activeStatus = activeStatus;
    if (maintenanceInfo) {
      const costNum = Number(maintenanceInfo.estimatedCost) || 0;
      const isMajor = costNum >= 10000000;
      let approvalStatus = 'auto_approved';
      if (isMajor) {
        if (maintenanceInfo.approvalStatus) {
          approvalStatus = maintenanceInfo.approvalStatus;
        } else if (bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus === 'approved' && bus.maintenanceInfo?.estimatedCost === costNum) {
          approvalStatus = 'approved';
        } else {
          approvalStatus = 'pending_approval';
        }
      }

      bus.maintenanceInfo = {
        ...maintenanceInfo,
        estimatedCost: costNum,
        isMajor,
        approvalStatus,
        proposedBy: busData.proposedBy || bus.maintenanceInfo?.proposedBy,
        approvalNote: bus.maintenanceInfo?.approvalNote || '',
        rejectionReason: bus.maintenanceInfo?.rejectionReason || ''
      };
      bus.markModified('maintenanceInfo');
    }

    await busRepository.save(bus);
    return bus;
  }

  async deleteBus(id) {
    const bus = await busRepository.findById(id);
    if (!bus) {
      const err = new Error('Không tìm thấy phương tiện.');
      err.statusCode = 404;
      throw err;
    }

    await busRepository.delete(bus);
    return true;
  }

  async getRoutes() {
    return await routeRepository.find({}, { createdAt: -1 });
  }

  async createRoute(routeData) {
    const { startPoint, endPoint, distance, duration, status, stops } = routeData;

    const route = await routeRepository.create({
      startPoint,
      endPoint,
      distance,
      duration,
      status: status || 'pending',
      stops: stops || []
    });

    return route;
  }

  async updateRoute(id, routeData) {
    const { startPoint, endPoint, distance, duration, status, stops } = routeData;

    let route = await routeRepository.findById(id);
    if (!route) {
      const err = new Error('Không tìm thấy tuyến đường.');
      err.statusCode = 404;
      throw err;
    }

    if (startPoint) route.startPoint = startPoint;
    if (endPoint) route.endPoint = endPoint;
    if (distance) route.distance = distance;
    if (duration) route.duration = duration;
    if (status) route.status = status;
    if (stops !== undefined) route.stops = stops;

    await routeRepository.save(route);
    return route;
  }

  async deleteRoute(id) {
    const route = await routeRepository.findById(id);
    if (!route) {
      const err = new Error('Không tìm thấy tuyến đường.');
      err.statusCode = 404;
      throw err;
    }

    // Check if any trip is associated with this route
    const tripCount = await tripRepository.countDocuments({ routeId: id });
    if (tripCount > 0) {
      throw new Error('Không thể xóa tuyến đường này vì có chuyến xe đang hoạt động.');
    }

    await routeRepository.delete(route);
    return true;
  }

  async getTrips() {
    const trips = await tripRepository.findWithPopulate({}, { departureTime: -1 });
    
    // Tính toán dữ liệu thực tế từ bookings cho từng chuyến
    const tripsWithBookings = await Promise.all(trips.map(async (t) => {
      const bookingsForTrip = await bookingRepository.find({ tripId: t._id, status: { $ne: 'cancelled' } });
      const seatsList = bookingsForTrip.flatMap(b => b.seats);

      // Doanh thu thực tế = tổng totalAmount của các booking đã lưu lúc đặt
      // Ưu tiên dùng booking.totalAmount (chính xác), fallback booking.pricePerSeat × seats, fallback trip.price × seats
      const actualRevenue = bookingsForTrip.reduce((sum, b) => {
        if (b.totalAmount && b.totalAmount > 0) {
          return sum + b.totalAmount;
        }
        if (b.pricePerSeat && b.pricePerSeat > 0) {
          return sum + (b.pricePerSeat * b.seats.length);
        }
        // Fallback cho bookings cũ chưa có trường totalAmount
        return sum + (t.price * b.seats.length);
      }, 0);

      let tripObj = t.toObject();
      tripObj.bookedSeats = seatsList;
      tripObj.actualRevenue = actualRevenue; // Doanh thu thực tế từ bookings
      tripObj = await this.applyPricingRules(tripObj); // Cập nhật trip.price cho hiển thị giá hiện tại (KHÔNG dùng để tính doanh thu)
      return tripObj;
    }));

    return tripsWithBookings;
  }


  async createTrip(tripData) {
    const { routeId, busId, departureTime, arrivalTime, pickupPoints, dropoffPoints, policy } = tripData;

    const bus = await busRepository.findById(busId);
    if (!bus) {
      const err = new Error('Không tìm thấy phương tiện.');
      err.statusCode = 404;
      throw err;
    }

    const basePriceDoc = await mongoose.connection.db.collection('baseprices').findOne({
      routeId: new mongoose.Types.ObjectId(routeId),
      busType: bus.type
    });

    if (!basePriceDoc) {
      throw new Error(`Chưa thiết lập giá vé cho tuyến đường này với loại xe "${bus.type}". Vui lòng liên hệ Quản lý thiết lập giá vé trước.`);
    }

    let finalPickups = pickupPoints || [];
    let finalDropoffs = dropoffPoints || [];

    if ((finalPickups.length <= 1 || finalDropoffs.length <= 1) && routeId) {
      const route = await routeRepository.findById(routeId);
      if (route && route.stops && route.stops.length > 0) {
        const depDate = new Date(departureTime);
        const depVNHours = (depDate.getUTCHours() + 7) % 24;
        const depVNMinutes = depDate.getUTCMinutes();
        const depTotalMin = depVNHours * 60 + depVNMinutes;

        const pStops = route.stops.filter(s => s.type === 'start' || s.type === 'pickup' || s.type === 'both');
        const dStops = route.stops.filter(s => s.type === 'end' || s.type === 'dropoff' || s.type === 'both');

        if (finalPickups.length <= 1 && pStops.length > 0) {
          finalPickups = pStops.map(s => {
            const offset = typeof s.arrivalTimeOffset === 'number' ? s.arrivalTimeOffset : 0;
            const total = depTotalMin + offset;
            const h = Math.floor(total / 60) % 24;
            const m = total % 60;
            return {
              time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
              location: s.name,
              address: s.address || '',
              lat: s.lat,
              lng: s.lng
            };
          });
        }

        if (finalDropoffs.length <= 1 && dStops.length > 0) {
          finalDropoffs = dStops.map(s => {
            const offset = typeof s.arrivalTimeOffset === 'number' ? s.arrivalTimeOffset : 0;
            const total = depTotalMin + offset;
            const h = Math.floor(total / 60) % 24;
            const m = total % 60;
            return {
              time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
              location: s.name,
              address: s.address || '',
              lat: s.lat,
              lng: s.lng
            };
          });
        }
      }
    }

    const baseDep = new Date(departureTime);
    let baseArr = new Date(arrivalTime);

    // Chuẩn hóa thời lượng chuyến xe
    let duration = baseArr.getTime() - baseDep.getTime();
    if (duration <= 0 || duration > 24 * 3600 * 1000) {
      // Nếu giờ đến bị nhập lệch ngày xa (ví dụ cuối năm), chuẩn hóa thời lượng theo giờ trong ngày
      const arrHours = (baseArr.getUTCHours() + 7) % 24;
      const arrMinutes = baseArr.getUTCMinutes();
      const depHours = (baseDep.getUTCHours() + 7) % 24;
      const depMinutes = baseDep.getUTCMinutes();
      let diffMinutes = (arrHours * 60 + arrMinutes) - (depHours * 60 + depMinutes);
      if (diffMinutes <= 0) diffMinutes += 24 * 60;
      duration = diffMinutes * 60 * 1000;
      baseArr = new Date(baseDep.getTime() + duration);
    }

    // Tự động gán tổ lái chuyên trách của xe (nếu xe này đã có tài xế / phụ xe cố định)
    let assignedDriver = tripData.driver;
    let assignedAssistant = tripData.assistant;

    if (!assignedDriver?.phone || !assignedAssistant?.phone) {
      const existingCrewTrip = await tripRepository.findOne({
        busId,
        'driver.phone': { $exists: true, $ne: '' }
      });
      if (existingCrewTrip) {
        if (!assignedDriver?.phone && existingCrewTrip.driver?.phone) {
          assignedDriver = existingCrewTrip.driver;
        }
        if (!assignedAssistant?.phone && existingCrewTrip.assistant?.phone) {
          assignedAssistant = existingCrewTrip.assistant;
        }
      }
    }

    const trip = await tripRepository.create({
      routeId,
      busId,
      departureTime: baseDep,
      arrivalTime: baseArr,
      price: basePriceDoc.price,
      pickupPoints: finalPickups,
      dropoffPoints: finalDropoffs,
      driver: assignedDriver || { name: '', phone: '' },
      assistant: assignedAssistant || { name: '', phone: '' },
      policy: policy || {
        cancellation: 'Yêu cầu hủy vé trước 24 giờ so với giờ khởi hành để được hoàn 100% tiền vé. Hủy vé trong vòng 24 giờ không được hoàn tiền.',
        luggage: 'Hành khách được mang theo tối đa 20kg hành lý ký gửi miễn phí. Không mang động vật nuôi hoặc các chất cấm lên xe.'
      }
    });

    // Tự động lặp lại hàng tuần (mặc định lặp cho các tuần tiếp theo đến hết 31/12/2026)
    if (tripData.repeatWeekly !== false) {
      const maxEndDate = new Date('2026-12-31T23:59:59.999+07:00');
      let nextDep = new Date(baseDep.getTime() + 7 * 24 * 3600 * 1000);

      while (nextDep <= maxEndDate) {
        const nextArr = new Date(nextDep.getTime() + duration);
        const exists = await tripRepository.findOne({
          routeId,
          busId,
          departureTime: nextDep
        });

        if (!exists) {
          await tripRepository.create({
            routeId,
            busId,
            departureTime: nextDep,
            arrivalTime: nextArr,
            price: basePriceDoc.price,
            pickupPoints: finalPickups,
            dropoffPoints: finalDropoffs,
            driver: assignedDriver || { name: '', phone: '' },
            assistant: assignedAssistant || { name: '', phone: '' },
            policy: trip.policy
          });
        }

        nextDep = new Date(nextDep.getTime() + 7 * 24 * 3600 * 1000);
      }
    }

    return trip;
  }

  async updateTrip(id, tripData) {
    const { routeId, busId, departureTime, arrivalTime, pickupPoints, dropoffPoints, policy, driver, assistant, repeatWeekly } = tripData;

    let trip = await tripRepository.findById(id);
    if (!trip) {
      const err = new Error('Không tìm thấy chuyến xe.');
      err.statusCode = 404;
      throw err;
    }

    const targetRouteId = routeId || trip.routeId;
    const targetBusId = busId || trip.busId;

    const bus = await busRepository.findById(targetBusId);
    if (!bus) {
      const err = new Error('Không tìm thấy phương tiện.');
      err.statusCode = 404;
      throw err;
    }

    const basePriceDoc = await mongoose.connection.db.collection('baseprices').findOne({
      routeId: new mongoose.Types.ObjectId(targetRouteId),
      busType: bus.type
    });

    if (!basePriceDoc) {
      throw new Error(`Chưa thiết lập giá vé cho tuyến đường này với loại xe "${bus.type}". Vui lòng liên hệ Quản lý thiết lập giá vé trước.`);
    }

    trip.price = basePriceDoc.price;

    if (routeId) trip.routeId = routeId;
    if (busId) trip.busId = busId;
    if (departureTime) trip.departureTime = new Date(departureTime);
    if (arrivalTime) trip.arrivalTime = new Date(arrivalTime);
    if (pickupPoints) trip.pickupPoints = pickupPoints;
    if (dropoffPoints) trip.dropoffPoints = dropoffPoints;
    if (policy) trip.policy = policy;
    if (driver) trip.driver = driver;
    if (assistant) trip.assistant = assistant;

    await tripRepository.save(trip);

    // Nếu người dùng chọn lặp lại hàng tuần khi cập nhật
    if (repeatWeekly) {
      const baseDep = new Date(trip.departureTime);
      let baseArr = new Date(trip.arrivalTime);
      let duration = baseArr.getTime() - baseDep.getTime();
      if (duration <= 0 || duration > 24 * 3600 * 1000) {
        duration = 2 * 3600 * 1000;
      }
      const maxEndDate = new Date('2026-12-31T23:59:59.999+07:00');
      let nextDep = new Date(baseDep.getTime() + 7 * 24 * 3600 * 1000);

      while (nextDep <= maxEndDate) {
        const nextArr = new Date(nextDep.getTime() + duration);
        const exists = await tripRepository.findOne({
          routeId: trip.routeId,
          busId: trip.busId,
          departureTime: nextDep
        });

        if (!exists) {
          await tripRepository.create({
            routeId: trip.routeId,
            busId: trip.busId,
            departureTime: nextDep,
            arrivalTime: nextArr,
            price: trip.price,
            pickupPoints: trip.pickupPoints,
            dropoffPoints: trip.dropoffPoints,
            policy: trip.policy,
            driver: trip.driver,
            assistant: trip.assistant
          });
        }

        nextDep = new Date(nextDep.getTime() + 7 * 24 * 3600 * 1000);
      }
    }

    return trip;
  }

  async deleteTrip(id) {
    const trip = await tripRepository.findById(id);
    if (!trip) {
      const err = new Error('Không tìm thấy chuyến xe.');
      err.statusCode = 404;
      throw err;
    }

    // Check if trip has any active bookings (status !== cancelled)
    const bookingsCount = await bookingRepository.countDocuments({ tripId: id, status: { $ne: 'cancelled' } });
    if (bookingsCount > 0) {
      throw new Error('Không thể xóa chuyến xe vì có hành khách đã đặt vé.');
    }

    await tripRepository.delete(trip);
    return true;
  }

  async getSearchLocations() {
    const routes = await routeRepository.find({ status: { $nin: ['pending', 'rejected'] } });
    const trips = await tripRepository.findWithPopulate({});

    const originsMap = new Map();
    const destinationsMap = new Map();

    // 1. Add route cities/provinces
    for (const route of routes) {
      if (route.startPoint) {
        originsMap.set(route.startPoint, { name: route.startPoint, type: 'city' });
      }
      if (route.endPoint) {
        destinationsMap.set(route.endPoint, { name: route.endPoint, type: 'city' });
      }
    }

    // 2. Add specific pickup/dropoff points
    for (const trip of trips) {
      const startPoint = trip.routeId?.startPoint;
      const endPoint = trip.routeId?.endPoint;

      if (trip.pickupPoints && Array.isArray(trip.pickupPoints)) {
        for (const p of trip.pickupPoints) {
          if (p.location && !originsMap.has(p.location)) {
            originsMap.set(p.location, {
              name: p.location,
              type: 'station',
              parent: startPoint || ''
            });
          }
        }
      }

      if (trip.dropoffPoints && Array.isArray(trip.dropoffPoints)) {
        for (const d of trip.dropoffPoints) {
          if (d.location && !destinationsMap.has(d.location)) {
            destinationsMap.set(d.location, {
              name: d.location,
              type: 'station',
              parent: endPoint || ''
            });
          }
        }
      }
    }

    return {
      origins: Array.from(originsMap.values()),
      destinations: Array.from(destinationsMap.values()),
      routes
    };
  }

  async autoScheduleTrips({ startDate, endDate, configs }) {
    const start = new Date(`${startDate}T00:00:00.000+07:00`);
    const end = new Date(`${endDate}T23:59:59.999+07:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Định dạng ngày bắt đầu hoặc ngày kết thúc không hợp lệ.');
    }

    if (start > end) {
      throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    }

    let createdCount = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      for (const config of configs) {
        const { routeId, busId, departureTime, arrivalTime, pickupPoints, dropoffPoints } = config;

        const bus = await busRepository.findById(busId);
        if (!bus) {
          throw new Error(`Không tìm thấy phương tiện với ID ${busId}.`);
        }

        const basePriceDoc = await mongoose.connection.db.collection('baseprices').findOne({
          routeId: new mongoose.Types.ObjectId(routeId),
          busType: bus.type
        });
        if (!basePriceDoc) {
          throw new Error(`Chưa thiết lập giá vé cho tuyến đường này với loại xe "${bus.type}". Vui lòng thiết lập giá vé trước.`);
        }

        const depDateTime = new Date(`${dateStr}T${departureTime}:00.000+07:00`);
        let arrDateTime = new Date(`${dateStr}T${arrivalTime}:00.000+07:00`);

        if (arrDateTime < depDateTime) {
          arrDateTime.setDate(arrDateTime.getDate() + 1);
        }

        await tripRepository.create({
          routeId,
          busId,
          departureTime: depDateTime,
          arrivalTime: arrDateTime,
          price: basePriceDoc.price,
          pickupPoints: pickupPoints || [],
          dropoffPoints: dropoffPoints || [],
          policy: {
            cancellation: 'Yêu cầu hủy vé trước 24 giờ so với giờ khởi hành để được hoàn 100% tiền vé. Hủy vé trong vòng 24 giờ không được hoàn tiền.',
            luggage: 'Hành khách được mang theo tối đa 20kg hành lý ký gửi miễn phí. Không mang động vật nuôi hoặc các chất cấm lên xe.'
          }
        });
        createdCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { createdCount };
  }

  async getTripModel(tripId) {
    return await tripRepository.findById(tripId);
  }

  async getMaintenanceRecords() {
    return await maintenanceRepository.find({});
  }

  async createMaintenanceRecord(recordData) {
    const { busId, plateNumber, type, description, garage, cost, startDate, endDate } = recordData;

    const bus = await busRepository.findById(busId);
    if (bus && bus.maintenanceInfo) {
      if (bus.maintenanceInfo.isMajor && bus.maintenanceInfo.approvalStatus !== 'approved') {
        const err = new Error('Khoản chi phí bảo dưỡng này vượt hạn mức (≥ 10.000.000 ₫) và chưa được Giám đốc nhà xe phê duyệt.');
        err.statusCode = 403;
        throw err;
      }
    }

    const record = await maintenanceRepository.create({
      busId,
      plateNumber,
      type,
      description,
      garage,
      cost: Number(cost),
      estimatedCost: bus?.maintenanceInfo?.estimatedCost || Number(cost),
      isMajor: bus?.maintenanceInfo?.isMajor || Number(cost) >= 10000000,
      approvalStatus: bus?.maintenanceInfo?.approvalStatus || (Number(cost) >= 10000000 ? 'pending_approval' : 'auto_approved'),
      proposedBy: bus?.maintenanceInfo?.proposedBy,
      approvedBy: bus?.maintenanceInfo?.approvedBy,
      approvedAt: bus?.maintenanceInfo?.approvedAt,
      approvalNote: bus?.maintenanceInfo?.approvalNote || '',
      rejectionReason: bus?.maintenanceInfo?.rejectionReason || '',
      startDate: startDate || new Date(),
      endDate: endDate || new Date()
    });

    if (bus) {
      bus.activeStatus = 'ready';
      bus.maintenanceInfo = undefined;
      await busRepository.save(bus);
    }

    return record;
  }

  async getMaintenanceApprovals() {
    const Bus = require('../models/Bus');
    return await Bus.find({
      activeStatus: { $in: ['maintenance', 'repairing'] },
      $or: [
        { 'maintenanceInfo.isMajor': true },
        { 'maintenanceInfo.approvalStatus': 'pending_approval' }
      ]
    })
    .populate('maintenanceInfo.proposedBy', 'name role phone email')
    .populate('maintenanceInfo.approvedBy', 'name role email')
    .sort({ updatedAt: -1 });
  }

  async reviewMaintenanceApproval(busId, { status, approvalNote, rejectionReason, reviewerId }) {
    const bus = await busRepository.findById(busId);
    if (!bus) {
      const err = new Error('Không tìm thấy phương tiện.');
      err.statusCode = 404;
      throw err;
    }

    if (!bus.maintenanceInfo) {
      const err = new Error('Phương tiện này hiện không có hồ sơ bảo dưỡng cần duyệt.');
      err.statusCode = 400;
      throw err;
    }

    bus.maintenanceInfo.approvalStatus = status === 'approved' ? 'approved' : 'rejected';
    bus.maintenanceInfo.approvedBy = reviewerId;
    bus.maintenanceInfo.approvedAt = new Date();
    if (approvalNote) bus.maintenanceInfo.approvalNote = approvalNote;
    if (rejectionReason) bus.maintenanceInfo.rejectionReason = rejectionReason;

    bus.markModified('maintenanceInfo');
    await busRepository.save(bus);
    return bus;
  }
}

module.exports = new TripService();
