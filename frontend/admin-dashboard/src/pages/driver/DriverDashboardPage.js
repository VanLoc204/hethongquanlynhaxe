import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const DriverDashboardPage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [todayStats, setTodayStats] = useState({
    totalTrips: 0,
    totalBooked: 0,
    totalBoarded: 0
  });

  useEffect(() => {
    fetchSchedule();
  }, [token]);

  const fetchSchedule = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrips(data.trips || []);
        calculateStats(data.trips || []);
        setError('');
      } else {
        setError(data.message || 'Không thể tải lịch trình phân công.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải lịch trình.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const isSameDay = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const calculateStats = async (allTrips) => {
    const todayTripsList = allTrips.filter(trip => isSameDay(trip.departureTime));

    let totalBooked = 0;
    let totalBoarded = 0;

    for (const trip of todayTripsList) {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/users/attendant/trip-bookings/${trip._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const bookings = data.bookings || [];
          totalBooked += bookings.length;
          totalBoarded += bookings.filter(b => b.boarded).length;
        }
      } catch (err) {
        console.warn('Failed to fetch passenger details for driver stats', err);
      }
    }

    setTodayStats({
      totalTrips: todayTripsList.length,
      totalBooked,
      totalBoarded
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeStr) => {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const todayTrips = trips.filter(trip => isSameDay(trip.departureTime));
  const futureTrips = trips.filter(trip => !isSameDay(trip.departureTime) && new Date(trip.departureTime) > new Date());

  const currentBusPlate = todayTrips[0]?.busId?.plateNumber || trips[0]?.busId?.plateNumber || '51B-029.29';
  const currentBusType = todayTrips[0]?.busId?.type || trips[0]?.busId?.type || 'Xe Khách Cao Cấp';

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%' }}>
      {/* CSS Nhúng phục vụ Responsive đa thiết bị */}
      <style>{`
        .driver-panel-box {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 0.85rem;
        }

        .driver-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .driver-header-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .driver-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .driver-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .driver-future-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 0.75rem;
        }

        /* Chế độ Desktop Table vs Mobile Cards */
        .driver-desktop-table {
          display: block;
          overflow-x: auto;
          width: 100%;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        .driver-mobile-cards {
          display: none;
        }

        /* Responsive Tablet & Màn hình vừa (<= 992px) */
        @media (max-width: 992px) {
          .driver-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .driver-quick-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Responsive Mobile & Điện thoại di động (<= 768px) */
        @media (max-width: 768px) {
          .driver-panel-box {
            padding: 1rem 0.85rem;
            border-radius: 12px;
            gap: 1rem;
          }
          .driver-header-wrap {
            flex-direction: column;
            align-items: flex-start;
          }
          .driver-header-buttons {
            width: 100%;
          }
          .driver-header-buttons button {
            flex: 1;
            justify-content: center;
          }

          /* Ẩn bảng dài trên mobile, thay bằng Card di động */
          .driver-desktop-table {
            display: none;
          }
          .driver-mobile-cards {
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
          }
          .driver-quick-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Màn hình điện thoại nhỏ (<= 480px) */
        @media (max-width: 480px) {
          .driver-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
          }
          .driver-stat-card {
            padding: 0.65rem 0.75rem !important;
          }
          .driver-stat-value {
            font-size: 1.15rem !important;
          }
          .driver-header-buttons {
            flex-direction: column;
          }
          .driver-header-buttons button {
            width: 100%;
          }
        }
      `}</style>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          marginBottom: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {/* ========================================================= */}
      {/* VÙNG 1: CARD TRẮNG HEADER TỔNG QUAN & 4 THẺ THỐNG KÊ (TOP) */}
      {/* ========================================================= */}
      <div className="driver-panel-box">
        {/* Top Header & Buttons */}
        <div className="driver-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Trung Tâm Điều Hành Tài Xế
              </h1>
              <span style={{
                background: '#dbeafe',
                color: '#1d4ed8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Driver Live Console
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Chào mừng trở lại, <strong style={{ color: '#2563eb' }}>Tài xế {user?.name || 'Trần Minh Tâm'}!</strong> Giám sát lịch trình chuyến xe, định vị GPS &amp; cập nhật hành trình thời gian thực
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="driver-header-buttons">
            <button
              onClick={fetchSchedule}
              disabled={isRefreshing}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontWeight: '600',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isRefreshing ? 'wait' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                whiteSpace: 'nowrap'
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                style={{
                  transition: 'transform 0.5s ease',
                  transform: isRefreshing ? 'rotate(360deg)' : 'none'
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {isRefreshing ? 'Đang đồng bộ...' : 'Đồng bộ tức thời'}
            </button>

            <button
              onClick={() => setActiveTab && setActiveTab('driver-map')}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                whiteSpace: 'nowrap'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Bản Đồ Di Chuyển GPS
            </button>
          </div>
        </div>

        {/* 4 Key Stat Cards (Responsive Grid) */}
        <div className="driver-stat-grid">
          
          {/* Card 1: Chuyến đi hôm nay */}
          <div className="driver-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CHUYẾN ĐI HÔM NAY
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
            </div>
            <div className="driver-stat-value" style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {todayStats.totalTrips} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: todayTrips.length > 0 ? '#16a34a' : '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>▲</span> {todayTrips.length > 0 ? `${todayTrips.length} chuyến khởi hành` : 'Không có chuyến'}
            </div>
          </div>

          {/* Card 2: Hành khách dự kiến */}
          <div className="driver-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                HÀNH KHÁCH DỰ KIẾN
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
            <div className="driver-stat-value" style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              <span style={{ color: '#10b981' }}>{todayStats.totalBoarded}</span>
              <span style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '0 3px' }}>/</span>
              <span>{todayStats.totalBooked}</span> <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>khách</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              ✓ {todayStats.totalBooked > 0 ? `${Math.round((todayStats.totalBoarded / todayStats.totalBooked) * 100)}% đã lên xe` : 'Chờ check-in'}
            </div>
          </div>

          {/* Card 3: Phương tiện phân công */}
          <div className="driver-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PHƯƠNG TIỆN PHÂN CÔNG
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
            </div>
            <div className="driver-stat-value" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px', lineHeight: '1.2' }}>
              {currentBusPlate}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
              ✓ {currentBusType}
            </div>
          </div>

          {/* Card 4: Trạng thái ca làm việc */}
          <div className="driver-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TRẠNG THÁI CA LÀM VIỆC
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <div className="driver-stat-value" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              Đã Điểm Danh GPS
            </div>
            <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '600' }}>
              ▲ Ca trực hợp lệ (Sẵn sàng)
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: CARD TRẮNG LỊCH TRÌNH CHUYẾN XE & THAO TÁC (BOTTOM) */}
      {/* ========================================================= */}
      <div className="driver-panel-box">
        {/* Table Panel Header */}
        <div className="driver-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Bảng Điều Hành &amp; Giám Sát Chuyến Xe (Real-time)
              </h2>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Lịch Phân Công Cá Nhân
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
              Theo dõi tuyến chạy, giờ xuất bến, biển số xe, phụ xe đồng hành và cập nhật trạng thái hành trình theo thời gian thực
            </p>
          </div>

          <button
            onClick={() => setActiveTab && setActiveTab('staff-schedule')}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: '700',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0
            }}
          >
            Xem lịch chạy xe đầy đủ →
          </button>
        </div>

        {/* 1. HIỂN THỊ DẠNG BẢNG (DÀNH CHO DESKTOP & TABLET > 768px) */}
        <div className="driver-desktop-table">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: '#f8fafc'
              }}>
                <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN ĐƯỜNG &amp; THỜI GIAN</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>PHƯƠNG TIỆN (BIỂN SỐ)</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>PHỤ XE THEO CA</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>TIẾN ĐỘ KHÁCH</th>
                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TRẠNG THÁI</th>
                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>THAO TÁC ĐIỀU HÀNH</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Đang tải lịch trình chuyến xe của bạn...
                  </td>
                </tr>
              ) : todayTrips.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                      Hôm nay ({new Date().toLocaleDateString('vi-VN')}) bạn không có lịch khởi hành.
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Vui lòng xem các chuyến tiếp theo trong tuần được liệt kê bên dưới.
                    </div>
                  </td>
                </tr>
              ) : (
                todayTrips.map(trip => {
                  const plate = trip.busId?.plateNumber || 'Chưa nhận xe';
                  const busType = trip.busId?.type || 'Xe Khách An Bình';
                  const routeName = trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'Đà Lạt ➔ Hồ Chí Minh';
                  const assistantName = trip.assistantId?.name || trip.assistant?.name || 'Đã phân công phụ xe';

                  return (
                    <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      {/* Cột 1: Tuyến & Giờ */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{routeName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>
                          Xuất bến: {formatTime(trip.departureTime)} ({formatDate(trip.departureTime)})
                        </div>
                      </td>

                      {/* Cột 2: Phương tiện */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{plate}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{busType}</div>
                      </td>

                      {/* Cột 3: Phụ xe */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ {assistantName}</span>
                      </td>

                      {/* Cột 4: Khách / Ghế */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>
                            {todayStats.totalBoarded}/{todayStats.totalBooked} vé
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            ({todayStats.totalBooked > 0 ? Math.round((todayStats.totalBoarded / todayStats.totalBooked) * 100) : 0}%)
                          </span>
                        </div>
                        <div style={{ width: '80px', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: todayStats.totalBooked > 0 ? `${(todayStats.totalBoarded / todayStats.totalBooked) * 100}%` : '0%',
                            height: '100%',
                            background: '#10b981'
                          }}></div>
                        </div>
                      </td>

                      {/* Cột 5: Trạng thái */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <span style={{
                          background: '#ecfdf5',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          display: 'inline-block'
                        }}>
                          ● Sẵn sàng xuất bến
                        </span>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => setActiveTab && setActiveTab('driver-status')}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polygon points="3 11 22 2 13 21 11 13 3 11" />
                            </svg>
                            Cập Nhật Hành Trình
                          </button>
                          <button
                            onClick={() => setActiveTab && setActiveTab('driver-map')}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#1e293b',
                              border: '1px solid #cbd5e1',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            Bản Đồ GPS
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 2. HIỂN THỊ DẠNG THẺ THÔNG MINH CHO MOBILE (<= 768px) */}
        <div className="driver-mobile-cards">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
              Đang tải lịch trình chuyến xe...
            </div>
          ) : todayTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.85rem' }}>
                Hôm nay bạn không có lịch khởi hành.
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Xem danh sách chuyến tiếp theo trong tuần bên dưới.
              </div>
            </div>
          ) : (
            todayTrips.map(trip => {
              const plate = trip.busId?.plateNumber || '51B-029.29';
              const busType = trip.busId?.type || 'Xe Khách An Bình';
              const routeName = trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'Đà Lạt ➔ Hồ Chí Minh';
              const assistantName = trip.assistantId?.name || trip.assistant?.name || 'Đã phân công phụ xe';

              return (
                <div key={trip._id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {/* Tuyến & Giờ */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>
                        {routeName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '700', marginTop: '2px' }}>
                        Xuất bến: {formatTime(trip.departureTime)} ({formatDate(trip.departureTime)})
                      </div>
                    </div>
                    <span style={{
                      background: '#ecfdf5',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.65rem',
                      fontWeight: '700'
                    }}>
                      ● Sẵn sàng
                    </span>
                  </div>

                  {/* Thông tin phụ xe, phương tiện, khách */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    background: '#ffffff',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.72rem'
                  }}>
                    <div>
                      <div style={{ color: '#64748b' }}>Phương tiện:</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{plate}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>{busType}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>Phụ xe theo ca:</div>
                      <div style={{ fontWeight: '700', color: '#16a34a' }}>✓ {assistantName}</div>
                    </div>
                    <div style={{ gridColumn: 'span 2', marginTop: '2px', paddingTop: '4px', borderTop: '1px dashed #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>Tiến độ khách lên xe:</span>
                        <strong style={{ color: '#0f172a' }}>{todayStats.totalBoarded}/{todayStats.totalBooked} vé</strong>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: todayStats.totalBooked > 0 ? `${(todayStats.totalBoarded / todayStats.totalBooked) * 100}%` : '0%',
                          height: '100%',
                          background: '#10b981'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Cặp nút bấm thao tác trên Mobile */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setActiveTab && setActiveTab('driver-status')}
                      style={{
                        flex: 1,
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                      Cập Nhật Hành Trình
                    </button>
                    <button
                      onClick={() => setActiveTab && setActiveTab('driver-map')}
                      style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Bản Đồ GPS
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Các chuyến đi tiếp theo trong tuần */}
        {futureTrips.length > 0 && (
          <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#0f172a' }}>
                Lịch Trình Các Chuyến Tiếp Theo ({futureTrips.length} chuyến sắp tới)
              </div>
            </div>
            <div className="driver-future-grid">
              {futureTrips.slice(0, 3).map(trip => (
                <div
                  key={trip._id}
                  style={{
                    background: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>
                      {trip.routeId?.startPoint || 'Hồ Chí Minh'} ➔ {trip.routeId?.endPoint || 'Đà Lạt'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Khởi hành: <strong style={{ color: '#2563eb' }}>{formatTime(trip.departureTime)}</strong> - {formatDate(trip.departureTime)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    background: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    whiteSpace: 'nowrap'
                  }}>
                    Xe: {trip.busId?.plateNumber || '51B-029.29'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thanh phím tắt thao tác nhanh & Hướng dẫn vận hành */}
        <div style={{
          marginTop: '0.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div className="driver-quick-grid">
            {/* Card phím tắt: Cập nhật hành trình */}
            <div
              onClick={() => setActiveTab && setActiveTab('driver-status')}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(37,99,235,0.18)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>Cập Nhật Hành Trình</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.9 }}>
                Khai báo trạng thái di chuyển thời gian thực: Bắt đầu chạy, dừng nghỉ, đến bến.
              </p>
            </div>

            {/* Card phím tắt: Bản đồ di chuyển */}
            <div
              onClick={() => setActiveTab && setActiveTab('driver-map')}
              style={{
                background: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>Bản Đồ Di Chuyển GPS</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                Xem lộ trình tuyến đường, danh sách trạm đón/trả và bật phát GPS thời gian thực.
              </p>
            </div>

            {/* Card phím tắt: Chấm công số */}
            <div
              onClick={() => setActiveTab && setActiveTab('driver-attendance')}
              style={{
                background: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>Chấm Công &amp; Điểm Danh</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                Xác thực chấm công nhận ca bằng GPS bến xe và quản lý ngày công làm việc.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DriverDashboardPage;
