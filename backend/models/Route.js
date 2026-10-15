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
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    stops: [
      {
        name: { type: String, required: true },
        address: { type: String, default: '' },
        type: { 
          type: String, 
          enum: ['start', 'waypoint', 'end', 'pickup', 'dropoff', 'both', 'rest'], 
          default: 'pickup' 
        },
        lat: { type: Number },
        lng: { type: Number },
        arrivalTimeOffset: { type: Number, default: 0 }
      }
    ]
  },
  {
    timestamps: true
  }
);

routeSchema.index({ startPoint: 1, endPoint: 1 });

module.exports = mongoose.model('Route', routeSchema);
