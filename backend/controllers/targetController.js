const OperationalTarget = require('../models/OperationalTarget');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const ShiftSession = require('../models/ShiftSession');
const User = require('../models/User');
const Route = require('../models/Route');
const { BRANCHES, getBranchById, detectBranchFromLocation } = require('../constants/branches');

// Helper to determine branch of a trip from its route start point
function getTripBranch(trip) {
  if (trip.routeId && trip.routeId.startPoint) {
    return detectBranchFromLocation(trip.routeId.startPoint);
  }
  return 'sg';
}

// @desc    Get targets and real operational data comparison with branch filtering & ticket agent performance
// @route   GET /api/v1/targets
// @access  Private (General Manager, Admin)
exports.getTargets = async (req, res) => {
  try {
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const branchFilter = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : 'all';

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
      return res.status(400).json({ success: false, message: 'Tháng hoặc năm không hợp lệ.' });
    }

    // 1. Fetch saved target from MongoDB or create default target if not existing
    let target = await OperationalTarget.findOne({ month, year }).lean();

    if (!target) {
      target = await OperationalTarget.create({
        month,
        year,
        revenueTarget: 1000000000,       // 1 Billion VND
        occupancyTarget: 80,             // 80%
        counterTarget: 600000000,        // 600 Million VND counter sales
        onlineTarget: 400000000,         // 400 Million VND online sales
        branchTargets: [
          { branchId: 'sg', target: 500000000 },
          { branchId: 'dl', target: 300000000 },
          { branchId: 'ct', target: 200000000 }
        ],
        fuelBudget: 150000000,
        maintenanceBudget: 50000000,
        otherBudget: 30000000,
        notes: `Chỉ tiêu vận hành tự động thiết lập cho Tháng ${String(month).padStart(2, '0')}/${year}`,
        createdBy: req.user.id
      });
      target = target.toObject();
    }

    // Ensure branchTargets are initialized if missing in old records
    if (!target.branchTargets || target.branchTargets.length === 0) {
      const baseRev = target.revenueTarget || 1000000000;
      target.branchTargets = [
        { branchId: 'sg', target: Math.round(baseRev * 0.5) },
        { branchId: 'dl', target: Math.round(baseRev * 0.3) },
        { branchId: 'ct', target: Math.round(baseRev * 0.2) }
      ];
    }
    if (!target.counterTarget) target.counterTarget = Math.round((target.revenueTarget || 1000000000) * 0.6);
    if (!target.onlineTarget) target.onlineTarget = Math.round((target.revenueTarget || 1000000000) * 0.4);

    // 2. Query date bounds for the selected month
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 3. Query all trips in the month with Route and Bus populated
    const trips = await Trip.find({
      departureTime: { $gte: startDate, $lte: endDate }
    }).populate('routeId').populate('busId').lean();

    // 4. Query ShiftSessions in the month
    const shiftSessions = await ShiftSession.find({
      $or: [
        { startTime: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    }).populate('userId', 'name role email phone branch').lean();

    // Map ticket IDs that were sold at counter shifts
    const counterBookingIdsSet = new Set();
    shiftSessions.forEach(s => {
      if (Array.isArray(s.ticketsSold)) {
        s.ticketsSold.forEach(tId => {
          if (tId) counterBookingIdsSet.add(tId.toString());
        });
      }
    });

    // 5. Query valid bookings for trips or created in this month
    const tripIds = trips.map(t => t._id);
    const validBookings = await Booking.find({
      status: { $in: ['paid', 'confirmed'] },
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { tripId: { $in: tripIds } }
      ]
    }).populate({
      path: 'tripId',
      populate: { path: 'routeId' }
    }).lean();

    // 6. Query ticket managers & agents
    const branchStaff = await User.find({
      role: { $in: ['ticket_manager', 'ticket_agent'] },
      status: 'active'
    }).select('name role email phone branch').lean();

    const branchManagersMap = {};
    const ticketAgents = [];

    branchStaff.forEach(u => {
      const bId = u.branch?.branchId || 'sg';
      if (u.role === 'ticket_manager') {
        branchManagersMap[bId] = u;
      } else if (u.role === 'ticket_agent') {
        ticketAgents.push(u);
      }
    });

    // 7. Calculate Breakdown per Branch
    const branchBreakdown = BRANCHES.map(b => {
      const bId = b.branchId;
      const manager = branchManagersMap[bId] || { name: 'Chưa chỉ định', phone: 'N/A' };
      const targetObj = target.branchTargets.find(bt => bt.branchId === bId);
      const branchTargetAmount = targetObj ? targetObj.target : 0;

      // Filter trips departing from this branch
      const branchTrips = trips.filter(t => getTripBranch(t) === bId);
      let branchSeatsPossible = 0;
      let branchSeatsBooked = 0;
      let branchTripRev = 0;

      branchTrips.forEach(t => {
        const capacity = t.busId?.totalSeats || 40;
        const booked = t.bookedSeats ? t.bookedSeats.length : 0;
        branchSeatsPossible += capacity;
        branchSeatsBooked += booked;
        branchTripRev += (t.price || 0) * booked;
      });

      const branchOccupancy = branchSeatsPossible > 0
        ? Number(((branchSeatsBooked / branchSeatsPossible) * 100).toFixed(1))
        : 0;

      // Shifts & counter revenue for this branch
      const branchShifts = shiftSessions.filter(s => {
        if (s.branchId === bId) return true;
        if (s.userId?.branch?.branchId === bId) return true;
        return false;
      });

      let branchCounterRev = 0;
      let branchCounterTickets = 0;
      branchShifts.forEach(s => {
        branchCounterRev += (s.cashRevenue || 0) + (s.cashlessRevenue || 0);
        branchCounterTickets += (s.ticketsSold ? s.ticketsSold.length : 0);
      });

      // Online bookings for this branch
      let branchOnlineRev = 0;
      let branchOnlineTickets = 0;

      validBookings.forEach(b => {
        const isCounter = counterBookingIdsSet.has(b._id.toString()) || b.customerCCCD === 'COUNTER_BOOKING';
        const tripOriginBranch = b.tripId ? getTripBranch(b.tripId) : 'sg';

        if (tripOriginBranch === bId) {
          const seatCount = Array.isArray(b.seats) ? b.seats.length : 0;
          const price = b.pricePerSeat || b.tripId?.price || 0;
          const bookingAmount = b.totalAmount || (price * seatCount);

          if (!isCounter) {
            branchOnlineRev += bookingAmount;
            branchOnlineTickets += seatCount;
          }
        }
      });

      // Total branch actual revenue
      const branchActualRev = branchCounterRev + branchOnlineRev > 0 
        ? branchCounterRev + branchOnlineRev 
        : branchTripRev;

      const branchProgress = branchTargetAmount > 0
        ? Number(((branchActualRev / branchTargetAmount) * 100).toFixed(1))
        : 0;

      const agentsCount = ticketAgents.filter(a => (a.branch?.branchId || 'sg') === bId).length;

      return {
        branchId: bId,
        branchName: b.branchName,
        managerName: manager.name,
        managerPhone: manager.phone,
        target: branchTargetAmount,
        actualRevenue: branchActualRev,
        counterRevenue: branchCounterRev,
        onlineRevenue: branchOnlineRev,
        revenueProgress: branchProgress,
        totalTrips: branchTrips.length,
        totalSeatsBooked: branchSeatsBooked,
        totalSeatsPossible: branchSeatsPossible,
        occupancyRate: branchOccupancy,
        ticketsSold: branchCounterTickets + branchOnlineTickets,
        staffCount: agentsCount
      };
    });

    // 8. Calculate Ticket Agent Performance List
    // Find active shift sessions currently open
    const currentActiveShifts = await ShiftSession.find({ status: 'active' }).lean();
    const activeShiftUserMap = {};
    currentActiveShifts.forEach(s => {
      activeShiftUserMap[s.userId.toString()] = s;
    });

    const staffPerformance = ticketAgents
      .filter(agent => {
        if (branchFilter === 'all') return true;
        return (agent.branch?.branchId || 'sg') === branchFilter;
      })
      .map(agent => {
        const agentIdStr = agent._id.toString();
        const agentShifts = shiftSessions.filter(s => s.userId && (s.userId._id?.toString() === agentIdStr || s.userId.toString() === agentIdStr));

        let agentCash = 0;
        let agentCashless = 0;
        let agentTicketsCount = 0;
        let lastShiftDate = null;

        agentShifts.forEach(s => {
          agentCash += (s.cashRevenue || 0);
          agentCashless += (s.cashlessRevenue || 0);
          agentTicketsCount += (s.ticketsSold ? s.ticketsSold.length : 0);
          if (!lastShiftDate || new Date(s.startTime) > new Date(lastShiftDate)) {
            lastShiftDate = s.startTime;
          }
        });

        const activeShift = activeShiftUserMap[agentIdStr];
        const shiftStatus = activeShift ? 'active' : (agentShifts.length > 0 ? 'closed' : 'none');
        const assignedOffices = agent.branch?.assignedOffices || [];
        const primaryOffice = assignedOffices[0] || (activeShift ? activeShift.officeName : 'Văn phòng chính');

        return {
          id: agent._id,
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          branchId: agent.branch?.branchId || 'sg',
          branchName: agent.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh',
          office: primaryOffice,
          ticketsSold: agentTicketsCount,
          cashRevenue: agentCash,
          cashlessRevenue: agentCashless,
          totalRevenue: agentCash + agentCashless,
          shiftStatus,
          activeOffice: activeShift?.officeName || null,
          lastShiftDate
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 9. Aggregate Totals based on branchFilter
    let actualRevenue = 0;
    let actualCounterRevenue = 0;
    let actualOnlineRevenue = 0;
    let totalSeatsBooked = 0;
    let totalSeatsPossible = 0;
    let totalTrips = 0;
    let effectiveRevenueTarget = target.revenueTarget;
    let effectiveOccupancyTarget = target.occupancyTarget;

    if (branchFilter === 'all') {
      branchBreakdown.forEach(b => {
        actualRevenue += b.actualRevenue;
        actualCounterRevenue += b.counterRevenue;
        actualOnlineRevenue += b.onlineRevenue;
        totalSeatsBooked += b.totalSeatsBooked;
        totalSeatsPossible += b.totalSeatsPossible;
        totalTrips += b.totalTrips;
      });
      effectiveRevenueTarget = target.revenueTarget;
    } else {
      const selectedBranch = branchBreakdown.find(b => b.branchId === branchFilter);
      if (selectedBranch) {
        actualRevenue = selectedBranch.actualRevenue;
        actualCounterRevenue = selectedBranch.counterRevenue;
        actualOnlineRevenue = selectedBranch.onlineRevenue;
        totalSeatsBooked = selectedBranch.totalSeatsBooked;
        totalSeatsPossible = selectedBranch.totalSeatsPossible;
        totalTrips = selectedBranch.totalTrips;
        effectiveRevenueTarget = selectedBranch.target;
      }
    }

    const actualOccupancy = totalSeatsPossible > 0
      ? Number(((totalSeatsBooked / totalSeatsPossible) * 100).toFixed(1))
      : 0;

    const revenueProgress = effectiveRevenueTarget > 0
      ? Number(((actualRevenue / effectiveRevenueTarget) * 100).toFixed(1))
      : 0;

    const occupancyProgress = effectiveOccupancyTarget > 0
      ? Number(((actualOccupancy / effectiveOccupancyTarget) * 100).toFixed(1))
      : 0;

    const counterSharePercent = actualRevenue > 0
      ? Number(((actualCounterRevenue / actualRevenue) * 100).toFixed(1))
      : 0;

    const onlineSharePercent = actualRevenue > 0
      ? Number(((actualOnlineRevenue / actualRevenue) * 100).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      branchFilter,
      month,
      year,
      target: {
        ...target,
        effectiveRevenueTarget,
        effectiveOccupancyTarget
      },
      actual: {
        actualRevenue,
        actualCounterRevenue,
        actualOnlineRevenue,
        counterSharePercent,
        onlineSharePercent,
        actualOccupancy,
        totalTrips,
        totalSeatsBooked,
        totalSeatsPossible
      },
      progress: {
        revenueProgress,
        occupancyProgress
      },
      branchBreakdown,
      staffPerformance,
      branchesList: BRANCHES.map(b => ({ branchId: b.branchId, branchName: b.branchName }))
    });
  } catch (error) {
    console.error('Loi lay chi tieu & phan tich chi nhanh:', error);
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
      counterTarget,
      onlineTarget,
      branchTargets,
      notes
    } = req.body;

    if (!month || !year || !revenueTarget || !occupancyTarget) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các con số chỉ tiêu bắt buộc.' });
    }

    const revTargetNum = Number(revenueTarget);
    const occTargetNum = Number(occupancyTarget);
    const counterTargetNum = counterTarget ? Number(counterTarget) : Math.round(revTargetNum * 0.6);
    const onlineTargetNum = onlineTarget ? Number(onlineTarget) : Math.round(revTargetNum * 0.4);

    let finalBranchTargets = branchTargets;
    if (!Array.isArray(finalBranchTargets) || finalBranchTargets.length === 0) {
      finalBranchTargets = [
        { branchId: 'sg', target: Math.round(revTargetNum * 0.5) },
        { branchId: 'dl', target: Math.round(revTargetNum * 0.3) },
        { branchId: 'ct', target: Math.round(revTargetNum * 0.2) }
      ];
    }

    const target = await OperationalTarget.findOneAndUpdate(
      { month: Number(month), year: Number(year) },
      {
        revenueTarget: revTargetNum,
        occupancyTarget: occTargetNum,
        counterTarget: counterTargetNum,
        onlineTarget: onlineTargetNum,
        branchTargets: finalBranchTargets,
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
    console.error('Loi luu chi tieu van hanh:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lưu chỉ tiêu vận hành.' });
  }
};

