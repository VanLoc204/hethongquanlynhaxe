const Maintenance = require('../models/Maintenance');

class MaintenanceRepository {
  async find(query = {}, sortField = { createdAt: -1 }) {
    return await Maintenance.find(query).populate('busId', 'plateNumber type totalSeats').sort(sortField);
  }

  async findById(id) {
    return await Maintenance.findById(id).populate('busId', 'plateNumber type totalSeats');
  }

  async create(recordData) {
    const record = await Maintenance.create(recordData);
    return await record.populate('busId', 'plateNumber type totalSeats');
  }

  async findByIdAndUpdate(id, updateData, options = { new: true }) {
    return await Maintenance.findByIdAndUpdate(id, updateData, options).populate('busId', 'plateNumber type totalSeats');
  }
}

module.exports = new MaintenanceRepository();
