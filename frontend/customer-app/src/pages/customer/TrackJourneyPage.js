import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { Map, Navigation, Compass, Truck, Phone, Star, ShieldAlert, Award, Clock, ArrowRight } from 'lucide-react';

const TrackJourneyPage = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [mockProgress, setMockProgress] = useState(35); // percentage progress of the bus
  const [loading, setLoading] = useState(true);

  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);

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

  // Load Leaflet resources dynamically
  useEffect(() => {
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      setMapLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // resources kept loaded for subsequent navigation
    };
  }, []);

  const getRouteCoordinates = (from, to) => {
    if (from.toLowerCase().includes('hồ chí minh') && to.toLowerCase().includes('đà lạt')) {
      return [
        [10.8231, 106.6297], // HCM
        [10.9574, 106.8427], // Biên Hòa
        [10.9984, 107.2427], // Dầu Giây
        [11.2333, 107.4500], // Định Quán
        [11.4583, 107.5917], // Tân Phú
        [11.5167, 107.7167], // Đạ Huoai
        [11.5458, 107.8028], // Bảo Lộc
        [11.5843, 108.0664], // Di Linh
        [11.7583, 108.2667], // Đức Trọng
        [11.9404, 108.4583]  // Đà Lạt
      ];
    } else if (from.toLowerCase().includes('hồ chí minh') && to.toLowerCase().includes('cần thơ')) {
      return [
        [10.8231, 106.6297], // HCM
        [10.6297, 106.3636], // Tân An
        [10.3606, 106.3708], // Mỹ Tho
        [10.2541, 105.9722], // Vĩnh Long
        [10.0452, 105.7469]  // Cần Thơ
      ];
    }
    return [
      [10.8231, 106.6297],
      [11.9404, 108.4583]
    ];
  };

  const interpolatePosition = (route, percent) => {
    if (!route || route.length === 0) return [0, 0];
    if (percent <= 0) return route[0];
    if (percent >= 100) return route[route.length - 1];

    const totalSegments = route.length - 1;
    const positionInRoute = (percent / 100) * totalSegments;
    const segmentIndex = Math.floor(positionInRoute);
    const segmentPercent = positionInRoute - segmentIndex;

    const startNode = route[segmentIndex];
    const endNode = route[segmentIndex + 1];

    const lat = startNode[0] + (endNode[0] - startNode[0]) * segmentPercent;
    const lng = startNode[1] + (endNode[1] - startNode[1]) * segmentPercent;

    return [lat, lng];
  };

  // Map lifecycle and updates
  useEffect(() => {
    if (!mapLoaded || !selectedTrip || !window.L) return;

    const routeCoords = getRouteCoordinates(selectedTrip.from, selectedTrip.to);
    const busPos = interpolatePosition(routeCoords, mockProgress);

    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Force recalculation of container size after Leaflet initializes
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }

    const map = mapInstanceRef.current;

    // Draw route polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }
    polylineRef.current = window.L.polyline(routeCoords, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.75,
      dashArray: '5, 8'
    }).addTo(map);

    // Zoom once when trip changes
    const tripKey = `${selectedTrip.from}-${selectedTrip.to}-${selectedTrip.id}`;
    if (mapRef.current && mapRef.current.dataset.currentTrip !== tripKey) {
      mapRef.current.dataset.currentTrip = tripKey;
      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    }

    // Custom DivIcon
    const busIcon = window.L.divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #f97316;
          border: 3px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(249, 115, 22, 0.5);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10h2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Draw/Move Marker
    if (markerRef.current) {
      markerRef.current.setLatLng(busPos);
    } else {
      markerRef.current = window.L.marker(busPos, { icon: busIcon }).addTo(map);
    }

    // Set popup content
    markerRef.current.bindPopup(`
      <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 150px;">
        <strong style="color: #2563eb; font-size: 13px;">Xe Á Đông Travel</strong><br/>
        Biển số: <strong>${selectedTrip.busPlate}</strong><br/>
        Tốc độ: <strong>${selectedTrip.speed}</strong><br/>
        Đã đi được: <strong>${mockProgress}%</strong>
      </div>
    `);
  }, [mapLoaded, selectedTrip, mockProgress]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        polylineRef.current = null;
      }
    };
  }, []);

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
    <div className="section-container animate-fade-in" style={{ maxWidth: '1400px', width: '95%', paddingBottom: '5rem' }}>
      
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

            {/* Map Card */}
            <div className="glass-card animate-fade-in" style={{ padding: '0', overflow: 'hidden', height: '450px' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Map size={20} style={{ color: 'var(--primary)' }} />
                  Bản Đồ Hành Trình Trực Tuyến
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cập nhật vị trí thực tế của xe</span>
              </div>
              <div ref={mapRef} style={{ width: '100%', height: '398px', zIndex: 1 }} />
            </div>

            {/* Timelines and Stops */}
            <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
              <h4 style={{ fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} style={{ color: 'var(--primary)' }} />
                Danh Sách Các Điểm Dừng Và Thời Gian Dự Kiến
              </h4>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px', 
                position: 'relative', 
                paddingLeft: '24px',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '10px'
              }}>
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
                  let textColor = '#4b5563'; // Darker gray for better contrast
                  let iconElement = null;

                  if (stop.completed) {
                    circleBg = '#10b981'; // Green for completed stops
                    textColor = 'var(--text-secondary)';
                    iconElement = <span style={{ color: '#ffffff', fontSize: '9px', fontWeight: 'bold' }}>✓</span>;
                  } else if (stop.current) {
                    circleBg = 'var(--accent)';
                    textColor = 'var(--text-primary)';
                    iconElement = <Navigation size={10} className="animate-pulse" style={{ color: '#ffffff' }} />;
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
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: stop.completed ? 'var(--text-secondary)' : '#4b5563' }}>
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
