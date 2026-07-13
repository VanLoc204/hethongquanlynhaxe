import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { Map, Navigation, Compass, Truck, Phone, Star, ShieldAlert, Award, Clock, ArrowRight } from 'lucide-react';

const TrackJourneyPage = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [mockProgress, setMockProgress] = useState(35); // percentage progress of the bus
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTripsAndBookings = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const userId = user.id || user._id;
        const res = await axios.get(`http://localhost:8000/api/v1/trips/my-bookings/${userId}`);
        if (res.data.success) {
          const bookings = res.data.bookings || [];
          
          // Keep only non-cancelled bookings
          const activeBookings = bookings.filter(b => b.status !== 'cancelled');

          const fetchedTrips = [];
          for (const booking of activeBookings) {
            try {
              const tripRes = await axios.get(`http://localhost:8000/api/v1/trips/${booking.tripId}`);
              if (tripRes.data.success && tripRes.data.trip) {
                const tripData = tripRes.data.trip;

                const fromLoc = tripData.routeId?.startPoint || 'Hồ Chí Minh';
                const toLoc = tripData.routeId?.endPoint || 'Đà Lạt';
                const departureDate = new Date(tripData.departureTime);
                const arrivalDate = new Date(tripData.arrivalTime);

                // Format times and dates
                const timePart = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const datePart = departureDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const depTimeStr = `${timePart} - ${datePart}`;
                const arrTimeStr = arrivalDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                // Construct stops list
                const stops = [];
                if (tripData.pickupPoints && tripData.pickupPoints.length > 0) {
                  tripData.pickupPoints.forEach((p, idx) => {
                    stops.push({
                      name: `${p.location} (${p.address})`,
                      time: p.time,
                      completed: idx === 0
                    });
                  });
                } else {
                  stops.push({ name: `Văn phòng ${fromLoc}`, time: timePart, completed: true });
                }

                if (tripData.dropoffPoints && tripData.dropoffPoints.length > 0) {
                  tripData.dropoffPoints.forEach((d, idx) => {
                    stops.push({
                      name: `${d.location} (${d.address})`,
                      time: d.time,
                      completed: false
                    });
                  });
                } else {
                  stops.push({ name: `Bến xe ${toLoc}`, time: arrTimeStr, completed: false });
                }

                const now = new Date();
                let status = 'Scheduled';
                let speed = '0 km/h';
                let progressPercent = 0;
                
                if (now >= departureDate && now <= arrivalDate) {
                  status = 'In Transit';
                  speed = '60 km/h';
                  const totalDuration = arrivalDate - departureDate;
                  const elapsed = now - departureDate;
                  progressPercent = Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100)));
                } else if (now > arrivalDate) {
                  status = 'Completed';
                  speed = '0 km/h';
                  progressPercent = 100;
                }

                let currentStopSet = false;
                stops.forEach((stop, idx) => {
                  if (status === 'Completed') {
                    stop.completed = true;
                  } else if (status === 'In Transit') {
                    const stopProgressThreshold = (idx / (stops.length - 1)) * 100;
                    if (progressPercent >= stopProgressThreshold) {
                      stop.completed = true;
                    } else if (!currentStopSet) {
                      stop.current = true;
                      currentStopSet = true;
                    }
                  }
                });

                fetchedTrips.push({
                  id: booking._id,
                  from: fromLoc,
                  to: toLoc,
                  busPlate: tripData.busId?.plateNumber || 'Đang cập nhật',
                  driverName: tripData.driver?.name || 'Tài xế SmartBus',
                  driverPhone: tripData.driver?.phone || '1900.6067',
                  departureTime: depTimeStr,
                  arrivalTime: arrTimeStr,
                  speed: speed,
                  status: status,
                  progressPercent: progressPercent,
                  stops: stops
                });
              }
            } catch (err) {
              console.error(`Failed to fetch trip details for ${booking.tripId}:`, err);
            }
          }
          setActiveTrips(fetchedTrips);
          if (fetchedTrips.length > 0) {
            setSelectedTrip(fetchedTrips[0]);
            setMockProgress(fetchedTrips[0].progressPercent);
          }
        }
      } catch (err) {
        console.error('Lỗi khi lấy dữ liệu hành trình:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTripsAndBookings();
  }, [isAuthenticated, user]);

  // Simulate progress update
  useEffect(() => {
    if (selectedTrip && selectedTrip.status === 'In Transit') {
      const interval = setInterval(() => {
        setMockProgress(prev => {
          if (prev >= 100) return 0;
          return prev + 1;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTrip]);

  if (loading) {
    return (
      <div className="section-container animate-fade-in" style={{ maxWidth: '1100px', paddingBottom: '5rem', textAlign: 'center', marginTop: '5rem' }}>
        <Compass size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem', animationDuration: '3s' }} />
        <h3>Đang tải dữ liệu hành trình...</h3>
      </div>
    );
  }

  if (activeTrips.length === 0) {
    return (
      <div className="section-container animate-fade-in" style={{ maxWidth: '1100px', paddingBottom: '5rem', textAlign: 'center', marginTop: '5rem' }}>
        <Compass size={64} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }} />
        <h3 style={{ fontWeight: '700' }}>Không tìm thấy chuyến xe nào hoạt động</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>
          Bạn chưa đặt vé hoặc vé của bạn đã bị hủy / hoàn tất hành trình. Hãy đặt vé để bắt đầu theo dõi!
        </p>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.href = '/'}
          style={{ padding: '10px 24px', fontWeight: '700', borderRadius: '30px' }}
        >
          Đặt vé ngay
        </button>
      </div>
    );
  }

  return (
    <div className="section-container animate-fade-in" style={{ maxWidth: '1100px', paddingBottom: '5rem' }}>
      
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Map size={32} style={{ color: 'var(--primary)' }} />
          Theo Dõi Hành Trình Xe Trực Tuyến
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Xem vị trí, tốc độ, thông tin tài xế và thời gian dự kiến đến trạm của chuyến xe đang chạy.
        </p>
      </div>

      <div className="track-layout">
        
        {/* Left side list of tracks */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
            Chuyến xe của bạn
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeTrips.map(t => {
              const isSelected = selectedTrip?.id === t.id;
              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    setSelectedTrip(t);
                    setMockProgress(t.status === 'In Transit' ? 58 : 0);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{t.from} → {t.to}</span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: t.status === 'In Transit' ? 'rgba(16, 185, 129, 0.1)' : '#f3f4f6',
                      color: t.status === 'In Transit' ? '#10b981' : '#6b7280'
                    }}>
                      {t.status === 'In Transit' ? 'Đang chạy' : 'Chưa chạy'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Biển số: {t.busPlate}</span>
                    <span>Xuất phát: {t.departureTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side interactive track board */}
        {selectedTrip ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Bus status header card */}
            <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
              <div className="grid-auto-fit" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>BIỂN SỐ XE</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>{selectedTrip.busPlate}</h3>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TỐC ĐỘ HIỆN TẠI</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>{selectedTrip.speed}</h3>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TÀI XẾ PHỤ TRÁCH</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <h4 style={{ fontWeight: '700', margin: 0 }}>{selectedTrip.driverName}</h4>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>LIÊN HỆ KHẨN CẤP</span>
                  <a 
                    href={`tel:${selectedTrip.driverPhone}`} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      color: 'var(--accent)', 
                      fontWeight: '700', 
                      textDecoration: 'none',
                      marginTop: '4px' 
                    }}
                  >
                    <Phone size={16} />
                    {selectedTrip.driverPhone}
                  </a>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Hành trình bắt đầu</span>
                  <span>Ước tính còn lại: <strong>2 giờ 45 phút</strong></span>
                  <span>Đến nơi</span>
                </div>
                <div style={{ height: '14px', backgroundColor: '#e5e7eb', borderRadius: '7px', position: 'relative', overflow: 'visible' }}>
                  {/* Active progress */}
                  <div style={{ width: `${mockProgress}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '7px', transition: 'width 0.5s ease-in-out' }}></div>
                  {/* Bus icon representing current coordinates */}
                  <div style={{
                    position: 'absolute',
                    left: `calc(${mockProgress}% - 18px)`,
                    top: '-12px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 10px rgba(249, 115, 22, 0.4)',
                    transition: 'left 0.5s ease-in-out',
                    zIndex: 2
                  }}>
                    <Truck size={18} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.9rem', fontWeight: '700' }}>
                  <span>{selectedTrip.from}</span>
                  <span style={{ color: 'var(--accent)' }}>{mockProgress}% hoàn thành</span>
                  <span>{selectedTrip.to}</span>
                </div>
              </div>
            </div>

            {/* Timelines and Stops */}
            <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
              <h4 style={{ fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} style={{ color: 'var(--primary)' }} />
                Danh Sách Các Điểm Dừng Và Thời Gian Dự Kiến
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px' }}>
                {/* Visual timeline bar */}
                <div style={{
                  position: 'absolute',
                  left: '7px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  backgroundColor: 'var(--border-color)'
                }}></div>

                {selectedTrip.stops.map((stop, idx) => {
                  let circleBg = '#e5e7eb';
                  let textColor = 'var(--text-muted)';
                  let iconElement = null;

                  if (stop.completed) {
                    circleBg = 'var(--primary)';
                    textColor = 'var(--text-secondary)';
                  } else if (stop.current) {
                    circleBg = 'var(--accent)';
                    textColor = 'var(--text-primary)';
                    iconElement = <Navigation size={12} className="animate-pulse" style={{ color: '#ffffff' }} />;
                  }

                  return (
                    <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {/* Circle indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '-23px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: circleBg,
                        border: '3px solid #ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: stop.current ? '0 0 10px var(--accent)' : 'none',
                        zIndex: 2
                      }}>
                        {iconElement}
                      </div>

                      <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h5 style={{ fontWeight: stop.current ? '800' : '600', color: textColor, margin: 0, fontSize: stop.current ? '1.05rem' : '0.95rem' }}>
                            {stop.name}
                            {stop.current && <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'var(--accent)', backgroundColor: 'rgba(249, 115, 22, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>XE HIỆN TẠI ĐANG Ở ĐÂY</span>}
                          </h5>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: stop.completed ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {stop.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Compass size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem', animationDuration: '6s' }} />
            <h3>Đang tải dữ liệu định vị...</h3>
          </div>
        )}
      </div>

    </div>
  );
};

export default TrackJourneyPage;
