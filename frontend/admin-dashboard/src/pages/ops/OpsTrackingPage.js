import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000/api/v1';

// Initial route waypoints in S.Vietnam for GPS simulation
const DEMO_TRACKING_DATA = [
  {
    id: 'TRIP-001',
    plateNumber: '51B-016.16',
    busType: 'Xe Ghế Ngồi 16 Chỗ',
    driverName: 'Nguyen Van Tai',
    driverPhone: '0908123456',
    routeName: 'Hồ Chí Minh ➔ Cần Thơ',
    startPoint: 'Bến Xe Miền Tây',
    endPoint: 'Bến Xe Trung Tâm Cần Thơ',
    departureTime: '08:30',
    estimatedArrival: '11:30',
    speed: 68,
    speedLimit: 80,
    status: 'on_track',
    statusText: 'Đúng lộ trình chuẩn (QL1A)',
    progressPct: 58,
    lat: 10.4532,
    lng: 106.0123,
    waypoints: [
      { lat: 10.7512, lng: 106.6152 }, // HCM
      { lat: 10.5378, lng: 106.4156 }, // Tân An
      { lat: 10.4532, lng: 106.0123 }, // Cai Lậy
      { lat: 10.2541, lng: 105.9723 }, // Vĩnh Long
      { lat: 10.0321, lng: 105.7821 }  // Cần Thơ
    ]
  },
  {
    id: 'TRIP-002',
    plateNumber: '51B-045.45',
    busType: 'Xe Giường Nằm 44 Chỗ',
    driverName: 'Tran Van Phuong',
    driverPhone: '0912345678',
    routeName: 'Hồ Chí Minh ➔ Đà Lạt',
    startPoint: 'Bến Xe Miền Đông',
    endPoint: 'Bến Xe Liên Tỉnh Đà Lạt',
    departureTime: '07:00',
    estimatedArrival: '14:00',
    speed: 74,
    speedLimit: 80,
    status: 'on_track',
    statusText: 'Đang leo đèo Bảo Lộc (QL20)',
    progressPct: 62,
    lat: 11.5432,
    lng: 107.8012,
    waypoints: [
      { lat: 10.8123, lng: 106.7123 }, // HCM
      { lat: 10.9512, lng: 107.1245 }, // Dầu Giây
      { lat: 11.5432, lng: 107.8012 }, // Bảo Lộc
      { lat: 11.6621, lng: 108.0652 }, // Di Linh
      { lat: 11.9404, lng: 108.4583 }  // Đà Lạt
    ]
  },
  {
    id: 'TRIP-003',
    plateNumber: '51B-029.29',
    busType: 'Limousine VIP 22 Phòng',
    driverName: 'Le Hoang Nam',
    driverPhone: '0988776655',
    routeName: 'Cần Thơ ➔ Hồ Chí Minh',
    startPoint: 'Bến Xe Trung Tâm Cần Thơ',
    endPoint: 'Bến Xe Miền Tây',
    departureTime: '09:00',
    estimatedArrival: '12:00',
    speed: 84,
    speedLimit: 80,
    status: 'speeding',
    statusText: 'Cảnh báo: Vượt quá tốc độ (84/80 km/h)',
    progressPct: 35,
    lat: 10.2214,
    lng: 105.9521,
    waypoints: [
      { lat: 10.0321, lng: 105.7821 }, // Cần Thơ
      { lat: 10.2541, lng: 105.9723 }, // Vĩnh Long
      { lat: 10.5378, lng: 106.4156 }, // Tân An
      { lat: 10.7512, lng: 106.6152 }  // HCM
    ]
  },
  {
    id: 'TRIP-004',
    plateNumber: '51B-123.45',
    busType: 'Xe Ghế Ngồi 29 Chỗ',
    driverName: 'Pham Quoc Huy',
    driverPhone: '0933445566',
    routeName: 'Đà Lạt ➔ Hồ Chí Minh',
    startPoint: 'Bến Xe Đà Lạt',
    endPoint: 'Bến Xe Miền Đông',
    departureTime: '06:00',
    estimatedArrival: '13:00',
    speed: 0,
    speedLimit: 80,
    status: 'stopped',
    statusText: 'Đang dừng nghỉ tại Trạm Tâm Châu',
    progressPct: 45,
    lat: 11.5321,
    lng: 107.7912,
    waypoints: [
      { lat: 11.9404, lng: 108.4583 }, // Đà Lạt
      { lat: 11.6621, lng: 108.0652 }, // Di Linh
      { lat: 11.5432, lng: 107.8012 }, // Bảo Lộc
      { lat: 10.9512, lng: 107.1245 }, // Dầu Giây
      { lat: 10.8123, lng: 106.7123 }  // HCM
    ]
  }
];

