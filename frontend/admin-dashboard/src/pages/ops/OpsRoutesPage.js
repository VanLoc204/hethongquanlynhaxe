import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

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
// AI SMART KNOWLEDGE BASE & ENTITY RECOGNITION (LANDMARKS VIETNAM)
// =========================================================================
const VIETNAM_LANDMARKS = [
  // Bệnh viện lớn
  {
    keywords: ['175', 'bv 175', 'benh vien 175', 'quan y 175', 'vien 175'],
    name: 'Bệnh viện Quân y 175',
    address: '786 Nguyễn Kiệm, Phường 3, Quận Gò Vấp, TP. Hồ Chí Minh',
    lat: 10.817300,
    lng: 106.678700,
    tag: 'Bệnh viện'
  },
  {
    keywords: ['cho ray', 'bv cho ray', 'benh vien cho ray'],
    name: 'Bệnh viện Chợ Rẫy',
    address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP. Hồ Chí Minh',
    lat: 10.757820,
    lng: 106.659610,
    tag: 'Bệnh viện'
  },
  {
    keywords: ['ung buou', 'bv ung buou', 'benh vien ung buou'],
    name: 'Bệnh viện Ung Bướu',
    address: '03 Nơ Trang Long, Phường 7, Quận Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.803510,
    lng: 106.696120,
    tag: 'Bệnh viện'
  },
  {
    keywords: ['dai hoc y duoc', 'dh y duoc', 'bv dh y duoc'],
    name: 'Bệnh viện Đại học Y Dược TP.HCM',
    address: '215 Hồng Bàng, Phường 11, Quận 5, TP. Hồ Chí Minh',
    lat: 10.755200,
    lng: 106.660100,
    tag: 'Bệnh viện'
  },
  {
    keywords: ['tam anh', 'bv tam anh', 'benh vien tam anh'],
    name: 'Bệnh viện Đa khoa Tâm Anh TP.HCM',
    address: '2B Phổ Quang, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh',
    lat: 10.803150,
    lng: 106.666420,
    tag: 'Bệnh viện'
  },
  {
    keywords: ['nhi dong 1', 'bv nhi dong 1'],
    name: 'Bệnh viện Nhi Đồng 1',
    address: '341 Sư Vạn Hạnh, Phường 10, Quận 10, TP. Hồ Chí Minh',
    lat: 10.769400,
    lng: 106.669800,
    tag: 'Bệnh viện'
  },
  {
    keywords: ['thong nhat', 'bv thong nhat', 'benh vien thong nhat'],
    name: 'Bệnh viện Thống Nhất',
    address: '01 Lý Thường Kiệt, Phường 7, Quận Tân Bình, TP. Hồ Chí Minh',
    lat: 10.793200,
    lng: 106.654800,
    tag: 'Bệnh viện'
  },
  {
    keywords: ['tu du', 'bv tu du', 'benh vien tu du'],
    name: 'Bệnh viện Từ Dũ',
    address: '284 Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
    lat: 10.768200,
    lng: 106.687200,
    tag: 'Bệnh viện'
  },

  // Bến xe & Trung tâm trung chuyển
  {
    keywords: ['mien tay', 'bx mien tay', 'ben xe mien tay', 'kinh duong vuong'],
    name: 'Bến xe Miền Tây',
    address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP. Hồ Chí Minh',
    lat: 10.741055,
    lng: 106.618526,
    tag: 'Bến xe'
  },
  {
    keywords: ['mien dong moi', 'bx mien dong moi', 'ben xe mien dong moi', 'hoang huu nam'],
    name: 'Bến xe Miền Đông Mới',
    address: '501 Hoàng Hữu Nam, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    lat: 10.877864,
    lng: 106.825642,
    tag: 'Bến xe'
  },
  {
    keywords: ['mien dong cu', 'bx mien dong cu', 'ben xe mien dong', 'dinh bo linh'],
    name: 'Bến xe Miền Đông Cũ',
    address: '292 Đinh Bộ Lĩnh, Phường 26, Quận Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.814300,
    lng: 106.711500,
    tag: 'Bến xe'
  },
  {
    keywords: ['an suong', 'bx an suong', 'ben xe an suong', 'nga 4 an suong'],
    name: 'Bến xe An Sương',
    address: 'Quốc Lộ 22, Xã Bà Điểm, Huyện Hóc Môn, TP. Hồ Chí Minh',
    lat: 10.846500,
    lng: 106.616200,
    tag: 'Bến xe'
  },
  {
    keywords: ['nga tu ga', 'bx nga tu ga', 'ben xe nga tu ga'],
    name: 'Bến xe Ngã Tư Ga',
    address: '720 Quốc Lộ 1A, Phường Thạnh Lộc, Quận 12, TP. Hồ Chí Minh',
    lat: 10.864700,
    lng: 106.680500,
    tag: 'Bến xe'
  },
  {
    keywords: ['da lat', 'bx da lat', 'ben xe da lat', 'to hien thanh'],
    name: 'Bến xe Liên Tỉnh Đà Lạt',
    address: '01 Tô Hiến Thành, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng',
    lat: 11.926882,
    lng: 108.445514,
    tag: 'Bến xe'
  },
  {
    keywords: ['bao loc', 'bx bao loc', 'ben xe bao loc', 'tran phu bao loc'],
    name: 'Bến xe Bảo Lộc',
    address: '280 Trần Phú, Phường 1, TP. Bảo Lộc, Tỉnh Lâm Đồng',
    lat: 11.545821,
    lng: 107.809312,
    tag: 'Bến xe'
  },
  {
    keywords: ['can tho', 'bx can tho', 'ben xe can tho', 'trung tam can tho'],
    name: 'Bến xe Trung Tâm Cần Thơ',
    address: 'Đường dẫn cầu Cần Thơ, Phường Hưng Thạnh, Quận Cái Răng, Cần Thơ',
    lat: 10.012543,
    lng: 105.761245,
    tag: 'Bến xe'
  },

  // Nút giao thông & Điểm đón trả phổ biến
  {
    keywords: ['hang xanh', 'nga tu hang xanh', 'vong xoay hang xanh'],
    name: 'Ngã tư Hàng Xanh',
    address: 'Điện Biên Phủ giao Xô Viết Nghệ Tĩnh, Quận Bình Thạnh, TP.HCM',
    lat: 10.800000,
    lng: 106.711800,
    tag: 'Nút giao'
  },
  {
    keywords: ['thu duc', 'nga tu thu duc'],
    name: 'Ngã tư Thủ Đức',
    address: 'Xa lộ Hà Nội giao Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
    lat: 10.849200,
    lng: 106.772500,
    tag: 'Nút giao'
  },
  {
    keywords: ['suoi tien', 'kdl suoi tien', 'du lich suoi tien'],
    name: 'Khu du lịch Suối Tiên',
    address: '120 Xa lộ Hà Nội, Phường Tân Phú, TP. Thủ Đức, TP.HCM',
    lat: 10.865200,
    lng: 106.802800,
    tag: 'Điểm đón'
  },
  {
    keywords: ['dau giay', 'nga 3 dau giay', 'nga ba dau giay'],
    name: 'Ngã 3 Dầu Giây',
    address: 'Quốc Lộ 1A giao Quốc Lộ 20, Huyện Thống Nhất, Tỉnh Đồng Nai',
    lat: 10.932971,
    lng: 107.135248,
    tag: 'Nút giao'
  },
  {
    keywords: ['dinh quan', 'vp dinh quan'],
    name: 'Văn phòng Định Quán',
    address: '108 Quốc Lộ 20, Thị trấn Định Quán, Huyện Định Quán, Đồng Nai',
    lat: 11.206584,
    lng: 107.362142,
    tag: 'Văn phòng'
  },
  {
    keywords: ['di linh', 'vp di linh'],
    name: 'Văn phòng Di Linh',
    address: '721 Hùng Vương, Thị trấn Di Linh, Huyện Di Linh, Tỉnh Lâm Đồng',
    lat: 11.662453,
    lng: 108.067425,
    tag: 'Văn phòng'
  },
  {
    keywords: ['duc trong', 'vp duc trong', 'lien nghia'],
    name: 'Văn phòng Đức Trọng',
    address: '735 Quốc Lộ 20, Thị trấn Liên Nghĩa, Huyện Đức Trọng, Tỉnh Lâm Đồng',
    lat: 11.733512,
    lng: 108.373245,
    tag: 'Văn phòng'
  },
  {
    keywords: ['le hong phong', 'vp le hong phong', '233 le hong phong'],
    name: 'Văn phòng Lê Hồng Phong',
    address: '233 Lê Hồng Phong, Phường 4, Quận 5, TP. Hồ Chí Minh',
    lat: 10.760154,
    lng: 106.674945,
    tag: 'Văn phòng'
  },
  {
    keywords: ['tan son nhat', 'san bay tan son nhat', 'san bay'],
    name: 'Sân bay Quốc tế Tân Sơn Nhất',
    address: 'Đường Trường Sơn, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh',
    lat: 10.818400,
    lng: 106.658800,
    tag: 'Sân bay'
  },
  {
    keywords: ['dai hoc cong nghiep', 'dh cong nghiep', 'iuh', 'nguyen van bao'],
    name: 'Trường Đại học Công nghiệp TP.HCM (IUH)',
    address: '12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh',
    lat: 10.822200,
    lng: 106.687500,
    tag: 'Trường học'
  },
  {
    keywords: ['ben thanh', 'cho ben thanh'],
    name: 'Chợ Bến Thành',
    address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    lat: 10.772600,
    lng: 106.698000,
    tag: 'Địa danh'
  },
  {
    keywords: ['my thuan', 'cau my thuan', 'vinh long'],
    name: 'Trạm Vĩnh Long (Cầu Mỹ Thuận)',
    address: 'Phường Tân Hòa, TP. Vĩnh Long, Tỉnh Vĩnh Long',
    lat: 10.264125,
    lng: 105.914523,
    tag: 'Trạm dừng'
  },
  {
    keywords: ['cai lay', 'tram cai lay'],
    name: 'Trạm Cai Lậy (Tiền Giang)',
    address: 'Quốc Lộ 1A, Phường 1, Thị xã Cai Lậy, Tỉnh Tiền Giang',
    lat: 10.412453,
    lng: 106.024512,
    tag: 'Trạm dừng'
  },
  {
    keywords: ['tan an', 'tram tan an'],
    name: 'Trạm Tân An (Long An)',
    address: 'Quốc Lộ 1A, Phường 5, TP. Tân An, Tỉnh Long An',
    lat: 10.536214,
    lng: 106.413245,
    tag: 'Trạm dừng'
  }
];

