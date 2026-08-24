import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const DriverDashboardPage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
        console.warn("Failed to fetch passenger details for driver stats", err);
      }
    }

    setTodayStats({
      totalTrips: todayTripsList.length,
      totalBooked,
      totalBoarded
    });
  };

  const formatTime = (timeStr) => {
    return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const todayStr = new Date().toDateString();
  const todayTrips = trips.filter(trip => new Date(trip.departureTime).toDateString() === todayStr);
  const futureTrips = trips.filter(trip => new Date(trip.departureTime).toDateString() !== todayStr);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', padding: '0.5rem' }}>
      
      {/* Welcome Banner */}
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2>Dashboard Tài Xế & Vận Hành</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
          Chào mừng trở lại, Tài xế {user?.name || 'Á Đông'}. Dưới đây là thông số vận hành và các chuyến đi của bạn hôm nay.
        </p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Grid statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Stat Card 1 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Chuyến Đi Hôm Nay
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text)' }}>
              {todayStats.totalTrips}
            </span>
            <span style={{ marginLeft: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>chuyến</span>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Hành Khách Dự Kiến
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981' }}>
              {todayStats.totalBoarded}
            </span>
            <span style={{ marginLeft: '4px', marginRight: '4px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-muted)' }}>
              {todayStats.totalBooked}
            </span>
            <span style={{ marginLeft: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>hành khách</span>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Phương Tiện Phân Công
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>
              {todayTrips[0]?.busId?.plateNumber || 'Chưa nhận xe'}
            </span>
          </div>
        </div>

        {/* Stat Card 4 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Trạng Thái Ca Làm Việc
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#3b82f6' }}>
              Đã Điểm Danh GPS
            </span>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="responsive-grid-layout">
        
        {/* Left: Today's Trip List */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--text)' }}>
            Danh Sách Chuyến Đi Hôm Nay ({new Date().toLocaleDateString('vi-VN')})
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
              Đang tải danh sách chuyến đi...
            </div>
          ) : todayTrips.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', background: '#f8fafc', color: 'var(--text-muted)', borderRadius: '12px', textAlign: 'center', border: '1px dashed var(--card-border)' }}>
              Hôm nay bạn không có lịch trình chạy xe nào được phân công.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todayTrips.map(trip => (
                <div key={trip._id} style={{
                  background: '#ffffff',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid var(--card-border)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: 'var(--primary-bg)',
                      color: 'var(--primary)',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      marginBottom: '0.5rem'
                    }}>
                      Giờ khởi hành: {formatTime(trip.departureTime)}
                    </span>
                    
                    <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)' }}>
                      {trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}
                    </h4>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>Biển số xe: <strong>{trip.busId?.plateNumber}</strong></span>
                      <span style={{ margin: '0 8px' }}>|</span>
                      <span>Dòng xe: {trip.busId?.type}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn"
                      onClick={() => setActiveTab('driver-status')}
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Cập Nhật Hành Trình
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('driver-map')}
                      style={{
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Bản Đồ Lộ Trình
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Future Trips Overview */}
          {futureTrips.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--text)' }}>
                Các Chuyến Đi Tiếp Theo Trong Tuần
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {futureTrips.slice(0, 3).map(trip => (
                  <div key={trip._id} style={{
                    background: '#f8fafc',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>
                        {trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}
                      </span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Khởi hành: {formatTime(trip.departureTime)} - {new Date(trip.departureTime).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                      Xe: {trip.busId?.plateNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Actions & Help */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--text)' }}>
            Thao Tác Nhanh Tài Xế
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              onClick={() => setActiveTab('driver-status')}
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                color: '#ffffff',
                padding: '1.25rem',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '800', fontSize: '1rem' }}>
                Cập Nhật Hành Trình
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>
                Khai báo trạng thái di chuyển thời gian thực (Bắt đầu chạy, dừng nghỉ, đến bến).
              </p>
            </div>

            <div
              onClick={() => setActiveTab('driver-map')}
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--card-border)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>
                Bản Đồ Di Chuyển
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Xem lộ trình di chuyển trực quan và định vị GPS của xe khách.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('driver-attendance')}
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--card-border)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>
                Chấm Công & Điểm Danh
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Điểm danh bắt đầu/kết thúc ca chạy, ghi nhận ngày công lái xe.
              </p>
            </div>
          </div>

          {/* Operational guidelines */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '0.95rem', fontWeight: '800' }}>
              Quy Trình Vận Hành Tài Xế:
            </h4>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <li>Kiểm tra kỹ thuật xe và nhiên liệu trước giờ xuất phát 30 phút.</li>
              <li>Chấm công GPS đầu ca trực để xác nhận nhận xe và tuyến đường.</li>
              <li>Cập nhật trạng thái hành trình ("Bắt đầu chạy", "Đang dừng nghỉ", "Đã đến bến").</li>
              <li>Báo cáo sự cố phát sinh hoặc trễ chuyến cho điều hành nếu có.</li>
            </ol>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DriverDashboardPage;
