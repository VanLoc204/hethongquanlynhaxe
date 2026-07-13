const Booking = require('../models/Booking');

class BookingRepository {
  async find(query) {
    return await Booking.find(query);
  }

  async findOne(query) {
    return await Booking.findOne(query);
  }

  async findById(id) {
    return await Booking.findById(id);
  }

  async create(bookingData) {
    return await Booking.create(bookingData);
  }

  async save(bookingInstance) {
    return await bookingInstance.save();
  }

  async countDocuments(query) {
    return await Booking.countDocuments(query);
  }
}

module.exports = new BookingRepository();
