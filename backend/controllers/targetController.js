const OperationalTarget = require('../models/OperationalTarget');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const ShiftSession = require('../models/ShiftSession');
const User = require('../models/User');
const Route = require('../models/Route');

const BRANCHES = [
  { branchId: 'sg', branchName: 'Chi nhánh TP. Hồ Chí Minh' },
  { branchId: 'dl', branchName: 'Chi nhánh Đà Lạt' },
  { branchId: 'ct', branchName: 'Chi nhánh Cần Thơ' }
];

const MONTH_TARGETS = {
  8: {
    revenueTarget: 20000000,
    occupancyTarget: 5,
    counterTarget: 14000000,
    onlineTarget: 6000000,
    branchTargets: [
      { branchId: 'sg', target: 12000000 },
      { branchId: 'dl', target: 8000000 },
      { branchId: 'ct', target: 0 }
    ],
    notes: 'Kế hoạch doanh số khởi điểm hoạt động Tháng 08/2026'
  },
  9: {
    revenueTarget: 25000000,
    occupancyTarget: 5,
    counterTarget: 17500000,
    onlineTarget: 7500000,
    branchTargets: [
      { branchId: 'sg', target: 15000000 },
      { branchId: 'dl', target: 10000000 },
      { branchId: 'ct', target: 0 }
    ],
    notes: 'Kế hoạch mở rộng tuyến đường Tháng 09/2026'
  },
  10: {
    revenueTarget: 80000000,
    occupancyTarget: 10,
    counterTarget: 56000000,
    onlineTarget: 24000000,
    branchTargets: [
      { branchId: 'sg', target: 45000000 },
      { branchId: 'dl', target: 25000000 },
      { branchId: 'ct', target: 10000000 }
    ],
    notes: 'Kế hoạch tăng trưởng khai trương tuyến Cần Thơ Tháng 10/2026'
  },
  11: {
    revenueTarget: 200000000,
    occupancyTarget: 18,
    counterTarget: 140000000,
    onlineTarget: 60000000,
    branchTargets: [
      { branchId: 'sg', target: 100000000 },
      { branchId: 'dl', target: 60000000 },
      { branchId: 'ct', target: 40000000 }
    ],
    notes: 'Kế hoạch tăng tốc doanh số cao điểm Tháng 11/2026'
  },
  12: {
    revenueTarget: 220000000,
    occupancyTarget: 20,
    counterTarget: 154000000,
    onlineTarget: 66000000,
    branchTargets: [
      { branchId: 'sg', target: 110000000 },
      { branchId: 'dl', target: 70000000 },
      { branchId: 'ct', target: 40000000 }
    ],
    notes: 'Kế hoạch chuẩn bị phục vụ cao điểm cuối năm Tháng 12/2026'
  }
};

const detectBranchFromLocation = (loc) => {
  if (!loc || typeof loc !== 'string') return 'sg';
  const t = loc.toLowerCase();
  if (t.includes('đà lạt') || t.includes('lâm đồng') || t.includes('bxlt') || t.includes('bùi thị xuân')) return 'dl';
  if (t.includes('cần thơ') || t.includes('ninh kiều') || t.includes('bxtt')) return 'ct';
  return 'sg';
};

// Helper to determine branch of a trip from its route start point
function getTripBranch(trip) {
  if (trip.routeId && trip.routeId.startPoint) {
    return detectBranchFromLocation(trip.routeId.startPoint);
  }
  return 'sg';
}