const OpsTrackingPage = () => {
  const [buses, setBuses] = useState(DEMO_TRACKING_DATA);
  const [selectedBusId, setSelectedBusId] = useState('TRIP-001');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [osrmPaths, setOsrmPaths] = useState({});

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);

  // Load Leaflet CDN dynamically
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

  // Fetch real highway geometries from OSRM for selected bus
  useEffect(() => {
    const fetchOSRMPath = async (bus) => {
      if (osrmPaths[bus.id]) return; // Already fetched

      try {
        const waypointsStr = bus.waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const latLngs = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setOsrmPaths(prev => ({ ...prev, [bus.id]: latLngs }));
        } else {
          setOsrmPaths(prev => ({ ...prev, [bus.id]: bus.waypoints.map(w => [w.lat, w.lng]) }));
        }
      } catch {
        setOsrmPaths(prev => ({ ...prev, [bus.id]: bus.waypoints.map(w => [w.lat, w.lng]) }));
      }
    };

    const selectedBus = buses.find(b => b.id === selectedBusId);
    if (selectedBus) {
      fetchOSRMPath(selectedBus);
    }
  }, [selectedBusId, buses, osrmPaths]);

  // Initialize & update Leaflet Map
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current) return;

    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.8, 106.7],
        zoom: 8,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & polyline
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    if (polylineRef.current) polylineRef.current.remove();

    // Custom Icon Generator
    const createBusIcon = (status, plate) => {
      let iconColor = '#2563eb'; // blue
      if (status === 'speeding') iconColor = '#dc2626'; // red
      if (status === 'stopped') iconColor = '#d97706'; // yellow

      return L.divIcon({
        className: 'custom-bus-marker',
        html: `
          <div style="
            background: ${iconColor};
            color: #ffffff;
            font-weight: 800;
            font-size: 0.65rem;
            padding: 4px 8px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>🚌 ${plate}</span>
          </div>
        `,
        iconSize: [80, 26],
        iconAnchor: [40, 13]
      });
    };

    // Add markers for all buses
    buses.forEach(bus => {
      const marker = L.marker([bus.lat, bus.lng], {
        icon: createBusIcon(bus.status, bus.plateNumber)
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <strong style="color: #0f172a; font-size: 0.9rem;">🚌 Xe ${bus.plateNumber}</strong>
          <div style="fontSize: 0.75rem; color: #475569; margin-top: 4px;">Tuyến: <strong>${bus.routeName}</strong></div>
          <div style="fontSize: 0.75rem; color: #475569;">Tài xế: <strong>${bus.driverName}</strong> (${bus.driverPhone})</div>
          <div style="fontSize: 0.75rem; color: #2563eb; margin-top: 4px;">Tốc độ: <strong>${bus.speed} km/h</strong> | Tiến độ: <strong>${bus.progressPct}%</strong></div>
          <div style="fontSize: 0.7rem; color: ${bus.status === 'speeding' ? '#dc2626' : '#16a34a'}; margin-top: 4px; font-weight: 700;">
            ${bus.statusText}
          </div>
        </div>
      `);

      marker.on('click', () => setSelectedBusId(bus.id));
      markersRef.current[bus.id] = marker;
    });

    // Draw real OSRM highway polyline for selected bus
    const selectedBus = buses.find(b => b.id === selectedBusId);
    const activeRoutePath = osrmPaths[selectedBusId] || selectedBus?.waypoints.map(w => [w.lat, w.lng]);

    if (activeRoutePath && activeRoutePath.length > 0) {
      polylineRef.current = L.polyline(activeRoutePath, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      map.setView([selectedBus.lat, selectedBus.lng], 9, { animate: true });
    }
  }, [mapLoaded, buses, selectedBusId, osrmPaths]);

  // Live GPS Movement Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setBuses(prevBuses =>
        prevBuses.map(bus => {
          if (bus.speed === 0) return bus;

          const deltaLat = (Math.random() - 0.3) * 0.002;
          const deltaLng = (Math.random() - 0.2) * 0.002;

          const newLat = bus.lat + deltaLat;
          const newLng = bus.lng + deltaLng;
          const newProgress = Math.min(99, bus.progressPct + 0.1);

          return {
            ...bus,
            lat: newLat,
            lng: newLng,
            progressPct: Number(newProgress.toFixed(1))
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredBuses = buses.filter(b => {
    const matchSearch = b.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'all') return matchSearch;
    return matchSearch && b.status === filterStatus;
  });

  const selectedBus = buses.find(b => b.id === selectedBusId) || buses[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Page Title & Quick Summary Bar */}
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
              Định Vị Giám Sát Lộ Trình &amp; GPS Đội Xe
            </h1>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
              Real-time GPS Tracking
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
            Giám sát trực tiếp vị trí địa lý, vận tốc, lộ trình uốn lượn theo đường Quốc lộ và cảnh báo an toàn thời gian thực
          </p>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase' }}>XE ĐANG CHẠY</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e40af' }}>{buses.filter(b => b.speed > 0).length} phương tiện</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: '700', textTransform: 'uppercase' }}>CẢNH BÁO TỐC ĐỘ</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#991b1b' }}>{buses.filter(b => b.status === 'speeding').length} sự cố</div>
          </div>
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#a16207', fontWeight: '700', textTransform: 'uppercase' }}>ĐANG DỪNG NGHỈ</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#854d0e' }}>{buses.filter(b => b.speed === 0).length} xe</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Map (70%) + Fleet Controls (30%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', minHeight: '600px' }}>
        
        {/* Left Interactive OpenStreetMap Container */}
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
          {/* Map Status Top Header */}
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
              Bản đồ GPS Quốc Lộ Thực Tế: <span style={{ color: '#2563eb' }}>{selectedBus.routeName}</span> ({selectedBus.plateNumber})
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Tọa độ live: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedBus.lat.toFixed(4)}° N, {selectedBus.lng.toFixed(4)}° E</strong>
            </div>
          </div>

          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} style={{ width: '100%', flex: 1, minHeight: '520px', background: '#e2e8f0' }}>
            {!mapLoaded && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontWeight: '600' }}>
                Đang nạp dữ liệu Bản đồ Vệ tinh GPS...
              </div>
            )}
          </div>

          {/* Selected Bus Live Telemetry Overlay Footer */}
          {selectedBus && (
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
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>XE &amp; LOẠI XE</div>
                <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{selectedBus.plateNumber}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{selectedBus.busType}</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>TÀI XẾ ĐIỀU KHIỂN</div>
                <div style={{ fontWeight: '700', color: '#2563eb', marginTop: '2px' }}>{selectedBus.driverName}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>📞 {selectedBus.driverPhone}</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>TỐC ĐỘ THỰC TẾ</div>
                <div style={{
                  fontWeight: '800',
                  color: selectedBus.speed > selectedBus.speedLimit ? '#dc2626' : selectedBus.speed === 0 ? '#d97706' : '#16a34a',
                  marginTop: '2px',
                  fontSize: '0.95rem'
                }}>
                  {selectedBus.speed} km/h
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', marginLeft: '4px' }}>
                    (Tối đa {selectedBus.speedLimit} km/h)
                  </span>
                </div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>HOÀN THÀNH LỘ TRÌNH</div>
                <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{selectedBus.progressPct}% chặng đường</div>
                <div style={{ height: '4px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '2px', marginTop: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${selectedBus.progressPct}%`, backgroundColor: '#2563eb' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Fleet List & Search Controls */}
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
          {/* Search Input */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              TÌM XE / TÀI XẾ KHẢ DỤNG
            </label>
            <input
              type="text"
              placeholder="Nhập biển số xe (VD: 51B-016.16)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                marginTop: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filter Status Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tất cả xe' },
              { id: 'on_track', label: 'Đúng lộ trình' },
              { id: 'speeding', label: 'Quá tốc độ' },
              { id: 'stopped', label: 'Đang dừng' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setFilterStatus(pill.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: filterStatus === pill.id ? '#2563eb' : '#f1f5f9',
                  color: filterStatus === pill.id ? '#ffffff' : '#475569'
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Bus List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
            {filteredBuses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.78rem' }}>
                Không tìm thấy phương tiện nào phù hợp.
              </div>
            ) : (
              filteredBuses.map(bus => {
                const isSelected = bus.id === selectedBusId;
                const isSpeeding = bus.status === 'speeding';
                const isStopped = bus.status === 'stopped';

                return (
                  <div
                    key={bus.id}
                    onClick={() => setSelectedBusId(bus.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.82rem' }}>
                        🚌 {bus.plateNumber}
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        backgroundColor: isSpeeding ? '#fee2e2' : isStopped ? '#fef3c7' : '#dcfce7',
                        color: isSpeeding ? '#b91c1c' : isStopped ? '#b45309' : '#15803d'
                      }}>
                        {isSpeeding ? 'Cảnh báo 84km/h' : isStopped ? 'Đang dừng' : 'Đúng lộ trình'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '3px', fontWeight: '600' }}>
                      {bus.routeName}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.68rem', color: '#64748b' }}>
                      <span>Tài xế: <strong>{bus.driverName}</strong></span>
                      <span style={{ fontWeight: '700', color: '#2563eb' }}>{bus.progressPct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OpsTrackingPage;
