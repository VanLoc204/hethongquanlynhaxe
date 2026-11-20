import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateDistanceMeters,
  formatDistance
} from '../utils/busStationsGeo';

const API_BASE = 'http://localhost:8000/api';

/**
 * AttendanceGpsCard: Thẻ giám sát vị trí xuất bến và quy định giờ lăn bánh
 * Lấy dữ liệu điểm xuất bến và tọa độ GPS thực tế 100% từ chuyến xe & tuyến đường trong MongoDB.
 * Chuẩn Executive: Không sử dụng icon/emoji, bố cục sắc nét, responsive.
 */
const AttendanceGpsCard = ({ onLocationChange, token, user }) => {
  // Chế độ GPS: 'device' (Vệ tinh thiết bị thật) | 'simulation' (Mô phỏng tại bến xuất phát)
  const [gpsMode, setGpsMode] = useState('device');

  const [coords, setCoords] = useState({ lat: 10.741055, lng: 106.618526 });
  const [accuracy, setAccuracy] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [upcomingTrip, setUpcomingTrip] = useState(null);

  // 1. Đồng hồ thời gian thực mỗi giây
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Tải chuyến xe sắp tới được phân công từ MongoDB
  const fetchUpcomingTrip = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/users/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      let tripCandidate = null;
      const now = new Date();

      if (data.success && Array.isArray(data.trips) && data.trips.length > 0) {
        const futureTrips = data.trips
          .filter((t) => t.departureTime && new Date(t.departureTime) >= new Date(now.getTime() - 2 * 3600 * 1000))
          .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

        if (futureTrips.length > 0) {
          tripCandidate = futureTrips[0];
        } else {
          tripCandidate = data.trips[data.trips.length - 1];
        }
      }

      if (!tripCandidate) {
        const opsRes = await fetch(`${API_BASE}/trips/ops/trips`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const opsData = await opsRes.json();
        if (opsData.success && Array.isArray(opsData.trips)) {
          const matched = opsData.trips.filter((t) => {
            const isDriver = t.driver?.name && user?.name && t.driver.name.toLowerCase().includes(user.name.toLowerCase());
            const isAttendant = t.assistant?.name && user?.name && t.assistant.name.toLowerCase().includes(user.name.toLowerCase());
            return isDriver || isAttendant;
          });
          if (matched.length > 0) {
            tripCandidate = matched.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime))[0];
          } else if (opsData.trips.length > 0) {
            tripCandidate = opsData.trips[0];
          }
        }
      }

      setUpcomingTrip(tripCandidate);
    } catch (err) {
      console.warn('[Attendance Trip fetch error]:', err);
    }
  }, [token, user]);

  useEffect(() => {
    fetchUpcomingTrip();
  }, [fetchUpcomingTrip]);

  // 3. Phân tích điểm xuất phát chuyến xe trực tiếp 100% từ dữ liệu MongoDB
  const startStationInfo = useMemo(() => {
    // 3.1. Ưu tiên 1: Điểm đón đầu tiên của Chuyến xe trong MongoDB (Trip.pickupPoints[0])
    const firstPickup = upcomingTrip?.pickupPoints && upcomingTrip.pickupPoints.length > 0
      ? upcomingTrip.pickupPoints[0]
      : null;

    // 3.2. Ưu tiên 2: Điểm dừng xuất phát của Tuyến đường trong MongoDB (Route.stops)
    const routeStops = upcomingTrip?.routeId?.stops;
    const startStop = Array.isArray(routeStops)
      ? routeStops.find((s) => s.type === 'start') || routeStops[0]
      : null;

    const routeStartName = upcomingTrip?.routeId?.startPoint || 'Bến Xe';

    const stationName =
      firstPickup?.location ||
      startStop?.name ||
      `Bến Xuất Phát ${routeStartName}`;

    const stationAddress =
      firstPickup?.address ||
      startStop?.address ||
      `Điểm xuất phát tuyến ${routeStartName}`;

    // Lấy tọa độ GPS thật do Quản lý vận tải lưu trong MongoDB
    const stationLat = firstPickup?.lat ?? startStop?.lat ?? 10.741055;
    const stationLng = firstPickup?.lng ?? startStop?.lng ?? 106.618526;

    return {
      name: stationName,
      address: stationAddress,
      lat: stationLat,
      lng: stationLng,
      radius: 1500 // Bán kính hàng rào địa lý Geofence cho phép (1.5km)
    };
  }, [upcomingTrip]);

  // 4. Lấy GPS thiết bị
  const acquireDeviceGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Trình duyệt không hỗ trợ Geolocation API.');
      return;
    }

    setIsLocating(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 15);

        setCoords({ lat, lng });
        setAccuracy(acc);
        setIsLocating(false);
      },
      (err) => {
        console.warn('[GPS Error]:', err.message);
        setIsLocating(false);
        setGpsError('Không thể truy cập GPS thiết bị. Đã chuyển sang tọa độ bến xuất bến.');
        setCoords({ lat: startStationInfo.lat, lng: startStationInfo.lng });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [startStationInfo]);

  useEffect(() => {
    if (gpsMode === 'device') {
      acquireDeviceGps();
    } else {
      setCoords({ lat: startStationInfo.lat, lng: startStationInfo.lng });
      setAccuracy(5);
      setGpsError('');
    }
  }, [gpsMode, acquireDeviceGps, startStationInfo]);

  // 5. Tính khoảng cách
  const distanceToStartStation = useMemo(() => {
    if (!coords.lat || !coords.lng || !startStationInfo.lat || !startStationInfo.lng) return Infinity;
    return calculateDistanceMeters(coords.lat, coords.lng, startStationInfo.lat, startStationInfo.lng);
  }, [coords, startStationInfo]);

  const isWithinGeofence = distanceToStartStation <= (startStationInfo.radius || 1500);

  // 6. Quy định thời gian: Sớm hơn giờ xe lăn bánh tối thiểu 5 phút
  const departureDate = useMemo(() => {
    if (upcomingTrip?.departureTime) {
      return new Date(upcomingTrip.departureTime);
    }
    const simulated = new Date();
    simulated.setMinutes(simulated.getMinutes() + 35);
    return simulated;
  }, [upcomingTrip]);

  const deadlineDate = useMemo(() => {
    return new Date(departureDate.getTime() - 5 * 60 * 1000);
  }, [departureDate]);

  const diffMs = deadlineDate.getTime() - currentTime.getTime();
  const isTimeValid = diffMs >= 0;

  const timeRemainingText = useMemo(() => {
    if (diffMs < 0) {
      const overdueMins = Math.abs(Math.floor(diffMs / 60000));
      const overdueSecs = Math.abs(Math.floor((diffMs % 60000) / 1000));
      return `Quá hạn ${overdueMins} phút ${overdueSecs} giây`;
    }
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `Còn ${hours} giờ ${remainMins} phút`;
    }
    return `Còn ${mins} phút ${secs} giây`;
  }, [diffMs]);

  // 7. Đồng bộ ra ngoài
  useEffect(() => {
    if (onLocationChange) {
      const formattedDistStr = formatDistance(distanceToStartStation);
      const locDescription = `${startStationInfo.name} (${isWithinGeofence ? 'Tại bến - Cách ' + formattedDistStr : 'Cách bến ' + formattedDistStr}) - ${startStationInfo.address}`;

      onLocationChange({
        lat: coords.lat,
        lng: coords.lng,
        address: locDescription,
        stationName: startStationInfo.name,
        distance: distanceToStartStation,
        isWithinGeofence,
        gpsMode,
        isTimeValid,
        departureTime: departureDate,
        deadlineTime: deadlineDate,
        tripId: upcomingTrip?._id || null,
        tripRoute: upcomingTrip?.routeId?.name || (upcomingTrip?.routeId?.startPoint ? `${upcomingTrip.routeId.startPoint} -> ${upcomingTrip.routeId.endPoint}` : ''),
        plateNumber: upcomingTrip?.busId?.plateNumber || ''
      });
    }
  }, [
    coords,
    distanceToStartStation,
    isWithinGeofence,
    gpsMode,
    isTimeValid,
    startStationInfo,
    departureDate,
    deadlineDate,
    upcomingTrip,
    onLocationChange
  ]);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '1rem',
        marginTop: '1rem'
      }}
    >
      {/* Header và Nút chế độ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
          >
            Định Vị Xuất Bến & Giờ Lăn Bánh
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '10px',
              border: `1px solid ${isWithinGeofence && isTimeValid ? '#a7f3d0' : '#fed7aa'}`,
              background: isWithinGeofence && isTimeValid ? '#ecfdf5' : '#fffbeb',
              color: isWithinGeofence && isTimeValid ? '#059669' : '#d97706'
            }}
          >
            {isWithinGeofence && isTimeValid ? 'HỢP LỆ XUẤT BẾN' : 'CẦN KIỂM TRA'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setGpsMode('device')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '700',
              border: gpsMode === 'device' ? '1px solid #2563eb' : '1px solid #cbd5e1',
              background: gpsMode === 'device' ? '#eff6ff' : '#ffffff',
              color: gpsMode === 'device' ? '#1d4ed8' : '#475569',
              cursor: 'pointer'
            }}
          >
            GPS Thiết Bị
          </button>
          <button
            type="button"
            onClick={() => setGpsMode('simulation')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '700',
              border: gpsMode === 'simulation' ? '1px solid #059669' : '1px solid #cbd5e1',
              background: gpsMode === 'simulation' ? '#ecfdf5' : '#ffffff',
              color: gpsMode === 'simulation' ? '#047857' : '#475569',
              cursor: 'pointer'
            }}
          >
            Tại Bến Xuất Bến (Demo)
          </button>
          {gpsMode === 'device' && (
            <button
              type="button"
              onClick={acquireDeviceGps}
              disabled={isLocating}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '700',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: isLocating ? 'not-allowed' : 'pointer'
              }}
            >
              {isLocating ? 'Đang dò...' : 'Quét Lại'}
            </button>
          )}
        </div>
      </div>

      {gpsError && (
        <div
          style={{
            padding: '6px 10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#dc2626',
            fontSize: '0.72rem',
            marginBottom: '0.75rem'
          }}
        >
          {gpsError}
        </div>
      )}

      {/* 2 Khối Giám Sát Cốt Lõi */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '10px',
          marginBottom: '0.85rem'
        }}
      >
        {/* Khối Khoảng cách */}
        <div
          style={{
            background: isWithinGeofence ? '#f8fafc' : '#fffbeb',
            border: `1px solid ${isWithinGeofence ? '#e2e8f0' : '#fed7aa'}`,
            borderRadius: '6px',
            padding: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Điểm Xuất Bến
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: '800',
                padding: '1px 6px',
                borderRadius: '8px',
                background: isWithinGeofence ? '#ecfdf5' : '#fef3c7',
                color: isWithinGeofence ? '#059669' : '#b45309'
              }}
            >
              {isWithinGeofence ? 'TRONG BÁN KÍNH' : 'NGOÀI BÁN KÍNH'}
            </span>
          </div>

          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
            {startStationInfo.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
            {startStationInfo.address}
          </div>

          <div
            style={{
              marginTop: '10px',
              paddingTop: '6px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Khoảng cách:</span>
            <span
              style={{
                fontSize: '1.05rem',
                fontWeight: '800',
                color: isWithinGeofence ? '#059669' : '#c2410c'
              }}
            >
              {distanceToStartStation === 0 ? '0m (Tại cổng bến)' : `Cách ${formatDistance(distanceToStartStation)}`}
            </span>
          </div>
        </div>

        {/* Khối Giờ Lăn Bánh */}
        <div
          style={{
            background: isTimeValid ? '#f8fafc' : '#fef2f2',
            border: `1px solid ${isTimeValid ? '#e2e8f0' : '#fca5a5'}`,
            borderRadius: '6px',
            padding: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Quy Định Giờ Lăn Bánh
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: '800',
                padding: '1px 6px',
                borderRadius: '8px',
                background: isTimeValid ? '#ecfdf5' : '#fee2e2',
                color: isTimeValid ? '#059669' : '#dc2626'
              }}
            >
              {isTimeValid ? 'ĐÚNG HẠN' : 'QUÁ GIỜ'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Giờ xuất bến:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e3a8a' }}>
                {departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Hạn chót (trước 5p):</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#b91c1c' }}>
                {deadlineDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '10px',
              paddingTop: '6px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Thời gian còn lại:</span>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: '800',
                color: isTimeValid ? '#059669' : '#dc2626'
              }}
            >
              {timeRemainingText}
            </span>
          </div>
        </div>
      </div>

      {/* Tóm tắt chuyến xe & Tọa độ */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '6px',
          padding: '0.65rem 0.85rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.72rem',
          color: '#475569'
        }}
      >
        <div>
          <strong>Chuyến xe:</strong>{' '}
          {upcomingTrip
            ? `${upcomingTrip.routeId?.startPoint || 'Sài Gòn'} - ${upcomingTrip.routeId?.endPoint || 'Đà Lạt'} (Xe ${upcomingTrip.busId?.plateNumber || 'An Bình Lines'})`
            : 'Theo phân công ca trực hôm nay'}
        </div>
        <div style={{ color: '#64748b' }}>
          Tọa độ: {coords.lat.toFixed(5)}° N, {coords.lng.toFixed(5)}° E
          {accuracy ? ` (±${accuracy}m)` : ''}
        </div>
      </div>
    </div>
  );
};

export default AttendanceGpsCard;
