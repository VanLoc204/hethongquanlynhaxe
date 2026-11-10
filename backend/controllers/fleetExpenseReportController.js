const crypto = require('crypto');
const MonthlyFleetExpenseReport = require('../models/MonthlyFleetExpenseReport');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const User = require('../models/User');

// Helper tính khoảng thời gian tháng theo UTC/Local
const getMonthRange = (year, month) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
};

// Định mức nhiên liệu tiêu chuẩn (Lít / 100 Km)
const getStandardFuelRate = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('limousine')) return 15.0;
  if (t.includes('giường') || t.includes('phòng')) return 22.0;
  return 18.0;
};

const DIESEL_UNIT_PRICE = 21500; // 21.500 đ / Lít

// 1. Xem trước dữ liệu tổng hợp chi phí tháng (Preview)
exports.getFleetExpensePreview = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm cần xem.' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const { start, end } = getMonthRange(y, m);

    // Lấy tất cả xe trong hệ thống
    const buses = await Bus.find({ status: 'approved' });

    // Lấy tất cả chuyến xe trong tháng
    const trips = await Trip.find({
      departureTime: { $gte: start, $lt: end },
      status: { $in: ['completed', 'running', 'scheduled'] }
    }).populate('routeId');

    // Lấy tất cả phiếu bảo trì/sửa chữa trong tháng
    const maintenanceList = await MaintenanceRecord.find({
      $or: [
        { endDate: { $gte: start, $lt: end } },
        { createdAt: { $gte: start, $lt: end } }
      ]
    }).sort({ createdAt: -1 });

    let totalDistanceKm = 0;
    let totalFuelLiters = 0;
    let totalMaintenanceCost = 0;
    let maintenanceCount = maintenanceList.length;

    // Chi tiết từng xe
    const busDetails = buses.map((bus) => {
      const busIdStr = bus._id.toString();

      // Các chuyến xe thuộc xe này trong tháng
      const busTrips = trips.filter((t) => t.busId && t.busId.toString() === busIdStr);
      let busDistance = 0;
      busTrips.forEach((t) => {
        const distStr = t.routeId?.distance || '';
        const match = distStr.match(/(\d+)/);
        busDistance += match ? parseInt(match[1], 10) : 250;
      });

      const fuelRate = getStandardFuelRate(bus.type);
      const fuelLiters = Math.round((busDistance * fuelRate) / 100);
      const fuelCost = fuelLiters * DIESEL_UNIT_PRICE;

      // Bảo dưỡng thuộc xe này trong tháng
      const busMaints = maintenanceList.filter((m) => m.busId && m.busId.toString() === busIdStr);
      const maintCost = busMaints.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

      totalDistanceKm += busDistance;
      totalFuelLiters += fuelLiters;
      totalMaintenanceCost += maintCost;

      return {
        busId: bus._id,
        plateNumber: bus.plateNumber,
        busType: bus.type,
        tripsCount: busTrips.length,
        distanceKm: busDistance,
        fuelLiters,
        fuelCost,
        maintenanceCost: maintCost,
        maintCount: busMaints.length,
        activeStatus: bus.activeStatus || 'ready'
      };
    });

    const totalFuelCost = totalFuelLiters * DIESEL_UNIT_PRICE;
    const totalExpenses = totalMaintenanceCost + totalFuelCost;

    const readyBuses = buses.filter((b) => b.activeStatus === 'ready' || !b.activeStatus).length;
    const maintBuses = buses.filter((b) => b.activeStatus === 'maintenance' || b.activeStatus === 'repairing').length;
    const availabilityRate = buses.length > 0 ? Math.round((readyBuses / buses.length) * 100) : 100;

    const summary = {
      totalExpenses,
      totalMaintenanceCost,
      maintenanceCount,
      totalDistanceKm,
      totalFuelLiters,
      fuelUnitPrice: DIESEL_UNIT_PRICE,
      totalFuelCost,
      readyBusesCount: readyBuses,
      maintenanceBusesCount: maintBuses,
      availabilityRate
    };

    // Kiểm tra báo cáo đã tồn tại chưa
    const existingReport = await MonthlyFleetExpenseReport.findOne({
      month: m,
      year: y
    })
      .populate('fleetManagerId', 'name phone email role')
      .populate('directorId', 'name phone email role');

    return res.status(200).json({
      success: true,
      data: {
        month: m,
        year: y,
        summary,
        busDetails,
        maintenanceRecords: maintenanceList.map((rec) => ({
          recordId: rec._id,
          plateNumber: rec.plateNumber,
          garage: rec.garage || 'Garage Đối tác',
          description: rec.description || 'Bảo dưỡng định kỳ',
          type: rec.type || 'maintenance',
          cost: Number(rec.cost) || 0,
          date: rec.endDate || rec.createdAt
        })),
        existingReport
      }
    });
  } catch (error) {
    console.error('getFleetExpensePreview error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu chi phí đội xe.' });
  }
};

