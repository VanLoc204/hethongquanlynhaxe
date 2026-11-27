import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { driverGpsService } from '../../services/driverGpsService';
import { fetchFastHighwayRoute, checkOffRouteStatus, fetchDynamicReroute } from '../../utils/mapRoutingUtils';

const API_BASE = API_BASE_URL;

const OpsTrackingPage = () => {
  const { token } = useContext(AuthContext);
  const [allTrips, setAllTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date selector (default to current local date)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Trip for focused tracking
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCancelOverdueTrip = async (trip) => {
    const plate = trip.busId?.plateNumber || 'phương tiện';
    const route = trip.routeId ? `${trip.routeId.startPoint} - ${trip.routeId.endPoint}` : 'chuyến xe';
    const confirmMsg = `Bạn có chắc chắn muốn xác nhận HỦY chuyến xe "${route}" (Xe ${plate}) do đã quá giờ đến nơi mà chưa xuất bến?`;
    if (!window.confirm(confirmMsg)) return;

    // Cập nhật lạc quan (Optimistic Update) tức thì trong 0ms:
    setAllTrips(prev => prev.map(t => t._id === trip._id ? { ...t, status: 'cancelled' } : t));
    showToast('Đã hủy chuyến xe thành công.');

    try {
      const res = await fetch(`${API_BASE}/trips/${trip._id}/update-journey`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'cancel',
          reason: 'Quản lý vận tải xác nhận hủy chuyến do quá giờ đến nơi mà chưa xuất bến.'
        })
      });
      const data = await res.json();
      if (!data.success) {
        fetchRealTrips(true);
        alert(data.message || 'Không thể hủy chuyến xe.');
      } else {
        fetchRealTrips(true);
      }
    } catch {
      fetchRealTrips(true);
      alert('Lỗi kết nối khi cập nhật chuyến xe.');
    }
  };

  const handleCompleteOverdueTrip = async (trip) => {
    const plate = trip.busId?.plateNumber || 'phương tiện';
    const route = trip.routeId ? `${trip.routeId.startPoint} - ${trip.routeId.endPoint}` : 'chuyến xe';
    const confirmMsg = `Bạn có chắc chắn muốn xác nhận chuyến xe "${route}" (Xe ${plate}) ĐÃ HOÀN THÀNH ngoài thực tế?`;
    if (!window.confirm(confirmMsg)) return;

    // Cập nhật lạc quan (Optimistic Update) tức thì trong 0ms:
    setAllTrips(prev => prev.map(t => t._id === trip._id ? { ...t, journeyStatus: 'completed' } : t));
    showToast('Đã xác nhận chuyến xe hoàn thành.');

    try {
      const res = await fetch(`${API_BASE}/trips/${trip._id}/update-journey`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'complete',
          bypassTime: true,
          overrideByManager: true,
          desc: 'Quản lý vận tải xác nhận xe đã hoàn thành hành trình ngoài thực tế.'
        })
      });
      const data = await res.json();
      if (!data.success) {
        fetchRealTrips(true);
        alert(data.message || 'Không thể hoàn thành chuyến xe.');
      } else {
        fetchRealTrips(true);
      }
    } catch {
      fetchRealTrips(true);
      alert('Lỗi kết nối khi cập nhật chuyến xe.');
    }
  };

  // Map and OSRM state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [osrmPaths, setOsrmPaths] = useState({});
  const [fetchingOsrm, setFetchingOsrm] = useState(false);

  // Lắng nghe Driver GPS Service nội bộ (nếu tài xế đang bật GPS trên cùng hệ thống)
  const [localGpsState, setLocalGpsState] = useState(() => driverGpsService.getState());

  useEffect(() => {
    const unsub = driverGpsService.addListener((state) => {
      setLocalGpsState(state);
    });
    return () => unsub();
  }, []);

  // Refs for Map & Layers
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const stopsLayerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const reroutePolylineRef = useRef(null);
  const busMarkerRef = useRef(null);
  const lastFittedTripIdRef = useRef(null);
  const lastRenderedRouteTripIdRef = useRef(null);

  // Trạng thái phát hiện xe lệch đường & định tuyến lại (Realtime)
  const [offRouteInfo, setOffRouteInfo] = useState({ isOffRoute: false, distance: 0 });

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

  // 2. Fetch real trips from database (with date filter and silent background polling every 20s)
  const fetchRealTrips = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const dateParam = selectedDate ? `?date=${selectedDate}` : '';
      const res = await fetch(`${API_BASE}/trips/ops/trips${dateParam}`, { headers });
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
    // Real-time polling every 20s để cập nhật định vị GPS nhẹ nhàng không nghẽn server
    const interval = setInterval(() => {
      fetchRealTrips(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [token, selectedDate]);

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

  // Chuẩn bị danh sách tất cả các trạm dừng tuần tự của chuyến xe được chọn
  const activeStops = useMemo(() => {
    if (!activeTrip) return [];

    // Ưu tiên 1: Lấy danh sách trạm từ Tuyến đường gốc (Route) nếu có
    if (activeTrip.routeId && Array.isArray(activeTrip.routeId.stops) && activeTrip.routeId.stops.length > 0) {
      return activeTrip.routeId.stops
        .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number')
        .map((s, idx, arr) => ({
          ...s,
          name: s.name || s.location,
          location: s.name || s.location,
          type: idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : (s.type === 'both' ? 'pickup' : (s.type || 'pickup'))
        }));
    }

    // Ưu tiên 2: Khử trùng lặp giữa pickupPoints và dropoffPoints theo thứ tự địa lý
    const combined = [...(activeTrip.pickupPoints || []), ...(activeTrip.dropoffPoints || [])];
    const seen = new Set();
    const unique = [];
    for (const s of combined) {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
      const key = `${s.name || s.location || ''}_${s.lat.toFixed(4)}_${s.lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          ...s,
          name: s.name || s.location,
          location: s.name || s.location
        });
      }
    }
    return unique;
  }, [activeTrip]);

  // 4. TẢI ĐƯỜNG UỐN LƯỢN QUỐC LỘ THỰC TẾ (SIÊU TỐC VỚI SAMPLE WAYPOINTS & CACHE)
  useEffect(() => {
    if (!activeTrip || activeStops.length < 2) return;
    const tripKey = activeTrip._id;
    if (osrmPaths[tripKey]) return; // Đã lưu cache lộ trình

    let isMounted = true;
    const fetchOSRM = async () => {
      try {
        setFetchingOsrm(true);
        const coords = await fetchFastHighwayRoute(activeStops, tripKey);
        if (isMounted && coords && coords.length > 0) {
          setOsrmPaths(prev => ({ ...prev, [tripKey]: coords }));
        }
      } catch (err) {
        console.warn('Lỗi lấy tọa độ OSRM:', err);
      } finally {
        if (isMounted) setFetchingOsrm(false);
      }
    };

    fetchOSRM();
    return () => { isMounted = false; };
  }, [activeTrip, activeStops, osrmPaths]);

  // 5. Initialize Map once
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

      // Layer group cho các trạm dừng và đường lộ trình
      stopsLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, [mapLoaded]);

  // 6. Vẽ Trạm Dừng & Căn chỉnh khung nhìn (CHỈ khi đổi sang chuyến xe khác)
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapInstanceRef.current || !activeTrip) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const stopsLayer = stopsLayerRef.current;

    if (!stopsLayer) return;

    const tripId = activeTrip._id;
    const isNewTrip = lastRenderedRouteTripIdRef.current !== tripId;

    if (isNewTrip) {
      stopsLayer.clearLayers();
      routePolylineRef.current = null;
      if (reroutePolylineRef.current) {
        reroutePolylineRef.current.remove();
        reroutePolylineRef.current = null;
      }
      lastRenderedRouteTripIdRef.current = tripId;

      const latLngs = [];

      // Render Trạm đón & trả
      activeStops.forEach((stop, idx) => {
        const isPickup = stop.type === 'pickup' || stop.type === 'start';
        const isFirst = idx === 0;
        const isLast = idx === activeStops.length - 1;
        const markerColor = isFirst ? '#059669' : isLast ? '#dc2626' : (isPickup ? '#10b981' : '#f97316');
        const badgeText = isFirst ? 'Khởi hành (Đón)' : isLast ? 'Điểm đích (Trả)' : isPickup ? 'Điểm đón' : 'Điểm trả';
        const stationName = stop.name || stop.location || 'Trạm dừng';

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
              <span>[${stop.time || (isPickup ? 'Đón' : 'Trả')}] ${stationName}</span>
            </div>
          `,
          iconSize: [110, 24],
          iconAnchor: [55, 12]
        });

        const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(stopsLayer);
        marker.bindPopup(`
          <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
            <div style="font-weight: 800; color: #0f172a; font-size: 0.88rem;">${stationName}</div>
            <div style="font-size: 0.72rem; color: ${isPickup ? '#047857' : '#b91c1c'}; font-weight: 700; margin: 4px 0;">
              ${badgeText} (${stop.time || 'N/A'})
            </div>
            <div style="font-size: 0.74rem; color: #64748b; line-height: 1.35;">${stop.address || 'Đang cập nhật địa chỉ'}</div>
            <div style="font-size: 0.68rem; color: #2563eb; margin-top: 4px;">Tọa độ GPS: ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</div>
          </div>
        `);

        latLngs.push([stop.lat, stop.lng]);
      });

      // VẼ TỨC THÌ ĐƯỜNG NỐI TRẠM (0ms - Không bao giờ để bản đồ trắng trơn chờ OSRM)
      if (latLngs.length > 1) {
        routePolylineRef.current = L.polyline(latLngs, {
          color: '#2563eb',
          weight: 4.5,
          opacity: 0.75,
          dashArray: '4, 6'
        }).addTo(stopsLayer);
      }

      // Fit bounds 1 LẦN DUY NHẤT khi chọn chuyến mới
      if (latLngs.length > 0 && lastFittedTripIdRef.current !== tripId) {
        lastFittedTripIdRef.current = tripId;
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            mapInstanceRef.current.fitBounds(latLngs, { padding: [50, 50], maxZoom: 12 });
          }
        }, 120);
      }
    }
  }, [mapLoaded, activeTrip, activeStops]);

  // 7. CẬP NHẬT LỘ TRÌNH QUỐC LỘ THỰC TẾ (OSRM): LẬP TỨC THAY THẾ KHI CÓ DỮ LIỆU
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapInstanceRef.current || !activeTrip) return;
    const L = window.L;
    const stopsLayer = stopsLayerRef.current;
    if (!stopsLayer) return;

    const tripId = activeTrip._id;
    const cachedPath = osrmPaths[tripId];

    if (cachedPath && cachedPath.length > 1) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(cachedPath);
        routePolylineRef.current.setStyle({
          color: offRouteInfo.isOffRoute ? '#94a3b8' : '#2563eb',
          weight: offRouteInfo.isOffRoute ? 3.5 : 5.5,
          opacity: offRouteInfo.isOffRoute ? 0.45 : 0.88,
          dashArray: offRouteInfo.isOffRoute ? '6, 8' : null
        });
      } else {
        routePolylineRef.current = L.polyline(cachedPath, {
          color: offRouteInfo.isOffRoute ? '#94a3b8' : '#2563eb',
          weight: offRouteInfo.isOffRoute ? 3.5 : 5.5,
          opacity: offRouteInfo.isOffRoute ? 0.45 : 0.88,
          dashArray: offRouteInfo.isOffRoute ? '6, 8' : null,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(stopsLayer);
      }
    }
  }, [mapLoaded, activeTrip, osrmPaths, offRouteInfo.isOffRoute]);

  // 8. ĐỒNG BỘ GPS THỰC TẾ TỪ TÀI XẾ (MƯỢT MÀ, KHÔNG RESET ZOOM CỦA NGƯỜI DÙNG)
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapInstanceRef.current || !activeTrip) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // 1. Xác định trạng thái chuyến xe & Điểm đầu/cuối
    const isCompleted = activeTrip.journeyStatus === 'completed';
    const isScheduled = activeTrip.journeyStatus === 'scheduled';
    const lastStop = activeStops && activeStops.length > 0 ? activeStops[activeStops.length - 1] : null;
    const firstStop = activeStops && activeStops.length > 0 ? activeStops[0] : null;

    let busLat = activeTrip.liveGps?.lat;
    let busLng = activeTrip.liveGps?.lng;
    let busSpeed = activeTrip.liveGps?.speed || 0;
    let busHeading = activeTrip.liveGps?.heading || 0;
    let lastUpdated = activeTrip.liveGps?.lastUpdated;
    let isLiveDevice = false;

    if (isCompleted && lastStop) {
      // 1. Chuyến xe đã hoàn thành: biểu tượng xe BẮT BUỘC định vị tại điểm đích (Trạm trả cuối cùng)
      busLat = lastStop.lat;
      busLng = lastStop.lng;
      busSpeed = 0;
      busHeading = 0;
      isLiveDevice = false;
    } else if (typeof busLat === 'number' && typeof busLng === 'number') {
      // 2. Tọa độ thực tế từ CSDL Server (MongoDB & Redis) do từng thiết bị tài xế phát lên
      const diffMs = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : 999999;
      isLiveDevice = diffMs < 60000; // Tín hiệu trong vòng 60s xem như đang trực tiếp
    } else if (localGpsState.isTracking && localGpsState.trip?._id === activeTrip._id && localGpsState.currentCoord) {
      // 3. Dự phòng nếu vừa kích hoạt mô phỏng nội bộ trên chính trình duyệt này
      busLat = localGpsState.currentCoord.lat;
      busLng = localGpsState.currentCoord.lng;
      busSpeed = localGpsState.currentSpeed || 0;
      busHeading = localGpsState.currentHeading || 0;
      lastUpdated = new Date();
      isLiveDevice = true;
    } else {
      // 4. Chuyến xe chờ xuất phát: định vị tại điểm xuất phát (Trạm đón đầu tiên)
      busLat = firstStop?.lat;
      busLng = firstStop?.lng;
      busSpeed = 0;
      isLiveDevice = false;
    }

    if (typeof busLat !== 'number' || typeof busLng !== 'number') return;

    const busPlate = activeTrip.busId?.plateNumber || 'Xe khách';
    const popupHtml = `
      <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:4px;">
          <strong style="color: #1e40af; font-size: 0.9rem;">Xe ${busPlate}</strong>
          <span style="background:${isCompleted ? '#ecfdf5' : isLiveDevice ? '#ecfdf5' : '#f1f5f9'}; color:${isCompleted ? '#059669' : isLiveDevice ? '#059669' : '#64748b'}; font-size:0.62rem; font-weight:700; padding:1px 6px; border-radius:6px;">
            ${isCompleted ? '• Đã về bến đích' : isLiveDevice ? '• GPS Trực tiếp' : '• Tại bến chờ'}
          </span>
        </div>
        <div style="font-size: 0.74rem; color: #475569;">
          Tuyến: <strong>${activeTrip.routeId?.startPoint || ''} ➔ ${activeTrip.routeId?.endPoint || ''}</strong>
        </div>
        <div style="font-size: 0.74rem; color: #475569; margin-top:2px;">
          Tài xế: <strong style="color:#0f172a;">${activeTrip.driver?.name || 'Trần Minh Tâm'}</strong>
        </div>
        <div style="font-size: 0.68rem; color: #64748b; margin-top: 4px;">
          Tọa độ: ${busLat.toFixed(5)}, ${busLng.toFixed(5)}
        </div>
        ${lastUpdated ? `<div style="font-size: 0.65rem; color: #94a3b8; margin-top: 2px;">Cập nhật: ${new Date(lastUpdated).toLocaleTimeString('vi-VN')}</div>` : ''}
      </div>
    `;

    // Tạo Marker Xe với hiệu ứng Radar Pulse khi đang trực tiếp
    const busIcon = L.divIcon({
      className: 'custom-bus-pin',
      html: `
        <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
          ${isLiveDevice ? `
            <div style="
              position: absolute;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: rgba(37, 99, 235, 0.25);
              animation: busRadarWave 1.8s ease-out infinite;
            "></div>
          ` : ''}
          <div style="
            background: #1e40af;
            color: #ffffff;
            font-weight: 800;
            font-size: 0.72rem;
            padding: 4px 10px;
            border-radius: 14px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(30, 64, 175, 0.45);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
            font-family: system-ui, -apple-system, sans-serif;
            position: relative;
            z-index: 2;
          ">
            <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${isLiveDevice ? '#22c55e' : '#cbd5e1'};"></span>
            <span>Xe ${busPlate}</span>
          </div>
        </div>
      `,
      iconSize: [110, 30],
      iconAnchor: [55, 15]
    });

    // CẬP NHẬT MARKER XE: Di chuyển mượt mà, KHÔNG tạo lại, KHÔNG reset Zoom / Pan của người dùng
    if (busMarkerRef.current) {
      if (busMarkerRef.current._tripId === activeTrip._id) {
        busMarkerRef.current.setLatLng([busLat, busLng]);
        busMarkerRef.current.setIcon(busIcon);
        const popup = busMarkerRef.current.getPopup();
        if (popup) popup.setContent(popupHtml);
      } else {
        map.removeLayer(busMarkerRef.current);
        busMarkerRef.current = null;
      }
    }

    if (!busMarkerRef.current) {
      const newBusMarker = L.marker([busLat, busLng], { icon: busIcon }).addTo(map);
      newBusMarker._tripId = activeTrip._id;
      newBusMarker.bindPopup(popupHtml);
      busMarkerRef.current = newBusMarker;
    }

    // 2. KIỂM TRA LỆCH TUYẾN & TỰ ĐỘNG ĐỊNH TUYẾN LẠI (DYNAMIC RE-ROUTING REALTIME)
    const tripPath = osrmPaths[activeTrip._id] || activeStops.map(s => [s.lat, s.lng]);
    const offCheck = checkOffRouteStatus({ lat: busLat, lng: busLng }, tripPath, 180);
    const isDetour = Boolean(activeTrip.liveGps?.isOffRoute || (localGpsState.isTracking && localGpsState.trip?._id === activeTrip._id && localGpsState.isOffRoute) || offCheck.isOffRoute);
    const detourDist = activeTrip.liveGps?.offRouteDistance || localGpsState.offRouteDistance || offCheck.distance;

    if (isDetour && tripPath.length > 1) {
      setOffRouteInfo({ isOffRoute: true, distance: detourDist });

      // Làm mờ lộ trình chuẩn ban đầu thành nét đứt xám
      if (routePolylineRef.current) {
        routePolylineRef.current.setStyle({
          color: '#94a3b8',
          weight: 3.5,
          opacity: 0.45,
          dashArray: '6, 8'
        });
      }

      // Vẽ đường rẽ mới (Màu cam đậm nổi bật)
      const backendReroute = activeTrip.liveGps?.rerouteCoords || (localGpsState.isTracking && localGpsState.rerouteCoords);
      if (Array.isArray(backendReroute) && backendReroute.length > 1) {
        if (reroutePolylineRef.current) {
          reroutePolylineRef.current.setLatLngs(backendReroute);
        } else if (stopsLayerRef.current) {
          reroutePolylineRef.current = L.polyline(backendReroute, {
            color: '#ea580c',
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(stopsLayerRef.current);
        }
      } else {
        const remainingStops = activeStops.slice(1);
        fetchDynamicReroute({ lat: busLat, lng: busLng }, remainingStops).then(newCoords => {
          if (newCoords && newCoords.length > 1 && stopsLayerRef.current) {
            if (reroutePolylineRef.current) {
              reroutePolylineRef.current.setLatLngs(newCoords);
            } else {
              reroutePolylineRef.current = L.polyline(newCoords, {
                color: '#ea580c',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(stopsLayerRef.current);
            }
          }
        });
      }
    } else {
      setOffRouteInfo({ isOffRoute: false, distance: 0 });
      if (routePolylineRef.current) {
        routePolylineRef.current.setStyle({
          color: '#2563eb',
          weight: 5.5,
          opacity: 0.88,
          dashArray: null
        });
      }
      if (reroutePolylineRef.current) {
        reroutePolylineRef.current.remove();
        reroutePolylineRef.current = null;
      }
    }
  }, [mapLoaded, activeTrip, activeStops, localGpsState]);

  // Hành động người dùng: Căn chỉnh lại toàn lộ trình
  const handleFitRouteBounds = () => {
    if (!mapInstanceRef.current || activeStops.length === 0) return;
    const latLngs = activeStops.map(s => [s.lat, s.lng]);
    mapInstanceRef.current.fitBounds(latLngs, { padding: [50, 50], maxZoom: 13, animate: true });
  };

  // Hành động người dùng: Di chuyển camera đến đúng vị trí xe
  const handleCenterBus = () => {
    if (!mapInstanceRef.current || !activeTrip) return;
    const busLat = localGpsState.isTracking && localGpsState.trip?._id === activeTrip._id && localGpsState.currentCoord
      ? localGpsState.currentCoord.lat
      : (activeTrip.liveGps?.lat || activeStops[0]?.lat);

    const busLng = localGpsState.isTracking && localGpsState.trip?._id === activeTrip._id && localGpsState.currentCoord
      ? localGpsState.currentCoord.lng
      : (activeTrip.liveGps?.lng || activeStops[0]?.lng);

    if (typeof busLat === 'number' && typeof busLng === 'number') {
      mapInstanceRef.current.setView([busLat, busLng], 14, { animate: true });
      if (busMarkerRef.current) {
        busMarkerRef.current.openPopup();
      }
    }
  };

  // Helper tính huy hiệu trạng thái chuyến
  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_transit':
        return { text: 'Đang di chuyển', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' };
      case 'completed':
        return { text: 'Đã hoàn thành', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
      case 'cancelled':
        return { text: 'Đã hủy', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      case 'scheduled':
      default:
        return { text: 'Chờ xuất bến', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    }
  };

  // Kiểm tra trạng thái GPS trực tiếp của xe
  const isVehicleLive = Boolean(
    (localGpsState.isTracking && localGpsState.trip?._id === activeTrip?._id) ||
    (activeTrip?.liveGps?.lastUpdated && (Date.now() - new Date(activeTrip.liveGps.lastUpdated).getTime() < 60000)) ||
    (activeTrip?.liveGps && typeof activeTrip.liveGps.lat === 'number' && activeTrip.journeyStatus === 'in_transit')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', animation: 'fadeIn 0.3s ease' }}>
      <style>{`
        .ops-panel-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.15rem 1.35rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .ops-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .ops-main-layout {
          display: grid;
          grid-template-columns: 1fr 370px;
          gap: 0.85rem;
          min-height: 600px;
        }

        @media (max-width: 1024px) {
          .ops-main-layout {
            grid-template-columns: 1fr;
          }
          .ops-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .ops-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
          }
          .ops-panel-box {
            padding: 0.85rem;
          }
        }

        @keyframes pulseDot {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }

        @keyframes busRadarWave {
          0% { transform: scale(0.7); opacity: 0.8; }
          70% { transform: scale(1.6); opacity: 0.15; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      `}</style>

      {/* =========================================================================
          VÙNG 1: HEADER & 4 THẺ THỐNG KÊ NHANH
          ========================================================================= */}
      <div className="ops-panel-box" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Định Vị &amp; Giám Sát Lộ Trình Chuyến Xe
              </h1>
              <span style={{
                background: isVehicleLive ? '#ecfdf5' : '#f1f5f9',
                color: isVehicleLive ? '#059669' : '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: '700',
                border: `1px solid ${isVehicleLive ? '#a7f3d0' : '#cbd5e1'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isVehicleLive ? '#10b981' : '#94a3b8',
                  animation: isVehicleLive ? 'pulseDot 1.6s infinite' : 'none'
                }}></span>
                {isVehicleLive ? 'GPS Trực Tiếp Từ Tài Xế' : 'Chế độ Chờ Tín Hiệu'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Giám sát chính xác từng chuyến xe theo quốc lộ thực tế và đồng bộ vị trí GPS theo thời gian thực
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => fetchRealTrips(false)}
              disabled={loading}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                padding: '0.42rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>{loading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="ops-stat-grid">
          {/* Card 1: Chuyến xe hôm nay */}
          <div style={{ background: '#f8fafc', padding: '0.75rem 0.95rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CHUYẾN NGÀY ({selectedDate.split('-').reverse().slice(0, 2).join('/')})
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '2px', lineHeight: '1.2' }}>
              {tripsForDate.length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>
              Sẵn sàng xuất bến &amp; giám sát
            </div>
          </div>

          {/* Card 2: Xe đang chọn giám sát */}
          <div style={{ background: '#f8fafc', padding: '0.75rem 0.95rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              XE ĐANG THEO DÕI
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e40af', marginTop: '2px', lineHeight: '1.2' }}>
              {activeTrip?.busId?.plateNumber || 'Chưa chọn'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeTrip?.busId?.type || 'Xe khách'}
            </div>
          </div>

          {/* Card 3: Lộ trình đang xem */}
          <div style={{ background: '#f8fafc', padding: '0.75rem 0.95rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LỘ TRÌNH ĐANG XEM
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeTrip?.routeId ? `${activeTrip.routeId.startPoint} ➔ ${activeTrip.routeId.endPoint}` : 'Chưa chọn'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '700', marginTop: '2px' }}>
              {activeStops.length} trạm đón/trả cố định
            </div>
          </div>

          {/* Card 4: Trạm đón & trả */}
          <div style={{ background: '#f8fafc', padding: '0.75rem 0.95rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TRẠM ĐÓN &amp; TRẢ
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '2px', lineHeight: '1.2' }}>
              <span style={{ color: '#10b981' }}>{activeTrip?.pickupPoints?.length || 0} Đón</span> / <span style={{ color: '#ef4444' }}>{activeTrip?.dropoffPoints?.length || 0} Trả</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
              Lộ trình QL thực tế
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VÙNG 2: BẢN ĐỒ LỘ TRÌNH XE (TRÁI) & DANH SÁCH CHUYẾN XE (PHẢI)
          ========================================================================= */}
      <div className="ops-main-layout">
        
        {/* --- CỘT TRÁI: BẢN ĐỒ LEAFLET --- */}
        <div className="ops-panel-box" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* CẢNH BÁO XE LỆCH LỘ TRÌNH REALTIME */}
          {offRouteInfo.isOffRoute && (
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#fff7ed',
              borderBottom: '1.5px solid #fdba74',
              color: '#c2410c',
              fontSize: '0.78rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxShadow: '0 2px 4px rgba(234,88,12,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <span>
                  <strong>CẢNH BÁO XE LỆCH TUYẾN (+{offRouteInfo.distance}m):</strong> Xe đang rẽ hướng khác. Bản đồ đã tự động vẽ lại đường đi mới (nét liền màu cam), lộ trình quy chuẩn chuyển sang nét đứt mờ.
                </span>
              </div>
              <span style={{ backgroundColor: '#ffedd5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', color: '#9a3412', border: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                Đồng bộ Realtime
              </span>
            </div>
          )}

          {/* Header thanh trạng thái bản đồ */}
          <div style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Lộ trình:</span>
              <span style={{ color: '#1e40af' }}>{activeTrip?.routeId ? `${activeTrip.routeId.startPoint} ➔ ${activeTrip.routeId.endPoint}` : 'Chưa chọn'}</span>
              {activeTrip?.busId?.plateNumber && (
                <span style={{ padding: '2px 7px', borderRadius: '4px', background: '#e2e8f0', color: '#1e293b', fontSize: '0.72rem', fontWeight: '800' }}>
                  {activeTrip.busId.plateNumber}
                </span>
              )}
              {fetchingOsrm && (
                <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
                  (Đang vẽ lộ trình QL...)
                </span>
              )}
            </div>

            {/* Chú thích màu điểm dừng & đường lộ trình */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.7rem', fontWeight: '700', flexWrap: 'wrap' }}>
              {offRouteInfo.isOffRoute && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ea580c' }}>
                  <span style={{ width: '12px', height: '3px', backgroundColor: '#ea580c', borderRadius: '2px' }}></span> Hướng rẽ mới
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: offRouteInfo.isOffRoute ? '#94a3b8' : '#2563eb' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: offRouteInfo.isOffRoute ? '#94a3b8' : '#2563eb', borderRadius: '2px' }}></span> {offRouteInfo.isOffRoute ? 'Đường gốc (mờ)' : 'Lộ trình chuẩn'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Điểm đón
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span> Điểm trả
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1d4ed8' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span> Vị trí xe
              </span>
            </div>
          </div>

          {/* Wrapper bản đồ có nút nổi Floating Controls */}
          <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '480px' }}>
            {/* Map Container */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '480px', background: '#e2e8f0' }}>
              {!mapLoaded && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontWeight: '600', fontSize: '0.82rem' }}>
                  Đang nạp dữ liệu Bản đồ GPS...
                </div>
              )}
            </div>

            {/* Floating Quick Action Buttons on Map */}
            {activeTrip && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 1000,
                display: 'flex',
                gap: '6px'
              }}>
                <button
                  type="button"
                  onClick={handleFitRouteBounds}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    cursor: 'pointer'
                  }}
                  title="Căn chỉnh toàn bộ lộ trình chuyến xe"
                >
                  Toàn lộ trình
                </button>

                <button
                  type="button"
                  onClick={handleCenterBus}
                  style={{
                    backgroundColor: '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                    cursor: 'pointer'
                  }}
                  title="Di chuyển bản đồ đến vị trí xe"
                >
                  Đến vị trí xe
                </button>
              </div>
            )}
          </div>

          {/* Footer thông tin chuyến xe & trạm đang chọn */}
          {activeTrip && (
            <div style={{
              padding: '10px 16px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              fontSize: '0.78rem'
            }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>PHƯƠNG TIỆN</div>
                <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>{activeTrip.busId?.plateNumber || 'Chưa gán xe'}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{activeTrip.busId?.type || 'N/A'}</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>TÀI XẾ PHỤ TRÁCH</div>
                <div style={{ fontWeight: '700', color: '#2563eb', marginTop: '1px' }}>{activeTrip.driver?.name || 'Trần Minh Tâm'}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{activeTrip.driver?.phone || '0987654321'}</div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>GIỜ CHẠY &amp; ĐẾN</div>
                <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '1px' }}>
                  {new Date(activeTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} → {new Date(activeTrip.arrivalTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
                  Ngày: {new Date(activeTrip.departureTime).toLocaleDateString('vi-VN')}
                </div>
              </div>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>TRẠNG THÁI GPS</div>
                <div style={{ fontWeight: '800', color: isVehicleLive ? '#059669' : '#2563eb', marginTop: '1px' }}>
                  {isVehicleLive ? 'Đang phát trực tiếp' : 'Tại bến chờ xuất phát'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {activeStops.length} trạm đón/trả
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- CỘT PHẢI: DANH SÁCH CÁC CHUYẾN XE HÔM NAY --- */}
        <div className="ops-panel-box" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '620px',
          overflow: 'hidden'
        }}>
          {/* Bộ lọc ngày & Tìm kiếm */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                CHỌN NGÀY CHẠY:
              </label>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA'))}
                style={{
                  background: 'none', border: 'none', color: '#2563eb', fontSize: '0.7rem',
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
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.78rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              TÌM BIỂN SỐ / TUYẾN / TÀI XẾ:
            </label>
            <input
              type="text"
              placeholder="Nhập biển số (51B-016.16) hoặc tuyến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                marginTop: '3px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            DANH SÁCH CHUYẾN XE ({filteredTrips.length})
          </div>

          {/* Danh sách các chuyến xe trong ngày */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto',
            flex: 1,
            paddingRight: '3px'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem' }}>
                Đang tải danh sách chuyến xe...
              </div>
            ) : filteredTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                Không có chuyến xe nào vào ngày {selectedDate}.
              </div>
            ) : (
              filteredTrips.map(trip => {
                const isSelected = trip._id === selectedTripId;
                const dep = new Date(trip.departureTime);
                const arr = new Date(trip.arrivalTime);
                const depTime = dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const arrTime = arr.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const stopsCount = (trip.pickupPoints?.length || 0) + (trip.dropoffPoints?.length || 0);
                const statusBadge = getStatusBadge(trip.journeyStatus);
                const isOverdueScheduled = trip.journeyStatus === 'scheduled' && new Date(trip.arrivalTime) < new Date();

                return (
                  <div
                    key={trip._id}
                    onClick={() => setSelectedTripId(trip._id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      borderLeft: isSelected ? '4px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      boxShadow: isSelected ? '0 3px 8px rgba(37,99,235,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: '800', color: isSelected ? '#1e40af' : '#0f172a', fontSize: '0.82rem' }}>
                        Xe {trip.busId?.plateNumber || 'Chưa gán'}
                      </div>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`
                      }}>
                        {statusBadge.text}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: '#1e293b', marginTop: '3px', fontWeight: '700' }}>
                      {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>{depTime} → {arrTime}</span>
                      <span style={{ fontWeight: '600', color: '#2563eb' }}>{stopsCount} trạm</span>
                    </div>

                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                      Tài xế: <strong style={{ color: '#334155' }}>{trip.driver?.name || 'Trần Minh Tâm'}</strong>
                    </div>

                    {isOverdueScheduled && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px dashed #e2e8f0'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleCancelOverdueTrip(trip)}
                          style={{
                            flex: 1,
                            padding: '3px 0',
                            borderRadius: '5px',
                            border: '1px solid #fca5a5',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          Hủy chuyến
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCompleteOverdueTrip(trip)}
                          style={{
                            flex: 1,
                            padding: '3px 0',
                            borderRadius: '5px',
                            border: '1px solid #86efac',
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          Hoàn thành
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          fontWeight: '700',
          fontSize: '0.82rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default OpsTrackingPage;