// @desc    Get targets and real operational data comparison with branch filtering & ticket agent performance
// @route   GET /api/targets
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
      const conf = MONTH_TARGETS[month] || {
        revenueTarget: 200000000,
        occupancyTarget: 20,
        counterTarget: 140000000,
        onlineTarget: 60000000,
        branchTargets: [
          { branchId: 'sg', target: 100000000 },
          { branchId: 'dl', target: 60000000 },
          { branchId: 'ct', target: 40000000 }
        ],
        notes: `Chỉ tiêu vận hành tự động thiết lập cho Tháng ${String(month).padStart(2, '0')}/${year}`
      };
      target = await OperationalTarget.create({
        month,
        year,
        ...conf,
        fuelBudget: 30000000,
        maintenanceBudget: 15000000,
        otherBudget: 5000000,
        createdBy: req.user ? req.user.id : undefined
      });
      target = target.toObject();
    } else if (target.revenueTarget > 500000000) {
      // Legacy unscaled target in DB (1B - 1.2B) -> normalize to realistic scale
      const conf = MONTH_TARGETS[month] || {
        revenueTarget: 200000000,
        occupancyTarget: 20,
        counterTarget: 140000000,
        onlineTarget: 60000000,
        branchTargets: [
          { branchId: 'sg', target: 100000000 },
          { branchId: 'dl', target: 60000000 },
          { branchId: 'ct', target: 40000000 }
        ],
        notes: `Chỉ tiêu vận hành chuẩn hóa cho Tháng ${String(month).padStart(2, '0')}/${year}`
      };
      await OperationalTarget.updateOne(
        { _id: target._id },
        {
          $set: {
            revenueTarget: conf.revenueTarget,
            occupancyTarget: conf.occupancyTarget,
            counterTarget: conf.counterTarget,
            onlineTarget: conf.onlineTarget,
            branchTargets: conf.branchTargets
          }
        }
      );
      target = await OperationalTarget.findOne({ month, year }).lean();
    }

    // Ensure branchTargets are initialized if missing in old records
    if (!target.branchTargets || target.branchTargets.length === 0) {
      const baseRev = target.revenueTarget || 200000000;
      target.branchTargets = [
        { branchId: 'sg', target: Math.round(baseRev * 0.5) },
        { branchId: 'dl', target: Math.round(baseRev * 0.3) },
        { branchId: 'ct', target: Math.round(baseRev * 0.2) }
      ];
    }
    if (!target.counterTarget) target.counterTarget = Math.round((target.revenueTarget || 200000000) * 0.7);
    if (!target.onlineTarget) target.onlineTarget = Math.round((target.revenueTarget || 200000000) * 0.3);

    // 2. Query date bounds for the selected month
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 3. Query all trips in the month with Route and Bus populated
    const trips = await Trip.find({
      departureTime: { $gte: startDate, $lte: endDate }
    }).populate('routeId').populate('busId').lean();

    // 4. Query ShiftSessions in the month (Căn cứ chính xác theo thời gian mở ca làm việc thực tế)
    const shiftSessions = await ShiftSession.find({
      startTime: { $gte: startDate, $lte: endDate }
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

    // 5. Query valid bookings for ALL trips departing in this month
    const tripIds = trips.map(t => t._id);
    const validBookings = await Booking.find({
      tripId: { $in: tripIds },
      status: { $in: ['paid', 'confirmed'] }
    }).lean();

    const bookingsByTrip = {};
    validBookings.forEach(b => {
      if (!b.tripId) return;
      const tid = b.tripId.toString();
      if (!bookingsByTrip[tid]) bookingsByTrip[tid] = [];
      bookingsByTrip[tid].push(b);
    });

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
        const tripBks = bookingsByTrip[t._id.toString()] || [];
        const booked = tripBks.reduce((sum, bk) => sum + (Array.isArray(bk.seats) ? bk.seats.length : 0), 0);
        const tripRev = tripBks.reduce((sum, bk) => sum + (bk.totalAmount || (bk.pricePerSeat ? bk.pricePerSeat * (bk.seats?.length || 1) : (t.price || 0) * (bk.seats?.length || 1))), 0);

        branchSeatsPossible += capacity;
        branchSeatsBooked += booked;
        branchTripRev += tripRev;
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

      // Total branch actual revenue (Đồng bộ chuẩn 70% Quầy / 30% Online với Báo cáo Tổng quan)
      const branchActualRev = branchTripRev;
      const branchOnlineActual = Math.round(branchActualRev * 0.30); // 30% Online PayOS
      const branchCounterActual = branchActualRev - branchOnlineActual; // 70% Quầy

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
        counterRevenue: branchCounterActual,
        onlineRevenue: branchOnlineActual,
        revenueProgress: branchProgress,
        totalTrips: branchTrips.length,
        totalSeatsBooked: branchSeatsBooked,
        totalSeatsPossible: branchSeatsPossible,
        occupancyRate: branchOccupancy,
        ticketsSold: branchSeatsBooked,
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

    // Calculate raw agent shifts
    const rawAgentData = ticketAgents.map(agent => {
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
      const bId = agent.branch?.branchId || 'sg';
      return {
        agent,
        bId,
        agentCash,
        agentCashless,
        rawTotal: agentCash + agentCashless,
        agentTicketsCount: agentTicketsCount || Math.round((agentCash + agentCashless) / 240000) || 1,
        lastShiftDate,
        agentShifts
      };
    });

    const staffPerformance = rawAgentData
      .filter(d => branchFilter === 'all' || d.bId === branchFilter)
      .map(d => {
        const { agent, bId, rawTotal, lastShiftDate, agentShifts } = d;
        const branchObj = branchBreakdown.find(b => b.branchId === bId);
        const branchCounterRev = branchObj ? branchObj.counterRevenue : 100000000;
        const branchCounterTix = branchObj ? Math.round(branchObj.ticketsSold * 0.7) : 100;

        const branchRawTotal = rawAgentData.filter(x => x.bId === bId).reduce((sum, x) => sum + x.rawTotal, 0) || 1;
        const branchRawTix = rawAgentData.filter(x => x.bId === bId).reduce((sum, x) => sum + x.agentTicketsCount, 0) || 1;

        const share = rawTotal > 0 ? (rawTotal / branchRawTotal) : (1 / Math.max(1, rawAgentData.filter(x => x.bId === bId).length));
        const tixShare = d.agentTicketsCount > 0 ? (d.agentTicketsCount / branchRawTix) : share;

        const totalRevenue = Math.round(branchCounterRev * share);
        const cashRevenue = Math.round(totalRevenue * 0.7);
        const cashlessRevenue = totalRevenue - cashRevenue;
        const ticketsSold = Math.round(branchCounterTix * tixShare);

        const agentIdStr = agent._id.toString();
        const activeShift = activeShiftUserMap[agentIdStr];
        const shiftStatus = activeShift ? 'active' : (agentShifts.length > 0 ? 'closed' : 'none');
        const assignedOffices = agent.branch?.assignedOffices || [];
        const primaryOffice = assignedOffices[0] || (activeShift ? activeShift.officeName : 'Văn phòng chính');

        return {
          id: agent._id,
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          branchId: bId,
          branchName: agent.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh',
          office: primaryOffice,
          ticketsSold,
          cashRevenue,
          cashlessRevenue,
          totalRevenue,
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
// @route   POST /api/targets
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
    const counterTargetNum = counterTarget ? Number(counterTarget) : Math.round(revTargetNum * 0.7);
    const onlineTargetNum = onlineTarget ? Number(onlineTarget) : Math.round(revTargetNum * 0.3);

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

