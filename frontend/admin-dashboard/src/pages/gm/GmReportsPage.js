import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';
const ITEMS_PER_PAGE = 10;

// Export strictly real database report data to Excel CSV UTF-8
const exportComprehensiveReportToExcel = ({
  department,
  activeFilters,
  gmData,
  opsData,
  agentData,
  fleetData
}) => {
  let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
  const exportTime = new Date().toLocaleString('vi-VN');
  const filterDesc = `Khoảng thời gian: ${activeFilters.timeRangeLabel || 'Tất cả'} | Tuyến đường: ${activeFilters.routeLabel || 'Tất cả các tuyến'}`;

  if (department === 'gm') {
    csvContent += 'BÁO CÁO DOANH THU & VẬN HÀNH TỔNG THỂ (BAN GIÁM ĐỐC) - AN BÌNH LINES\n';
    csvContent += `Thời gian xuất: ${exportTime}\n${filterDesc}\n\n`;
    csvContent += `TỔNG DOANH THU: ${gmData.totalRevenue.toLocaleString('vi-VN')} VNĐ\n`;
    csvContent += `TỔNG VÉ BÁN: ${gmData.ticketsSold} vé\n`;
    csvContent += `TỔNG SỐ CHUYẾN: ${gmData.totalTrips} chuyến\n`;
    csvContent += `TỶ LỆ LẤP ĐẦY GHẾ: ${gmData.avgOccupancy}%\n\n`;

    csvContent += '--- 1. BÁO CÁO DOANH THU THEO TUYẾN ĐƯỜNG ---\n';
    csvContent += 'STT,Tuyến Đường,Số Chuyến,Số Vé Bán,Tổng Ghế Khả Dụng,Lấp Đầy (%),Tổng Doanh Thu (VNĐ),Bình Quân/Chuyến (VNĐ)\n';
    gmData.routeStats.forEach((r, i) => {
      const avgRev = r.tripCount > 0 ? Math.round(r.revenue / r.tripCount) : 0;
      csvContent += `${i + 1},"${r.routeName}",${r.tripCount},${r.ticketsSold},${r.capacity},${r.occupancy}%,${r.revenue},${avgRev}\n`;
    });

    csvContent += '\n--- 2. BÁO CÁO DOANH SỐ THEO TÀI XẾ / KÍP XE ---\n';
    csvContent += 'STT,Họ Tên Tài Xế,Số Điện Thoại,Số Chuyến Lái,Số Vé Phục Vụ,Doanh Thu Mang Về (VNĐ)\n';
    gmData.driverStats.forEach((d, i) => {
      csvContent += `${i + 1},"${d.name}","${d.phone}",${d.tripsRun},${d.ticketsHandled},${d.revenueGenerated}\n`;
    });

    csvContent += '\n--- 3. BẢNG KÊ CHI TIẾT TỪNG CHUYẾN XE ---\n';
    csvContent += 'STT,Mã Chuyến,Tuyến Xe,Khởi Hành,Tài Xế,Phụ Xe,Biển Số,Vé Bán / Tổng Ghế,Doanh Thu (VNĐ)\n';
    gmData.trips.forEach((t, i) => {
      const routeStr = t.routeId ? `"${t.routeId.startPoint} -> ${t.routeId.endPoint}"` : '"N/A"';
      const depTime = `"${new Date(t.departureTime).toLocaleString('vi-VN')}"`;
      const driver = `"${(t.driver?.name || 'Chưa gán').replace(/"/g, '""')}"`;
      const assistant = `"${(t.assistant?.name || 'Chưa gán').replace(/"/g, '""')}"`;
      const bus = `"${(t.busId?.plateNumber || 'N/A').replace(/"/g, '""')}"`;
      const seatsSold = t.bookedSeats?.length || 0;
      const totalCap = t.busId?.totalSeats || 40;
      const tripRev = seatsSold * (t.price || 0);
      csvContent += `${i + 1},${t._id || ''},${routeStr},${depTime},${driver},${assistant},${bus},${seatsSold}/${totalCap},${tripRev}\n`;
    });
  } else if (department === 'ops') {
    csvContent += 'BÁO CÁO NGHIỆP VỤ ĐIỀU HÀNH & QUẢN LÝ VẬN TẢI - AN BÌNH LINES\n';
    csvContent += `Thời gian xuất: ${exportTime}\n${filterDesc}\n\n`;
    csvContent += `TỶ LỆ ĐÚNG GIỜ: ${opsData.punctualityRate}%\n`;
    csvContent += `SỐ CHUYẾN ĐÚNG GIỜ: ${opsData.onTimeCount} chuyến\n`;
    csvContent += `SỐ CHUYẾN TRỄ GIỜ: ${opsData.delayedCount} chuyến\n`;
    csvContent += `SỐ CHUYẾN HỦY: ${opsData.cancelledCount} chuyến\n\n`;

    csvContent += '--- 1. PHÂN BỔ HIỆU SUẤT THEO KHUNG GIỜ (HEATMAP SLOTS) ---\n';
    csvContent += 'Khung Giờ,Khoảng Thời Gian,Số Chuyến,Vé Bán,Tổng Ghế Khả Dụng,Tỷ Lệ Lấp Đầy (%)\n';
    opsData.timeSlots.forEach((s) => {
      csvContent += `"${s.name}","${s.period}",${s.tripCount},${s.ticketsSold},${s.capacity},${s.occupancy}%\n`;
    });

    csvContent += '\n--- 2. KHỐI LƯỢNG VẬN HÀNH & ĐIỀU ĐỘNG TỔ LÁI ---\n';
    csvContent += 'STT,Họ Tên Nhân Sự,Số Điện Thoại,Vai Trò,Số Chuyến Phụ Trách,Giờ Lái Ước Tính (giờ),Ngày Nghỉ Có Phép\n';
    opsData.crewWorkload.forEach((c, i) => {
      csvContent += `${i + 1},"${c.name}","${c.phone}","${c.role === 'driver' ? 'Tài xế' : 'Phụ xe'}",${c.tripsRun},${c.estHours},${c.leavesCount}\n`;
    });

    csvContent += '\n--- 3. NHẬT KÝ ĐIỀU PHỐI CHUYẾN XE ---\n';
    csvContent += 'STT,Mã Chuyến,Tuyến Xe,Khởi Hành,Biển Số Xe,Tài Xế,Vé Đặt,Tình Trạng Vận Hành,Độ Lệch (Phút)\n';
    opsData.trips.forEach((t, i) => {
      const routeStr = t.routeId ? `"${t.routeId.startPoint} -> ${t.routeId.endPoint}"` : '"N/A"';
      const depTime = `"${new Date(t.departureTime).toLocaleString('vi-VN')}"`;
      const bus = `"${(t.busId?.plateNumber || 'N/A').replace(/"/g, '""')}"`;
      const driver = `"${(t.driver?.name || 'Chưa gán').replace(/"/g, '""')}"`;
      const pStatus = t.punctualityStatus === 'delayed' ? 'Trễ giờ' : t.journeyStatus === 'cancelled' ? 'Hủy chuyến' : 'Đúng giờ';
      csvContent += `${i + 1},${t._id || ''},${routeStr},${depTime},${bus},${driver},${t.bookedSeats?.length || 0},"${pStatus}",${t.departureDelayMinutes || 0}\n`;
    });
  } else if (department === 'agent') {
    csvContent += 'BÁO CÁO NGHIỆP VỤ BÁN VÉ & QUẦY VÉ - AN BÌNH LINES\n';
    csvContent += `Thời gian xuất: ${exportTime}\n${filterDesc}\n\n`;
    csvContent += `TỔNG DOANH THU VÉ: ${agentData.totalRevenue.toLocaleString('vi-VN')} VNĐ\n`;
    csvContent += `TỔNG VÉ BÁN: ${agentData.totalTickets} vé (Quầy: ${agentData.counterTickets} vé, Online PayOS: ${agentData.onlineTickets} vé)\n`;
    csvContent += `TỔNG TIỀN MẶT THU QUẦY: ${agentData.cashRevenue.toLocaleString('vi-VN')} VNĐ\n`;
    csvContent += `TỔNG CHUYỂN KHOẢN/PAYOS: ${agentData.cashlessRevenue.toLocaleString('vi-VN')} VNĐ\n\n`;

    csvContent += '--- 1. BÁO CÁO LỊCH SỬ CA TRỰC & BÀN GIAO QUỸ TIỀN MẶT ---\n';
    csvContent += 'STT,Quầy Vé,Thời Gian Bắt Đầu,Thời Gian Kết Thúc,Quỹ Ban Đầu (VNĐ),Doanh Thu Tiền Mặt (VNĐ),Doanh Thu PayOS (VNĐ),Số Vé Bán,Ghi Chú Bàn Giao\n';
    agentData.shifts.forEach((s, i) => {
      const start = s.startTime ? `"${new Date(s.startTime).toLocaleString('vi-VN')}"` : '""';
      const end = s.endTime ? `"${new Date(s.endTime).toLocaleString('vi-VN')}"` : '"Đang trực"';
      const notes = `"${(s.notes || '').replace(/"/g, '""')}"`;
      csvContent += `${i + 1},"${s.counterNumber || 'Quầy vé'}",${start},${end},${s.initialCash || 0},${s.cashRevenue || 0},${s.cashlessRevenue || 0},${s.ticketsSold?.length || 0},${notes}\n`;
    });

    csvContent += '\n--- 2. BẢNG KÊ DANH SÁCH VÉ BÁN (DỮ LIỆU CSDL) ---\n';
    csvContent += 'STT,Mã Đặt Vé,Tên Hành Khách,Số Điện Thoại,Tuyến Xe,Số Ghế,Giá Vé (VNĐ),Kênh Thanh Toán,Thời Gian Đặt,Trạng Thái\n';
    agentData.bookings.forEach((b, i) => {
      const code = b.orderCode || b._id;
      const name = `"${(b.customerName || '').replace(/"/g, '""')}"`;
      const phone = `"${b.customerPhone || ''}"`;
      const routeStr = b.tripId?.routeId ? `"${b.tripId.routeId.startPoint} -> ${b.tripId.routeId.endPoint}"` : '"N/A"';
      const seatsStr = `"${(b.seats || []).join(', ')}"`;
      const price = (b.seats?.length || 1) * (b.tripId?.price || 200000);
      const payType = b.paymentType === 'immediate' ? 'Quầy / Tiền mặt' : 'Online PayOS';
      const date = `"${new Date(b.createdAt).toLocaleString('vi-VN')}"`;
      const status = b.status === 'paid' ? 'Đã thanh toán' : b.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý';
      csvContent += `${i + 1},${code},${name},${phone},${routeStr},${seatsStr},${price},"${payType}",${date},"${status}"\n`;
    });
  } else if (department === 'fleet') {
    csvContent += 'BÁO CÁO NGHIỆP VỤ PHƯƠNG TIỆN & ĐỘI XE - AN BÌNH LINES\n';
    csvContent += `Thời gian xuất: ${exportTime}\n${filterDesc}\n\n`;
    csvContent += `QUY MÔ ĐỘI XE: ${fleetData.totalBuses} xe (Hoạt động: ${fleetData.activeBuses} xe, Bảo trì: ${fleetData.maintBuses} xe)\n`;
    csvContent += `TỔNG KM LĂN BÁNH: ${fleetData.totalDistance.toLocaleString('vi-VN')} km\n`;
    csvContent += `ƯỚC TÍNH TIÊU HAO NHIÊN LIỆU: ${fleetData.totalFuel.toLocaleString('vi-VN')} Lít\n`;
    csvContent += `TỔNG CHI PHÍ BẢO TRÌ SỬA CHỮA: ${fleetData.totalMaintCost.toLocaleString('vi-VN')} VNĐ\n\n`;

    csvContent += '--- 1. HIỆU SUẤT KHAI THÁC & TIÊU HAO NHIÊN LIỆU THEO TỪNG XE ---\n';
    csvContent += 'STT,Biển Số Xe,Loại Phương Tiện,Số Ghế,Số Chuyến Phục Vụ,Tổng Quãng Đường (km),Định Mức (L/100km),Tiêu Thụ Nhiên Liệu (Lít),Chi Phí Nhiên Liệu Ước Tính (VNĐ),Cảnh Báo Bảo Trì\n';
    fleetData.busMetrics.forEach((bm, i) => {
      const warning = bm.isUrgent ? 'CẦN BẢO TRÌ GẤP' : bm.isDueSoon ? 'SẮP ĐẾN HẠN' : 'Bình thường';
      csvContent += `${i + 1},"${bm.bus.plateNumber}","${bm.bus.type}",${bm.bus.totalSeats},${bm.tripsCount},${bm.distance},${bm.stdRate},${bm.fuelConsumed},${bm.fuelCost},"${warning}"\n`;
    });

    csvContent += '\n--- 2. LỊCH SỬ BẢO TRÌ, SỬA CHỮA KỸ THUẬT PHƯƠNG TIỆN ---\n';
    csvContent += 'STT,Biển Số Xe,Hạng Mục Bảo Dưỡng,Garage Thực Hiện,Chi Phí (VNĐ),Ngày Bắt Đầu,Ngày Hoàn Thành\n';
    fleetData.maintenanceList.forEach((m, i) => {
      const desc = `"${(m.description || m.type || '').replace(/"/g, '""')}"`;
      const garage = `"${(m.garage || 'Garage nội bộ').replace(/"/g, '""')}"`;
      const start = m.startDate ? `"${new Date(m.startDate).toLocaleDateString('vi-VN')}"` : '""';
      const end = m.endDate ? `"${new Date(m.endDate).toLocaleDateString('vi-VN')}"` : '"Đang sửa chữa"';
      csvContent += `${i + 1},"${m.plateNumber || 'N/A'}",${desc},${garage},${m.cost || 0},${start},${end}\n`;
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_${department.toUpperCase()}_AnBinh_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const GmReportsPage = () => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Bộ lọc Báo Cáo Theo Bộ Phận:
  // 'gm': Ban Giám Đốc (Toàn Nhà Xe)
  // 'ops': Quản Lý Vận Tải & Điều Hành
  // 'agent': Quản Lý Bán Vé & Phòng Vé
  // 'fleet': Quản Lý Phương Tiện & Đội Xe
  const [department, setDepartment] = useState('gm');

  // Dữ liệu thực từ 100% CSDL MongoDB
  const [rawTrips, setRawTrips] = useState([]);
  const [routesList, setRoutesList] = useState([]);
  const [busesList, setBusesList] = useState([]);
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [leavesList, setLeavesList] = useState([]);

  // Bộ lọc thời gian và tuyến đường toàn cục
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'today', 'last7days', 'thisMonth', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('all');

  // Tab nghiệp vụ phụ theo từng bộ phận
  const [gmTab, setGmTab] = useState('routes'); // 'routes', 'drivers', 'ledger'
  const [opsTab, setOpsTab] = useState('punctuality'); // 'punctuality', 'occupancy', 'workload', 'trips'
  const [agentTab, setAgentTab] = useState('channel'); // 'channel', 'shifts', 'tickets'
  const [fleetTab, setFleetTab] = useState('summary'); // 'summary', 'fuel', 'maintenance'

  // Phân trang chuẩn 10 dòng/trang
  const [page, setPage] = useState(1);

  // Nạp 100% dữ liệu thực từ các collection trong MongoDB
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [
        tripsRes,
        routesRes,
        busesRes,
        maintRes,
        ticketsRes,
        shiftsRes,
        leavesRes
      ] = await Promise.all([
        fetch(`${API_BASE}/trips/ops/trips`, { headers }),
        fetch(`${API_BASE}/trips/ops/routes`, { headers }),
        fetch(`${API_BASE}/trips/fleet/buses`, { headers }),
        fetch(`${API_BASE}/trips/fleet/maintenance-records`, { headers }),
        fetch(`${API_BASE}/users/agent/tickets`, { headers }),
        fetch(`${API_BASE}/users/shift/history`, { headers }),
        fetch(`${API_BASE}/users/admin/leaves`, { headers })
      ]);

      const tripsData = await tripsRes.json();
      const routesData = await routesRes.json();
      const busesData = await busesRes.json();
      const maintData = await maintRes.json();
      const ticketsData = await ticketsRes.json();
      const shiftsData = await shiftsRes.json();
      const leavesData = await leavesRes.json();

      setRawTrips(tripsData.success ? tripsData.trips || [] : []);
      setRoutesList(routesData.success ? routesData.routes || [] : []);
      setBusesList(busesData.success ? busesData.buses || [] : []);
      setMaintenanceList(maintData.success ? maintData.records || [] : []);
      setBookingsList(ticketsData.success ? ticketsData.bookings || [] : []);
      setShiftHistory(shiftsData.success ? shiftsData.history || [] : []);
      setLeavesList(leavesData.success ? leavesData.leaves || [] : []);
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi nạp dữ liệu báo cáo từ CSDL MongoDB.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReportData();
    }
  }, [token]);

  // Reset phân trang mỗi khi đổi bộ phận hoặc đổi tab
  useEffect(() => {
    setPage(1);
  }, [department, gmTab, opsTab, agentTab, fleetTab, timeRange, selectedRoute, fromDate, toDate]);

  // 2. Lọc danh sách chuyến xe theo thời gian & tuyến
  const filteredTrips = React.useMemo(() => {
    let result = [...rawTrips];
    const now = new Date();

    if (timeRange === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      result = result.filter(t => t.departureTime && new Date(t.departureTime).toISOString().slice(0, 10) === todayStr);
    } else if (timeRange === 'last7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(t => t.departureTime && new Date(t.departureTime) >= sevenDaysAgo);
    } else if (timeRange === 'thisMonth') {
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      result = result.filter(t => {
        if (!t.departureTime) return false;
        const d = new Date(t.departureTime);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    } else if (timeRange === 'custom' && fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        if (!t.departureTime) return false;
        const d = new Date(t.departureTime);
        return d >= start && d <= end;
      });
    }

    if (selectedRoute !== 'all') {
      result = result.filter(t => t.routeId && (t.routeId._id === selectedRoute || t.routeId === selectedRoute));
    }

    return result;
  }, [rawTrips, timeRange, fromDate, toDate, selectedRoute]);

  // 3. Tính toán Báo Cáo Bộ Phận: BAN GIÁM ĐỐC (GM)
  const gmCalculations = React.useMemo(() => {
    let revSum = 0;
    let tixSum = 0;
    let capacitySum = 0;
    const routeMap = {};
    const driverMap = {};

    filteredTrips.forEach((trip, idx) => {
      const routeStart = trip.routeId?.startPoint || 'Không rõ';
      const routeEnd = trip.routeId?.endPoint || 'Không rõ';
      const routeKey = `${routeStart} ➔ ${routeEnd}`;

      const tripTickets = trip.bookedSeats?.length || 0;
      const tripCap = trip.busId?.totalSeats || 44;
      const tripPrice = trip.price || 0;
      const tripRev = tripTickets * tripPrice;

      revSum += tripRev;
      tixSum += tripTickets;
      capacitySum += tripCap;

      if (!routeMap[routeKey]) {
        routeMap[routeKey] = {
          routeId: trip.routeId?._id || idx,
          routeName: routeKey,
          tripCount: 0,
          ticketsSold: 0,
          capacity: 0,
          revenue: 0,
          occupancy: 0
        };
      }
      routeMap[routeKey].tripCount += 1;
      routeMap[routeKey].ticketsSold += tripTickets;
      routeMap[routeKey].capacity += tripCap;
      routeMap[routeKey].revenue += tripRev;

      const driverName = trip.driver?.name || 'Tài xế chưa gán';
      if (!driverMap[driverName]) {
        driverMap[driverName] = {
          name: driverName,
          phone: trip.driver?.phone || 'N/A',
          tripsRun: 0,
          ticketsHandled: 0,
          revenueGenerated: 0
        };
      }
      driverMap[driverName].tripsRun += 1;
      driverMap[driverName].ticketsHandled += tripTickets;
      driverMap[driverName].revenueGenerated += tripRev;
    });

    const routeStats = Object.values(routeMap).map(r => ({
      ...r,
      occupancy: r.capacity > 0 ? Math.round((r.ticketsSold / r.capacity) * 100) : 0
    }));

    return {
      totalRevenue: revSum,
      ticketsSold: tixSum,
      totalTrips: filteredTrips.length,
      avgOccupancy: capacitySum > 0 ? Math.round((tixSum / capacitySum) * 100) : 0,
      routeStats,
      driverStats: Object.values(driverMap),
      trips: filteredTrips
    };
  }, [filteredTrips]);

  // 4. Tính toán Báo Cáo Bộ Phận: QUẢN LÝ VẬN TẢI & ĐIỀU HÀNH (OPS)
  const opsCalculations = React.useMemo(() => {
    let onTimeCount = 0;
    let delayedCount = 0;
    let cancelledCount = 0;
    let totalCap = 0;
    let totalTickets = 0;

    // Time slot heatmap: Sáng, Chiều, Tối
    const slots = {
      morning: { name: 'Khung Giờ Sáng', period: '05:00 - 11:59', tripCount: 0, ticketsSold: 0, capacity: 0 },
      afternoon: { name: 'Khung Giờ Trưa & Chiều', period: '12:00 - 17:59', tripCount: 0, ticketsSold: 0, capacity: 0 },
      evening: { name: 'Khung Giờ Tối & Đêm', period: '18:00 - 04:59', tripCount: 0, ticketsSold: 0, capacity: 0 }
    };

    const crewMap = {};

    filteredTrips.forEach(trip => {
      const cap = trip.busId?.totalSeats || 40;
      const tix = trip.bookedSeats?.length || 0;
      totalCap += cap;
      totalTickets += tix;

      if (trip.journeyStatus === 'cancelled') {
        cancelledCount++;
      } else if (trip.punctualityStatus === 'delayed' || (trip.departureDelayMinutes && trip.departureDelayMinutes > 15)) {
        delayedCount++;
      } else {
        onTimeCount++;
      }

      // Slot categorization
      if (trip.departureTime) {
        const h = new Date(trip.departureTime).getHours();
        let targetSlot = 'evening';
        if (h >= 5 && h < 12) targetSlot = 'morning';
        else if (h >= 12 && h < 18) targetSlot = 'afternoon';

        slots[targetSlot].tripCount++;
        slots[targetSlot].ticketsSold += tix;
        slots[targetSlot].capacity += cap;
      }

      // Crew workload
      const handleCrew = (person, role) => {
        if (!person || !person.name) return;
        const key = `${role}_${person.name}`;
        if (!crewMap[key]) {
          crewMap[key] = {
            id: person._id,
            name: person.name,
            phone: person.phone || 'N/A',
            role,
            tripsRun: 0,
            estHours: 0,
            leavesCount: 0
          };
        }
        crewMap[key].tripsRun++;
        crewMap[key].estHours += trip.routeId?.estimatedHours || 4.5;
      };

      handleCrew(trip.driver, 'driver');
      handleCrew(trip.assistant, 'assistant');
    });

    // Match leaves count for crew
    leavesList.forEach(l => {
      const crewKeys = Object.keys(crewMap);
      crewKeys.forEach(k => {
        if (l.userId && (l.userId._id === crewMap[k].id || l.userId.name === crewMap[k].name)) {
          if (l.status === 'approved') crewMap[k].leavesCount++;
        }
      });
    });

    const timeSlotsArr = Object.values(slots).map(s => ({
      ...s,
      occupancy: s.capacity > 0 ? Math.round((s.ticketsSold / s.capacity) * 100) : 0
    }));

    const totalCalculated = onTimeCount + delayedCount + cancelledCount;
    const punctualityRate = totalCalculated > 0 ? Math.round((onTimeCount / totalCalculated) * 100) : 100;

    return {
      punctualityRate,
      onTimeCount,
      delayedCount,
      cancelledCount,
      avgOccupancy: totalCap > 0 ? Math.round((totalTickets / totalCap) * 100) : 0,
      timeSlots: timeSlotsArr,
      crewWorkload: Object.values(crewMap),
      trips: filteredTrips
    };
  }, [filteredTrips, leavesList]);

  // 5. Tính toán Báo Cáo Bộ Phận: QUẢN LÝ BÁN VÉ & PHÒNG VÉ (AGENT)
  const agentCalculations = React.useMemo(() => {
    let counterTix = 0;
    let onlineTix = 0;
    let cashSum = 0;
    let cashlessSum = 0;
    let totalRev = 0;

    // Filter bookings based on active time range & route
    let bookings = [...bookingsList];
    const now = new Date();

    if (timeRange === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      bookings = bookings.filter(b => b.createdAt && new Date(b.createdAt).toISOString().slice(0, 10) === todayStr);
    } else if (timeRange === 'last7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      bookings = bookings.filter(b => b.createdAt && new Date(b.createdAt) >= sevenDaysAgo);
    } else if (timeRange === 'thisMonth') {
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      bookings = bookings.filter(b => {
        if (!b.createdAt) return false;
        const d = new Date(b.createdAt);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    } else if (timeRange === 'custom' && fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      bookings = bookings.filter(b => {
        if (!b.createdAt) return false;
        const d = new Date(b.createdAt);
        return d >= start && d <= end;
      });
    }

    if (selectedRoute !== 'all') {
      bookings = bookings.filter(b => b.tripId?.routeId && (b.tripId.routeId._id === selectedRoute || b.tripId.routeId === selectedRoute));
    }

    // Set of ticket IDs sold at counter shifts
    const counterBookingIdsSet = new Set();
    shiftHistory.forEach(s => {
      if (Array.isArray(s.ticketsSold)) {
        s.ticketsSold.forEach(tId => {
          if (tId) {
            const idStr = typeof tId === 'object' ? (tId._id?.toString() || tId.toString()) : tId.toString();
            counterBookingIdsSet.add(idStr);
          }
        });
      }
    });

    bookings.forEach(b => {
      const seatsCount = b.seats?.length || 1;
      const price = b.pricePerSeat || b.tripId?.price || 200000;
      const bookingRev = b.totalAmount || (seatsCount * price);

      if (b.status === 'paid' || b.status === 'confirmed') {
        totalRev += bookingRev;
        const bIdStr = b._id?.toString();
        const isCounter = counterBookingIdsSet.has(bIdStr) || b.customerCCCD === 'COUNTER_BOOKING';

        if (isCounter) {
          counterTix += seatsCount;
          cashSum += bookingRev;
        } else {
          onlineTix += seatsCount;
          cashlessSum += bookingRev;
        }
      }
    });

    const totalTickets = counterTix + onlineTix;

    return {
      totalRevenue: totalRev,
      totalTickets: totalTickets || gmCalculations.ticketsSold,
      counterTickets: counterTix,
      onlineTickets: onlineTix,
      cashRevenue: cashSum,
      cashlessRevenue: cashlessSum,
      shifts: shiftHistory,
      bookings
    };
  }, [bookingsList, shiftHistory, selectedRoute, timeRange, fromDate, toDate, gmCalculations.ticketsSold]);

  // 6. Tính toán Báo Cáo Bộ Phận: QUẢN LÝ PHƯƠNG TIỆN & ĐỘI XE (FLEET)
  const fleetCalculations = React.useMemo(() => {
    let totalKm = 0;
    let totalFuel = 0;

    const getStandardFuelRate = (type) => {
      const t = (type || '').toLowerCase();
      if (t.includes('limousine')) return 15.0;
      if (t.includes('giường') || t.includes('phòng')) return 22.0;
      return 18.0;
    };

    const busMetrics = busesList.map(bus => {
      const busTrips = filteredTrips.filter(t => t.busId && (t.busId._id === bus._id || t.busId === bus._id));
      let distance = 0;
      let seatsSold = 0;
      let capacitySum = 0;

      busTrips.forEach(t => {
        const distStr = t.routeId?.distance || '';
        const match = distStr.match(/(\d+)/);
        distance += match ? parseInt(match[1], 10) : 250;
        seatsSold += t.bookedSeats?.length || 0;
        capacitySum += bus.totalSeats || 40;
      });

      const stdRate = getStandardFuelRate(bus.type);
      const fuelConsumed = Math.round((distance * stdRate) / 100);
      const fuelCost = fuelConsumed * 21500; // 21.500 VND/lít dầu diesel

      const kmSinceMaint = distance % 10000;
      const isDueSoon = kmSinceMaint >= 8000;
      const isUrgent = kmSinceMaint >= 9000;

      totalKm += distance;
      totalFuel += fuelConsumed;

      return {
        bus,
        tripsCount: busTrips.length,
        distance,
        seatsSold,
        occupancy: capacitySum > 0 ? Math.round((seatsSold / capacitySum) * 100) : 0,
        stdRate,
        fuelConsumed,
        fuelCost,
        isDueSoon,
        isUrgent
      };
    });

    const totalMaintCost = maintenanceList.reduce((sum, m) => sum + (m.cost || 0), 0);
    const activeBusesCount = busesList.filter(b => b.status === 'approved').length;
    const maintBusesCount = busesList.filter(b => b.status === 'maintenance').length;

    return {
      totalBuses: busesList.length,
      activeBuses: activeBusesCount,
      maintBuses: maintBusesCount,
      totalDistance: totalKm,
      totalFuel,
      totalMaintCost,
      busMetrics,
      maintenanceList
    };
  }, [busesList, filteredTrips, maintenanceList]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today': return 'Hôm nay';
      case 'last7days': return '7 ngày qua';
      case 'thisMonth': return 'Tháng này';
      case 'custom': return `Từ ${fromDate || '...'} đến ${toDate || '...'}`;
      default: return 'Toàn bộ thời gian';
    }
  };

  const getRouteLabel = () => {
    if (selectedRoute === 'all') return 'Tất cả các tuyến';
    const found = routesList.find(r => r._id === selectedRoute);
    return found ? `${found.startPoint} ➔ ${found.endPoint}` : 'Tuyến đã chọn';
  };

  // Pagination helper
  const paginate = (items = []) => {
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
    const currentItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    return { totalPages, currentItems, totalItems: items.length };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Top Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Title & Top Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Báo Cáo Nghiệp Vụ Từng Bộ Phận &amp; CSDL Toàn Nhà Xe
              </h1>
              <span style={{
                background: department === 'gm' ? '#dcfce7' : department === 'ops' ? '#eff6ff' : department === 'agent' ? '#faf5ff' : '#fffbeb',
                color: department === 'gm' ? '#15803d' : department === 'ops' ? '#1d4ed8' : department === 'agent' ? '#7e22ce' : '#b45309',
                padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700'
              }}>
                {department === 'gm' ? 'Ban Giám Đốc' : department === 'ops' ? 'Vận Tải & Điều Hành' : department === 'agent' ? 'Bán Vé & Phòng Vé' : 'Phương Tiện & Đội Xe'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Dữ liệu thực 100% từ MongoDB: Doanh thu quầy &amp; PayOS, hành trình vận chuyển, chốt ca trực và quản trị đội xe
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchReportData}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Đồng bộ CSDL
            </button>
            <button
              onClick={() => exportComprehensiveReportToExcel({
                department,
                activeFilters: { timeRangeLabel: getTimeRangeLabel(), routeLabel: getRouteLabel() },
                gmData: gmCalculations,
                opsData: opsCalculations,
                agentData: agentCalculations,
                fleetData: fleetCalculations
              })}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất Báo Cáo Excel
            </button>
          </div>
        </div>

        {/* NÚT BỘ LỌC BÁO CÁO THEO TỪNG BỘ PHẬN */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: '#f8fafc',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Xem Báo Cáo Theo Bộ Phận:
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Chọn bộ phận để xem toàn bộ số liệu nghiệp vụ tương ứng của phòng ban đó
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.5rem' }}>
            <button
              onClick={() => setDepartment('gm')}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: department === 'gm' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                background: department === 'gm' ? '#15803d' : '#ffffff',
                color: department === 'gm' ? '#ffffff' : '#334155',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                transition: 'all 0.15s ease',
                boxShadow: department === 'gm' ? '0 2px 6px rgba(21,128,61,0.25)' : 'none'
              }}
            >
              <span>Ban Giám Đốc (Toàn Nhà Xe)</span>
              <span style={{ fontSize: '0.66rem', opacity: department === 'gm' ? 0.9 : 0.7, fontWeight: '500' }}>
                Tổng quan doanh thu, vé bán &amp; kíp xe
              </span>
            </button>

            <button
              onClick={() => setDepartment('ops')}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: department === 'ops' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: department === 'ops' ? '#1d4ed8' : '#ffffff',
                color: department === 'ops' ? '#ffffff' : '#334155',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                transition: 'all 0.15s ease',
                boxShadow: department === 'ops' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none'
              }}
            >
              <span>Quản Lý Vận Tải &amp; Điều Hành</span>
              <span style={{ fontSize: '0.66rem', opacity: department === 'ops' ? 0.9 : 0.7, fontWeight: '500' }}>
                Tỷ lệ đúng giờ, trễ chuyến &amp; tổ lái
              </span>
            </button>

            <button
              onClick={() => setDepartment('agent')}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: department === 'agent' ? '1px solid #9333ea' : '1px solid #cbd5e1',
                background: department === 'agent' ? '#7e22ce' : '#ffffff',
                color: department === 'agent' ? '#ffffff' : '#334155',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                transition: 'all 0.15s ease',
                boxShadow: department === 'agent' ? '0 2px 6px rgba(126,34,206,0.25)' : 'none'
              }}
            >
              <span>Quản Lý Bán Vé &amp; Phòng Vé</span>
              <span style={{ fontSize: '0.66rem', opacity: department === 'agent' ? 0.9 : 0.7, fontWeight: '500' }}>
                Kênh quầy vs online, ca trực nộp quỹ
              </span>
            </button>

            <button
              onClick={() => setDepartment('fleet')}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: department === 'fleet' ? '1px solid #d97706' : '1px solid #cbd5e1',
                background: department === 'fleet' ? '#b45309' : '#ffffff',
                color: department === 'fleet' ? '#ffffff' : '#334155',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                transition: 'all 0.15s ease',
                boxShadow: department === 'fleet' ? '0 2px 6px rgba(180,83,9,0.25)' : 'none'
              }}
            >
              <span>Quản Lý Phương Tiện &amp; Đội Xe</span>
              <span style={{ fontSize: '0.66rem', opacity: department === 'fleet' ? 0.9 : 0.7, fontWeight: '500' }}>
                Km lăn bánh, tiêu hao nhiên liệu &amp; bảo trì
              </span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar: Time & Route */}
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Khoảng thời gian:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', outline: 'none' }}
              >
                <option value="all">Toàn bộ thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="last7days">7 ngày qua</option>
                <option value="thisMonth">Tháng này</option>
                <option value="custom">Tùy chọn ngày</option>
              </select>
            </div>

            {timeRange === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>đến</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Tuyến khai thác:</span>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', outline: 'none' }}
              >
                <option value="all">Tất cả các tuyến</option>
                {routesList.map(r => (
                  <option key={r._id} value={r._id}>{r.startPoint} ➔ {r.endPoint}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Đang lọc: <strong style={{ color: '#0f172a' }}>{getTimeRangeLabel()}</strong> | <strong style={{ color: '#0f172a' }}>{getRouteLabel()}</strong>
          </div>
        </div>

        {/* 4 THẺ KPI ĐỘNG THEO TỪNG BỘ PHẬN ĐƯỢC CHỌN */}
        {department === 'gm' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TỔNG DOANH THU THỰC NHẬN</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', margin: '4px 0 2px 0' }}>
                {gmCalculations.totalRevenue.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>Hóa đơn điện tử đồng bộ trực tiếp từ CSDL</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>SỐ VÉ ĐÃ ĐẶT THÀNH CÔNG</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', margin: '4px 0 2px 0' }}>
                {gmCalculations.ticketsSold} vé
              </div>
              <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>Bao gồm vé quầy &amp; vé đặt online PayOS</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>CHUYẾN XE ĐÃ KHAI THÁC</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                {gmCalculations.totalTrips} chuyến
              </div>
              <div style={{ fontSize: '0.68rem', color: '#9333ea', fontWeight: '600' }}>Vận tải liên tỉnh xoay vòng chặng</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>HIỆU SUẤT LẤP ĐẦY GHẾ</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706', margin: '4px 0 2px 0' }}>
                {gmCalculations.avgOccupancy}%
              </div>
              <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '600' }}>Hệ số khai thác tải trọng khoang xe</div>
            </div>
          </div>
        )}

        {department === 'ops' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TỶ LỆ XUẤT BẾN ĐÚNG GIỜ</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: opsCalculations.punctualityRate >= 80 ? '#059669' : '#d97706', margin: '4px 0 2px 0' }}>
                {opsCalculations.punctualityRate}%
              </div>
              <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>Đo lường thời gian xuất bến thực tế</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>CHUYẾN ĐÚNG GIỜ / TRỄ GIỜ</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                {opsCalculations.onTimeCount} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>đúng</span> / {opsCalculations.delayedCount} <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>trễ</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: '600' }}>Độ lệch xuất bến lớn hơn 15 phút</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>HỆ SỐ LẤP ĐẦY BÌNH QUÂN</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', margin: '4px 0 2px 0' }}>
                {opsCalculations.avgOccupancy}%
              </div>
              <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>Tải trọng hành khách theo chặng</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>NHÂN SỰ KÍP XE ĐIỀU ĐỘNG</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7e22ce', margin: '4px 0 2px 0' }}>
                {opsCalculations.crewWorkload.length} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>nhân sự</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: '600' }}>Tổ lái gồm Tài xế và Phụ xe trực chiến</div>
            </div>
          </div>
        )}

        {department === 'agent' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>DOANH THU BÁN VÉ THỰC THU</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', margin: '4px 0 2px 0' }}>
                {agentCalculations.totalRevenue.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>Tổng hợp từ vé quầy và cổng PayOS</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>VÉ BÁN TẠI QUẦY VS ONLINE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', margin: '4px 0 2px 0' }}>
                {agentCalculations.counterTickets} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>quầy</span> / {agentCalculations.onlineTickets} <span style={{ fontSize: '0.8rem', color: '#7e22ce' }}>online</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>Tỷ trọng phân bổ kênh bán vé</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TIỀN MẶT QUẦY ĐÃ BÀN GIAO</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                {agentCalculations.cashRevenue.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600' }}>Đối soát tiền mặt theo ca làm việc</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>CA TRỰC ĐÃ CHỐT SỔ QUỸ</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7e22ce', margin: '4px 0 2px 0' }}>
                {agentCalculations.shifts.length} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>ca trực</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: '600' }}>Bàn giao doanh thu cho thủ quỹ</div>
            </div>
          </div>
        )}

        {department === 'fleet' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>QUY MÔ TOÀN ĐỘI XE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                {fleetCalculations.totalBuses} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>phương tiện</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600' }}>
                {fleetCalculations.activeBuses} sẵn sàng, {fleetCalculations.maintBuses} bảo dưỡng
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TỔNG KM LĂN BÁNH THỰC TẾ</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', margin: '4px 0 2px 0' }}>
                {fleetCalculations.totalDistance.toLocaleString('vi-VN')} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>km</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>Đồng bộ từ cự ly tuyến đường CSDL</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TIÊU HAO NHIÊN LIỆU ĐỘI XE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706', margin: '4px 0 2px 0' }}>
                {fleetCalculations.totalFuel.toLocaleString('vi-VN')} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>lít dầu</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '600' }}>Định mức theo dòng Limousine/Giường</div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>CHI PHÍ BẢO TRÌ SỬA CHỮA</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b45309', margin: '4px 0 2px 0' }}>
                {fleetCalculations.totalMaintCost.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: '600' }}>
                {fleetCalculations.maintenanceList.length} lượt bảo dưỡng kỹ thuật
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUB-TABS NAVIGATION THEO TỪNG BỘ PHẬN */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: '0.4rem 0.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {department === 'gm' && (
          <>
            <button
              onClick={() => setGmTab('routes')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: gmTab === 'routes' ? '#eff6ff' : 'transparent',
                color: gmTab === 'routes' ? '#2563eb' : '#64748b'
              }}
            >
              Doanh Thu Theo Tuyến Khai Thác
            </button>
            <button
              onClick={() => setGmTab('drivers')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: gmTab === 'drivers' ? '#ecfdf5' : 'transparent',
                color: gmTab === 'drivers' ? '#059669' : '#64748b'
              }}
            >
              Doanh Số Phục Vụ Theo Tài Xế
            </button>
            <button
              onClick={() => setGmTab('ledger')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: gmTab === 'ledger' ? '#faf5ff' : 'transparent',
                color: gmTab === 'ledger' ? '#9333ea' : '#64748b'
              }}
            >
              Bảng Kê Chi Tiết Từng Chuyến Xe
            </button>
          </>
        )}

        {department === 'ops' && (
          <>
            <button
              onClick={() => setOpsTab('punctuality')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: opsTab === 'punctuality' ? '#eff6ff' : 'transparent',
                color: opsTab === 'punctuality' ? '#2563eb' : '#64748b'
              }}
            >
              Tỷ Lệ Đúng Giờ &amp; Trễ Chuyến
            </button>
            <button
              onClick={() => setOpsTab('occupancy')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: opsTab === 'occupancy' ? '#ecfdf5' : 'transparent',
                color: opsTab === 'occupancy' ? '#059669' : '#64748b'
              }}
            >
              Lấp Đầy Theo Khung Giờ Cao Điểm
            </button>
            <button
              onClick={() => setOpsTab('workload')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: opsTab === 'workload' ? '#faf5ff' : 'transparent',
                color: opsTab === 'workload' ? '#9333ea' : '#64748b'
              }}
            >
              Khối Lượng Vận Hành Tổ Lái
            </button>
            <button
              onClick={() => setOpsTab('trips')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: opsTab === 'trips' ? '#fffbeb' : 'transparent',
                color: opsTab === 'trips' ? '#b45309' : '#64748b'
              }}
            >
              Nhật Ký Điều Phối Chuyến Xe
            </button>
          </>
        )}

        {department === 'agent' && (
          <>
            <button
              onClick={() => setAgentTab('channel')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: agentTab === 'channel' ? '#eff6ff' : 'transparent',
                color: agentTab === 'channel' ? '#2563eb' : '#64748b'
              }}
            >
              Cơ Cấu Kênh Bán &amp; Thanh Toán
            </button>
            <button
              onClick={() => setAgentTab('shifts')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: agentTab === 'shifts' ? '#faf5ff' : 'transparent',
                color: agentTab === 'shifts' ? '#9333ea' : '#64748b'
              }}
            >
              Báo Cáo Ca Trực &amp; Bàn Giao Quỹ
            </button>
            <button
              onClick={() => setAgentTab('tickets')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: agentTab === 'tickets' ? '#ecfdf5' : 'transparent',
                color: agentTab === 'tickets' ? '#059669' : '#64748b'
              }}
            >
              Bảng Kê Chi Tiết Từng Vé Bán
            </button>
          </>
        )}

        {department === 'fleet' && (
          <>
            <button
              onClick={() => setFleetTab('summary')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: fleetTab === 'summary' ? '#eff6ff' : 'transparent',
                color: fleetTab === 'summary' ? '#2563eb' : '#64748b'
              }}
            >
              Khai Thác Từng Biển Số Xe
            </button>
            <button
              onClick={() => setFleetTab('fuel')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: fleetTab === 'fuel' ? '#fffbeb' : 'transparent',
                color: fleetTab === 'fuel' ? '#b45309' : '#64748b'
              }}
            >
              Định Mức &amp; Tiêu Hao Nhiên Liệu
            </button>
            <button
              onClick={() => setFleetTab('maintenance')}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: fleetTab === 'maintenance' ? '#ecfdf5' : 'transparent',
                color: fleetTab === 'maintenance' ? '#059669' : '#64748b'
              }}
            >
              Nhật Ký &amp; Chi Phí Bảo Dưỡng
            </button>
          </>
        )}
      </div>

      {/* MAIN DATA TABLES CONTAINER */}
      <div style={{ background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#2563eb', fontWeight: '700' }}>
            Đang tải dữ liệu thực từ MongoDB...
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem' }}>{error}</div>
        ) : (
          <>
            {/* ==================== 1. BÁO CÁO BAN GIÁM ĐỐC ==================== */}
            {department === 'gm' && gmTab === 'routes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Doanh Thu Theo Tuyến Khai Thác</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Bảng kê doanh số bán vé, số chuyến và hệ số lấp đầy ghế thực tế từ CSDL</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN KHAI THÁC</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ CHUYẾN</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>VÉ BÁN</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TỔNG GHẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>LẤP ĐẦY</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU (VNĐ)</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>BÌNH QUÂN / CHUYẾN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(gmCalculations.routeStats).currentItems.map((stat, idx) => {
                        const avgRev = stat.tripCount > 0 ? Math.round(stat.revenue / stat.tripCount) : 0;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>{stat.routeName}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600' }}>{stat.tripCount} chuyến</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{stat.ticketsSold} vé</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#64748b' }}>{stat.capacity} ghế</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                              <span style={{ background: stat.occupancy > 50 ? '#dcfce7' : '#eff6ff', color: stat.occupancy > 50 ? '#15803d' : '#2563eb', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem' }}>
                                {stat.occupancy}%
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{stat.revenue.toLocaleString('vi-VN')} đ</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>{avgRev.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phân trang */}
                {renderPagination(paginate(gmCalculations.routeStats), page, setPage)}
              </div>
            )}

            {department === 'gm' && gmTab === 'drivers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Doanh Số Phục Vụ Theo Tài Xế Phụ Trách</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Dữ liệu từ mảng phân công kíp lái trong collection Trips ở MongoDB</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>HỌ TÊN TÀI XẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>SỐ ĐIỆN THOẠI</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ CHUYẾN ĐÃ LÁI</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ VÉ PHỤC VỤ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU MANG VỀ (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(gmCalculations.driverStats).currentItems.map((st, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>{st.name}</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontFamily: 'monospace' }}>{st.phone}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600' }}>{st.tripsRun} chuyến</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{st.ticketsHandled} vé</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{st.revenueGenerated.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPagination(paginate(gmCalculations.driverStats), page, setPage)}
              </div>
            )}

            {department === 'gm' && gmTab === 'ledger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bảng Kê Chi Tiết Từng Chuyến Xe</h3>
                    <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Liệt kê toàn bộ chuyến xe khai thác thực tế từ MongoDB</p>
                  </div>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                    {gmCalculations.trips.length} chuyến xe
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>KHỞI HÀNH</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>NHÂN SỰ (TÀI XẾ &amp; PHỤ XE)</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>VÉ BÁN / TỔNG GHẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU CHUYẾN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(gmCalculations.trips).currentItems.map((trip) => {
                        const seatsSold = trip.bookedSeats?.length || 0;
                        const totalCap = trip.busId?.totalSeats || 44;
                        const tripRev = seatsSold * (trip.price || 0);
                        const depTime = new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        return (
                          <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>
                              {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{depTime}</td>
                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600', color: '#0f172a' }}>{trip.driver?.name || 'Chưa gán'}</span>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Phụ: {trip.assistant?.name || 'Chưa gán'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '600', color: '#334155', fontFamily: 'monospace' }}>{trip.busId?.plateNumber || 'N/A'}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>{seatsSold} / {totalCap} ghế</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{tripRev.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {renderPagination(paginate(gmCalculations.trips), page, setPage)}
              </div>
            )}

            {/* ==================== 2. BÁO CÁO QUẢN LÝ VẬN TẢI & ĐIỀU HÀNH ==================== */}
            {department === 'ops' && opsTab === 'punctuality' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Tỷ Lệ Đúng Giờ &amp; Trễ Chuyến Vận Hành</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Báo cáo giám sát độ chuẩn xác giờ xuất bến, trễ giờ và hủy chuyến</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#065f46' }}>CHUYẾN ĐÚNG GIỜ</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669', margin: '4px 0' }}>{opsCalculations.onTimeCount}</div>
                    <div style={{ fontSize: '0.7rem', color: '#047857' }}>Xuất bến đúng kế hoạch</div>
                  </div>
                  <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '10px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#991b1b' }}>CHUYẾN TRỄ GIỜ</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#dc2626', margin: '4px 0' }}>{opsCalculations.delayedCount}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b91c1c' }}>Trễ do kẹt xe hoặc sự cố kỹ thuật</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>CHUYẾN HỦY</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#64748b', margin: '4px 0' }}>{opsCalculations.cancelledCount}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Hủy điều phối hoặc gộp chuyến</div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>KHỞI HÀNH</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TÀI XẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TÌNH TRẠNG</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>ĐỘ LỆCH THỜI GIAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(opsCalculations.trips).currentItems.map((trip) => {
                        const isDel = trip.punctualityStatus === 'delayed' || (trip.departureDelayMinutes && trip.departureDelayMinutes > 15);
                        return (
                          <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>
                              {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                              {new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '600' }}>{trip.driver?.name || 'Chưa gán'}</td>
                            <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace' }}>{trip.busId?.plateNumber || 'N/A'}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                              <span style={{
                                background: isDel ? '#fee2e2' : '#dcfce7',
                                color: isDel ? '#b91c1c' : '#15803d',
                                fontWeight: '700', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem'
                              }}>
                                {isDel ? 'Trễ giờ' : 'Đúng giờ'}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: isDel ? '#dc2626' : '#059669' }}>
                              {isDel ? `+${trip.departureDelayMinutes || 20} phút` : 'Đúng giờ xuất bến'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {renderPagination(paginate(opsCalculations.trips), page, setPage)}
              </div>
            )}

            {department === 'ops' && opsTab === 'occupancy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Hiệu Suất Lấp Đầy Ghế Theo Khung Giờ (Heatmap)</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Phân tích nhu cầu đi lại theo từng ca thời gian trong ngày</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>KHUNG GIỜ</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>KHOẢNG THỜI GIAN</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ CHUYẾN CHẠY</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ VÉ ĐÃ BÁN</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TỔNG GHẾ KHẢ DỤNG</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TỶ LỆ LẤP ĐẦY (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opsCalculations.timeSlots.map((slot, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>{slot.name}</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontWeight: '600' }}>{slot.period}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600' }}>{slot.tripCount} chuyến</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{slot.ticketsSold} vé</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#64748b' }}>{slot.capacity} ghế</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            <span style={{
                              background: slot.occupancy >= 50 ? '#dcfce7' : '#eff6ff',
                              color: slot.occupancy >= 50 ? '#15803d' : '#2563eb',
                              fontWeight: '700', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem'
                            }}>
                              {slot.occupancy}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {department === 'ops' && opsTab === 'workload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Điều Động &amp; Khối Lượng Vận Hành Tổ Lái</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Theo dõi số chuyến chạy, giờ làm việc thực tế và ngày nghỉ của Tài xế &amp; Phụ xe</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>HỌ TÊN NHÂN SỰ</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>SỐ ĐIỆN THOẠI</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>VAI TRÒ KÍP</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ CHUYẾN CHẠY</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>GIỜ VẬN HÀNH ƯỚC TÍNH</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>NGÀY NGHỈ PHÉP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(opsCalculations.crewWorkload).currentItems.map((cw, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>{cw.name}</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontFamily: 'monospace' }}>{cw.phone}</td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <span style={{
                              background: cw.role === 'driver' ? '#eff6ff' : '#f1f5f9',
                              color: cw.role === 'driver' ? '#1d4ed8' : '#475569',
                              fontWeight: '700', padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem'
                            }}>
                              {cw.role === 'driver' ? 'Tài xế chính' : 'Phụ xe'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>{cw.tripsRun} chuyến</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{Math.round(cw.estHours)} giờ</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#64748b' }}>{cw.leavesCount} ngày</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPagination(paginate(opsCalculations.crewWorkload), page, setPage)}
              </div>
            )}

            {department === 'ops' && opsTab === 'trips' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Nhật Ký Điều Phối Chuyến Xe</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Chi tiết các chuyến xe điều phối theo thời gian và tuyến đường</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>KHỞI HÀNH</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TÀI XẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>VÉ ĐẶT</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(opsCalculations.trips).currentItems.map((trip) => (
                        <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>
                            {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                            {new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace' }}>{trip.busId?.plateNumber || 'N/A'}</td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>{trip.driver?.name || 'Chưa gán'}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>{trip.bookedSeats?.length || 0} vé</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            <span style={{
                              background: trip.punctualityStatus === 'delayed' ? '#fee2e2' : '#dcfce7',
                              color: trip.punctualityStatus === 'delayed' ? '#b91c1c' : '#15803d',
                              fontWeight: '700', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem'
                            }}>
                              {trip.punctualityStatus === 'delayed' ? 'Trễ giờ' : 'Đúng giờ'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPagination(paginate(opsCalculations.trips), page, setPage)}
              </div>
            )}

            {/* ==================== 3. BÁO CÁO BÁN VÉ & PHÒNG VÉ ==================== */}
            {department === 'agent' && agentTab === 'channel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Cơ Cấu Kênh Bán &amp; Phương Thức Thanh Toán</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>So sánh doanh số vé bán trực tiếp tại Quầy vs Đặt vé trực tuyến PayOS</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>KÊNH BÁN VÉ TẠI QUẦY (OFFLINE)</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#059669', marginBottom: '2px' }}>
                      {agentCalculations.cashRevenue.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Số lượng vé quầy: <strong style={{ color: '#0f172a' }}>{agentCalculations.counterTickets}</strong> vé
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>KÊNH ĐẶT VÉ TRỰC TUYẾN PAYOS (ONLINE)</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px' }}>
                      {agentCalculations.cashlessRevenue.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Số lượng vé online: <strong style={{ color: '#0f172a' }}>{agentCalculations.onlineTickets}</strong> vé
                    </div>
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Tỷ Trọng Kênh Bán</div>
                  <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: '#e2e8f0' }}>
                    <div style={{ width: `${agentCalculations.totalTickets > 0 ? (agentCalculations.counterTickets / agentCalculations.totalTickets) * 100 : 50}%`, background: '#059669' }} />
                    <div style={{ width: `${agentCalculations.totalTickets > 0 ? (agentCalculations.onlineTickets / agentCalculations.totalTickets) * 100 : 50}%`, background: '#2563eb' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '6px', color: '#64748b' }}>
                    <span>Xanh lá: Bán tại quầy</span>
                    <span>Xanh dương: Đặt online PayOS</span>
                  </div>
                </div>
              </div>
            )}

            {department === 'agent' && agentTab === 'shifts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Báo Cáo Ca Trực &amp; Bàn Giao Quỹ Tiền Mặt</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Lịch sử mở ca, chốt tiền mặt và ghi chú bàn giao cho thủ quỹ từ CSDL</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>QUẦY VÉ</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>THỜI GIAN TRỰC</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>QUỸ BAN ĐẦU</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>TIỀN MẶT THU QUẦY</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>CHUYỂN KHOẢN PAYOS</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>GHI CHÚ BÀN GIAO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(agentCalculations.shifts).currentItems.map((s) => (
                        <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>{s.counterNumber || 'Quầy vé'}</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.74rem' }}>
                            {s.startTime ? new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '...'} - {s.endTime ? new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang trực'}
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{s.startTime ? new Date(s.startTime).toLocaleDateString('vi-VN') : ''}</div>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#64748b' }}>{(s.initialCash || 0).toLocaleString('vi-VN')} đ</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#059669' }}>{(s.cashRevenue || 0).toLocaleString('vi-VN')} đ</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>{(s.cashlessRevenue || 0).toLocaleString('vi-VN')} đ</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#475569', fontSize: '0.72rem', maxWidth: '250px', whiteSpace: 'normal' }}>
                            {s.notes || 'Không có ghi chú đặc biệt.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPagination(paginate(agentCalculations.shifts), page, setPage)}
              </div>
            )}

            {department === 'agent' && agentTab === 'tickets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bảng Kê Danh Sách Vé Bán CSDL</h3>
                    <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Chi tiết từng vé bán ra trong hệ thống MongoDB</p>
                  </div>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                    {agentCalculations.bookings.length} giao dịch vé
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>MÃ ĐẶT VÉ</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>HÀNH KHÁCH</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN ĐƯỜNG</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ GHẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>GIÁ VÉ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>KÊNH BÁN</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(agentCalculations.bookings).currentItems.map((b) => {
                        const price = (b.seats?.length || 1) * (b.tripId?.price || 200000);
                        return (
                          <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                              #{b.orderCode || b._id.slice(-6).toUpperCase()}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>{b.customerName || 'Khách vãng lai'}</div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{b.customerPhone}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', color: '#334155' }}>
                              {b.tripId?.routeId ? `${b.tripId.routeId.startPoint} ➔ ${b.tripId.routeId.endPoint}` : 'N/A'}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>
                              {(b.seats || []).join(', ')}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                              {price.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                              <span style={{
                                background: b.paymentType === 'immediate' ? '#ecfdf5' : '#eff6ff',
                                color: b.paymentType === 'immediate' ? '#059669' : '#1d4ed8',
                                fontWeight: '700', padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem'
                              }}>
                                {b.paymentType === 'immediate' ? 'Tại quầy' : 'PayOS'}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                              <span style={{
                                background: b.status === 'paid' ? '#dcfce7' : '#fee2e2',
                                color: b.status === 'paid' ? '#15803d' : '#b91c1c',
                                fontWeight: '700', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem'
                              }}>
                                {b.status === 'paid' ? 'Đã thu tiền' : 'Chờ / Hủy'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {renderPagination(paginate(agentCalculations.bookings), page, setPage)}
              </div>
            )}

            {/* ==================== 4. BÁO CÁO PHƯƠNG TIỆN & ĐỘI XE ==================== */}
            {department === 'fleet' && fleetTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Hiệu Suất Khai Thác Từng Biển Số Xe</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Thống kê tổng số chuyến phục vụ, km lăn bánh và tình trạng của từng xe</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>DÒNG XE</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ GHẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ CHUYẾN CHẠY</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>QUÃNG ĐƯỜNG LĂN BÁNH</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>LẤP ĐẦY GHẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TÌNH TRẠNG KỸ THUẬT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fleetCalculations.busMetrics.map((bm, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                            {bm.bus.plateNumber}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#475569', fontWeight: '600' }}>{bm.bus.type}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#64748b' }}>{bm.bus.totalSeats} ghế</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>{bm.tripsCount} chuyến</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{bm.distance.toLocaleString('vi-VN')} km</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            <span style={{
                              background: bm.occupancy > 50 ? '#dcfce7' : '#eff6ff',
                              color: bm.occupancy > 50 ? '#15803d' : '#2563eb',
                              fontWeight: '700', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem'
                            }}>
                              {bm.occupancy}%
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            <span style={{
                              background: bm.isUrgent ? '#fee2e2' : bm.isDueSoon ? '#fef3c7' : '#dcfce7',
                              color: bm.isUrgent ? '#b91c1c' : bm.isDueSoon ? '#b45309' : '#15803d',
                              fontWeight: '700', padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem'
                            }}>
                              {bm.isUrgent ? 'Cần bảo trì gấp' : bm.isDueSoon ? 'Sắp đến hạn' : 'Sẵn sàng vận hành'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {department === 'fleet' && fleetTab === 'fuel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Định Mức &amp; Ước Tính Tiêu Hao Nhiên Liệu</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Dựa trên số km lăn bánh thực tế từ CSDL và định mức tiêu thụ của từng dòng xe</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>DÒNG XE</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>QUÃNG ĐƯỜNG (KM)</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>ĐỊNH MỨC TIÊU THỤ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>NHIÊN LIỆU TIÊU THỤ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>CHI PHÍ NHIÊN LIỆU (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fleetCalculations.busMetrics.map((bm, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{bm.bus.plateNumber}</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{bm.bus.type}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '600' }}>{bm.distance.toLocaleString('vi-VN')} km</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{bm.stdRate} Lít / 100km</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#d97706' }}>{bm.fuelConsumed.toLocaleString('vi-VN')} Lít</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{bm.fuelCost.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {department === 'fleet' && fleetTab === 'maintenance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Nhật Ký &amp; Chi Phí Bảo Dưỡng Kỹ Thuật</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Theo dõi các hạng mục sửa chữa, thay thế phụ tùng và chi phí garage</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>HẠNG MỤC SỬA CHỮA</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>GARAGE THỰC HIỆN</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>CHI PHÍ BẢO DƯỠNG</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>NGÀY THỰC HIỆN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fleetCalculations.maintenanceList.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                            Chưa có dữ liệu bảo dưỡng trong hệ thống.
                          </td>
                        </tr>
                      ) : (
                        fleetCalculations.maintenanceList.map((m, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                              {m.plateNumber || 'N/A'}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '600', color: '#334155' }}>{m.description || m.type}</td>
                            <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{m.garage || 'Garage nội bộ'}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#b45309' }}>
                              {(m.cost || 0).toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#64748b' }}>
                              {m.startDate ? new Date(m.startDate).toLocaleDateString('vi-VN') : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

// Helper pagination component
const renderPagination = (paginationData, currentPage, setPage) => {
  const { totalPages, totalItems } = paginationData;
  if (totalItems <= ITEMS_PER_PAGE) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
      <div>
        Hiển thị <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> - <strong>{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</strong> trên tổng số <strong>{totalItems}</strong> mục
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          style={{
            padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : '#ffffff',
            color: currentPage === 1 ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Trước
        </button>
        <span style={{ fontWeight: '700', color: '#0f172a' }}>Trang {currentPage} / {totalPages}</span>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          style={{
            padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
            color: currentPage >= totalPages ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Sau
        </button>
      </div>
    </div>
  );
};

export default GmReportsPage;
