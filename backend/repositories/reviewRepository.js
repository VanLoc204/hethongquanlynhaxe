const Review = require('../models/Review');

class ReviewRepository {
  async find(query, sortField = { createdAt: -1 }) {
    return await Review.find(query).sort(sortField);
  }
}

module.exports = new ReviewRepository();
