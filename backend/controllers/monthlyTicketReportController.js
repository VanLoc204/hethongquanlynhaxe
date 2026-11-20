const crypto = require('crypto');
const MonthlyTicketReport = require('../models/MonthlyTicketReport');
const ShiftSession = require('../models/ShiftSession');
const User = require('../models/User');

// Helper tính khoảng thời gian tháng theo UTC/Local
const getMonthRange = (year, month) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
};

// Helper tính toán tổng hợp (summary) động từ các ca trực ShiftSession
const computeShiftSummary = (shifts = []) => {
  let totalTickets = 0;
  let cashRevenue = 0;
  let cashlessRevenue = 0;
  let initialCashHandover = 0;

  shifts.forEach((s) => {
    totalTickets += s.ticketsSold?.length || 0;
    cashRevenue += s.cashRevenue || 0;
    cashlessRevenue += s.cashlessRevenue || 0;
    initialCashHandover += s.initialCash || 0;
  });

  return {
    totalShifts: shifts.length,
    totalTickets,
    cashRevenue,
    cashlessRevenue,
    totalRevenue: cashRevenue + cashlessRevenue,
    initialCashHandover
  };
};

// 1. Lấy dữ liệu tổng hợp trước (Preview) cho Nhân viên hoặc Quản lý
exports.getMonthlyPreview = async (req, res) => {
  try {
    const { month, year, agentId: queryAgentId, userId: queryUserId } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm cần xem.' });
    }

    // Nếu là nhân viên thì lấy ID của chính họ; nếu là quản lý thì có thể truyền userId / agentId
    let targetUserId = req.user._id;
    const requestedTarget = queryUserId || queryAgentId;
    if (requestedTarget && ['ticket_manager', 'admin', 'general_manager'].includes(req.user.role)) {
      targetUserId = requestedTarget;
    }

    const agent = await User.findById(targetUserId).select('name phone email branch assignedOffice role');
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên bán vé.' });
    }

    const { start, end } = getMonthRange(year, month);

    // Truy vấn các ca trực đã đóng của nhân viên trong tháng (Nguồn dữ liệu chân lý duy nhất)
    const shifts = await ShiftSession.find({
      userId: targetUserId,
      status: 'closed',
      startTime: { $gte: start, $lt: end }
    }).sort({ startTime: 1 });

    const summary = computeShiftSummary(shifts);

    // Kiểm tra xem đã có hồ sơ báo cáo nào được nộp cho tháng này chưa
    const existingReportDoc = await MonthlyTicketReport.findOne({
      userId: targetUserId,
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    })
      .populate('managerId', 'name phone')
      .populate('userId', 'name phone branch assignedOffice');

    let existingReport = null;
    if (existingReportDoc) {
      existingReport = existingReportDoc.toObject();
      existingReport.summary = summary;
      existingReport.shifts = shifts;
      existingReport.agentId = existingReport.userId; // Tương thích ngược frontend
    }

    return res.status(200).json({
      success: true,
      data: {
        agent,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        summary,
        shifts,
        existingReport
      }
    });
  } catch (error) {
    console.error('getMonthlyPreview error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu tổng hợp tháng.' });
  }
};

