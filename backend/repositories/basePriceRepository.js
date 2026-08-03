const BasePrice = require('../models/BasePrice');

class BasePriceRepository {
  async find(query = {}) {
    return await BasePrice.find(query);
  }

  async findOne(query) {
    return await BasePrice.findOne(query);
  }

  async findOneAndUpdate(query, updateData, options) {
    return await BasePrice.findOneAndUpdate(query, updateData, options);
  }
}

module.exports = new BasePriceRepository();
