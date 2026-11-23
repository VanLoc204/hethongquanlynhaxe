const crypto = require('crypto');
const MonthlyFleetExpenseReport = require('../models/MonthlyFleetExpenseReport');
const Maintenance = require('../models/Maintenance');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const User = require('../models/User');

// Helper tính khoảng thời gian tháng theo UTC/Local
const getMonthRange = (year, month) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
};

/**
 * TẦNG LOGIC NGHIỆP VỤ (BUSINESS LOGIC LAYER)
 * Tính toán động toàn bộ dữ liệu tổng hợp, chi phí, cự ly và trạng thái đội xe từ các bảng cơ sở:
 * - Bus: Lấy danh mục xe, trạng thái hiện tại
 * - Trip + Route: Lấy số chuyến thực tế, tổng km lăn bánh
 * - Maintenance: Lấy chi phí bảo dưỡng định kỳ, sửa chữa sự cố, số ngày nằm xưởng
 */
const calculateMonthlyMetrics = async (year, month) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const { start, end } = getMonthRange(y, m);

  // 1. Lấy tất cả xe trong hệ thống
  const buses = await Bus.find({ status: 'approved' });

  // 2. Lấy tất cả chuyến xe trong tháng (loại trừ các chuyến bị hủy)
  const trips = await Trip.find({
    departureTime: { $gte: start, $lt: end },
    status: { $nin: ['cancelled'] }
  }).populate('routeId');

  // 3. Lấy tất cả phiếu bảo trì/sửa chữa trong tháng (chỉ lấy bảo dưỡng và sửa chữa, loại bỏ trạng thái bãi lưu)
  const maintenanceList = await Maintenance.find({
    type: { $in: ['maintenance', 'repairing'] },
    $or: [
      { endDate: { $gte: start, $lt: end } },
      { createdAt: { $gte: start, $lt: end } }
    ]
  }).populate('busId', 'plateNumber type').sort({ createdAt: -1 });

  let totalDistanceKm = 0;
  let totalMaintenanceCost = 0;
  let totalScheduledCost = 0;
  let totalRepairCost = 0;
  let totalScheduledCount = 0;
  let totalRepairCount = 0;
  let totalWorkshopDays = 0;

  // Chi tiết từng xe
  const busDetails = buses.map((bus) => {
    const busIdStr = bus._id.toString();

    // Các chuyến xe thuộc xe này trong tháng
    const busTrips = trips.filter((t) => t.busId && (t.busId._id ? t.busId._id.toString() : t.busId.toString()) === busIdStr);
    let busDistance = 0;
    busTrips.forEach((t) => {
      const distStr = t.routeId?.distance || '';
      const match = distStr.match(/(\d+)/);
      busDistance += match ? parseInt(match[1], 10) : 250;
    });

    // Bảo dưỡng/sửa chữa thuộc xe này trong tháng
    const busMaints = maintenanceList.filter((rec) => rec.busId && (rec.busId._id ? rec.busId._id.toString() : rec.busId.toString()) === busIdStr);
    const scheduledMaints = busMaints.filter(rec => rec.type !== 'repairing');
    const repairMaints = busMaints.filter(rec => rec.type === 'repairing');

    const scheduledCost = scheduledMaints.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const repCost = repairMaints.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const maintCost = scheduledCost + repCost;

    // Tính tổng thời gian nằm xưởng của xe trong tháng
    let totalWorkshopMs = 0;
    busMaints.forEach(rec => {
      const s = new Date(rec.startDate || rec.createdAt).getTime();
      const e = new Date(rec.endDate || rec.updatedAt || rec.startDate || rec.createdAt).getTime();
      if (e > s) totalWorkshopMs += (e - s);
    });
    const workshopDays = Math.round(totalWorkshopMs / (24 * 3600 * 1000));
    const maintDetails = busMaints.map(rec => rec.description).filter(Boolean).join('; ');

    totalDistanceKm += busDistance;
    totalMaintenanceCost += maintCost;
    totalScheduledCost += scheduledCost;
    totalRepairCost += repCost;
    totalScheduledCount += scheduledMaints.length;
    totalRepairCount += repairMaints.length;
    totalWorkshopDays += workshopDays;

    return {
      busId: bus._id,
      plateNumber: bus.plateNumber,
      busType: bus.type,
      tripsCount: busTrips.length,
      distanceKm: busDistance,
      maintenanceCost: maintCost,
      scheduledMaintCost: scheduledCost,
      repairCost: repCost,
      maintCount: busMaints.length,
      scheduledMaintCount: scheduledMaints.length,
      repairCount: repairMaints.length,
      workshopDays,
      maintDetails,
      activeStatus: bus.activeStatus || 'ready'
    };
  });

  const readyBuses = buses.filter((b) => b.activeStatus === 'ready' || !b.activeStatus).length;
  const maintBuses = buses.filter((b) => b.activeStatus === 'maintenance' || b.activeStatus === 'repairing').length;
  const availabilityRate = buses.length > 0 ? Math.round((readyBuses / buses.length) * 100) : 100;

  const summary = {
    totalExpenses: totalMaintenanceCost,
    totalMaintenanceCost,
    scheduledMaintCost: totalScheduledCost,
    repairCost: totalRepairCost,
    maintenanceCount: maintenanceList.length,
    scheduledMaintCount: totalScheduledCount,
    repairCount: totalRepairCount,
    totalTrips: trips.length,
    totalDistanceKm,
    totalWorkshopDays,
    readyBusesCount: readyBuses,
    maintenanceBusesCount: maintBuses,
    availabilityRate
  };

  const formattedMaintRecords = maintenanceList.map((rec) => ({
    _id: rec._id,
    recordId: rec._id,
    plateNumber: rec.busId?.plateNumber || 'Phương tiện',
    garage: rec.garage || 'Garage Đối tác',
    description: rec.description || 'Bảo dưỡng kỹ thuật',
    type: rec.type || 'maintenance',
    cost: Number(rec.cost) || 0,
    date: rec.endDate || rec.createdAt
  }));

  return {
    summary,
    busDetails,
    maintenanceRecords: formattedMaintRecords,
    maintenanceRecordIds: maintenanceList.map(rec => rec._id)
  };
};

