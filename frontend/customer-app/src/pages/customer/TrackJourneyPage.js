import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { fetchFastHighwayRoute, checkOffRouteStatus, fetchDynamicReroute } from '../../utils/mapRoutingUtils';
import {
  Map,
  Navigation,
  Compass,
  Truck,
  Phone,
  Clock,
  ArrowRight,
  RefreshCw,
  Maximize2,
  Crosshair,
  MapPin,
  ShieldCheck,
  Radio,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import './TrackJourneyPage.css';

const API_BASE = 'http://localhost:8000/api';

const TrackJourneyPage = () => {
  const { user, isAuthenticated, token } = useContext(AuthContext);

  // Danh sách các chuyến xe có thể theo dõi
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trạng thái tìm kiếm mã vé
  const [ticketSearchCode, setTicketSearchCode] = useState('');
  const [searchError, setSearchError] = useState('');

  // Map & OSRM Routing
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [osrmCoords, setOsrmCoords] = useState([]);
  const [fetchingOsrm, setFetchingOsrm] = useState(false);

  // Dữ liệu GPS tức thời của xe nhận từ tài xế qua Backend MongoDB
  const [liveGpsData, setLiveGpsData] = useState({
    lat: null,
    lng: null,
    speed: 0,
    heading: 0,
    lastUpdated: null,
    isLive: false,
    isOffRoute: false,
    offRouteDistance: 0,
    rerouteCoords: []
  });

  // Map References
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const reroutePolylineRef = useRef(null);
  const stationsLayerRef = useRef(null);
  const lastFittedTripIdRef = useRef(null);

  // 1. Tải thư viện Leaflet động từ CDN nếu chưa có
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
    document.body.appendChild(script);
  }, []);

  // 2. Lấy dữ liệu vé và chuyến xe từ Backend MongoDB
  const fetchTrips = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const fetchedTrips = [];

      // 2.1. Nếu đã đăng nhập, ưu tiên lấy các vé đã đặt của khách hàng
      if (isAuthenticated && user) {
        const userId = user.id || user._id;
        try {
          const res = await axios.get(`${API_BASE}/trips/my-bookings/${userId}`);
          if (res.data?.success && res.data.bookings?.length > 0) {
            const activeBookings = res.data.bookings.filter(b => b.status !== 'cancelled');
            for (const booking of activeBookings) {
              const tripId = booking.tripId?._id || booking.tripId || booking.trip;
              if (tripId) {
                try {
                  const tripRes = await axios.get(`${API_BASE}/trips/${tripId}`);
                  if (tripRes.data?.success && tripRes.data.trip) {
                    fetchedTrips.push({
                      ...tripRes.data.trip,
                      bookingCode: booking.bookingCode || `#${String(booking._id).slice(-6).toUpperCase()}`,
                      userSeats: booking.seats || []
                    });
                  }
                } catch (err) {
                  console.warn('Lỗi lấy chi tiết chuyến:', tripId, err);
                }
              }
            }
          }
        } catch (err) {
          console.warn('Lỗi lấy booking của khách hàng:', err);
        }
      }

      // 2.2. Nếu chưa có chuyến nào (hoặc khách chưa đặt vé), nạp danh sách chuyến đang chạy từ Ops để demo
      if (fetchedTrips.length === 0) {
        try {
          const opsRes = await axios.get(`${API_BASE}/trips/ops/trips`);
          if (opsRes.data?.success && opsRes.data.trips?.length > 0) {
            // Lấy các chuyến có đủ trạm dừng
            const validOpsTrips = opsRes.data.trips.filter(t => 
              (t.pickupPoints?.length > 0 || t.dropoffPoints?.length > 0)
            );
            fetchedTrips.push(...validOpsTrips.slice(0, 5));
          }
        } catch (err) {
          console.warn('Lỗi nạp chuyến mẫu từ Ops:', err);
        }
      }

      setActiveTrips(fetchedTrips);

      // Tự động chọn chuyến đầu tiên nếu chưa có chuyến được chọn
      if (fetchedTrips.length > 0) {
        setSelectedTrip(prev => {
          if (!prev) return fetchedTrips[0];
          const match = fetchedTrips.find(t => t._id === prev._id);
          return match || fetchedTrips[0];
        });
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu chuyến:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchTrips(true);
  }, [fetchTrips]);

  // Đồng bộ tức thời dữ liệu GPS khi chuyến xe được chọn
  useEffect(() => {
    if (!selectedTrip) return;
    if (selectedTrip.liveGps && typeof selectedTrip.liveGps.lat === 'number') {
      const diffMs = selectedTrip.liveGps.lastUpdated 
        ? Date.now() - new Date(selectedTrip.liveGps.lastUpdated).getTime() 
        : 999999;
      setLiveGpsData({
        lat: selectedTrip.liveGps.lat,
        lng: selectedTrip.liveGps.lng,
        speed: selectedTrip.liveGps.speed || 0,
        heading: selectedTrip.liveGps.heading || 0,
        isOffRoute: Boolean(selectedTrip.liveGps.isOffRoute),
        offRouteDistance: Number(selectedTrip.liveGps.offRouteDistance) || 0,
        rerouteCoords: Array.isArray(selectedTrip.liveGps.rerouteCoords) ? selectedTrip.liveGps.rerouteCoords : [],
        lastUpdated: selectedTrip.liveGps.lastUpdated,
        isLive: diffMs < 60000
      });
    }
  }, [selectedTrip?._id]);

  // 3. Polling ngầm mỗi 3 giây để đồng bộ GPS mới nhất từ thiết bị tài xế (MongoDB)
  useEffect(() => {
    if (!selectedTrip) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/trips/${selectedTrip._id}`);
        if (res.data?.success && res.data.trip) {
          const latestTrip = res.data.trip;
          setSelectedTrip(prev => ({
            ...prev,
            ...latestTrip
          }));

          // Đồng bộ Live GPS nếu có
          if (latestTrip.liveGps && typeof latestTrip.liveGps.lat === 'number') {
            const diffMs = latestTrip.liveGps.lastUpdated 
              ? Date.now() - new Date(latestTrip.liveGps.lastUpdated).getTime() 
              : 999999;
            setLiveGpsData({
              lat: latestTrip.liveGps.lat,
              lng: latestTrip.liveGps.lng,
              speed: latestTrip.liveGps.speed || 0,
              heading: latestTrip.liveGps.heading || 0,
              isOffRoute: Boolean(latestTrip.liveGps.isOffRoute),
              offRouteDistance: Number(latestTrip.liveGps.offRouteDistance) || 0,
              rerouteCoords: Array.isArray(latestTrip.liveGps.rerouteCoords) ? latestTrip.liveGps.rerouteCoords : [],
              lastUpdated: latestTrip.liveGps.lastUpdated,
              isLive: diffMs < 60000
            });
          }
        }
      } catch (err) {
        console.warn('Lỗi polling Live GPS:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTrip?._id]);

  // 4. Chuẩn hóa danh sách tất cả các trạm đón và trả có tọa độ GPS tuần tự
  const normalizedStops = useMemo(() => {
    if (!selectedTrip) return [];

    // Ưu tiên 1: Tuyến đường gốc (Route)
    if (selectedTrip.routeId && Array.isArray(selectedTrip.routeId.stops) && selectedTrip.routeId.stops.length > 0) {
      return selectedTrip.routeId.stops
        .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number')
        .map((s, idx, arr) => ({
          ...s,
          name: s.name || s.location,
          location: s.name || s.location,
          type: idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : (s.type === 'both' ? 'pickup' : (s.type || 'pickup')),
          badgeText: idx === 0 ? 'Điểm Khởi Hành' : idx === arr.length - 1 ? 'Điểm Đích (Kết Thúc)' : (s.type === 'both' || s.type === 'pickup' ? 'Trạm Đón' : 'Trạm Trả')
        }));
    }

    // Ưu tiên 2: Khử trùng lặp giữa pickupPoints và dropoffPoints
    const combined = [...(selectedTrip.pickupPoints || []), ...(selectedTrip.dropoffPoints || [])];
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
          location: s.name || s.location,
          badgeText: s.type === 'pickup' ? 'Trạm Đón' : 'Trạm Trả'
        });
      }
    }
    return unique;
  }, [selectedTrip]);

  // 5. Tải tuyến đường uốn lượn Quốc lộ thực tế (Siêu tốc với Cache & Sample)
  useEffect(() => {
    if (!selectedTrip || normalizedStops.length < 2) return;

    // Vẽ tức thì đường nối thẳng (0ms - không bao giờ để bản đồ trống)
    setOsrmCoords(normalizedStops.map(s => [s.lat, s.lng]));

    let isMounted = true;
    const fetchOSRM = async () => {
      try {
        setFetchingOsrm(true);
        const coords = await fetchFastHighwayRoute(normalizedStops, selectedTrip._id);
        if (isMounted && coords && coords.length > 0) {
          setOsrmCoords(coords);
        }
      } catch (err) {
        console.warn('Lỗi lấy OSRM hành khách:', err);
      } finally {
        if (isMounted) setFetchingOsrm(false);
      }
    };

    fetchOSRM();
    return () => { isMounted = false; };
  }, [selectedTrip, normalizedStops]);

  // 6. Khởi tạo và thiết lập Leaflet Map
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current || loading) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true
      }).setView([11.5, 107.5], 8);

      // Thêm tile layer bản đồ màu sáng sạch sẽ
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      // Đưa zoom control sang góc dưới bên phải
      window.L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      stationsLayerRef.current = window.L.layerGroup().addTo(map);
      setMapReady(true);

      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 150);
      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 400);
    }
  }, [mapLoaded, loading]);

  // 7. Vẽ các Marker Trạm dừng trên bản đồ
  useEffect(() => {
    if (!mapReady || !window.L || !mapInstanceRef.current || normalizedStops.length === 0) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const stationsLayer = stationsLayerRef.current;
    if (!stationsLayer) return;

    stationsLayer.clearLayers();

    const boundsLatLngs = [];

    normalizedStops.forEach((stop, idx) => {
      const isPickup = stop.type === 'pickup' || stop.type === 'start';
      const isFirst = idx === 0;
      const isLast = idx === normalizedStops.length - 1;
      const markerColor = isFirst ? '#059669' : isLast ? '#dc2626' : (isPickup ? '#10b981' : '#ea580c');
      const stationName = stop.name || stop.location || 'Trạm dừng';

      const stopIcon = L.divIcon({
        className: 'station-div-pin',
        html: `
          <div style="
            background: ${markerColor};
            color: #ffffff;
            font-weight: 800;
            font-size: 0.68rem;
            padding: 3px 8px;
            border-radius: 999px;
            border: 2px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: system-ui, sans-serif;
          ">
            <span>[${stop.time || (isPickup ? 'Đón' : 'Trả')}] ${stationName}</span>
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(stationsLayer);
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
          <div style="font-weight: 800; color: #0f172a; font-size: 0.9rem;">${stationName}</div>
          <div style="font-size: 0.72rem; color: ${isPickup ? '#047857' : '#c2410c'}; font-weight: 800; margin: 4px 0;">
            ${stop.badgeText} (${stop.time || 'N/A'})
          </div>
          <div style="font-size: 0.74rem; color: #64748b; line-height: 1.35;">${stop.address || 'Đang cập nhật địa chỉ'}</div>
          <div style="font-size: 0.68rem; color: #2563eb; margin-top: 4px;">Tọa độ GPS: ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</div>
        </div>
      `);

      boundsLatLngs.push([stop.lat, stop.lng]);
    });

    // Tự động fit bounds toàn bộ lộ trình khi đổi chuyến xe
    if (selectedTrip && lastFittedTripIdRef.current !== selectedTrip._id && boundsLatLngs.length > 0) {
      lastFittedTripIdRef.current = selectedTrip._id;
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          mapInstanceRef.current.fitBounds(boundsLatLngs, { padding: [50, 50], maxZoom: 12 });
        }
      }, 200);
    }
  }, [mapReady, normalizedStops, selectedTrip]);

  // 8. Vẽ đường quốc lộ cao tốc OSRM (Đồng bộ Realtime Lộ trình gốc mờ & Hướng rẽ mới)
  useEffect(() => {
    if (!mapReady || !window.L || !mapInstanceRef.current || osrmCoords.length < 2) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    const isDetour = Boolean(liveGpsData.isOffRoute);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(osrmCoords);
      polylineRef.current.setStyle({
        color: isDetour ? '#94a3b8' : '#2563eb',
        weight: isDetour ? 3.5 : 5.5,
        opacity: isDetour ? 0.45 : 0.88,
        dashArray: isDetour ? '6, 8' : null
      });
    } else {
      polylineRef.current = L.polyline(osrmCoords, {
        color: isDetour ? '#94a3b8' : '#2563eb',
        weight: isDetour ? 3.5 : 5.5,
        opacity: isDetour ? 0.45 : 0.88,
        dashArray: isDetour ? '6, 8' : null,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    // Vẽ hoặc cập nhật đường rẽ mới (Dynamic Re-routing)
    if (isDetour) {
      const coords = liveGpsData.rerouteCoords;
      if (Array.isArray(coords) && coords.length > 1) {
        if (reroutePolylineRef.current) {
          reroutePolylineRef.current.setLatLngs(coords);
        } else {
          reroutePolylineRef.current = L.polyline(coords, {
            color: '#ea580c',
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
        }
      } else if (typeof liveGpsData.lat === 'number' && typeof liveGpsData.lng === 'number') {
        const remainingStops = normalizedStops.slice(1);
        fetchDynamicReroute({ lat: liveGpsData.lat, lng: liveGpsData.lng }, remainingStops).then(newCoords => {
          if (newCoords && newCoords.length > 1) {
            if (reroutePolylineRef.current) {
              reroutePolylineRef.current.setLatLngs(newCoords);
            } else {
              reroutePolylineRef.current = L.polyline(newCoords, {
                color: '#ea580c',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);
            }
          }
        });
      }
    } else {
      if (reroutePolylineRef.current) {
        reroutePolylineRef.current.remove();
        reroutePolylineRef.current = null;
      }
    }
  }, [mapReady, osrmCoords, liveGpsData.isOffRoute, liveGpsData.rerouteCoords, liveGpsData.lat, liveGpsData.lng]);

  // 9. Cập nhật vị trí Marker Xe Khách (Live GPS Marker)
  useEffect(() => {
    if (!mapReady || !window.L || !mapInstanceRef.current || !selectedTrip) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Tọa độ xe: ưu tiên liveGpsData -> trạm xuất phát
    let currentLat = liveGpsData.lat;
    let currentLng = liveGpsData.lng;

    if (typeof currentLat !== 'number' || typeof currentLng !== 'number') {
      if (normalizedStops.length > 0) {
        currentLat = normalizedStops[0].lat;
        currentLng = normalizedStops[0].lng;
      } else {
        return;
      }
    }

    const isLive = liveGpsData.isLive;

    const popupHtml = `
      <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:4px;">
          <strong style="color: #1e40af; font-size: 0.92rem;">Xe ${busPlate}</strong>
          <span style="background:${isLive ? '#ecfdf5' : '#f1f5f9'}; color:${isLive ? '#059669' : '#64748b'}; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:6px;">
            ${isLive ? '• Đang phát GPS' : '• Tại bến chờ'}
          </span>
        </div>
        <div style="font-size: 0.74rem; color: #475569;">
          Tuyến: <strong>${selectedTrip.routeId?.startPoint || 'Đà Lạt'} ➔ ${selectedTrip.routeId?.endPoint || 'Hồ Chí Minh'}</strong>
        </div>
        <div style="font-size: 0.74rem; color: #475569; margin-top:2px;">
          Tài xế: <strong>${selectedTrip.driver?.name || 'Nguyễn Văn An'}</strong>
        </div>
        <div style="font-size: 0.76rem; color: #2563eb; font-weight: 800; margin-top: 4px;">
          Tốc độ: ${Math.round(liveGpsData.speed)} km/h
        </div>
        <div style="font-size: 0.68rem; color: #64748b; margin-top: 4px;">
          Tọa độ: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}
        </div>
      </div>
    `;

    // Cập nhật marker hiện tại để không giật lag và không reset góc zoom
    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([currentLat, currentLng]);
      const popup = busMarkerRef.current.getPopup();
      if (popup) popup.setContent(popupHtml);
      return;
    }

    // Tạo Marker Xe với icon 3D và Radar Pulse
    const busIcon = L.divIcon({
      className: 'custom-bus-pin',
      html: `
        <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
          ${isLive ? `<div class="bus-radar-pulse"></div>` : ''}
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            position: relative;
            z-index: 2;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    busMarkerRef.current = L.marker([currentLat, currentLng], { icon: busIcon }).addTo(map);
    busMarkerRef.current.bindPopup(popupHtml);
  }, [mapReady, selectedTrip, liveGpsData, normalizedStops]);

  // 10. Tính toán phần trăm tiến độ hành trình và trạm dừng hiện tại theo GPS thật của xe
  const journeyProgress = useMemo(() => {
    if (osrmCoords.length === 0 || !liveGpsData.lat) return 0;
    // Tìm điểm gần nhất trên tuyến đường OSRM theo tọa độ GPS của xe
    let closestIdx = 0;
    let minDistance = Infinity;
    osrmCoords.forEach((coord, idx) => {
      const d = Math.hypot(coord[0] - liveGpsData.lat, coord[1] - liveGpsData.lng);
      if (d < minDistance) {
        minDistance = d;
        closestIdx = idx;
      }
    });
    return Math.min(100, Math.floor((closestIdx / (osrmCoords.length - 1)) * 100));
  }, [osrmCoords, liveGpsData]);

  // Trạm kế tiếp và thời gian dự kiến
  const nextStop = useMemo(() => {
    if (normalizedStops.length === 0) return null;
    const progressThreshold = journeyProgress / 100;
    const estimatedStopIdx = Math.min(
      normalizedStops.length - 1,
      Math.floor(progressThreshold * normalizedStops.length)
    );
    return normalizedStops[estimatedStopIdx] || normalizedStops[0];
  }, [normalizedStops, journeyProgress]);

  // Xử lý Focus vị trí xe hoặc Fit toàn tuyến
  const handleCenterBus = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize();
    if (!liveGpsData.lat) {
      if (normalizedStops.length > 0) {
        mapInstanceRef.current.setView([normalizedStops[0].lat, normalizedStops[0].lng], 13, { animate: true });
      }
      return;
    }
    mapInstanceRef.current.setView([liveGpsData.lat, liveGpsData.lng], 13, { animate: true });
  };

  const handleFitRoute = () => {
    if (!mapInstanceRef.current || normalizedStops.length === 0) return;
    mapInstanceRef.current.invalidateSize();
    const bounds = normalizedStops.map(s => [s.lat, s.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
  };

  // Tra cứu vé theo mã
  const handleSearchTicket = async (e) => {
    e.preventDefault();
    if (!ticketSearchCode.trim()) return;
    setSearchError('');
    try {
      const code = ticketSearchCode.trim().toUpperCase();
      const res = await axios.get(`${API_BASE}/trips/ops/trips`);
      if (res.data?.success && res.data.trips?.length > 0) {
        // Tìm theo biển số hoặc ID
        const match = res.data.trips.find(t => 
          (t.busId?.plateNumber || '').toUpperCase().includes(code) ||
          t._id.toUpperCase().includes(code)
        );
        if (match) {
          setSelectedTrip(match);
          setTicketSearchCode('');
        } else {
          setSearchError(`Không tìm thấy chuyến xe khớp với "${ticketSearchCode}".`);
        }
      }
    } catch (err) {
      setSearchError('Lỗi khi tra cứu mã vé.');
    }
  };

  if (loading) {
    return (
      <div className="track-journey-container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Compass size={54} className="animate-spin" style={{ color: '#2563eb', marginBottom: '1.25rem', animationDuration: '3s' }} />
        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e3a8a' }}>Đang nạp dữ liệu định vị vệ tinh GPS...</h3>
        <p style={{ color: '#64748b', marginTop: '6px' }}>Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  const startPoint = selectedTrip?.routeId?.startPoint || 'Đà Lạt';
  const endPoint = selectedTrip?.routeId?.endPoint || 'Hồ Chí Minh';
  const busPlate = selectedTrip?.busId?.plateNumber || '51B-044.44';
  const driverName = selectedTrip?.driver?.name || 'Nguyễn Văn An';
  const driverPhone = selectedTrip?.driver?.phone || '0912999999';

  return (
    <div className="track-journey-container animate-fade-in">

      {/* 1. Header Banner & Live Status */}
      <section className="track-hero">
        <div className="track-hero-left">
          <div className="track-badge-live">
            <span className="pulse-dot"></span>
            <span>Hệ Thống GPS Vệ Tinh Trực Tuyến</span>
          </div>
          <h1 className="track-hero-title">
            <Radio size={28} style={{ color: '#2563eb' }} />
            Theo Dõi Hành Trình Xe Khách Thời Gian Thực
          </h1>
          <p className="track-hero-subtitle">
            Cung cấp tọa độ GPS, vận tốc di chuyển, vị trí thực tế trên bản đồ đường quốc lộ và thời gian dự kiến đến trạm.
          </p>
        </div>
      </section>

      {/* 2. HUD Telemetry Metrics Cards */}
      <section className="track-hud-grid">
        {/* Xe & Biển số */}
        <div className="hud-card">
          <div className="hud-icon-wrapper hud-icon-blue">
            <Truck size={24} />
          </div>
          <div className="hud-info">
            <span className="hud-label">Biển Số Xe Vận Hành</span>
            <div className="hud-value" style={{ color: '#1e3a8a' }}>{busPlate}</div>
            <div className="hud-subtext">
              <span>{selectedTrip?.busId?.type || 'Xe Giường Nằm 44 Chỗ'}</span>
            </div>
          </div>
        </div>

        {/* Vận tốc GPS */}
        <div className="hud-card">
          <div className="hud-icon-wrapper hud-icon-emerald">
            <Compass size={24} />
          </div>
          <div className="hud-info">
            <span className="hud-label">Vận Tốc GPS Tức Thời</span>
            <div className="hud-value" style={{ color: '#059669' }}>
              {Math.round(liveGpsData.speed)} <span style={{ fontSize: '0.85rem' }}>km/h</span>
            </div>
            <div className="hud-subtext">
              <span>{liveGpsData.speed > 5 ? 'Đang lăn bánh trên lộ trình' : 'Xe đang dừng đón/trả'}</span>
            </div>
          </div>
        </div>

        {/* Tài xế phụ trách */}
        <div className="hud-card">
          <div className="hud-icon-wrapper hud-icon-indigo">
            <Phone size={24} />
          </div>
          <div className="hud-info">
            <span className="hud-label">Tài Xế Phụ Trách</span>
            <div className="hud-value" style={{ fontSize: '1.15rem' }}>{driverName}</div>
            <div className="hud-subtext">
              <a 
                href={`tel:${driverPhone}`} 
                style={{ color: '#2563eb', fontWeight: '800', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Gọi nhanh: {driverPhone}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Trạm tiếp theo & Tiến độ */}
        <div className="hud-card">
          <div className="hud-icon-wrapper hud-icon-amber">
            <Clock size={24} />
          </div>
          <div className="hud-info">
            <span className="hud-label">Điểm Dừng Kế Tiếp</span>
            <div className="hud-value" style={{ fontSize: '1.1rem', color: '#c2410c' }}>
              {nextStop?.location || 'Trạm Trung Chuyển'}
            </div>
            <div className="hud-subtext">
              <span>Tiến độ: <strong>{journeyProgress}%</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Thước đo tiến độ hành trình (Journey Stepper) */}
      <section className="track-progress-card">
        <div className="track-progress-header">
          <div className="progress-header-left">
            <span className="route-pill-title">{startPoint} ➔ {endPoint}</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}>
              Khởi hành: {selectedTrip?.departureTime ? new Date(selectedTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '22:30'}
            </span>
          </div>
          <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#059669' }}>
            Đã hoàn thành {journeyProgress}% hành trình
          </div>
        </div>

        <div className="progress-track-wrapper">
          <div className="progress-fill-bar" style={{ width: `${journeyProgress}%` }}></div>
          <div className="progress-bus-runner" style={{ left: `${journeyProgress}%` }} title={`Vị trí xe: ${journeyProgress}%`}>
            <Truck size={18} />
          </div>
        </div>

        <div className="progress-markers-row">
          <div className="progress-station-point">
            <span style={{ color: '#059669' }}>● {startPoint}</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Điểm xuất phát</span>
          </div>
          <div className="progress-live-center-status">
            {liveGpsData.isLive ? '📡 GPS trực tiếp' : '📡 Chờ GPS xe'}
          </div>
          <div className="progress-station-point text-right">
            <span style={{ color: '#ea580c' }}>● {endPoint}</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Điểm đến</span>
          </div>
        </div>
      </section>

      {/* 4. Không gian làm việc chính: 2 Cột (Danh sách & Timeline bên trái, Bản đồ bên phải) */}
      <div className="track-workspace-grid">
        
        {/* Cột Trái: Chọn chuyến & Timeline trạm dừng */}
        <aside className="track-sidebar">
          
          {/* Card: Danh sách chuyến xe */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h3 className="sidebar-title">
                <MapPin size={17} style={{ color: '#2563eb' }} />
                <span>Chuyến Xe Của Bạn ({activeTrips.length})</span>
              </h3>
            </div>

            <div className="trip-selector-list">
              {activeTrips.map((trip, idx) => {
                const isCurrent = selectedTrip?._id === trip._id;
                const rFrom = trip.routeId?.startPoint || 'Đà Lạt';
                const rTo = trip.routeId?.endPoint || 'Hồ Chí Minh';
                const plate = trip.busId?.plateNumber || '51B-044.44';
                const depTime = trip.departureTime 
                  ? new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' +
                    new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : 'Hôm nay';

                return (
                  <div 
                    key={`${trip._id}-${idx}`} 
                    className={`trip-card-item ${isCurrent ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTrip(trip);
                    }}
                  >
                    <div className="trip-card-top">
                      <span className="trip-card-route">{rFrom} ➔ {rTo}</span>
                      <span className={`trip-status-tag ${trip.journeyStatus === 'in_transit' ? 'trip-status-in-transit' : 'trip-status-scheduled'}`}>
                        {trip.journeyStatus === 'in_transit' ? 'Đang chạy' : 'Sẵn sàng'}
                      </span>
                    </div>
                    <div className="trip-card-details">
                      <span>Biển số: <strong>{plate}</strong></span>
                      <span>Khởi hành: <strong>{depTime}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Timeline các trạm dừng đón/trả */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h3 className="sidebar-title">
                <Clock size={17} style={{ color: '#2563eb' }} />
                <span>Lộ Trình Các Trạm Dừng ({normalizedStops.length})</span>
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Chi tiết đón/trả</span>
            </div>

            <div className="timeline-scroll-container">
              <div className="timeline-track-line"></div>

              {normalizedStops.map((stop, idx) => {
                const isPassed = (idx / normalizedStops.length) * 100 < journeyProgress;
                const isCurrentStop = nextStop?.location === stop.location;

                return (
                  <div key={idx} className={`timeline-step-item ${isCurrentStop ? 'is-current' : ''}`}>
                    <div className={`timeline-step-dot ${isCurrentStop ? 'current' : isPassed ? 'passed' : 'future'}`}>
                      {isPassed && !isCurrentStop && <CheckCircle2 size={12} />}
                    </div>

                    <div className="timeline-content-box">
                      <div className="timeline-step-name">
                        <span>{stop.location}</span>
                        <span className="timeline-step-time">{stop.time}</span>
                      </div>
                      <div className="timeline-step-address">
                        {stop.address || 'Trạm chính An Bình Lines'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.66rem', color: stop.type === 'pickup' ? '#059669' : '#ea580c', fontWeight: '800' }}>
                          ● {stop.badgeText}
                        </span>
                        {isCurrentStop && (
                          <span className="badge-here-now">
                            Xe đang tiếp cận
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </aside>

        {/* Cột Phải: Bản đồ GPS trực tuyến */}
        <main className="track-map-wrapper">
          <div className="track-map-topbar">
            <div className="map-topbar-left">
              <h2 className="map-stage-title">
                <Map size={20} style={{ color: '#2563eb' }} />
                <span className="desktop-map-title">Bản Đồ GPS Lộ Trình Cao Tốc & Quốc Lộ Trực Tuyến</span>
                <span className="mobile-map-title">Bản Đồ GPS Lộ Trình Xe</span>
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: '#475569'
              }}>
                {fetchingOsrm ? 'Đang tải OSRM...' : 'OSRM Chuẩn Đường Cao Tốc'}
              </span>
            </div>
          </div>

          {/* THÔNG BÁO LỘ TRÌNH ĐIỀU CHỈNH REALTIME CHO HÀNH KHÁCH */}
          {liveGpsData.isOffRoute && (
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: '0.78rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>ℹ️</span>
                <span>Xe đang di chuyển theo lộ trình điều chỉnh để tránh ùn tắc / tối ưu thời gian đón trả (đường nét liền cam). Giờ xe đến vẫn được cập nhật liên tục.</span>
              </div>
              <span style={{ backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', color: '#1e40af', border: '1px solid #93c5fd', whiteSpace: 'nowrap' }}>
                Đồng bộ Realtime
              </span>
            </div>
          )}

          <div className="map-stage-container">
            {/* Div mount Leaflet Map */}
            <div 
              ref={mapContainerRef} 
              id="leaflet-track-map"
              style={{ width: '100%', height: '520px', minHeight: '420px', zIndex: 1 }}
            ></div>

            {/* Các nút điều khiển nhanh nổi trên bản đồ */}
            <div className="map-float-actions">
              <button 
                type="button" 
                className="btn-float-map" 
                onClick={handleCenterBus} 
                title="Tập trung vào vị trí xe"
              >
                <Crosshair size={18} />
              </button>
              <button 
                type="button" 
                className="btn-float-map" 
                onClick={handleFitRoute} 
                title="Bao quát toàn tuyến"
              >
                <Maximize2 size={18} />
              </button>
              <button 
                type="button" 
                className="btn-float-map" 
                onClick={() => fetchTrips(false)} 
                title="Cập nhật vị trí GPS ngay lập tức"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Chú giải bản đồ */}
          <div className="map-legends-bar">
            <div className="legend-item">
              <span className="legend-dot-pickup"></span>
              <span>Trạm đón ({normalizedStops.filter(s => s.type === 'pickup').length})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot-dropoff"></span>
              <span>Trạm trả ({normalizedStops.filter(s => s.type === 'dropoff').length})</span>
            </div>
            {liveGpsData.isOffRoute && (
              <div className="legend-item">
                <span style={{ width: '12px', height: '3px', backgroundColor: '#ea580c', borderRadius: '2px', display: 'inline-block' }}></span>
                <span>Hướng rẽ điều chỉnh mới</span>
              </div>
            )}
            <div className="legend-item">
              <span style={{ width: '12px', height: '3px', backgroundColor: liveGpsData.isOffRoute ? '#94a3b8' : '#2563eb', borderRadius: '2px', display: 'inline-block' }}></span>
              <span>{liveGpsData.isOffRoute ? 'Lộ trình gốc (mờ)' : 'Lộ trình chuẩn (OSRM)'}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot-bus"></span>
              <span>Xe Khách (Live GPS)</span>
            </div>
          </div>

        </main>

      </div>

    </div>
  );
};

export default TrackJourneyPage;
