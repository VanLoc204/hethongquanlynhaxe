const Bus = require('../models/Bus');

class BusRepository {
  async findById(id) {
    return await Bus.findById(id);
  }

  async distinct(field) {
    return await Bus.distinct(field);
  }
}

module.exports = new BusRepository();
