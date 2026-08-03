const Shipment = require('../models/Shipment');

class ShipmentRepository {
  async findOne(query) {
    return await Shipment.findOne(query);
  }

  async findById(id) {
    return await Shipment.findById(id);
  }

  async create(shipmentData) {
    return await Shipment.create(shipmentData);
  }

  async save(shipmentInstance) {
    return await shipmentInstance.save();
  }
}

module.exports = new ShipmentRepository();
