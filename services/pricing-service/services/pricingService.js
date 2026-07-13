const pricingRuleRepository = require('../repositories/pricingRuleRepository');
const basePriceRepository = require('../repositories/basePriceRepository');
const routeRepository = require('../repositories/routeRepository');
const busRepository = require('../repositories/busRepository');

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

  async getBasePricesCombinations() {
    const routes = await routeRepository.find({});
    const busTypes = await busRepository.distinct('type');
    const basePrices = await basePriceRepository.find({});

    const combinations = [];
    for (const route of routes) {
      const routeName = `${route.startPoint} → ${route.endPoint}`;
      for (const busType of busTypes) {
        if (!busType) continue;
        const existing = basePrices.find(
          bp => bp.routeId.toString() === route._id.toString() && bp.busType === busType
        );
        combinations.push({
          routeId: route._id,
          routeName: routeName,
          busType: busType,
          price: existing ? existing.price : null,
          isSet: !!existing,
          basePriceId: existing ? existing._id : null
        });
      }
    }

    return combinations;
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
