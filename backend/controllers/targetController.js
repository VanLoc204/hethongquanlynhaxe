const OperationalTarget = require('../models/OperationalTarget');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Shipment = require('../models/Shipment');
const Payroll = require('../models/Payroll');

// @desc    Get targets and real operational data comparison for a specific month and year
// @route   GET /api/v1/targets
// @access  Private (General Manager, Admin)
exports.getTargets = async (req, res) => {
  try {
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
      return res.status(400).json({ success: false, message: 'Tháng hoặc năm không hợp lệ.' });
    }

    // 1. Fetch saved target from MongoDB or create default target if not existing
    let target = await OperationalTarget.findOne({ month, year }).lean();

    if (!target) {
      target = await OperationalTarget.create({
        month,
        year,
        revenueTarget: 1000000000, // 1 Billion VND
        occupancyTarget: 80,       // 80%
        fuelBudget: 150000000,     // 150 Million VND
        maintenanceBudget: 50000000,// 50 Million VND
        otherBudget: 30000000,
        notes: `Chỉ tiêu vận hành tự động thiết lập cho Tháng ${String(month).padStart(2, '0')}/${year}`,
        createdBy: req.user.id
      });
      target = target.toObject();
    }

    // 2. Compute 100% Real Actual Operational Data strictly from MongoDB Collections
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Real Trips & Occupancy: Compute average seat fill rate across trips in the month
    const trips = await Trip.find({
      departureTime: { $gte: startDate, $lte: endDate }
    }).populate('busId').lean();

    let totalSeatsPossible = 0;
    let totalSeatsBooked = 0;

    trips.forEach(t => {
      const busSeats = t.busId?.totalSeats || 40;
      const bookedCount = t.bookedSeats ? t.bookedSeats.length : 0;
      totalSeatsPossible += busSeats;
      totalSeatsBooked += bookedCount;
    });

    const actualOccupancy = totalSeatsPossible > 0 
      ? Number(((totalSeatsBooked / totalSeatsPossible) * 100).toFixed(1)) 
      : 0;

    // Real Ticket Booking Revenue: Sum of valid bookings for trips or created in the month
    const validBookings = await Booking.find({
      status: { $in: ['paid', 'confirmed'] },
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { tripId: { $in: trips.map(t => t._id) } }
      ]
    }).populate('tripId').lean();

    let ticketRevenue = 0;
    validBookings.forEach(b => {
      const seatCount = Array.isArray(b.seats) ? b.seats.length : 0;
      const tripPrice = b.tripId?.price || 0;
      ticketRevenue += (tripPrice * seatCount);
    });

    // Fallback: If bookings collection has direct trip bookedSeats sum
    if (ticketRevenue === 0 && totalSeatsBooked > 0) {
      trips.forEach(t => {
        const seatCount = t.bookedSeats ? t.bookedSeats.length : 0;
        const tripPrice = t.price || 0;
        ticketRevenue += (tripPrice * seatCount);
      });
    }

    // Real Cargo Shipment Revenue: Sum of paid shipments in the month
    const cargoShipments = await Shipment.find({
      paymentStatus: 'paid',
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('fee').lean();
    const cargoRevenue = cargoShipments.reduce((sum, s) => sum + (s.fee || 0), 0);

    // Total 100% Real Revenue from MongoDB
    const actualRevenue = ticketRevenue + cargoRevenue;

    // Real Maintenance Expenses: Sum costs from MaintenanceRecord collection in DB
    const maintenanceRecords = await MaintenanceRecord.find({
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    }).lean();

    // Separate fuel logs vs standard vehicle maintenance logs
    let actualFuel = 0;
    let actualMaintenance = 0;

    maintenanceRecords.forEach(rec => {
      const desc = (rec.description || '').toLowerCase();
      const garage = (rec.garage || '').toLowerCase();
      if (desc.includes('nhiên liệu') || desc.includes('xăng') || desc.includes('dầu') || desc.includes('fuel') || garage.includes('cây xăng') || garage.includes('trạm xăng')) {
        actualFuel += (rec.cost || 0);
      } else {
        actualMaintenance += (rec.cost || 0);
      }
    });

    // Real Other Expenses (Payroll): Sum from Payroll collection for this month/year
    const payrollRecords = await Payroll.find({ month, year, status: 'paid' }).lean();
    const actualOther = payrollRecords.reduce((sum, p) => sum + (p.netSalary || 0), 0);

    // Progress percentages calculated directly from real actuals vs DB targets
    const revenueProgress = target.revenueTarget > 0 ? Number(((actualRevenue / target.revenueTarget) * 100).toFixed(1)) : 0;
    const occupancyProgress = target.occupancyTarget > 0 ? Number(((actualOccupancy / target.occupancyTarget) * 100).toFixed(1)) : 0;
    const fuelUsagePercent = target.fuelBudget > 0 ? Number(((actualFuel / target.fuelBudget) * 100).toFixed(1)) : 0;
    const maintenanceUsagePercent = target.maintenanceBudget > 0 ? Number(((actualMaintenance / target.maintenanceBudget) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      target,
      actual: {
        actualRevenue,
        actualOccupancy,
        actualFuel,
        actualMaintenance,
        actualOther,
        totalTrips: trips.length,
        totalSeatsBooked,
        totalSeatsPossible
      },
      progress: {
        revenueProgress,
        occupancyProgress,
        fuelUsagePercent,
        maintenanceUsagePercent
      }
    });
  } catch (error) {
    console.error('Lỗi lấy chỉ tiêu & chi tiêu vận hành:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy chỉ tiêu vận hành.' });
  }
};

// @desc    Create or Update operational target for a specific month and year
// @route   POST /api/v1/targets
// @access  Private (General Manager, Admin)
exports.saveTarget = async (req, res) => {
  try {
    const {
      month,
      year,
      revenueTarget,
      occupancyTarget,
      fuelBudget,
      maintenanceBudget,
      otherBudget,
      notes
    } = req.body;

    if (!month || !year || !revenueTarget || !occupancyTarget || !fuelBudget || !maintenanceBudget) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các con số chỉ tiêu bắt buộc.' });
    }

    const target = await OperationalTarget.findOneAndUpdate(
      { month: Number(month), year: Number(year) },
      {
        revenueTarget: Number(revenueTarget),
        occupancyTarget: Number(occupancyTarget),
        fuelBudget: Number(fuelBudget),
        maintenanceBudget: Number(maintenanceBudget),
        otherBudget: Number(otherBudget) || 30000000,
        notes: notes || 'Chỉ tiêu vận hành định hướng kinh doanh tháng.',
        createdBy: req.user.id
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: `Đã lưu chỉ tiêu vận hành Tháng ${String(month).padStart(2, '0')}/${year} vào cơ sở dữ liệu MongoDB thành công!`,
      target
    });
  } catch (error) {
    console.error('Lỗi lưu chỉ tiêu vận hành:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lưu chỉ tiêu vận hành.' });
  }
};
