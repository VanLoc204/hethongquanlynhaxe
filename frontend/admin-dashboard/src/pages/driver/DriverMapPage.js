import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { driverGpsService } from '../../services/driverGpsService';

const API_BASE = 'http://localhost:8000/api/v1';

const DriverMapPage = () => {
  const { token, user } = useContext(AuthContext);

  // Lấy trạng thái GPS nền toàn cục (chạy ngầm xuyên suốt các tab)
  const initialGpsState = driverGpsService.getState();

  // Chuyến xe được gán cho tài xế
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  // Trạng thái GPS & Truyền dữ liệu
  const [isTracking, setIsTracking] = useState(initialGpsState.isTracking);
  const [trackingMode, setTrackingMode] = useState(initialGpsState.trackingMode || 'simulation');
  const [currentCoord, setCurrentCoord] = useState(initialGpsState.currentCoord);
  const [currentSpeed, setCurrentSpeed] = useState(initialGpsState.currentSpeed || 0);
  const [currentHeading, setCurrentHeading] = useState(initialGpsState.currentHeading || 0);
  const [isFollowMode, setIsFollowMode] = useState(true); // Tự động bám theo xe (Re-center / Follow Mode)
  const [isHeadingUp, setIsHeadingUp] = useState(false); // Chế độ xoay bản đồ theo hướng xe chạy (Heading-Up / North-Up)
  const [lastPingTime, setLastPingTime] = useState(initialGpsState.lastPingTime);
  const [pingStatus, setPingStatus] = useState(initialGpsState.pingStatus || 'Sẵn sàng');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [showStopsList, setShowStopsList] = useState(false);

  // Bản đồ & Tuyến đường OSRM
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [simIndex, setSimIndex] = useState(initialGpsState.simIndex || 0);

  // Chế độ Toàn màn hình (Web Fullscreen)
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapContainerRef = useRef(null);
  const mapViewportRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const layerGroupRef = useRef(null);
  const wakeLockRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const simTimerRef = useRef(null);

  // Kích thước hình vuông bao phủ đường chéo viewport (đảm bảo khi xoay ở bất kỳ góc nào cũng không bao giờ bị hở viền đen 2 bên)
  const [mapSquareSize, setMapSquareSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.ceil(Math.hypot(window.innerWidth, window.innerHeight)) + 200;
    }
    return 1800;
  });

  // Tự động đo đạc đường chéo khung nhìn bản đồ qua ResizeObserver
  useEffect(() => {
    if (!mapViewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const diag = Math.ceil(Math.hypot(width, height)) + 200;
          setMapSquareSize(prev => Math.abs(prev - diag) > 10 ? diag : prev);
        }
      }
    });
    observer.observe(mapViewportRef.current);
    return () => observer.disconnect();
  }, []);

  // Tính góc phương vị (bearing 0-360 độ) giữa 2 tọa độ GPS
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => ((rad * 180) / Math.PI + 360) % 360;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaLon = toRad(lon2 - lon1);
    const y = Math.sin(deltaLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
    const brng = Math.round(toDeg(Math.atan2(y, x)));
    return isNaN(brng) ? 0 : brng;
  };

  // Định vị lại tâm bản đồ về vị trí xe hiện tại và bật lại chế độ bám theo xe
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !currentCoord) return;
    setIsFollowMode(true);
    mapInstanceRef.current.flyTo([currentCoord.lat, currentCoord.lng], 15, {
      animate: true,
      duration: 0.8
    });
  };

  // Đặt lại hành trình / Restart xe về điểm xuất phát ban đầu khi lỡ di chuyển
  const handleRestartJourney = () => {
    const coords = routeCoordinates.length > 0
      ? routeCoordinates
      : allStops.map(s => [s.lat, s.lng]);

    if (coords.length === 0) return;

    const startLat = coords[0][0];
    const startLng = coords[0][1];
    const nextLat = coords[1]?.[0] || startLat;
    const nextLng = coords[1]?.[1] || startLng;
    const heading = calculateBearing(startLat, startLng, nextLat, nextLng);

    // Kích hoạt restart trong background service GPS (an toàn kể cả khi Webpack HMR)
    if (driverGpsService && typeof driverGpsService.restartSimulation === 'function') {
      driverGpsService.restartSimulation(coords);
    } else if (driverGpsService) {
      driverGpsService.simIndex = 0;
      driverGpsService.currentSpeed = 0;
      driverGpsService.currentCoord = { lat: startLat, lng: startLng };
      driverGpsService.currentHeading = heading;
      if (typeof driverGpsService.sendGpsToBackend === 'function') {
        driverGpsService.sendGpsToBackend(startLat, startLng, 0, heading);
      }
      if (typeof driverGpsService.notify === 'function') {
        driverGpsService.notify();
      }
    }

    // Cập nhật vị trí hiển thị cục bộ ngay tức thì
    setCurrentCoord({ lat: startLat, lng: startLng });
    setCurrentHeading(heading);
    setCurrentSpeed(0);
    setSimIndex(0);
    setIsFollowMode(true);

    // Gửi cập nhật trực tiếp lên backend để đồng bộ tức thời với phía khách hàng
    sendGpsToBackend(startLat, startLng, 0, heading);

    // Di chuyển camera bản đồ bay về điểm xuất phát ban đầu
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([startLat, startLng], 15, {
        animate: true,
        duration: 0.8
      });
    }
  };

  // Chuyển đổi giữa chế độ Xoay theo hướng xe (Heading-Up) và Cố định hướng Bắc (North-Up)
  const toggleHeadingUp = () => {
    setIsHeadingUp(prev => !prev);
  };

  // Phóng to & Thu nhỏ bản đồ
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Chuyển đổi Toàn màn hình buồng lái
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreen(false);
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // 1. Tải thư viện Leaflet nếu chưa có
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

  // 2. Lấy dữ liệu chuyến xe của tài xế (CHỈ LỌC CHUYẾN XE HÔM NAY)
  useEffect(() => {
    const fetchDriverTrips = async () => {
      try {
        setLoadingTrip(true);
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        // 1. Thử lấy lịch phân công cá nhân của tài xế
        let tripsList = [];
        const myRes = await fetch(`${API_BASE}/users/my-schedule`, { headers });
        const myData = await myRes.json();
        if (myData.success && Array.isArray(myData.trips) && myData.trips.length > 0) {
          // LỌC CHÍNH XÁC: Chỉ lấy các chuyến xe có departureTime đúng vào ngày HÔM NAY
          tripsList = myData.trips.filter(t => {
            if (!t.departureTime) return false;
            return new Date(t.departureTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) === todayStr;
          });
        }

        // 2. Nếu my-schedule không tìm thấy chuyến hôm nay (hoặc tài xế mới phân công), lấy từ ops/trips
        if (tripsList.length === 0) {
          const allRes = await fetch(`${API_BASE}/trips/ops/trips`, { headers });
          const allData = await allRes.json();
          if (allData.success && Array.isArray(allData.trips)) {
            // Lọc các chuyến xe hôm nay của chính tài xế này trước
            const driverTodayTrips = allData.trips.filter(t => {
              if (!t.departureTime) return false;
              const isToday = new Date(t.departureTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) === todayStr;
              const matchesDriver = user?.name && t.driver?.name && t.driver.name.toLowerCase().includes(user.name.toLowerCase());
              return isToday && matchesDriver;
            });

            if (driverTodayTrips.length > 0) {
              tripsList = driverTodayTrips;
            } else {
              // Hoặc danh sách các chuyến hôm nay trong hệ thống
              tripsList = allData.trips.filter(t => {
                if (!t.departureTime) return false;
                return new Date(t.departureTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) === todayStr;
              });
            }
          }
        }

        // Sắp xếp các chuyến hôm nay theo giờ xuất bến
        tripsList.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

        setAssignedTrips(tripsList);
        if (tripsList.length > 0) {
          setSelectedTripId(tripsList[0]._id);
        } else {
          setSelectedTripId(null);
        }
      } catch (err) {
        console.error('Lỗi nạp chuyến xe tài xế:', err);
      } finally {
        setLoadingTrip(false);
      }
    };

    fetchDriverTrips();
  }, [token, user]);

  // Chuyến xe đang chọn
  const activeTrip = useMemo(() => {
    return assignedTrips.find(t => t._id === selectedTripId) || assignedTrips[0] || null;
  }, [assignedTrips, selectedTripId]);

  // Danh sách các điểm dừng (đón + trả)
  const allStops = useMemo(() => {
    if (!activeTrip) return [];
    const pickups = (activeTrip.pickupPoints || []).map(p => ({ ...p, type: 'pickup' }));
    const dropoffs = (activeTrip.dropoffPoints || []).map(d => ({ ...d, type: 'dropoff' }));
    return [...pickups, ...dropoffs].filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
  }, [activeTrip]);

  // 3. Tải đường uốn lượn OSRM kết nối các trạm dừng
  useEffect(() => {
    if (!activeTrip || allStops.length < 2) return;

    const fetchOSRM = async () => {
      try {
        const waypointsStr = allStops.map(s => `${s.lng},${s.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoordinates(coords);
          if (!currentCoord && coords.length > 0) {
            setCurrentCoord({ lat: coords[0][0], lng: coords[0][1] });
          }
        } else {
          const fallback = allStops.map(s => [s.lat, s.lng]);
          setRouteCoordinates(fallback);
          if (!currentCoord && fallback.length > 0) {
            setCurrentCoord({ lat: fallback[0][0], lng: fallback[0][1] });
          }
        }
      } catch {
        const fallback = allStops.map(s => [s.lat, s.lng]);
        setRouteCoordinates(fallback);
        if (!currentCoord && fallback.length > 0) {
          setCurrentCoord({ lat: fallback[0][0], lng: fallback[0][1] });
        }
      }
    };

    fetchOSRM();
  }, [activeTrip, allStops]);

  // 4. Khởi tạo Bản đồ Leaflet
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.8, 106.7],
        zoom: 9,
        zoomControl: false // Sử dụng bộ điều khiển nổi tùy chỉnh kiểu Google Maps
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Khi người dùng vuốt/kéo bản đồ thủ công, tạm ngắt tự động bám theo xe
      map.on('dragstart', () => {
        setIsFollowMode(false);
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Quản lý Layer group trạm dừng & lộ trình
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    } else {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }
    const layerGroup = layerGroupRef.current;

    if (allStops.length === 0) return;

    // Vẽ các điểm dừng
    allStops.forEach((stop, idx) => {
      const isPickup = stop.type === 'pickup';
      const markerColor = isPickup ? '#10b981' : '#ef4444';

      const stopIcon = L.divIcon({
        className: 'driver-station-pin',
        html: `
          <div style="
            background: ${markerColor};
            color: #ffffff;
            font-weight: 700;
            font-size: 0.65rem;
            padding: 3px 8px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            white-space: nowrap;
            font-family: system-ui;
          ">
            <span>[${stop.time || (isPickup ? 'Đón' : 'Trả')}] ${stop.location}</span>
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(layerGroup);
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <div style="font-weight: 800; font-size: 0.85rem;">${stop.location}</div>
          <div style="font-size: 0.72rem; color: ${isPickup ? '#047857' : '#b91c1c'}; font-weight: 700;">
            ${isPickup ? 'Điểm đón khách' : 'Điểm trả khách'} (${stop.time || 'N/A'})
          </div>
          <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">${stop.address || ''}</div>
        </div>
      `);
    });

    // Vẽ đường cong lộ trình OSRM
    if (routeCoordinates.length > 1) {
      if (polylineRef.current) polylineRef.current.remove();
      polylineRef.current = L.polyline(routeCoordinates, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Tự động căn chỉnh bản đồ vừa vặn lúc ban đầu
      map.fitBounds(routeCoordinates, { padding: [40, 40], maxZoom: 12 });
    }
  }, [mapLoaded, allStops, routeCoordinates]);

  // 5. Cập nhật Marker vị trí xe trên bản đồ với Mũi tên định vị xoay theo góc heading
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapInstanceRef.current || !currentCoord) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    const busPlate = activeTrip?.busId?.plateNumber || '51B-029.29';

    // Tạo biểu tượng xe có mũi tên định hướng xoay theo góc heading kiểu Google Maps Navigation
    const createBusIcon = (heading) => {
      return L.divIcon({
        className: 'pwa-driver-bus-nav-marker',
        html: `
          <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
            <!-- Sóng radar phát xung khi xe đang phát GPS -->
            ${isTracking ? `
              <div style="
                position: absolute;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(37, 99, 235, 0.3);
                animation: driverRadarPulse 2s infinite ease-out;
                pointer-events: none;
              "></div>
            ` : ''}

            <!-- Mũi tên định hướng xe xoay theo góc heading -->
            <div style="
              width: 38px;
              height: 38px;
              display: flex;
              align-items: center;
              justify-content: center;
              transform: rotate(${heading}deg);
              transition: transform 0.4s ease-out;
              filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
            ">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4.5 20.5L12 16.5L19.5 20.5L12 2Z" fill="#2563eb" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
                <circle cx="12" cy="13" r="2.5" fill="#ffffff" />
              </svg>
            </div>

            <!-- Nhãn biển số xe -->
            <div style="
              position: absolute;
              bottom: -16px;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: #ffffff;
              font-size: 0.62rem;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 6px;
              border: 1px solid #3b82f6;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              font-family: system-ui;
              pointer-events: none;
            ">
              Xe ${busPlate}
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
    };

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([currentCoord.lat, currentCoord.lng], {
        icon: createBusIcon(currentHeading),
        zIndexOffset: 1000
      }).addTo(map);
    } else {
      busMarkerRef.current.setLatLng([currentCoord.lat, currentCoord.lng]);
      busMarkerRef.current.setIcon(createBusIcon(currentHeading));
    }

    // Tự động xoay tâm bản đồ theo xe nếu đang ở chế độ follow
    if (isFollowMode) {
      map.panTo([currentCoord.lat, currentCoord.lng], { animate: true, duration: 0.8 });
    }
  }, [mapLoaded, currentCoord, currentHeading, isTracking, activeTrip, isFollowMode]);

  // Cập nhật lại kích thước bản đồ khi xoay, đổi chế độ hoặc thay đổi kích cỡ khung nhìn
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        if (currentCoord && isFollowMode) {
          mapInstanceRef.current.panTo([currentCoord.lat, currentCoord.lng], { animate: false });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, isHeadingUp, mapSquareSize]);

  // 6. Gửi tọa độ GPS lên Backend API
  const sendGpsToBackend = async (lat, lng, speed, heading) => {
    if (!activeTrip?._id) return;
    try {
      setPingStatus('Đang gửi vị trí...');
      const res = await fetch(`${API_BASE}/trips/${activeTrip._id}/live-gps`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          lat,
          lng,
          speed: Math.round(speed),
          heading: Math.round(heading),
          status: speed > 5 ? 'moving' : 'stopped'
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastPingTime(new Date().toLocaleTimeString('vi-VN'));
        setPingStatus('Đã kết nối máy chủ');
      } else {
        setPingStatus('Máy chủ cảnh báo');
      }
    } catch (err) {
      setPingStatus('Mất kết nối mạng');
      console.warn('Lỗi gửi GPS lên backend:', err);
    }
  };

  // 7. Bật / Tắt Screen Wake Lock API (Giữ màn hình không tắt khi đang lái)
  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        if (!wakeLockActive) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
        } else {
          if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
          }
          setWakeLockActive(false);
        }
      } catch (err) {
        console.warn('WakeLock error:', err);
      }
    }
  };

  // Lắng nghe trạng thái từ dịch vụ GPS chạy nền toàn cục (chạy ngầm xuyên suốt các tab)
  useEffect(() => {
    const unsubscribe = driverGpsService.addListener((state) => {
      setIsTracking(state.isTracking);
      if (state.trackingMode) setTrackingMode(state.trackingMode);
      if (state.currentCoord) setCurrentCoord(state.currentCoord);
      if (state.currentSpeed !== undefined) setCurrentSpeed(state.currentSpeed);
      if (state.currentHeading !== undefined) setCurrentHeading(state.currentHeading);
      if (state.lastPingTime) setLastPingTime(state.lastPingTime);
      if (state.pingStatus) setPingStatus(state.pingStatus);
      if (state.simIndex !== undefined) setSimIndex(state.simIndex);
    });
    return unsubscribe;
  }, []);

  // 8. Bật / Tắt Phát GPS (Tracking Core kết nối với background service)
  const toggleTracking = () => {
    if (isTracking) {
      driverGpsService.stopTracking();
    } else {
      setIsFollowMode(true);
      if (mapInstanceRef.current && currentCoord) {
        mapInstanceRef.current.flyTo([currentCoord.lat, currentCoord.lng], 15, { animate: true, duration: 0.8 });
      }

      // Cố gắng giữ sáng màn hình
      if ('wakeLock' in navigator && !wakeLockActive) {
        navigator.wakeLock.request('screen').then(lock => {
          wakeLockRef.current = lock;
          setWakeLockActive(true);
        }).catch(() => {});
      }

      driverGpsService.startTracking({
        trip: activeTrip,
        trackingMode,
        routeCoordinates,
        allStops,
        token
      });
    }
  };

  // Cleanup khi rời trang: GIỮ NGUYÊN GPS chạy ngầm xuyên suốt các tab (chỉ dọn wakeLock màn hình)
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      width: isFullscreen ? '100vw' : '100%',
      height: isFullscreen ? '100vh' : '100%',
      zIndex: isFullscreen ? 99999 : 1,
      overflow: 'hidden',
      backgroundColor: '#0d1527',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>

      {/* =========================================================================
          LỚP 1: BẢN ĐỒ LEAFLET TRÀN VIỀN 100% TOÀN BỘ KHUNG NHÌN (FULL VIEWPORT)
          Bản đồ mở rộng tối đa ra toàn bộ màn hình, xoay mượt mà quanh xe
          ========================================================================= */}
      <div ref={mapViewportRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* Lớp chứa bản đồ hình vuông bằng đường chéo màn hình: đảm bảo 100% không bao giờ hở góc ở bất kỳ góc xoay nào */}
        <div
          style={{
            position: 'absolute',
            width: `${mapSquareSize}px`,
            height: `${mapSquareSize}px`,
            left: '50%',
            top: '50%',
            transform: isHeadingUp
              ? `translate(-50%, -50%) rotate(${-currentHeading}deg)`
              : 'translate(-50%, -50%) rotate(0deg)',
            transformOrigin: 'center center',
            transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        >
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#1e293b' }}>
            {!mapLoaded && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                Đang khởi tạo bản đồ vệ tinh buồng lái...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          LỚP 2: THANH LỘ TRÌNH BUỒNG LÁI NỔI PHÍA TRÊN (FLOATING TOP HUD)
          Tự động co giãn thông minh trên cả điện thoại (Mobile) và máy tính (Desktop)
          ========================================================================= */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        right: '8px',
        zIndex: 500,
        pointerEvents: 'none'
      }}>
        <div style={{
          pointerEvents: 'auto',
          backgroundColor: 'rgba(13, 21, 39, 0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {/* Hàng 1: Tuyến đường, Biển số xe & Trạng thái phát GPS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.74rem',
                padding: '2px 7px',
                borderRadius: '5px',
                flexShrink: 0
              }}>
                Xe {activeTrip?.busId?.plateNumber || '51B-029.29'}
              </span>
              <span style={{
                fontSize: '0.86rem',
                fontWeight: '800',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {activeTrip?.routeId ? `${activeTrip.routeId.startPoint} ➔ ${activeTrip.routeId.endPoint}` : 'Đà Lạt ➔ Hồ Chí Minh'}
              </span>
            </div>

            {/* Trạng thái phát GPS */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: isTracking ? 'rgba(6, 78, 59, 0.9)' : 'rgba(30, 41, 59, 0.8)',
              color: isTracking ? '#34d399' : '#94a3b8',
              padding: '3px 8px',
              borderRadius: '10px',
              fontSize: '0.68rem',
              fontWeight: '700',
              border: `1px solid ${isTracking ? '#059669' : '#334155'}`,
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isTracking ? '#10b981' : '#64748b'
              }}></span>
              <span>{isTracking ? `Đang phát (${lastPingTime || 'Vừa xong'})` : 'Chưa phát GPS'}</span>
            </div>
          </div>

          {/* Hàng 2: Giờ xuất bến, Nút Xem trạm dừng, Dropdown Mode & Nút Toàn màn hình */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap'
          }}>
            {/* Nút Xem trạm dừng */}
            <button
              onClick={() => setShowStopsList(prev => !prev)}
              style={{
                backgroundColor: showStopsList ? '#2563eb' : 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <span>{showStopsList ? 'Đóng trạm' : `Trạm (${allStops.length})`}</span>
            </button>

            {/* Giờ xuất bến */}
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: '700', whiteSpace: 'nowrap' }}>
              Xuất bến: {activeTrip?.departureTime ? new Date(activeTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '16:00'}
            </span>

            {/* Chọn chế độ test / GPS thật */}
            <select
              value={trackingMode}
              onChange={(e) => {
                const nextMode = e.target.value;
                setTrackingMode(nextMode);
                driverGpsService.setTrackingMode(nextMode);
              }}
              disabled={isTracking}
              style={{
                flex: 1,
                minWidth: '110px',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                padding: '5px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '600',
                cursor: isTracking ? 'not-allowed' : 'pointer',
                outline: 'none'
              }}
            >
              <option value="simulation">Mô phỏng (Dọc tuyến)</option>
              <option value="real">GPS Thiết Bị Thật</option>
            </select>

            {/* Nút Toàn màn hình */}
            <button
              onClick={toggleFullscreen}
              style={{
                backgroundColor: isFullscreen ? '#dc2626' : 'rgba(37, 99, 235, 0.9)',
                color: '#ffffff',
                border: 'none',
                padding: '5px 9px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            </button>
          </div>
        </div>

        {/* Panel danh sách trạm dừng trượt ra (ngay dưới thanh top bar) */}
        {showStopsList && (
          <div style={{
            pointerEvents: 'auto',
            marginTop: '6px',
            maxHeight: '280px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            overflowY: 'auto',
            padding: '10px',
            border: '1px solid #cbd5e1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontWeight: '800', fontSize: '0.78rem', color: '#0f172a' }}>
                Lộ trình trạm dừng ({allStops.length})
              </div>
              <button
                onClick={() => setShowStopsList(false)}
                style={{ background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', color: '#64748b', fontWeight: '700' }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {allStops.map((s, idx) => (
                <div key={idx} style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  backgroundColor: s.type === 'pickup' ? '#f0fdf4' : '#fef2f2',
                  borderLeft: `3px solid ${s.type === 'pickup' ? '#10b981' : '#ef4444'}`,
                  fontSize: '0.7rem'
                }}>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>
                    [{s.time || 'N/A'}] {s.location}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '1px' }}>{s.address}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          LỚP 3: BỘ ĐIỀU KHIỂN ĐỊNH VỊ NỔI BÊN PHẢI (GOOGLE MAPS STYLE HUD)
          Đặt ở góc dưới bên phải, ngay phía trên bảng đồng hồ để thuận tầm tay ngón cái
          ========================================================================= */}
      <div style={{
        position: 'absolute',
        bottom: '150px',
        right: '10px',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* 1. Nút La Bàn: Kim đỏ luôn chỉ hướng Bắc thật */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={toggleHeadingUp}
            title={isHeadingUp ? "Đang xoay theo xe (Bấm để quay về hướng Bắc)" : "Đang cố định hướng Bắc (Bấm để xoay theo xe)"}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: isHeadingUp ? '2px solid #2563eb' : '1px solid #cbd5e1',
              boxShadow: isHeadingUp ? '0 0 0 3px rgba(37,99,235,0.25), 0 4px 12px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              padding: 0
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `rotate(${isHeadingUp ? -currentHeading : 0}deg)`,
              transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 15.5,12 12,9.5 8.5,12" fill="#ef4444" />
                <polygon points="12,22 15.5,12 12,14.5 8.5,12" fill="#94a3b8" />
                <circle cx="12" cy="12" r="2.2" fill="#0f172a" />
              </svg>
            </div>
            <span style={{ position: 'absolute', top: '2px', fontSize: '0.5rem', fontWeight: '900', color: '#ef4444', lineHeight: 1 }}>
              N
            </span>
          </button>
          <span style={{
            backgroundColor: isHeadingUp ? '#2563eb' : '#0f172a',
            color: '#ffffff',
            fontSize: '0.58rem',
            fontWeight: '800',
            padding: '1px 5px',
            borderRadius: '5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap'
          }}>
            {isHeadingUp ? 'Theo xe' : 'Bắc'}
          </span>
        </div>

        {/* 2. Nút Định Vị Lại Và Bám Theo Xe */}
        <button
          onClick={handleRecenter}
          title={isFollowMode ? "Đang tự động bám theo xe" : "Bấm để quay về và bám theo vị trí xe"}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: isFollowMode ? '2px solid #2563eb' : '1px solid #cbd5e1',
            boxShadow: isFollowMode ? '0 0 0 3px rgba(37,99,235,0.25), 0 4px 12px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: 0
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isFollowMode ? '#2563eb' : '#64748b'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" fill={isFollowMode ? '#2563eb' : '#64748b'} />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
          </svg>
        </button>

        {/* 3. Nút Restart Về Bến Xuất Phát Ban Đầu */}
        <button
          onClick={handleRestartJourney}
          title="Restart: Đặt lại vị trí xe về điểm xuất phát ban đầu"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        {/* 3. Nút Phóng To / Thu Nhỏ */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden'
        }}>
          <button
            onClick={handleZoomIn}
            title="Phóng to"
            style={{
              width: '40px',
              height: '36px',
              border: 'none',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            title="Thu nhỏ"
            style={{
              width: '40px',
              height: '36px',
              border: 'none',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            −
          </button>
        </div>
      </div>

      {/* =========================================================================
          LỚP 4: BẢNG ĐIỀU KHIỂN & ĐỒNG HỒ NỔI PHÍA DƯỚI (FLOATING BOTTOM HUD ISLAND)
          Bảng phi thuyền kính mờ tích hợp Vận tốc, Trạng thái & Nút Bắt đầu
          ========================================================================= */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        right: '8px',
        zIndex: 500,
        pointerEvents: 'none'
      }}>
        <div style={{
          pointerEvents: 'auto',
          backgroundColor: 'rgba(13, 21, 39, 0.94)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Hàng 1: Đồng hồ Vận tốc + Cụm thông số trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Box Vận tốc buồng lái */}
            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              padding: '4px 10px',
              textAlign: 'center',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.52rem', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.5px' }}>
                  VẬN TỐC
                </div>
                <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: '700' }}>
                  km/h
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: '900', color: currentSpeed > 80 ? '#ef4444' : '#38bdf8', lineHeight: 1 }}>
                {Math.round(currentSpeed)}
              </div>
            </div>

            {/* Thông tin trạng thái & Telemetry chuyến xe */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.72rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>Trạng thái: <strong style={{ color: isTracking ? '#4ade80' : '#facc15' }}>{isTracking ? 'ĐANG CHẠY' : 'SẴN SÀNG'}</strong></span>
                <span style={{ color: '#475569' }}>•</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentCoord ? `${currentCoord.lat.toFixed(5)}, ${currentCoord.lng.toFixed(5)}` : 'Đang chờ GPS'}
                </span>
              </div>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>• Hướng: <strong style={{ color: '#38bdf8' }}>{Math.round(currentHeading)}°</strong></span>
                <span onClick={toggleWakeLock} style={{ cursor: 'pointer', color: wakeLockActive ? '#38bdf8' : '#94a3b8' }}>
                  • Giữ sáng: <strong style={{ color: wakeLockActive ? '#38bdf8' : '#cbd5e1' }}>{wakeLockActive ? 'BẬT' : 'TẮT'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Hàng 2: Nút BẬT / DỪNG PHÁT GPS + Nút RESTART HÀNH TRÌNH */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={toggleTracking}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isTracking ? '#dc2626' : '#2563eb',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: isTracking ? '0 4px 14px rgba(220,38,38,0.45)' : '0 4px 14px rgba(37,99,235,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>{isTracking ? 'DỪNG PHÁT GPS' : 'BẮT ĐẦU & PHÁT GPS'}</span>
            </button>

            {/* Nút Restart vị trí xe về điểm xuất phát ban đầu */}
            <button
              onClick={handleRestartJourney}
              title="Đặt lại vị trí xe về điểm xuất phát ban đầu"
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: '#334155',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Restart</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DriverMapPage;
