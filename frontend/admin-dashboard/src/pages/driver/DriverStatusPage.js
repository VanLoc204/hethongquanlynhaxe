import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { driverGpsService } from '../../services/driverGpsService';

const DriverStatusPage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [trip, setTrip] = useState(null);
  const [stops, setStops] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Trạng thái GPS toàn cục từ Background Service (quản lý bởi trang Bản đồ)
  const [gpsServiceState, setGpsServiceState] = useState(() => driverGpsService.getState());
  const [distanceToTarget, setDistanceToTarget] = useState(null); // Khoảng cách tới trạm kế tiếp (mét)
  const [autoCheckin, setAutoCheckin] = useState(true); // Tự động check-in khi xe vào bán kính <= 500m (Mặc định: BẬT)

  const lastAutoCheckinIndexRef = useRef(-1);

  // Lắng nghe thay đổi từ driverGpsService (chạy ngầm toàn ứng dụng khi trang Bản đồ phát GPS)
  useEffect(() => {
    const unsubscribe = driverGpsService.addListener((state) => {
      setGpsServiceState(state);
    });
    return unsubscribe;
  }, []);

  // Tính khoảng cách Haversine giữa 2 tọa độ (mét)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const toRad = deg => (deg * Math.PI) / 180;
    const R = 6371e3; // Mét
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Định dạng khoảng cách hiển thị mét hoặc km
  const formatDistance = (meters) => {
    if (meters === null || meters === undefined) return '--';
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // 1. Lấy dữ liệu chuyến xe của tài xế
  const fetchActiveTrip = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const todayStr = new Date().toDateString();
        const todayTrips = (data.trips || []).filter(t => new Date(t.departureTime).toDateString() === todayStr);

        let activeTrip = todayTrips.find(t => t.journeyStatus === 'in_transit') ||
                         todayTrips.find(t => t.journeyStatus === 'scheduled') ||
                         todayTrips[0] ||
                         (data.trips && data.trips[0]) || null;

        if (activeTrip) {
          setTrip(activeTrip);
          buildStops(activeTrip);
        } else {
          setTrip(null);
          setStops([]);
        }
      } else {
        setError(data.message || 'Không thể tải lịch trình phân công.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải hành trình.');
    } finally {
      setLoading(false);
    }
  };

  const buildStops = (tripData) => {
    const stopsList = [];
    if (tripData.pickupPoints && tripData.pickupPoints.length > 0) {
      tripData.pickupPoints.forEach(p => stopsList.push({ ...p, type: 'pickup' }));
    }
    if (tripData.dropoffPoints && tripData.dropoffPoints.length > 0) {
      tripData.dropoffPoints.forEach(d => stopsList.push({ ...d, type: 'dropoff' }));
    }
    setStops(stopsList);
  };

  useEffect(() => {
    if (token) {
      fetchActiveTrip();
    }
  }, [token]);

  // 3. Tự động đồng bộ GPS trực tiếp từ xe (liveGps của chuyến xe đang chạy) mỗi 2.5 giây
  useEffect(() => {
    if (!token || !trip?._id || trip.journeyStatus === 'completed') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/trips/${trip._id}`);
        const data = await res.json();
        if (data.success && data.trip) {
          setTrip(prev => ({
            ...prev,
            liveGps: data.trip.liveGps,
            currentStopIndex: data.trip.currentStopIndex,
            journeyStatus: data.trip.journeyStatus,
            journeyLogs: data.trip.journeyLogs
          }));
        }
      } catch (err) {
        // Silent poll error
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [token, trip?._id, trip?.journeyStatus]);

  const currentStopIndex = trip?.currentStopIndex ?? -1;
  const journeyStatus = trip?.journeyStatus || 'scheduled';
  const journeyLogs = trip?.journeyLogs || [];

  const isNotStarted = journeyStatus === 'scheduled' || currentStopIndex === -1;
  const isCompleted = journeyStatus === 'completed';
  const isLastUpdateStep = currentStopIndex === stops.length - 2;

  // Lấy trạm mục tiêu kế tiếp
  const getNextStop = () => {
    if (isCompleted || stops.length === 0) return null;
    if (isNotStarted) return stops[0];
    if (currentStopIndex < stops.length - 1) {
      return stops[currentStopIndex + 1];
    }
    return stops[stops.length - 1];
  };

  const nextStop = getNextStop();

  // Xác định tọa độ thực tế của xe:
  // CHỈ KHI tài xế nhấn "BẮT ĐẦU & PHÁT GPS" bên trang Bản đồ (isTracking === true)
  // thì hệ thống mới định vị được vị trí xe! Nếu chưa phát GPS bên Bản đồ -> Coi như chưa có tọa độ.
  const isGpsActive = Boolean(gpsServiceState?.isTracking && gpsServiceState?.currentCoord);
  const activeVehicleCoord = isGpsActive ? gpsServiceState.currentCoord : null;
  const isDemoGps = isGpsActive && (gpsServiceState?.trackingMode === 'simulation');

  // 4. Tính khoảng cách và kiểm tra Hàng rào địa lý (Geofencing <= 500m)
  useEffect(() => {
    if (isGpsActive && activeVehicleCoord && nextStop?.lat && nextStop?.lng) {
      const dist = calculateDistance(activeVehicleCoord.lat, activeVehicleCoord.lng, nextStop.lat, nextStop.lng);
      setDistanceToTarget(dist);

      // TỰ ĐỘNG CHECK-IN: Khi xe đi vào bán kính <= 500m của trạm
      if (
        autoCheckin &&
        dist !== null &&
        dist <= 500 &&
        !isCompleted &&
        !isUpdating &&
        lastAutoCheckinIndexRef.current !== currentStopIndex
      ) {
        lastAutoCheckinIndexRef.current = currentStopIndex;
        if (isNotStarted) {
          handleJourneyUpdate('start');
        } else if (isLastUpdateStep) {
          handleJourneyUpdate('complete');
        } else {
          handleJourneyUpdate('update');
        }
        setSuccessMsg(`Đã tự động xác nhận trạm: ${nextStop.location} (Xe vào bán kính ${dist}m)`);
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    } else {
      setDistanceToTarget(null);
    }
  }, [isGpsActive, activeVehicleCoord, nextStop, autoCheckin, isCompleted, isUpdating, currentStopIndex, isNotStarted, isLastUpdateStep]);

  // Cập nhật hành trình lên Server
  const handleJourneyUpdate = async (action) => {
    if (!trip) return;
    setIsUpdating(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/trips/${trip._id}/update-journey`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          bypassTime: true, // Cho phép khởi hành linh hoạt
          enforceDistance: !isDemoGps, // Kiểm tra bán kính nghiêm ngặt nếu là GPS Thật
          userLat: activeVehicleCoord?.lat,
          userLng: activeVehicleCoord?.lng,
          maxRadius: 500
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrip(data.trip);
        buildStops(data.trip);
        if (action === 'reset') {
          setSuccessMsg('Đã đặt lại hành trình thành công! Chuyến xe quay về trạng thái Chưa khởi hành.');
          lastAutoCheckinIndexRef.current = -1;
        } else {
          setSuccessMsg('Cập nhật tiến độ thành công!');
        }
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(data.message || 'Cập nhật hành trình thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi cập nhật hành trình.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Xác nhận Đặt lại chuyến (Reset)
  const handleResetConfirm = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại hành trình về trạng thái ban đầu (Chưa khởi hành) để kiểm thử/demo lại?')) {
      handleJourneyUpdate('reset');
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeStr) => {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const completedStopsCount = isCompleted
    ? stops.length
    : (isNotStarted ? 0 : Math.min(currentStopIndex + 1, stops.length));
  const progressPercent = stops.length > 0 ? Math.round((completedStopsCount / stops.length) * 100) : 0;

  const routeName = trip?.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'Đà Lạt ➔ Hồ Chí Minh';
  const busPlate = trip?.busId?.plateNumber || '51B-029.29';
  const busType = trip?.busId?.type || 'Xe Khách Cao Cấp';
  const assistantName = trip?.assistant?.name || trip?.assistantId?.name || 'Đã phân công phụ xe';

  // Điều kiện kiểm soát bán kính (HÀNG RÀO ĐỊA LÝ GEOFENCING <= 500m):
  // 1. Phải BẬT GPS bên Bản đồ trước (isGpsActive === true). Nếu chưa bật -> Khóa toàn bộ các nút!
  // 2. Khi GPS đã bật:
  //    - Nếu là GPS Mô Phỏng (Demo): Mở quyền khởi hành trạm 1 (isNotStarted).
  //    - Nếu là GPS Thật: Bắt buộc khoảng cách <= 500m mới được mở nút (cả trạm 1 lẫn dọc đường)!
  const isDistanceValid = isGpsActive && distanceToTarget !== null && distanceToTarget <= 500;
  const isWithinRadius = isGpsActive && (isDistanceValid || (isDemoGps && isNotStarted));

  // Khóa nút hoàn toàn nếu:
  // 1. Đang gửi request (isUpdating)
  // 2. Chưa bật GPS hoặc xe chưa vào bán kính hợp lệ (!isWithinRadius)
  const isButtonDisabled = isUpdating || !isWithinRadius;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div style={{
          display: 'inline-block',
          width: '32px',
          height: '32px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <p style={{ color: '#64748b', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
          Đang tải thông tin hành trình xe chạy...
        </p>
      </div>
    );
  }

  if (!trip && !loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px dashed #cbd5e1',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        margin: '1rem 0'
      }}>
        <h3 style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          Không Có Chuyến Xe Nào Cần Cập Nhật Hôm Nay
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
          Bạn hiện không có lịch trình chạy xe nào đang hoạt động hoặc được phân công cho ngày hôm nay.
        </p>
        <button
          onClick={fetchActiveTrip}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%' }}>
      {/* CSS Nhúng phục vụ Responsive đa thiết bị & Animations */}
      <style>{`
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        @keyframes pulse-orange {
          0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
          100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .pulse-blue { animation: pulse-blue 1.5s infinite; }
        .pulse-orange { animation: pulse-orange 1.5s infinite; }

        .status-panel-box {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 0.85rem;
        }

        .status-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .status-header-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .status-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .status-content-grid {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 1.25rem;
          align-items: start;
        }

        /* Responsive Tablet (<= 992px) */
        @media (max-width: 992px) {
          .status-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .status-content-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Responsive Mobile (<= 768px) */
        @media (max-width: 768px) {
          .status-panel-box {
            padding: 1rem 0.85rem;
            border-radius: 12px;
            gap: 1rem;
          }
          .status-header-wrap {
            flex-direction: column;
            align-items: flex-start;
          }
          .status-header-buttons {
            width: 100%;
          }
          .status-header-buttons button {
            flex: 1;
            justify-content: center;
          }
        }

        /* Màn hình điện thoại nhỏ (<= 480px) */
        @media (max-width: 480px) {
          .status-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
          }
          .status-stat-card {
            padding: 0.65rem 0.75rem !important;
          }
          .status-header-buttons {
            flex-direction: column;
          }
          .status-header-buttons button {
            width: 100%;
          }
        }
      `}</style>

      {/* Thông báo lỗi & thành công */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          marginBottom: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: '800', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          fontWeight: '600',
          marginBottom: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* VÙNG 1: CARD TRẮNG HEADER TỔNG QUAN & 4 THẺ THỐNG KÊ (TOP) */}
      {/* ========================================================= */}
      <div className="status-panel-box">
        {/* Top Header & Buttons */}
        <div className="status-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Cập Nhật Lộ Trình &amp; Tiến Độ Xe Chạy
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Tuyến: <strong style={{ color: '#2563eb' }}>{routeName}</strong> | Giờ chạy: <strong>{formatTime(trip?.departureTime)}</strong> ({formatDate(trip?.departureTime)}) | Xe: <strong>{busPlate}</strong> | Phụ xe: <strong>{assistantName}</strong>
            </p>
          </div>

          {/* Quick Header Actions: Reset Demo, Refresh, Map */}
          <div className="status-header-buttons">
            {/* NÚT CỨU CÁNH: ĐẶT LẠI CHUYẾN (RESET DEMO) */}
            <button
              onClick={handleResetConfirm}
              disabled={isUpdating}
              title="Đặt lại chuyến xe về trạng thái Chưa khởi hành (0/9 trạm) để kiểm thử lại từ đầu"
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                fontWeight: '700',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.5">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Đặt Lại Chuyến (Reset)
            </button>

            <button
              onClick={fetchActiveTrip}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontWeight: '600',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                whiteSpace: 'nowrap'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Tải lại
            </button>

            <button
              onClick={() => setActiveTab && setActiveTab('driver-map')}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                whiteSpace: 'nowrap'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Bản Đồ Di Chuyển GPS
            </button>
          </div>
        </div>

        {/* 4 Key Stat Cards */}
        <div className="status-stat-grid">
          {/* Card 1: Trạng thái chuyến */}
          <div className="status-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TRẠNG THÁI CHUYẾN
              </span>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: isCompleted ? '#ecfdf5' : (isNotStarted ? '#fffbeb' : '#eff6ff'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isCompleted ? '#10b981' : (isNotStarted ? '#d97706' : '#2563eb')} strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: '800',
              color: isCompleted ? '#059669' : (isNotStarted ? '#d97706' : '#2563eb'),
              marginBottom: '2px',
              lineHeight: '1.2'
            }}>
              {isCompleted ? 'Hoàn thành' : (isNotStarted ? 'Chưa khởi hành' : 'Đang di chuyển')}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600' }}>
              ▲ Khởi hành: {formatTime(trip?.departureTime)}
            </div>
          </div>

          {/* Card 2: Điểm đến tiếp theo */}
          <div className="status-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ĐIỂM ĐẾN TIẾP THEO
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '2px',
              lineHeight: '1.2',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {isCompleted ? 'Đã đến bến cuối' : (nextStop?.location || 'Bến xuất phát')}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              Trạm {isNotStarted ? 1 : Math.min(currentStopIndex + 2, stops.length)} / {stops.length} điểm dừng
            </div>
          </div>

          {/* Card 3: Khoảng cách GPS tới trạm */}
          <div className="status-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                KHOẢNG CÁCH TỚI TRẠM
              </span>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: !isGpsActive ? '#f8fafc' : (isWithinRadius ? '#ecfdf5' : '#fff1f2'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!isGpsActive ? '#94a3b8' : (isWithinRadius ? '#10b981' : '#e11d48')} strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
            </div>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: '800',
              color: !isGpsActive ? '#94a3b8' : (isWithinRadius ? '#16a34a' : '#be123c'),
              marginBottom: '2px',
              lineHeight: '1.2'
            }}>
              {!isGpsActive ? 'Chưa bật GPS' : formatDistance(distanceToTarget)}
            </div>
            <div style={{
              fontSize: '0.68rem',
              fontWeight: '700',
              color: !isGpsActive ? '#64748b' : (isWithinRadius ? '#16a34a' : '#be123c')
            }}>
              {!isGpsActive
                ? '⚠️ Bật GPS bên Bản đồ'
                : isWithinRadius
                  ? (isDemoGps && isNotStarted ? '✓ GPS Demo: Cho phép khởi hành' : '✓ Trong bán kính trạm (≤ 500m)')
                  : '✕ Quá xa (> 500m: Khóa nút bấm)'}
            </div>
          </div>

          {/* Card 4: Tiến độ hành trình */}
          <div className="status-stat-card" style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TIẾN ĐỘ HÀNH TRÌNH
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {completedStopsCount} / {stops.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>trạm ({progressPercent}%)</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: '#10b981', transition: 'width 0.4s ease' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: CARD TRẮNG ĐIỀU KHIỂN & TIMELINE LỘ TRÌNH (BOTTOM) */}
      {/* ========================================================= */}
      <div className="status-panel-box">
        {/* Panel Header & Tùy chọn Tự Động Check-in */}
        <div className="status-header-wrap" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Bảng Điều Khiển Điểm Dừng &amp; Lộ Trình
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
              Hệ thống tự động tính khoảng cách GPS thực tế từ xe đến trạm dừng để kiểm soát check-in chính xác
            </p>
          </div>

          {/* Trạng thái GPS nhận từ Bản đồ & Switch Tự Động Check-in */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Hiển thị chế độ GPS được chọn và phát từ bên Bản đồ (Chỉ xem, quyết định ở Bản đồ) */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isGpsActive ? (isDemoGps ? '#eff6ff' : '#ecfdf5') : '#f8fafc',
              border: `1px solid ${isGpsActive ? (isDemoGps ? '#bfdbfe' : '#bbf7d0') : '#e2e8f0'}`,
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: '700',
              color: isGpsActive ? (isDemoGps ? '#1d4ed8' : '#15803d') : '#64748b'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isGpsActive ? '#10b981' : '#cbd5e1',
                display: 'inline-block'
              }}></span>
              <span>
                {isGpsActive
                  ? (isDemoGps ? 'GPS Mô Phỏng (Đang phát)' : 'GPS Thiết Bị Thật (Đang phát)')
                  : 'GPS Chưa Bật'}
              </span>
            </div>

            {/* Switch: Tự động Check-in khi xe đến (<= 500m) */}
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              background: autoCheckin ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${autoCheckin ? '#bfdbfe' : '#e2e8f0'}`,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: autoCheckin ? '#1d4ed8' : '#64748b',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="checkbox"
                checked={autoCheckin}
                onChange={e => setAutoCheckin(e.target.checked)}
                style={{ cursor: 'pointer', width: '14px', height: '14px' }}
              />
              <span>Tự Động Check-in khi xe đến (&le; 500m)</span>
            </label>
          </div>
        </div>

        {/* Khối nội dung 2 cột: Cột trái (Thao tác) - Cột phải (Timeline) */}
        <div className="status-content-grid">
          
          {/* CỘT TRÁI: THAO TÁC CẬP NHẬT HÀNH TRÌNH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Box nổi bật điểm đến tiếp theo */}
            <div style={{
              padding: '1.25rem',
              background: isCompleted ? '#ecfdf5' : '#eff6ff',
              borderRadius: '12px',
              border: `1px solid ${isCompleted ? '#a7f3d0' : '#bfdbfe'}`,
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  color: isCompleted ? '#065f46' : '#1e40af',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  {isCompleted
                    ? 'TRẠNG THÁI CHUYẾN'
                    : (isNotStarted
                        ? 'ĐIỂM BẮT ĐẦU KHỞI HÀNH'
                        : (isLastUpdateStep ? 'BẾN ĐÍCH (ĐIỂM CUỐI)' : `ĐIỂM ĐẾN TIẾP THEO (TRẠM ${currentStopIndex + 2})`))}
                </span>

                {/* Badge khoảng cách */}
                {!isCompleted && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: !isGpsActive ? '#fef2f2' : (isWithinRadius ? '#dcfce7' : '#fff1f2'),
                    color: !isGpsActive ? '#b91c1c' : (isWithinRadius ? '#15803d' : '#be123c'),
                    border: `1px solid ${!isGpsActive ? '#fecaca' : (isWithinRadius ? '#86efac' : '#fecdd3')}`
                  }}>
                    {!isGpsActive
                      ? 'Chưa bật GPS'
                      : isWithinRadius
                        ? (isDemoGps && isNotStarted ? '✓ GPS Demo mở quyền' : '✓ Trong bán kính ≤ 500m')
                        : `Cách: ${formatDistance(distanceToTarget)}`}
                  </span>
                )}
              </div>

              <h3 style={{
                margin: '6px 0 4px 0',
                fontSize: '1.2rem',
                color: isCompleted ? '#065f46' : '#1e3a8a',
                fontWeight: '800'
              }}>
                {isCompleted ? 'Hành Trình Đã Hoàn Thành An Toàn' : (nextStop?.location || 'Bến xuất phát')}
              </h3>

              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: isCompleted ? '#047857' : '#2563eb',
                lineHeight: '1.4'
              }}>
                {isCompleted ? 'Chuyến xe đã hoàn thành toàn bộ lộ trình.' : (nextStop?.address || 'Vui lòng chuẩn bị xuất bến')}
              </p>
            </div>


            {!isCompleted && isGpsActive && !isWithinRadius && (
              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                color: '#9f1239',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>⚠️</span>
                <div>
                  <strong>Ngoài phạm vi cho phép:</strong> Xe đang cách {isNotStarted ? 'bến xuất phát' : 'trạm dừng'}{' '}
                  <strong>{formatDistance(distanceToTarget)}</strong>. Nút bấm xác nhận bị <strong>KHÓA CHẶT</strong> và chỉ mở khi xe di chuyển vào bán kính <strong>&le; 500m</strong>.
                </div>
              </div>
            )}

            {/* Nút bấm hành động chính (CTA Button) */}
            <div>
              {isCompleted ? (
                <div style={{
                  padding: '1rem',
                  background: '#f0fdf4',
                  borderRadius: '10px',
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                  color: '#15803d',
                  fontSize: '0.82rem',
                  fontWeight: '700'
                }}>
                  ✓ Chuyến xe đã hoàn thành toàn bộ lộ trình. Bấm "Đặt Lại Chuyến (Reset)" ở trên nếu muốn kiểm thử lại.
                </div>
              ) : isNotStarted ? (
                <div>
                  <button
                    onClick={() => handleJourneyUpdate('start')}
                    disabled={isButtonDisabled}
                    style={{
                      width: '100%',
                      padding: '1.1rem',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: '800',
                      cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                      background: isButtonDisabled ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      boxShadow: isButtonDisabled ? 'none' : '0 4px 12px rgba(37,99,235,0.25)',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={e => { if (!isButtonDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { if (!isButtonDisabled) e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {isUpdating
                      ? 'Đang kích hoạt...'
                      : !isGpsActive
                        ? 'Chưa Bật GPS (Vui Lòng Bật Tại Trang Bản Đồ)'
                        : isWithinRadius
                          ? (isDemoGps ? 'Bắt Đầu Khởi Hành (Chế Độ Demo)' : 'Bắt Đầu Khởi Hành Rời Bến')
                          : `Chưa đến bến xuất phát (Cách ${formatDistance(distanceToTarget)})`}
                  </button>
                  {!isGpsActive && setActiveTab && (
                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                      <button
                        onClick={() => setActiveTab('driver-map')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        ➔ Chuyển sang Bản đồ để Bắt Đầu &amp; Phát GPS
                      </button>
                    </div>
                  )}
                </div>
              ) : isLastUpdateStep ? (
                <div>
                  <button
                    onClick={() => handleJourneyUpdate('complete')}
                    disabled={isButtonDisabled}
                    style={{
                      width: '100%',
                      padding: '1.1rem',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: '800',
                      cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                      background: isButtonDisabled ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      boxShadow: isButtonDisabled ? 'none' : '0 4px 12px rgba(16,185,129,0.25)',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={e => { if (!isButtonDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { if (!isButtonDisabled) e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isUpdating
                      ? 'Đang cập nhật...'
                      : !isGpsActive
                        ? 'Chưa Bật GPS (Vui Lòng Bật Tại Trang Bản Đồ)'
                        : isWithinRadius
                          ? 'Kết Thúc Hành Trình (Hoàn Thành Chuyến)'
                          : `Chưa đến trạm cuối (Cách ${formatDistance(distanceToTarget)})`}
                  </button>
                  {!isGpsActive && setActiveTab && (
                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                      <button
                        onClick={() => setActiveTab('driver-map')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        ➔ Chuyển sang Bản đồ để Bắt Đầu &amp; Phát GPS
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => handleJourneyUpdate('update')}
                    disabled={isButtonDisabled}
                    style={{
                      width: '100%',
                      padding: '1.1rem',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: '800',
                      cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                      background: isButtonDisabled ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#ffffff',
                      boxShadow: isButtonDisabled ? 'none' : '0 4px 12px rgba(245,158,11,0.25)',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={e => { if (!isButtonDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { if (!isButtonDisabled) e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isUpdating
                      ? 'Đang ghi nhận...'
                      : !isGpsActive
                        ? 'Chưa Bật GPS (Vui Lòng Bật Tại Trang Bản Đồ)'
                        : isWithinRadius
                          ? `Xác Nhận Đã Đến: ${nextStop?.location || 'Trạm Kế Tiếp'}`
                          : `Chưa đến trạm (Cách ${formatDistance(distanceToTarget)})`}
                  </button>
                  {!isGpsActive && setActiveTab && (
                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                      <button
                        onClick={() => setActiveTab('driver-map')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        ➔ Chuyển sang Bản đồ để Bắt Đầu &amp; Phát GPS
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Thông tin chuyến xe phân công chi tiết */}
            <div style={{
              padding: '1rem 1.25rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '0.72rem',
                color: '#64748b',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.75rem'
              }}>
                THÔNG TIN CHUYẾN XE PHÂN CÔNG:
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.65rem',
                fontSize: '0.78rem',
                color: '#0f172a'
              }}>
                <div>Tuyến: <strong>{routeName}</strong></div>
                <div>Giờ đi: <strong style={{ color: '#2563eb' }}>{formatTime(trip?.departureTime)}</strong> ({formatDate(trip?.departureTime)})</div>
                <div>Biển số xe: <strong>{busPlate}</strong></div>
                <div>Tài xế: <strong>{trip?.driver?.name || user?.name || 'Trần Minh Tâm'}</strong></div>
                <div>Phụ xe: <strong>{assistantName}</strong></div>
                <div>Số điểm dừng: <strong>{stops.length} điểm</strong></div>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI: NHẬT KÝ & LỘ TRÌNH TRẠM DỪNG (TIMELINE) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>
                Lộ Trình Trạm Dừng Tuyến ({stops.length} điểm)
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Đã qua {completedStopsCount}/{stops.length} trạm
              </span>
            </div>

            {/* Timeline container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1.5rem' }}>
              {/* Vertical timeline line */}
              <div style={{
                position: 'absolute',
                left: '6px',
                top: '6px',
                bottom: '6px',
                width: '2px',
                backgroundColor: '#e2e8f0'
              }}></div>

              {stops.map((stop, idx) => {
                const isVisited = currentStopIndex >= idx && !isNotStarted;
                const isCurrent = currentStopIndex === idx && !isNotStarted;

                // Khớp log trong journeyLogs
                const matchingLog = (journeyLogs || []).find(l => l.location === stop.location);

                let displayTime = `Dự kiến: ${stop.time || '--:--'}`;
                let displayDesc = stop.type === 'pickup' ? `Chờ đón khách tại ${stop.location}` : `Chờ trả khách tại ${stop.location}`;

                if (isVisited && matchingLog) {
                  const dateObj = new Date(matchingLog.time);
                  displayTime = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')} - ${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                  displayDesc = matchingLog.desc;
                } else if (isVisited && idx === 0) {
                  const dateObj = journeyLogs[0] ? new Date(journeyLogs[0].time) : new Date();
                  displayTime = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')} - ${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                  displayDesc = `Xe xuất phát từ ${stop.location}`;
                }

                // Tính khoảng cách tới từng trạm nếu có GPS
                const distToThisStop = activeVehicleCoord && stop.lat && stop.lng
                  ? calculateDistance(activeVehicleCoord.lat, activeVehicleCoord.lng, stop.lat, stop.lng)
                  : null;

                const isPickup = stop.type === 'pickup';
                const dotColor = isPickup ? '#2563eb' : '#f97316';
                const typeLabel = isPickup ? 'Điểm Đón' : 'Điểm Trả';
                const labelBg = isPickup ? '#eff6ff' : '#fff7ed';
                const labelColor = isPickup ? '#1e40af' : '#c2410c';

                return (
                  <div key={idx} style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    opacity: isVisited || isCurrent ? 1 : 0.6
                  }}>
                    {/* Bullet node */}
                    <span
                      className={isCurrent ? (isPickup ? 'pulse-blue' : 'pulse-orange') : ''}
                      style={{
                        position: 'absolute',
                        left: '-1.85rem',
                        top: '0.2rem',
                        width: isCurrent ? '14px' : '10px',
                        height: isCurrent ? '14px' : '10px',
                        borderRadius: '50%',
                        backgroundColor: isVisited || isCurrent ? dotColor : '#cbd5e1',
                        border: '2px solid #ffffff',
                        zIndex: 2,
                        transition: 'all 0.2s'
                      }}
                    ></span>

                    {/* Header trạm: Giờ, Type badge & Khoảng cách */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: isVisited ? '#0f172a' : '#64748b' }}>
                        {displayTime}
                      </span>

                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: labelBg,
                        color: labelColor,
                        textTransform: 'uppercase'
                      }}>
                        {typeLabel}
                      </span>

                      {isCurrent && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          animation: 'blink 1.2s infinite ease-in-out'
                        }}>
                          Đang ở đây
                        </span>
                      )}

                      {isVisited && !isCurrent && (
                        <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '700' }}>
                          ✓ Đã qua
                        </span>
                      )}

                      {/* Khoảng cách live tới trạm này nếu chưa qua */}
                      {!isVisited && distToThisStop !== null && (
                        <span style={{
                          fontSize: '0.65rem',
                          color: distToThisStop <= 500 ? '#16a34a' : '#64748b',
                          fontWeight: distToThisStop <= 500 ? '800' : '500'
                        }}>
                          (Cách: {formatDistance(distToThisStop)})
                        </span>
                      )}
                    </div>

                    {/* Tên trạm / Mô tả */}
                    <div style={{
                      fontSize: '0.85rem',
                      color: isVisited ? '#0f172a' : '#334155',
                      fontWeight: isVisited || isCurrent ? '800' : '500'
                    }}>
                      {displayDesc}
                    </div>

                    {/* Địa chỉ */}
                    <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>
                      Địa chỉ: {stop.address}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DriverStatusPage;