// 1. Xem trước dữ liệu tổng hợp chi phí tháng (Preview)
exports.getFleetExpensePreview = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm cần xem.' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    // Tính toán động từ Logic nghiệp vụ
    const calculated = await calculateMonthlyMetrics(y, m);

    // Kiểm tra xem báo cáo đã từng được lưu/nộp chưa
    const existingReport = await MonthlyFleetExpenseReport.findOne({
      month: m,
      year: y
    })
      .populate('fleetManagerId', 'name phone email role')
      .populate('directorId', 'name phone email role');

    // Kiểm tra điều kiện hết tháng: Báo cáo tháng m chỉ được gửi từ ngày 01/(m+1)
    const now = new Date();
    const nextMonthStart = new Date(y, m, 1, 0, 0, 0);
    const isMonthEnded = now >= nextMonthStart;

    let responseReport = null;
    if (existingReport) {
      responseReport = {
        ...existingReport.toObject(),
        summary: calculated.summary,
        busDetails: calculated.busDetails,
        maintenanceRecords: calculated.maintenanceRecords
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        month: m,
        year: y,
        isMonthEnded,
        summary: calculated.summary,
        busDetails: calculated.busDetails,
        maintenanceRecords: calculated.maintenanceRecords,
        report: responseReport
      }
    });
  } catch (error) {
    console.error('getFleetExpensePreview error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu xem trước báo cáo.' });
  }
};