// Fuzzy search in Vietnam Landmarks
const searchSmartLandmark = (queryText) => {
  if (!queryText || !queryText.trim()) return [];
  const normalize = (s) => (s || '').toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();

  const normQ = normalize(queryText);
  if (!normQ) return [];
  const qTokens = normQ.split(/\s+/).filter(Boolean);

  const matched = [];
  for (const item of VIETNAM_LANDMARKS) {
    const normName = normalize(item.name);
    const normAddr = normalize(item.address);
    const allKeywords = item.keywords.map(normalize);

    let score = 0;
    // Check keywords
    for (const kw of allKeywords) {
      if (normQ.includes(kw)) score += 15;
      else if (kw.includes(normQ)) score += 8;
    }
    // Check tokens
    qTokens.forEach(token => {
      if (normName.includes(token)) score += 4;
      if (normAddr.includes(token)) score += 2;
      for (const kw of allKeywords) {
        if (kw.includes(token)) score += 3;
      }
    });

    if (score >= 4) {
      matched.push({ ...item, score });
    }
  }

  return matched.sort((a, b) => b.score - a.score);
};

// Smart Geocoding helper with Vietnamese address decomposition & Landmark Knowledge Base
const geocodeQuery = async (queryText) => {
  if (!queryText || !queryText.trim()) return null;

  // 1. Check Smart Landmark Knowledge Base first!
  const smartMatches = searchSmartLandmark(queryText);
  if (smartMatches.length > 0) {
    const top = smartMatches[0];
    return {
      lat: top.lat,
      lng: top.lng,
      name: top.name,
      displayName: `${top.name} - ${top.address}`,
      matchedQuery: top.name,
      isExact: true,
      isSmartLandmark: true
    };
  }

  const raw = queryText.replace(/,\s*,/g, ',').trim();
  const candidates = [raw];

  // 2. Strip house/alley numbers like 2/8/2, 123A/4, 395
  const withoutNum = raw.replace(/^\s*[0-9]+[A-Za-z0-9\/\-\.]*\s+/, '').trim();
  if (withoutNum && withoutNum !== raw) {
    candidates.push(withoutNum);
  }

  // 3. Split components by comma
  const baseStr = withoutNum || raw;
  const parts = baseStr.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const street = parts[0];
    const city = parts[parts.length - 1];
    const district = parts.find(p => /quận|huyện|thị xã|tp\.|thành phố/i.test(p));

    if (district) {
      candidates.push(`${street}, ${district}, ${city}`);
      candidates.push(`${street}, ${district}`);
    }
    candidates.push(`${street}, ${city}`);
    if (district) {
      candidates.push(`${district}, ${city}`);
    }
  }

  const uniqueQueries = [...new Set(candidates.filter(Boolean))];

  for (const q of uniqueQueries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=vn&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(parseFloat(data[0].lat).toFixed(6)),
          lng: parseFloat(parseFloat(data[0].lon).toFixed(6)),
          displayName: data[0].display_name,
          matchedQuery: q,
          isExact: q === raw
        };
      }
    } catch (err) {
      console.warn('Geocoding try failed for:', q, err);
    }
  }

  return null;
};

