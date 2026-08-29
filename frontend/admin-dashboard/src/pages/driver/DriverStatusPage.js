import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const DriverStatusPage = () => {
  const { token, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trip, setTrip] = useState(null);
  const [stops, setStops] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active trip from driver's schedule
  const fetchActiveTrip = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Find today's active or scheduled trip
        const todayStr = new Date().toDateString();
        const todayTrips = (data.trips || []).filter(t => new Date(t.departureTime).toDateString() === todayStr);
        
        // Prioritize in_transit trip, then scheduled trip
        let activeTrip = todayTrips.find(t => t.journeyStatus === 'in_transit') || 
                         todayTrips.find(t => t.journeyStatus === 'scheduled') ||
                         todayTrips[0] || null;

        if (activeTrip) {
          setTrip(activeTrip);
          buildStops(activeTrip);
        } else {
          setTrip(null);
          setStops([]);
        }
      } else {
        setError(data.message || 'Không thể tải lịch trình.');
      }
    } catch (err) {
      setError('Lỗi kết nối khi tải hành trình.');
    } finally {
      setLoading(false);
    }
  };

  const buildStops = (tripData) => {
    const stopsList = [];
    if (tripData.pickupPoints && tripData.pickupPoints.length > 0) {
      tripData.pickupPoints.forEach(p => stopsList.push({ ...p, type: 'pickup' }));
    }
    if (tripData.dropoffPoints && tripData.dropoffPoints.length > 0) {
      tripData.dropoffPoints.forEach(d => stopsList.push({ ...d, type: 'dropoff' }));
    }
    setStops(stopsList);
  };

  useEffect(() => {
    if (token) {
      fetchActiveTrip();
    }
  }, [token]);

  const handleJourneyUpdate = async (action) => {
    if (!trip) return;
    setError('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/trips/${trip._id}/update-journey`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrip(data.trip);
        buildStops(data.trip);
      } else {
        setError(data.message || 'Cập nhật hành trình thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối khi cập nhật hành trình.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="animate-spin" style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid var(--primary-bg)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>Đang tải thông tin hành trình xe chạy...</p>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div style={{ margin: '2rem', padding: '1.25rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fca5a5' }}>
        <strong>Lỗi:</strong> {error}
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#ffffff', borderRadius: '12px', border: '1px dashed var(--card-border)', margin: '2rem 0' }}>
        <h3 style={{ fontWeight: '800', color: 'var(--text)', fontSize: '1.25rem' }}>Không Có Chuyến Xe Nào Hôm Nay</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
          Bạn không có lịch trình chạy xe nào được phân công hoặc hoạt động trong ngày hôm nay.
        </p>
        <button className="btn" onClick={fetchActiveTrip} style={{ marginTop: '1.5rem', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
          Tải lại dữ liệu
        </button>
      </div>
    );
  }

  const { currentStopIndex, journeyStatus, journeyLogs = [] } = trip;
  const isNotStarted = journeyStatus === 'scheduled' || currentStopIndex === -1;
  const isCompleted = journeyStatus === 'completed';
  const isLastUpdateStep = currentStopIndex === stops.length - 2; // Next is destination

  const getNextStopName = () => {
    if (isNotStarted) return stops[0]?.location || 'Bến xuất phát';
    if (currentStopIndex < stops.length - 1) {
      return stops[currentStopIndex + 1]?.location;
    }
    return '';
  };

  const getNextStopAddress = () => {
    if (isNotStarted) return stops[0]?.address || '';
    if (currentStopIndex < stops.length - 1) {
      return stops[currentStopIndex + 1]?.address;
    }
    return '';
  };

  const departureDate = trip ? new Date(trip.departureTime) : new Date();
  const allowedStartDate = new Date(departureDate.getTime() - 5 * 60 * 1000);
  const isTimeAllowed = currentTime >= allowedStartDate;

  const styles = `
    @keyframes pulse-blue {
      0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
    }
    @keyframes pulse-orange {
      0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
      100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
    }
    @keyframes blink {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }
    .pulse-blue {
      animation: pulse-blue 1.5s infinite;
    }
    .pulse-orange {
      animation: pulse-orange 1.5s infinite;
    }
  `;

  return (
    <div className="responsive-grid-layout" style={{ animation: 'fadeIn 0.3s ease', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '2rem' }}>
      
      {/* Left side: status controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Current status actions card */}
        <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '12px', border: '1px solid var(--card-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text)', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            Cập Nhật Hành Trình Xe Chạy
          </h3>

          {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Status indicator badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Trạng thái chuyến:</span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: isCompleted ? '#d1fae5' : (isNotStarted ? '#fef3c7' : '#dbeafe'),
                color: isCompleted ? '#065f46' : (isNotStarted ? '#92400e' : '#1e40af'),
                textTransform: 'uppercase'
              }}>
                {isCompleted ? 'Hoàn thành' : (isNotStarted ? 'Chưa khởi hành' : 'Đang di chuyển')}
              </span>
            </div>

            {/* Dynamic CTA updates */}
            {isCompleted ? (
              <div style={{ background: '#ecfdf5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                <h4 style={{ color: '#065f46', margin: 0, fontWeight: '800' }}>Hành Trình Đã Kết Thúc Thành Công</h4>
                <p style={{ color: '#047857', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                  Cảm ơn tài xế đã cập nhật hành trình chuyến xe an toàn!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Next target stop highlight */}
                <div style={{ padding: '1.25rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e40af', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {isNotStarted ? 'Điểm bắt đầu khởi hành' : (isLastUpdateStep ? 'Bến đích (Điểm cuối)' : 'Điểm đến tiếp theo')}
                  </span>
                  <h4 style={{ margin: '6px 0 4px 0', fontSize: '1.15rem', color: '#1e3a8a', fontWeight: '800' }}>
                    {getNextStopName()}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#2563eb' }}>
                    {getNextStopAddress()}
                  </p>
                </div>

                {/* Primary Button */}
                {isNotStarted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleJourneyUpdate('start')}
                      disabled={!isTimeAllowed}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '800',
                        cursor: isTimeAllowed ? 'pointer' : 'not-allowed',
                        background: isTimeAllowed ? 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)' : '#cbd5e1',
                        color: isTimeAllowed ? '#ffffff' : '#94a3b8',
                        boxShadow: isTimeAllowed ? '0 4px 10px rgba(99, 102, 241, 0.2)' : 'none',
                        fontSize: '1rem',
                        transition: 'transform 0.2s, opacity 0.2s'
                      }}
                      onMouseEnter={(e) => { if (isTimeAllowed) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={(e) => { if (isTimeAllowed) e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      Bắt Đầu Khởi Hành Rời Bến
                    </button>
                    {!isTimeAllowed && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', fontWeight: '800', textAlign: 'center', backgroundColor: '#fee2e2', padding: '8px', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                        Chỉ được phép bắt đầu trước giờ xuất phát tối đa 5 phút (Từ {allowedStartDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}).
                      </p>
                    )}
                  </div>
                ) : isLastUpdateStep ? (
                  // Hide "Update", only show "Finish"
                  <button
                    onClick={() => handleJourneyUpdate('complete')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '800',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                      fontSize: '1rem',
                      transition: 'transform 0.2s, opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Kết Thúc Hành Trình (Hoàn Thành)
                  </button>
                ) : (
                  // Intermediate updates
                  <button
                    onClick={() => handleJourneyUpdate('update')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '800',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
                      fontSize: '1rem',
                      transition: 'transform 0.2s, opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Cập Nhật Đã Đến: {getNextStopName()}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Current trip metadata info */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Thông Tin Chuyến Xe Phân Công:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text)' }}>
              <div>Tuyến: <strong>{trip.routeId?.startPoint} ➔ {trip.routeId?.endPoint}</strong></div>
              <div>Giờ đi: <strong>{new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(trip.departureTime).toLocaleDateString('vi-VN')})</strong></div>
              <div>Biển số xe: <strong>{trip.busId?.plateNumber}</strong></div>
              <div>Tài xế: <strong>{trip.driver?.name || user?.name}</strong></div>
              <div>Phụ xe: <strong>{trip.assistant?.name || 'Đang phân công'}</strong></div>
              <div>Số điểm dừng: <strong>{stops.length} điểm</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: journey log timeline (real-time updates feed) */}
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <style>{styles}</style>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text)', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          Nhật Ký & Lộ Trình Chuyến Chạy
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '1.5rem' }}>
          {/* Vertical timeline line */}
          <div style={{
            position: 'absolute',
            left: '5px',
            top: '5px',
            bottom: '5px',
            width: '2px',
            backgroundColor: '#e2e8f0'
          }}></div>

          {stops.map((stop, idx) => {
            const isVisited = currentStopIndex >= idx && !isNotStarted;
            const isCurrent = currentStopIndex === idx && !isNotStarted;
            
            // Find matching log in journeyLogs
            const matchingLog = (journeyLogs || []).find(l => l.location === stop.location);

            let displayTime = `Dự kiến: ${stop.time}`;
            let displayDesc = stop.type === 'pickup' ? `Chờ đón khách tại ${stop.location}` : `Chờ trả khách tại ${stop.location}`;
            
            if (isVisited && matchingLog) {
              const dateObj = new Date(matchingLog.time);
              displayTime = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')} - ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
              displayDesc = matchingLog.desc;
            } else if (isVisited && idx === 0) {
              // Fallback for start point if log matches index but name differs slightly
              const dateObj = journeyLogs[0] ? new Date(journeyLogs[0].time) : new Date();
              displayTime = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')} - ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
              displayDesc = `Xe xuất phát từ ${stop.location}`;
            }

            // Color coding
            const isPickup = stop.type === 'pickup';
            const dotColor = isPickup ? '#2563eb' : '#f97316'; // Blue for pickup, Orange for dropoff
            const typeLabel = isPickup ? 'Điểm Đón' : 'Điểm Trả';
            const labelBg = isPickup ? '#eff6ff' : '#fff7ed';
            const labelColor = isPickup ? '#1e40af' : '#c2410c';

            return (
              <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px', opacity: isVisited ? 1 : 0.6 }}>
                {/* Timeline bullet dot */}
                <span 
                  className={isCurrent ? (isPickup ? 'pulse-blue' : 'pulse-orange') : ''}
                  style={{
                    position: 'absolute',
                    left: '-1.85rem',
                    top: '0.25rem',
                    width: isCurrent ? '14px' : '10px',
                    height: isCurrent ? '14px' : '10px',
                    borderRadius: '50%',
                    backgroundColor: isVisited ? dotColor : '#cbd5e1',
                    border: '2px solid #ffffff',
                    zIndex: 2,
                    transition: 'all 0.2s'
                  }}
                ></span>

                {/* Timestamp & Type Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isVisited ? 'var(--text)' : 'var(--text-muted)' }}>
                    {displayTime}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: labelBg,
                    color: labelColor,
                    textTransform: 'uppercase'
                  }}>
                    {typeLabel}
                  </span>
                  {isCurrent && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      animation: 'blink 1.2s infinite ease-in-out'
                    }}>
                      Đang ở đây
                    </span>
                  )}
                </div>

                {/* Description */}
                <div style={{ fontSize: '0.9rem', color: isVisited ? 'var(--text)' : 'var(--text-muted)', fontWeight: isVisited ? '700' : '400', marginTop: '2px' }}>
                  {displayDesc}
                </div>
                
                {/* Address */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Địa chỉ: {stop.address}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default DriverStatusPage;