// 2. Nộp Báo cáo Chi tiêu lên Ban Giám Đốc (Chỉ lưu các trường chưa có + ID liên kết)
exports.submitFleetExpenseReport = async (req, res) => {
  try {
    const { month, year, fleetManagerNotes } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm cần nộp báo cáo.' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    // Kiểm tra quy tắc nghiệp vụ: Chỉ được gửi sau khi hết tháng
    const now = new Date();
    const nextMonthStart = new Date(y, m, 1, 0, 0, 0);
    const isMonthEnded = now >= nextMonthStart;
    if (!isMonthEnded) {
      const nextMonthStr = String(m < 12 ? m + 1 : 1).padStart(2, '0');
      const nextYearNum = m < 12 ? y : y + 1;
      return res.status(400).json({
        success: false,
        message: `Báo cáo chi tiêu Đội xe Tháng ${m}/${y} chỉ được gửi lên Ban Giám đốc sau khi kết thúc tháng (từ ngày 01/${nextMonthStr}/${nextYearNum}). Hiện tại tháng này đang trong kỳ vận hành, chỉ xem trước số liệu.`
      });
    }

    // Kiểm tra xem đã có báo cáo đang approved chưa
    const existing = await MonthlyFleetExpenseReport.findOne({ month: m, year: y });
    if (existing && existing.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: `Báo cáo chi tiêu Đội xe tháng ${m}/${y} đã được Ban Giám đốc phê duyệt, không thể nộp lại.`
      });
    }

    // Tính toán số liệu động để lấy danh sách ID các phiếu bảo trì
    const calculated = await calculateMonthlyMetrics(y, m);

    const countReports = await MonthlyFleetExpenseReport.countDocuments();
    const seq = String(countReports + 1).padStart(3, '0');
    const reportCode = `BCCT-${y}${String(m).padStart(2, '0')}-${seq}`;

    let report;
    if (existing && existing.status === 'rejected') {
      // Cập nhật lại báo cáo bị từ chối: Chỉ lưu ID phiếu và ghi chú mới
      existing.maintenanceRecords = calculated.maintenanceRecordIds;
      existing.fleetManagerNotes = fleetManagerNotes || '';
      existing.status = 'pending';
      existing.submittedAt = new Date();
      existing.directorNotes = '';
      existing.reviewedAt = null;
      await existing.save();
      report = existing;
    } else {
      // Tạo mới: Chỉ lưu các trường riêng biệt và ID liên kết
      report = await MonthlyFleetExpenseReport.create({
        reportCode,
        fleetManagerId: req.user._id,
        branchId: req.user.branch?.code || 'sg',
        month: m,
        year: y,
        maintenanceRecords: calculated.maintenanceRecordIds,
        fleetManagerNotes: fleetManagerNotes || '',
        status: 'pending',
        submittedAt: new Date()
      });
    }

    // Trả về dữ liệu kết hợp cho giao diện hiển thị
    const responseReport = {
      ...report.toObject(),
      summary: calculated.summary,
      busDetails: calculated.busDetails,
      maintenanceRecords: calculated.maintenanceRecords
    };

    return res.status(201).json({
      success: true,
      message: `Đã nộp Báo cáo Chi tiêu Đội xe tháng ${m}/${y} lên Ban Giám đốc thành công!`,
      report: responseReport
    });
  } catch (error) {
    console.error('submitFleetExpenseReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi nộp báo cáo chi tiêu đội xe.' });
  }
};

