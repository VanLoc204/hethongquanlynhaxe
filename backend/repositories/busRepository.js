const Bus = require('../models/Bus');

class BusRepository {
  async find(query = {}, sortField = { createdAt: -1 }) {
    return await Bus.find(query).populate('currentMaintenance').sort(sortField);
  }

  async findOne(query) {
    return await Bus.findOne(query).populate('currentMaintenance');
  }

  async findById(id) {
    return await Bus.findById(id).populate('currentMaintenance');
  }

  async create(busData) {
    return await Bus.create(busData);
  }

  async save(busInstance) {
    return await busInstance.save();
  }

  async delete(busInstance) {
    return await busInstance.deleteOne();
  }

  async distinct(field) {
    return await Bus.distinct(field);
  }
}

module.exports = new BusRepository();
