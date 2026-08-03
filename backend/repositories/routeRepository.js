const Route = require('../models/Route');

class RouteRepository {
  async find(query = {}, sortField = { createdAt: -1 }) {
    return await Route.find(query).sort(sortField);
  }

  async findOne(query) {
    return await Route.findOne(query);
  }

  async findById(id) {
    return await Route.findById(id);
  }

  async create(routeData) {
    return await Route.create(routeData);
  }

  async save(routeInstance) {
    return await routeInstance.save();
  }

  async delete(routeInstance) {
    return await routeInstance.deleteOne();
  }
}

module.exports = new RouteRepository();
