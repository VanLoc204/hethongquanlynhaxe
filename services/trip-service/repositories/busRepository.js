const Bus = require('../models/Bus');

class BusRepository {
  async find(query = {}, sortField = { createdAt: -1 }) {
    return await Bus.find(query).sort(sortField);
  }

  async findOne(query) {
    return await Bus.findOne(query);
  }

  async findById(id) {
    return await Bus.findById(id);
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
}

module.exports = new BusRepository();
