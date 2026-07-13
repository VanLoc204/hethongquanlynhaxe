const Route = require('../models/Route');

class RouteRepository {
  async find(query = {}, sortField = { startPoint: 1, endPoint: 1 }) {
    return await Route.find(query).sort(sortField);
  }
}

module.exports = new RouteRepository();
