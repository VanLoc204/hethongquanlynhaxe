const TripReport = require('../models/TripReport');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const User = require('../models/User');
const crypto = require('crypto');

// @desc    Phụ xe nộp báo cáo thống kê hành khách sau chuyến đi
// @route   POST /api/users/attendant/trip-reports
// @access  Private (Attendant, Ops Manager, Admin)
exports.submitTripReport = async (req, res) => {
  try {
    const { tripId, notes } = req.body;
    if (!tripId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã chuyến xe (tripId).' });
    }

    const trip = await Trip.findById(tripId).populate('routeId busId');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe tương ứng.' });
    }

    // Kiểm tra xem báo cáo đã tồn tại và đã được ký duyệt chưa
    let report = await TripReport.findOne({ tripId });
    if (report && report.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Báo cáo chuyến xe này đã được Quản lý Vận tải ký duyệt điện tử, không thể chỉnh sửa lại.'
      });
    }

    // Lấy danh sách booking của chuyến xe
    const bookings = await Booking.find({ tripId }).sort({ seats: 1 }).lean();

    const totalSeats = trip.busId?.capacity || 16;
    const totalBooked = bookings.length;
    const totalBoarded = bookings.filter(b => b.boarded).length;
    const totalNoShow = Math.max(0, totalBooked - totalBoarded);
    const occupancyRate = totalSeats > 0 ? Math.round((totalBoarded / totalSeats) * 100) : 0;

    const passengerSnapshots = bookings.map(b => ({
      bookingId: b._id,
      seats: b.seats || [],
      customerName: b.customerName || 'Khách vãng lai',
      customerPhone: b.customerPhone || '',
      customerCCCD: b.customerCCCD || '',
      pickup: b.pickup || '',
      dropoff: b.dropoff || '',
      boarded: !!b.boarded,
      boardedAt: b.boardedAt || null,
      pricePerSeat: b.pricePerSeat || trip.price || 0,
      totalAmount: b.totalAmount || ((trip.price || 0) * (b.seats?.length || 1))
    }));

    const dateStr = new Date(trip.departureTime || Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
    const shortTripId = trip._id.toString().slice(-4).toUpperCase();
    const reportCode = `BC-CX-${dateStr}-${shortTripId}`;

    const routeInfo = {
      startPoint: trip.routeId?.startPoint || '',
      endPoint: trip.routeId?.endPoint || '',
      routeName: `${trip.routeId?.startPoint || ''} - ${trip.routeId?.endPoint || ''}`,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      plateNumber: trip.busId?.plateNumber || '',
      busType: trip.busId?.type || '',
      driverName: trip.driver?.name || '',
      driverPhone: trip.driver?.phone || '',
      assistantName: trip.assistant?.name || req.user?.name || '',
      assistantPhone: trip.assistant?.phone || req.user?.phone || ''
    };

    if (!report) {
      report = new TripReport({
        reportCode,
        tripId: trip._id,
        routeInfo,
        attendantId: req.user?._id,
        submissionType: 'manual',
        submittedAt: new Date(),
        notes: notes || '',
        stats: {
          totalSeats,
          totalBooked,
          totalBoarded,
          totalNoShow,
          occupancyRate
        },
        passengers: passengerSnapshots,
        approvalStatus: 'pending'
      });
    } else {
      // Cập nhật lại số liệu nếu nộp lại trước khi Quản lý ký
      report.routeInfo = routeInfo;
      report.submittedAt = new Date();
      report.notes = notes !== undefined ? notes : report.notes;
      report.stats = {
        totalSeats,
        totalBooked,
        totalBoarded,
        totalNoShow,
        occupancyRate
      };
      report.passengers = passengerSnapshots;
      report.submissionType = 'manual';
      report.approvalStatus = 'pending';
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Gửi báo cáo thống kê hành khách chuyến đi thành công. Báo cáo đang chờ Quản lý Vận tải ký duyệt.',
      report
    });
  } catch (error) {
    console.error('Lỗi khi nộp báo cáo chuyến xe:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi nộp báo cáo chuyến xe: ' + error.message
    });
  }
};

// @desc    Lấy báo cáo theo tripId (cho Phụ xe kiểm tra trạng thái chuyến đang chọn)
// @route   GET /api/users/attendant/trip-reports/by-trip/:tripId
// @access  Private (Attendant, Ops Manager, Admin)
exports.getTripReportByTripId = async (req, res) => {
  try {
    const { tripId } = req.params;
    const report = await TripReport.findOne({ tripId })
      .populate('attendantId', 'name phone email role')
      .populate('approvedBy', 'name phone email role')
      .lean();

    if (!report) {
      return res.status(200).json({
        success: true,
        hasReport: false,
        report: null
      });
    }

    res.status(200).json({
      success: true,
      hasReport: true,
      report
    });
  } catch (error) {
    console.error('Lỗi khi lấy báo cáo theo chuyến:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tra cứu báo cáo: ' + error.message });
  }
};

