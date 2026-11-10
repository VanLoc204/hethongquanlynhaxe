const mongoose = require('mongoose');

const monthlyFleetExpenseReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fleetManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    branchId: {
      type: String,
      default: 'sg',
      index: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    },
    summary: {
      totalExpenses: { type: Number, default: 0 },
      totalMaintenanceCost: { type: Number, default: 0 },
      maintenanceCount: { type: Number, default: 0 },
      totalDistanceKm: { type: Number, default: 0 },
      totalFuelLiters: { type: Number, default: 0 },
      fuelUnitPrice: { type: Number, default: 21500 },
      totalFuelCost: { type: Number, default: 0 },
      readyBusesCount: { type: Number, default: 0 },
      maintenanceBusesCount: { type: Number, default: 0 },
      availabilityRate: { type: Number, default: 100 }
    },
    busDetails: [
      {
        busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
        plateNumber: { type: String, required: true },
        busType: { type: String, default: '' },
        tripsCount: { type: Number, default: 0 },
        distanceKm: { type: Number, default: 0 },
        fuelLiters: { type: Number, default: 0 },
        fuelCost: { type: Number, default: 0 },
        maintenanceCost: { type: Number, default: 0 },
        maintCount: { type: Number, default: 0 },
        activeStatus: { type: String, default: 'ready' }
      }
    ],
    maintenanceRecords: [
      {
        recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceRecord' },
        plateNumber: { type: String, required: true },
        garage: { type: String, default: 'Garage Đối tác' },
        description: { type: String, default: '' },
        type: { type: String, default: 'maintenance' },
        cost: { type: Number, default: 0 },
        date: { type: Date, default: Date.now }
      }
    ],
    fleetManagerNotes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    directorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    directorNotes: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    digitalSignature: {
      isSigned: { type: Boolean, default: false },
      signerName: { type: String, default: '' },
      signedAt: { type: Date, default: null },
      certCode: { type: String, default: '' },
      hash: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

monthlyFleetExpenseReportSchema.index({ month: 1, year: 1, branchId: 1 });

module.exports = mongoose.model('MonthlyFleetExpenseReport', monthlyFleetExpenseReportSchema);

