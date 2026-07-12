import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';

const API_BASE = 'http://localhost:8000/api/v1';

const AdminOverview = () => {
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Hệ thống" value="Microservices" trend="Hoạt động bình thường" colorClass="blue" />
        <StatCard label="Cổng dịch vụ" value="9 Services" trend="Tất cả đang chạy" colorClass="purple" />
        <StatCard label="API Gateway" value="Port 8000" trend="Nginx & Express" colorClass="green" />
        <StatCard label="Audit Logs" value="Active" trend="Giám sát thời gian thực" colorClass="yellow" />
      </section>

      <section className="content-section">
        <div className="panel info-panel">
          <h2>Trạng thái Vận hành &amp; Giám sát</h2>
          <div className="placeholder-content">
            <div className="radar-animation">
              <div className="circle c1"></div>
              <div className="circle c2"></div>
              <div className="circle c3"></div>
            </div>
            <p>Đang kết nối tới <code>tracking-service</code>...</p>
            <span className="badge-live">LIVE</span>
          </div>
        </div>

        <div className="panel status-panel">
          <h2>Trạng thái Cổng dịch vụ (Microservices)</h2>
          <ul className="service-list">
            <li className="service-item"><span className="status-dot green"></span> api-gateway <span className="port">Port 8000</span></li>
            <li className="service-item"><span className="status-dot green"></span> auth-service <span className="port">Port 8001</span></li>
            <li className="service-item"><span className="status-dot green"></span> user-service <span className="port">Port 8002</span></li>
            <li className="service-item"><span className="status-dot green"></span> trip-service <span className="port">Port 8003</span></li>
            <li className="service-item"><span className="status-dot green"></span> booking-service <span className="port">Port 8004</span></li>
            <li className="service-item"><span className="status-dot green"></span> pricing-service <span className="port">Port 8005</span></li>
            <li className="service-item"><span className="status-dot green"></span> payment-service <span className="port">Port 8006</span></li>
            <li className="service-item"><span className="status-dot green"></span> tracking-service <span className="port">Port 8007</span></li>
            <li className="service-item"><span className="status-dot green"></span> notification-service <span className="port">Port 8008</span></li>
            <li className="service-item"><span className="status-dot green"></span> review-service <span className="port">Port 8009</span></li>
          </ul>
        </div>
      </section>
    </>
  );
};

const FleetManagerOverview = ({ busCount }) => {
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Tổng số xe khách" value={`${busCount} phương tiện`} trend="Đang quản lý" colorClass="blue" />
        <StatCard label="Tỷ lệ hoạt động" value="100%" trend="Tất cả xe sẵn sàng chạy" colorClass="green" />
        <StatCard label="Xe đang bảo trì" value="0 xe" trend="Không có xe hỏng hóc" colorClass="yellow" />
        <StatCard label="Cảnh báo phụ tùng" value="2 linh kiện" trend="Chạm mức tối thiểu" colorClass="purple" />
      </section>

      <section className="content-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Kế hoạch bảo trì gần đây */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Lịch bảo trì &amp; Đăng kiểm sắp tới</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>51B-123.45</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Hạn 15/07/2026</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bảo dưỡng định kỳ: Thay dầu động cơ, lọc gió</p>
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>49B-022.22</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Hạn 20/07/2026</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Kiểm định đăng kiểm kỳ 6 tháng</p>
            </div>
          </div>
        </div>

        {/* Cảnh báo linh kiện kho */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Cảnh báo vật tư sắp hết</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Bóng đèn pha LED H4 24V</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Vị trí: Kệ E-02</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>Tồn: 2 Cái</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tối thiểu: 5</p>
              </div>
            </div>

            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Dầu nhớt Castrol 15W-40 (20L)</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Vị trí: Kho Dầu</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#f59e0b', fontWeight: '700' }}>Tồn: 3 Xô</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tối thiểu: 3</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const OpsManagerOverview = ({ routeCount, tripCount, busCount, totalBookedSeats, recentTrips, activeRoutes }) => {
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Tuyến đường khai thác" value={`${routeCount} tuyến`} trend="Kết nối liên tỉnh" colorClass="blue" />
        <StatCard label="Chuyến xe lên lịch" value={`${tripCount} chuyến`} trend="Lên lịch vận hành" colorClass="green" />
        <StatCard label="Đội xe khả dụng" value={`${busCount} phương tiện`} trend="Đang hoạt động" colorClass="purple" />
        <StatCard label="Tổng vé đã đặt" value={`${totalBookedSeats} vé`} trend="Tỷ lệ lấp đầy ghế" colorClass="yellow" />
      </section>

      <section className="content-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Chuyến xe sắp khởi hành */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Các chuyến xe mới lên lịch</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentTrips.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có chuyến xe nào được lên lịch.</p>
            ) : (
              recentTrips.slice(0, 3).map((trip) => {
                const depTime = new Date(trip.departureTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
                return (
                  <div key={trip._id} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong>{trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'Không rõ tuyến'}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{depTime}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Xe: {trip.busId?.plateNumber || 'Chưa gán'} | Đã đặt: {trip.bookedSeats?.length || 0}/{trip.busId?.totalSeats || 0} ghế
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Danh sách tuyến đường hoạt động */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Tuyến đường đang khai thác</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeRoutes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có tuyến đường nào được cấu hình.</p>
            ) : (
              activeRoutes.slice(0, 3).map((route) => (
                <div key={route._id} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{route.startPoint} — {route.endPoint}</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Thời gian đi: {route.duration}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{route.distance}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
};

const DashboardOverviewPage = () => {
  const { user, token } = useContext(AuthContext);
  const [busCount, setBusCount] = useState(0);
  const [routeCount, setRouteCount] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [totalBookedSeats, setTotalBookedSeats] = useState(0);
  const [recentTrips, setRecentTrips] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setBusCount(data.buses.length);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchOpsData = async () => {
      try {
        // Fetch routes
        const routesRes = await fetch(`${API_BASE}/trips/ops/routes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const routesData = await routesRes.json();
        if (routesData.success) {
          setRouteCount(routesData.routes.length);
          setActiveRoutes(routesData.routes);
        }

        // Fetch trips
        const tripsRes = await fetch(`${API_BASE}/trips/ops/trips`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const tripsData = await tripsRes.json();
        if (tripsData.success) {
          setTripCount(tripsData.trips.length);
          setRecentTrips(tripsData.trips);
          const totalSeatsBooked = tripsData.trips.reduce((acc, trip) => acc + (trip.bookedSeats?.length || 0), 0);
          setTotalBookedSeats(totalSeatsBooked);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (token) {
      fetchBuses();
      if (user?.role === 'ops_manager' || user?.role === 'admin' || user?.role === 'general_manager') {
        fetchOpsData();
      }
    }
  }, [token, user]);

  if (user?.role === 'admin') {
    return <AdminOverview />;
  }

  if (user?.role === 'ops_manager') {
    return (
      <OpsManagerOverview 
        routeCount={routeCount}
        tripCount={tripCount}
        busCount={busCount}
        totalBookedSeats={totalBookedSeats}
        recentTrips={recentTrips}
        activeRoutes={activeRoutes}
      />
    );
  }

  // Fleet Manager and other fallback roles see Fleet overview metrics
  return <FleetManagerOverview busCount={busCount} />;
};

export default DashboardOverviewPage;
