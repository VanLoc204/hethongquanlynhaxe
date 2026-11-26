const pricingRuleRepository = require('../repositories/pricingRuleRepository');
const basePriceRepository = require('../repositories/basePriceRepository');
const routeRepository = require('../repositories/routeRepository');
const busRepository = require('../repositories/busRepository');
const tripRepository = require('../repositories/tripRepository');
const bookingRepository = require('../repositories/bookingRepository');

class PricingService {
  async getRules() {
    return await pricingRuleRepository.find({});
  }

  async createRule(ruleData) {
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, startDate, endDate, isActive } = ruleData;
    return await pricingRuleRepository.create({
      name,
      routeId,
      routeName,
      busType,
      dayOfWeek,
      adjustmentType,
      adjustmentValue,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive
    });
  }

  async updateRule(id, ruleData) {
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, startDate, endDate, isActive } = ruleData;
    
    let rule = await pricingRuleRepository.findById(id);
    if (!rule) {
      const err = new Error('Không tìm thấy quy định giá.');
      err.statusCode = 404;
      throw err;
    }

    if (name !== undefined) rule.name = name;
    if (routeId !== undefined) rule.routeId = routeId;
    if (routeName !== undefined) rule.routeName = routeName;
    if (busType !== undefined) rule.busType = busType;
    if (dayOfWeek !== undefined) rule.dayOfWeek = dayOfWeek;
    if (adjustmentType !== undefined) rule.adjustmentType = adjustmentType;
    if (adjustmentValue !== undefined) rule.adjustmentValue = adjustmentValue;
    if (startDate !== undefined) rule.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) rule.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) rule.isActive = isActive;

    await pricingRuleRepository.save(rule);
    return rule;
  }

  async deleteRule(id) {
    const rule = await pricingRuleRepository.findById(id);
    if (!rule) {
      const err = new Error('Không tìm thấy quy định giá.');
      err.statusCode = 404;
      throw err;
    }

    await pricingRuleRepository.delete(rule);
    return true;
  }

  calculateRecommendedPrice(distanceStr, busType, occupancyRate = 65) {
    if (!distanceStr) return 150000;

    const distanceMatch = distanceStr.replace(/\s+/g, '').match(/\d+/);
    const distance = distanceMatch ? parseInt(distanceMatch[0], 10) : 200;

    let costPerKm = 1000;
    const typeLower = (busType || '').toLowerCase();
    
    if (typeLower.includes('limousine')) {
      costPerKm = 1700;
    } else if (typeLower.includes('giường nằm')) {
      costPerKm = 1200;
    } else if (typeLower.includes('45 chỗ')) {
      costPerKm = 700;
    } else if (typeLower.includes('29 chỗ')) {
      costPerKm = 750;
    } else if (typeLower.includes('16 chỗ') || typeLower.includes('ghế ngồi')) {
      costPerKm = 800;
    }

    // Base price from mileage
    let basePrice = distance * costPerKm;

    // Demand elasticity multiplier based on real occupancy rate
    let multiplier = 1.0;
    if (occupancyRate >= 80) {
      multiplier = 1.10; // +10% peak demand surcharge
    } else if (occupancyRate <= 40) {
      multiplier = 0.90; // -10% discount for low demand
    }

    let recommended = basePrice * multiplier;
    recommended = Math.round(recommended / 5000) * 5000;
    return recommended;
  }

  async getBasePricesCombinations() {
    const routes = await routeRepository.find({});
    const busTypes = await busRepository.distinct('type');
    const basePrices = await basePriceRepository.find({});
    
    // Query real MongoDB bookings & trips for dynamic occupancy calculation
    const allTrips = await tripRepository.findWithPopulate({}) || [];
    const allBookings = await bookingRepository.find({ status: { $in: ['paid', 'confirmed'] } }) || [];

    const combinations = [];
    for (const route of routes) {
      const routeName = `${route.startPoint} → ${route.endPoint}`;
      
      const startStop = (route.stops && route.stops.find(s => s.type === 'start')?.name) || `Bến xe ${route.startPoint}`;
      const endStop = (route.stops && route.stops.find(s => s.type === 'end')?.name) || `Bến xe ${route.endPoint}`;

      const distanceMatch = (route.distance || '').replace(/\s+/g, '').match(/\d+/);
      const distanceKm = distanceMatch ? parseInt(distanceMatch[0], 10) : 200;

      for (const busType of busTypes) {
        if (!busType) continue;

        // Filter real trips for this specific route + bus type
        const matchingTrips = allTrips.filter(t => {
          const rId = t.routeId?._id ? t.routeId._id.toString() : t.routeId?.toString();
          const bType = t.busId?.type || '';
          return rId === route._id.toString() && bType === busType;
        });

        let occupancyRate = 65; // default fallback if no trip history yet
        if (matchingTrips.length > 0) {
          const tripIdsStr = matchingTrips.map(t => t._id.toString());
          const matchingBookings = allBookings.filter(b => b.tripId && tripIdsStr.includes(b.tripId._id ? b.tripId._id.toString() : b.tripId.toString()));
          
          let totalBookedSeats = 0;
          matchingBookings.forEach(b => {
            if (Array.isArray(b.seats)) totalBookedSeats += b.seats.length;
          });

          let totalCapacity = matchingTrips.reduce((acc, t) => acc + (t.busId?.capacity || 36), 0);
          if (totalCapacity > 0) {
            occupancyRate = Math.min(100, Math.max(0, (totalBookedSeats / totalCapacity) * 100));
          }
        }

        const existing = basePrices.find(
          bp => bp.routeId.toString() === route._id.toString() && bp.busType === busType
        );

        const recommendedPrice = this.calculateRecommendedPrice(route.distance, busType, occupancyRate);
        const currentPrice = existing ? existing.price : null;
        const effectivePrice = currentPrice || recommendedPrice;
        const unitPricePerKm = Math.round(effectivePrice / (distanceKm || 1));

        // Generate dynamic AI recommendation sentence from real MongoDB occupancy rate
        let analysisRecommendation = `✓ Đã tối ưu cho tỷ lệ lấp đầy ${occupancyRate.toFixed(1)}%`;
        if (occupancyRate >= 80) {
          analysisRecommendation = `✓ Tỷ lệ lấp đầy ${occupancyRate.toFixed(1)}% (Cao), đề xuất tối ưu lợi nhuận`;
        } else if (occupancyRate <= 40) {
          analysisRecommendation = `⚠️ Tỷ lệ ghế lấp đầy chỉ ${occupancyRate.toFixed(1)}%, đề xuất giảm 10% kích cầu`;
        } else {
          analysisRecommendation = `✓ Tỷ lệ lấp đầy ${occupancyRate.toFixed(1)}%, công suất đạt chuẩn`;
        }

        combinations.push({
          routeId: route._id,
          routeName: routeName,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          startStation: startStop,
          endStation: endStop,
          busType: busType,
          price: currentPrice,
          isSet: !!existing,
          basePriceId: existing ? existing._id : null,
          distance: route.distance,
          duration: route.duration,
          occupancyRate: Math.round(occupancyRate),
          recommendedPrice: recommendedPrice,
          unitPricePerKm: unitPricePerKm,
          analysisRecommendation: analysisRecommendation
        });
      }
    }

    return combinations;
  }

  /**
   * Lấy danh sách gợi ý giá vé AI CHỈ DỰA TRÊN các chuyến xe ĐÃ VÀ ĐANG VẬN HÀNH TÍNH ĐẾN THỜI ĐIỂM HIỆN TẠI.
   * Loại bỏ các chuyến xe trong tương lai xa (tránh làm loãng tỷ lệ lấp đầy do tính cả chuyến chưa chạy).
   */
  async getDynamicPricingSuggestions() {
    const routes = await routeRepository.find({});
    const basePrices = await basePriceRepository.find({});
    
    // CHỈ lấy các chuyến xe có thời gian xuất phát tính đến thời điểm hiện tại (departureTime <= now)
    const now = new Date();
    const allTrips = await tripRepository.findWithPopulate({ departureTime: { $lte: now } }) || [];
    const allBookings = await bookingRepository.find({ status: { $in: ['paid', 'confirmed'] } }) || [];

    const routeMap = new Map(routes.map(r => [r._id.toString(), r]));
    const comboMap = new Map();

    // Gom nhóm CHỈ từ các chuyến xe THỰC TẾ đã và đang vận hành tính đến hiện tại
    for (const t of allTrips) {
      const rId = t.routeId?._id ? t.routeId._id.toString() : t.routeId?.toString();
      const route = routeMap.get(rId);
      if (!route) continue;

      const busType = t.busId?.type || 'Xe Ghế Ngồi';
      const key = `${rId}_${busType}`;

      if (!comboMap.has(key)) {
        const startStop = (route.stops && route.stops.find(s => s.type === 'start')?.name) || `Bến xe ${route.startPoint}`;
        const endStop = (route.stops && route.stops.find(s => s.type === 'end')?.name) || `Bến xe ${route.endPoint}`;
        const distanceMatch = (route.distance || '').replace(/\s+/g, '').match(/\d+/);
        const distanceKm = distanceMatch ? parseInt(distanceMatch[0], 10) : 200;

        comboMap.set(key, {
          routeId: route._id,
          routeName: `${route.startPoint} → ${route.endPoint}`,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          startStation: startStop,
          endStation: endStop,
          busType: busType,
          distance: route.distance || `${distanceKm} km`,
          duration: route.duration,
          distanceKm,
          trips: []
        });
      }

      comboMap.get(key).trips.push(t);
    }

    const suggestions = [];

    for (const item of comboMap.values()) {
      // Bỏ qua nếu tổ hợp này không có chuyến xe nào tính đến hiện tại
      if (!item.trips || item.trips.length === 0) continue;

      let totalBookedSeats = 0;
      item.trips.forEach(t => {
        const tripBookings = allBookings.filter(b => b.tripId && (b.tripId._id ? b.tripId._id.toString() : b.tripId.toString()) === t._id.toString());
        let seatsFromBookings = 0;
        tripBookings.forEach(b => {
          if (Array.isArray(b.seats)) seatsFromBookings += b.seats.length;
        });
        const bookedCount = Math.max(seatsFromBookings, Array.isArray(t.bookedSeats) ? t.bookedSeats.length : 0);
        totalBookedSeats += bookedCount;
      });

      const totalCapacity = item.trips.reduce((acc, t) => acc + (t.busId?.capacity || 36), 0);
      const occupancyRate = totalCapacity > 0 
        ? Math.min(100, Math.max(0, (totalBookedSeats / totalCapacity) * 100))
        : 0;

      const existingPrice = basePrices.find(
        bp => bp.routeId.toString() === item.routeId.toString() && bp.busType === item.busType
      );

      const recommendedPrice = this.calculateRecommendedPrice(item.distance, item.busType, occupancyRate);
      const currentPrice = existingPrice ? existingPrice.price : null;
      const effectivePrice = currentPrice || recommendedPrice;
      const unitPricePerKm = Math.round(effectivePrice / (item.distanceKm || 1));

      // Tính phần trăm chênh lệch giữa giá đề xuất AI và giá niêm yết hiện tại
      let diffPercent = 0;
      if (currentPrice && currentPrice > 0) {
        diffPercent = Math.round(((recommendedPrice - currentPrice) / currentPrice) * 100);
      }

      // Tạo thông điệp phân tích & khuyến nghị AI rõ ràng, gắn với dữ liệu thật đến thời điểm hiện tại
      let analysisRecommendation = '';
      if (occupancyRate >= 80) {
        analysisRecommendation = `✓ Tỷ lệ lấp đầy ${occupancyRate.toFixed(1)}% (${item.trips.length} chuyến tới nay) - Nhu cầu cao, đề xuất tăng 10% tối ưu doanh thu`;
      } else if (occupancyRate <= 40) {
        analysisRecommendation = `⚠️ Tỷ lệ lấp đầy chỉ ${occupancyRate.toFixed(1)}% (${item.trips.length} chuyến tới nay) - Vắng khách, đề xuất giảm 10% kích cầu`;
      } else {
        analysisRecommendation = `✓ Tỷ lệ lấp đầy ${occupancyRate.toFixed(1)}% (${item.trips.length} chuyến tới nay) - Công suất đạt chuẩn`;
      }

      suggestions.push({
        routeId: item.routeId,
        routeName: item.routeName,
        startPoint: item.startPoint,
        endPoint: item.endPoint,
        startStation: item.startStation,
        endStation: item.endStation,
        busType: item.busType,
        price: currentPrice,
        isSet: !!existingPrice,
        basePriceId: existingPrice ? existingPrice._id : null,
        distance: item.distance,
        duration: item.duration,
        tripsCount: item.trips.length,
        totalCapacity,
        bookedSeats: totalBookedSeats,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        recommendedPrice,
        diffPercent,
        unitPricePerKm,
        analysisRecommendation
      });
    }

    // Sắp xếp ưu tiên các tuyến có nhiều chuyến hoặc có tỷ lệ lấp đầy cần can thiệp
    suggestions.sort((a, b) => b.tripsCount - a.tripsCount);

    return suggestions;
  }

  /**
   * Lấy danh sách tổ hợp Tuyến đường & Dòng xe THỰC TẾ đang khai thác tính đến hiện tại
   * Dựa trên dữ liệu chuyến xe (trips) xuất bến tính đến hiện tại (departureTime <= now)
   * loại bỏ các chuyến trong tương lai xa để phản ánh tỷ lệ lấp đầy chính xác.
   */
  async getRealRoutesAnalytics() {
    const routes = await routeRepository.find({});
    const now = new Date();
    const allTrips = await tripRepository.findWithPopulate({ departureTime: { $lte: now } }) || [];
    const allBookings = await bookingRepository.find({ status: { $in: ['paid', 'confirmed'] } }) || [];
    const basePrices = await basePriceRepository.find({});

    const routeMap = new Map(routes.map(r => [r._id.toString(), r]));
    const comboMap = new Map();

    // 1. Gom nhóm từ các chuyến xe THỰC TẾ đã và đang chạy tính đến hiện tại
    for (const t of allTrips) {
      const rId = t.routeId?._id ? t.routeId._id.toString() : t.routeId?.toString();
      const route = routeMap.get(rId);
      if (!route) continue;

      const busType = t.busId?.type || 'Xe Ghế Ngồi';
      const key = `${rId}_${busType}`;

      if (!comboMap.has(key)) {
        const startStop = (route.stops && route.stops.find(s => s.type === 'start')?.name) || `Bến xe ${route.startPoint}`;
        const endStop = (route.stops && route.stops.find(s => s.type === 'end')?.name) || `Bến xe ${route.endPoint}`;
        const distanceMatch = (route.distance || '').replace(/\s+/g, '').match(/\d+/);
        const distanceKm = distanceMatch ? parseInt(distanceMatch[0], 10) : 200;

        comboMap.set(key, {
          routeId: route._id,
          routeName: `${route.startPoint} → ${route.endPoint}`,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          startStation: startStop,
          endStation: endStop,
          busType: busType,
          distance: route.distance || `${distanceKm} km`,
          duration: route.duration,
          distanceKm,
          trips: [],
        });
      }

      comboMap.get(key).trips.push(t);
    }

    // 2. Tính toán tỷ lệ lấp đầy thực tế từ bookings và chuyến xe tính đến hiện tại
    const combinations = [];
    for (const item of comboMap.values()) {
      if (!item.trips || item.trips.length === 0) continue;

      let totalBookedSeats = 0;
      let totalCapacity = 0;
      item.trips.forEach(t => {
        const tripBookings = allBookings.filter(b => b.tripId && (b.tripId._id ? b.tripId._id.toString() : b.tripId.toString()) === t._id.toString());
        const seatsFromBookings = tripBookings.reduce((sum, b) => sum + (Array.isArray(b.seats) ? b.seats.length : 0), 0);
        const bookedCount = seatsFromBookings > 0 ? seatsFromBookings : (Array.isArray(t.bookedSeats) ? t.bookedSeats.length : 0);
        const tripCap = t.busId?.totalSeats || t.busId?.capacity || 40;

        totalBookedSeats += bookedCount;
        totalCapacity += tripCap;
      });

      const occupancyRate = totalCapacity > 0 
        ? Math.min(100, Math.max(0, Math.round((totalBookedSeats / totalCapacity) * 100))) 
        : 0;

      const existingPrice = basePrices.find(
        bp => bp.routeId.toString() === item.routeId.toString() && bp.busType === item.busType
      );

      combinations.push({
        routeId: item.routeId,
        routeName: item.routeName,
        startPoint: item.startPoint,
        endPoint: item.endPoint,
        startStation: item.startStation,
        endStation: item.endStation,
        busType: item.busType,
        price: existingPrice ? existingPrice.price : null,
        distance: item.distance,
        duration: item.duration,
        tripsCount: item.trips.length,
        occupancyRate,
      });
    }

    // Sắp xếp theo số chuyến
    combinations.sort((a, b) => b.tripsCount - a.tripsCount);

    return combinations;
  }

  async getDemandAnalytics({ search, status, routeId } = {}) {
    const combinations = await this.getRealRoutesAnalytics();
    
    // Filter by search
    let filtered = combinations;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        item => item.routeName.toLowerCase().includes(q) || item.busType.toLowerCase().includes(q)
      );
    }

    if (routeId && routeId !== 'all') {
      filtered = filtered.filter(item => item.routeId.toString() === routeId);
    }

    // Tự động để Gemini AI phân tích hiệu suất và đề xuất hành động thông minh dạng LIST (bullet points)
    const { generateRouteOccupancyAiAnalysis } = require('./geminiService');
    const aiOccupancyResults = await generateRouteOccupancyAiAnalysis(filtered);
    const aiMap = new Map((aiOccupancyResults || []).map(r => [`${r.routeId}_${r.busType}`, r]));

    const analytics = filtered.map(item => {
      const key = `${item.routeId}_${item.busType}`;
      const aiEval = aiMap.get(key) || {};
      const occ = item.occupancyRate != null ? item.occupancyRate : 0;
      const isHigh = occ >= 80;
      const isLow = occ <= 45;

      const demandStatus = aiEval.demandStatus || (isHigh ? 'high' : isLow ? 'low' : 'normal');
      const actionBadge = aiEval.actionBadge || (isHigh ? 'Mở thêm chuyến cao điểm' : isLow ? 'Kích cầu vé' : 'Duy trì tần suất ổn định');
      const badgeColor = aiEval.badgeColor || (isHigh ? '#16a34a' : isLow ? '#dc2626' : '#2563eb');
      const aiSuggestions = aiEval.aiSuggestions && aiEval.aiSuggestions.length > 0
        ? aiEval.aiSuggestions
        : isHigh
        ? [
            `• Tuyến có hiệu suất lấp đầy cao (${occ}%).`,
            `• Mở thêm 1 - 2 chuyến tăng cường vào khung giờ 19:00 - 22:00.`,
            `• Xem xét áp dụng phụ thu cao điểm +10% để tối ưu lợi nhuận.`
          ]
        : isLow
        ? [
            `• Tỷ lệ lấp đầy hiện tại còn thấp (${occ}%).`,
            `• Phát hành mã Voucher kích cầu giảm 10% - 15% cho khách đặt sớm.`,
            `• Cân nhắc dồn khách hoặc đổi sang xe nhỏ hơn để tiết kiệm chi phí.`
          ]
        : [
            `• Lượng khách đặt vé ổn định (${occ}%).`,
            `• Giữ nguyên giá sàn và lịch chạy xe cố định hiện tại.`,
            `• Theo dõi sát nhu cầu vào các ngày cuối tuần.`
          ];

      return {
        ...item,
        demandStatus,
        actionBadge,
        badgeColor,
        aiSuggestions,
        aiActionTitle: `${actionBadge} (${occ}%)`,
        aiActionDetail: aiSuggestions.join(' ')
      };
    });

    if (status && status !== 'all') {
      filtered = analytics.filter(item => item.demandStatus === status);
    } else {
      filtered = analytics;
    }

    // Generate Top Strategic Action Cards for GM Dashboard Header
    const topHighDemand = analytics.filter(a => a.demandStatus === 'high');
    const topLowDemand = analytics.filter(a => a.demandStatus === 'low');

    const aiStrategicActions = [];

    if (topHighDemand.length > 0) {
      const topRoute = topHighDemand[0];
      aiStrategicActions.push({
        id: 'action-1',
        type: 'high_demand',
        badge: 'Tăng chuyến xe',
        badgeBg: '#dcfce7',
        badgeColor: '#15803d',
        title: `Nhu cầu tuyến ${topRoute.routeName} (${topRoute.busType}) tăng cao`,
        description: `Tỷ lệ lấp đầy ghế đạt ${topRoute.occupancyRate}%. Đề xuất tăng cường thêm chuyến vào khung giờ 20:00 - 22:30.`,
        suggestedAction: 'Phê duyệt tăng chuyến',
      });
    } else {
      aiStrategicActions.push({
        id: 'action-1',
        type: 'high_demand',
        badge: 'Tăng chuyến xe',
        badgeBg: '#dcfce7',
        badgeColor: '#15803d',
        title: 'Kế hoạch điều phối xe cuối tuần',
        description: 'Tỷ lệ lấp đầy ghế khung giờ tối thứ 6 đang tăng. Đề xuất sẵn sàng phương tiện Limousine tăng cường khi đạt trên 80%.',
        suggestedAction: 'Phê duyệt tăng chuyến',
      });
    }

    if (topLowDemand.length > 0) {
      const lowRoute = topLowDemand[0];
      aiStrategicActions.push({
        id: 'action-2',
        type: 'low_demand',
        badge: 'Kích cầu tiêu dùng',
        badgeBg: '#fef3c7',
        badgeColor: '#b45309',
        title: `Tỷ lệ ghế tuyến ${lowRoute.routeName} (${lowRoute.busType}) chỉ đạt ${lowRoute.occupancyRate}%`,
        description: `Khung giờ giữa tuần bị dư thừa chỗ. Đề xuất tự động áp dụng mã Voucher giảm 10% hoặc dồn ca xe để tiết kiệm chi phí nhiên liệu.`,
        suggestedAction: 'Kích hoạt Mã Khuyến Mãi',
      });
    } else {
      aiStrategicActions.push({
        id: 'action-2',
        type: 'low_demand',
        badge: 'Kích cầu tiêu dùng',
        badgeBg: '#fef3c7',
        badgeColor: '#b45309',
        title: 'Tuyến TP.HCM ➔ Cần Thơ chuyến 13:00 lấp đầy 38%',
        description: 'Khung giờ trưa có lượng khách đặt vé ít. Đề xuất phát hành mã Voucher giảm 10% vé để tăng tỷ lệ lấp đầy.',
        suggestedAction: 'Kích hoạt Mã Khuyến Mãi',
      });
    }

    aiStrategicActions.push({
      id: 'action-3',
      type: 'dynamic_pricing',
      badge: 'Điều chỉnh giá vé AI',
      badgeBg: '#eff6ff',
      badgeColor: '#1d4ed8',
      title: 'Tối ưu hóa doanh thu chuyến xe dịp Cuối Tuần',
      description: 'Hệ thống đề xuất điều chỉnh phụ thu +10% giá vé niêm yết cho các chuyến xuất phát sau 18h00 Thứ 6 và Chủ Nhật.',
      suggestedAction: 'Áp dụng Quy định Phụ thu',
    });

    return {
      analytics: filtered,
      aiStrategicActions,
    };
  }

  async setBasePrice(basePriceData) {
    const { routeId, routeName, busType, price } = basePriceData;
    return await basePriceRepository.findOneAndUpdate(
      { routeId, busType },
      { routeName, price: Number(price) },
      { new: true, upsert: true }
    );
  }

  async lookupPrice({ routeId, busId }) {
    const bus = await busRepository.findById(busId);
    if (!bus) {
      const err = new Error('Không tìm thấy phương tiện.');
      err.statusCode = 404;
      throw err;
    }

    const busType = bus.type;
    const basePriceRecord = await basePriceRepository.findOne({ routeId, busType });

    if (!basePriceRecord) {
      return null;
    }

    return basePriceRecord.price;
  }
}

module.exports = new PricingService();