// 2. Quản lý Đội xe nộp Báo cáo Chi tiêu Tháng lên Ban Giám đốc
exports.submitFleetExpenseReport = async (req, res) => {
  try {
    const { month, year, fleetManagerNotes } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tháng và năm báo cáo.' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    // Kiểm tra xem đã có báo cáo đang pending hoặc approved chưa
    const existing = await MonthlyFleetExpenseReport.findOne({ month: m, year: y });
    if (existing && existing.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: `Báo cáo chi tiêu Đội xe tháng ${m}/${y} đã được Ban Giám đốc phê duyệt, không thể nộp lại.`
      });
    }

    const { start, end } = getMonthRange(y, m);
    const buses = await Bus.find({ status: 'approved' });
    const trips = await Trip.find({
      departureTime: { $gte: start, $lt: end },
      status: { $in: ['completed', 'running', 'scheduled'] }
    }).populate('routeId');

    const maintenanceList = await MaintenanceRecord.find({
      $or: [
        { endDate: { $gte: start, $lt: end } },
        { createdAt: { $gte: start, $lt: end } }
      ]
    }).sort({ createdAt: -1 });

    let totalDistanceKm = 0;
    let totalFuelLiters = 0;
    let totalMaintenanceCost = 0;

    const busDetails = buses.map((bus) => {
      const busIdStr = bus._id.toString();
      const busTrips = trips.filter((t) => t.busId && t.busId.toString() === busIdStr);
      let busDistance = 0;
      busTrips.forEach((t) => {
        const distStr = t.routeId?.distance || '';
        const match = distStr.match(/(\d+)/);
        busDistance += match ? parseInt(match[1], 10) : 250;
      });

      const fuelRate = getStandardFuelRate(bus.type);
      const fuelLiters = Math.round((busDistance * fuelRate) / 100);
      const fuelCost = fuelLiters * DIESEL_UNIT_PRICE;

      const busMaints = maintenanceList.filter((rec) => rec.busId && rec.busId.toString() === busIdStr);
      const maintCost = busMaints.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

      totalDistanceKm += busDistance;
      totalFuelLiters += fuelLiters;
      totalMaintenanceCost += maintCost;

      return {
        busId: bus._id,
        plateNumber: bus.plateNumber,
        busType: bus.type,
        tripsCount: busTrips.length,
        distanceKm: busDistance,
        fuelLiters,
        fuelCost,
        maintenanceCost: maintCost,
        maintCount: busMaints.length,
        activeStatus: bus.activeStatus || 'ready'
      };
    });

    const totalFuelCost = totalFuelLiters * DIESEL_UNIT_PRICE;
    const totalExpenses = totalMaintenanceCost + totalFuelCost;
    const readyBuses = buses.filter((b) => b.activeStatus === 'ready' || !b.activeStatus).length;
    const maintBuses = buses.filter((b) => b.activeStatus === 'maintenance' || b.activeStatus === 'repairing').length;
    const availabilityRate = buses.length > 0 ? Math.round((readyBuses / buses.length) * 100) : 100;

    const summary = {
      totalExpenses,
      totalMaintenanceCost,
      maintenanceCount: maintenanceList.length,
      totalDistanceKm,
      totalFuelLiters,
      fuelUnitPrice: DIESEL_UNIT_PRICE,
      totalFuelCost,
      readyBusesCount: readyBuses,
      maintenanceBusesCount: maintBuses,
      availabilityRate
    };

    const formattedMaintRecords = maintenanceList.map((rec) => ({
      recordId: rec._id,
      plateNumber: rec.plateNumber,
      garage: rec.garage || 'Garage Đối tác',
      description: rec.description || 'Bảo dưỡng kỹ thuật',
      type: rec.type || 'maintenance',
      cost: Number(rec.cost) || 0,
      date: rec.endDate || rec.createdAt
    }));

    const countReports = await MonthlyFleetExpenseReport.countDocuments();
    const seq = String(countReports + 1).padStart(3, '0');
    const reportCode = `BCCT-${y}${String(m).padStart(2, '0')}-${seq}`;

    let report;
    if (existing && existing.status === 'rejected') {
      // Cập nhật lại báo cáo bị từ chối
      existing.summary = summary;
      existing.busDetails = busDetails;
      existing.maintenanceRecords = formattedMaintRecords;
      existing.fleetManagerNotes = fleetManagerNotes || '';
      existing.status = 'pending';
      existing.submittedAt = new Date();
      existing.directorNotes = '';
      existing.reviewedAt = null;
      report = await existing.save();
    } else {
      report = await MonthlyFleetExpenseReport.create({
        reportCode,
        fleetManagerId: req.user._id,
        branchId: req.user.branch?.code || 'sg',
        month: m,
        year: y,
        summary,
        busDetails,
        maintenanceRecords: formattedMaintRecords,
        fleetManagerNotes: fleetManagerNotes || '',
        status: 'pending',
        submittedAt: new Date()
      });
    }

    return res.status(201).json({
      success: true,
      message: `Đã nộp Báo cáo Chi tiêu Đội xe tháng ${m}/${y} lên Ban Giám đốc thành công!`,
      report
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

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports
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

    return res.status(200).json({
      success: true,
      report
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

    // Tạo chữ ký điện tử xác thực
    const signerName = req.user.name || 'Ban Giám đốc An Bình Lines';
    const signedAt = new Date();
    const certCode = `CERT-GM-${Date.now().toString(36).toUpperCase()}`;
    const signPayload = `${report.reportCode}|${report.summary.totalExpenses}|${req.user._id}|${signedAt.toISOString()}`;
    const hash = crypto.createHash('sha256').update(signPayload).digest('hex');

    report.status = 'approved';
    report.directorId = req.user._id;
    report.directorNotes = directorNotes || 'Đã kiểm tra đối soát, duyệt quyết toán chi phí vận hành đội xe.';
    report.reviewedAt = signedAt;
    report.digitalSignature = {
      isSigned: true,
      signerName,
      signedAt,
      certCode,
      hash
    };

    await report.save();

    return res.status(200).json({
      success: true,
      message: `Đã phê duyệt và ký số báo cáo chi tiêu ${report.reportCode} thành công!`,
      report
    });
  } catch (error) {
    console.error('approveFleetExpenseReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi duyệt báo cáo chi tiêu.' });
  }
};

// 6. Ban Giám đốc Từ chối Báo cáo Chi tiêu (Yêu cầu giải trình)
exports.rejectFleetExpenseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối / yêu cầu giải trình.' });
    }

    const report = await MonthlyFleetExpenseReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo chi tiêu.' });
    }

    report.status = 'rejected';
    report.directorId = req.user._id;
    report.directorNotes = rejectionReason.trim();
    report.reviewedAt = new Date();

    await report.save();

    return res.status(200).json({
      success: true,
      message: `Đã gửi yêu cầu hiệu chỉnh/giải trình cho báo cáo ${report.reportCode}.`,
      report
    });
  } catch (error) {
    console.error('rejectFleetExpenseReport error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi từ chối báo cáo chi tiêu.' });
  }
};

