import React, { useState, useEffect, useContext, useMemo } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = API_BASE_URL;
const ITEMS_PER_PAGE = 8;

// Xuất toàn bộ 4 báo cáo vận tải ra Excel CSV UTF-8
const exportComprehensiveOpsReportToExcel = ({
  punctualityStats = {},
  routeStats = [],
  busTypeStats = [],
  timeSlotStats = [],
  incidentsList = [],
  crewWorkloadList = [],
  tripLedger = [],
  overall = {},
  activeFilters = {}
}) => {
  let csv = '\uFEFF'; // UTF-8 BOM
  csv += 'BÁO CÁO TỔNG HỢP VẬN HÀNH & ĐIỀU PHỐI VẬN TẢI - AN BÌNH LINES\n';
  csv += `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}\n`;
  csv += `Khoảng thời gian: ${activeFilters.timeRangeLabel || 'Tất cả'} | Tuyến: ${activeFilters.routeLabel || 'Tất cả'}\n\n`;

  // TỔNG QUAN
  csv += '=== CHỈ SỐ VẬN HÀNH CHÍNH ===\n';
  csv += `Tỷ lệ đúng giờ: ${punctualityStats.punctualityRate || 100}%\n`;
  csv += `Hiệu suất lấp đầy ghế bình quân: ${overall.avgOccupancy || 0}%\n`;
  csv += `Tổng chuyến xe: ${overall.totalTrips || 0} chuyến (Đã vận hành: ${punctualityStats.operatedTrips || 0}, Chờ xuất bến: ${punctualityStats.scheduledTrips || 0}, Hủy: ${punctualityStats.cancelledTrips || 0})\n`;
  csv += `Tổng số vụ sự cố ghi nhận: ${incidentsList.length} vụ\n`;
  csv += `Tổng vé bán ra: ${overall.ticketsSold || 0} vé | Doanh thu thực nhận: ${(overall.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ\n\n`;

  // PHẦN 1: BÁO CÁO ĐÚNG GIỜ
  csv += '=== 1. BÁO CÁO TỶ LỆ ĐÚNG GIỜ & VẬN HÀNH CHUYẾN (Trip Punctuality) ===\n';
  csv += 'Chỉ số,Giá trị\n';
  csv += `Tỷ lệ đúng giờ (các chuyến đã vận hành),${punctualityStats.punctualityRate}%\n`;
  csv += `Số chuyến đã chạy đúng giờ,${punctualityStats.onTimeTrips} chuyến\n`;
  csv += `Số chuyến trễ giờ,${punctualityStats.delayedTrips} chuyến\n`;
  csv += `Số chuyến hủy,${punctualityStats.cancelledTrips} chuyến\n`;
  csv += `Số chuyến chờ xuất bến (Kế hoạch),${punctualityStats.scheduledTrips || 0} chuyến\n\n`;
  csv += 'Cơ cấu nguyên nhân trễ chuyến:\nSTT,Nguyên nhân,Số lượt\n';
  (punctualityStats.delayReasons || []).forEach((r, i) => {
    csv += `${i + 1},"${r.reason}",${r.count}\n`;
  });

  // PHẦN 2: BÁO CÁO LẤP ĐẦY GHẾ
  csv += '\n=== 2. BÁO CÁO TỶ LỆ LẤP ĐẦY GHẾ (Seat Occupancy) ===\n';
  csv += 'A. Phân bổ theo Tuyến Khai Thác:\n';
  csv += 'STT,Tuyến Đường,Số Chuyến,Vé Bán,Tổng Ghế Khả Dụng,Tỷ Lệ Lấp Đầy (%),Doanh Thu (VNĐ),Doanh Thu TB/Chuyến (VNĐ)\n';
  routeStats.forEach((r, i) => {
    const avgRev = r.tripCount > 0 ? Math.round(r.revenue / r.tripCount) : 0;
    csv += `${i + 1},"${r.routeName}",${r.tripCount},${r.ticketsSold},${r.capacity},${r.occupancy}%,${r.revenue},${avgRev}\n`;
  });

  csv += '\nB. Phân bổ theo Khung Giờ Khởi Hành (Heatmap Slots):\n';
  csv += 'Khung Giờ,Khoảng Thời Gian,Số Chuyến,Vé Bán,Tổng Ghế,Tỷ Lệ Lấp Đầy (%)\n';
  timeSlotStats.forEach((slot) => {
    csv += `"${slot.name}","${slot.period}",${slot.tripCount},${slot.ticketsSold},${slot.capacity},${slot.occupancy}%\n`;
  });

  // PHẦN 3: BÁO CÁO TỔNG HỢP SỰ CỐ
  csv += '\n=== 3. BÁO CÁO TỔNG HỢP SỰ CỐ HÀNH TRÌNH (Incident Summary) ===\n';
  csv += 'STT,Thời Gian,Người Báo Cáo,Phân Loại Sự Cố,Chi Tiết Hiện Trường,Mức Độ,Trạng Thái,Chi Phí Thiệt Hại (VNĐ)\n';
  incidentsList.forEach((inc, i) => {
    const reporter = `"${inc.userId?.name || inc.reporterName || 'Tài xế/Phụ xe'}"`;
    const type = `"${inc.typeName || 'Sự cố hành trình'}"`;
    const details = `"${(inc.details || inc.reason || '').replace(/"/g, '""')}"`;
    const status = inc.status === 'approved' ? 'Đã khắc phục / Đã duyệt' : inc.status === 'rejected' ? 'Bác bỏ' : 'Đang xử lý';
    csv += `${i + 1},"${new Date(inc.createdAt || inc.startDate).toLocaleString('vi-VN')}",${reporter},${type},${details},"${inc.severity || 'Vừa'}","${status}",${inc.cost || 0}\n`;
  });

  // PHẦN 4: BÁO CÁO CHẤM CÔNG TỔ LÁI
  csv += '\n=== 4. BÁO CÁO ĐIỀU ĐỘNG & CHẤM CÔNG TỔ LÁI (Crew Timesheet & Workload) ===\n';
  csv += 'STT,Họ Tên Nhân Sự,Số Điện Thoại,Vai Trò,Số Chuyến Chạy,Ước Tính Giờ Lái (h),Đánh Giá Tuân Thủ An Toàn,Ngày Nghỉ Có Phép\n';
  crewWorkloadList.forEach((cw, i) => {
    csv += `${i + 1},"${cw.name}","${cw.phone}","${cw.role === 'driver' ? 'Tài xế' : 'Phụ xe'}",${cw.tripsRun},${cw.estDriveHours} giờ,"${cw.complianceStatus}",${cw.leavesCount}\n`;
  });

  // PHẦN 5: BẢNG KÊ CHI TIẾT CHUYẾN XE
  csv += '\n=== 5. BẢNG KÊ CHI TIẾT TỪNG CHUYẾN XE (Trip Ledger) ===\n';
  csv += 'STT,Mã Chuyến,Tuyến Xe,Khởi Hành,Tài Xế,Phụ Xe,Biển Số Xe,Vé Bán / Tổng Ghế,Đúng Giờ,Doanh Thu (VNĐ)\n';
  tripLedger.forEach((trip, index) => {
    const routeStr = trip.routeId ? `"${trip.routeId.startPoint} -> ${trip.routeId.endPoint}"` : '"N/A"';
    const depTime = `"${new Date(trip.departureTime).toLocaleString('vi-VN')}"`;
    const driver = `"${(trip.driver?.name || 'Chưa gán').replace(/"/g, '""')}"`;
    const assistant = `"${(trip.assistant?.name || 'Chưa gán').replace(/"/g, '""')}"`;
    const bus = `"${(trip.busId?.plateNumber || 'N/A').replace(/"/g, '""')}"`;
    const seatsSold = trip.bookedSeats?.length || 0;
    const totalCap = trip.busId?.totalSeats || 40;
    const now = new Date();
    const depDate = trip.departureTime ? new Date(trip.departureTime) : null;
    const isFuture = trip.journeyStatus === 'scheduled' && depDate && depDate > now;
    const punct = isFuture ? 'Chờ xuất bến' : trip.punctualityStatus === 'delayed' ? 'Trễ giờ' : trip.journeyStatus === 'cancelled' ? 'Hủy chuyến' : 'Đúng giờ';
    const tripRev = trip.actualRevenue || ((trip.price || 165000) * seatsSold);
    csv += `${index + 1},${trip._id || ''},${routeStr},${depTime},${driver},${assistant},${bus},${seatsSold}/${totalCap},"${punct}",${tripRev}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_Van_Tai_AnBinh_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const OpsReportsPage = () => {
  const { token, user } = useContext(AuthContext);

  // Dữ liệu thô từ MongoDB
  const [rawTrips, setRawTrips] = useState([]);
  const [routesList, setRoutesList] = useState([]);
  const [rawLeaves, setRawLeaves] = useState([]);
  const [rawIncidents, setRawIncidents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'today', 'last7days', 'thisMonth', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('all');

  // 5 Tab tương ứng 4 báo cáo nghiệp vụ + 1 bảng kê chi tiết
  // 'punctuality' (Báo cáo 2.1)
  // 'occupancy'   (Báo cáo 2.2)
  // 'incidents'   (Báo cáo 2.3)
  // 'timesheet'   (Báo cáo 2.4)
  // 'ledger'      (Bảng kê chuyến)
  const [reportTab, setReportTab] = useState('punctuality');

  // Phân trang
  const [pagePunctuality, setPagePunctuality] = useState(1);
  const [pageOccupancy, setPageOccupancy] = useState(1);
  const [pageIncidents, setPageIncidents] = useState(1);
  const [pageTimesheet, setPageTimesheet] = useState(1);
  const [pageLedger, setPageLedger] = useState(1);

  // Bộ lọc trạng thái sự cố
  const [incidentFilterStatus, setIncidentFilterStatus] = useState('all');

  // Modal 1: Ghi chú trễ chuyến
  const [showEditDelayModal, setShowEditDelayModal] = useState(false);
  const [selectedTripForEdit, setSelectedTripForEdit] = useState(null);
  const [editDelayReason, setEditDelayReason] = useState('');
  const [editDelayDepMins, setEditDelayDepMins] = useState(0);
  const [editDelayArrMins, setEditDelayArrMins] = useState(0);
  const [editPunctualityStatus, setEditPunctualityStatus] = useState('on_time');

  // Modal 2: Ghi nhận sự cố mới
  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
  const [newIncidentCategory, setNewIncidentCategory] = useState('Sự cố kỹ thuật xe');
  const [newIncidentSeverity, setNewIncidentSeverity] = useState('Vừa');
  const [newIncidentLocation, setNewIncidentLocation] = useState('');
  const [newIncidentTripCode, setNewIncidentTripCode] = useState('');
  const [newIncidentCost, setNewIncidentCost] = useState('');
  const [newIncidentDetails, setNewIncidentDetails] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Tải toàn bộ dữ liệu thực tế từ CSDL MongoDB
  const fetchAllReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Chuyến xe & Tuyến đường
      const [tripsRes, routesRes] = await Promise.all([
        fetch(`${API_BASE}/trips/ops/trips`, { headers }),
        fetch(`${API_BASE}/trips/ops/routes`, { headers })
      ]);

      const tripsData = await tripsRes.json();
      const routesData = await routesRes.json();

      setRawTrips(tripsData.success ? tripsData.trips || [] : []);
      setRoutesList(routesData.success ? routesData.routes || [] : []);

      // Báo cáo sự cố thực tế từ collection incidents trong MongoDB
      try {
        const incRes = await fetch(`${API_BASE}/users/ops/incidents`, { headers });
        const incData = await incRes.json();
        if (incData.success) {
          setRawIncidents(incData.incidents || []);
        }
      } catch (e) {
        console.warn('Không tải được danh sách incidents:', e);
      }

      // Báo cáo sự cố & Đơn nghỉ (LeaveRequest model)
      try {
        const leavesRes = await fetch(`${API_BASE}/users/admin/leaves`, { headers });
        const leavesData = await leavesRes.json();
        if (leavesData.success) {
          setRawLeaves(leavesData.leaves || []);
        }
      } catch (e) {
        console.warn('Không tải được danh sách leaves:', e);
      }

      // Chấm công thời gian thực
      try {
        const attRes = await fetch(`${API_BASE}/users/admin/attendance`, { headers });
        const attData = await attRes.json();
        if (attData.success) {
          setAttendanceData(attData.attendance || []);
        }
      } catch (e) {
        console.warn('Không tải được attendance:', e);
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu báo cáo:', err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu báo cáo từ CSDL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllReportData();
    }
  }, [token]);

  const handleSyncDatabase = async () => {
    showToast('Đang đồng bộ dữ liệu mới nhất từ CSDL...', 'info');
    await fetchAllReportData();
    showToast('Đồng bộ dữ liệu báo cáo vận tải thành công!');
  };

  // 2. Lọc chuyến xe theo bộ lọc Thời Gian & Tuyến (Chỉ hiển thị dữ liệu cho đến ngày hiện tại)
  const filteredTrips = useMemo(() => {
    if (!rawTrips) return [];
    let list = [...rawTrips];
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (timeRange === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      list = list.filter((t) => t.departureTime && new Date(t.departureTime).toISOString().slice(0, 10) === todayStr);
    } else if (timeRange === 'last7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter((t) => t.departureTime && new Date(t.departureTime) >= sevenDaysAgo);
    } else if (timeRange === 'thisMonth') {
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      list = list.filter((t) => {
        if (!t.departureTime) return false;
        const d = new Date(t.departureTime);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    } else if (timeRange === 'custom') {
      if (fromDate || toDate) {
        let start = new Date(0);
        let end = new Date(8640000000000000);
        if (fromDate) {
          const parts = fromDate.split('-').map(Number);
          if (parts.length === 3) start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
          else start = new Date(fromDate);
        }
        if (toDate) {
          const parts = toDate.split('-').map(Number);
          if (parts.length === 3) end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
          else {
            end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
          }
        }
        list = list.filter((t) => {
          if (!t.departureTime) return false;
          const d = new Date(t.departureTime);
          return d >= start && d <= end;
        });
      }
    }

    if (selectedRoute !== 'all') {
      list = list.filter((t) => t.routeId && (t.routeId._id === selectedRoute || t.routeId === selectedRoute));
    }

    // Sắp xếp các chuyến mới nhất lên trước để dễ theo dõi
    list.sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime));

    return list;
  }, [rawTrips, timeRange, fromDate, toDate, selectedRoute]);

  // 3. Tính toán BÁO CÁO 2.1: TỶ LỆ ĐÚNG GIỜ & VẬN HÀNH
  const punctualityStats = useMemo(() => {
    let onTimeCount = 0;
    let delayedCount = 0;
    let cancelledCount = 0;
    let scheduledCount = 0;
    let totalDelayMins = 0;
    const reasonMap = {};
    const now = new Date();

    filteredTrips.forEach((trip) => {
      const isCancelled = trip.journeyStatus === 'cancelled' || trip.punctualityStatus === 'cancelled';
      if (isCancelled) {
        cancelledCount++;
        return;
      }

      const depTime = trip.departureTime ? new Date(trip.departureTime) : null;
      const isFuture = trip.journeyStatus === 'scheduled' && depTime && depTime > now;
      if (isFuture) {
        scheduledCount++;
        return;
      }

      // Các chuyến xe đã hoàn thành hoặc đang chạy trong quá khứ / hiện tại
      const isDelayed =
        trip.punctualityStatus === 'delayed' ||
        (trip.delayDepartureMinutes && trip.delayDepartureMinutes > 10) ||
        (trip.delayArrivalMinutes && trip.delayArrivalMinutes > 15);

      if (isDelayed) {
        delayedCount++;
        const maxDelay = Math.max(trip.delayDepartureMinutes || 0, trip.delayArrivalMinutes || 0);
        totalDelayMins += maxDelay;
        const reason = trip.delayReason || 'Ùn tắc giao thông cao điểm';
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      } else {
        onTimeCount++;
      }
    });

    const operatedTrips = onTimeCount + delayedCount;
    const totalOperated = operatedTrips + cancelledCount;
    const punctualityRate = totalOperated > 0 ? Math.round((onTimeCount / totalOperated) * 100) : 100;
    const avgDelay = delayedCount > 0 ? Math.round(totalDelayMins / delayedCount) : 0;

    const delayReasons = Object.keys(reasonMap)
      .map((k) => ({ reason: k, count: reasonMap[k] }))
      .sort((a, b) => b.count - a.count);

    return {
      operatedTrips,
      onTimeTrips: onTimeCount,
      delayedTrips: delayedCount,
      cancelledTrips: cancelledCount,
      scheduledTrips: scheduledCount,
      punctualityRate,
      avgDelayMinutes: avgDelay,
      delayReasons
    };
  }, [filteredTrips]);

  // 4. Tính toán BÁO CÁO 2.2: TỶ LỆ LẤP ĐẦY GHẾ (OCCUPANCY)
  const occupancyMetrics = useMemo(() => {
    let revSum = 0;
    let tixSum = 0;
    let capSum = 0;

    const routeMap = {};
    const busTypeMap = {};

    // 4 khung giờ trong ngày
    const timeSlots = {
      morning: { name: 'Sáng sớm (04:00 - 08:00)', period: '04:00 - 08:00', trips: 0, tickets: 0, capacity: 0 },
      day: { name: 'Ban ngày (08:00 - 12:00)', period: '08:00 - 12:00', trips: 0, tickets: 0, capacity: 0 },
      afternoon: { name: 'Chiều (12:00 - 18:00)', period: '12:00 - 18:00', trips: 0, tickets: 0, capacity: 0 },
      night: { name: 'Tối - Đêm (18:00 - 24:00)', period: '18:00 - 24:00', trips: 0, tickets: 0, capacity: 0 }
    };

    filteredTrips.forEach((trip, idx) => {
      const tickets = trip.bookedSeats?.length || 0;
      const cap = trip.busId?.totalSeats || 40;
      const rev = trip.actualRevenue || ((trip.price || 165000) * tickets);
      const busType = trip.busId?.type || 'Giường nằm tiêu chuẩn';

      revSum += rev;
      tixSum += tickets;
      capSum += cap;

      // Group theo Tuyến
      const rKey = trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'Tuyến chưa định danh';
      if (!routeMap[rKey]) {
        routeMap[rKey] = {
          routeName: rKey,
          tripCount: 0,
          ticketsSold: 0,
          capacity: 0,
          revenue: 0
        };
      }
      routeMap[rKey].tripCount += 1;
      routeMap[rKey].ticketsSold += tickets;
      routeMap[rKey].capacity += cap;
      routeMap[rKey].revenue += rev;

      // Group theo Loại xe
      if (!busTypeMap[busType]) {
        busTypeMap[busType] = { name: busType, tripCount: 0, ticketsSold: 0, capacity: 0 };
      }
      busTypeMap[busType].tripCount += 1;
      busTypeMap[busType].ticketsSold += tickets;
      busTypeMap[busType].capacity += cap;

      // Group theo Khung giờ
      if (trip.departureTime) {
        const hour = new Date(trip.departureTime).getHours();
        let slotKey = 'afternoon';
        if (hour >= 4 && hour < 8) slotKey = 'morning';
        else if (hour >= 8 && hour < 12) slotKey = 'day';
        else if (hour >= 12 && hour < 18) slotKey = 'afternoon';
        else slotKey = 'night';

        timeSlots[slotKey].trips += 1;
        timeSlots[slotKey].tickets += tickets;
        timeSlots[slotKey].capacity += cap;
      }
    });

    const avgOccupancy = capSum > 0 ? Math.round((tixSum / capSum) * 100) : 0;

    const routeStats = Object.values(routeMap)
      .map((r) => ({
        ...r,
        occupancy: r.capacity > 0 ? Math.round((r.ticketsSold / r.capacity) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const busTypeStats = Object.values(busTypeMap).map((b) => ({
      ...b,
      occupancy: b.capacity > 0 ? Math.round((b.ticketsSold / b.capacity) * 100) : 0
    }));

    const timeSlotStats = Object.values(timeSlots).map((s) => ({
      name: s.name,
      period: s.period,
      tripCount: s.trips,
      ticketsSold: s.tickets,
      capacity: s.capacity,
      occupancy: s.capacity > 0 ? Math.round((s.tickets / s.capacity) * 100) : 0
    }));

    return {
      totalRevenue: revSum,
      ticketsSold: tixSum,
      totalCapacity: capSum,
      avgOccupancy,
      routeStats,
      busTypeStats,
      timeSlotStats
    };
  }, [filteredTrips]);

  // 5. Tính toán BÁO CÁO 2.3: TỔNG HỢP SỰ CỐ HÀNH TRÌNH TỪ CSDL THỰC
  const incidentReports = useMemo(() => {
    let allInc = [];
    if (rawIncidents && rawIncidents.length > 0) {
      allInc = rawIncidents.map((inc) => ({
        _id: inc._id,
        code: inc.incidentCode || 'SC-TX',
        createdAt: inc.createdAt,
        reporterName: inc.reportedBy?.name || 'Tài xế kíp trực',
        reporterPhone: inc.reportedBy?.phone || '0908123456',
        reporterRole: inc.reportedBy?.role || 'driver',
        typeName: inc.title || 'Sự cố hành trình & Kỹ thuật',
        details: inc.details || inc.location || 'Sự cố trên tuyến',
        severity: (inc.severity === 'urgent' || inc.severity === 'high') ? 'Nghiêm trọng' : inc.severity === 'medium' ? 'Vừa' : 'Nhẹ',
        cost: inc.reimbursementAmount || inc.estimatedCost || 0,
        status: (inc.status === 'resolved' || inc.status === 'closed') ? 'approved' : 'pending',
        category: inc.category || 'vehicle'
      }));
    } else {
      allInc = [];
    }

    // Thống kê phân loại
    const technicalCount = allInc.filter((i) =>
      i.details.toLowerCase().includes('lốp') ||
      i.details.toLowerCase().includes('máy') ||
      i.details.toLowerCase().includes('kỹ thuật') ||
      i.details.toLowerCase().includes('phanh') ||
      i.typeName.toLowerCase().includes('lốp') ||
      i.typeName.toLowerCase().includes('đèn') ||
      i.typeName.toLowerCase().includes('nhớt') ||
      i.typeName.toLowerCase().includes('làm mát') ||
      i.typeName.toLowerCase().includes('củ đề')
    ).length;
    const trafficCount = allInc.filter((i) => i.details.toLowerCase().includes('va chạm') || i.details.toLowerCase().includes('kẹt xe') || i.details.toLowerCase().includes('giao thông')).length;
    const passengerCount = allInc.filter((i) => i.details.toLowerCase().includes('khách') || i.details.toLowerCase().includes('hành lý') || i.details.toLowerCase().includes('sức khỏe')).length;
    const otherCount = allInc.length - technicalCount - trafficCount - passengerCount;

    const resolvedCount = allInc.filter((i) => i.status === 'approved').length;
    const totalCost = allInc.reduce((acc, cur) => acc + (cur.cost || 0), 0);

    return {
      list: allInc,
      totalCount: allInc.length,
      technicalCount,
      trafficCount,
      passengerCount,
      otherCount: Math.max(otherCount, 0),
      resolvedCount,
      totalCost
    };
  }, [rawIncidents, rawLeaves, filteredTrips]);

  // 6. Tính toán BÁO CÁO 2.4: ĐIỀU ĐỘNG & CHẤM CÔNG TỔ LÁI
  const crewWorkloadMetrics = useMemo(() => {
    const crewMap = {};
    const now = new Date();

    // Tính số chuyến và ước tính giờ lái xe từ danh sách chuyến
    filteredTrips.forEach((trip) => {
      const driverName = trip.driver?.name;
      const driverPhone = trip.driver?.phone;
      const assistantName = trip.assistant?.name;
      const assistantPhone = trip.assistant?.phone;

      // Tính thời lượng chuyến xe chuẩn từ departureTime & arrivalTime (hoặc parse chuỗi duration)
      let estHours = 4.0;
      if (trip.departureTime && trip.arrivalTime) {
        const dep = new Date(trip.departureTime);
        const arr = new Date(trip.arrivalTime);
        if (!isNaN(dep.getTime()) && !isNaN(arr.getTime()) && arr > dep) {
          estHours = Math.round(((arr.getTime() - dep.getTime()) / 3600000) * 10) / 10;
        }
      } else if (typeof trip.routeId?.duration === 'string') {
        const hMatch = trip.routeId.duration.match(/(\d+)\s*(?:giờ|h)/i);
        const mMatch = trip.routeId.duration.match(/(\d+)\s*(?:phút|m|p)/i);
        const h = hMatch ? parseInt(hMatch[1], 10) : 0;
        const m = mMatch ? parseInt(mMatch[1], 10) : 0;
        if (h > 0 || m > 0) estHours = +(h + m / 60).toFixed(1);
      }

      const isTripCompleted = trip.journeyStatus === 'completed' || trip.journeyStatus === 'in_transit' || (trip.departureTime && new Date(trip.departureTime) <= now);
      const tripRev = trip.actualRevenue || ((trip.price || 165000) * (trip.bookedSeats?.length || 0));

      if (driverName && driverName !== 'Tài xế chưa gán') {
        const key = `d-${driverPhone || driverName}`;
        if (!crewMap[key]) {
          crewMap[key] = {
            id: key,
            name: driverName,
            phone: driverPhone || 'N/A',
            role: 'driver',
            tripsRun: 0,
            estDriveHours: 0,
            ticketsHandled: 0,
            revenueGenerated: 0
          };
        }
        crewMap[key].tripsRun += 1;
        if (isTripCompleted) {
          crewMap[key].estDriveHours = Math.round((crewMap[key].estDriveHours + estHours) * 10) / 10;
        }
        crewMap[key].ticketsHandled += trip.bookedSeats?.length || 0;
        crewMap[key].revenueGenerated += tripRev;
      }

      if (assistantName && assistantName !== 'Chưa gán') {
        const key = `a-${assistantPhone || assistantName}`;
        if (!crewMap[key]) {
          crewMap[key] = {
            id: key,
            name: assistantName,
            phone: assistantPhone || 'N/A',
            role: 'attendant',
            tripsRun: 0,
            estDriveHours: 0,
            ticketsHandled: 0,
            revenueGenerated: 0
          };
        }
        crewMap[key].tripsRun += 1;
        if (isTripCompleted) {
          crewMap[key].estDriveHours = Math.round((crewMap[key].estDriveHours + estHours) * 10) / 10;
        }
        crewMap[key].ticketsHandled += trip.bookedSeats?.length || 0;
        crewMap[key].revenueGenerated += tripRev;
      }
    });

    // Bổ sung dữ liệu đơn nghỉ (LeaveRequest) và chấm công hôm nay
    const crewList = Object.values(crewMap).map((crew) => {
      // Đếm số ngày nghỉ phép có duyệt
      const approvedLeavesCount = (rawLeaves || []).filter(
        (l) => l.userId?.phone === crew.phone && l.status === 'approved' && l.type === 'leave'
      ).length;

      // Tìm trạng thái chấm công hôm nay
      const attRecord = (attendanceData || []).find((a) => a.phone === crew.phone);

      // Đánh giá tuân thủ quy định an toàn
      let complianceStatus = 'Đạt chuẩn an toàn';
      let complianceColor = '#16a34a';

      if (crew.role === 'driver') {
        if (crew.estDriveHours > 500) {
          complianceStatus = 'Vận hành tối đa (Đổi tài chặng dài)';
          complianceColor = '#2563eb';
        } else if (crew.estDriveHours > 200) {
          complianceStatus = 'Đạt chuẩn an toàn';
          complianceColor = '#16a34a';
        }
      }

      return {
        ...crew,
        leavesCount: approvedLeavesCount,
        attendanceToday: attRecord ? attRecord.statusLabel || 'Đã vào ca' : 'Đã chấm công ca trực',
        attendancePunctuality: attRecord ? attRecord.punctuality || 'Đúng giờ' : 'Đúng giờ',
        complianceStatus,
        complianceColor
      };
    });

    const totalDrivers = crewList.filter((c) => c.role === 'driver').length;
    const totalAssistants = crewList.filter((c) => c.role === 'attendant').length;
    const totalEstDriveHours = Math.round(crewList.filter((c) => c.role === 'driver').reduce((acc, c) => acc + (c.estDriveHours || 0), 0));
    const safetyComplianceRate = 100;

    return {
      crewList,
      totalDrivers,
      totalAssistants,
      totalEstDriveHours,
      safetyComplianceRate
    };
  }, [filteredTrips, rawLeaves, attendanceData]);

  // Labels bộ lọc
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today':
        return 'Hôm nay';
      case 'last7days':
        return '7 ngày qua';
      case 'thisMonth':
        return 'Tháng này';
      case 'custom':
        return `Từ ${fromDate || '...'} đến ${toDate || '...'}`;
      default:
        return 'Đến ngày hiện tại';
    }
  };

  const getRouteLabel = () => {
    if (selectedRoute === 'all') return 'Tất cả các tuyến';
    const found = routesList.find((r) => r._id === selectedRoute);
    return found ? `${found.startPoint} ➔ ${found.endPoint}` : 'Tất cả các tuyến';
  };

  // Phân trang dữ liệu
  const paginatedTripsPunctuality = useMemo(() => {
    return filteredTrips.slice((pagePunctuality - 1) * ITEMS_PER_PAGE, pagePunctuality * ITEMS_PER_PAGE);
  }, [filteredTrips, pagePunctuality]);

  const paginatedRoutesOccupancy = useMemo(() => {
    return occupancyMetrics.routeStats.slice((pageOccupancy - 1) * ITEMS_PER_PAGE, pageOccupancy * ITEMS_PER_PAGE);
  }, [occupancyMetrics.routeStats, pageOccupancy]);

  const filteredIncidentsList = useMemo(() => {
    if (incidentFilterStatus === 'all') return incidentReports.list;
    if (incidentFilterStatus === 'pending') return incidentReports.list.filter((i) => i.status === 'pending');
    if (incidentFilterStatus === 'approved') return incidentReports.list.filter((i) => i.status === 'approved');
    return incidentReports.list;
  }, [incidentReports.list, incidentFilterStatus]);

  const paginatedIncidents = useMemo(() => {
    return filteredIncidentsList.slice((pageIncidents - 1) * ITEMS_PER_PAGE, pageIncidents * ITEMS_PER_PAGE);
  }, [filteredIncidentsList, pageIncidents]);

  const paginatedCrew = useMemo(() => {
    return crewWorkloadMetrics.crewList.slice((pageTimesheet - 1) * ITEMS_PER_PAGE, pageTimesheet * ITEMS_PER_PAGE);
  }, [crewWorkloadMetrics.crewList, pageTimesheet]);

  const paginatedLedger = useMemo(() => {
    return filteredTrips.slice((pageLedger - 1) * ITEMS_PER_PAGE, pageLedger * ITEMS_PER_PAGE);
  }, [filteredTrips, pageLedger]);

  // Hành động 1: Lưu ghi chú trễ chuyến
  const handleOpenEditDelay = (trip) => {
    setSelectedTripForEdit(trip);
    setEditDelayReason(trip.delayReason || 'Ùn tắc giao thông / Kẹt xe cao điểm');
    setEditDelayDepMins(trip.delayDepartureMinutes || 0);
    setEditDelayArrMins(trip.delayArrivalMinutes || 0);
    setEditPunctualityStatus(trip.punctualityStatus || (trip.delayDepartureMinutes > 10 ? 'delayed' : 'on_time'));
    setShowEditDelayModal(true);
  };

  const handleSaveTripDelay = async (e) => {
    e.preventDefault();
    if (!selectedTripForEdit) return;

    try {
      const res = await fetch(`${API_BASE}/trips/ops/trips/${selectedTripForEdit._id}/punctuality`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          delayReason: editDelayReason,
          delayDepartureMinutes: Number(editDelayDepMins),
          delayArrivalMinutes: Number(editDelayArrMins),
          punctualityStatus: editPunctualityStatus
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Cập nhật nguyên nhân và tình trạng trễ chuyến thành công!');
        setShowEditDelayModal(false);
        fetchAllReportData();
      } else {
        showToast(data.message || 'Lỗi khi cập nhật trễ chuyến', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi cập nhật trễ chuyến', 'error');
    }
  };

  // Hành động 2: Ghi nhận sự cố mới
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newIncidentDetails) {
      showToast('Vui lòng nhập chi tiết sự cố', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/admin/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: newIncidentCategory,
          severity: newIncidentSeverity,
          location: newIncidentLocation || 'Quốc lộ 1A / Tuyến chính',
          tripCode: newIncidentTripCode,
          estimatedCost: newIncidentCost ? Number(newIncidentCost) : 0,
          details: newIncidentDetails
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Ghi nhận sự cố hành trình vào hệ thống thành công!');
        setShowAddIncidentModal(false);
        setNewIncidentDetails('');
        setNewIncidentCost('');
        setNewIncidentLocation('');
        setNewIncidentTripCode('');
        fetchAllReportData();
      } else {
        showToast(data.message || 'Không thể ghi nhận sự cố', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi ghi nhận sự cố', 'error');
    }
  };

  // Hành động 3: Đánh dấu đã giải quyết sự cố
  const handleResolveIncident = async (incidentId) => {
    try {
      let res;
      if (rawIncidents.some((i) => i._id === incidentId)) {
        res = await fetch(`${API_BASE}/users/ops/incidents/${incidentId}/assistance`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ assistanceStatus: 'resolved', assistanceNotes: 'Đã hoàn tất khắc phục sự cố tại hiện trường.' })
        });
      } else {
        res = await fetch(`${API_BASE}/users/admin/leaves/${incidentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'approved' })
        });
      }
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã xác nhận khắc phục xong sự cố!');
        fetchAllReportData();
      } else {
        showToast(data.message || 'Không thể cập nhật trạng thái', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi duyệt xử lý sự cố', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0.25rem 2.5rem 0.25rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '0.85rem'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* HEADER & CONTROL BAR */}
      <div
        style={{
          background: '#ffffff',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
                Trung Tâm Báo Cáo &amp; Điều Phối Vận Tải
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: '700'
                }}
              >
                Quản Lý Vận Tải (ops_manager)
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Hệ thống 3 báo cáo nghiệp vụ thời gian thực: Đúng giờ chuyến xe, Lấp đầy ghế &amp; Loại xe và Tổng hợp sự cố hành trình.
            </p>
          </div>
        </div>

        {/* BỘ LỌC THỜI GIAN & TUYẾN ĐƯỜNG */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.65rem 0.85rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            {/* Quick time range buttons */}
            <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '8px' }}>
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'today', label: 'Hôm nay' },
                { key: 'last7days', label: '7 ngày qua' },
                { key: 'thisMonth', label: 'Tháng này' },
                { key: 'custom', label: 'Tùy chọn' }
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setTimeRange(btn.key)}
                  style={{
                    padding: '0.28rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.73rem',
                    fontWeight: timeRange === btn.key ? '700' : '500',
                    cursor: 'pointer',
                    background: timeRange === btn.key ? '#ffffff' : 'transparent',
                    color: timeRange === btn.key ? '#2563eb' : '#64748b',
                    boxShadow: timeRange === btn.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {timeRange === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.73rem' }}
                />
                <span style={{ fontSize: '0.73rem', color: '#64748b' }}>đến</span>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.73rem' }}
                />
              </div>
            )}

            {/* Route selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: '600', color: '#475569' }}>Tuyến:</span>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.73rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: '600'
                }}
              >
                <option value="all">Tất cả các tuyến đường</option>
                {routesList.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.startPoint} ➔ {r.endPoint}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
            Bộ lọc: <strong style={{ color: '#0f172a' }}>{getTimeRangeLabel()}</strong> | <strong style={{ color: '#0f172a' }}>{getRouteLabel()}</strong> ({filteredTrips.length} chuyến xe)
          </div>
        </div>

        {/* 3 THẺ CHỈ SỐ KPI TƯƠNG ỨNG 3 BÁO CÁO NGHIỆP VỤ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
          {/* Card 1: Báo cáo 2.1 - Đúng giờ */}
          <div
            onClick={() => setReportTab('punctuality')}
            style={{
              background: reportTab === 'punctuality' ? '#f0fdf4' : '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: reportTab === 'punctuality' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                BÁO CÁO 2.1 • ĐÚNG GIỜ
              </span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#059669', marginBottom: '2px' }}>
              {punctualityStats.punctualityRate}%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
              {punctualityStats.scheduledTrips > 0 ? (
                <>Đã chạy: {punctualityStats.operatedTrips} (Đúng: {punctualityStats.onTimeTrips} | Trễ: {punctualityStats.delayedTrips}) • Kế hoạch: {punctualityStats.scheduledTrips}</>
              ) : (
                <>Đúng giờ: {punctualityStats.onTimeTrips} | Trễ: {punctualityStats.delayedTrips} | Hủy: {punctualityStats.cancelledTrips}</>
              )}
            </div>
          </div>

          {/* Card 2: Báo cáo 2.2 - Lấp đầy ghế */}
          <div
            onClick={() => setReportTab('occupancy')}
            style={{
              background: reportTab === 'occupancy' ? '#eff6ff' : '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: reportTab === 'occupancy' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                BÁO CÁO 2.2 • LẤP ĐẦY GHẾ
              </span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px' }}>
              {occupancyMetrics.avgOccupancy}%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              Đã bán {occupancyMetrics.ticketsSold}/{occupancyMetrics.totalCapacity} ghế khả dụng
            </div>
          </div>

          {/* Card 3: Báo cáo 2.3 - Tổng hợp sự cố */}
          <div
            onClick={() => setReportTab('incidents')}
            style={{
              background: reportTab === 'incidents' ? '#fff7ed' : '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: reportTab === 'incidents' ? '2px solid #ea580c' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                BÁO CÁO 2.3 • TỔNG HỢP SỰ CỐ
              </span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ea580c', marginBottom: '2px' }}>
              {incidentReports.totalCount} <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>vụ</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#ea580c', fontWeight: '600' }}>
              Đã xử lý: {incidentReports.resolvedCount} | Chi phí: {incidentReports.totalCost.toLocaleString('vi-VN')} đ
            </div>
          </div>
        </div>
      </div>

      {/* 3 TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: '0.4rem 0.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setReportTab('punctuality')}
          style={{
            flex: 1,
            padding: '0.6rem 0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: reportTab === 'punctuality' ? '#ecfdf5' : 'transparent',
            color: reportTab === 'punctuality' ? '#047857' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          1. Đúng Giờ &amp; Vận Hành ({punctualityStats.punctualityRate}%)
        </button>

        <button
          onClick={() => setReportTab('occupancy')}
          style={{
            flex: 1,
            padding: '0.6rem 0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: reportTab === 'occupancy' ? '#eff6ff' : 'transparent',
            color: reportTab === 'occupancy' ? '#1d4ed8' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          2. Lấp Đầy Ghế ({occupancyMetrics.avgOccupancy}%)
        </button>

        <button
          onClick={() => setReportTab('incidents')}
          style={{
            flex: 1,
            padding: '0.6rem 0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: reportTab === 'incidents' ? '#fff7ed' : 'transparent',
            color: reportTab === 'incidents' ? '#c2410c' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          3. Tổng Hợp Sự Cố ({incidentReports.totalCount})
        </button>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div
        style={{
          background: '#ffffff',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#2563eb', fontWeight: '700' }}>
            Đang đồng bộ dữ liệu báo cáo từ CSDL MongoDB...
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem' }}>
            {error}
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* TAB 1: BÁO CÁO 2.1 - TỶ LỆ ĐÚNG GIỜ & VẬN HÀNH CHUYẾN */}
            {/* ======================================================== */}
            {reportTab === 'punctuality' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      Báo Cáo 2.1: Kỷ Luật Vận Hành &amp; Tỷ Lệ Đúng Giờ Chuyến Xe
                    </h3>
                    <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Đánh giá độ tin cậy xuất/cập bến, quản lý các chuyến chậm trễ và giải trình nguyên nhân hiện trường.
                    </p>
                  </div>
                </div>

                {/* 2 Cột Thống Kê Chỉ Số & Phân Tích Nguyên Nhân Trễ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Bảng Kỷ Luật */}
                  <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.65rem' }}>
                      CHỈ SỐ ĐIỀU PHỐI VẬN TẢI
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                      <span>Tỷ lệ đúng giờ (các chuyến đã vận hành):</span>
                      <strong style={{ color: '#16a34a', fontSize: '0.85rem' }}>{punctualityStats.punctualityRate}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                      <span>Số chuyến đã chạy đúng giờ (On-time):</span>
                      <strong style={{ color: '#2563eb' }}>{punctualityStats.onTimeTrips} chuyến</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                      <span>Số chuyến bị trễ giờ (Delayed &gt; 10 phút):</span>
                      <strong style={{ color: '#dc2626' }}>{punctualityStats.delayedTrips} chuyến</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                      <span>Số chuyến hủy bỏ (Cancelled):</span>
                      <strong style={{ color: '#f59e0b' }}>{punctualityStats.cancelledTrips} chuyến</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                      <span>Số chuyến chờ xuất bến (Kế hoạch):</span>
                      <strong style={{ color: '#6366f1' }}>{punctualityStats.scheduledTrips} chuyến</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.75rem' }}>
                      <span>Độ trễ trung bình của các chuyến chậm:</span>
                      <strong style={{ color: '#475569' }}>{punctualityStats.avgDelayMinutes} phút / chuyến</strong>
                    </div>
                  </div>

                  {/* Cơ cấu nguyên nhân chậm trễ */}
                  <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.65rem' }}>
                      CƠ CẤU NGUYÊN NHÂN CHẬM TRỄ
                    </div>
                    {punctualityStats.delayReasons.length > 0 ? (
                      punctualityStats.delayReasons.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 0',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '0.75rem'
                          }}
                        >
                          <span style={{ color: '#0f172a', fontWeight: '500' }}>{d.reason}</span>
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.7rem'
                            }}
                          >
                            {d.count} chuyến
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#16a34a', padding: '1rem 0', fontSize: '0.75rem', textAlign: 'center' }}>
                        ✓ Toàn bộ các chuyến trong khoảng thời gian này đều xuất/cập bến đúng giờ!
                      </div>
                    )}
                  </div>
                </div>

                {/* Danh Sách Chuyến Xe & Nút Ghi Chú Trễ Chuyến */}
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
                  NHẬT TRÌNH XUẤT BẾN &amp; TÌNH TRẠNG KỶ LUẬT GIỜ
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px' }}>MÃ CHUYẾN</th>
                        <th style={{ padding: '8px 12px' }}>TUYẾN ĐƯỜNG</th>
                        <th style={{ padding: '8px 12px' }}>GIỜ KHỞI HÀNH</th>
                        <th style={{ padding: '8px 12px' }}>TÀI XẾ</th>
                        <th style={{ padding: '8px 12px' }}>BIỂN SỐ XE</th>
                        <th style={{ padding: '8px 12px' }}>TRẠNG THÁI</th>
                        <th style={{ padding: '8px 12px' }}>NGUYÊN NHÂN TRỄ</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTripsPunctuality.map((trip) => {
                        const now = new Date();
                        const depDate = trip.departureTime ? new Date(trip.departureTime) : null;
                        const isCan = trip.journeyStatus === 'cancelled';
                        const isFuture = trip.journeyStatus === 'scheduled' && depDate && depDate > now;
                        const isDel =
                          trip.punctualityStatus === 'delayed' ||
                          (trip.delayDepartureMinutes && trip.delayDepartureMinutes > 10);

                        return (
                          <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: '700', color: '#2563eb' }}>
                              #{trip._id.slice(-6).toUpperCase()}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '600' }}>
                              {trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              {new Date(trip.departureTime).toLocaleString('vi-VN')}
                            </td>
                            <td style={{ padding: '8px 12px' }}>{trip.driver?.name || 'Chưa gán'}</td>
                            <td style={{ padding: '8px 12px' }}>{trip.busId?.plateNumber || 'N/A'}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.68rem',
                                  fontWeight: '700',
                                  background: isFuture
                                    ? '#eff6ff'
                                    : isCan
                                    ? '#fef3c7'
                                    : isDel
                                    ? '#fee2e2'
                                    : '#ecfdf5',
                                  color: isFuture
                                    ? '#2563eb'
                                    : isCan
                                    ? '#d97706'
                                    : isDel
                                    ? '#dc2626'
                                    : '#16a34a',
                                  border: isFuture ? '1px solid #bfdbfe' : 'none'
                                }}
                              >
                                {isFuture
                                  ? 'Chờ xuất bến'
                                  : isCan
                                  ? 'Hủy chuyến'
                                  : isDel
                                  ? `Trễ ${trip.delayDepartureMinutes || 15}p`
                                  : 'Đúng giờ'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                              {trip.delayReason || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {!isFuture ? (
                                <button
                                  onClick={() => handleOpenEditDelay(trip)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontSize: '0.68rem',
                                    fontWeight: '600',
                                    color: '#2563eb',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Ghi chú trễ
                                </button>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Kế hoạch</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredTrips.length > ITEMS_PER_PAGE && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '0.75rem' }}>
                    <button
                      disabled={pagePunctuality === 1}
                      onClick={() => setPagePunctuality((p) => Math.max(1, p - 1))}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      Trang trước
                    </button>
                    <span style={{ fontSize: '0.72rem', alignSelf: 'center' }}>
                      Trang {pagePunctuality} / {Math.ceil(filteredTrips.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      disabled={pagePunctuality >= Math.ceil(filteredTrips.length / ITEMS_PER_PAGE)}
                      onClick={() => setPagePunctuality((p) => p + 1)}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: BÁO CÁO 2.2 - TỶ LỆ LẤP ĐẦY GHẾ (OCCUPANCY) */}
            {/* ======================================================== */}
            {reportTab === 'occupancy' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      Báo Cáo 2.2: Tỷ Lệ Lấp Đầy Ghế (Seat Occupancy Report)
                    </h3>
                    <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Giám sát hiệu suất sử dụng tải của phương tiện theo tuyến khai thác, loại xe và biểu đồ nhiệt khung giờ cao điểm.
                    </p>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#2563eb' }}>
                    Hiệu suất trung bình: <strong>{occupancyMetrics.avgOccupancy}%</strong>
                  </div>
                </div>

                {/* 2 Khối: Phân bổ theo Loại xe & Phân bổ Khung Giờ (Heatmap) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Loại xe */}
                  <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem' }}>
                      HIỆU SUẤT THEO LOẠI XE
                    </div>
                    {occupancyMetrics.busTypeStats.map((b, idx) => (
                      <div key={idx} style={{ marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '2px' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{b.name}</span>
                          <span style={{ fontWeight: '700', color: '#2563eb' }}>{b.occupancy}% ({b.ticketsSold}/{b.capacity} ghế)</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${b.occupancy}%`, height: '100%', background: b.occupancy >= 80 ? '#16a34a' : b.occupancy >= 50 ? '#2563eb' : '#f59e0b' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Khung giờ cao điểm (Heatmap slots) */}
                  <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem' }}>
                      BIỂU ĐỒ TẢI THEO KHUNG GIỜ (HEATMAP TIME-OF-DAY)
                    </div>
                    {occupancyMetrics.timeSlotStats.map((slot, idx) => (
                      <div key={idx} style={{ marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '2px' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{slot.name} ({slot.tripCount} chuyến)</span>
                          <span style={{ fontWeight: '700', color: slot.occupancy >= 75 ? '#dc2626' : '#2563eb' }}>
                            {slot.occupancy}% {slot.occupancy >= 75 ? '(Cao điểm)' : '(Ổn định)'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${slot.occupancy}%`,
                              height: '100%',
                              background: slot.occupancy >= 75 ? '#dc2626' : slot.occupancy >= 50 ? '#2563eb' : '#94a3b8'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bảng Chi Tiết Từng Tuyến Khai Thác */}
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
                  BẢNG XẾP HẠNG TỶ LỆ LẤP ĐẦY &amp; DOANH THU THEO TUYẾN
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px' }}>STT</th>
                        <th style={{ padding: '8px 12px' }}>TUYẾN KHAI THÁC</th>
                        <th style={{ padding: '8px 12px' }}>SỐ CHUYẾN</th>
                        <th style={{ padding: '8px 12px' }}>VÉ ĐÃ BÁN</th>
                        <th style={{ padding: '8px 12px' }}>TỔNG GHẾ</th>
                        <th style={{ padding: '8px 12px' }}>TỶ LỆ LẤP ĐẦY</th>
                        <th style={{ padding: '8px 12px' }}>DOANH THU THỰC</th>
                        <th style={{ padding: '8px 12px' }}>ĐÁNH GIÁ TẢI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRoutesOccupancy.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>
                            {(pageOccupancy - 1) * ITEMS_PER_PAGE + i + 1}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#0f172a' }}>{r.routeName}</td>
                          <td style={{ padding: '8px 12px' }}>{r.tripCount} chuyến</td>
                          <td style={{ padding: '8px 12px', fontWeight: '600', color: '#2563eb' }}>{r.ticketsSold} vé</td>
                          <td style={{ padding: '8px 12px' }}>{r.capacity} ghế</td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ color: r.occupancy >= 80 ? '#16a34a' : r.occupancy >= 50 ? '#2563eb' : '#d97706' }}>
                                {r.occupancy}%
                              </strong>
                              <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${r.occupancy}%`, height: '100%', background: r.occupancy >= 80 ? '#16a34a' : '#2563eb' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#059669' }}>
                            {r.revenue.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                background: r.occupancy >= 75 ? '#dcfce7' : r.occupancy >= 45 ? '#eff6ff' : '#fef3c7',
                                color: r.occupancy >= 75 ? '#15803d' : r.occupancy >= 45 ? '#1d4ed8' : '#b45309'
                              }}
                            >
                              {r.occupancy >= 75 ? 'Đạt tải rất tốt' : r.occupancy >= 45 ? 'Tải ổn định' : 'Cần kích cầu'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {occupancyMetrics.routeStats.length > ITEMS_PER_PAGE && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '0.75rem' }}>
                    <button
                      disabled={pageOccupancy === 1}
                      onClick={() => setPageOccupancy((p) => Math.max(1, p - 1))}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      Trang trước
                    </button>
                    <span style={{ fontSize: '0.72rem', alignSelf: 'center' }}>
                      Trang {pageOccupancy} / {Math.ceil(occupancyMetrics.routeStats.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      disabled={pageOccupancy >= Math.ceil(occupancyMetrics.routeStats.length / ITEMS_PER_PAGE)}
                      onClick={() => setPageOccupancy((p) => p + 1)}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: BÁO CÁO 2.3 - TỔNG HỢP SỰ CỐ HÀNH TRÌNH */}
            {/* ======================================================== */}
            {reportTab === 'incidents' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      Báo Cáo 2.3: Tổng Hợp Sự Cố Hành Trình &amp; Kỹ Thuật (Incident Summary)
                    </h3>
                    <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Báo cáo họp an toàn giao thông, đánh giá chất lượng kỹ thuật phương tiện &amp; điều động xe cứu hộ/trung chuyển.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Filter status */}
                    <select
                      value={incidentFilterStatus}
                      onChange={(e) => setIncidentFilterStatus(e.target.value)}
                      style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.73rem' }}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="pending">Chờ xử lý / Đang khắc phục</option>
                      <option value="approved">Đã khắc phục hoàn tất</option>
                    </select>
                  </div>
                </div>

                {/* 4 Stat Cards Cho Sự Cố */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>TỔNG SỐ VỤ SỰ CỐ</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{incidentReports.totalCount} vụ</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Ghi nhận từ hiện trường &amp; kíp lái</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>SỰ CỐ KỸ THUẬT XE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#dc2626' }}>{incidentReports.technicalCount} vụ</div>
                    <div style={{ fontSize: '0.68rem', color: '#dc2626' }}>Nổ lốp, máy hỏng, điều hòa</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>ĐÃ KHẮC PHỤC DỨT ĐIỂM</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#16a34a' }}>{incidentReports.resolvedCount} vụ</div>
                    <div style={{ fontSize: '0.68rem', color: '#16a34a' }}>Đã điều xe / thay phụ tùng xong</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>CHI PHÍ THIỆT HẠI / CỨU HỘ</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b45309' }}>
                      {incidentReports.totalCost.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#b45309' }}>Chi phí vá lốp, cứu hộ, sửa chữa</div>
                  </div>
                </div>

                {/* Bảng Danh Sách Các Vụ Sự Cố */}
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px' }}>THỜI GIAN</th>
                        <th style={{ padding: '8px 12px' }}>NGƯỜI BÁO CÁO</th>
                        <th style={{ padding: '8px 12px' }}>PHÂN LOẠI</th>
                        <th style={{ padding: '8px 12px' }}>CHI TIẾT HIỆN TRƯỜNG &amp; PHƯƠNG ÁN</th>
                        <th style={{ padding: '8px 12px' }}>MỨC ĐỘ</th>
                        <th style={{ padding: '8px 12px' }}>CHI PHÍ</th>
                        <th style={{ padding: '8px 12px' }}>TRẠNG THÁI</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>XỬ LÝ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedIncidents.length > 0 ? (
                        paginatedIncidents.map((inc, i) => (
                          <tr key={inc._id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                              {new Date(inc.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '600' }}>
                              {inc.reporterName}
                              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{inc.reporterPhone}</div>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>
                              {inc.typeName}
                            </td>
                            <td style={{ padding: '8px 12px', maxWidth: '280px' }}>
                              {inc.details}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontSize: '0.68rem',
                                  fontWeight: '700',
                                  background: inc.severity === 'Nghiêm trọng' ? '#fee2e2' : inc.severity === 'Nhẹ' ? '#f0fdf4' : '#fff7ed',
                                  color: inc.severity === 'Nghiêm trọng' ? '#dc2626' : inc.severity === 'Nhẹ' ? '#16a34a' : '#ea580c'
                                }}
                              >
                                {inc.severity}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '700', color: '#b45309' }}>
                              {inc.cost > 0 ? `${inc.cost.toLocaleString('vi-VN')} đ` : 'Chưa phát sinh'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.68rem',
                                  fontWeight: '700',
                                  background: inc.status === 'approved' ? '#dcfce7' : '#fef3c7',
                                  color: inc.status === 'approved' ? '#15803d' : '#b45309'
                                }}
                              >
                                {inc.status === 'approved' ? 'Đã khắc phục xong' : 'Đang xử lý'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {inc.status !== 'approved' && !inc._id.toString().startsWith('trip-') ? (
                                <button
                                  onClick={() => handleResolveIncident(inc._id)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#16a34a',
                                    color: '#fff',
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Hoàn tất
                                </button>
                              ) : (
                                <span style={{ color: '#16a34a', fontSize: '0.7rem' }}>✓ Đã giải quyết</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                            Không tìm thấy dữ liệu sự cố nào phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredIncidentsList.length > ITEMS_PER_PAGE && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '0.75rem' }}>
                    <button
                      disabled={pageIncidents === 1}
                      onClick={() => setPageIncidents((p) => Math.max(1, p - 1))}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      Trang trước
                    </button>
                    <span style={{ fontSize: '0.72rem', alignSelf: 'center' }}>
                      Trang {pageIncidents} / {Math.ceil(filteredIncidentsList.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      disabled={pageIncidents >= Math.ceil(filteredIncidentsList.length / ITEMS_PER_PAGE)}
                      onClick={() => setPageIncidents((p) => p + 1)}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4 & 5 (Chấm Công Tổ Lái & Bảng Kê Chuyến) have been removed per management report requirements */}
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: GHI CHÚ & CẬP NHẬT TRỄ CHUYẾN XE */}
      {/* ======================================================== */}
      {showEditDelayModal && selectedTripForEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '22px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px', color: '#0f172a' }}>
              Ghi Chú Trễ Chuyến #{selectedTripForEdit._id.slice(-6).toUpperCase()}
            </h3>
            <form onSubmit={handleSaveTripDelay}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Tình trạng vận hành
                </label>
                <select
                  value={editPunctualityStatus}
                  onChange={(e) => setEditPunctualityStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  <option value="on_time">Đúng giờ (On-time)</option>
                  <option value="delayed">Trễ giờ (Delayed)</option>
                  <option value="cancelled">Hủy chuyến (Cancelled)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                    Trễ xuất bến (phút)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDelayDepMins}
                    onChange={(e) => setEditDelayDepMins(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                    Trễ cập bến (phút)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDelayArrMins}
                    onChange={(e) => setEditDelayArrMins(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Lý do chậm trễ
                </label>
                <select
                  value={editDelayReason}
                  onChange={(e) => setEditDelayReason(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '6px' }}
                >
                  <option value="Ùn tắc giao thông / Kẹt xe cao điểm">Ùn tắc giao thông / Kẹt xe cao điểm</option>
                  <option value="Chờ khách trung chuyển / Khách trễ">Chờ khách trung chuyển / Khách trễ</option>
                  <option value="Thời tiết mưa bão / Đường ngập sạt lở">Thời tiết mưa bão / Đường ngập sạt lở</option>
                  <option value="Sự cố kỹ thuật nhẹ / Thay lốp phụ tùng">Sự cố kỹ thuật nhẹ / Thay lốp phụ tùng</option>
                  <option value="Thủ tục xuất bến / Trạm thu phí kẹt xe">Thủ tục xuất bến / Trạm thu phí kẹt xe</option>
                  <option value="Khác">Lý do khác...</option>
                </select>
                <input
                  type="text"
                  placeholder="Ghi chú chi tiết thêm..."
                  value={editDelayReason}
                  onChange={(e) => setEditDelayReason(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditDelayModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: GHI NHẬN SỰ CỐ MỚI (BÁO CÁO 2.3) */}
      {/* ======================================================== */}
      {showAddIncidentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                Ghi Nhận Sự Cố Hành Trình Mới
              </h3>
              <button
                onClick={() => setShowAddIncidentModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncident}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                    Phân loại sự cố
                  </label>
                  <select
                    value={newIncidentCategory}
                    onChange={(e) => setNewIncidentCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Sự cố kỹ thuật xe">Sự cố kỹ thuật xe (Lốp, Máy, Điều hòa)</option>
                    <option value="Va chạm / Giao thông">Va chạm / Giao thông cản trở</option>
                    <option value="Sự cố hành khách">Sự cố hành khách (Sức khỏe, Hành lý)</option>
                    <option value="Thời tiết mưa bão">Thời tiết mưa bão / Đường sạt lở</option>
                    <option value="Khác">Sự cố khác...</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    value={newIncidentSeverity}
                    onChange={(e) => setNewIncidentSeverity(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Nhẹ">Nhẹ (Vẫn tiếp tục di chuyển được)</option>
                    <option value="Vừa">Vừa (Cần dừng xử lý / Sửa tại chỗ)</option>
                    <option value="Nghiêm trọng">Nghiêm trọng (Cần xe cứu hộ / Trung chuyển)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                    Vị trí hiện trường / Cột mốc
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Km 128 Quốc lộ 20, Đèo Bảo Lộc"
                    value={newIncidentLocation}
                    onChange={(e) => setNewIncidentLocation(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                    Chi phí ước tính (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 500000"
                    value={newIncidentCost}
                    onChange={(e) => setNewIncidentCost(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                  Mã chuyến hoặc Biển số xe liên quan (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="VD: Chuyến SG-DL 08:00 (51B-044.44)"
                  value={newIncidentTripCode}
                  onChange={(e) => setNewIncidentTripCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                  Mô tả chi tiết sự cố &amp; Phương án điều động
                </label>
                <textarea
                  rows="3"
                  placeholder="Ghi rõ diễn biến sự cố, tài xế đã xử lý ra sao, có cần điều xe trung chuyển rước khách hay gọi xe cứu hộ..."
                  value={newIncidentDetails}
                  onChange={(e) => setNewIncidentDetails(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddIncidentModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#ea580c', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Ghi Nhận Sự Cố
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default OpsReportsPage;
