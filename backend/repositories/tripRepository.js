const Trip = require('../models/Trip');

class TripRepository {
  async find(query) {
    return await Trip.find(query);
  }

  async findOne(query) {
    return await Trip.findOne(query);
  }

  async findWithPopulate(query, sortField = { departureTime: 1 }) {
    return await Trip.find(query)
      .populate('routeId')
      .populate('busId')
      .sort(sortField);
  }

  async findById(id) {
    return await Trip.findById(id);
  }

  async findByIdWithPopulate(id) {
    return await Trip.findById(id)
      .populate('routeId')
      .populate('busId');
  }

  async create(tripData) {
    return await Trip.create(tripData);
  }

  async save(tripInstance) {
    return await tripInstance.save();
  }

  async delete(tripInstance) {
    return await tripInstance.deleteOne();
  }

  async countDocuments(query) {
    return await Trip.countDocuments(query);
  }

  async distinct(field, query) {
    return await Trip.find(query).distinct(field);
  }
}

module.exports = new TripRepository();
