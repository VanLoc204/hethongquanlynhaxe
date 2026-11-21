const crypto = require('crypto');
const MonthlyAreaRevenueReport = require('../models/MonthlyAreaRevenueReport');
const ShiftSession = require('../models/ShiftSession');
const User = require('../models/User');

const BRANCH_NAMES = {
  sg: 'Chi nhánh TP. Hồ Chí Minh',
  dl: 'Chi nhánh Đà Lạt',
  ct: 'Chi nhánh Cần Thơ'
};

// Helper tính khoảng thời gian của tháng theo UTC
const getMonthRange = (year, month) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
};

// Helper tính toán động toàn bộ dữ liệu báo cáo (summary, staffBreakdown) từ bảng ShiftSession & User
// KHÔNG lưu bất kỳ dữ liệu tính toán hay tổng hợp nào vào database MonthlyAreaRevenueReport
const buildAreaReportPayload = async (reportDoc) => {
  if (!reportDoc) return null;
  const rep = reportDoc.toObject ? reportDoc.toObject() : { ...reportDoc };

  // Xác định Quản lý bán vé và Chi nhánh
  let manager = rep.ticketManagerId;
  if (!manager || !manager.branch) {
    manager = await User.findById(rep.ticketManagerId?._id || rep.ticketManagerId).select('name phone email role branch');
  }

  const branchId = manager?.branch?.branchId || 'sg';
  const branchName = BRANCH_NAMES[branchId] || manager?.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh';

  // Lấy toàn bộ nhân viên bán vé thuộc chi nhánh này
  const branchUsers = await User.find({ 'branch.branchId': branchId }).select('_id name phone email role');
  const branchUserIds = branchUsers.map(u => u._id);
  const userMap = {};
  branchUsers.forEach(u => {
    userMap[u._id.toString()] = u;
  });

  // Lấy tất cả ca trực trong tháng của nhân viên thuộc chi nhánh từ bảng ShiftSession
  const { start, end } = getMonthRange(rep.year, rep.month);
  const shifts = await ShiftSession.find({
    userId: { $in: branchUserIds },
    startTime: { $gte: start, $lt: end }
  }).lean();

  let totalCashRevenue = 0;
  let totalCashlessRevenue = 0;
  let totalTickets = 0;

  const staffMap = {};

  shifts.forEach((s) => {
    const cash = s.cashRevenue || 0;
    const cashless = s.cashlessRevenue || 0;
    const tickets = s.ticketsSold?.length || 0;
    const shiftRev = cash + cashless;

    totalCashRevenue += cash;
    totalCashlessRevenue += cashless;
    totalTickets += tickets;

    const sId = s.userId?.toString() || 'unknown';
    const userObj = userMap[sId];
    const sName = userObj?.name || 'Nhân viên bán vé';
    const sPhone = userObj?.phone || '';

    if (!staffMap[sId]) {
      staffMap[sId] = {
        staffId: userObj?._id || s.userId || null,
        staffName: sName,
        phone: sPhone,
        shiftsCount: 0,
        totalCash: 0,
        totalCashless: 0,
        totalRevenue: 0,
        ticketsCount: 0
      };
    }
    staffMap[sId].shiftsCount += 1;
    staffMap[sId].totalCash += cash;
    staffMap[sId].totalCashless += cashless;
    staffMap[sId].totalRevenue += shiftRev;
    staffMap[sId].ticketsCount += tickets;
  });

  const totalRevenue = totalCashRevenue + totalCashlessRevenue;
  const cashRate = totalRevenue > 0 ? Math.round((totalCashRevenue / totalRevenue) * 100) : 0;
  const cashlessRate = totalRevenue > 0 ? Math.round((totalCashlessRevenue / totalRevenue) * 100) : 0;

  const staffBreakdown = Object.values(staffMap).map((s) => ({
    ...s,
    rate: totalRevenue > 0 ? Number(((s.totalRevenue / totalRevenue) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const summary = {
    totalRevenue,
    cashRevenue: totalCashRevenue,
    cashlessRevenue: totalCashlessRevenue,
    cashRate,
    cashlessRate,
    totalTickets,
    shiftsCount: shifts.length
  };

  // Thông tin Ban Giám Đốc ký duyệt nếu có
  let director = rep.directorId;
  if (director && (!director.name || typeof director === 'string')) {
    director = await User.findById(rep.directorId?._id || rep.directorId).select('name phone email role');
  }

  let digitalSignature = rep.digitalSignature || {};
  if (digitalSignature.isSigned) {
    digitalSignature = {
      ...digitalSignature,
      signerName: director?.name || digitalSignature.signerName || 'Nguyễn An Bình'
    };
  }

  return {
    ...rep,
    ticketManagerId: manager || rep.ticketManagerId,
    directorId: director || rep.directorId,
    branchId,
    branchName,
    summary,
    staffBreakdown,
    digitalSignature
  };
};

// 1. Xem trước dữ liệu Doanh thu Khu vực của Tháng (Preview)
exports.getAreaRevenuePreview = async (req, res) => {
  try {
    const { month, year } = req.query;
    let branchId = req.query.branchId;

    if (req.user.role === 'ticket_manager') {
      branchId = req.user.branch?.branchId || 'sg';
    } else if (!branchId || branchId === 'all') {
      branchId = 'sg';
    }

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm báo cáo.' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const { start, end } = getMonthRange(y, m);

    const branchName = BRANCH_NAMES[branchId] || (branchId === 'dl' ? 'Chi nhánh Đà Lạt' : branchId === 'ct' ? 'Chi nhánh Cần Thơ' : 'Chi nhánh TP. Hồ Chí Minh');

    const branchUsers = await User.find({ 'branch.branchId': branchId }).select('_id name phone email role');
    const branchUserIds = branchUsers.map(u => u._id);
    const userMap = {};
    branchUsers.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    // Lấy tất cả ca trực trong tháng của nhân viên thuộc chi nhánh từ bảng ShiftSession
    const shifts = await ShiftSession.find({
      userId: { $in: branchUserIds },
      startTime: { $gte: start, $lt: end }
    }).lean();

    let totalCashRevenue = 0;
    let totalCashlessRevenue = 0;
    let totalTickets = 0;

    const staffMap = {};

    shifts.forEach((s) => {
      const cash = s.cashRevenue || 0;
      const cashless = s.cashlessRevenue || 0;
      const tickets = s.ticketsSold?.length || 0;
      const shiftRev = cash + cashless;

      totalCashRevenue += cash;
      totalCashlessRevenue += cashless;
      totalTickets += tickets;

      const sId = s.userId?.toString() || 'unknown';
      const userObj = userMap[sId];
      const sName = userObj?.name || 'Nhân viên bán vé';
      const sPhone = userObj?.phone || '';
      if (!staffMap[sId]) {
        staffMap[sId] = {
          staffId: userObj?._id || s.userId || null,
          staffName: sName,
          phone: sPhone,
          shiftsCount: 0,
          totalCash: 0,
          totalCashless: 0,
          totalRevenue: 0,
          ticketsCount: 0
        };
      }
      staffMap[sId].shiftsCount += 1;
      staffMap[sId].totalCash += cash;
      staffMap[sId].totalCashless += cashless;
      staffMap[sId].totalRevenue += shiftRev;
      staffMap[sId].ticketsCount += tickets;
    });

    const totalRevenue = totalCashRevenue + totalCashlessRevenue;
    const cashRate = totalRevenue > 0 ? Math.round((totalCashRevenue / totalRevenue) * 100) : 0;
    const cashlessRate = totalRevenue > 0 ? Math.round((totalCashlessRevenue / totalRevenue) * 100) : 0;

    const staffBreakdown = Object.values(staffMap).map((s) => ({
      ...s,
      rate: totalRevenue > 0 ? Number(((s.totalRevenue / totalRevenue) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const summary = {
      totalRevenue,
      cashRevenue: totalCashRevenue,
      cashlessRevenue: totalCashlessRevenue,
      cashRate,
      cashlessRate,
      totalTickets,
      shiftsCount: shifts.length
    };

    // Tìm xem đã có báo cáo nộp cho tháng này của chi nhánh chưa
    const branchManagers = await User.find({ 'branch.branchId': branchId, role: { $in: ['ticket_manager', 'general_manager', 'admin'] } }).select('_id');
    const branchManagerIds = branchManagers.map(u => u._id);

    const existingDoc = await MonthlyAreaRevenueReport.findOne({
      ticketManagerId: { $in: branchManagerIds },
      month: m,
      year: y
    })
      .populate('ticketManagerId', 'name phone email role branch')
      .populate('directorId', 'name phone email role');

    const existingReport = existingDoc ? await buildAreaReportPayload(existingDoc) : null;

    return res.status(200).json({
      success: true,
      data: {
        month: m,
        year: y,
        branchId,
        branchName,
        summary,
        staffBreakdown,
        existingReport
      }
    });
  } catch (error) {
    console.error('getAreaRevenuePreview error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu doanh thu khu vực.' });
  }
};

// 2. Quản lý Phòng vé nộp Báo cáo Doanh thu Khu vực lên Ban Giám đốc
exports.submitAreaRevenueReport = async (req, res) => {
  try {
    const { month, year, ticketManagerNotes } = req.body;
    let branchId = req.body.branchId;

    if (req.user.role === 'ticket_manager') {
      branchId = req.user.branch?.branchId || 'sg';
    } else if (!branchId) {
      branchId = 'sg';
    }

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm báo cáo.' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const branchName = BRANCH_NAMES[branchId] || (branchId === 'dl' ? 'Chi nhánh Đà Lạt' : branchId === 'ct' ? 'Chi nhánh Cần Thơ' : 'Chi nhánh TP. Hồ Chí Minh');

    // Kiểm tra xem đã có báo cáo của chi nhánh tháng này được duyệt chưa
    const branchManagers = await User.find({ 'branch.branchId': branchId }).select('_id');
    const branchManagerIds = branchManagers.map(u => u._id);

    const existing = await MonthlyAreaRevenueReport.findOne({
      ticketManagerId: { $in: branchManagerIds },
      month: m,
      year: y
    });

    if (existing && existing.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: `Báo cáo doanh thu ${branchName} tháng ${m}/${y} đã được Ban Giám đốc phê duyệt, không thể nộp lại.`
      });
    }

    const countReports = await MonthlyAreaRevenueReport.countDocuments();
    const seq = String(countReports + 1).padStart(3, '0');
    const reportCode = `BCDT-${y}${String(m).padStart(2, '0')}-${seq}`;

    let reportDoc;
    if (existing && existing.status === 'rejected') {
      existing.ticketManagerNotes = ticketManagerNotes || '';
      existing.status = 'pending';
      existing.submittedAt = new Date();
      existing.directorNotes = '';
      existing.reviewedAt = null;
      reportDoc = await existing.save();
    } else if (existing) {
      existing.ticketManagerNotes = ticketManagerNotes || '';
      existing.status = 'pending';
      existing.submittedAt = new Date();
      reportDoc = await existing.save();
    } else {
      // Chỉ lưu metadata hồ sơ văn bản: reportCode, ticketManagerId, month, year, ticketManagerNotes, status
      // KHÔNG lưu bất kỳ summary hay breakdown nào
      reportDoc = await MonthlyAreaRevenueReport.create({
        reportCode,
        ticketManagerId: req.user._id,
        month: m,
        year: y,
        ticketManagerNotes: ticketManagerNotes || '',
        status: 'pending',
        submittedAt: new Date()
      });
    }

    const populated = await MonthlyAreaRevenueReport.findById(reportDoc._id)
      .populate('ticketManagerId', 'name phone email role branch')
      .populate('directorId', 'name phone email role');

    const formatted = await buildAreaReportPayload(populated);

    return res.status(201).json({
      success: true,
      message: `Đã nộp Báo cáo Doanh thu ${branchName} tháng ${m}/${y} lên Ban Giám đốc thành công!`,
      report: formatted
    });
  } catch (error) {
    console.error('submitAreaRevenueReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi nộp báo cáo doanh thu khu vực.' });
  }
};

// 3. Lấy danh sách lịch sử các Báo cáo Doanh thu Khu vực
exports.getAreaRevenueReports = async (req, res) => {
  try {
    const { status, year, branchId } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (year) filter.year = parseInt(year, 10);

    if (branchId && branchId !== 'all') {
      const branchUsers = await User.find({ 'branch.branchId': branchId }).select('_id');
      filter.ticketManagerId = { $in: branchUsers.map(u => u._id) };
    }

    const reports = await MonthlyAreaRevenueReport.find(filter)
      .populate('ticketManagerId', 'name phone email role branch')
      .populate('directorId', 'name phone email role')
      .sort({ year: -1, month: -1, createdAt: -1 });

    const formattedReports = await Promise.all(reports.map(r => buildAreaReportPayload(r)));

    return res.status(200).json({
      success: true,
      count: formattedReports.length,
      reports: formattedReports
    });
  } catch (error) {
    console.error('getAreaRevenueReports error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách báo cáo doanh thu.' });
  }
};

// 4. Lấy chi tiết 1 Báo cáo Doanh thu theo ID
exports.getAreaRevenueReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await MonthlyAreaRevenueReport.findById(id)
      .populate('ticketManagerId', 'name phone email role branch')
      .populate('directorId', 'name phone email role');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo doanh thu này.' });
    }

    const formatted = await buildAreaReportPayload(report);

    return res.status(200).json({
      success: true,
      report: formatted
    });
  } catch (error) {
    console.error('getAreaRevenueReportById error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy chi tiết báo cáo.' });
  }
};

// 5. Ban Giám Đốc Phê Duyệt & Ký Số Điện Tử Báo Cáo Doanh Thu Khu Vực
exports.approveAreaRevenueReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { directorNotes } = req.body;

    const report = await MonthlyAreaRevenueReport.findById(id).populate('ticketManagerId', 'name phone email role branch');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo doanh thu.' });
    }

    if (report.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Báo cáo này đã được phê duyệt trước đó.' });
    }

    const branchId = report.ticketManagerId?.branch?.branchId || 'sg';
    const { start, end } = getMonthRange(report.year, report.month);
    const branchUsers = await User.find({ 'branch.branchId': branchId }).select('_id');
    const branchUserIds = branchUsers.map(u => u._id);

    // Tính tổng doanh thu thực tế từ ShiftSession để tạo chuỗi băm chữ ký số
    const shifts = await ShiftSession.find({
      userId: { $in: branchUserIds },
      startTime: { $gte: start, $lt: end }
    }).select('cashRevenue cashlessRevenue').lean();

    let totalRev = 0;
    shifts.forEach((s) => {
      totalRev += (s.cashRevenue || 0) + (s.cashlessRevenue || 0);
    });

    const directorName = req.user.name || 'Nguyễn An Bình';
    const now = new Date();
    const certCode = `CERT-GM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const signPayload = `${report.reportCode}|${branchId}|${totalRev}|${report.month}|${report.year}|${directorName}|${now.toISOString()}`;
    const hash = crypto.createHash('sha256').update(signPayload).digest('hex');

    report.status = 'approved';
    report.directorId = req.user._id;
    report.directorNotes = directorNotes || 'Đã đối soát đầy đủ dòng tiền và ngân hàng. Phê duyệt quyết toán doanh thu khu vực.';
    report.reviewedAt = now;
    report.digitalSignature = {
      isSigned: true,
      signedAt: now,
      certCode,
      hash
    };

    await report.save();

    const populated = await MonthlyAreaRevenueReport.findById(id)
      .populate('ticketManagerId', 'name phone email role branch')
      .populate('directorId', 'name phone email role');

    const formatted = await buildAreaReportPayload(populated);

    return res.status(200).json({
      success: true,
      message: `Đã phê duyệt và ký số báo cáo doanh thu ${report.reportCode} thành công!`,
      report: formatted
    });
  } catch (error) {
    console.error('approveAreaRevenueReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi phê duyệt báo cáo.' });
  }
};

// 6. Ban Giám Đốc Từ Chối / Yêu cầu Quản lý phòng vé giải trình lại
exports.rejectAreaRevenueReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const report = await MonthlyAreaRevenueReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo doanh thu.' });
    }

    if (report.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Báo cáo đã được phê duyệt quyết toán, không thể từ chối.' });
    }

    report.status = 'rejected';
    report.directorId = req.user._id;
    report.directorNotes = rejectionReason || 'Số liệu tiền mặt và chuyển khoản chưa khớp với sao kê ngân hàng. Yêu cầu đối soát lại.';
    report.reviewedAt = new Date();

    await report.save();

    const populated = await MonthlyAreaRevenueReport.findById(id)
      .populate('ticketManagerId', 'name phone email role branch')
      .populate('directorId', 'name phone email role');

    const formatted = await buildAreaReportPayload(populated);

    return res.status(200).json({
      success: true,
      message: `Đã từ chối báo cáo doanh thu ${report.reportCode}.`,
      report: formatted
    });
  } catch (error) {
    console.error('rejectAreaRevenueReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi từ chối báo cáo.' });
  }
};
