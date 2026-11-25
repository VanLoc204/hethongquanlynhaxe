import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import AutoFaceEnrollModal from '../../components/AutoFaceEnrollModal';
import {
  loadFaceApiModels,
  startWebcam,
  stopWebcam,
  detectFaceAndExtractDescriptor,
  drawDetectionBox,
  clearCanvas,
  formatRoleDisplayName,
  captureSnapshot,
  verifyFaceMatch,
  computeFaceConfidence
} from '../../utils/faceApiHelper';

import AttendanceGpsCard from '../../components/AttendanceGpsCard';

const API_BASE = 'http://localhost:8000/api';

const AttendantAttendancePage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);

  // Trạng thái AI Models & Camera
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [faceStatusHint, setFaceStatusHint] = useState('');
  const [registeredDescriptors, setRegisteredDescriptors] = useState([]);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [showAutoEnrollModal, setShowAutoEnrollModal] = useState(false);
  const [faceMatchResult, setFaceMatchResult] = useState({ isMatch: true, similarity: 100, bestDistance: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const blinkRef = useRef({ state: 'open', lastTime: Date.now() });

  // Trạng thái chấm công từ Backend
  const [todayStatus, setTodayStatus] = useState('not_checked'); // not_checked | scheduled | active | closed
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // GPS & Định vị
  const [gpsLocation, setGpsLocation] = useState({
    lat: null,
    lng: null,
    address: 'Đang xác định GPS...',
    gpsMode: 'device',
    isWithinGeofence: false,
    distance: Infinity
  });
  const [notification, setNotification] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Đồng bộ tọa độ GPS & Bến xe thông minh từ AttendanceGpsCard
  const handleGpsLocationChange = useCallback((loc) => {
    setGpsLocation({
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address,
      stationName: loc.stationName,
      distance: loc.distance,
      isWithinGeofence: loc.isWithinGeofence,
      gpsMode: loc.gpsMode || 'device',
      isTimeValid: loc.isTimeValid,
      departureTime: loc.departureTime,
      deadlineTime: loc.deadlineTime,
      tripId: loc.tripId || null,
      tripRoute: loc.tripRoute || '',
      plateNumber: loc.plateNumber || ''
    });
  }, []);

  // 2. Tải lịch sử và trạng thái chấm công hôm nay của phụ xe
  const fetchMyAttendance = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/mine?limit=15`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const isClosed = data.todayRecord && (data.todayRecord.status === 'closed' || data.todayRecord.checkOutTime != null);
        const computedStatus = (data.todayRecord && data.todayRecord.status === 'active')
          ? 'active'
          : isClosed
          ? 'closed'
          : (data.todayStatus === 'on_time' || data.todayStatus === 'late'
              ? (data.todayRecord ? 'closed' : data.todayStatus)
              : (data.todayStatus || 'not_checked'));
        setTodayStatus(computedStatus);
        setTodayRecord(data.todayRecord || null);
        setHistory(data.history || []);
        if (Array.isArray(data.faceDescriptors) && data.faceDescriptors.length > 0) {
          setRegisteredDescriptors(data.faceDescriptors);
          setFaceRegistered(true);
        } else {
          setRegisteredDescriptors([]);
          setFaceRegistered(Boolean(data.faceRegistered));
        }
      }
    } catch (err) {
      console.error('[fetchMyAttendance Error]:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMyAttendance();
    }
  }, [token, fetchMyAttendance]);

  // 3. Khởi động AI Models
  useEffect(() => {
    let isMounted = true;
    loadFaceApiModels()
      .then(() => {
        if (isMounted) setModelsReady(true);
      })
      .catch((err) => {
        if (isMounted) setCameraError('Không thể nạp mô hình nhận diện: ' + err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Bật / Tắt Webcam
  const handleStartCamera = async () => {
    setCameraError('');
    try {
      const stream = await startWebcam(videoRef.current);
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error('[Camera Error]:', err);
      setCameraError('Không thể truy cập Camera. Vui lòng cấp quyền máy ảnh.');
    }
  };

  const handleStopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    stopWebcam(streamRef.current);
    streamRef.current = null;
    setCameraActive(false);
    setFaceDetected(false);
    setLivenessVerified(false);
    setFaceStatusHint('');
    if (canvasRef.current) clearCanvas(canvasRef.current);
  };

  useEffect(() => {
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      stopWebcam(streamRef.current);
    };
  }, []);

  // 5. Vòng quét AI thời gian thực
  const runFaceDetectionLoop = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= 2) {
        const { detection, descriptor, eyeAspectRatio } = await detectFaceAndExtractDescriptor(video, 320);

        if (detection && descriptor) {
          setFaceDetected(true);

          if (eyeAspectRatio !== null) {
            const now = Date.now();
            const EAR_THRESHOLD = 0.23;
            if (eyeAspectRatio < EAR_THRESHOLD) {
              if (blinkRef.current.state === 'open') {
                blinkRef.current.state = 'closing';
              }
            } else {
              if (blinkRef.current.state === 'closing') {
                if (now - blinkRef.current.lastTime > 150) {
                  setLivenessVerified(true);
                  blinkRef.current.lastTime = now;
                }
                blinkRef.current.state = 'open';
              }
            }
          }

          let boxColor = '#10b981';
          let boxLabel = formatRoleDisplayName('Phụ xe', user?.name || '');

          if (registeredDescriptors.length > 0) {
            const match = verifyFaceMatch(descriptor, registeredDescriptors, 0.38);
            setFaceMatchResult(match);

            if (match.isMatch) {
              boxColor = '#10b981';
              boxLabel = `${formatRoleDisplayName('Phụ xe', user?.name || '')} (${match.similarity}% khớp)`;
              setFaceStatusHint('Nhận diện chính xác nhân viên');
            } else {
              boxColor = '#ef4444';
              boxLabel = `CẢNH BÁO: Không khớp (${match.similarity}%)`;
              setFaceStatusHint('Khuôn mặt không khớp mẫu đăng ký!');
            }
          } else {
            boxColor = '#3b82f6';
            boxLabel = `${formatRoleDisplayName('Phụ xe', user?.name || '')} (Chưa đăng ký mẫu)`;
            setFaceStatusHint('Chưa có mẫu đăng ký trước');
          }

          drawDetectionBox(canvas, video, detection, boxLabel, boxColor, true);
        } else {
          setFaceDetected(false);
          setFaceStatusHint('');
          clearCanvas(canvas);
        }
      }
    } catch {
      // Bỏ qua lỗi khung hình tạm thời
    }

    if (cameraActive) {
      scanLoopRef.current = requestAnimationFrame(runFaceDetectionLoop);
    }
  }, [cameraActive, registeredDescriptors, user]);

  useEffect(() => {
    if (cameraActive) {
      scanLoopRef.current = requestAnimationFrame(runFaceDetectionLoop);
    } else {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    }
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [cameraActive, runFaceDetectionLoop]);

  // 6. Xử lý Chấm công Vào ca / Tan ca
  const handleAttendanceAction = async (actionType) => {
    if (actionLoading) return;
    if (!cameraActive) {
      showToast('Vui lòng bật Camera để quét khuôn mặt!', 'error');
      return;
    }
    if (!faceDetected) {
      showToast('Không tìm thấy khuôn mặt. Vui lòng nhìn thẳng vào camera!', 'error');
      return;
    }

    setActionLoading(true);

    try {
      const { descriptor } = await detectFaceAndExtractDescriptor(videoRef.current, 416);

      if (!descriptor || descriptor.length !== 128) {
        showToast('Chất lượng quét chưa đạt. Vui lòng giữ yên khuôn mặt!', 'error');
        setActionLoading(false);
        return;
      }

      if (registeredDescriptors.length > 0) {
        const matchCheck = verifyFaceMatch(descriptor, registeredDescriptors, 0.38);
        if (!matchCheck.isMatch) {
          showToast('Khuôn mặt không khớp với hồ sơ nhân sự. Vui lòng thử lại!', 'error');
          setActionLoading(false);
          return;
        }
      }

      // Kiểm tra quy định thời gian: Phải sớm hơn giờ xe lăn bánh tối thiểu 5 phút
      if (actionType === 'check-in') {
        if (gpsLocation.isTimeValid === false) {
          const proceed = window.confirm('Chấm công muộn hơn quy định giờ lăn bánh. Tiếp tục xác nhận?');
          if (!proceed) {
            setActionLoading(false);
            return;
          }
        }

        // Chặn nghiêm ngặt nếu đang dùng GPS Thiết Bị mà ở ngoài bán kính bến xe (1.5km)
        if (gpsLocation.gpsMode === 'device' && gpsLocation.isWithinGeofence === false) {
          const distKm = gpsLocation.distance
            ? (gpsLocation.distance >= 1000
              ? `${(gpsLocation.distance / 1000).toFixed(1)}km`
              : `${Math.round(gpsLocation.distance)}m`)
            : 'quá xa';
          showToast(`Chưa đến bến xe (cách ${distKm}, bán kính cho phép 1.5km).`, 'error');
          setActionLoading(false);
          return;
        }
      }

      const photoSnapshot = captureSnapshot(videoRef.current, 0.75, 480);

      const endpoint = actionType === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';
      const payload =
        actionType === 'check-in'
          ? {
            faceDescriptor: descriptor,
            checkInPhoto: photoSnapshot,
            isLiveVerified: livenessVerified,
            location: gpsLocation.address,
            gpsLat: gpsLocation.lat,
            gpsLng: gpsLocation.lng,
            tripId: gpsLocation.tripId || null
          }
          : {
            faceDescriptor: descriptor,
            checkOutPhoto: photoSnapshot,
            location: gpsLocation.address,
            gpsLat: gpsLocation.lat,
            gpsLng: gpsLocation.lng,
            tripId: gpsLocation.tripId || null
          };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message || 'Chấm công thành công!', 'success');
        setTodayStatus(actionType === 'check-in' ? 'active' : 'closed');
        fetchMyAttendance();
      } else {
        if (data.message && data.message.includes('đã bắt đầu ca')) {
          setTodayStatus('active');
          fetchMyAttendance();
          showToast(data.message, 'info');
        } else {
          showToast(data.message || 'Xác thực thất bại. Vui lòng thử lại!', 'error');
        }
      }
    } catch (err) {
      console.error('[Attendance Action Error]:', err);
      showToast('Lỗi kết nối máy chủ khi chấm công.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 6b. Tự chụp ảnh & kích hoạt Face ID cho phụ xe chưa có dữ liệu mẫu
  const handleSelfEnrollFace = async () => {
    if (!videoRef.current || !faceDetected) {
      showToast('Vui lòng nhìn thẳng vào camera và giữ yên khuôn mặt!', 'error');
      return;
    }

    setIsRegisteringFace(true);
    try {
      const { descriptor } = await detectFaceAndExtractDescriptor(videoRef.current, 416);
      if (!descriptor || descriptor.length !== 128) {
        showToast('Chất lượng quét chưa đạt. Vui lòng thử lại!', 'error');
        setIsRegisteringFace(false);
        return;
      }

      const photoSnapshot = captureSnapshot(videoRef.current, 0.85, 480);

      const res = await fetch(`${API_BASE}/attendance/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          faceDescriptors: [descriptor],
          facePhoto: photoSnapshot
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRegisteredDescriptors([descriptor]);
        setFaceRegistered(true);
        showToast('Đăng ký khuôn mặt thành công!', 'success');
        fetchMyAttendance();
      } else {
        showToast(data.message || 'Lỗi lưu dữ liệu khuôn mặt.', 'error');
      }
    } catch (err) {
      console.error('[Self Enroll Error]:', err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsRegisteringFace(false);
    }
  };

  // 7. Đặt lại (Reset) dữ liệu ca trực hôm nay để phục vụ test/demo
  const handleResetTodayAttendance = async () => {
    const confirmReset = window.confirm('Đặt lại ca trực hôm nay để kiểm thử lại?');
    if (!confirmReset) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/reset-today`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đặt lại ca trực thành công!', 'success');
        setTodayStatus('not_checked');
        setTodayRecord(null);
        await fetchMyAttendance();
      } else {
        showToast(data.message || 'Không thể đặt lại dữ liệu.', 'error');
      }
    } catch (err) {
      console.error('[Reset Today Error]:', err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Trạng thái cấm chấm công do ở ngoài bán kính bến xe ở chế độ GPS thiết bị thật
  const isGpsBlocked =
    todayStatus !== 'active' &&
    gpsLocation.gpsMode === 'device' &&
    gpsLocation.isWithinGeofence === false;

  const distText =
    gpsLocation.distance && isFinite(gpsLocation.distance)
      ? gpsLocation.distance >= 1000
        ? `${(gpsLocation.distance / 1000).toFixed(1)}km`
        : `${Math.round(gpsLocation.distance)}m`
      : 'quá xa';

  return (
    <div className="attendance-page-container" style={{ animation: 'fadeIn 0.25s ease', maxWidth: '1280px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      <style>{`
        .attendance-page-container {
          padding-left: 12px;
          padding-right: 12px;
        }
        .attendance-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: 16px;
        }
        @media (max-width: 1024px) {
          .attendance-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        .executive-box {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 1.15rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        @media (max-width: 640px) {
          .attendance-page-container {
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
          .executive-box {
            padding: 0.85rem !important;
            border-radius: 8px;
          }
        }
      `}</style>

      {/* ── HEADER QUẢN TRỊ CA TRỰC ── */}
      <div className="executive-box" style={{ marginBottom: '1rem', padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.2px', lineHeight: 1.3 }}>
            Chấm Công Nhận Diện Khuôn Mặt
          </h1>

          <button
            type="button"
            onClick={handleResetTodayAttendance}
            disabled={actionLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              minWidth: '30px',
              backgroundColor: '#ffffff',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '6px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              padding: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
            title="Đặt lại ca trực hôm nay (Reset test)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span
            style={{
              background:
                todayStatus === 'closed'
                  ? '#ecfdf5'
                  : todayStatus === 'active'
                    ? '#eff6ff'
                    : todayStatus === 'absent'
                      ? '#fef2f2'
                      : '#fef3c7',
              color:
                todayStatus === 'closed'
                  ? '#059669'
                  : todayStatus === 'active'
                    ? '#1d4ed8'
                    : todayStatus === 'absent'
                      ? '#b91c1c'
                      : '#b45309',
              border: `1px solid ${
                todayStatus === 'closed'
                  ? '#a7f3d0'
                  : todayStatus === 'active'
                    ? '#bfdbfe'
                    : todayStatus === 'absent'
                      ? '#fecaca'
                      : '#fde68a'
              }`,
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.67rem',
              fontWeight: '700',
              whiteSpace: 'nowrap'
            }}
          >
            {todayStatus === 'closed'
              ? 'ĐÃ HOÀN THÀNH CA'
              : todayStatus === 'active'
                ? 'ĐANG TRỰC CA'
                : todayStatus === 'absent'
                  ? 'VẮNG KHÔNG PHÉP'
                  : 'CHƯA CHECK-IN'}
          </span>
          <span
            style={{
              background: faceRegistered ? '#ecfdf5' : '#fef3c7',
              color: faceRegistered ? '#059669' : '#b45309',
              border: `1px solid ${faceRegistered ? '#a7f3d0' : '#fde68a'}`,
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.67rem',
              fontWeight: '700',
              whiteSpace: 'nowrap'
            }}
          >
            {faceRegistered ? 'ĐÃ ĐĂNG KÝ FACE ID' : 'CHƯA ĐĂNG KÝ FACE ID'}
          </span>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.73rem', margin: 0, lineHeight: 1.45 }}>
          Xác thực khuôn mặt sinh trắc học và đối soát vị trí xuất bến của chuyến xe được phân công.
        </p>
      </div>

      {/* ── BỐ CỤC 2 CỘT RESPONSIVE ── */}
      <div className="attendance-grid">
        {/* CỘT TRÁI: CAMERA VÀ ĐỊNH VỊ XUẤT BẾN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card Camera Xác Thực */}
          <div className="executive-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                Camera Xác Thực Khuôn Mặt
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: modelsReady ? '#ecfdf5' : '#fffbeb',
                  color: modelsReady ? '#059669' : '#d97706',
                  border: `1px solid ${modelsReady ? '#a7f3d0' : '#fed7aa'}`
                }}
              >
                {modelsReady ? 'MÔ HÌNH SẴN SÀNG' : 'ĐANG TẢI MÔ HÌNH...'}
              </span>
            </div>

            {/* Khung hình Webcam */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/10',
                maxHeight: '380px',
                backgroundColor: '#0f172a',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: cameraActive ? 'block' : 'none'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              />

              {/* THÔNG BÁO KẾT QUẢ CHECK-IN / CHECK-OUT */}
              {notification && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    padding: '7px 18px',
                    borderRadius: '20px',
                    background:
                      notification.type === 'error'
                        ? 'rgba(30, 41, 59, 0.92)'
                        : 'rgba(5, 150, 105, 0.92)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    border: `1px solid ${notification.type === 'error' ? '#ef4444' : '#10b981'}`,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(6px)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {notification.message}
                </div>
              )}

              {!cameraActive && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.85rem' }}>
                    Camera chưa được kích hoạt
                  </div>
                  <button
                    onClick={handleStartCamera}
                    disabled={!modelsReady}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '4px',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: modelsReady ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Bật Camera Quét Mặt
                  </button>
                </div>
              )}

              {/* LỜI NHẮC TRẠNG THÁI CAMERA (TRÊN MÀN HÌNH QUÉT MẶT) */}
              {cameraActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 6,
                    background: !faceDetected
                      ? 'rgba(15, 23, 42, 0.88)'
                      : registeredDescriptors.length > 0 && !faceMatchResult.isMatch
                        ? 'rgba(153, 27, 27, 0.9)'
                        : 'rgba(5, 150, 105, 0.9)',
                    color: '#ffffff',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    border: `1px solid ${!faceDetected
                        ? 'rgba(255, 255, 255, 0.22)'
                        : registeredDescriptors.length > 0 && !faceMatchResult.isMatch
                          ? 'rgba(248, 113, 113, 0.45)'
                          : 'rgba(52, 211, 153, 0.45)'
                      }`,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(6px)',
                    letterSpacing: '0.2px',
                    pointerEvents: 'none'
                  }}
                >
                  {registeredDescriptors.length > 0 && !faceMatchResult.isMatch && faceStatusHint.includes('không khớp')
                    ? 'Khuôn mặt không khớp'
                    : !faceDetected
                      ? 'Nhìn thẳng vào ống kính'
                      : 'Giữ yên khuôn mặt'}
                </div>
              )}
            </div>

            {cameraError && (
              <div style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: '700', marginTop: '0.5rem' }}>
                {cameraError}
              </div>
            )}

            {cameraActive && (
              <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={handleStopCamera}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Tắt Camera
                </button>
              </div>
            )}

            {/* Cụm Nút Hành Động Chấm Công hoặc Kích Hoạt Face ID (Đặt ngay dưới Camera theo Phương án A) */}
            <div style={{ marginTop: '0.75rem' }}>
              {!faceRegistered ? (
                // ── TRƯỜNG HỢP CHƯA CÓ FACE ID: BẮT BUỘC CHỤP ẢNH KÍCH HOẠT TRƯỚC ──
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1.5px solid #fde68a',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#92400e',
                      lineHeight: '1.4'
                    }}
                  >
                    <strong>Tài khoản chưa có dữ liệu khuôn mặt:</strong> Vui lòng quét đăng ký sinh trắc học 3 góc mặt (tự động nhận diện chính diện, nghiêng trái, nghiêng phải) trước khi điểm danh ca trực.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAutoEnrollModal(true)}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Đăng Ký Khuôn Mặt Face ID (3 Góc Tự Động)
                  </button>
                </div>
              ) : todayStatus !== 'closed' ? (
                isGpsBlocked ? (
                  // NÚT BỊ KHÓA KHI NGOÀI BÁN KÍNH
                  <button
                    type="button"
                    disabled={true}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#94a3b8',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      fontWeight: '800',
                      cursor: 'not-allowed',
                      opacity: 0.95
                    }}
                  >
                    Chưa Đến Bến Xe (Cách {distText})
                  </button>
                ) : (
                  // NÚT BẮT ĐẦU / KẾT THÚC CA
                  <div>
                    <button
                      onClick={() => handleAttendanceAction(todayStatus === 'active' ? 'check-out' : 'check-in')}
                      disabled={actionLoading || !cameraActive || !faceDetected}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: todayStatus === 'active' ? '#dc2626' : '#059669',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: '800',
                        cursor: actionLoading || !cameraActive || !faceDetected ? 'not-allowed' : 'pointer',
                        opacity: actionLoading || !cameraActive || !faceDetected ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {actionLoading
                        ? 'Đang phân tích...'
                        : todayStatus === 'active'
                          ? 'Kết Thúc Ca Trực'
                          : 'Bắt Đầu Ca Trực'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Cập nhật lại khuôn mặt Face ID?')) {
                            setFaceRegistered(false);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Chụp lại ảnh khuôn mặt Face ID mới
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    textAlign: 'center'
                  }}
                >
                  Đã hoàn tất ca hôm nay
                </div>
              )}
            </div>

            {/* Thẻ Giám Sát Vị Trí Xuất Bến & Giờ Lăn Bánh */}
            <AttendanceGpsCard onLocationChange={handleGpsLocationChange} token={token} user={user} refreshTrigger={todayStatus} />
          </div>
        </div>

        {/* CỘT PHẢI: THÔNG TIN CA TRỰC HÔM NAY & NHẬT KÝ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card: Chi tiết ca trực hôm nay */}
          <div className="executive-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                Thông Tin Ca Trực Hôm Nay
              </div>
              {todayRecord && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: todayRecord.checkOutTime ? '#f1f5f9' : '#ecfdf5',
                    color: todayRecord.checkOutTime ? '#475569' : '#059669',
                    border: `1px solid ${todayRecord.checkOutTime ? '#cbd5e1' : '#a7f3d0'}`
                  }}
                >
                  {todayRecord.checkOutTime ? 'ĐÃ HOÀN TẤT CA' : 'ĐANG TRỰC CA'}
                </span>
              )}
            </div>

            {todayRecord ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '7px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Thời gian vào ca:</span>
                  <span style={{ fontWeight: '800', color: '#059669', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {todayRecord.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('vi-VN') : '--:--:--'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '7px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Thời gian tan ca:</span>
                  {todayRecord.checkOutTime ? (
                    <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {new Date(todayRecord.checkOutTime).toLocaleTimeString('vi-VN')}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                      Đang trong ca trực
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '7px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Xác thực sinh trắc học:</span>
                  <span
                    style={{
                      fontWeight: '700',
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: todayRecord.faceVerified ? '#ecfdf5' : '#fef2f2',
                      color: todayRecord.faceVerified ? '#059669' : '#dc2626',
                      border: `1px solid ${todayRecord.faceVerified ? '#a7f3d0' : '#fecaca'}`
                    }}
                  >
                    {todayRecord.faceVerified ? 'Đạt chuẩn Face ID' : 'Chưa xác thực'}
                  </span>
                </div>

                {todayRecord.faceDistance !== null && todayRecord.faceDistance !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '7px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Độ tin cậy nhận diện:</span>
                    <span style={{ fontWeight: '800', color: '#059669', fontSize: '0.82rem' }}>
                      {computeFaceConfidence(todayRecord.faceDistance)}% (Chính xác cao)
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '7px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', minWidth: '100px' }}>Vị trí xuất bến:</span>
                  <span style={{ fontWeight: '700', color: '#1e293b', textAlign: 'right', fontSize: '0.8rem', lineHeight: '1.4' }}>
                    {todayRecord.location || '--'}
                  </span>
                </div>

                {todayRecord.checkInPhoto && (
                  <div style={{ marginTop: '0.25rem', paddingTop: '0.5rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '6px', fontWeight: '700' }}>
                      Ảnh đối soát lúc bắt đầu ca:
                    </div>
                    <div
                      style={{
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        background: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        maxHeight: '140px'
                      }}
                    >
                      <img
                        src={todayRecord.checkInPhoto}
                        alt="Ảnh đối soát"
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '140px',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                Chưa có bản ghi chấm công nào hôm nay.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* MODAL ĐĂNG KÝ SINH TRẮC HỌC FACE ID 3 GÓC MẶT TỰ ĐỘNG */}
      <AutoFaceEnrollModal
        isOpen={showAutoEnrollModal}
        onClose={() => setShowAutoEnrollModal(false)}
        onSuccess={(data) => {
          setFaceRegistered(true);
          showToast('Đăng ký khuôn mặt 3 góc thành công!', 'success');
          setShowAutoEnrollModal(false);
          if (fetchMyAttendance) {
            fetchMyAttendance();
          }
        }}
        token={token}
        userId={user?._id || user?.id}
        userName={user?.name}
      />
    </div>
  );
};

export default AttendantAttendancePage;
