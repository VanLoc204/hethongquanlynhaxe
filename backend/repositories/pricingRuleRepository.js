const PricingRule = require('../models/PricingRule');

class PricingRuleRepository {
  async find(query = {}) {
    return await PricingRule.find(query);
  }

  async findById(id) {
    return await PricingRule.findById(id);
  }

  async create(ruleData) {
    return await PricingRule.create(ruleData);
  }

  async save(ruleInstance) {
    return await ruleInstance.save();
  }

  async delete(ruleInstance) {
    return await ruleInstance.deleteOne();
  }
}

module.exports = new PricingRuleRepository();
