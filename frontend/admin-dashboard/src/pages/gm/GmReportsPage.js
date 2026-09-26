import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';
const ITEMS_PER_PAGE = 10;

// Export strictly real database report data to Excel CSV
const exportRealReportToExcel = (routeStats = [], driverStats = [], tripLedger = [], overall = {}, activeFilters = {}) => {
  let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
  csvContent += 'BÁO CÁO DOANH THU & VẬN HÀNH DỮ LIỆU THỰC - AN BÌNH LINES\n';
  csvContent += `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}\n`;
  csvContent += `Bộ lọc áp dụng: Khoảng thời gian (${activeFilters.timeRangeLabel || 'Tất cả'}), Tuyến đường (${activeFilters.routeLabel || 'Tất cả các tuyến'})\n\n`;

  csvContent += `TỔNG DOANH THU THỰC NHẬN: ${overall.totalRevenue.toLocaleString('vi-VN')} VNĐ\n`;
  csvContent += `TỔNG SỐ VÉ BÁN: ${overall.ticketsSold} vé\n`;
  csvContent += `TỔNG SỐ CHUYẾN XE: ${overall.totalTrips} chuyến\n`;
  csvContent += `TỶ LỆ LẤP ĐẦY GHẾ (OCCUPANCY): ${overall.avgOccupancy}%\n\n`;

  csvContent += '--- 1. BÁO CÁO DOANH THU THEO TUYẾN ĐƯỜNG ---\n';
  csvContent += 'STT,Tuyến Đường,Số Chuyến Vận Hành,Số Vé Bán,Tổng Ghế Khả Dụng,Tỷ Lệ Lấp Đầy (%),Tổng Doanh Thu (VNĐ),Doanh Thu Bình Quân/Chuyến (VNĐ)\n';

  routeStats.forEach((stat, index) => {
    const routeStr = `"${stat.routeName}"`;
    const avgRev = stat.tripCount > 0 ? Math.round(stat.revenue / stat.tripCount) : 0;
    csvContent += `${index + 1},${routeStr},${stat.tripCount},${stat.ticketsSold},${stat.capacity},${stat.occupancy}%,${stat.revenue},${avgRev}\n`;
  });

  csvContent += '\n--- 2. BÁO CÁO DOANH SỐ THEO TÀI XẾ / KÍP XE ---\n';
  csvContent += 'STT,Tài Xế Phụ Trách,Số Chuyến Lái,Số Vé Bán Được,Doanh Thu Tạo Ra (VNĐ)\n';

  driverStats.forEach((st, index) => {
    csvContent += `${index + 1},"${st.name}",${st.tripsRun},${st.ticketsHandled},${st.revenueGenerated}\n`;
  });

  csvContent += '\n--- 3. DANH SÁCH CHI TIẾT CÁC CHUYẾN XE ---\n';
  csvContent += 'STT,Mã Chuyến,Tuyến Xe,Thời Gian Khởi Hành,Tài Xế,Phụ Xe,Biển Số Xe,Số Vé Bán/Tổng Ghế,Doanh Thu Chuyến (VNĐ)\n';

  tripLedger.forEach((trip, index) => {
    const routeStr = trip.routeId ? `"${trip.routeId.startPoint} -> ${trip.routeId.endPoint}"` : '"N/A"';
    const depTime = `"${new Date(trip.departureTime).toLocaleString('vi-VN')}"`;
    const driver = `"${(trip.driver?.name || 'Chưa gán').replace(/"/g, '""')}"`;
    const assistant = `"${(trip.assistant?.name || 'Chưa gán').replace(/"/g, '""')}"`;
    const bus = `"${(trip.busId?.plateNumber || 'N/A').replace(/"/g, '""')}"`;
    const seatsSold = trip.bookedSeats?.length || 0;
    const totalCap = trip.busId?.totalSeats || 44;
    const tripRev = seatsSold * (trip.price || 0);

    csvContent += `${index + 1},${trip._id || ''},${routeStr},${depTime},${driver},${assistant},${bus},${seatsSold}/${totalCap},${tripRev}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_Doanh_Thu_Real_AnBinhLines_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const GmReportsPage = () => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Raw data from MongoDB API
  const [rawTrips, setRawTrips] = useState([]);
  const [routesList, setRoutesList] = useState([]);

  // Active filter states
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'today', 'last7days', 'thisMonth', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [reportTab, setReportTab] = useState('routes'); // 'routes', 'drivers', 'ledger'

  // Calculated Real DB Metrics
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [routeStats, setRouteStats] = useState([]);
  const [driverStats, setDriverStats] = useState([]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [avgOccupancy, setAvgOccupancy] = useState(0);

  // Pagination states (10 items per page)
  const [pageRoutes, setPageRoutes] = useState(1);
  const [pageDrivers, setPageDrivers] = useState(1);
  const [pageLedger, setPageLedger] = useState(1);

  // Fetch real data from Backend / MongoDB
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Trips from DB
      const tripsRes = await fetch(`${API_BASE}/trips/ops/trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tripsData = await tripsRes.json();
      const tripsArr = tripsData.success ? (tripsData.trips || []) : [];

      // 2. Fetch Routes from DB
      const routesRes = await fetch(`${API_BASE}/trips/ops/routes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const routesData = await routesRes.json();
      const routesArr = routesData.success ? (routesData.routes || []) : [];

      setRawTrips(tripsArr);
      setRoutesList(routesArr);
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu báo cáo từ CSDL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReportData();
    }
  }, [token]);

  // Recalculate 100% REAL DB metrics whenever filters change
  useEffect(() => {
    if (!rawTrips) return;

    let result = [...rawTrips];

    // 1. Date Range Filter
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

    // 2. Route Filter
    if (selectedRoute !== 'all') {
      result = result.filter(t => t.routeId && (t.routeId._id === selectedRoute || t.routeId === selectedRoute));
    }

    setFilteredTrips(result);

    // 3. Calculate 100% Real Aggregated Totals
    let revSum = 0;
    let tixSum = 0;
    let capacitySum = 0;

    const routeMap = {};
    const driverMap = {};

    result.forEach((trip, idx) => {
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

      // Group by Route
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

      // Group by Driver
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

    const occupancyPct = capacitySum > 0 ? Math.round((tixSum / capacitySum) * 100) : 0;

    setTotalRevenue(revSum);
    setTicketsSold(tixSum);
    setTotalTrips(result.length);
    setAvgOccupancy(occupancyPct);

    // Format Route Stats Array
    const routesArr = Object.values(routeMap).map(r => ({
      ...r,
      occupancy: r.capacity > 0 ? Math.round((r.ticketsSold / r.capacity) * 100) : 0
    }));

    setRouteStats(routesArr);
    setDriverStats(Object.values(driverMap));

    // Reset pagination to page 1 on filter changes
    setPageRoutes(1);
    setPageDrivers(1);
    setPageLedger(1);

  }, [rawTrips, timeRange, fromDate, toDate, selectedRoute]);

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

  // Calculate paginated slices
  const totalRoutePages = Math.ceil(routeStats.length / ITEMS_PER_PAGE) || 1;
  const paginatedRouteStats = routeStats.slice((pageRoutes - 1) * ITEMS_PER_PAGE, pageRoutes * ITEMS_PER_PAGE);

  const totalDriverPages = Math.ceil(driverStats.length / ITEMS_PER_PAGE) || 1;
  const paginatedDriverStats = driverStats.slice((pageDrivers - 1) * ITEMS_PER_PAGE, pageDrivers * ITEMS_PER_PAGE);

  const totalLedgerPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE) || 1;
  const paginatedLedgerTrips = filteredTrips.slice((pageLedger - 1) * ITEMS_PER_PAGE, pageLedger * ITEMS_PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Main Top White Card Container wrapping Header & Filters & 4 Real KPI Cards */}
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
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>Báo Cáo Doanh Thu &amp; Vận Hành CSDL</h1>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                Ban Giám Đốc Real Data
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Tổng hợp 100% dữ liệu thực từ MongoDB: Doanh thu bán vé, số lượng chuyến xe, vé đặt thành công và hiệu suất lấp đầy ghế
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
              Đồng bộ dữ liệu
            </button>
            <button
              onClick={() => exportRealReportToExcel(routeStats, driverStats, filteredTrips, { totalRevenue, ticketsSold, totalTrips, avgOccupancy }, { timeRangeLabel: getTimeRangeLabel(), routeLabel: getRouteLabel() })}
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

        {/* Filter Bar (Bộ Lọc Dữ Liệu Thực Thời Gian & Tuyến Xe) */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            {/* Filter 1: Time Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Khoảng thời gian:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', outline: 'none'
                }}
              >
                <option value="all">Toàn bộ thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="last7days">7 ngày qua</option>
                <option value="thisMonth">Tháng này</option>
                <option value="custom">Tùy chọn khoảng ngày</option>
              </select>
            </div>

            {/* Custom Date Range Controls */}
            {timeRange === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>➔</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}

            {/* Filter 2: Route */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Tuyến khai thác:</span>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600', outline: 'none'
                }}
              >
                <option value="all">Tất cả các tuyến</option>
                {routesList.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.startPoint} ➔ {r.endPoint} ({r.distance})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Info Badge */}
          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
            Đang hiển thị: <strong style={{ color: '#0f172a' }}>{getTimeRangeLabel()}</strong> | <strong style={{ color: '#0f172a' }}>{getRouteLabel()}</strong> ({filteredTrips.length} chuyến xe)
          </div>
        </div>

        {/* 4 Stat Cards Grid (100% Real DB Metrics) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          {/* Card 1: Tổng Doanh Thu */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG DOANH THU THỰC NHẬN</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginBottom: '2px', lineHeight: '1.2' }}>
              {totalRevenue.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>đ</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
              Hóa đơn điện tử đồng bộ trực tiếp từ CSDL
            </div>
          </div>

          {/* Card 2: Số Vé Bán */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SỐ VÉ ĐÃ ĐẶT THÀNH CÔNG</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><line x1="13" y1="5" x2="13" y2="19"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="17" y1="12" x2="17.01" y2="12"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px', lineHeight: '1.2' }}>
              {ticketsSold} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vé</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              Bao gồm vé quầy &amp; vé đặt online PayOS
            </div>
          </div>

          {/* Card 3: Số Chuyến Xe */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHUYẾN XE ĐÃ KHAI THÁC</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {totalTrips} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#9333ea', fontWeight: '600' }}>
              Vận tải liên tỉnh xoay vòng chặng
            </div>
          </div>

          {/* Card 4: Tỷ lệ lấp đầy */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HIỆU SUẤT LẤP ĐẦY GHẾ</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706', marginBottom: '2px', lineHeight: '1.2' }}>
              {avgOccupancy}%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '600' }}>
              Hệ số khai thác tải trọng khoang xe
            </div>
          </div>
        </div>
      </div>

      {/* Report Sub-Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: '0.4rem 0.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setReportTab('routes')}
          style={{
            flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
            backgroundColor: reportTab === 'routes' ? '#eff6ff' : 'transparent',
            color: reportTab === 'routes' ? '#2563eb' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Báo Cáo Doanh Thu Theo Tuyến Đường
        </button>
        <button
          onClick={() => setReportTab('drivers')}
          style={{
            flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
            backgroundColor: reportTab === 'drivers' ? '#ecfdf5' : 'transparent',
            color: reportTab === 'drivers' ? '#059669' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Doanh Số Phục Vụ Theo Tài Xế / Kíp Xe
        </button>
        <button
          onClick={() => setReportTab('ledger')}
          style={{
            flex: 1, padding: '0.55rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
            backgroundColor: reportTab === 'ledger' ? '#faf5ff' : 'transparent',
            color: reportTab === 'ledger' ? '#9333ea' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Bảng Kê Chi Tiết Từng Chuyến Xe (Dữ Liệu CSDL)
        </button>
      </div>

      {/* Main Report Table Container */}
      <div style={{ background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#2563eb', fontWeight: '700' }}>
            Đang tải dữ liệu thực từ MongoDB...
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem' }}>{error}</div>
        ) : (
          <>
            {/* TAB 1: Báo Cáo Doanh Thu Theo Tuyến Đường */}
            {reportTab === 'routes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Báo Cáo Doanh Thu Theo Tuyến Khai Thác</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Bảng kê doanh số bán vé, tổng số chuyến và hệ số lấp đầy ghế thực tế từ CSDL</p>
                </div>

                {/* Progress Share Bars */}
                <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Biểu Đồ Thị Phần Doanh Thu Chặng</span>
                  {routeStats.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Chưa có dữ liệu tuyến xe.</span>
                  ) : (
                    routeStats.map((stat, idx) => {
                      const pct = totalRevenue > 0 ? Math.round((stat.revenue / totalRevenue) * 100) : 0;
                      const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2'];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                            <span style={{ color: '#1e293b' }}>{stat.routeName}</span>
                            <span style={{ color }}>{stat.revenue.toLocaleString('vi-VN')} đ ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN KHAI THÁC</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ CHUYẾN CHẠY</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ VÉ ĐÃ BÁN</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TỔNG SỐ GHẾ KHẢ DỤNG</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TỶ LỆ LẤP ĐẦY GHẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU CSDL (VNĐ)</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU BÌNH QUÂN / CHUYẾN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routeStats.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                            Chưa có dữ liệu chuyến xe nào theo bộ lọc đã chọn.
                          </td>
                        </tr>
                      ) : (
                        paginatedRouteStats.map((stat, idx) => {
                          const avgRev = stat.tripCount > 0 ? Math.round(stat.revenue / stat.tripCount) : 0;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>{stat.routeName}</td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600' }}>{stat.tripCount} chuyến</td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{stat.ticketsSold} vé</td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#64748b' }}>{stat.capacity} ghế</td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                                <span style={{
                                  backgroundColor: stat.occupancy > 50 ? '#dcfce7' : '#eff6ff',
                                  color: stat.occupancy > 50 ? '#15803d' : '#2563eb',
                                  fontWeight: '700', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem'
                                }}>
                                  {stat.occupancy}%
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                                {stat.revenue.toLocaleString('vi-VN')} đ
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>
                                {avgRev.toLocaleString('vi-VN')} đ
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls for Routes Tab */}
                {routeStats.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
                    <div>
                      Hiển thị <strong>{((pageRoutes - 1) * ITEMS_PER_PAGE) + 1}</strong> - <strong>{Math.min(pageRoutes * ITEMS_PER_PAGE, routeStats.length)}</strong> trên tổng số <strong>{routeStats.length}</strong> tuyến
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        disabled={pageRoutes === 1}
                        onClick={() => setPageRoutes(p => Math.max(1, p - 1))}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: pageRoutes === 1 ? '#f8fafc' : '#ffffff',
                          color: pageRoutes === 1 ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: pageRoutes === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Trước
                      </button>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>Trang {pageRoutes} / {totalRoutePages}</span>
                      <button
                        disabled={pageRoutes >= totalRoutePages}
                        onClick={() => setPageRoutes(p => Math.min(totalRoutePages, p + 1))}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: pageRoutes >= totalRoutePages ? '#f8fafc' : '#ffffff',
                          color: pageRoutes >= totalRoutePages ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: pageRoutes >= totalRoutePages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Báo Cáo Doanh Số Theo Tài Xế */}
            {reportTab === 'drivers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Thống Kê Doanh Số Khai Thác Theo Tài Xế Phụ Trách</h3>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Lấy dữ liệu thực từ mảng phân công driver trong collection Trips ở MongoDB</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>HỌ TÊN TÀI XẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>SỐ ĐIỆN THOẠI</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ CHUYẾN ĐÃ LÁI</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ VÉ PHỤC VỤ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU MANG VỀ (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverStats.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                            Chưa có dữ liệu phân công tài xế trong khoảng thời gian đã chọn.
                          </td>
                        </tr>
                      ) : (
                        paginatedDriverStats.map((st, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>{st.name}</td>
                            <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontFamily: 'monospace' }}>{st.phone}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600' }}>{st.tripsRun} chuyến</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{st.ticketsHandled} vé</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                              {st.revenueGenerated.toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls for Drivers Tab */}
                {driverStats.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
                    <div>
                      Hiển thị <strong>{((pageDrivers - 1) * ITEMS_PER_PAGE) + 1}</strong> - <strong>{Math.min(pageDrivers * ITEMS_PER_PAGE, driverStats.length)}</strong> trên tổng số <strong>{driverStats.length}</strong> tài xế
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        disabled={pageDrivers === 1}
                        onClick={() => setPageDrivers(p => Math.max(1, p - 1))}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: pageDrivers === 1 ? '#f8fafc' : '#ffffff',
                          color: pageDrivers === 1 ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: pageDrivers === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Trước
                      </button>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>Trang {pageDrivers} / {totalDriverPages}</span>
                      <button
                        disabled={pageDrivers >= totalDriverPages}
                        onClick={() => setPageDrivers(p => Math.min(totalDriverPages, p + 1))}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: pageDrivers >= totalDriverPages ? '#f8fafc' : '#ffffff',
                          color: pageDrivers >= totalDriverPages ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: pageDrivers >= totalDriverPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Bảng kê chi tiết từng chuyến xe */}
            {reportTab === 'ledger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Bảng Kê Chi Tiết Từng Chuyến Xe</h3>
                    <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Liệt kê đầy đủ từng chuyến xe, thông tin vé bán, kíp xe và doanh thu từng chuyến từ CSDL</p>
                  </div>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                    {filteredTrips.length} chuyến xe
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN XE</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>KHỞI HÀNH</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>NHÂN SỰ (TÀI XẾ &amp; PHỤ XẾ)</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ XE</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ VÉ BÁN / TỔNG GHẾ</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU CHUYẾN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrips.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                            Chưa có chuyến xe nào khớp với bộ lọc đã chọn.
                          </td>
                        </tr>
                      ) : (
                        paginatedLedgerTrips.map((trip) => {
                          const seatsSold = trip.bookedSeats?.length || 0;
                          const totalCap = trip.busId?.totalSeats || 44;
                          const tripRev = seatsSold * (trip.price || 0);
                          const depTime = new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

                          return (
                            <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#0f172a' }}>
                                {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.74rem' }}>{depTime}</td>
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{trip.driver?.name || 'Chưa gán'}</span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Phụ: {trip.assistant?.name || 'Chưa gán'}</span>
                                </div>
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', fontWeight: '600', color: '#334155', fontFamily: 'monospace' }}>
                                {trip.busId?.plateNumber || 'N/A'}
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>
                                {seatsSold} / {totalCap} ghế
                              </td>
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                                {tripRev.toLocaleString('vi-VN')} đ
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls for Ledger Tab */}
                {filteredTrips.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
                    <div>
                      Hiển thị <strong>{((pageLedger - 1) * ITEMS_PER_PAGE) + 1}</strong> - <strong>{Math.min(pageLedger * ITEMS_PER_PAGE, filteredTrips.length)}</strong> trên tổng số <strong>{filteredTrips.length}</strong> chuyến xe
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        disabled={pageLedger === 1}
                        onClick={() => setPageLedger(p => Math.max(1, p - 1))}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: pageLedger === 1 ? '#f8fafc' : '#ffffff',
                          color: pageLedger === 1 ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: pageLedger === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Trước
                      </button>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>Trang {pageLedger} / {totalLedgerPages}</span>
                      <button
                        disabled={pageLedger >= totalLedgerPages}
                        onClick={() => setPageLedger(p => Math.min(totalLedgerPages, p + 1))}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: pageLedger >= totalLedgerPages ? '#f8fafc' : '#ffffff',
                          color: pageLedger >= totalLedgerPages ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: pageLedger >= totalLedgerPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default GmReportsPage;
