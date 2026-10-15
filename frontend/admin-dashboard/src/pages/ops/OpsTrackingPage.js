import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const OpsTrackingPage = () => {
  const { token } = useContext(AuthContext);
  const [allTrips, setAllTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date selector (default to current local date)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Trip for focused tracking
  const [selectedTripId, setSelectedTripId] = useState(null);
  
  // Map and OSRM state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [osrmPaths, setOsrmPaths] = useState({});
  const [fetchingOsrm, setFetchingOsrm] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // 1. Dynamically load Leaflet library if not already present
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

  // 2. Fetch real trips from database (with silent background polling)
  const fetchRealTrips = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/trips/ops/trips`, { headers });
      const data = await res.json();
      if (data.success && data.trips) {
        setAllTrips(data.trips);
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu chuyến xe:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTrips(false);
    // Real-time polling every 3.5s to listen to driver's GPS updates
    const interval = setInterval(() => {
      fetchRealTrips(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [token]);

  // 3. Filter trips for the selected date (Today by default)
  const tripsForDate = useMemo(() => {
    return allTrips.filter(t => {
      if (!t.departureTime) return false;
      const tripDateStr = new Date(t.departureTime).toLocaleDateString('en-CA');
      return tripDateStr === selectedDate;
    }).sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
  }, [allTrips, selectedDate]);

  // Filtered by search query
  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return tripsForDate;
    const q = searchQuery.toLowerCase();
    return tripsForDate.filter(t => {
      const plate = (t.busId?.plateNumber || '').toLowerCase();
      const rName = (t.routeId ? `${t.routeId.startPoint} ${t.routeId.endPoint}` : '').toLowerCase();
      const driver = (t.driver?.name || '').toLowerCase();
      return plate.includes(q) || rName.includes(q) || driver.includes(q);
    });
  }, [tripsForDate, searchQuery]);

  // Automatically select the first trip when list changes
  useEffect(() => {
    if (filteredTrips.length > 0) {
      if (!selectedTripId || !filteredTrips.some(t => t._id === selectedTripId)) {
        setSelectedTripId(filteredTrips[0]._id);
      }
    } else {
      setSelectedTripId(null);
    }
  }, [filteredTrips, selectedTripId]);

  // Active selected trip object
  const activeTrip = useMemo(() => {
    return allTrips.find(t => t._id === selectedTripId) || filteredTrips[0] || null;
  }, [allTrips, filteredTrips, selectedTripId]);

  // Normalized stops with GPS coordinates for active trip
  const activeStops = useMemo(() => {
    if (!activeTrip) return [];
    const pickups = (activeTrip.pickupPoints || []).map(p => ({ ...p, type: 'pickup' }));
    const dropoffs = (activeTrip.dropoffPoints || []).map(d => ({ ...d, type: 'dropoff' }));
    return [...pickups, ...dropoffs].filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
  }, [activeTrip]);

  // 4. Fetch OSRM real highway curve for active trip
  useEffect(() => {
    if (!activeTrip || activeStops.length < 2) return;
    const tripKey = activeTrip._id;
    if (osrmPaths[tripKey]) return; // Already cached

    const fetchOSRM = async () => {
      try {
        setFetchingOsrm(true);
        const waypointsStr = activeStops.map(s => `${s.lng},${s.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setOsrmPaths(prev => ({ ...prev, [tripKey]: coords }));
        } else {
          setOsrmPaths(prev => ({ ...prev, [tripKey]: activeStops.map(s => [s.lat, s.lng]) }));
        }
      } catch {
        setOsrmPaths(prev => ({ ...prev, [tripKey]: activeStops.map(s => [s.lat, s.lng]) }));
      } finally {
        setFetchingOsrm(false);
      }
    };

    fetchOSRM();
  }, [activeTrip, activeStops, osrmPaths]);

  // 5. Initialize & Render Map with Single Selected Trip Focus
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    // Create Map instance if not exists
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

    // Reset Layer Group
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    } else {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }
    const layerGroup = layerGroupRef.current;

    if (!activeTrip || activeStops.length === 0) {
      map.setView([10.8, 106.7], 7);
      return;
    }

    const latLngs = [];

    // --- Render Pickup & Dropoff Stops exactly as setup in Route Management ---
    activeStops.forEach((stop, idx) => {
      const isPickup = stop.type === 'pickup';
      const isFirst = idx === 0;
      const isLast = idx === activeStops.length - 1;
      const markerColor = isPickup ? '#10b981' : '#ef4444';
      const badgeText = isFirst ? 'Khởi hành (Đón)' : isLast ? 'Điểm đích (Trả)' : isPickup ? 'Điểm đón' : 'Điểm trả';

      const stopIcon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div style="
            background: ${markerColor};
            color: #ffffff;
            font-weight: 700;
            font-size: 0.68rem;
            padding: 3px 8px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <span>[${stop.time || (isPickup ? 'Đón' : 'Trả')}] ${stop.location}</span>
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(layerGroup);
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
          <div style="font-weight: 800; color: #0f172a; font-size: 0.88rem;">${stop.location}</div>
          <div style="font-size: 0.72rem; color: ${isPickup ? '#047857' : '#b91c1c'}; font-weight: 700; margin: 4px 0;">
            ${badgeText} (${stop.time || 'N/A'})
          </div>
          <div style="font-size: 0.74rem; color: #64748b; line-height: 1.35;">${stop.address || 'Đang cập nhật địa chỉ'}</div>
          <div style="font-size: 0.68rem; color: #2563eb; margin-top: 4px;">Tọa độ GPS: ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</div>
        </div>
      `);

      latLngs.push([stop.lat, stop.lng]);
    });

    // --- Render Highway Polyline connecting all stops ---
    const cachedPath = osrmPaths[activeTrip._id];
    const polylineCoords = (cachedPath && cachedPath.length > 1) ? cachedPath : latLngs;

    if (polylineCoords.length > 1) {
      L.polyline(polylineCoords, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);
    }

    // --- Render Vehicle GPS Position (Ready for real GPS device coordinates) ---
    // In real GPS mode, vehicle sits at real coordinates if available, or at first stop (origin)
    const busLat = activeTrip.liveGps?.lat || activeStops[0]?.lat;
    const busLng = activeTrip.liveGps?.lng || activeStops[0]?.lng;

    if (typeof busLat === 'number' && typeof busLng === 'number') {
      const busPlate = activeTrip.busId?.plateNumber || 'Xe khách';
      const busIcon = L.divIcon({
        className: 'custom-bus-pin',
        html: `
          <div style="
            background: #1e40af;
            color: #ffffff;
            font-weight: 800;
            font-size: 0.72rem;
            padding: 4px 10px;
            border-radius: 14px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: system-ui;
          ">
            <span>Xe ${busPlate}</span>
          </div>
        `,
        iconSize: [96, 28],
        iconAnchor: [48, 14]
      });

      const busMarker = L.marker([busLat, busLng], { icon: busIcon }).addTo(layerGroup);
      const isLive = activeTrip.liveGps?.lastUpdated && (Date.now() - new Date(activeTrip.liveGps.lastUpdated).getTime() < 30000);
      const speedVal = activeTrip.liveGps?.speed || 0;

      busMarker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; min-width: 180px;">
          <div style="font-weight: 800; font-size: 0.88rem; color: #1e40af;">Xe ${busPlate}</div>
          <div style="font-size: 0.75rem; color: #475569; margin-top: 4px;">
            Tuyến: <strong>${activeTrip.routeId?.startPoint} → ${activeTrip.routeId?.endPoint}</strong>
          </div>
          <div style="font-size: 0.75rem; color: #475569;">
            Tài xế: <strong>${activeTrip.driver?.name || 'Chưa phân công'}</strong>
          </div>
          <div style="font-size: 0.75rem; color: #0284c7; font-weight: 700; margin-top: 4px;">
            Vận tốc: <strong>${speedVal} km/h</strong>
          </div>
          <div style="font-size: 0.72rem; color: ${isLive ? '#16a34a' : '#64748b'}; font-weight: 700; margin-top: 2px;">
            ${isLive ? '• Đang phát GPS trực tiếp' : '• Tọa độ điểm dừng khởi hành'}
          </div>
        </div>
      `);
    }

    // Fit map bounds to view all stops of this trip
    if (latLngs.length > 0) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          mapInstanceRef.current.fitBounds(latLngs, { padding: [50, 50], maxZoom: 12 });
        }
      }, 150);
    }
  }, [mapLoaded, activeTrip, activeStops, osrmPaths]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* =========================================================================
          KHỐI 1 (TRÊN): HEADER & THẺ TỔNG QUAN (DASHBOARD STYLE)
          ========================================================================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Định Vị Giám Sát Lộ Trình Chuyến Xe
              </h1>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700', border: '1px solid #bbf7d0' }}>
                • Dữ liệu chuyến xe thực tế MongoDB
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', margin: '4px 0 0 0' }}>
              Giám sát chính xác từng chuyến xe, lộ trình quốc lộ và toàn bộ danh sách điểm đón/trả khách đã thiết lập
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={fetchRealTrips}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: '600', borderRadius: '8px' }}
            >
              Làm mới dữ liệu
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#f8fafc', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CHUYẾN XE HÔM NAY ({selectedDate})
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
              {tripsForDate.length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600', marginTop: '4px' }}>
              • Sẵn sàng xuất bến và giám sát
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              XE ĐANG CHỌN GIÁM SÁT
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1e40af', marginTop: '4px' }}>
              {activeTrip?.busId?.plateNumber || 'Chưa chọn xe'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
              {activeTrip?.busId?.type || 'Chưa gán loại xe'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LỘ TRÌNH ĐANG XEM
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeTrip?.routeId ? `${activeTrip.routeId.startPoint} → ${activeTrip.routeId.endPoint}` : 'Chưa chọn'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600', marginTop: '4px' }}>
              {activeStops.length} trạm dừng đón/trả cố định
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TRẠM ĐÓN &amp; TRẢ
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
              <span style={{ color: '#16a34a' }}>{activeTrip?.pickupPoints?.length || 0} Đón</span> / <span style={{ color: '#dc2626' }}>{activeTrip?.dropoffPoints?.length || 0} Trả</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
              • Ghim chính xác theo GPS thực tế
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KHỐI 2 (DƯỚI): BẢN ĐỒ LỘ TRÌNH 1 XE (BÊN TRÁI) + DANH SÁCH CHUYẾN XE (BÊN PHẢI)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', minHeight: '620px' }}>
        
        {/* --- CỘT TRÁI: BẢN ĐỒ LEAFLET CHỈ HIỂN THỊ 1 TUYẾN ĐƯỜNG CỦA 1 CHUYẾN XE --- */}
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
          {/* Header thanh trạng thái bản đồ */}
          <div style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ fontWeight: '800', color: '#0f172a' }}>
              Lộ trình chuyến: <span style={{ color: '#2563eb' }}>{activeTrip?.routeId ? `${activeTrip.routeId.startPoint} → ${activeTrip.routeId.endPoint}` : 'Chưa chọn'}</span>
              {activeTrip?.busId?.plateNumber && (
                <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '6px', background: '#e2e8f0', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {activeTrip.busId.plateNumber}
                </span>
              )}
            </div>

            {/* Chú thích màu điểm dừng */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.72rem', fontWeight: '600' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Điểm đón khách
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span> Điểm trả khách
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1d4ed8' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span> Vị trí xe
              </span>
            </div>
          </div>

          {/* Khung bản đồ Leaflet */}
          <div ref={mapContainerRef} style={{ width: '100%', flex: 1, minHeight: '520px', background: '#e2e8f0' }}>
            {!mapLoaded && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontWeight: '600' }}>
                Đang nạp dữ liệu Bản đồ Vệ tinh GPS...
              </div>
            )}
          </div>

          {/* Footer thông tin chuyến xe & trạm đang chọn */}
          {activeTrip && (
            <div style={{
              padding: '14px 20px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              fontSize: '0.8rem'
            }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>PHƯƠNG TIỆN</div>
                <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{activeTrip.busId?.plateNumber || 'Chưa gán xe'}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{activeTrip.busId?.type || 'N/A'}</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>TÀI XẾ PHỤ TRÁCH</div>
                <div style={{ fontWeight: '700', color: '#2563eb', marginTop: '2px' }}>{activeTrip.driver?.name || 'Chưa phân công'}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{activeTrip.driver?.phone || 'Chưa có SĐT'}</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>GIỜ CHẠY &amp; ĐẾN</div>
                <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {new Date(activeTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} → {new Date(activeTrip.arrivalTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600' }}>
                  Ngày: {new Date(activeTrip.departureTime).toLocaleDateString('vi-VN')}
                </div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>TRẠM ĐÓN / TRẢ DỌC TUYẾN</div>
                <div style={{ fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
                  {activeStops.length} trạm dừng
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Ghim chi tiết trên bản đồ
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- CỘT PHẢI: DANH SÁCH CÁC CHUYẾN XE HÔM NAY --- */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Bộ lọc ngày & Tìm kiếm */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                CHỌN NGÀY CHẠY:
              </label>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))}
                style={{
                  background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem',
                  fontWeight: '700', cursor: 'pointer', padding: 0
                }}
              >
                Hôm nay
              </button>
            </div>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              TÌM BIỂN SỐ / TUYẾN / TÀI XẾ:
            </label>
            <input
              type="text"
              placeholder="Nhập biển số (51B-016.16) hoặc tuyến..."
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

          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            DANH SÁCH CHUYẾN XE ({filteredTrips.length})
          </div>

          {/* Danh sách các chuyến xe trong ngày */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '460px', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem' }}>
                Đang tải danh sách chuyến xe...
              </div>
            ) : filteredTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem', background: '#f8fafc', borderRadius: '10px' }}>
                Không có chuyến xe nào chạy vào ngày {selectedDate}.
              </div>
            ) : (
              filteredTrips.map(trip => {
                const isSelected = trip._id === selectedTripId;
                const dep = new Date(trip.departureTime);
                const arr = new Date(trip.arrivalTime);
                const depTime = dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const arrTime = arr.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const stopsCount = (trip.pickupPoints?.length || 0) + (trip.dropoffPoints?.length || 0);

                return (
                  <div
                    key={trip._id}
                    onClick={() => setSelectedTripId(trip._id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '800', color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.85rem' }}>
                        Xe {trip.busId?.plateNumber || 'Chưa gán'}
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                        color: isSelected ? '#1d4ed8' : '#475569'
                      }}>
                        {depTime} → {arrTime}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#1e293b', marginTop: '4px', fontWeight: '700' }}>
                      {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.72rem', color: '#64748b' }}>
                      <span>Tài xế: <strong style={{ color: '#334155' }}>{trip.driver?.name || 'Chưa phân công'}</strong></span>
                      <span style={{ fontWeight: '600', color: '#2563eb' }}>{stopsCount} điểm đón/trả</span>
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
