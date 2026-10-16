import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const AgentTripsPage = ({ setActiveTab }) => {
  const { token } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [locations, setLocations] = useState({ origins: [], destinations: [], routes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc tìm kiếm
  const [departureSearch, setDepartureSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBusType, setSelectedBusType] = useState('all');
  const [seatFilter, setSeatFilter] = useState('all'); // 'all', 'available', 'almost_full'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'waiting', 'departing_soon', 'departed'

  // Phân trang: 10 chuyến mỗi trang
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal chi tiết chuyến xe
  const [selectedTripModal, setSelectedTripModal] = useState(null);

  // Helper ngày hôm nay / ngày mai
  const formatDateToYMD = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatDateToYMD(new Date());
  const tomorrowStr = formatDateToYMD(new Date(Date.now() + 86400000));
  const dayAfterTomorrowStr = formatDateToYMD(new Date(Date.now() + 86400000 * 2));

  // Tải dữ liệu toàn bộ chuyến xe và các tuyến
  const fetchTripsData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Tải danh mục tuyến & địa điểm
      try {
        const routesRes = await fetch(`${API_BASE}/trips/routes`);
        const routesData = await routesRes.json();
        if (routesRes.ok && routesData.success) {
          setLocations({
            origins: routesData.origins || [],
            destinations: routesData.destinations || [],
            routes: routesData.routes || []
          });
        }
      } catch (e) {
        console.warn('Lỗi lấy danh mục tuyến đường:', e);
      }

      // 2. Tải toàn bộ chuyến xe từ CSDL (ops/trips)
      const res = await fetch(`${API_BASE}/trips/ops/trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrips(data.trips || []);
      } else {
        // Fallback endpoint nếu không phải ops
        const backupRes = await fetch(`${API_BASE}/users/my-schedule`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const backupData = await backupRes.json();
        if (backupRes.ok && backupData.success) {
          setTrips(backupData.trips || []);
        } else {
          setError(data.message || 'Không thể tải danh sách chuyến xe từ máy chủ.');
        }
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi truy vấn dữ liệu chuyến xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsData();
  }, [token]);

  // Chuẩn hóa chuỗi tìm kiếm tiếng Việt không dấu
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[\.,]/g, '')
      .toLowerCase()
      .trim();
  };

  // Lọc chuyến xe
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const startInput = normalizeText(departureSearch);
      const endInput = normalizeText(destinationSearch);

      const tripStart = normalizeText(trip.routeId?.startPoint || '');
      const tripEnd = normalizeText(trip.routeId?.endPoint || '');
      const busPlate = normalizeText(trip.busId?.plateNumber || '');

      const startMatch = !departureSearch || tripStart.includes(startInput);
      const endMatch = !destinationSearch || tripEnd.includes(endInput);
      const plateMatch = !departureSearch || busPlate.includes(startInput);

      if (!((startMatch && endMatch) || plateMatch)) {
        return false;
      }

      // Lọc theo ngày
      if (selectedDate) {
        const tripDateStr = formatDateToYMD(trip.departureTime);
        if (tripDateStr !== selectedDate) return false;
      }

      // Lọc theo loại xe
      if (selectedBusType !== 'all') {
        const tripBusType = trip.busId?.type || '';
        if (selectedBusType === 'limousine' && !tripBusType.toLowerCase().includes('limousine')) return false;
        if (selectedBusType === 'giuong_nam' && !tripBusType.toLowerCase().includes('giường nằm')) return false;
        if (selectedBusType === 'ghe_ngoi' && !tripBusType.toLowerCase().includes('ghế ngồi')) return false;
      }

      // Tính số ghế trống
      const totalSeats = trip.busId?.totalSeats || 36;
      const bookedCount = trip.bookedSeats?.length || 0;
      const emptySeats = Math.max(0, totalSeats - bookedCount);

      // Lọc theo ghế trống
      if (seatFilter === 'available' && emptySeats <= 0) return false;
      if (seatFilter === 'almost_full' && (emptySeats === 0 || emptySeats > 5)) return false;

      // Lọc theo trạng thái
      if (statusFilter !== 'all') {
        const diffMinutes = (new Date(trip.departureTime) - new Date()) / (1000 * 60);
        if (statusFilter === 'departed' && diffMinutes >= 0) return false;
        if (statusFilter === 'departing_soon' && (diffMinutes < 0 || diffMinutes > 60)) return false;
        if (statusFilter === 'waiting' && diffMinutes <= 60) return false;
      }

      return true;
    });
  }, [trips, departureSearch, destinationSearch, selectedDate, selectedBusType, seatFilter, statusFilter]);

  // Phân trang
  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE) || 1;
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTrips.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTrips, currentPage]);

  // Reset trang về 1 khi thay đổi điều kiện lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [departureSearch, destinationSearch, selectedDate, selectedBusType, seatFilter, statusFilter]);

  const formatCurrency = (number) => {
    if (!number && number !== 0) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(number) + ' đ';
  };

  const getDepartureStatusBadge = (departureTime) => {
    const minutesLeft = (new Date(departureTime) - new Date()) / (1000 * 60);
    if (minutesLeft < 0) {
      return { text: 'Đã xuất bến', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
    } else if (minutesLeft <= 60) {
      return { text: `Sắp chạy (${Math.round(minutesLeft)} phút)`, bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    } else {
      return { text: 'Chờ xuất bến', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    }
  };

  // Số liệu tổng quan 4 thẻ
  const totalTripsCount = trips.length;
  const todayTripsCount = trips.filter(t => formatDateToYMD(t.departureTime) === todayStr).length;
  const totalAvailableSeats = trips.reduce((sum, t) => {
    const total = t.busId?.totalSeats || 36;
    const booked = t.bookedSeats?.length || 0;
    return sum + Math.max(0, total - booked);
  }, 0);

  // Quick route chips
  const quickRoutes = [
    { label: 'Tất cả tuyến', from: '', to: '' },
    { label: 'Sài Gòn - Đà Lạt', from: 'Hồ Chí Minh', to: 'Đà Lạt' },
    { label: 'Đà Lạt - Sài Gòn', from: 'Đà Lạt', to: 'Hồ Chí Minh' },
    { label: 'Sài Gòn - Nha Trang', from: 'Hồ Chí Minh', to: 'Nha Trang' },
    { label: 'Sài Gòn - Cần Thơ', from: 'Hồ Chí Minh', to: 'Cần Thơ' },
    { label: 'Sài Gòn - Rạch Giá', from: 'Hồ Chí Minh', to: 'Rạch Giá' }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%' }}>
      <style>{`
        .trips-card-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          margin-bottom: 0.85rem;
        }

        .trips-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 0.85rem;
        }

        .trips-stat-card {
          background: #ffffff;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .trips-filter-grid {
          display: grid;
          grid-template-columns: 1.5fr 1.5fr 1fr 1fr 1fr;
          gap: 10px;
          align-items: flex-end;
        }

        .trips-quick-chip {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .trips-quick-chip:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }
        .trips-quick-chip.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }

        .trips-table-row:hover {
          background-color: #f8fafc;
        }

        @media (max-width: 1024px) {
          .trips-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .trips-filter-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .trips-stat-grid {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
          .trips-filter-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* VÙNG 1: HEADER QUẢN TRỊ & THỐNG KÊ TỔNG QUAN              */}
      {/* ========================================================= */}
      <div className="trips-card-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Bảng Giờ Xe Chạy &amp; Tra Cứu Chuyến Xe
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Tra Cứu Quầy
              </span>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Thời Gian Thực
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                An Bình Lines
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Tra cứu nhanh lịch xe xuất bến, giá vé niêm yết, số chỗ trống thực tế và hỗ trợ tư vấn trực tiếp cho hành khách tại quầy.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={fetchTripsData}
              disabled={loading}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Đang tải...' : 'Tải lại dữ liệu'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Thẻ thống kê nhanh */}
      <div className="trips-stat-grid">
        <div className="trips-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TỔNG CHUYẾN XE
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
              Toàn mạng
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {totalTripsCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Đang được quản lý trên hệ thống
          </div>
        </div>

        <div className="trips-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              CHUYẾN HÔM NAY ({new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#ecfdf5', color: '#059669', borderRadius: '4px', fontWeight: '700' }}>
              Hôm nay
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginBottom: '2px' }}>
            {todayTripsCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '700' }}>
            Sẵn sàng xuất bến trong ngày
          </div>
        </div>

        <div className="trips-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              GHẾ TRỐNG HIỆN CÓ
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
              Khả dụng
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px' }}>
            {totalAvailableSeats} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>ghế</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Có thể tư vấn và đặt ngay tại quầy
          </div>
        </div>

        <div className="trips-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TÌNH TRẠNG LỌC
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: '700' }}>
              Kết quả
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {filteredTrips.length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>khớp</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Trang {currentPage} / {totalPages}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: BỘ LỌC ĐA CHIỀU NÂNG CAO CHO NHÂN VIÊN QUẦY       */}
      {/* ========================================================= */}
      <div className="trips-card-box">
        {/* Hàng 1: Quick Route Chips */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', marginRight: '4px' }}>
            Tuyến nhanh:
          </span>
          {quickRoutes.map((qr, idx) => {
            const isActive = departureSearch === qr.from && destinationSearch === qr.to;
            return (
              <button
                key={idx}
                type="button"
                className={`trips-quick-chip ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setDepartureSearch(qr.from);
                  setDestinationSearch(qr.to);
                }}
              >
                {qr.label}
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Form Tra Cứu Chi Tiết */}
        <div className="trips-filter-grid">
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Điểm đi (hoặc Biển số xe)
            </label>
            <input
              type="text"
              placeholder="VD: Hồ Chí Minh, 51B-029.29..."
              value={departureSearch}
              onChange={(e) => setDepartureSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Điểm đến
            </label>
            <input
              type="text"
              placeholder="VD: Đà Lạt, Nha Trang, Cần Thơ..."
              value={destinationSearch}
              onChange={(e) => setDestinationSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Ngày khởi hành
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.52rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Loại phương tiện
            </label>
            <select
              value={selectedBusType}
              onChange={(e) => setSelectedBusType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">Tất cả loại xe</option>
              <option value="limousine">Xe Limousine VIP</option>
              <option value="giuong_nam">Xe Giường Nằm</option>
              <option value="ghe_ngoi">Xe Ghế Ngồi</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Tình trạng ghế
            </label>
            <select
              value={seatFilter}
              onChange={(e) => setSeatFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="available">Còn ghế trống</option>
              <option value="almost_full">Sắp hết vé (≤ 5 ghế)</option>
            </select>
          </div>
        </div>

        {/* Hàng 3: Phím tắt chọn ngày nhanh */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px' }}>
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>Chọn ngày:</span>
          <button
            type="button"
            className={`trips-quick-chip ${selectedDate === '' ? 'active' : ''}`}
            onClick={() => setSelectedDate('')}
          >
            Tất cả ngày
          </button>
          <button
            type="button"
            className={`trips-quick-chip ${selectedDate === todayStr ? 'active' : ''}`}
            onClick={() => setSelectedDate(todayStr)}
          >
            Hôm nay ({todayStr.slice(8, 10)}/{todayStr.slice(5, 7)})
          </button>
          <button
            type="button"
            className={`trips-quick-chip ${selectedDate === tomorrowStr ? 'active' : ''}`}
            onClick={() => setSelectedDate(tomorrowStr)}
          >
            Ngày mai ({tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)})
          </button>
          <button
            type="button"
            className={`trips-quick-chip ${selectedDate === dayAfterTomorrowStr ? 'active' : ''}`}
            onClick={() => setSelectedDate(dayAfterTomorrowStr)}
          >
            Ngày kia ({dayAfterTomorrowStr.slice(8, 10)}/{dayAfterTomorrowStr.slice(5, 7)})
          </button>

          {(departureSearch || destinationSearch || selectedDate || selectedBusType !== 'all' || seatFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setDepartureSearch('');
                setDestinationSearch('');
                setSelectedDate('');
                setSelectedBusType('all');
                setSeatFilter('all');
                setStatusFilter('all');
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#b91c1c',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 3: BẢNG DANH SÁCH CHUYẾN XE (PHÂN TRANG 10 DÒNG)      */}
      {/* ========================================================= */}
      <div className="trips-card-box" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div>
            <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Danh Sách Lịch Trình Chuyến Xe Khả Dụng
            </h2>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
              Hiển thị tối đa 10 chuyến xe mỗi lượt xem • Cập nhật giá vé và ghế trống tự động
            </div>
          </div>

          <span style={{
            fontSize: '0.72rem',
            color: '#1d4ed8',
            fontWeight: '700',
            background: '#eff6ff',
            padding: '3px 8px',
            borderRadius: '6px'
          }}>
            Tìm thấy {filteredTrips.length} chuyến
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 0' }}>
            <div style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}></div>
            <p style={{ color: '#64748b', marginTop: '1rem', fontSize: '0.82rem', fontWeight: '600' }}>
              Đang tải danh sách chuyến xe từ cơ sở dữ liệu...
            </p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
              Không tìm thấy chuyến xe nào khớp yêu cầu tra cứu
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '420px', margin: '0 auto' }}>
              Vui lòng thử chọn ngày khác hoặc mở rộng từ khóa tìm kiếm điểm đi/điểm đến để xem các tuyến xe chạy.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '800' }}>Tuyến Chạy &amp; Lộ Trình</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Khởi Hành</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Đến Dự Kiến</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Phương Tiện</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>Ghế Trống</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>Giá Vé Niêm Yết</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.map((trip) => {
                  const dep = new Date(trip.departureTime);
                  const arr = trip.arrivalTime ? new Date(trip.arrivalTime) : new Date(dep.getTime() + 5.5 * 3600 * 1000);
                  const totalSeats = trip.busId?.totalSeats || 36;
                  const bookedSeatsCount = trip.bookedSeats?.length || 0;
                  const emptySeats = Math.max(0, totalSeats - bookedSeatsCount);
                  const statusBadge = getDepartureStatusBadge(trip.departureTime);

                  return (
                    <tr
                      key={trip._id}
                      className="trips-table-row"
                      style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', transition: 'background-color 0.15s ease' }}
                    >
                      {/* Tuyến chạy */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.82rem' }}>
                          {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'Tuyến Chạy An Bình'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          {trip.routeId?.distance ? `${trip.routeId.distance} km` : 'Lộ trình tiêu chuẩn'} • {trip.routeId?.duration ? `${trip.routeId.duration} giờ` : 'Cao tốc'}
                        </div>
                      </td>

                      {/* Khởi hành */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: '800', color: '#1d4ed8', fontSize: '0.85rem' }}>
                          {dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {dep.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Đến dự kiến */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: '700', color: '#334155', fontSize: '0.82rem' }}>
                          {arr.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {arr.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Phương tiện */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {trip.busId?.plateNumber || '51B-029.29'}
                        </div>
                        <span style={{
                          fontSize: '0.65rem',
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          display: 'inline-block',
                          marginTop: '2px'
                        }}>
                          {trip.busId?.type || 'Xe Limousine VIP'}
                        </span>
                      </td>

                      {/* Ghế trống */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          backgroundColor: emptySeats === 0 ? '#fef2f2' : (emptySeats <= 5 ? '#fff7ed' : '#ecfdf5'),
                          color: emptySeats === 0 ? '#b91c1c' : (emptySeats <= 5 ? '#c2410c' : '#047857'),
                          border: `1px solid ${emptySeats === 0 ? '#fecaca' : (emptySeats <= 5 ? '#fed7aa' : '#a7f3d0')}`
                        }}>
                          {emptySeats === 0 ? 'Hết vé' : `Còn ${emptySeats} chỗ`}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                          Tổng {totalSeats} ghế
                        </div>
                      </td>

                      {/* Giá vé */}
                      <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', color: '#059669', fontSize: '0.85rem' }}>
                          {formatCurrency(trip.price)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          Niêm yết quầy
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`
                        }}>
                          {statusBadge.text}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedTripModal(trip)}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Chi tiết
                          </button>
                          {emptySeats > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveTab && setActiveTab('agent-booking')}
                              style={{
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Đặt vé
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Thanh điều hướng phân trang 10 dòng */}
        {filteredTrips.length > 0 && (
          <div style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Hiển thị <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> - <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredTrips.length)}</strong> trên tổng số <strong>{filteredTrips.length}</strong> chuyến xe
            </div>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                  color: currentPage === 1 ? '#94a3b8' : '#334155',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Trang trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, idx, arr) => {
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.7rem' }}>...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: `1px solid ${currentPage === page ? '#2563eb' : '#cbd5e1'}`,
                          background: currentPage === page ? '#2563eb' : '#ffffff',
                          color: currentPage === page ? '#ffffff' : '#334155',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                  color: currentPage === totalPages ? '#94a3b8' : '#334155',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL CHI TIẾT CHUYẾN XE                                   */}
      {/* ========================================================= */}
      {selectedTripModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                  Chi Tiết Chuyến Xe &amp; Lộ Trình
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Mã chuyến: {selectedTripModal._id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: '800', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Nội dung Modal */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Tuyến xe:</span>
                <span style={{ fontWeight: '800', color: '#0f172a' }}>
                  {selectedTripModal.routeId?.startPoint} ➔ {selectedTripModal.routeId?.endPoint}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Giờ xuất bến:</span>
                <span style={{ fontWeight: '800', color: '#1d4ed8' }}>
                  {new Date(selectedTripModal.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(selectedTripModal.departureTime).toLocaleDateString('vi-VN')})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Đến dự kiến:</span>
                <span style={{ fontWeight: '700', color: '#334155' }}>
                  {new Date(selectedTripModal.arrivalTime || selectedTripModal.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Phương tiện:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>
                  Xe {selectedTripModal.busId?.plateNumber} ({selectedTripModal.busId?.type})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Tình trạng chỗ:</span>
                <span style={{ fontWeight: '800', color: '#047857' }}>
                  Còn {Math.max(0, (selectedTripModal.busId?.totalSeats || 36) - (selectedTripModal.bookedSeats?.length || 0))} / {selectedTripModal.busId?.totalSeats || 36} ghế trống
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b' }}>Giá vé niêm yết:</span>
                <span style={{ fontWeight: '800', color: '#059669', fontSize: '0.9rem' }}>
                  {formatCurrency(selectedTripModal.price)}
                </span>
              </div>

              {selectedTripModal.driver && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>Tài xế phụ trách:</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    {selectedTripModal.driver.name} ({selectedTripModal.driver.phone})
                  </span>
                </div>
              )}

              {selectedTripModal.pickupPoints && selectedTripModal.pickupPoints.length > 0 && (
                <div>
                  <div style={{ color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>Điểm đón khách:</div>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', color: '#334155' }}>
                    {selectedTripModal.pickupPoints.map(p => p.name || p).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setSelectedTripModal(null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTripModal(null);
                  setActiveTab && setActiveTab('agent-booking');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Chuyển Đến Đặt Vé Quầy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentTripsPage;