// 3. Lấy danh sách lịch sử các Báo cáo Chi tiêu
exports.getFleetExpenseReports = async (req, res) => {
  try {
    const { status, year } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (year) filter.year = parseInt(year, 10);

    const reports = await MonthlyFleetExpenseReport.find(filter)
      .populate('fleetManagerId', 'name phone email role')
      .populate('directorId', 'name phone email role')
      .sort({ year: -1, month: -1, createdAt: -1 });

    // Tầng logic tính toán bổ sung summary cho từng báo cáo lịch sử
    const enrichedReports = await Promise.all(
      reports.map(async (rep) => {
        const calculated = await calculateMonthlyMetrics(rep.year, rep.month);
        return {
          ...rep.toObject(),
          summary: calculated.summary,
          busDetails: calculated.busDetails,
          maintenanceRecords: calculated.maintenanceRecords
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedReports.length,
      reports: enrichedReports
    });
  } catch (error) {
    console.error('getFleetExpenseReports error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách báo cáo chi tiêu.' });
  }
};

// 4. Lấy chi tiết 1 Báo cáo Chi tiêu theo ID
exports.getFleetExpenseReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await MonthlyFleetExpenseReport.findById(id)
      .populate('fleetManagerId', 'name phone email role')
      .populate('directorId', 'name phone email role');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo chi tiêu này.' });
    }

    const calculated = await calculateMonthlyMetrics(report.year, report.month);
    const enrichedReport = {
      ...report.toObject(),
      summary: calculated.summary,
      busDetails: calculated.busDetails,
      maintenanceRecords: calculated.maintenanceRecords
    };

    return res.status(200).json({
      success: true,
      report: enrichedReport
    });
  } catch (error) {
    console.error('getFleetExpenseReportById error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy chi tiết báo cáo.' });
  }
};

// 5. Ban Giám đốc Phê duyệt Báo cáo Chi tiêu
exports.approveFleetExpenseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { directorNotes } = req.body;

    const report = await MonthlyFleetExpenseReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo chi tiêu.' });
    }

    if (report.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Báo cáo này đã được phê duyệt trước đó.' });
    }

    const calculated = await calculateMonthlyMetrics(report.year, report.month);

    // Tạo chữ ký điện tử SHA-256 từ dữ liệu tính toán và thông tin người duyệt
    const payloadToSign = `${report.reportCode}|${report.month}|${report.year}|${calculated.summary.totalExpenses}|${req.user._id}|${Date.now()}`;
    const signatureHash = crypto.createHash('sha256').update(payloadToSign).digest('hex');

    report.status = 'approved';
    report.directorId = req.user._id;
    report.directorNotes = directorNotes || 'Đã kiểm tra đối soát hóa đơn gara và duyệt quyết toán chi phí bảo trì đội xe.';
    report.reviewedAt = new Date();
    report.digitalSignature = {
      isSigned: true,
      signerName: req.user.name || 'Ban Giám Đốc',
      signedAt: new Date(),
      certificateSerial: `CERT-AB-${Date.now()}`,
      signatureHash
    };

    await report.save();

    const responseReport = {
      ...report.toObject(),
      summary: calculated.summary,
      busDetails: calculated.busDetails,
      maintenanceRecords: calculated.maintenanceRecords
    };

    return res.status(200).json({
      success: true,
      message: 'Ban Giám đốc đã ký duyệt điện tử báo cáo chi tiêu đội xe thành công!',
      report: responseReport
    });
  } catch (error) {
    console.error('approveFleetExpenseReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi phê duyệt báo cáo.' });
  }
};

// 6. Ban Giám đốc Từ chối Báo cáo (Yêu cầu giải trình lại)
exports.rejectFleetExpenseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { directorNotes } = req.body;

    if (!directorNotes || !directorNotes.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối hoặc yêu cầu giải trình.' });
    }

    const report = await MonthlyFleetExpenseReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo chi tiêu.' });
    }

    if (report.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Báo cáo đã được phê duyệt, không thể từ chối.' });
    }

    report.status = 'rejected';
    report.directorId = req.user._id;
    report.directorNotes = directorNotes;
    report.reviewedAt = new Date();

    await report.save();

    const calculated = await calculateMonthlyMetrics(report.year, report.month);
    const responseReport = {
      ...report.toObject(),
      summary: calculated.summary,
      busDetails: calculated.busDetails,
      maintenanceRecords: calculated.maintenanceRecords
    };

    return res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu giải trình / từ chối báo cáo chi tiêu đến Quản lý Xe.',
      report: responseReport
    });
  } catch (error) {
    console.error('rejectFleetExpenseReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi từ chối báo cáo.' });
  }
};
