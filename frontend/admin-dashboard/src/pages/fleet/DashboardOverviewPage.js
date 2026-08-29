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
        <StatCard label="Tỷ lệ hoạt động" value="87.5%" trend="Hầu hết xe sẵn sàng chạy" colorClass="green" />
        <StatCard label="Xe đang bảo trì" value="1 xe" trend="Bảo dưỡng tại garage" colorClass="yellow" />
        <StatCard label="Đề xuất chờ duyệt" value="3 đơn đề xuất" trend="Đang chờ phê duyệt" colorClass="purple" />
      </section>

      <section className="content-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Kế hoạch bảo trì gần đây */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Lịch bảo trì &amp; Đăng kiểm sắp tới</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>51B-123.45</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Hạn 15/09/2026</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bảo dưỡng định kỳ: Thay dầu động cơ, lọc gió</p>
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>49B-022.22</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Hạn 20/09/2026</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Kiểm định đăng kiểm kỳ 6 tháng</p>
            </div>
          </div>
        </div>

        {/* Phân loại phương tiện */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Phân loại phương tiện vận hành</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Limousine VIP (22 phòng nằm)</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Dành cho chặng xa chất lượng cao</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--primary)', fontWeight: '700' }}>3 xe</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% Sẵn sàng</p>
              </div>
            </div>

            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Giường nằm phổ thông (44 chỗ)</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Xe chạy tuyến liên tỉnh thường</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--success)', fontWeight: '700' }}>5 xe</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>4 chạy, 1 bảo trì</p>
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

const GeneralManagerOverview = ({ routeCount, tripCount, busCount, totalBookedSeats, revenue, avgRating, recentTrips }) => {
  return (
    <>
      <section className="stats-grid">
        <StatCard 
          label="Tổng doanh thu vé" 
          value={`${revenue.toLocaleString('vi-VN')}đ`} 
          trend="+12.4%" 
          colorClass="green" 
        />
        <StatCard 
          label="Vé xe đã bán" 
          value={`${totalBookedSeats} vé`} 
          trend="+8.2%" 
          colorClass="blue" 
        />
        <StatCard 
          label="Chuyến xe vận hành" 
          value={`${tripCount} chuyến`} 
          trend="+15.5%" 
          colorClass="purple" 
        />
        <StatCard 
          label="Đánh giá trung bình" 
          value={`${avgRating.toFixed(1)} ★`} 
          trend="+4.7%" 
          colorClass="yellow" 
        />
      </section>

      {/* Visual panels */}
      <section className="content-section" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Active operations list */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Giám sát hoạt động các chuyến xe hôm nay</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '10px 8px' }}>Tuyến xe</th>
                  <th style={{ padding: '10px 8px' }}>Khởi hành</th>
                  <th style={{ padding: '10px 8px' }}>Nhân sự</th>
                  <th style={{ padding: '10px 8px' }}>Biển số xe</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Số vé</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Doanh thu dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.slice(0, 5).map((trip) => {
                  const tripRevenue = (trip.bookedSeats?.length || 0) * trip.price;
                  const depTime = new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                  return (
                    <tr key={trip._id} style={{ borderBottom: '1px solid var(--card-border)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                        {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{depTime}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600' }}>{trip.driver?.name || 'Chưa gán'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phụ: {trip.assistant?.name || 'Chưa gán'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: '600' }}>{trip.busId?.plateNumber || 'N/A'}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: 'var(--primary)' }}>
                        {trip.bookedSeats?.length || 0}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                        {tripRevenue.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick status information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)', flexGrow: 1 }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Tổng quan chỉ số đội xe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng số xe khách:</span>
                <span style={{ fontWeight: '700' }}>{busCount} xe</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tuyến kết nối:</span>
                <span style={{ fontWeight: '700' }}>{routeCount} tuyến</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tỷ lệ xe sẵn sàng:</span>
                <span style={{ fontWeight: '700', color: 'var(--success)' }}>100%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phản hồi tích cực:</span>
                <span style={{ fontWeight: '700', color: 'var(--warning)' }}>94.5%</span>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>Trạng thái vận hành</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #d1fae5' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: '#065f46', fontSize: '0.85rem', fontWeight: '700' }}>Hệ thống trực tuyến thời gian thực</span>
            </div>
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
  const [revenue, setRevenue] = useState(0);
  const [avgRating, setAvgRating] = useState(4.5);
  const [recentTrips, setRecentTrips] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch buses
        const busesRes = await fetch(`${API_BASE}/trips/fleet/buses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const busesData = await busesRes.json();
        const totalBuses = busesData.success ? busesData.buses.length : 0;
        setBusCount(totalBuses);

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

          // Calculate metrics
          let seatsCount = 0;
          let calculatedRevenue = 0;
          let ratingsSum = 0;
          let ratingsCount = 0;

          tripsData.trips.forEach(trip => {
            const booked = trip.bookedSeats?.length || 0;
            seatsCount += booked;
            calculatedRevenue += booked * trip.price;

            if (trip.ratings?.average) {
              ratingsSum += trip.ratings.average;
              ratingsCount++;
            }
          });

          setTotalBookedSeats(seatsCount);
          setRevenue(calculatedRevenue);
          if (ratingsCount > 0) {
            setAvgRating(ratingsSum / ratingsCount);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '700' }}>Đang tải báo cáo tổng quan vận hành...</div>
      </div>
    );
  }

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

  if (user?.role === 'general_manager') {
    return (
      <GeneralManagerOverview 
        routeCount={routeCount}
        tripCount={tripCount}
        busCount={busCount}
        totalBookedSeats={totalBookedSeats}
        revenue={revenue}
        avgRating={avgRating}
        recentTrips={recentTrips}
      />
    );
  }

  // Fleet Manager overview metrics
  return <FleetManagerOverview busCount={busCount} />;
};

export default DashboardOverviewPage;
