import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { smartGeocode, getSmartSuggestions } from '../../utils/smartGeocoder';

const API_BASE = API_BASE_URL;

// Shared hook to safely load Leaflet CSS and JS on demand
const useLeaflet = () => {
  const [ready, setReady] = useState(!!window.L);

  useEffect(() => {
    if (window.L) {
      setReady(true);
      return;
    }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setReady(true);
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.L) {
          clearInterval(check);
          setReady(true);
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, []);

  return ready;
};

// Modal component for viewing route on Leaflet Map
const RouteMapModal = ({ route, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const mapReady = useLeaflet();

  useEffect(() => {
    if (!mapReady || !window.L || !mapContainerRef.current || !route) return;
    const L = window.L;

    // Clean up any existing map instance and layer group
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    layerGroupRef.current = null;

    const map = L.map(mapContainerRef.current, {
      center: [11.2, 107.2],
      zoom: 8,
      zoomControl: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    mapInstanceRef.current = map;

    // Always create a fresh layerGroup attached to the current map
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    // Filter valid stops with lat/lng
    const stopsWithCoords = (route.stops || []).filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');

    if (stopsWithCoords.length === 0) return;

    // Add markers for all stops
    const latLngs = [];
    stopsWithCoords.forEach((stop, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === stopsWithCoords.length - 1;
      const isPickup = isFirst || stop.type === 'start' || stop.type === 'pickup';
      const markerColor = isPickup ? '#10b981' : '#ef4444';
      const badgeText = isFirst ? 'Khởi hành (Đón)' : isLast ? 'Điểm đích (Trả)' : isPickup ? 'Điểm đón' : 'Điểm trả';

      const customIcon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div style="
            background: ${markerColor};
            color: #ffffff;
            font-weight: 800;
            font-size: 0.68rem;
            padding: 3px 8px;
            border-radius: 12px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: system-ui;
          ">
            <span>${stop.name}</span>
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: customIcon }).addTo(layerGroup);
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <strong style="color: #0f172a; font-size: 0.88rem;">${stop.name}</strong>
          <div style="font-size: 0.72rem; color: ${isPickup ? '#047857' : '#b91c1c'}; font-weight: 700; margin: 4px 0;">
            ${badgeText}
          </div>
          <div style="font-size: 0.75rem; color: #64748b; line-height: 1.35;">${stop.address || ''}</div>
          <div style="font-size: 0.7rem; color: #2563eb; margin-top: 4px;">Tọa độ GPS: ${stop.lat}, ${stop.lng}</div>
        </div>
      `);

      latLngs.push([stop.lat, stop.lng]);
    });

    const fitAll = () => {
      if (mapInstanceRef.current && latLngs.length > 0) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.fitBounds(latLngs, { padding: [50, 50], maxZoom: 13 });
      }
    };

    // First fit after layout settle
    const timer = setTimeout(fitAll, 200);

    // Draw real OSRM highway polyline
    const waypointsStr = stopsWithCoords.map(s => `${s.lng},${s.lat}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then(r => r.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const polyCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          const poly = L.polyline(polyCoords, {
            color: '#2563eb',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(layerGroup);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [50, 50] });
          }
        } else {
          L.polyline(latLngs, { color: '#2563eb', weight: 4, dashArray: '6, 8' }).addTo(layerGroup);
          fitAll();
        }
      })
      .catch(() => {
        L.polyline(latLngs, { color: '#2563eb', weight: 4, dashArray: '6, 8' }).addTo(layerGroup);
        fitAll();
      });

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      layerGroupRef.current = null;
    };
  }, [mapReady, route]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '920px',
        height: '82vh',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                Bản đồ lộ trình: {route.startPoint} ➔ {route.endPoint}
              </h3>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                {(route.stops || []).length} trạm ghim GPS
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Cự ly: <strong>{route.distance}</strong> • Thời gian chạy dự kiến: <strong>{route.duration}</strong> • Lộ trình giao thông thực tế OSRM
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Đóng bản đồ
          </button>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Footer Station Legend */}
        <div style={{
          padding: '10px 18px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: '700' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              Điểm đón khách (Xuất phát & dọc đường)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: '700' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
              Điểm trả khách (Dọc đường & Bến đích)
            </span>
          </div>
          <span style={{ color: '#64748b' }}>Nhấp vào ghim trạm trên bản đồ để xem địa chỉ</span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// AI SMART GEOCODING & NATIONWIDE LANDMARK RECOGNITION ENGINE
// =========================================================================
const geocodeQuery = async (queryText) => {
  return await smartGeocode(queryText);
};

const searchSmartLandmark = async (queryText) => {
  return await getSmartSuggestions(queryText);
};

// Modal for visually picking or searching GPS coordinates for a single stop
const StopMapPickerModal = ({ stop, stopIndex, onConfirm, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const mapReady = useLeaflet();

  const [currentCoords, setCurrentCoords] = useState({
    lat: typeof stop.lat === 'number' ? stop.lat : 10.741055,
    lng: typeof stop.lng === 'number' ? stop.lng : 106.618526
  });
  const [searchQuery, setSearchQuery] = useState(stop.address || stop.name || '');
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null);
  const [smartSuggestions, setSmartSuggestions] = useState([]);

  const selectLandmark = (item) => {
    setSearchQuery(item.name);
    setSmartSuggestions([]);
    setCurrentCoords({ lat: item.lat, lng: item.lng });
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 16);
      markerRef.current.setLatLng([item.lat, item.lng]);
      markerRef.current.bindPopup(`<strong>${item.name}</strong><br/>${item.displayName || item.address || ''}`).openPopup();
    }
    setSearchStatus({
      type: 'success',
      msg: `Đã chọn điểm chuẩn: ${item.name} (${item.displayName || item.address || item.city || ''})`
    });
  };

  useEffect(() => {
    if (!mapReady || !window.L || !mapContainerRef.current) return;
    const L = window.L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialLat = typeof stop.lat === 'number' ? stop.lat : 10.741055;
    const initialLng = typeof stop.lng === 'number' ? stop.lng : 106.618526;
    const initialZoom = typeof stop.lat === 'number' ? 16 : 14;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    marker.bindPopup(`<strong>${stop.name || 'Điểm đón/trả'}</strong><br/>Kéo ghim hoặc nhấp bản đồ để chọn vị trí`).openPopup();

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setCurrentCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
    });

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCurrentCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
      setSmartSuggestions([]);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // If initial query exists and no coords yet, auto-locate
    if (typeof stop.lat !== 'number' && searchQuery.trim()) {
      smartGeocode(searchQuery).then(result => {
        if (result && mapInstanceRef.current && markerRef.current) {
          setCurrentCoords({ lat: result.lat, lng: result.lng });
          mapInstanceRef.current.setView([result.lat, result.lng], 16);
          markerRef.current.setLatLng([result.lat, result.lng]);
          markerRef.current.bindPopup(`<strong>${result.name}</strong><br/>${result.displayName}`).openPopup();
          if (result.correctionMsg) {
            setSearchStatus({
              type: 'success',
              msg: `${result.correctionMsg} (Tọa độ: ${result.lat}, ${result.lng})`
            });
          } else {
            setSearchStatus({
              type: 'success',
              msg: `Đã định vị chính xác: ${result.displayName} (Tọa độ: ${result.lat}, ${result.lng})`
            });
          }
        }
      });
    }

    return () => {
      clearTimeout(timer);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapReady]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSmartSuggestions([]);
    setSearching(true);
    setSearchStatus(null);
    try {
      const result = await smartGeocode(searchQuery);
      if (result) {
        setCurrentCoords({ lat: result.lat, lng: result.lng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([result.lat, result.lng], 16);
          markerRef.current.setLatLng([result.lat, result.lng]);
          markerRef.current.bindPopup(`<strong>${result.name}</strong><br/>${result.displayName}`).openPopup();
        }
        if (result.correctionMsg) {
          setSearchStatus({
            type: 'success',
            msg: `${result.correctionMsg} (Tọa độ: ${result.lat}, ${result.lng})`
          });
        } else {
          setSearchStatus({
            type: 'success',
            msg: `Đã định vị chính xác: ${result.displayName} (Tọa độ: ${result.lat}, ${result.lng})`
          });
        }
      } else {
        setSearchStatus({
          type: 'error',
          msg: 'Không nhận diện được địa chỉ này trên bản đồ. Bạn có thể tự nhấp chuột lên bản đồ để chấm ghim!'
        });
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
      zIndex: 12000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '820px',
        height: 'min(640px, 86vh)',
        maxHeight: '88vh',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0,
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Ghim tọa độ GPS cho:</span>
              <span style={{ color: '#2563eb' }}>{stop.name || `Trạm ${stopIndex + 1}`}</span>
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Nhấp vào bất kỳ đâu trên bản đồ hoặc kéo ghim đến đúng vị trí cổng đón/trả
            </span>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: '700',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>

        {/* Search bar */}
        <div style={{
          flexShrink: 0,
          position: 'relative',
          padding: '10px 20px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập địa điểm đón/trả bất kỳ (VD: Cây xăng Cần Minh Phú Yên, Bến xe Miền Tây, Ga Tuy Hòa, Gò Vấp...)"
              style={{
                flex: 1,
                padding: '8px 14px',
                fontSize: '0.82rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={searching}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: searching ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              {searching ? 'Đang tìm...' : 'Tìm vị trí'}
            </button>
          </form>
        </div>

        {/* In-modal status banner */}
        {searchStatus && (
          <div style={{
            flexShrink: 0,
            padding: '7px 20px',
            fontSize: '0.76rem',
            fontWeight: '600',
            backgroundColor: searchStatus.type === 'error' ? '#fef2f2' : searchStatus.type === 'info' ? '#eff6ff' : '#ecfdf5',
            color: searchStatus.type === 'error' ? '#b91c1c' : searchStatus.type === 'info' ? '#1d4ed8' : '#047857',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>{searchStatus.msg}</span>
          </div>
        )}

        {/* Map */}
        <div style={{ flex: 1, minHeight: '220px', position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0,
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#64748b' }}>Tọa độ đã chọn:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
              {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                borderRadius: '8px',
                padding: '7px 16px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onConfirm(currentCoords.lat, currentCoords.lng)}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 20px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
              }}
            >
              Xác nhận tọa độ này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OpsRoutesPage = () => {
  const { token } = useContext(AuthContext);
  const [routes, setRoutes] = useState(() => (typeof window !== 'undefined' ? window.__cachedOpsRoutes || [] : []));
  const [loading, setLoading] = useState(() => !(typeof window !== 'undefined' && window.__cachedOpsRoutes?.length > 0));
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Map Modal Route state
  const [mapModalRoute, setMapModalRoute] = useState(null);

  // Filters & Sorting state
  const [filterStart, setFilterStart] = useState('all');
  const [filterEnd, setFilterEnd] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('default');

  // Accordion expanded route ID (to see stations directly inside table row)
  const [expandedRouteId, setExpandedRouteId] = useState(null);

  // Form states
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [stops, setStops] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRoutes = async (silent = false) => {
    if (!silent && routes.length === 0) {
      setLoading(true);
    }
    try {
      const res = await fetch(`${API_BASE}/trips/ops/routes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRoutes(data.routes || []);
        if (typeof window !== 'undefined') {
          window.__cachedOpsRoutes = data.routes || [];
        }
        if (data.routes && data.routes.length > 0 && !expandedRouteId) {
          setExpandedRouteId(data.routes[0]._id);
        }
      } else {
        showToast(data.message || 'Lỗi tải danh sách tuyến đường.', 'error');
      }
    } catch {
      showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoutes(routes.length > 0);
    }
  }, [token]);

  // Unique list of start & end points for filter dropdowns
  const uniqueStartPoints = useMemo(() => {
    return Array.from(new Set(routes.map(r => r.startPoint).filter(Boolean)));
  }, [routes]);

  const uniqueEndPoints = useMemo(() => {
    return Array.from(new Set(routes.map(r => r.endPoint).filter(Boolean)));
  }, [routes]);

  // Filtered and Sorted routes
  const filteredRoutes = useMemo(() => {
    let result = [...routes];

    if (filterStart !== 'all') {
      result = result.filter(r => r.startPoint === filterStart);
    }
    if (filterEnd !== 'all') {
      result = result.filter(r => r.endPoint === filterEnd);
    }
    if (filterStatus !== 'all') {
      result = result.filter(r => (r.status || 'approved') === filterStatus);
    }

    if (sortOrder === 'distance-asc') {
      result.sort((a, b) => parseInt(a.distance || 0) - parseInt(b.distance || 0));
    } else if (sortOrder === 'distance-desc') {
      result.sort((a, b) => parseInt(b.distance || 0) - parseInt(a.distance || 0));
    }

    return result;
  }, [routes, filterStart, filterEnd, filterStatus, sortOrder]);

  const handleToggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'default') return 'distance-asc';
      if (prev === 'distance-asc') return 'distance-desc';
      return 'default';
    });
  };

  // Helper to count stops
  const getStopCounts = (route) => {
    if (!route.stops || route.stops.length === 0) {
      return { pickups: 1, dropoffs: 1 };
    }
    let pickups = 0;
    let dropoffs = 0;
    route.stops.forEach((s, idx) => {
      if (idx === 0 || s.type === 'start' || s.type === 'pickup') {
        pickups++;
      } else {
        dropoffs++;
      }
    });
    return { pickups, dropoffs };
  };

  // Helper to format arrival time offset in minutes to human readable string
  const formatOffset = (mins) => {
    if (mins === undefined || mins === null) return null;
    if (mins === 0) return 'Khởi hành (+0p)';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `+${h}h ${m}p`;
    if (h > 0) return `+${h}h`;
    return `+${m}p`;
  };

  // Overall metrics for the top panel cards
  const stats = useMemo(() => {
    let totalPickups = 0;
    let totalDropoffs = 0;
    routes.forEach(r => {
      const { pickups, dropoffs } = getStopCounts(r);
      totalPickups += pickups;
      totalDropoffs += dropoffs;
    });
    const approvedCount = routes.filter(r => (r.status || 'approved') === 'approved').length;
    return { totalPickups, totalDropoffs, approvedCount };
  }, [routes]);

  const handleOpenAdd = (prefill = null) => {
    setEditingRoute(null);
    setFormErrors({});
    const sp = prefill?.startPoint || '';
    const ep = prefill?.endPoint || '';
    setStartPoint(sp);
    setEndPoint(ep);
    setDistance(prefill?.distance || '');
    setDuration(prefill?.duration || '');
    setStops([
      { name: sp ? `${sp} (Bến chính)` : '', address: '', type: 'start' },
      { name: ep ? `${ep} (Bến chính)` : '', address: '', type: 'end' }
    ]);
    setSuggestedEta(null);
    setUserEditedDistance(!!prefill?.distance);
    setUserEditedDuration(!!prefill?.duration);
    setShowModal(true);
  };

  // Tự động nhận diện dữ liệu tạo tuyến từ Phân tích Nhu cầu (GM) hoặc URL hash
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem('pending_create_route');
      if (draft) {
        const parsed = JSON.parse(draft);
        sessionStorage.removeItem('pending_create_route');
        if (parsed.startPoint || parsed.endPoint) {
          handleOpenAdd(parsed);
          return;
        }
      }
    } catch (e) {}

    try {
      const hash = window.location.hash || '';
      if (hash.includes('startPoint=') || hash.includes('endPoint=')) {
        const queryPart = hash.includes('?') ? hash.split('?')[1] : '';
        if (queryPart) {
          const params = new URLSearchParams(queryPart);
          const sp = params.get('startPoint') || '';
          const ep = params.get('endPoint') || '';
          if (sp || ep) {
            handleOpenAdd({
              startPoint: decodeURIComponent(sp),
              endPoint: decodeURIComponent(ep)
            });
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    } catch (e) {}
  }, []);

  const handleOpenEdit = (route) => {
    setEditingRoute(route);
    setFormErrors({});
    setStartPoint(route.startPoint);
    setEndPoint(route.endPoint);
    setDistance(route.distance);
    setDuration(route.duration);
    setSuggestedEta(null);
    setUserEditedDistance(true);
    setUserEditedDuration(true);
    if (route.stops && route.stops.length > 0) {
      const normalized = route.stops.map((s, idx) => ({
        ...s,
        type: idx === 0 ? 'start' : idx === route.stops.length - 1 ? 'end' : (s.type === 'dropoff' ? 'dropoff' : 'pickup')
      }));
      setStops(normalized);
    } else {
      setStops([
        { name: route.startPoint, address: '', type: 'start' },
        { name: route.endPoint, address: '', type: 'end' }
      ]);
    }
    setShowModal(true);
  };

  const handleAddStop = () => {
    const updated = [...stops];
    if (updated.length >= 2) {
      updated.splice(updated.length - 1, 0, { name: '', address: '', type: 'pickup' });
    } else {
      updated.push({ name: '', address: '', type: 'pickup' });
    }
    setStops(updated);
  };

  const handleRemoveStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
    if (formErrors.stopErrors && formErrors.stopErrors[index]) {
      setFormErrors(prev => {
        const newStopErrors = { ...prev.stopErrors };
        delete newStopErrors[index];
        return { ...prev, stopErrors: newStopErrors };
      });
    }
  };

  const handleStopChange = (index, field, value) => {
    setStops(prevStops => {
      const updated = [...prevStops];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    if (formErrors.stopErrors && formErrors.stopErrors[index]) {
      setFormErrors(prev => {
        const newStopErrors = { ...prev.stopErrors };
        delete newStopErrors[index];
        return { ...prev, stopErrors: newStopErrors };
      });
    }
  };

  const handleOptimizeStops = () => {
    if (stops.length <= 2) {
      showToast('Cần ít nhất 3 trạm để tối ưu lộ trình.');
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    const intermediates = [...stops.slice(1, stops.length - 1)];

    if (typeof first.lat === 'number' && typeof first.lng === 'number') {
      intermediates.sort((a, b) => {
        const distA = (typeof a.lat === 'number') ? Math.hypot(a.lat - first.lat, a.lng - first.lng) : 999;
        const distB = (typeof b.lat === 'number') ? Math.hypot(b.lat - first.lat, b.lng - first.lng) : 999;
        return distA - distB;
      });
    } else {
      intermediates.sort((a, b) => {
        if (a.type === 'pickup' && b.type === 'dropoff') return -1;
        if (a.type === 'dropoff' && b.type === 'pickup') return 1;
        return 0;
      });
    }

    const newStops = [first, ...intermediates, last];
    setStops(newStops);
    showToast('Đã sắp xếp tối ưu thứ tự các trạm đón/trả!');
  };

  const handleDelete = (route) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa tuyến đường',
      message: `Bạn có chắc chắn muốn xóa tuyến đường ${route.startPoint} - ${route.endPoint}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/trips/ops/routes/${route._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Xóa tuyến đường thành công!');
            if (expandedRouteId === route._id) setExpandedRouteId(null);
            fetchRoutes();
          } else {
            showToast(data.message || 'Lỗi xóa tuyến đường.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  // Map picker & geocoding state
  const [pickingStopIndex, setPickingStopIndex] = useState(null);
  const [geocodingIndex, setGeocodingIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Smart ETA & Distance Calculation via OSRM
  const [calculatingEta, setCalculatingEta] = useState(false);
  const [suggestedEta, setSuggestedEta] = useState(null);
  const [userEditedDistance, setUserEditedDistance] = useState(false);
  const [userEditedDuration, setUserEditedDuration] = useState(false);

  const calculateRouteEta = async (stopsList, forceApply = false) => {
    const valid = (stopsList || []).filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
    if (valid.length < 2) {
      setSuggestedEta(null);
      return;
    }

    setCalculatingEta(true);
    try {
      const waypoints = valid.map(s => `${s.lng},${s.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=false`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const routeData = data.routes[0];
        const distKm = Math.round(routeData.distance / 1000);
        const durSec = routeData.duration;
        const hours = Math.floor(durSec / 3600);
        const mins = Math.round((durSec % 3600) / 60);

        const formattedDistance = `${distKm} km`;
        let formattedDuration = '';
        if (hours > 0 && mins > 0) formattedDuration = `${hours} giờ ${mins} phút`;
        else if (hours > 0) formattedDuration = `${hours} giờ`;
        else formattedDuration = `${mins} phút`;

        // Calculate arrival offset for each stop
        let cumMin = 0;
        const stopOffsets = [];
        (routeData.legs || []).forEach(leg => {
          cumMin += Math.round(leg.duration / 60);
          stopOffsets.push(cumMin);
        });

        const etaResult = {
          distance: formattedDistance,
          duration: formattedDuration,
          rawDistanceKm: distKm,
          rawDurationMin: Math.round(durSec / 60),
          stopOffsets
        };

        setSuggestedEta(etaResult);

        // Auto-fill if user hasn't manually edited/overwritten, or if forceApply
        if (forceApply || (!userEditedDistance && !distance.trim())) {
          setDistance(formattedDistance);
        }
        if (forceApply || (!userEditedDuration && !duration.trim())) {
          setDuration(formattedDuration);
        }

        // Attach arrival offset times to stops
        setStops(prevStops => {
          let legIdx = 0;
          return prevStops.map((s, idx) => {
            if (idx === 0) return { ...s, arrivalTimeOffset: 0 };
            if (typeof s.lat === 'number' && typeof s.lng === 'number' && legIdx < stopOffsets.length) {
              const offset = stopOffsets[legIdx++];
              return { ...s, arrivalTimeOffset: offset };
            }
            return s;
          });
        });
      }
    } catch (err) {
      console.warn('OSRM ETA Calculation error:', err);
    } finally {
      setCalculatingEta(false);
    }
  };

  // Auto-calculate ETA whenever stop coordinates change
  const stopsCoordsKey = stops.map(s => `${s.lat},${s.lng}`).join(';');
  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => {
      calculateRouteEta(stops, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [stopsCoordsKey, showModal]);

  const handleGeocodeSingleStop = async (index) => {
    const stop = stops[index];
    const query = [stop.address, stop.name, (index === 0 ? startPoint : endPoint)].filter(Boolean).join(', ');
    if (!query || (!stop.name && !stop.address)) {
      setPickingStopIndex(index);
      return;
    }
    setGeocodingIndex(index);
    const result = await geocodeQuery(query);
    setGeocodingIndex(null);
    if (result) {
      const updated = [...stops];
      updated[index].lat = result.lat;
      updated[index].lng = result.lng;
      setStops(updated);
      showToast(`Đã tìm thấy GPS cho ${stop.name || 'trạm'}: ${result.lat}, ${result.lng}`);
    } else {
      showToast('Không tự động nhận diện được địa chỉ, vui lòng chấm ghim trên bản đồ!', 'error');
      setPickingStopIndex(index);
    }
  };

  const handleConfirmPickedCoords = (lat, lng) => {
    if (pickingStopIndex !== null) {
      const updated = [...stops];
      updated[pickingStopIndex].lat = lat;
      updated[pickingStopIndex].lng = lng;
      setStops(updated);
      showToast(`Đã lưu GPS cho ${updated[pickingStopIndex].name || 'trạm'}: ${lat}, ${lng}`);
      setPickingStopIndex(null);
    }
  };

  const validateRouteForm = () => {
    const errors = {};

    // 1. Kiểm tra Điểm đi
    const cleanStart = (startPoint || '').trim();
    if (!cleanStart) {
      errors.startPoint = 'Vui lòng nhập điểm đi xuất phát.';
    } else if (cleanStart.length < 2) {
      errors.startPoint = 'Tên điểm đi phải có ít nhất 2 ký tự.';
    }

    // 2. Kiểm tra Điểm đến
    const cleanEnd = (endPoint || '').trim();
    if (!cleanEnd) {
      errors.endPoint = 'Vui lòng nhập điểm đến kết thúc.';
    } else if (cleanEnd.length < 2) {
      errors.endPoint = 'Tên điểm đến phải có ít nhất 2 ký tự.';
    } else if (cleanStart && cleanStart.toLowerCase() === cleanEnd.toLowerCase()) {
      errors.endPoint = 'Điểm đến không được trùng với điểm xuất phát.';
    }

    // 3. Kiểm tra Tuyến đường trùng lặp
    if (cleanStart && cleanEnd && cleanStart.toLowerCase() !== cleanEnd.toLowerCase()) {
      const isDuplicate = routes.some(r => {
        if (editingRoute && r._id === editingRoute._id) return false;
        return (
          (r.startPoint || '').trim().toLowerCase() === cleanStart.toLowerCase() &&
          (r.endPoint || '').trim().toLowerCase() === cleanEnd.toLowerCase()
        );
      });
      if (isDuplicate) {
        errors.duplicate = `Tuyến đường ${cleanStart} ➔ ${cleanEnd} đã tồn tại trong hệ thống.`;
      }
    }

    // 4. Kiểm tra Khoảng cách
    const cleanDistance = (distance || '').trim();
    if (!cleanDistance) {
      errors.distance = 'Vui lòng nhập khoảng cách ước tính.';
    } else {
      const distMatch = cleanDistance.match(/(\d+([.,]\d+)?)/);
      const distNum = distMatch ? parseFloat(distMatch[1].replace(',', '.')) : NaN;
      if (isNaN(distNum) || distNum <= 0) {
        errors.distance = 'Khoảng cách phải là số lớn hơn 0 (ví dụ: 172 km).';
      } else if (distNum < 5) {
        errors.distance = 'Khoảng cách tuyến đường liên tỉnh tối thiểu là 5 km.';
      } else if (distNum > 3000) {
        errors.distance = 'Khoảng cách vượt quá giới hạn vận tải hợp lý (tối đa 3.000 km).';
      }
    }

    // 5. Kiểm tra Thời gian đi dự kiến
    const cleanDuration = (duration || '').trim();
    if (!cleanDuration) {
      errors.duration = 'Vui lòng nhập thời gian đi dự kiến.';
    } else {
      const hasNum = /\d+/.test(cleanDuration);
      if (!hasNum) {
        errors.duration = 'Thời gian đi phải chứa số đo cụ thể (ví dụ: 3 giờ hoặc 180 phút).';
      } else if (cleanDuration.includes('-')) {
        errors.duration = 'Thời gian đi dự kiến không được là số âm.';
      }
    }

    // 6. Kiểm tra Danh sách Trạm đón / trả
    if (!stops || stops.length < 2) {
      errors.stops = 'Tuyến đường cần tối thiểu 2 trạm: 1 điểm đón xuất phát và 1 điểm trả kết thúc.';
    } else {
      const stopErrors = {};
      const seenNames = new Set();
      let hasPickup = false;
      let hasDropoff = false;

      stops.forEach((s, idx) => {
        const sName = (s.name || '').trim();
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const isPickup = isFirst || s.type === 'start' || s.type === 'pickup';
        const isDropoff = isLast || s.type === 'end' || s.type === 'dropoff';

        if (isPickup) hasPickup = true;
        if (isDropoff) hasDropoff = true;

        if (!sName) {
          stopErrors[idx] = `Vui lòng nhập tên cho ${isFirst ? 'điểm đón xuất phát' : isLast ? 'điểm trả kết thúc' : `trạm thứ ${idx + 1}`}.`;
        } else {
          const lower = sName.toLowerCase();
          if (seenNames.has(lower)) {
            stopErrors[idx] = `Tên trạm "${sName}" bị trùng lặp trong cùng một tuyến.`;
          } else {
            seenNames.add(lower);
          }
        }

        // Tọa độ GPS nếu có
        if (typeof s.lat === 'number' && typeof s.lng === 'number') {
          if (s.lat < 8.0 || s.lat > 24.5 || s.lng < 102.0 || s.lng > 110.5) {
            stopErrors[idx] = `Tọa độ GPS (${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}) nằm ngoài phạm vi lãnh thổ Việt Nam.`;
          }
        }
      });

      if (Object.keys(stopErrors).length > 0) {
        errors.stopErrors = stopErrors;
      }

      if (!hasPickup) {
        errors.stops = 'Tuyến đường phải có ít nhất 1 điểm đón khách.';
      } else if (!hasDropoff) {
        errors.stops = 'Tuyến đường phải có ít nhất 1 điểm trả khách.';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateRouteForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      const firstError = validationErrors.startPoint ||
        validationErrors.endPoint ||
        validationErrors.duplicate ||
        validationErrors.distance ||
        validationErrors.duration ||
        validationErrors.stops ||
        (validationErrors.stopErrors && Object.values(validationErrors.stopErrors)[0]) ||
        'Vui lòng kiểm tra lại thông tin chưa hợp lệ.';
      showToast(firstError, 'error');
      return;
    }
    setFormErrors({});

    setSubmitting(true);

    // Auto-resolve any missing GPS coordinates for stops before sending to backend
    const resolvedStops = [...stops];
    for (let i = 0; i < resolvedStops.length; i++) {
      const s = resolvedStops[i];
      if ((typeof s.lat !== 'number' || typeof s.lng !== 'number') && (s.name || s.address)) {
        const query = [s.address, s.name, (i === 0 ? startPoint : endPoint)].filter(Boolean).join(', ');
        const coords = await geocodeQuery(query);
        if (coords) {
          s.lat = coords.lat;
          s.lng = coords.lng;
        }
      }
    }

    const validStops = resolvedStops
      .filter(s => s.name && s.name.trim() !== '')
      .map((s, idx) => ({
        name: s.name.trim(),
        address: (s.address || '').trim(),
        type: idx === 0 ? 'start' : idx === resolvedStops.length - 1 ? 'end' : (s.type === 'dropoff' ? 'dropoff' : 'pickup'),
        lat: typeof s.lat === 'number' ? s.lat : undefined,
        lng: typeof s.lng === 'number' ? s.lng : undefined,
        arrivalTimeOffset: typeof s.arrivalTimeOffset === 'number' ? s.arrivalTimeOffset : (idx === 0 ? 0 : undefined)
      }));

    const payload = {
      startPoint: startPoint.trim(),
      endPoint: endPoint.trim(),
      distance: distance.trim(),
      duration: duration.trim(),
      stops: validStops
    };

    try {
      const url = editingRoute
        ? `${API_BASE}/trips/ops/routes/${editingRoute._id}`
        : `${API_BASE}/trips/ops/routes`;
      const method = editingRoute ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingRoute ? 'Cập nhật tuyến đường thành công!' : 'Tạo tuyến đường mới thành công!');
        setShowModal(false);
        fetchRoutes();
      } else {
        showToast(data.message || 'Lỗi xử lý yêu cầu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '10px 18px', borderRadius: '8px',
          fontWeight: '600', fontSize: '0.82rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Map Modal */}
      {mapModalRoute && (
        <RouteMapModal route={mapModalRoute} onClose={() => setMapModalRoute(null)} />
      )}

      {/* =========================================================================
          KHỐI 1 (TRÊN): KHỐI MÀU TRẮNG THỐNG KÊ & TIÊU ĐỀ
          ========================================================================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Header row with title and action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Quản lý tuyến đường
              </h1>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                {routes.length} tuyến đang khai thác
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Xem danh sách chi tiết các trạm đón/trả, cự ly và trạng thái vận hành của các hành trình xe khách liên tỉnh.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleToggleSort}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              Sắp xếp {sortOrder === 'distance-asc' ? '(Cự ly tăng dần)' : sortOrder === 'distance-desc' ? '(Cự ly giảm dần)' : ''}
            </button>
            <button
              onClick={handleOpenAdd}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              + Thêm tuyến đường
            </button>
          </div>
        </div>

        {/* 4 Stat Cards inside the top block */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          {/* Card 1: Tuyến khai thác */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              TUYẾN KHAI THÁC
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {routes.length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>tuyến</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
              {stats.approvedCount} tuyến đang vận hành ổn định
            </div>
          </div>

          {/* Card 2: Điểm đón khách */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              ĐIỂM ĐÓN KHÁCH
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {stats.totalPickups} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>trạm đón</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              Đón tại các bến xe và trạm trung chuyển
            </div>
          </div>

          {/* Card 3: Điểm trả khách */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              ĐIỂM TRẢ KHÁCH
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {stats.totalDropoffs} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>trạm trả</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#9333ea', fontWeight: '600' }}>
              Trả khách an toàn theo hành trình
            </div>
          </div>

          {/* Card 4: Tổng số trạm */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              TỔNG TRẠM DỌC TUYẾN
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {stats.totalPickups + stats.totalDropoffs} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>trạm</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600' }}>
              Đã ghim tọa độ GPS chuẩn
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KHỐI 2 (DƯỚI): KHỐI MÀU TRẮNG HIỂN THỊ DANH SÁCH & SƠ ĐỒ TRẠM
          ========================================================================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Table Top Controls & Filters */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '1rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Bảng Danh Sách Tuyến Đường
            </h2>
            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '12px' }}>
              {filteredRoutes.length} tuyến
            </span>
          </div>

          {/* Clean Filters in a row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.75rem',
                color: '#334155',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <option value="all">Tất cả điểm đi</option>
              {uniqueStartPoints.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.75rem',
                color: '#334155',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <option value="all">Tất cả điểm đến</option>
              {uniqueEndPoints.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.75rem',
                color: '#334155',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="approved">Đã duyệt</option>
              <option value="pending">Chờ duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>

        {/* FULL WIDTH TABLE (Single line text, compact and spacious) */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem' }}>
            Đang tải dữ liệu tuyến đường...
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem' }}>
            Không tìm thấy tuyến đường nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: '#f8fafc'
                }}>
                  <th style={{ padding: '10px 14px', width: '32%', whiteSpace: 'nowrap' }}>HÀNH TRÌNH (ĐIỂM ĐI — ĐIỂM ĐẾN)</th>
                  <th style={{ padding: '10px 14px', width: '20%', whiteSpace: 'nowrap' }}>KHOẢNG CÁCH & THỜI GIAN</th>
                  <th style={{ padding: '10px 14px', width: '18%', whiteSpace: 'nowrap' }}>SỐ TRẠM ĐÓN/TRẢ</th>
                  <th style={{ padding: '10px 14px', width: '12%', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '10px 14px', width: '18%', textAlign: 'right', whiteSpace: 'nowrap' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route, idx) => {
                  const isExpanded = expandedRouteId === route._id;
                  const { pickups, dropoffs } = getStopCounts(route);
                  const formattedIndex = String(idx + 1).padStart(2, '0');

                  return (
                    <React.Fragment key={route._id}>
                      <tr
                        onClick={() => setExpandedRouteId(isExpanded ? null : route._id)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          verticalAlign: 'middle',
                          backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Hành trình */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              backgroundColor: isExpanded ? '#dbeafe' : '#f1f5f9',
                              color: isExpanded ? '#1d4ed8' : '#64748b',
                              fontWeight: '700',
                              fontSize: '0.72rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {formattedIndex}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>
                                {route.startPoint} → {route.endPoint}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: isExpanded ? '#2563eb' : '#64748b', marginTop: '1px', fontWeight: isExpanded ? '600' : '400' }}>
                                {isExpanded ? 'Đang xem sơ đồ trạm chi tiết' : `Lộ trình tiêu chuẩn: ${route.distance}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Khoảng cách & Thời gian */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0f172a' }}>
                            {route.distance}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>
                            (Ước tính: ~{route.duration})
                          </span>
                        </td>

                        {/* Số trạm đón/trả */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.78rem', color: '#166534' }}>
                            {pickups} đón
                          </span>
                          <span style={{ color: '#94a3b8', margin: '0 4px' }}>•</span>
                          <span style={{ fontWeight: '600', fontSize: '0.78rem', color: '#991b1b' }}>
                            {dropoffs} trả
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '6px' }}>
                            (Tổng {pickups + dropoffs} trạm)
                          </span>
                        </td>

                        {/* Trạng thái (Single line badge) */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            whiteSpace: 'nowrap',
                            backgroundColor: route.status === 'rejected' ? '#fef2f2' : route.status === 'pending' ? '#fff7ed' : '#ecfdf5',
                            color: route.status === 'rejected' ? '#b91c1c' : route.status === 'pending' ? '#c2410c' : '#047857',
                            border: `1px solid ${route.status === 'rejected' ? '#fecaca' : route.status === 'pending' ? '#fed7aa' : '#a7f3d0'}`
                          }}>
                            {route.status === 'rejected' ? 'Từ chối' : route.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                          </span>
                        </td>

                        {/* Thao tác (Single line horizontal buttons) */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMapModalRoute(route); }}
                            style={{
                              background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857',
                              fontWeight: '700', fontSize: '0.72rem', borderRadius: '5px', cursor: 'pointer', marginRight: '8px', padding: '3px 8px'
                            }}
                          >
                            Bản đồ GPS
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedRouteId(isExpanded ? null : route._id); }}
                            style={{
                              background: 'none', border: 'none', color: isExpanded ? '#2563eb' : '#475569',
                              fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', marginRight: '8px', padding: '2px 4px'
                            }}
                          >
                            {isExpanded ? 'Đóng' : 'Xem trạm'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(route); }}
                            style={{
                              background: 'none', border: 'none', color: '#2563eb',
                              fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', marginRight: '8px', padding: '2px 4px'
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(route); }}
                            style={{
                              background: 'none', border: 'none', color: '#ef4444',
                              fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 4px'
                            }}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Stops Timeline Row */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td colSpan="5" style={{ padding: '14px 20px 18px 46px' }}>
                            <div style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '14px 18px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>
                                  Sơ đồ các trạm đón &amp; trả: {route.startPoint} → {route.endPoint}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    Cự ly: <strong>{route.distance}</strong> • Thời gian chạy: <strong>{route.duration}</strong>
                                  </div>
                                  <button
                                    onClick={() => setMapModalRoute(route)}
                                    style={{
                                      backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
                                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer'
                                    }}
                                  >
                                    Mở bản đồ GPS trực quan
                                  </button>
                                </div>
                              </div>

                              {route.stops && route.stops.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
                                  {route.stops.map((stop, sIdx) => {
                                    const isFirst = sIdx === 0;
                                    const isLast = sIdx === route.stops.length - 1;
                                    const isPickup = isFirst || stop.type === 'start' || stop.type === 'pickup';

                                    const badgeBg = isPickup ? '#ecfdf5' : '#fef2f2';
                                    const badgeColor = isPickup ? '#047857' : '#b91c1c';
                                    const badgeBorder = isPickup ? '#a7f3d0' : '#fecaca';

                                    let badgeLabel = 'Điểm đón';
                                    if (isFirst || stop.type === 'start') badgeLabel = 'Khởi hành (Đón)';
                                    else if (isLast || stop.type === 'end') badgeLabel = 'Điểm đích (Trả)';
                                    else if (!isPickup) badgeLabel = 'Điểm trả';

                                    return (
                                      <div key={sIdx} style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        backgroundColor: '#fafbfc'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b' }}>
                                              Trạm {sIdx + 1}
                                            </span>
                                            {typeof stop.arrivalTimeOffset === 'number' && (
                                              <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: '700',
                                                backgroundColor: sIdx === 0 ? '#f1f5f9' : '#eff6ff',
                                                color: sIdx === 0 ? '#475569' : '#1d4ed8',
                                                border: sIdx === 0 ? '1px solid #cbd5e1' : '1px solid #bfdbfe',
                                                padding: '1px 5px',
                                                borderRadius: '4px'
                                              }}>
                                                {formatOffset(stop.arrivalTimeOffset)}
                                              </span>
                                            )}
                                          </div>
                                          <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '700',
                                            backgroundColor: badgeBg,
                                            color: badgeColor,
                                            border: `1px solid ${badgeBorder}`,
                                            padding: '1px 6px',
                                            borderRadius: '4px'
                                          }}>
                                            {badgeLabel}
                                          </span>
                                        </div>
                                        <div style={{ fontWeight: '700', fontSize: '0.78rem', color: '#0f172a' }}>
                                          {stop.name}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                                          {stop.address || 'Địa chỉ cập nhật theo bến xe'}
                                        </div>
                                        {typeof stop.lat === 'number' && (
                                          <div style={{ fontSize: '0.66rem', color: '#2563eb', marginTop: '4px' }}>
                                            GPS: {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Chưa cấu hình các trạm đón/trả cho tuyến đường này.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL THÊM / CẬP NHẬT TUYẾN ĐƯỜNG (GIAO DIỆN HIỆN ĐẠI, GỌN GÀNG, KHÔNG ICON)
          ========================================================================= */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '100%',
            maxWidth: '920px',
            padding: '22px 26px',
            position: 'relative',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: '14px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '18px',
              paddingBottom: '12px', borderBottom: '1px solid #f1f5f9'
            }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '1.15rem' }}>
                  {editingRoute ? 'Cập nhật tuyến đường' : 'Thêm tuyến đường mới'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8',
                  fontSize: '1.25rem', cursor: 'pointer', padding: '2px 6px',
                  borderRadius: '6px', lineHeight: 1
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Duplicate Route Error Alert */}
              {formErrors.duplicate && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>!</span>
                  <span>{formErrors.duplicate}</span>
                </div>
              )}

              {/* Row 1: Start & End Points */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.74rem', color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Điểm đi *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={startPoint}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartPoint(val);
                      if (formErrors.startPoint || formErrors.duplicate) {
                        setFormErrors(prev => ({ ...prev, startPoint: '', duplicate: '' }));
                      }
                      if (stops.length > 0 && (!stops[0].name || stops[0].name === startPoint)) {
                        handleStopChange(0, 'name', val);
                      }
                    }}
                    placeholder="Ví dụ: Cần Thơ"
                    style={{
                      fontSize: '0.82rem',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: formErrors.startPoint ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: formErrors.startPoint ? '#fef2f2' : '#ffffff'
                    }}
                  />
                  {formErrors.startPoint && (
                    <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: '600' }}>
                      {formErrors.startPoint}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.74rem', color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Điểm đến *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={endPoint}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEndPoint(val);
                      if (formErrors.endPoint || formErrors.duplicate) {
                        setFormErrors(prev => ({ ...prev, endPoint: '', duplicate: '' }));
                      }
                      if (stops.length > 1 && (!stops[stops.length - 1].name || stops[stops.length - 1].name === endPoint)) {
                        handleStopChange(stops.length - 1, 'name', val);
                      }
                    }}
                    placeholder="Ví dụ: Hồ Chí Minh"
                    style={{
                      fontSize: '0.82rem',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: formErrors.endPoint ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: formErrors.endPoint ? '#fef2f2' : '#ffffff'
                    }}
                  />
                  {formErrors.endPoint && (
                    <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: '600' }}>
                      {formErrors.endPoint}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: ETA Banner */}
              {suggestedEta && (
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{
                        backgroundColor: '#1d4ed8', color: '#ffffff',
                        fontSize: '0.65rem', fontWeight: '800', padding: '2px 7px',
                        borderRadius: '4px', letterSpacing: '0.4px'
                      }}>
                        BẢN ĐỒ ETA THÔNG MINH
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                      Cự ly đo lường thực tế: <strong style={{ color: '#0f172a', fontWeight: '800' }}>{suggestedEta.distance}</strong>
                      <span style={{ margin: '0 8px', color: '#94a3b8' }}>•</span>
                      Thời gian hành trình dự kiến: <strong style={{ color: '#2563eb', fontWeight: '800' }}>{suggestedEta.duration}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDistance(suggestedEta.distance);
                        setDuration(suggestedEta.duration);
                        setUserEditedDistance(false);
                        setUserEditedDuration(false);
                        if (formErrors.distance || formErrors.duration) {
                          setFormErrors(prev => ({ ...prev, distance: '', duration: '' }));
                        }
                        showToast('Đã áp dụng gợi ý ETA vào biểu mẫu!');
                      }}
                      style={{
                        padding: '6px 14px', fontSize: '0.74rem', fontWeight: '700',
                        color: '#ffffff', backgroundColor: '#2563eb', border: 'none',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                      title="Áp dụng số đo gợi ý từ bản đồ vào hai ô bên dưới"
                    >
                      Áp dụng gợi ý
                    </button>
                  </div>
                </div>
              )}

              {/* Row 3: Distance & Duration Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '0.74rem', color: '#334155', textTransform: 'uppercase', margin: 0 }}>
                      Khoảng cách ước tính (km) *
                    </label>
                    {suggestedEta && (
                      <button
                        type="button"
                        onClick={() => {
                          setDistance(suggestedEta.distance);
                          setUserEditedDistance(false);
                          if (formErrors.distance) {
                            setFormErrors(prev => ({ ...prev, distance: '' }));
                          }
                        }}
                        style={{
                          background: 'none', border: 'none', color: '#2563eb',
                          fontSize: '0.72rem', fontWeight: '600', padding: 0,
                          cursor: 'pointer'
                        }}
                      >
                        Gợi ý: {suggestedEta.distance}
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={distance}
                      onChange={(e) => {
                        setUserEditedDistance(true);
                        setDistance(e.target.value);
                        if (formErrors.distance) {
                          setFormErrors(prev => ({ ...prev, distance: '' }));
                        }
                      }}
                      placeholder="Ví dụ: 172 km"
                      style={{
                        fontSize: '0.82rem',
                        padding: '8px 30px 8px 10px',
                        borderRadius: '8px',
                        border: formErrors.distance ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        backgroundColor: formErrors.distance ? '#fef2f2' : '#ffffff'
                      }}
                    />
                    {distance && (
                      <button
                        type="button"
                        onClick={() => {
                          setDistance('');
                          setUserEditedDistance(true);
                        }}
                        style={{
                          position: 'absolute', right: '8px', top: '50%',
                          transform: 'translateY(-50%)', background: 'none',
                          border: 'none', color: '#94a3b8', fontSize: '0.85rem',
                          cursor: 'pointer', padding: '2px'
                        }}
                        title="Xóa khoảng cách"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {formErrors.distance && (
                    <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: '600' }}>
                      {formErrors.distance}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '0.74rem', color: '#334155', textTransform: 'uppercase', margin: 0 }}>
                      Thời gian đi dự kiến *
                    </label>
                    {suggestedEta && (
                      <button
                        type="button"
                        onClick={() => {
                          setDuration(suggestedEta.duration);
                          setUserEditedDuration(false);
                          if (formErrors.duration) {
                            setFormErrors(prev => ({ ...prev, duration: '' }));
                          }
                        }}
                        style={{
                          background: 'none', border: 'none', color: '#2563eb',
                          fontSize: '0.72rem', fontWeight: '600', padding: 0,
                          cursor: 'pointer'
                        }}
                      >
                        Gợi ý: {suggestedEta.duration}
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={duration}
                      onChange={(e) => {
                        setUserEditedDuration(true);
                        setDuration(e.target.value);
                        if (formErrors.duration) {
                          setFormErrors(prev => ({ ...prev, duration: '' }));
                        }
                      }}
                      placeholder="Ví dụ: 3 giờ"
                      style={{
                        fontSize: '0.82rem',
                        padding: '8px 30px 8px 10px',
                        borderRadius: '8px',
                        border: formErrors.duration ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        backgroundColor: formErrors.duration ? '#fef2f2' : '#ffffff'
                      }}
                    />
                    {duration && (
                      <button
                        type="button"
                        onClick={() => {
                          setDuration('');
                          setUserEditedDuration(true);
                        }}
                        style={{
                          position: 'absolute', right: '8px', top: '50%',
                          transform: 'translateY(-50%)', background: 'none',
                          border: 'none', color: '#94a3b8', fontSize: '0.85rem',
                          cursor: 'pointer', padding: '2px'
                        }}
                        title="Xóa thời gian"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {formErrors.duration && (
                    <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', fontWeight: '600' }}>
                      {formErrors.duration}
                    </div>
                  )}
                </div>
              </div>

              {/* Stops list: STRICTLY ONLY PICKUP OR DROPOFF */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '14px',
                borderRadius: '10px',
                border: formErrors.stops ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: '700', color: '#1e293b', fontSize: '0.8rem' }}>
                    Danh sách Các điểm đón và điểm trả:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStop}
                    style={{
                      backgroundColor: '#2563eb', color: 'white', border: 'none',
                      padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem',
                      fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    + Thêm trạm đón/trả
                  </button>
                </div>

                {formErrors.stops && (
                  <div style={{ color: '#dc2626', fontSize: '0.74rem', marginBottom: '10px', fontWeight: '700' }}>
                    {formErrors.stops}
                  </div>
                )}

                {stops.map((stop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === stops.length - 1 && stops.length > 1;
                  const isDropoff = !isFirst && (stop.type === 'dropoff' || isLast);
                  const hasStopError = formErrors.stopErrors && formErrors.stopErrors[idx];

                  return (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '5px',
                          backgroundColor: isFirst ? '#ecfdf5' : (isDropoff ? '#fff7ed' : '#f1f5f9'),
                          color: isFirst ? '#047857' : (isDropoff ? '#c2410c' : '#475569'),
                          fontWeight: '800', fontSize: '0.72rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>

                        {isFirst ? (
                          <div style={{
                            padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px',
                            backgroundColor: '#ecfdf5', color: '#047857', fontWeight: '700',
                            whiteSpace: 'nowrap', border: '1px solid #a7f3d0', minWidth: '115px', textAlign: 'center'
                          }}>
                            Điểm đón (Đầu)
                          </div>
                        ) : isLast ? (
                          <div style={{
                            padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px',
                            backgroundColor: '#fef2f2', color: '#b91c1c', fontWeight: '700',
                            whiteSpace: 'nowrap', border: '1px solid #fecaca', minWidth: '115px', textAlign: 'center'
                          }}>
                            Điểm trả (Cuối)
                          </div>
                        ) : (
                          <select
                            value={stop.type === 'dropoff' ? 'dropoff' : 'pickup'}
                            onChange={(e) => handleStopChange(idx, 'type', e.target.value)}
                            style={{
                              padding: '5px 8px', fontSize: '0.75rem', borderRadius: '6px',
                              border: isDropoff ? '1px solid #fed7aa' : '1px solid #cbd5e1',
                              backgroundColor: isDropoff ? '#fff7ed' : '#ffffff',
                              fontWeight: '700', minWidth: '115px',
                              color: isDropoff ? '#c2410c' : '#047857',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="pickup">Điểm đón</option>
                            <option value="dropoff">Điểm trả</option>
                          </select>
                        )}

                        <input
                          type="text"
                          placeholder={isFirst ? "Tên điểm đón xuất phát" : isLast ? "Tên điểm trả kết thúc" : "Tên trạm đón hoặc trả"}
                          value={stop.name}
                          onChange={(e) => handleStopChange(idx, 'name', e.target.value)}
                          style={{
                            flex: 1.2,
                            padding: '6px 8px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            border: hasStopError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            backgroundColor: hasStopError ? '#fef2f2' : '#ffffff'
                          }}
                        />

                        <input
                          type="text"
                          placeholder="Địa chỉ chi tiết (Tùy chọn)"
                          value={stop.address}
                          onChange={(e) => handleStopChange(idx, 'address', e.target.value)}
                          style={{ flex: 1.6, padding: '6px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />

                        {/* Stop ETA offset badge */}
                        {typeof stop.arrivalTimeOffset === 'number' && (
                          <span
                            title={`Thời gian dự kiến từ lúc xuất phát: +${stop.arrivalTimeOffset} phút`}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              borderRadius: '5px',
                              backgroundColor: isFirst ? '#f1f5f9' : (isDropoff ? '#fffbeb' : '#eff6ff'),
                              color: isFirst ? '#475569' : (isDropoff ? '#b45309' : '#1d4ed8'),
                              border: isFirst ? '1px solid #e2e8f0' : (isDropoff ? '1px solid #fde68a' : '1px solid #bfdbfe'),
                              whiteSpace: 'nowrap',
                              minWidth: '60px',
                              textAlign: 'center'
                            }}
                          >
                            {formatOffset(stop.arrivalTimeOffset)}
                          </span>
                        )}

                        {/* GPS Pin Button & Coordinates Badge */}
                        {typeof stop.lat === 'number' && typeof stop.lng === 'number' ? (
                          <button
                            type="button"
                            onClick={() => setPickingStopIndex(idx)}
                            style={{
                              padding: '4px 8px', fontSize: '0.7rem', borderRadius: '5px',
                              border: '1px solid #10b981', backgroundColor: '#ecfdf5', color: '#047857',
                              fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                            title={`Tọa độ GPS: ${stop.lat}, ${stop.lng}. Nhấp để đổi vị trí trên bản đồ.`}
                          >
                            GPS: {stop.lat.toFixed(3)}, {stop.lng.toFixed(3)}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGeocodeSingleStop(idx)}
                            disabled={geocodingIndex === idx}
                            style={{
                              padding: '4px 8px', fontSize: '0.7rem', borderRadius: '5px',
                              border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#2563eb',
                              fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                            title="Nhấp để tự động tìm tọa độ GPS từ địa chỉ hoặc ghim trên bản đồ"
                          >
                            {geocodingIndex === idx ? 'Đang tìm...' : 'Ghim GPS'}
                          </button>
                        )}

                        {!isFirst && !isLast && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStop(idx)}
                            title="Xóa trạm này"
                            style={{
                              color: '#ef4444', backgroundColor: '#fef2f2',
                              border: '1px solid #fca5a5', borderRadius: '5px',
                              padding: '3px 7px', cursor: 'pointer', fontSize: '0.75rem'
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {hasStopError && (
                        <div style={{ color: '#dc2626', fontSize: '0.71rem', fontWeight: '600', marginTop: '3px', paddingLeft: '30px' }}>
                          {hasStopError}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  style={{ borderRadius: '6px', fontSize: '0.8rem', padding: '7px 16px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem',
                    backgroundColor: '#2563eb', border: 'none', padding: '7px 20px',
                    opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Đang lưu...' : (editingRoute ? 'Lưu thay đổi' : 'Tạo mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual GPS Map Picker Modal */}
      {pickingStopIndex !== null && stops[pickingStopIndex] && (
        <StopMapPickerModal
          stop={stops[pickingStopIndex]}
          stopIndex={pickingStopIndex}
          onConfirm={handleConfirmPickedCoords}
          onClose={() => setPickingStopIndex(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.show && (
        <div className="confirm-backdrop">
          <div className="confirm-card">
            <div className="confirm-header">{confirmModal.title}</div>
            <div className="confirm-body">{confirmModal.message}</div>
            <div className="confirm-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsRoutesPage;
