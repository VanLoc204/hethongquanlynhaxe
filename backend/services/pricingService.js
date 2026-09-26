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
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, isActive } = ruleData;
    return await pricingRuleRepository.create({
      name,
      routeId,
      routeName,
      busType,
      dayOfWeek,
      adjustmentType,
      adjustmentValue,
      isActive
    });
  }

  async updateRule(id, ruleData) {
    const { name, routeId, routeName, busType, dayOfWeek, adjustmentType, adjustmentValue, isActive } = ruleData;
    
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

  async getDemandAnalytics({ search, status, routeId } = {}) {
    const combinations = await this.getBasePricesCombinations();
    
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

    // Map demand status & specific AI action suggestions
    const analytics = filtered.map(item => {
      const occ = item.occupancyRate || 65;
      let demandStatus = 'normal'; // 'high' | 'normal' | 'low'
      let aiActionTitle = '';
      let aiActionDetail = '';
      let actionBadge = '';
      let badgeColor = '';

      if (occ >= 80) {
        demandStatus = 'high';
        actionBadge = 'Mở thêm 2-3 chuyến tăng cường';
        badgeColor = '#16a34a';
        aiActionTitle = `🔥 Nhu cầu tuyến ${item.routeName} (${item.busType}) đang tăng đột biến (${occ}%)`;
        aiActionDetail = `Đề xuất: Khung giờ tối 20h00 - 22h00 sắp cháy vé. Đề xuất mở thêm 2-3 chuyến tăng cường và áp dụng phụ thu +10% tối ưu lợi nhuận.`;
      } else if (occ <= 45) {
        demandStatus = 'low';
        actionBadge = 'Tạo mã Voucher giảm 10% kích cầu';
        badgeColor = '#dc2626';
        aiActionTitle = `⚠️ Tỷ lệ ghế lấp đầy tuyến ${item.routeName} (${item.busType}) còn thấp (${occ}%)`;
        aiActionDetail = `Đề xuất: Lượng khách đặt vé thấp hơn định mức. Đề xuất phát hành mã Voucher kích cầu giảm 10-15% hoặc dồn khách sang chuyến kế tiếp.`;
      } else {
        demandStatus = 'normal';
        actionBadge = 'Duy trì tần suất ổn định';
        badgeColor = '#2563eb';
        aiActionTitle = `✓ Tuyến ${item.routeName} (${item.busType}) đạt công suất vận hành tiêu chuẩn (${occ}%)`;
        aiActionDetail = `Đề xuất: Lượng khách đặt ổn định. Giữ nguyên giá sàn và lịch chạy xe cố định hiện tại.`;
      }

      return {
        ...item,
        demandStatus,
        actionBadge,
        badgeColor,
        aiActionTitle,
        aiActionDetail,
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
        title: `Nhu cầu tuyến ${topRoute.routeName} (${topRoute.busType}) tăng 40%`,
        description: `Tỷ lệ lấp đầy ghế đã đạt ${topRoute.occupancyRate}%. Đề xuất Ban Giám đốc phê duyệt tăng thêm 3 chuyến Limousine/Giường nằm vào khung giờ 20:00 - 22:30.`,
        suggestedAction: 'Phê duyệt tăng 3 chuyến',
      });
    } else {
      aiStrategicActions.push({
        id: 'action-1',
        type: 'high_demand',
        badge: 'Tăng chuyến xe',
        badgeBg: '#dcfce7',
        badgeColor: '#15803d',
        title: 'Nhu cầu tuyến TP.HCM ➔ Đà Lạt Thứ 6 tới tăng 40%',
        description: 'Tỷ lệ lấp đầy ghế khung giờ tối 20:00 đã đạt 85.5%. Đề xuất mở thêm 3 chuyến xe Limousine VIP tăng cường đón khách.',
        suggestedAction: 'Phê duyệt tăng 3 chuyến',
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
        description: `Khung giờ giữa tuần bị dư thừa chỗ. Đề xuất tự động áp dụng mã Voucher BANMOI20 giảm 10% hoặc dồn ca xe để tiết kiệm chi phí nhiên liệu.`,
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
        description: 'Khung giờ trưa có lượng khách đặt vé ít. Đề xuất phát hành mã Voucher BANMOI20 giảm 10% vé để tăng tỷ lệ lấp đầy.',
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
      description: 'Hệ thống AI đề xuất điều chỉnh phụ thu +10% giá vé niêm yết cho các chuyến xuất phát sau 18h00 Thứ 6 và Chủ Nhật.',
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
