import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AttendantDashboardPage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Passenger statistics (Không tính hành lý)
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
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrips(data.trips);
        calculateStats(data.trips);
      } else {
        setError(data.message || 'Không thể tải lịch trình phân công.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải lịch trình.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (allTrips) => {
    const todayStr = new Date().toDateString();
    const todayTripsList = allTrips.filter(trip => new Date(trip.departureTime).toDateString() === todayStr);
    
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
        console.warn("Failed to fetch passenger details for trip stats calculation", err);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const todayStr = new Date().toDateString();
  const todayTrips = trips.filter(trip => new Date(trip.departureTime).toDateString() === todayStr);
  const futureTrips = trips.filter(trip => new Date(trip.departureTime).toDateString() !== todayStr);

  const currentDateLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* CSS Layout chuẩn Dashboard Vận Hành (Không icon, tập trung bố cục typography chuyên nghiệp) */}
      <style>{`
        .attendant-panel-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .attendant-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.85rem;
        }

        .attendant-header-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .attendant-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .attendant-stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          transition: all 0.2s ease;
        }

        .attendant-stat-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }

        .attendant-content-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 1.25rem;
          align-items: start;
        }

        /* Tablet (<= 992px) */
        @media (max-width: 992px) {
          .attendant-stat-grid {
            grid-template-columns: 1fr;
          }
          .attendant-content-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Mobile (<= 768px) */
        @media (max-width: 768px) {
          .attendant-panel-box {
            padding: 1rem 0.85rem;
            border-radius: 12px;
            gap: 1rem;
          }
          .attendant-header-wrap {
            flex-direction: column;
            align-items: flex-start;
          }
          .attendant-header-buttons {
            width: 100%;
          }
          .attendant-header-buttons button {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* VÙNG 1: KHỐI TRẮNG TIÊU ĐỀ & 3 THẺ THỐNG KÊ (TOP BANNER)  */}
      {/* ========================================================= */}
      <div className="attendant-panel-box">
        
        {/* Tiêu đề được bao bởi khối trắng */}
        <div className="attendant-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Dashboard Phụ Xe &amp; Tổ Lái
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: '700'
              }}>
                Nhân Viên Phụ Xe
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px', margin: 0 }}>
              Chào mừng trở lại, <strong>{user?.name || 'Nhân viên Phụ xe'}</strong>. Dưới đây là thông số vận hành và các chuyến đi của bạn hôm nay.
            </p>
          </div>

          {/* Quick Header Actions: Ngày tháng, Nút Làm mới, Nút Soát vé nhanh (Không icon) */}
          <div className="attendant-header-buttons">
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: '#475569',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {currentDateLabel}
            </div>

            <button
              onClick={fetchSchedule}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontWeight: '700',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                whiteSpace: 'nowrap'
              }}
              title="Tải lại dữ liệu lịch trình"
            >
              Làm Mới
            </button>

            {setActiveTab && (
              <button
                onClick={() => setActiveTab('attendant-checkin')}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                  whiteSpace: 'nowrap'
                }}
              >
                Quét QR Soát Vé
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#be123c',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            Lưu ý: {error}
          </div>
        )}

        {/* 3 Thẻ Thống Kê Vận Hành (Đã loại bỏ hoàn toàn phần hành lý) */}
        <div className="attendant-stat-grid">
          
          {/* Stat 1: Chuyến đi hôm nay */}
          <div className="attendant-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Chuyến Đi Hôm Nay
            </span>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a' }}>
                {todayStats.totalTrips}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600', marginTop: '6px' }}>
              Lịch trình được phân công trong ngày
            </div>
          </div>

          {/* Stat 2: Hành khách lên xe */}
          <div className="attendant-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Hành Khách Lên Xe
            </span>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#10b981' }}>
                {todayStats.totalBoarded}
              </span>
              <span style={{ fontSize: '1.15rem', color: '#94a3b8', fontWeight: '600' }}>/</span>
              <span style={{ fontSize: '1.15rem', color: '#475569', fontWeight: '800' }}>
                {todayStats.totalBooked}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginLeft: '4px' }}>hành khách</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600', marginTop: '6px' }}>
              {todayStats.totalBooked > 0 
                ? `Đã soát vé ${Math.round((todayStats.totalBoarded / todayStats.totalBooked) * 100)}% hành khách`
                : 'Sẵn sàng soát vé khi khách lên'}
            </div>
          </div>

          {/* Stat 3: Trạng thái ca trực */}
          <div className="attendant-stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Trạng Thái Ca Trực
            </span>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#7c3aed' }}>
                Đã Điểm Danh Ca
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: '600', marginTop: '6px' }}>
              Chấm công số hợp lệ
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: CHỨC NĂNG VẬN HÀNH CHÍNH (2 CỘT CHUẨN ĐIỀU HÀNH)   */}
      {/* ========================================================= */}
      <div className="attendant-content-grid">
        
        {/* CỘT TRÁI: DANH SÁCH CHUYẾN XE HÔM NAY & TUẦN NÀY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card 1: Chuyến xe hôm nay */}
          <div className="attendant-panel-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Danh Sách Chuyến Đi Hôm Nay ({formatDate(new Date())})
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                {todayTrips.length} chuyến xuất bến
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#64748b', fontSize: '0.8rem' }}>
                Đang tải dữ liệu chuyến xe...
              </div>
            ) : todayTrips.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', background: '#f8fafc', color: '#64748b', borderRadius: '10px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#334155' }}>Hôm nay không có chuyến xe nào được phân công</div>
                <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>Bạn có thể xem trước lịch chạy của các ngày tiếp theo ở khung bên dưới.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {todayTrips.map(trip => (
                  <div key={trip._id} style={{
                    background: '#f8fafc',
                    padding: '1.15rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.45rem' }}>
                        <span style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '800'
                        }}>
                          Giờ xuất bến: {formatTime(trip.departureTime)}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700' }}>
                          Sẵn sàng đón khách
                        </span>
                      </div>
                      
                      <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                        {trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}
                      </h3>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span>Biển số xe: <strong style={{ color: '#0f172a' }}>{trip.busId?.plateNumber}</strong></span>
                        <span>•</span>
                        <span>Dòng xe: <strong>{trip.busId?.type}</strong></span>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => setActiveTab && setActiveTab('attendant-checkin')}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          padding: '8px 18px',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                        }}
                      >
                        Soát Vé &amp; Check-in
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Các chuyến đi tiếp theo trong tuần */}
          {futureTrips.length > 0 && (
            <div className="attendant-panel-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Các Chuyến Đi Tiếp Theo Trong Tuần
                </h2>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {futureTrips.length} chuyến sắp tới
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {futureTrips.slice(0, 4).map(trip => (
                  <div key={trip._id} style={{
                    background: '#f8fafc',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>
                        {trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                        Khởi hành: <strong>{formatTime(trip.departureTime)}</strong> - {formatDate(trip.departureTime)} | Dòng xe: {trip.busId?.type}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      color: '#1e40af',
                      background: '#eff6ff',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      border: '1px solid #dbeafe'
                    }}>
                      Xe: {trip.busId?.plateNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* CỘT PHẢI: TRUNG TÂM THAO TÁC NHANH & QUY TRÌNH VẬN HÀNH */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card Thao Tác Nhanh Phụ Xe (Không icon) */}
          <div className="attendant-panel-box">
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Thao Tác Nhanh Phụ Xe
              </h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* Action 1: QR Scanner (Card nổi bật nhất) */}
              <div
                onClick={() => setActiveTab && setActiveTab('attendant-checkin')}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  padding: '1.1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h3 style={{ margin: '0 0 4px 0', fontWeight: '800', fontSize: '0.95rem' }}>
                  Quét Mã QR Soát Vé
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.92, lineHeight: '1.4' }}>
                  Bật nhanh camera để quét mã QR vé hành khách xếp chỗ lên xe trước giờ xuất bến.
                </p>
              </div>

              {/* Action 2: Chấm công */}
              <div
                onClick={() => setActiveTab && setActiveTab('attendant-attendance')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <h3 style={{ margin: '0 0 4px 0', fontWeight: '800', fontSize: '0.9rem', color: '#0f172a' }}>
                  Điểm Danh &amp; Chấm Công Ca
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                  Khai báo bắt đầu hoặc kết thúc ca trực của phụ xe, điểm danh chấm công số.
                </p>
              </div>

              {/* Action 3: Lịch làm việc */}
              <div
                onClick={() => setActiveTab && setActiveTab('staff-schedule')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <h3 style={{ margin: '0 0 4px 0', fontWeight: '800', fontSize: '0.9rem', color: '#0f172a' }}>
                  Xem Lịch Chạy Xe Chi Tiết
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                  Tra cứu ca trực và các tuyến xe được phân công trong tuần và tháng.
                </p>
              </div>

            </div>
          </div>

          {/* Card Quy trình vận hành phụ xe (SOP - Không icon) */}
          <div className="attendant-panel-box" style={{ background: '#f8fafc' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Quy Trình Vận Hành Tiêu Chuẩn Phụ Xe
              </h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>1</span>
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                  Có mặt trước giờ xe chạy <strong>30 phút</strong> để kiểm tra vệ sinh khoang giường nằm và tiện ích trên xe.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>2</span>
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                  Sử dụng camera quét mã QR vé hành khách hoặc tra cứu số điện thoại để soát vé lên xe.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>3</span>
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                  Hướng dẫn hành khách đúng vị trí số ghế, số phòng nằm theo mã vé đã đăng ký.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>4</span>
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                  Báo cáo hoàn thành danh sách hành khách cho bác tài trước khi xe lăn bánh rời bến.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AttendantDashboardPage;