// Modal for visually picking or searching GPS coordinates for a single stop
const StopMapPickerModal = ({ stop, stopIndex, onConfirm, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
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
      markerRef.current.bindPopup(`<strong>${item.name}</strong><br/>${item.address}`).openPopup();
    }
    setSearchStatus({
      type: 'success',
      msg: `Đã chọn điểm chuẩn: ${item.name} (${item.address})`
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
      geocodeQuery(searchQuery).then(result => {
        if (result && mapInstanceRef.current && markerRef.current) {
          setCurrentCoords({ lat: result.lat, lng: result.lng });
          mapInstanceRef.current.setView([result.lat, result.lng], 16);
          markerRef.current.setLatLng([result.lat, result.lng]);
          markerRef.current.openPopup();
          if (result.isSmartLandmark) {
            setSearchStatus({
              type: 'success',
              msg: `Đã nhận diện chuẩn: ${result.displayName}`
            });
          } else if (!result.isExact) {
            setSearchStatus({
              type: 'info',
              msg: `Đã định vị đến "${result.matchedQuery}". Bạn có thể nhấp chuột để điều chỉnh chính xác số hẻm/nhà.`
            });
          }
        }
      });
    }

    return () => {
      clearTimeout(timer);
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
      const result = await geocodeQuery(searchQuery);
      if (result) {
        setCurrentCoords({ lat: result.lat, lng: result.lng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([result.lat, result.lng], 16);
          markerRef.current.setLatLng([result.lat, result.lng]);
          markerRef.current.openPopup();
        }
        if (result.isSmartLandmark) {
          setSearchStatus({
            type: 'success',
            msg: `Đã nhận diện chính xác: ${result.displayName}`
          });
        } else if (!result.isExact) {
          setSearchStatus({
            type: 'info',
            msg: `Đã định vị đến "${result.matchedQuery}". Bạn có thể nhấp chuột để điều chỉnh đúng số nhà/hẻm!`
          });
        } else {
          setSearchStatus({
            type: 'success',
            msg: `Đã tìm thấy: ${result.displayName.slice(0, 65)}...`
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
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 11000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '780px',
        height: '78vh',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)'
      }}>
        {/* Header */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
              Ghim tọa độ GPS cho: <span style={{ color: '#2563eb' }}>{stop.name || `Trạm ${stopIndex + 1}`}</span>
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Nhấp vào bất kỳ đâu trên bản đồ hoặc kéo ghim đến đúng cổng đón/trả</span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', padding: '5px 12px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
            Đóng
          </button>
        </div>

        {/* Search bar & Smart Suggestions */}
        <div style={{ position: 'relative', padding: '10px 18px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length >= 2) {
                  const suggestions = searchSmartLandmark(val);
                  setSmartSuggestions(suggestions.slice(0, 5));
                } else {
                  setSmartSuggestions([]);
                }
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) {
                  setSmartSuggestions(searchSmartLandmark(searchQuery).slice(0, 5));
                }
              }}
              placeholder="Gõ để tìm kiếm thông minh: Bệnh viện 175, Chợ Rẫy, Bến xe Miền Tây, Hàng Xanh..."
              style={{ flex: 1, padding: '7px 12px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button
              type="submit"
              disabled={searching}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
            >
              {searching ? 'Đang tìm...' : 'Tìm vị trí'}
            </button>
          </form>

          {/* Smart Suggestions Floating Dropdown */}
          {smartSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: '18px', right: '18px',
              backgroundColor: '#ffffff', borderRadius: '8px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.22)', border: '1px solid #cbd5e1',
              zIndex: 9999, overflow: 'hidden', marginTop: '4px'
            }}>
              <div style={{ padding: '6px 12px', fontSize: '0.68rem', fontWeight: '800', color: '#64748b', backgroundColor: '#f1f5f9', textTransform: 'uppercase' }}>
                Gợi ý địa điểm nhận diện thông minh
              </div>
              {smartSuggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => selectLandmark(item)}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: idx === smartSuggestions.length - 1 ? 'none' : '1px solid #f1f5f9',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {item.address}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '10px' }}>
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* In-modal status banner */}
        {searchStatus && (
          <div style={{
            padding: '6px 18px',
            fontSize: '0.74rem',
            fontWeight: '600',
            backgroundColor: searchStatus.type === 'error' ? '#fef2f2' : searchStatus.type === 'info' ? '#eff6ff' : '#ecfdf5',
            color: searchStatus.type === 'error' ? '#b91c1c' : searchStatus.type === 'info' ? '#1d4ed8' : '#047857',
            borderBottom: '1px solid #e2e8f0'
          }}>
            {searchStatus.msg}
          </div>
        )}

        {/* Map */}
        <div style={{ flex: 1, minHeight: '380px', position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px' }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: '#0f172a' }}>
            Tọa độ đã chọn: <strong>{currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '5px 14px', borderRadius: '6px' }}>
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onConfirm(currentCoords.lat, currentCoords.lng)}
              style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '5px 16px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
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
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/ops/routes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRoutes(data.routes || []);
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
      fetchRoutes();
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

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setStartPoint('');
    setEndPoint('');
    setDistance('');
    setDuration('');
    setStops([
      { name: '', address: '', type: 'start' },
      { name: '', address: '', type: 'end' }
    ]);
    setSuggestedEta(null);
    setUserEditedDistance(false);
    setUserEditedDuration(false);
    setShowModal(true);
  };

  const handleOpenEdit = (route) => {
    setEditingRoute(route);
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
  };

  const handleStopChange = (index, field, value) => {
    setStops(prevStops => {
      const updated = [...prevStops];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startPoint.trim() || !endPoint.trim() || !distance.trim() || !duration.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin.', 'error');
      return;
    }

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

            <form onSubmit={handleSubmit}>
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
                      if (stops.length > 0 && (!stops[0].name || stops[0].name === startPoint)) {
                        handleStopChange(0, 'name', val);
                      }
                    }}
                    placeholder="Ví dụ: Cần Thơ"
                    style={{ fontSize: '0.82rem', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
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
                      if (stops.length > 1 && (!stops[stops.length - 1].name || stops[stops.length - 1].name === endPoint)) {
                        handleStopChange(stops.length - 1, 'name', val);
                      }
                    }}
                    placeholder="Ví dụ: Hồ Chí Minh"
                    style={{ fontSize: '0.82rem', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
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
                      }}
                      placeholder="Ví dụ: 172 km"
                      style={{ fontSize: '0.82rem', padding: '8px 30px 8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      required
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
                      }}
                      placeholder="Ví dụ: 3 giờ"
                      style={{ fontSize: '0.82rem', padding: '8px 30px 8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      required
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
                </div>
              </div>

              {/* Stops list: STRICTLY ONLY PICKUP OR DROPOFF */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
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

                {stops.map((stop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === stops.length - 1 && stops.length > 1;
                  const isDropoff = !isFirst && (stop.type === 'dropoff' || isLast);

                  return (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
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
                        style={{ flex: 1.2, padding: '6px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        required
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