// 2. Nhân viên bán vé nộp báo cáo doanh thu tháng (Chuẩn 3NF - Chỉ lưu hồ sơ ký nộp)
exports.submitMonthlyReport = async (req, res) => {
  try {
    const { month, year, agentNotes } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm báo cáo.' });
    }

    const userId = req.user._id;
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const existingReport = await MonthlyTicketReport.findOne({
      userId,
      month: m,
      year: y
    });

    if (existingReport && existingReport.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: `Báo cáo doanh thu Tháng ${m}/${y} đã được Quản lý duyệt điện tử, không thể nộp lại.`
      });
    }

    // Tự động gom các ca trực trong tháng để kiểm tra tính hợp lệ
    const { start, end } = getMonthRange(y, m);
    const shifts = await ShiftSession.find({
      userId,
      status: 'closed',
      startTime: { $gte: start, $lt: end }
    }).sort({ startTime: 1 });

    if (shifts.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Không tìm thấy ca trực đã hoàn thành nào của bạn trong Tháng ${m}/${y}.`
      });
    }

    const summary = computeShiftSummary(shifts);
    const branchCode = req.user?.branch?.branchId || 'sg';

    if (existingReport) {
      // Cập nhật lại báo cáo (nếu đang pending hoặc bị rejected trước đó)
      existingReport.agentNotes = agentNotes || '';
      existingReport.status = 'pending';
      existingReport.submittedAt = new Date();
      existingReport.managerNotes = '';
      existingReport.reviewedAt = null;
      existingReport.managerId = null;
      existingReport.digitalSignature = {
        isSigned: false,
        signerName: '',
        signedAt: null,
        certCode: '',
        hash: ''
      };

      await existingReport.save();

      const updated = await MonthlyTicketReport.findById(existingReport._id)
        .populate('userId', 'name phone branch assignedOffice');

      const repObj = updated.toObject();
      repObj.summary = summary;
      repObj.shifts = shifts;
      repObj.agentId = repObj.userId;

      return res.status(200).json({
        success: true,
        message: `Gửi lại Báo cáo doanh thu Tháng ${m}/${y} thành công. Hồ sơ đang chờ Quản lý duyệt.`,
        report: repObj
      });
    }

    // Tạo mới báo cáo (Chuẩn 3NF: Không lưu summary, không lưu branchId, không lưu shiftIds trùng lặp)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportCode = `BC-DT-${y}${String(m).padStart(2, '0')}-${branchCode.toUpperCase()}-${randomSuffix}`;

    const newReport = new MonthlyTicketReport({
      reportCode,
      userId,
      month: m,
      year: y,
      agentNotes: agentNotes || '',
      status: 'pending',
      submittedAt: new Date()
    });

    await newReport.save();

    const created = await MonthlyTicketReport.findById(newReport._id)
      .populate('userId', 'name phone branch assignedOffice');

    const createdObj = created.toObject();
    createdObj.summary = summary;
    createdObj.shifts = shifts;
    createdObj.agentId = createdObj.userId;

    return res.status(201).json({
      success: true,
      message: `Nộp Báo cáo doanh thu Tháng ${m}/${y} thành công! Hồ sơ đã được chuyển đến Quản lý phòng vé.`,
      report: createdObj
    });
  } catch (error) {
    console.error('submitMonthlyReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi nộp báo cáo doanh thu tháng.' });
  }
};

// 3. Nhân viên xem lịch sử các báo cáo của chính mình
exports.getAgentReports = async (req, res) => {
  try {
    const reports = await MonthlyTicketReport.find({ userId: req.user._id })
      .populate('managerId', 'name phone')
      .populate('userId', 'name phone branch assignedOffice')
      .sort({ year: -1, month: -1 });

    const reportsWithSummary = await Promise.all(
      reports.map(async (r) => {
        const { start, end } = getMonthRange(r.year, r.month);
        const shifts = await ShiftSession.find({
          userId: r.userId?._id || r.userId,
          status: 'closed',
          startTime: { $gte: start, $lt: end }
        });
        const repObj = r.toObject();
        repObj.summary = computeShiftSummary(shifts);
        repObj.shifts = shifts;
        repObj.agentId = repObj.userId;
        return repObj;
      })
    );

    return res.status(200).json({
      success: true,
      reports: reportsWithSummary
    });
  } catch (error) {
    console.error('getAgentReports error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách báo cáo.' });
  }
};

// 4. Quản lý phòng vé lấy danh sách báo cáo chi nhánh
exports.getManagerReports = async (req, res) => {
  try {
    const { branchId, month, year, status, agentId, userId } = req.query;
    const filter = {};

    // Quản lý phòng vé lọc theo chi nhánh: Kế thừa qua quan hệ User
    const targetBranch = branchId && branchId !== 'all' ? branchId : (req.user.role === 'ticket_manager' ? req.user?.branch?.branchId : null);
    if (targetBranch) {
      const branchUsers = await User.find({ 'branch.branchId': targetBranch }).select('_id');
      filter.userId = { $in: branchUsers.map((u) => u._id) };
    }

    if (month && month !== 'all') {
      filter.month = parseInt(month, 10);
    }
    if (year && year !== 'all') {
      filter.year = parseInt(year, 10);
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    const targetUser = userId || agentId;
    if (targetUser && targetUser !== 'all') {
      filter.userId = targetUser;
    }

    const reports = await MonthlyTicketReport.find(filter)
      .populate('userId', 'name phone email branch assignedOffice')
      .populate('managerId', 'name phone')
      .sort({ submittedAt: -1 });

    const reportsWithSummary = await Promise.all(
      reports.map(async (r) => {
        const { start, end } = getMonthRange(r.year, r.month);
        const shifts = await ShiftSession.find({
          userId: r.userId?._id || r.userId,
          status: 'closed',
          startTime: { $gte: start, $lt: end }
        });
        const repObj = r.toObject();
        repObj.summary = computeShiftSummary(shifts);
        repObj.shifts = shifts;
        repObj.agentId = repObj.userId;
        return repObj;
      })
    );

    return res.status(200).json({
      success: true,
      reports: reportsWithSummary
    });
  } catch (error) {
    console.error('getManagerReports error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải danh sách báo cáo.' });
  }
};

// 5. Chi tiết 1 báo cáo kèm danh sách ca trực (JOIN động từ ShiftSession)
exports.getReportDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await MonthlyTicketReport.findById(id)
      .populate('userId', 'name phone email branch assignedOffice')
      .populate('managerId', 'name phone');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ báo cáo.' });
    }

    const { start, end } = getMonthRange(report.year, report.month);
    const shifts = await ShiftSession.find({
      userId: report.userId?._id || report.userId,
      status: 'closed',
      startTime: { $gte: start, $lt: end }
    })
      .populate({
        path: 'ticketsSold',
        select: 'orderCode customerName customerPhone seats pricePerSeat totalAmount status createdAt'
      })
      .sort({ startTime: 1 });

    const summary = computeShiftSummary(shifts);
    const repObj = report.toObject();
    repObj.summary = summary;
    repObj.shifts = shifts;
    repObj.shiftIds = shifts; // Giữ để tương thích giao diện modal
    repObj.agentId = repObj.userId;

    return res.status(200).json({
      success: true,
      report: repObj
    });
  } catch (error) {
    console.error('getReportDetail error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải chi tiết báo cáo.' });
  }
};

// 6. Quản lý ký duyệt điện tử và đóng mộc tròn đỏ
exports.signApproveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { managerNotes } = req.body;

    const report = await MonthlyTicketReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ báo cáo.' });
    }

    if (report.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Báo cáo này đã được ký duyệt điện tử trước đó.' });
    }

    const signerName = req.user.name || 'Quản lý phòng vé';
    const certCode = `AB-DS-${report.year}${String(report.month).padStart(2, '0')}-${report._id.toString().slice(-6).toUpperCase()}`;
    const hash = crypto
      .createHash('sha256')
      .update(`${report._id}-${req.user._id}-${Date.now()}`)
      .digest('hex')
      .toUpperCase();

    report.status = 'approved';
    report.managerId = req.user._id;
    report.managerNotes = managerNotes || 'Đã đối soát khớp đúng toàn bộ ca trực và quỹ tiền mặt bàn giao.';
    report.reviewedAt = new Date();
    report.digitalSignature = {
      isSigned: true,
      signerName,
      signedAt: new Date(),
      certCode,
      hash
    };

    await report.save();

    const updated = await MonthlyTicketReport.findById(report._id)
      .populate('userId', 'name phone email branch assignedOffice')
      .populate('managerId', 'name phone');

    const { start, end } = getMonthRange(report.year, report.month);
    const shifts = await ShiftSession.find({
      userId: updated.userId?._id || updated.userId,
      status: 'closed',
      startTime: { $gte: start, $lt: end }
    }).sort({ startTime: 1 });

    const repObj = updated.toObject();
    repObj.summary = computeShiftSummary(shifts);
    repObj.shifts = shifts;
    repObj.shiftIds = shifts;
    repObj.agentId = repObj.userId;

    return res.status(200).json({
      success: true,
      message: 'Ký duyệt điện tử và đóng mộc chứng thực báo cáo doanh thu thành công!',
      report: repObj
    });
  } catch (error) {
    console.error('signApproveReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi ký duyệt báo cáo.' });
  }
};

// 7. Quản lý từ chối yêu cầu giải trình lại
exports.rejectReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { managerNotes } = req.body;

    if (!managerNotes || !managerNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do từ chối để nhân viên bán vé nắm rõ và điều chỉnh.'
      });
    }

    const report = await MonthlyTicketReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ báo cáo.' });
    }

    report.status = 'rejected';
    report.managerId = req.user._id;
    report.managerNotes = managerNotes.trim();
    report.reviewedAt = new Date();
    report.digitalSignature = {
      isSigned: false,
      signerName: '',
      signedAt: null,
      certCode: '',
      hash: ''
    };

    await report.save();

    const updated = await MonthlyTicketReport.findById(report._id)
      .populate('userId', 'name phone email branch assignedOffice')
      .populate('managerId', 'name phone');

    const { start, end } = getMonthRange(report.year, report.month);
    const shifts = await ShiftSession.find({
      userId: updated.userId?._id || updated.userId,
      status: 'closed',
      startTime: { $gte: start, $lt: end }
    }).sort({ startTime: 1 });

    const repObj = updated.toObject();
    repObj.summary = computeShiftSummary(shifts);
    repObj.shifts = shifts;
    repObj.shiftIds = shifts;
    repObj.agentId = repObj.userId;

    return res.status(200).json({
      success: true,
      message: 'Đã gửi phản hồi từ chối hồ sơ về cho nhân viên bán vé.',
      report: repObj
    });
  } catch (error) {
    console.error('rejectReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi từ chối báo cáo.' });
  }
};
