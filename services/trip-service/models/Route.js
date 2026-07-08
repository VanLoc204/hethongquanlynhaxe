const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    startPoint: {
      type: String,
      required: [true, 'Điểm đi là bắt buộc.']
    },
    endPoint: {
      type: String,
      required: [true, 'Điểm đến là bắt buộc.']
    },
    distance: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Route', routeSchema);