// @desc    Lấy danh sách các báo cáo chuyến xe (cho Quản lý Vận tải & Phụ xe)
// @route   GET /api/users/ops/trip-reports
// @access  Private (Ops Manager, Attendant, General Manager, Admin)
exports.getTripReports = async (req, res) => {
  try {
    const { date, status, submissionType, search } = req.query;
    let query = {};

    // Phụ xe chỉ xem được các báo cáo của chuyến mình phụ trách
    if (req.user?.role === 'attendant') {
      query.$or = [
        { attendantId: req.user._id },
        { 'routeInfo.assistantPhone': req.user.phone }
      ];
    }

    if (status && status !== 'all') {
      query.approvalStatus = status;
    }

    if (submissionType && submissionType !== 'all') {
      query.submissionType = submissionType;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.submittedAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { reportCode: searchRegex },
          { 'routeInfo.routeName': searchRegex },
          { 'routeInfo.plateNumber': searchRegex },
          { 'routeInfo.assistantName': searchRegex },
          { 'routeInfo.driverName': searchRegex }
        ]
      });
    }

    const reports = await TripReport.find(query)
      .populate('tripId')
      .populate('attendantId', 'name phone email role')
      .populate('approvedBy', 'name phone email role')
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách báo cáo chuyến xe:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách báo cáo: ' + error.message });
  }
};

// @desc    Lấy chi tiết một báo cáo chuyến xe theo ID
// @route   GET /api/users/ops/trip-reports/:id
// @access  Private (Ops Manager, Attendant, General Manager, Admin)
exports.getTripReportById = async (req, res) => {
  try {
    const report = await TripReport.findById(req.params.id)
      .populate('tripId')
      .populate('attendantId', 'name phone email role')
      .populate('approvedBy', 'name phone email role')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo chuyến xe.' });
    }

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết báo cáo:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tải chi tiết báo cáo: ' + error.message });
  }
};

// @desc    Quản lý vận tải ký duyệt báo cáo chuyến xe bằng Chữ ký điện tử
// @route   PATCH /api/users/ops/trip-reports/:id/sign
// @access  Private (Ops Manager, General Manager, Admin)
exports.signTripReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, approvalNotes } = req.body;

    const report = await TripReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo chuyến xe cần ký duyệt.' });
    }

    if (report.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Báo cáo này đã được ký duyệt điện tử trước đó vào lúc ' + new Date(report.approvedAt).toLocaleString('vi-VN')
      });
    }

    if (approvalStatus === 'approved') {
      const signedAt = new Date();
      // Tạo mã băm toàn vẹn dữ liệu (Digital Signature Hash - SHA256 HMAC)
      const secret = process.env.JWT_SECRET || 'anbinhlines_signature_salt';
      const payload = `${report.reportCode}|${report.tripId}|${report.stats?.totalBoarded}|${req.user.name}|${req.user.phone}|${signedAt.toISOString()}`;
      const signatureHash = crypto.createHmac('sha256', secret).update(payload).digest('hex').toUpperCase();

      const year = signedAt.getFullYear();
      const month = String(signedAt.getMonth() + 1).padStart(2, '0');
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const certificateCode = `AB-DS-${year}${month}-${randomSuffix}`;

      report.approvalStatus = 'approved';
      report.approvedBy = req.user._id;
      report.approvedAt = signedAt;
      report.approvalNotes = approvalNotes || 'Đã kiểm tra đối soát danh sách hành khách thực tế lên xe và ký duyệt điện tử.';
      report.digitalSignature = {
        isSigned: true,
        signerName: req.user.name,
        signerRole: 'Quản lý Vận tải',
        signerPhone: req.user.phone,
        signedAt,
        signatureHash,
        certificateCode
      };
    } else if (approvalStatus === 'rejected') {
      report.approvalStatus = 'rejected';
      report.approvedBy = req.user._id;
      report.approvedAt = new Date();
      report.approvalNotes = approvalNotes || 'Từ chối duyệt báo cáo. Yêu cầu phụ xe kiểm tra lại số liệu hành khách.';
      report.digitalSignature = {
        isSigned: false,
        signerName: '',
        signerRole: '',
        signerPhone: '',
        signedAt: null,
        signatureHash: '',
        certificateCode: ''
      };
    } else {
      return res.status(400).json({ success: false, message: 'Trạng thái ký duyệt không hợp lệ (approved hoặc rejected).' });
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: approvalStatus === 'approved' 
        ? 'Ký duyệt báo cáo chuyến xe bằng Chữ ký điện tử thành công!'
        : 'Đã từ chối duyệt báo cáo chuyến xe.',
      report
    });
  } catch (error) {
    console.error('Lỗi khi ký duyệt báo cáo:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi ký duyệt: ' + error.message });
  }
};

