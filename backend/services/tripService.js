const mongoose = require('mongoose');
const tripRepository = require('../repositories/tripRepository');
const routeRepository = require('../repositories/routeRepository');
const busRepository = require('../repositories/busRepository');
const bookingRepository = require('../repositories/bookingRepository');
const shipmentRepository = require('../repositories/shipmentRepository');
const reviewRepository = require('../repositories/reviewRepository');
const maintenanceRepository = require('../repositories/maintenanceRepository');
const { sendShipmentInvoiceEmail } = require('./emailService');
const redisGpsService = require('./redisGpsService');

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

  async searchTrips({ from = '', to = '', date }) {
    // 1. Standardize date range for GMT+7 (Vietnam Time)
    const targetDate = date ? date.trim() : new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${targetDate}T00:00:00.000+07:00`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999+07:00`);

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

    const cleanFrom = (from || '').trim();
    const cleanTo = (to || '').trim();
    const searchFrom = resolveAbbr(cleanFrom);
    const searchTo = resolveAbbr(cleanTo);

    // 3. Build query for Trips (Only show trips in the future)
    const now = new Date();
    const minDepartureTime = startOfDay > now ? startOfDay : now;

    const query = {
      departureTime: {
        $gte: minDepartureTime,
        $lte: endOfDay
      }
    };

    const andConditions = [];

    // Filter by Origin if provided
    if (searchFrom) {
      const fromRegex = new RegExp(searchFrom.trim(), 'i');
      const routesFrom = await routeRepository.find({
        startPoint: { $regex: fromRegex }
      });
      const routeIdsFrom = routesFrom.map(r => r._id);

      const fromConditions = [];
      if (routeIdsFrom.length > 0) {
        fromConditions.push({ routeId: { $in: routeIdsFrom } });
      }
      fromConditions.push({ 'pickupPoints.location': { $regex: fromRegex } });
      andConditions.push({ $or: fromConditions });
    }

    // Filter by Destination if provided
    if (searchTo) {
      const toRegex = new RegExp(searchTo.trim(), 'i');
      const routesTo = await routeRepository.find({
        endPoint: { $regex: toRegex }
      });
      const routeIdsTo = routesTo.map(r => r._id);

      const toConditions = [];
      if (routeIdsTo.length > 0) {
        toConditions.push({ routeId: { $in: routeIdsTo } });
      }
      toConditions.push({ 'dropoffPoints.location': { $regex: toRegex } });
      andConditions.push({ $or: toConditions });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

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
    // Xử lý chuyển đổi trạng thái vận hành & ghi nhận vào Maintenance
    if (activeStatus && activeStatus !== bus.activeStatus) {
      bus.activeStatus = activeStatus;

      if (activeStatus === 'maintenance' || activeStatus === 'repairing') {
        const costNum = Number(maintenanceInfo?.estimatedCost) || 0;
        const isMajor = costNum >= 10000000;
        const approvalStatus = isMajor ? 'pending_approval' : 'approved';

        const maintRecord = await maintenanceRepository.create({
          busId: bus._id,
          type: activeStatus,
          description: maintenanceInfo?.description || (activeStatus === 'maintenance' ? 'Đưa xe vào bảo dưỡng định kỳ' : 'Đưa xe vào sửa chữa sự cố'),
          garage: maintenanceInfo?.garage || 'Xưởng đối tác',
          estimatedCost: costNum,
          cost: costNum,
          isMajor,
          approvalStatus,
          proposedBy: busData.proposedBy,
          startDate: new Date(),
          endDate: maintenanceInfo?.estimatedCompletion || new Date()
        });
        bus.currentMaintenance = maintRecord._id;
      } else if (activeStatus === 'inactive') {
        await maintenanceRepository.create({
          busId: bus._id,
          type: 'inactive',
          description: 'Chuyển trạng thái sang: Tạm ngưng hoạt động.',
          garage: '-',
          cost: 0,
          approvalStatus: 'approved',
          startDate: new Date(),
          endDate: new Date()
        });
        bus.currentMaintenance = null;
      } else if (activeStatus === 'ready') {
        await maintenanceRepository.create({
          busId: bus._id,
          type: 'ready',
          description: 'Chuyển trạng thái sang: Sẵn sàng hoạt động.',
          garage: '-',
          cost: 0,
          approvalStatus: 'approved',
          startDate: new Date(),
          endDate: new Date()
        });
        bus.currentMaintenance = null;
      }
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
      const liveGpsCache = await redisGpsService.getLiveGps(t._id.toString());
      if (liveGpsCache) {
        tripObj.liveGps = liveGpsCache;
      }
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
    return await maintenanceRepository.find({
      type: { $in: ['maintenance', 'repairing'] }
    });
  }

  async createMaintenanceRecord(recordData) {
    const { busId, type, description, garage, cost, startDate, endDate } = recordData;

    const bus = await busRepository.findById(busId);
    const costNum = Number(cost) || 0;
    const isMajor = costNum >= 10000000;

    let record;
    if (bus && bus.currentMaintenance) {
      record = await maintenanceRepository.findByIdAndUpdate(bus.currentMaintenance, {
        cost: costNum,
        description: description || 'Nghiệm thu hoàn tất xuất xưởng',
        garage: garage || 'Xưởng nội bộ',
        endDate: endDate || new Date(),
        approvalStatus: 'approved'
      });
    }

    if (!record) {
      record = await maintenanceRepository.create({
        busId,
        type: type || 'maintenance',
        description,
        garage: garage || 'Xưởng nội bộ',
        cost: costNum,
        estimatedCost: costNum,
        isMajor,
        approvalStatus: 'approved',
        startDate: startDate || new Date(),
        endDate: endDate || new Date()
      });
    }

    if (bus) {
      bus.activeStatus = 'ready';
      bus.currentMaintenance = null;
      await busRepository.save(bus);
    }

    return record;
  }

  async getMaintenanceApprovals() {
    const Maintenance = require('../models/Maintenance');
    return await Maintenance.find({
      $or: [
        { isMajor: true },
        { cost: { $gte: 10000000 } }
      ]
    })
      .populate('busId', 'plateNumber type totalSeats activeStatus')
      .populate('proposedBy', 'name role phone email')
      .populate('approvedBy', 'name role email')
      .sort({ updatedAt: -1 });
  }

  async reviewMaintenanceApproval(targetId, { status, approvalNote, rejectionReason, reviewerId }) {
    const Maintenance = require('../models/Maintenance');
    let maint = await Maintenance.findById(targetId);
    if (!maint) {
      // Hỗ trợ trường hợp frontend gửi lên busId thay vì maintenanceId
      maint = await Maintenance.findOne({
        busId: targetId,
        isMajor: true,
        approvalStatus: 'pending_approval'
      });
    }

    if (!maint) {
      const err = new Error('Không tìm thấy hồ sơ bảo dưỡng cần duyệt.');
      err.statusCode = 404;
      throw err;
    }

    maint.approvalStatus = status === 'approved' ? 'approved' : 'rejected';
    maint.approvedBy = reviewerId;
    maint.approvedAt = new Date();
    if (approvalNote) maint.approvalNote = approvalNote;
    if (rejectionReason) maint.rejectionReason = rejectionReason;

    await maint.save();
    return maint;
  }

  async getFleetForecast() {
    const buses = await busRepository.find({ status: 'approved' });
    const trips = await tripRepository.findWithPopulate({});
    const maintenanceRecords = await maintenanceRepository.find({});

    const COMPONENT_THRESHOLDS = {
      oil: { name: 'Dầu nhớt & Lọc động cơ', cycleKm: 10000, baseCost: 950000 },
      brakes: { name: 'Hệ thống phanh & Má phanh', cycleKm: 25000, baseCost: 1800000 },
      tires: { name: 'Lốp xe & Rãnh gai chịu tải', cycleKm: 50000, baseCost: 5500000 },
      cooling: { name: 'Hệ thống làm mát & Điều hòa', cycleKm: 20000, baseCost: 1200000 },
      battery: { name: 'Ắc quy & Hệ thống điện/Lọc gió', cycleKm: 30000, baseCost: 850000 }
    };

    const now = Date.now();

    const fleetAnalytics = buses.map(bus => {
      const busIdStr = bus._id.toString();

      // Lọc các chuyến xe của phương tiện
      const busTrips = trips.filter(t => {
        if (!t.busId) return false;
        const tBusId = t.busId._id ? t.busId._id.toString() : t.busId.toString();
        return tBusId === busIdStr;
      });

      // Lọc các đợt bảo trì của phương tiện
      const busMaint = maintenanceRecords.filter(m => {
        if (!m.busId) return false;
        const mBusId = m.busId._id ? m.busId._id.toString() : m.busId.toString();
        return mBusId === busIdStr;
      });

      // 1. Tính tổng thời gian nằm xưởng bảo dưỡng / sửa chữa (mili-giây)
      let totalWorkshopMs = 0;
      busMaint.forEach(m => {
        const start = new Date(m.startDate || m.createdAt).getTime();
        const end = new Date(m.endDate || m.updatedAt || m.startDate || m.createdAt).getTime();
        if (end > start) {
          totalWorkshopMs += (end - start);
        }
      });
      const workshopDays = Math.round(totalWorkshopMs / (24 * 3600 * 1000));

      // 2. Sắp xếp chuyến xe theo thời gian xuất bến
      const sortedTrips = [...busTrips].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

      // 3. Bóc tách cự ly và đối soát Timestamp nghiệm thu xuất xưởng thực tế
      let totalKm = 0;
      let actualTripsRun = 0;
      let overlappedTripCount = 0;

      sortedTrips.forEach(t => {
        const depTimestamp = new Date(t.departureTime).getTime();

        // Kiểm tra xem giờ khởi hành có rơi đúng vào khoảng thời gian xe đang nằm xưởng chưa nghiệm thu hay không
        const isStillInWorkshop = busMaint.some(m => {
          const start = new Date(m.startDate || m.createdAt).getTime();
          const end = new Date(m.endDate || m.updatedAt || m.startDate || m.createdAt).getTime();
          return depTimestamp >= start && depTimestamp <= end;
        });

        if (isStillInWorkshop) {
          overlappedTripCount++;
          return;
        }

        const distStr = t.routeId?.distance || '';
        const match = distStr.match(/(\d+)/);
        const km = match ? parseInt(match[1], 10) : 250;
        totalKm += km;
        actualTripsRun++;
      });

      if (totalKm === 0) {
        totalKm = 32000;
      }

      // 4. Xác định khoảng thời gian khai thác & cường độ vận hành thực tế
      const firstTripTime = sortedTrips.length > 0
        ? new Date(sortedTrips[0].departureTime).getTime()
        : (new Date(bus.createdAt || now).getTime() - 90 * 24 * 3600 * 1000);

      const totalCalendarDays = Math.max(1, Math.round((now - firstTripTime) / (24 * 3600 * 1000)));
      const activeOperatingDays = Math.max(1, totalCalendarDays - workshopDays);

      let avgDailyKm = Math.round(totalKm / activeOperatingDays);
      if (!avgDailyKm || avgDailyKm < 150) avgDailyKm = 220;
      if (avgDailyKm > 600) avgDailyKm = 380;

      // 5. Tính mức độ hao mòn cho 5 cụm chi tiết kỹ thuật dựa trên chu kỳ định mức & lịch sử nghiệm thu bảo dưỡng
      const COMPONENT_KEYWORDS = {
        oil: /dầu|nhớt|bôi trơn|nhot|dau|lọc động cơ|dong co/i,
        brakes: /phanh|thắng|má phanh|thang|áp suất phanh|khí nén/i,
        tires: /lốp|vỏ|lop|vo|rãnh gai|bánh xe/i,
        cooling: /làm mát|điều hòa|dieu hoa|lam mat|lốc|loc|nước làm mát|ga|r134a/i,
        battery: /ắc quy|ac quy|bình|điện|dien|lọc gió|loc gio|nhiên liệu/i
      };

      const components = Object.keys(COMPONENT_THRESHOLDS).map(key => {
        const comp = COMPONENT_THRESHOLDS[key];

        // Tìm các biên bản bảo dưỡng / sửa chữa đã hoàn tất của xe này
        const matchingMaint = busMaint.filter(m => {
          if (!m.endDate) return false;
          const desc = (m.description || '').toLowerCase();
          const isGeneral = /đại tu|toàn bộ|tổng thể|tổng quát|toàn diện|định kỳ|bảo dưỡng xe/i.test(desc);
          return isGeneral || COMPONENT_KEYWORDS[key].test(desc);
        });

        let kmSince = 0;
        if (matchingMaint.length > 0) {
          // Lấy lần bảo dưỡng gần nhất cho hạng mục này
          matchingMaint.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
          const latestMaint = matchingMaint[0];
          const lastMaintTime = new Date(latestMaint.endDate).getTime();

          // Chỉ tích lũy số km của các chuyến xe thực tế khởi hành SAU khi bảo dưỡng hoàn tất xuất xưởng đến hiện tại
          sortedTrips.forEach(t => {
            const depTime = new Date(t.departureTime).getTime();
            if (depTime > lastMaintTime && depTime <= now) {
              const distStr = t.routeId?.distance || '';
              const match = distStr.match(/(\d+)/);
              kmSince += match ? parseInt(match[1], 10) : 250;
            }
          });
        } else {
          // Nếu chưa từng bảo dưỡng hạng mục này, tính hao mòn theo chu kỳ định mức từ tổng km
          kmSince = totalKm % comp.cycleKm;
        }

        const wear = Math.min(100, Math.round((kmSince / comp.cycleKm) * 100));
        const remainKm = Math.max(0, comp.cycleKm - kmSince);

        return {
          key,
          ...comp,
          wear,
          kmSince,
          remainKm
        };
      });

      const highestWear = [...components].sort((a, b) => b.wear - a.wear)[0];
      const avgWear = Math.round(components.reduce((sum, c) => sum + c.wear, 0) / components.length);
      // Điểm sức khỏe toàn xe dựa trên độ bền tổng thể của 5 cụm chi tiết kỹ thuật
      const healthScore = Math.max(30, Math.min(100, 100 - avgWear));

      let riskLevel = 'good';
      let riskLabel = 'Vận hành tối ưu';
      if (highestWear.wear >= 85 || healthScore < 50) {
        riskLevel = 'high';
        riskLabel = 'Ưu tiên bảo dưỡng';
      } else if (highestWear.wear >= 70 || healthScore < 70) {
        riskLevel = 'medium';
        riskLabel = 'Cần theo dõi';
      }

      const daysUntil = Math.max(1, Math.round(highestWear.remainKm / avgDailyKm));
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysUntil);

      const dueComponents = components.filter(c => c.wear >= 70);
      const predictedCost = dueComponents.length > 0
        ? dueComponents.reduce((sum, c) => sum + c.baseCost, 0)
        : highestWear.baseCost;

      let recommendation = 'Phương tiện đạt chuẩn kỹ thuật, tiếp tục vận hành theo lịch trình.';
      if (highestWear.wear >= 85) {
        recommendation = `Cần lập lịch thay thế ${highestWear.name.toLowerCase()} trước hành trình tiếp theo để bảo đảm an toàn.`;
      } else if (highestWear.wear >= 70) {
        recommendation = `Theo dõi sát ${highestWear.name.toLowerCase()} trong các đợt kiểm tra cuối ngày, còn khoảng ${highestWear.remainKm.toLocaleString('vi-VN')} km.`;
      }

      return {
        bus,
        tripCount: actualTripsRun,
        rawTripCount: busTrips.length,
        overlappedTripCount,
        workshopDays,
        activeOperatingDays,
        avgDailyKm,
        totalKm,
        components,
        highestWear,
        healthScore,
        riskLevel,
        riskLabel,
        daysUntil,
        nextDate,
        predictedCost,
        recommendation
      };
    });

    return fleetAnalytics;
  }

  async getBusStatusLogs(query = {}) {
    const maints = await maintenanceRepository.find(query);
    return maints.map(m => {
      const isRepair = m.type === 'repairing';
      const isMaint = m.type === 'maintenance';
      const isInactive = m.type === 'inactive';
      const isReady = m.type === 'ready';

      let fromStatus = 'ready';
      if (isReady) {
        fromStatus = (m.cost > 0 || (m.garage && m.garage !== '-')) ? 'maintenance' : 'inactive';
      } else if (isInactive) {
        fromStatus = 'ready';
      } else if (isMaint || isRepair) {
        fromStatus = 'ready';
      }

      return {
        _id: m._id,
        id: m._id,
        busId: m.busId?._id || m.busId,
        plateNumber: m.busId?.plateNumber || m.plateNumber || 'Phương tiện',
        busType: m.busId?.type || '',
        type: m.type,
        fromStatus,
        toStatus: m.type,
        time: m.endDate || m.startDate || m.createdAt,
        startDate: m.startDate,
        endDate: m.endDate,
        details: m.description,
        garage: m.garage || '-',
        cost: m.cost || 0,
        approvalStatus: m.approvalStatus || 'approved'
      };
    });
  }

  async createBusStatusLog(logData) {
    return await maintenanceRepository.create({
      busId: logData.busId,
      type: logData.toStatus || 'ready',
      description: logData.details || 'Cập nhật trạng thái phương tiện',
      garage: logData.garage || '-',
      cost: logData.cost || 0,
      approvalStatus: 'approved',
      startDate: logData.time || new Date(),
      endDate: logData.time || new Date()
    });
  }
}

module.exports = new TripService();
