const MaintenanceRecord = require('../models/MaintenanceRecord');

class MaintenanceRepository {
  async find(query = {}, sortField = { createdAt: -1 }) {
    return await MaintenanceRecord.find(query).sort(sortField);
  }

  async create(recordData) {
    return await MaintenanceRecord.create(recordData);
  }
}

module.exports = new MaintenanceRepository();
