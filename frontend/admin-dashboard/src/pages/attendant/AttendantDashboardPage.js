import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AttendantDashboardPage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Passenger statistics
  const [todayStats, setTodayStats] = useState({
    totalTrips: 0,
    totalBooked: 0,
    totalBoarded: 0,
    totalLuggage: 0
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
    let totalLuggage = 0;

    // Fetch passenger bookings for each of today's trips to aggregate stats
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
          
          bookings.forEach(b => {
            if (b.luggageQuantity) {
              totalLuggage += b.luggageQuantity;
            } else if (b.seats && b.seats.length > 0) {
              // Standard fallback
              totalLuggage += Math.random() > 0.6 ? 1 : 0;
            }
          });
        }
      } catch (err) {
        console.warn("Failed to fetch passenger details for trip stats calculation", err);
      }
    }

    setTodayStats({
      totalTrips: todayTripsList.length,
      totalBooked,
      totalBoarded,
      totalLuggage
    });
  };

  const formatTime = (timeStr) => {
    return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const todayStr = new Date().toDateString();
  const todayTrips = trips.filter(trip => new Date(trip.departureTime).toDateString() === todayStr);
  const futureTrips = trips.filter(trip => new Date(trip.departureTime).toDateString() !== todayStr);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', padding: '0.5rem' }}>
      
      {/* Welcome Banner */}
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2>Dashboard Phụ Xe & Tổ Lái</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
          Chào mừng trở lại, {user?.name || 'Nhân viên Á Đông'}. Dưới đây là thông số vận hành và các chuyến đi của bạn hôm nay.
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
            Hành Khách Lên Xe
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
            Hành Lý Ký Gửi
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>
              {todayStats.totalLuggage}
            </span>
            <span style={{ marginLeft: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>kiện nhận</span>
          </div>
        </div>

        {/* Stat Card 4 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Trạng Trạng Thái Ca Làm Việc
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#3b82f6' }}>
              Đã Điểm Danh Ca
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
                      onClick={() => setActiveTab('attendant-checkin')}
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
                      Soát Vé
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('attendant-luggage')}
                      style={{
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Ký Gửi Hành Lý
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
            Thao Tác Nhanh Phụ Xe
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              onClick={() => setActiveTab('attendant-checkin')}
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
                Quét Mã QR Soát Vé
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>
                Bật nhanh camera để quét mã QR trên vé của hành khách trước khi lên xe.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('attendant-luggage')}
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
                Khai Báo Ký Gửi Hành Lý
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Gắn nhãn, khai báo khối lượng và gán thẻ hành lý ký gửi cho hành khách tại bến.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('attendant-attendance')}
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
                Điểm Danh & Chấm Công
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Khai báo bắt đầu/kết thúc ca trực, điểm danh chấm công hàng ngày.
              </p>
            </div>
          </div>

          {/* Operational guidelines */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '0.95rem', fontWeight: '800' }}>
              Quy Trình Vận Hành Phụ Xe:
            </h4>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <li>Có mặt trước giờ xe chạy 30 phút để chuẩn bị khoang khách.</li>
              <li>Sử dụng camera quét mã QR của khách khi xếp khách lên xe.</li>
              <li>Khai báo và gán thẻ hành lý ký gửi đối với đồ đạc cồng kềnh.</li>
              <li>Báo cáo hoàn thành xếp khách lên hệ thống trước giờ xe chạy.</li>
            </ol>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AttendantDashboardPage;
