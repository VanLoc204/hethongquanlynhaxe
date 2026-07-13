const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    startPoint: {
      type: String,
      required: true
    },
    endPoint: {
      type: String,
      required: true
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
