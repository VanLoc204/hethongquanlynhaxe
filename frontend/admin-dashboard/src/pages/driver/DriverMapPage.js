import React, { useState, useEffect, useRef } from 'react';

const DriverMapPage = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(55);
  const [progressKm, setProgressKm] = useState(140);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const totalKm = 305;

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);

  // Key waypoints for HCM -> Da Lat
  const PREDEFINED_ROUTE = {
    routeName: 'Hồ Chí Minh ➔ Đà Lạt (Độ bám đường Quốc lộ 20)',
    busPlate: '51B-045.45',
    busType: 'Xe Giường Nằm 44 Chỗ',
    driverName: 'Nguyễn Văn Tài (Tài xế chính)',
    startPoint: 'Bến Xe Miền Đông (TP.HCM)',
    endPoint: 'Bến Xe Liên Tỉnh Đà Lạt',
    waypoints: [
      { name: 'Bến Xe Miền Đông', type: 'start', status: 'completed', lat: 10.8123, lng: 106.7123, note: 'Xuất bến đúng 07:00' },
      { name: 'Trạm kiểm soát Dầu Giây', type: 'checkpoint', status: 'completed', lat: 10.9512, lng: 107.1245, note: 'Đã đi qua lúc 08:45' },
      { name: 'Trạm dừng chân Bảo Lộc', type: 'rest_stop', status: 'current', lat: 11.5432, lng: 107.8012, note: 'Vị trí hiện tại - Đang leo đèo Bảo Lộc' },
      { name: 'Trạm trung chuyển Di Linh', type: 'checkpoint', status: 'upcoming', lat: 11.6621, lng: 108.0652, note: 'Dự kiến đến lúc 12:30' },
      { name: 'Bến Xe Liên Tỉnh Đà Lạt', type: 'end', status: 'upcoming', lat: 11.9404, lng: 108.4583, note: 'Dự kiến cập bến 14:00' }
    ]
  };

  // 1. Fetch real driving route geometry from OSRM Routing Engine (OpenStreetMap Real Highway Routing)
  useEffect(() => {
    const fetchRealOSRMRoute = async () => {
      try {
        setLoadingRoute(true);
        // Build waypoints string for OSRM: lng,lat;lng,lat...
        const waypointsStr = PREDEFINED_ROUTE.waypoints
          .map(wp => `${wp.lng},${wp.lat}`)
          .join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          // Convert OSRM GeoJSON [lng, lat] to Leaflet [lat, lng]
          const latLngs = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRouteCoordinates(latLngs);
        } else {
          // Fallback to waypoints array if OSRM is busy
          setRouteCoordinates(PREDEFINED_ROUTE.waypoints.map(wp => [wp.lat, wp.lng]));
        }
      } catch (err) {
        console.warn('OSRM routing fetch error, fallbacking to waypoints:', err);
        setRouteCoordinates(PREDEFINED_ROUTE.waypoints.map(wp => [wp.lat, wp.lng]));
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRealOSRMRoute();
  }, []);

  // 2. Load Leaflet CDN dynamically
  useEffect(() => {
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // 3. Initialize & Draw Map
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current || routeCoordinates.length === 0) return;

    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [11.5432, 107.8012], // Centered at Bao Loc
        zoom: 9,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old polyline if any
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    // Draw Real Highway Polyline (Uốn lượn ôm bám sát theo Quốc Lộ 20)
    polylineRef.current = L.polyline(routeCoordinates, {
      color: '#2563eb',
      weight: 6,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Add Checkpoint Markers
    PREDEFINED_ROUTE.waypoints.forEach(wp => {
      let pinColor = '#2563eb';
      if (wp.status === 'completed') pinColor = '#16a34a';
      if (wp.status === 'current') pinColor = '#d97706';
      if (wp.type === 'end') pinColor = '#dc2626';

      const customIcon = L.divIcon({
        className: 'driver-wp-marker',
        html: `
          <div style="
            background: ${pinColor};
            color: #ffffff;
            font-weight: 700;
            font-size: 0.65rem;
            padding: 3px 8px;
            border-radius: 10px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 8px rgba(0,0,0,0.25);
            white-space: nowrap;
          ">
            ${wp.name}
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 2px;">
          <strong style="color: #0f172a;">${wp.name}</strong>
          <div style="font-size: 0.75rem; color: #475569; margin-top: 4px;">${wp.note}</div>
        </div>
      `);
    });

    // Add Live Bus Marker at Current Position
    const busIcon = L.divIcon({
      className: 'live-bus-marker',
      html: `
        <div style="
          background: #2563eb;
          color: #ffffff;
          font-weight: 800;
          font-size: 0.72rem;
          padding: 6px 12px;
          border-radius: 16px;
          border: 3px solid #ffffff;
          box-shadow: 0 6px 16px rgba(37,99,235,0.4);
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <span>🚌 Xe của bạn (${PREDEFINED_ROUTE.busPlate})</span>
        </div>
      `,
      iconSize: [140, 32],
      iconAnchor: [70, 16]
    });

    L.marker([11.5432, 107.8012], { icon: busIcon }).addTo(map);

  }, [mapLoaded, routeCoordinates]);

  // Simulate Speed fluctuations slightly
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSpeed(prev => Math.min(75, Math.max(45, prev + Math.floor((Math.random() - 0.5) * 6))));
      setProgressKm(prev => Math.min(totalKm, +(prev + 0.1).toFixed(1)));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const progressPct = Math.round((progressKm / totalKm) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', animation: 'fadeIn 0.3s ease' }}>
      {/* Top Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              Bản Đồ Hành Trình Di Chuyển Thực Tế
            </h1>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
              OSRM Real Road Routing Engine
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
            Lộ trình di chuyển thực tế theo đường Quốc lộ 20 &amp; Cao tốc — Tự động uốn lượn bám sát bản đồ giao thông
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
            Đang di chuyển đúng lộ trình quốc lộ
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Map (70%) + Route Navigation Guide (30%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', minHeight: '580px' }}>
        
        {/* Interactive Leaflet Navigation Map Container */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Subheader Title */}
          <div style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem'
          }}>
            <div style={{ fontWeight: '700', color: '#0f172a' }}>
              Tuyến chạy thực tế: <span style={{ color: '#2563eb' }}>{PREDEFINED_ROUTE.routeName}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Biển số xe: <strong style={{ color: '#0f172a' }}>{PREDEFINED_ROUTE.busPlate}</strong>
            </div>
          </div>

          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} style={{ width: '100%', flex: 1, minHeight: '460px', background: '#e2e8f0' }}>
            {(!mapLoaded || loadingRoute) && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontWeight: '600' }}>
                Đang tính toán đường uốn lượn Quốc lộ 20 từ OSRM Engine...
              </div>
            )}
          </div>

          {/* Real-time Telemetry Bar */}
          <div style={{
            padding: '12px 16px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            fontSize: '0.78rem'
          }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>VỊ TRÍ HIỆN TẠI</div>
              <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>Đèo Bảo Lộc</div>
              <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>Tỉnh Lâm Đồng</div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>VẬN TỐC HIỆN TẠI</div>
              <div style={{ fontWeight: '800', color: '#2563eb', marginTop: '2px', fontSize: '0.95rem' }}>{currentSpeed} km/h</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Giới hạn 80 km/h</div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>TIẾN ĐỘ QUÃNG ĐƯỜNG</div>
              <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{progressKm} / {totalKm} km</div>
              <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '700' }}>{progressPct}% Hoàn thành</div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>DỰ KIẾN CÒN LAI</div>
              <div style={{ fontWeight: '800', color: '#d97706', marginTop: '2px' }}>3 giờ 15 phút</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Cập bến: 14:00</div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Predefined Waypoints Timeline & Route Navigation */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          padding: '1.1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Danh Sách Trạm Dừng Chuẩn
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', margin: 0 }}>
              Lộ trình trạm dừng cố định do Quản lý Vận tải phê duyệt
            </p>
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
            {PREDEFINED_ROUTE.waypoints.map((wp, idx) => {
              const isDone = wp.status === 'completed';
              const isCurrent = wp.status === 'current';

              return (
                <div key={idx} style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: isCurrent ? '2px solid #d97706' : isDone ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                  backgroundColor: isCurrent ? '#fffbeb' : isDone ? '#ecfdf5' : '#ffffff',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.82rem' }}>
                      {isDone ? '✓ ' : isCurrent ? '📍 ' : '🏁 '} {wp.name}
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      backgroundColor: isDone ? '#dcfce7' : isCurrent ? '#fef3c7' : '#f1f5f9',
                      color: isDone ? '#15803d' : isCurrent ? '#b45309' : '#64748b'
                    }}>
                      {isDone ? 'Đã đi qua' : isCurrent ? 'Hiện tại' : 'Trạm kế'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px' }}>
                    {wp.note}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Emergency Alert Button */}
          <button
            onClick={() => alert('Đã gửi thông báo báo cáo sự cố lộ trình về Trung tâm Điều hành Vận tải!')}
            style={{
              width: '100%',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#be123c',
              fontWeight: '700',
              padding: '10px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            ⚠️ Báo cáo sự cố đường đi / Kẹt xe
          </button>
        </div>

      </div>
    </div>
  );
};

export default DriverMapPage;
