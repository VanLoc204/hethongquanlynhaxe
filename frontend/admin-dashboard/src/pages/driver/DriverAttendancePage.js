import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  loadFaceApiModels,
  startWebcam,
  stopWebcam,
  detectFaceAndExtractDescriptor,
  drawDetectionBox,
  clearCanvas,
  formatRoleDisplayName,
  captureSnapshot,
  verifyFaceMatch
} from '../../utils/faceApiHelper';

const API_BASE = 'http://localhost:8000/api/v1';

const DriverAttendancePage = () => {
  const { token, user } = useContext(AuthContext);

  // Trạng thái AI Models & Camera
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [faceStatusHint, setFaceStatusHint] = useState('');
  const [registeredDescriptors, setRegisteredDescriptors] = useState([]);
  const [faceMatchResult, setFaceMatchResult] = useState({ isMatch: true, similarity: 100, bestDistance: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const blinkRef = useRef({ state: 'open', lastTime: Date.now() });

  // Trạng thái chấm công từ Backend
  const [todayStatus, setTodayStatus] = useState('not_checked'); // not_checked | scheduled | active | closed
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // GPS & Thông báo
  const [gpsLocation, setGpsLocation] = useState({ lat: null, lng: null, address: 'Đang xác định GPS...' });
  const [notification, setNotification] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // 1. Tự động lấy tọa độ GPS của thiết bị
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setGpsLocation({
            lat,
            lng,
            address: `${lat}° N, ${lng}° E (Tọa độ thiết bị)`
          });
        },
        (err) => {
          console.warn('[GPS Geolocation Error]:', err.message);
          setGpsLocation({
            lat: 10.7904,
            lng: 106.7078,
            address: '10.7904° N, 106.7078° E (Bến xe Miền Đông)'
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsLocation({
        lat: 10.7904,
        lng: 106.7078,
        address: '10.7904° N, 106.7078° E (Mặc định Bến xe)'
      });
    }
  }, []);

  // 2. Tải lịch sử và trạng thái chấm công hôm nay của tài xế
  const fetchMyAttendance = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/mine?limit=15`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTodayStatus(data.todayStatus || 'not_checked');
        setTodayRecord(data.todayRecord || null);
        setHistory(data.history || []);
        if (Array.isArray(data.faceDescriptors)) {
          setRegisteredDescriptors(data.faceDescriptors);
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

  // 4. Bật Webcam
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

  // 5. Tắt Webcam
  const handleStopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      stopWebcam(streamRef.current);
      streamRef.current = null;
    }
    clearCanvas(canvasRef.current);
    setCameraActive(false);
    setFaceDetected(false);
  }, []);

  // 6. Quét khuôn mặt liên tục khi camera hoạt động
  useEffect(() => {
    let isScanning = true;

    const runDetectionLoop = async () => {
      if (!isScanning || !cameraActive || !videoRef.current || !canvasRef.current) return;

      if (videoRef.current.readyState === 4) {
        try {
          const { detection, descriptor, eyeAspectRatio } = await detectFaceAndExtractDescriptor(videoRef.current, 320);
          if (isScanning && canvasRef.current && videoRef.current) {
            if (detection) {
              const faceWidth = detection.box.width;
              const isTooFar = faceWidth < 105;

              // Xác thực thời gian thực với các mẫu khuôn mặt đã đăng ký của tài xế
              let matchInfo = { isMatch: true, similarity: 100, bestDistance: 0 };
              if (registeredDescriptors.length > 0 && descriptor) {
                matchInfo = verifyFaceMatch(descriptor, registeredDescriptors, 0.38);
              }
              setFaceMatchResult(matchInfo);

              // Kiểm tra cử động sống: nháy mắt (Eye Blink Liveness Detection)
              if (eyeAspectRatio !== null && !isTooFar) {
                const now = Date.now();
                const b = blinkRef.current;
                if (eyeAspectRatio < 0.22 && b.state === 'open' && (now - b.lastTime > 150)) {
                  b.state = 'closed';
                  b.lastTime = now;
                } else if (eyeAspectRatio > 0.26 && b.state === 'closed' && (now - b.lastTime > 80)) {
                  b.state = 'open';
                  b.lastTime = now;
                  setLivenessVerified(true);
                }
              }

              const roleName = formatRoleDisplayName('Tài xế', user?.name);
              let label = roleName;
              let boxColor = '#10b981';

              if (isTooFar) {
                setFaceDetected(false);
                setFaceStatusHint('Vui lòng lại gần camera hơn');
                label = 'Hãy lại gần camera hơn';
                boxColor = '#f59e0b';
              } else if (registeredDescriptors.length > 0 && !matchInfo.isMatch) {
                // Phát hiện không phải người đăng ký! Khung đỏ, vô hiệu hóa nút
                setFaceDetected(false);
                setFaceStatusHint('✕ Khuôn mặt không khớp');
                label = `✕ Không phải ${roleName} (${matchInfo.bestDistance.toFixed(2)})`;
                boxColor = '#ef4444';
              } else {
                setFaceDetected(true);
                setFaceStatusHint('');
                if (registeredDescriptors.length > 0) {
                  label = `✓ ${roleName} (${matchInfo.similarity}% khớp)`;
                }
              }

              drawDetectionBox(
                canvasRef.current,
                videoRef.current,
                detection,
                label,
                boxColor,
                true
              );
            } else {
              setFaceDetected(false);
              setFaceStatusHint('');
              clearCanvas(canvasRef.current);
            }
          }
        } catch (e) {
          // Bỏ qua frame lỗi khi render
        }
      }

      if (isScanning && cameraActive) {
        scanLoopRef.current = requestAnimationFrame(runDetectionLoop);
      }
    };

    if (cameraActive && modelsReady) {
      runDetectionLoop();
    }

    return () => {
      isScanning = false;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [cameraActive, modelsReady, user?.name, registeredDescriptors]);

  // Giải phóng camera khi unmount component
  useEffect(() => {
    return () => {
      handleStopCamera();
    };
  }, [handleStopCamera]);

  // 7. Thực hiện Chấm công (Check-in hoặc Check-out)
  const handleAttendanceAction = async (actionType) => {
    if (!cameraActive || !videoRef.current) {
      showToast('Vui lòng bật Camera trước khi chấm công!', 'error');
      return;
    }

    setActionLoading(true);
    try {
      // Trích xuất vector khuôn mặt 128D ở độ phân giải 416px cho độ chuẩn xác tối đa
      const { detection, descriptor } = await detectFaceAndExtractDescriptor(videoRef.current, 416);

      if (!descriptor || !detection) {
        showToast('Chưa nhìn rõ khuôn mặt. Vui lòng căn chỉnh mặt vào giữa khung hình!', 'warning');
        setActionLoading(false);
        return;
      }

      if (detection.box.width < 105) {
        showToast('Khuôn mặt còn quá xa camera. Vui lòng tiến lại gần hơn để bảo đảm độ nét!', 'warning');
        setActionLoading(false);
        return;
      }

      // Xác thực nghiêm ngặt chống điểm danh hộ
      if (registeredDescriptors.length > 0) {
        const matchCheck = verifyFaceMatch(descriptor, registeredDescriptors, 0.38);
        if (!matchCheck.isMatch) {
          showToast(`Từ chối: Khuôn mặt không khớp với tài xế ${user?.name || ''} (sai số: ${matchCheck.bestDistance.toFixed(4)}, ngưỡng tối đa: 0.38). Vui lòng không điểm danh hộ!`, 'error');
          setActionLoading(false);
          return;
        }
      }

      // Chụp ảnh snapshot lúc chấm công làm bằng chứng đối soát
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
              gpsLng: gpsLocation.lng
            }
          : {
              faceDescriptor: descriptor,
              checkOutPhoto: photoSnapshot
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
        showToast(data.message, 'success');
        fetchMyAttendance();
      } else {
        showToast(data.message || 'Xác thực khuôn mặt thất bại. Vui lòng thử lại!', 'error');
      }
    } catch (err) {
      console.error('[Attendance Action Error]:', err);
      showToast('Lỗi kết nối máy chủ khi chấm công.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '1280px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-flex', padding: '6px', background: '#eff6ff', borderRadius: '8px', color: '#2563eb' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </span>
            Chấm Công Số Bằng Nhận Diện Khuôn Mặt (Face ID)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
            Tài xế: <strong style={{ color: 'var(--text)' }}>{user?.name}</strong> • SĐT: {user?.phone} • Định vị GPS xác thực điểm xuất bến
          </p>
        </div>

        {/* Trạng thái ca trực hôm nay Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '24px',
              fontWeight: '700',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                todayStatus === 'active'
                  ? '#ecfdf5'
                  : todayStatus === 'closed'
                  ? '#eff6ff'
                  : '#fffbeb',
              color:
                todayStatus === 'active'
                  ? '#047857'
                  : todayStatus === 'closed'
                  ? '#1d4ed8'
                  : '#b45309',
              border: `1px solid ${
                todayStatus === 'active'
                  ? '#a7f3d0'
                  : todayStatus === 'closed'
                  ? '#bfdbfe'
                  : '#fde68a'
              }`
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  todayStatus === 'active'
                    ? '#10b981'
                    : todayStatus === 'closed'
                    ? '#2563eb'
                    : '#f59e0b'
              }}
            ></span>
            {todayStatus === 'active'
              ? `Đang Trong Ca (Vào ca: ${todayRecord?.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('vi-VN') : '--'})`
              : todayStatus === 'closed'
              ? 'Đã Hoàn Thành Ca Hôm Nay'
              : 'Chưa Vào Ca Hôm Nay'}
          </div>
        </div>
      </div>

      {/* Thông báo thông điệp */}
      {notification && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '1.25rem',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor:
              notification.type === 'success'
                ? '#ecfdf5'
                : notification.type === 'warning'
                ? '#fffbeb'
                : '#fef2f2',
            color:
              notification.type === 'success'
                ? '#065f46'
                : notification.type === 'warning'
                ? '#92400e'
                : '#991b1b',
            border: `1px solid ${
              notification.type === 'success'
                ? '#6ee7b7'
                : notification.type === 'warning'
                ? '#fcd34d'
                : '#fca5a5'
            }`
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid 2 cột: Bảng Camera Chấm Công & Nhật ký */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* CỘT TRÁI: Khung Camera Nhận Diện & Thao Tác Chấm Công */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid var(--card-border)', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Camera AI Quét Khuôn Mặt
            </h3>

            {/* Trạng thái tải AI */}
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: modelsReady ? '#ecfdf5' : '#fef3c7',
                color: modelsReady ? '#047857' : '#b45309'
              }}
            >
              {modelsReady ? '● AI Models Sẵn Sàng' : '○ Đang tải mô hình AI...'}
            </span>
          </div>

          {cameraError && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.825rem', marginBottom: '1rem' }}>
              {cameraError}
            </div>
          )}

          {/* Viewport Camera với Canvas Overlay */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
            }}
          >
            {/* Thẻ video */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Hiệu ứng gương tự nhiên
                display: cameraActive ? 'block' : 'none'
              }}
            />

            {/* Canvas vẽ bounding box */}
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

            {/* Khung ngắm ảo hỗ trợ tài xế căn mặt */}
            {cameraActive && (
              <div
                style={{
                  position: 'absolute',
                  width: '52%',
                  height: '62%',
                  border: `2px dashed ${faceDetected ? '#10b981' : 'rgba(255,255,255,0.4)'}`,
                  borderRadius: '50% 50% 45% 45%',
                  pointerEvents: 'none',
                  boxShadow: faceDetected ? '0 0 25px rgba(16,185,129,0.3)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background:
                      registeredDescriptors.length > 0 && !faceMatchResult.isMatch && faceDetected === false && faceStatusHint.includes('không khớp')
                        ? 'rgba(239,68,68,0.95)'
                        : faceDetected
                        ? (livenessVerified ? 'rgba(16,185,129,0.95)' : 'rgba(245,158,11,0.95)')
                        : 'rgba(0,0,0,0.7)',
                    color: '#ffffff',
                    padding: '3px 12px',
                    borderRadius: '12px',
                    fontSize: '0.725rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {registeredDescriptors.length > 0 && !faceMatchResult.isMatch && faceStatusHint.includes('không khớp')
                    ? `✕ Không đúng tài xế (${user?.name})`
                    : faceDetected
                    ? (livenessVerified ? '✓ Người thật (Đã nháy mắt)' : '👁 Nháy mắt nhẹ để xác thực người thật')
                    : (faceStatusHint || 'Đặt khuôn mặt vào vòng quét')}
                </div>
              </div>
            )}

            {/* Khi camera chưa bật */}
            {!cameraActive && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.7 }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Camera chưa được kích hoạt</p>
                <button
                  onClick={handleStartCamera}
                  disabled={!modelsReady}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '700',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: modelsReady ? 'pointer' : 'not-allowed',
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
                  }}
                >
                  {modelsReady ? 'Bật Camera Quét Mặt' : 'Đang tải AI Model...'}
                </button>
              </div>
            )}
          </div>

          {/* Điều khiển Camera: Nút tắt/bật */}
          {cameraActive && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                onClick={handleStopCamera}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.775rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Tắt Camera
              </button>
            </div>
          )}

          {/* Định vị GPS Card */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--card-border)', marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>ĐỊNH VỊ GPS XUẤT BẾN:</span>
              <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                GPS Khả dụng
              </span>
            </div>
            <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '0.85rem' }}>
              {gpsLocation.address}
            </div>
          </div>

          {/* Cụm Nút Hành Động Chấm Công */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            {todayStatus !== 'closed' ? (
              <button
                onClick={() => handleAttendanceAction(todayStatus === 'active' ? 'check-out' : 'check-in')}
                disabled={actionLoading || !cameraActive || !faceDetected}
                style={{
                  width: '100%',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background:
                    todayStatus === 'active'
                      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  cursor: actionLoading || !cameraActive || !faceDetected ? 'not-allowed' : 'pointer',
                  opacity: actionLoading || !cameraActive || !faceDetected ? 0.6 : 1,
                  boxShadow:
                    todayStatus === 'active'
                      ? '0 6px 16px rgba(239, 68, 68, 0.3)'
                      : '0 6px 16px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {actionLoading ? (
                  <span>Đang phân tích khuôn mặt qua mạng nơ-ron...</span>
                ) : todayStatus === 'active' ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Xác Nhận Kết Thúc Ca (Check-Out)
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Xác Nhận Bắt Đầu Ca (Check-In)
                  </>
                )}
              </button>
            ) : (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontWeight: '700',
                  fontSize: '0.9rem'
                }}
              >
                🎉 Bạn đã hoàn tất đầy đủ lượt chấm công ca hôm nay. Chúc bạn nghỉ ngơi lấy sức cho chuyến tiếp theo!
              </div>
            )}

            {!faceDetected && cameraActive && todayStatus !== 'closed' && (
              <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem', fontWeight: '700' }}>
                {registeredDescriptors.length > 0 && !faceMatchResult.isMatch && faceStatusHint.includes('không khớp')
                  ? `⚠️ CẢNH BÁO: Khuôn mặt trước camera không khớp với tài xế ${user?.name}. Hệ thống từ chối điểm danh hộ!`
                  : '* Vui lòng nhìn thẳng vào camera và nháy mắt để hệ thống xác thực trước khi bấm nút.'}
              </p>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Chi Tiết Hôm Nay & Lịch Sử Chấm Công Thực Tế */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card: Chi tiết ca trực hôm nay */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid var(--card-border)', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', marginBottom: '1rem' }}>
              Thông Tin Ca Trực Hôm Nay
            </h3>

            {todayRecord ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thời gian vào ca:</span>
                  <span style={{ fontWeight: '800', color: '#059669', fontFamily: 'monospace' }}>
                    {todayRecord.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('vi-VN') : '--:--:--'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thời gian tan ca:</span>
                  <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                    {todayRecord.checkOutTime ? new Date(todayRecord.checkOutTime).toLocaleTimeString('vi-VN') : 'Đang trực...'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Xác thực khuôn mặt:</span>
                  <span style={{ fontWeight: '700', color: todayRecord.faceVerified ? '#059669' : '#dc2626' }}>
                    {todayRecord.faceVerified ? '✓ Đạt chuẩn Face ID' : 'Chưa xác thực'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Khoảng cách nhận diện:</span>
                  <span style={{ fontWeight: '700', color: '#475569' }}>
                    {todayRecord.faceDistance !== null ? `${todayRecord.faceDistance} (Ngưỡng: 0.48)` : '--'}
                  </span>
                </div>

                {todayRecord.isLiveVerified && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Xác thực người thật:</span>
                    <span style={{ fontWeight: '700', color: '#059669' }}>✓ Liveness Đạt</span>
                  </div>
                )}

                {todayRecord.checkInPhoto && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>
                      Ảnh chụp đối soát lúc Check-in:
                    </span>
                    <img
                      src={todayRecord.checkInPhoto}
                      alt="Ảnh Check-in"
                      style={{
                        width: '100%',
                        maxHeight: '130px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                Chưa có bản ghi chấm công nào hôm nay.
              </div>
            )}
          </div>

          {/* Card: Lịch sử chấm công gần đây */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid var(--card-border)', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)', margin: 0 }}>
                Nhật Ký Chấm Công Gần Đây
              </h3>
              <button
                onClick={fetchMyAttendance}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}
              >
                Làm mới
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>Đang nạp dữ liệu...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                Chưa có lịch sử chấm công.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '800', color: 'var(--text)' }}>
                        {item.date}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Vào: <strong style={{ color: '#059669' }}>{item.checkInTime}</strong> • Tan: <strong style={{ color: '#0f172a' }}>{item.checkOutTime}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        📍 {item.location}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor:
                            item.status === 'closed'
                              ? '#ecfdf5'
                              : item.status === 'active'
                              ? '#eff6ff'
                              : '#fef2f2',
                          color:
                            item.status === 'closed'
                              ? '#047857'
                              : item.status === 'active'
                              ? '#1d4ed8'
                              : '#dc2626'
                        }}
                      >
                        {item.status === 'closed' ? 'Hoàn thành' : item.status === 'active' ? 'Đang trực' : 'Vắng mặt'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default DriverAttendancePage;