// @desc    Quét và tự động chốt danh sách hành khách lúc 00:00 (Midnight Auto-Submit)
// @route   POST /api/users/ops/trip-reports/auto-midnight-check
// @access  Private (Ops Manager, Admin)
exports.autoMidnightCheck = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    // Tìm các chuyến xe đã hoàn thành hoặc có giờ đến trước hiện tại mà phụ xe chưa gửi báo cáo
    const eligibleTrips = await Trip.find({
      departureTime: { $gte: todayStart, $lte: now },
      $or: [
        { journeyStatus: 'completed' },
        { arrivalTime: { $lte: now } }
      ]
    }).populate('routeId busId');

    let createdCount = 0;
    const createdReports = [];

    for (const trip of eligibleTrips) {
      const existing = await TripReport.findOne({ tripId: trip._id });
      if (!existing) {
        // Tìm phụ xe
        let attendantUser = null;
        if (trip.assistant?.phone) {
          attendantUser = await User.findOne({ phone: trip.assistant.phone }).lean();
        }

        const bookings = await Booking.find({ tripId: trip._id }).sort({ seats: 1 }).lean();
        const totalSeats = trip.busId?.capacity || 16;
        const totalBooked = bookings.length;
        const totalBoarded = bookings.filter(b => b.boarded).length;
        const totalNoShow = Math.max(0, totalBooked - totalBoarded);
        const occupancyRate = totalSeats > 0 ? Math.round((totalBoarded / totalSeats) * 100) : 0;

        const passengerSnapshots = bookings.map(b => ({
          bookingId: b._id,
          seats: b.seats || [],
          customerName: b.customerName || 'Khách vãng lai',
          customerPhone: b.customerPhone || '',
          customerCCCD: b.customerCCCD || '',
          pickup: b.pickup || '',
          dropoff: b.dropoff || '',
          boarded: !!b.boarded,
          boardedAt: b.boardedAt || null,
          pricePerSeat: b.pricePerSeat || trip.price || 0,
          totalAmount: b.totalAmount || ((trip.price || 0) * (b.seats?.length || 1))
        }));

        const dateStr = new Date(trip.departureTime || Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
        const shortTripId = trip._id.toString().slice(-4).toUpperCase();
        const reportCode = `BC-CX-${dateStr}-${shortTripId}`;

        const newReport = new TripReport({
          reportCode,
          tripId: trip._id,
          routeInfo: {
            startPoint: trip.routeId?.startPoint || '',
            endPoint: trip.routeId?.endPoint || '',
            routeName: `${trip.routeId?.startPoint || ''} - ${trip.routeId?.endPoint || ''}`,
            departureTime: trip.departureTime,
            arrivalTime: trip.arrivalTime,
            plateNumber: trip.busId?.plateNumber || '',
            busType: trip.busId?.type || '',
            driverName: trip.driver?.name || '',
            driverPhone: trip.driver?.phone || '',
            assistantName: trip.assistant?.name || (attendantUser?.name || 'Chưa cập nhật'),
            assistantPhone: trip.assistant?.phone || (attendantUser?.phone || '')
          },
          attendantId: attendantUser?._id || null,
          submissionType: 'auto_midnight',
          submittedAt: new Date(),
          notes: 'Hệ thống tự động chốt danh sách hành khách lúc 00:00 do nhân viên phụ xe chưa gửi báo cáo thủ công.',
          stats: {
            totalSeats,
            totalBooked,
            totalBoarded,
            totalNoShow,
            occupancyRate
          },
          passengers: passengerSnapshots,
          approvalStatus: 'pending'
        });

        await newReport.save();
        createdReports.push(newReport);
        createdCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Đã kiểm tra ${eligibleTrips.length} chuyến xe hôm nay. Đã tự động chốt và tạo ${createdCount} báo cáo chuyến đi lúc 00:00.`,
      createdCount,
      reports: createdReports
    });
  } catch (error) {
    console.error('Lỗi khi chạy quét tự động chốt đêm:', error);
    res.status(500).json({ success: false, message: 'Lỗi tự động chốt đêm: ' + error.message });
  }
};

