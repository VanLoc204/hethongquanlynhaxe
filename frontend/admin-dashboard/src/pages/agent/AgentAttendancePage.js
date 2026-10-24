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
import { getBranchById, getOfficesByBranchId } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api/v1';

const AgentAttendancePage = () => {
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
  const [faceMatchResult, setFaceMatchResult] = useState({ isMatch: true, similarity: 100, bestDistance: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const blinkRef = useRef({ state: 'open', lastTime: Date.now() });

  // Trạng thái ca trực của nhân viên bán vé
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveDuration, setLiveDuration] = useState('');
  const [notification, setNotification] = useState(null);

  // Phân cấp Chi nhánh phòng vé
  const agentBranchId = user?.branch?.branchId || 'sg';
  const branchInfo = getBranchById(agentBranchId);
  const offices = getOfficesByBranchId(agentBranchId);

  const [selectedLocation, setSelectedLocation] = useState(offices[0]?.id || 'sg-bxmd');
  const [selectedCounter, setSelectedCounter] = useState('1');
  const [initialCash, setInitialCash] = useState('500000');
  const [notes, setNotes] = useState('');

  // Form đóng ca
  const [closeNotes, setCloseNotes] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Tải thông tin ca trực hiện tại và dữ liệu khuôn mặt từ backend
  const fetchCurrentShiftAndFace = useCallback(async () => {
    setLoading(true);
    try {
      // a. Lấy ca trực hiện tại
      const shiftRes = await fetch(`${API_BASE}/users/shift/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const shiftData = await shiftRes.json();
      if (shiftRes.ok && shiftData.success) {
        setSession(shiftData.session);
      } else {
        setSession(null);
      }

      // b. Lấy dữ liệu mẫu khuôn mặt đã đăng ký
      const attRes = await fetch(`${API_BASE}/attendance/mine?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const attData = await attRes.json();
      if (attRes.ok && attData.success) {
        setFaceRegistered(Boolean(attData.faceRegistered));
        if (Array.isArray(attData.faceDescriptors) && attData.faceDescriptors.length > 0) {
          setRegisteredDescriptors(attData.faceDescriptors);
        } else {
          setRegisteredDescriptors([]);
        }
      }
    } catch (err) {
      console.error('[fetchCurrentShiftAndFace Error]:', err);
      showToast('Lỗi kết nối máy chủ khi nạp thông tin ca trực.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCurrentShiftAndFace();
    }
  }, [token, fetchCurrentShiftAndFace]);

  // 2. Đồng hồ đếm thời gian ca trực đang diễn ra
  useEffect(() => {
    if (!session || !session.startTime) {
      setLiveDuration('');
      return;
    }
    const updateTimer = () => {
      const diffMs = Date.now() - new Date(session.startTime).getTime();
      if (diffMs < 0) {
        setLiveDuration('00:00:00');
        return;
      }
      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      setLiveDuration(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // 3. Khởi động AI Models
  useEffect(() => {
    let isMounted = true;
    loadFaceApiModels()
      .then(() => {
        if (isMounted) setModelsReady(true);
      })
      .catch((err) => {
        if (isMounted) setCameraError('Không thể nạp mô hình nhận diện khuôn mặt: ' + err.message);
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
      setCameraError('Không thể truy cập máy ảnh. Vui lòng cấp quyền Camera trên trình duyệt.');
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

  // 5. Vòng quét AI nhận diện khuôn mặt thời gian thực
  const runFaceDetectionLoop = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= 2) {
        const { detection, descriptor, eyeAspectRatio } = await detectFaceAndExtractDescriptor(video, 320);

        if (detection && descriptor) {
          setFaceDetected(true);

          // Phát hiện chớp mắt (Liveness Detection)
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
          let boxLabel = formatRoleDisplayName('Nhân viên bán vé', user?.name || '');

          if (registeredDescriptors.length > 0) {
            const match = verifyFaceMatch(descriptor, registeredDescriptors, 0.42);
            setFaceMatchResult(match);

            if (match.isMatch) {
              boxColor = '#10b981';
              boxLabel = `${formatRoleDisplayName('Nhân viên bán vé', user?.name || '')} (${match.similarity}% khớp)`;
              setFaceStatusHint('Nhận diện chính xác nhân viên');
            } else {
              boxColor = '#ef4444';
              boxLabel = `CẢNH BÁO: Không khớp (${match.similarity}%)`;
              setFaceStatusHint('Khuôn mặt không khớp mẫu đăng ký!');
            }
          } else {
            boxColor = '#3b82f6';
            boxLabel = `${formatRoleDisplayName('Nhân viên bán vé', user?.name || '')} (Chưa đăng ký mẫu)`;
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
      // Bỏ qua lỗi khung hình nhất thời
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

  // 6. Đăng ký mẫu khuôn mặt lần đầu (Self-enrollment)
  const handleRegisterFace = async () => {
    if (!videoRef.current || !faceDetected) {
      showToast('Vui lòng bật camera, nhìn thẳng vào ống kính và giữ yên khuôn mặt!', 'error');
      return;
    }

    setIsRegisteringFace(true);
    try {
      const { descriptor } = await detectFaceAndExtractDescriptor(videoRef.current, 416);
      if (!descriptor || descriptor.length !== 128) {
        showToast('Chất lượng nhận diện chưa đạt chuẩn. Vui lòng nhìn rõ vào camera và thử lại!', 'error');
        setIsRegisteringFace(false);
        return;
      }

      const photoSnapshot = captureSnapshot(videoRef.current, 0.75, 480);

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
        showToast('Đăng ký mẫu khuôn mặt Face ID thành công! Bây giờ bạn có thể chấm công mở ca.', 'success');
        setFaceRegistered(true);
        setRegisteredDescriptors([descriptor]);
      } else {
        showToast(data.message || 'Không thể đăng ký mẫu khuôn mặt.', 'error');
      }
    } catch (err) {
      console.error('[handleRegisterFace Error]:', err);
      showToast('Lỗi máy chủ khi đăng ký khuôn mặt.', 'error');
    } finally {
      setIsRegisteringFace(false);
    }
  };

  // 7. Bắt đầu ca trực (Check-in với Face ID)
  const handleStartShift = async (e) => {
    if (e) e.preventDefault();
    if (actionLoading) return;

    if (!cameraActive) {
      showToast('Vui lòng BẬT CAMERA để quét khuôn mặt trước khi bấm Mở ca!', 'error');
      return;
    }
    if (!faceDetected) {
      showToast('Không tìm thấy khuôn mặt trong khung hình. Vui lòng nhìn thẳng vào ống kính!', 'error');
      return;
    }

    setActionLoading(true);

    try {
      const { descriptor } = await detectFaceAndExtractDescriptor(videoRef.current, 416);
      if (!descriptor || descriptor.length !== 128) {
        showToast('Chất lượng ảnh quét chưa rõ nét. Vui lòng giữ yên khuôn mặt và thử lại.', 'error');
        setActionLoading(false);
        return;
      }

      if (registeredDescriptors.length > 0) {
        const matchCheck = verifyFaceMatch(descriptor, registeredDescriptors, 0.42);
        if (!matchCheck.isMatch) {
          showToast(
            `Từ chối: Khuôn mặt không trùng khớp với nhân viên bán vé ${user?.name || ''} (sai số: ${matchCheck.bestDistance.toFixed(4)}, ngưỡng tối đa: 0.42). Vui lòng không điểm danh hộ!`,
            'error'
          );
          setActionLoading(false);
          return;
        }
      }

      const photoSnapshot = captureSnapshot(videoRef.current, 0.75, 480);
      const locName = offices.find(l => l.id === selectedLocation)?.name || offices[0]?.name || 'Quầy vé trực';
      const counterStr = `${locName} - Quầy số ${selectedCounter}`;

      const payload = {
        counterNumber: counterStr,
        initialCash: Number(initialCash) || 0,
        notes: notes || 'Mở ca trực bán vé tại quầy',
        faceDescriptor: descriptor,
        checkInPhoto: photoSnapshot,
        isLiveVerified: livenessVerified,
        location: locName
      };

      const res = await fetch(`${API_BASE}/users/shift/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Mở ca trực và xác thực khuôn mặt Face ID thành công!', 'success');
        setSession(data.session);
        setFaceRegistered(true);
        if (registeredDescriptors.length === 0) {
          setRegisteredDescriptors([descriptor]);
        }
      } else {
        showToast(data.message || 'Không thể mở ca trực.', 'error');
      }
    } catch (err) {
      console.error('[handleStartShift Error]:', err);
      showToast('Lỗi máy chủ khi mở ca trực.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Chốt ca trực (Check-out với Face ID)
  const handleCloseShift = async (e) => {
    if (e) e.preventDefault();
    if (actionLoading || !session) return;

    setActionLoading(true);

    try {
      let descriptor = null;
      let photoSnapshot = null;

      if (cameraActive && faceDetected) {
        const detResult = await detectFaceAndExtractDescriptor(videoRef.current, 416);
        if (detResult.descriptor && detResult.descriptor.length === 128) {
          descriptor = detResult.descriptor;
          photoSnapshot = captureSnapshot(videoRef.current, 0.75, 480);

          if (registeredDescriptors.length > 0) {
            const matchCheck = verifyFaceMatch(descriptor, registeredDescriptors, 0.42);
            if (!matchCheck.isMatch) {
              showToast(
                `Cảnh báo: Khuôn mặt không khớp nhân viên mở ca (sai số: ${matchCheck.bestDistance.toFixed(4)}). Yêu cầu đúng nhân viên bàn giao!`,
                'error'
              );
              setActionLoading(false);
              return;
            }
          }
        }
      }

      const payload = {
        notes: closeNotes || 'Hoàn tất bàn giao ca trực tại quầy',
        faceDescriptor: descriptor,
        checkOutPhoto: photoSnapshot,
        isLiveVerified: livenessVerified
      };

      const res = await fetch(`${API_BASE}/users/shift/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Chốt ca trực, nộp báo cáo và đối soát doanh thu thành công!', 'success');
        setSession(null);
        setCloseNotes('');
      } else {
        showToast(data.message || 'Không thể đóng ca trực.', 'error');
      }
    } catch (err) {
      console.error('[handleCloseShift Error]:', err);
      showToast('Lỗi máy chủ khi đóng ca trực.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number || 0);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3.5rem', background: '#f8fafc', borderRadius: '12px' }}>
        <div style={{ color: '#2563eb', fontWeight: '700', fontSize: '0.9rem' }}>Đang nạp trạng thái ca trực và sinh trắc học Face ID...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* HEADER SECTION */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Chấm Công Ca Bán Vé Sinh Trắc Học Face ID
            </h2>
            <span
              style={{
                background: session ? '#ecfdf5' : '#fffbeb',
                color: session ? '#059669' : '#b45309',
                border: `1px solid ${session ? '#a7f3d0' : '#fde68a'}`,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '800'
              }}
            >
              {session ? 'ĐANG TRONG CA TRỰC' : 'CHƯA MỞ CA'}
            </span>
            <span
              style={{
                background: faceRegistered ? '#ecfdf5' : '#fef3c7',
                color: faceRegistered ? '#059669' : '#b45309',
                border: `1px solid ${faceRegistered ? '#a7f3d0' : '#fde68a'}`,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '800'
              }}
            >
              {faceRegistered ? 'ĐÃ ĐĂNG KÝ KHUÔN MẶT' : 'CHƯA ĐĂNG KÝ KHUÔN MẶT'}
            </span>
            <span
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '800'
              }}
            >
              {branchInfo ? branchInfo.branchName.toUpperCase() : 'PHÒNG VÉ'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>
            Hệ thống nhận diện khuôn mặt AI tự động đối soát nhân viên trực tại quầy vé bến xe An Bình Lines, ngăn ngừa điểm danh hộ.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchCurrentShiftAndFace}
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Làm Mới
          </button>
        </div>
      </div>

      {/* TOAST THÔNG BÁO */}
      {notification && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: notification.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: notification.type === 'error' ? '#b91c1c' : '#047857',
            border: `1px solid ${notification.type === 'error' ? '#fca5a5' : '#a7f3d0'}`
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: '800' }}
          >
            ×
          </button>
        </div>
      )}

      {/* GRID 2 CỘT: CỘT TRÁI CAMERA, CỘT PHẢI CHI TIẾT CA TRỰC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* ================= CỘT TRÁI: CAMERA AI QUÉT MẶT ================= */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

          {/* KHUNG HÌNH WEBCAM */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/10',
              maxHeight: '340px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
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

            {!cameraActive && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
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
                    borderRadius: '6px',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: modelsReady ? 'pointer' : 'not-allowed'
                  }}
                >
                  Bật Camera Quét Mặt
                </button>
              </div>
            )}

            {/* LỜI NHẮC TRẠNG THÁI CAMERA THỜI GIAN THỰC */}
            {cameraActive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 6,
                  background: !faceDetected
                    ? 'rgba(15, 23, 42, 0.88)'
                    : registeredDescriptors.length > 0 && !faceMatchResult.isMatch
                    ? 'rgba(153, 27, 27, 0.9)'
                    : 'rgba(5, 150, 105, 0.9)',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  border: `1px solid ${
                    !faceDetected
                      ? 'rgba(255, 255, 255, 0.22)'
                      : registeredDescriptors.length > 0 && !faceMatchResult.isMatch
                      ? 'rgba(248, 113, 113, 0.45)'
                      : 'rgba(52, 211, 153, 0.45)'
                  }`,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(6px)',
                  pointerEvents: 'none'
                }}
              >
                {registeredDescriptors.length > 0 && !faceMatchResult.isMatch
                  ? 'Khuôn mặt không khớp mẫu đăng ký'
                  : !faceDetected
                  ? 'Nhìn thẳng vào ống kính camera'
                  : 'Giữ yên khuôn mặt để nhận diện'}
              </div>
            )}
          </div>

          {cameraError && (
            <div style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: '700' }}>
              {cameraError}
            </div>
          )}

          {cameraActive && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {livenessVerified ? (
                  <span style={{ color: '#059669', fontWeight: '700' }}>✓ Đã xác thực người thật (Liveness)</span>
                ) : (
                  <span>Chớp mắt tự nhiên để kiểm tra người thật</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleStopCamera}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Tắt Camera
              </button>
            </div>
          )}

          {/* NÚT TỰ ĐĂNG KÝ KHUÔN MẶT LẦN ĐẦU (NẾU CHƯA CÓ MẪU) */}
          {!faceRegistered && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#92400e',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div>
                <strong>Chưa có mẫu Face ID:</strong> Vui lòng bật camera, nhìn thẳng ống kính và bấm nút bên dưới để đăng ký khuôn mặt trước khi mở ca trực.
              </div>
              <button
                type="button"
                onClick={handleRegisterFace}
                disabled={isRegisteringFace || !cameraActive || !faceDetected}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: isRegisteringFace || !cameraActive || !faceDetected ? 'not-allowed' : 'pointer',
                  opacity: isRegisteringFace || !cameraActive || !faceDetected ? 0.6 : 1
                }}
              >
                {isRegisteringFace ? 'Đang lưu mẫu khuôn mặt...' : 'Chụp Ảnh & Đăng Ký Khuôn Mặt Face ID'}
              </button>
            </div>
          )}
        </div>

        {/* ================= CỘT PHẢI: QUẢN LÝ CA TRỰC ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {session ? (
            /* TRƯỜNG HỢP: ĐANG TRONG CA TRỰC */
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ecfdf5',
                  color: '#047857',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  border: '1px solid #a7f3d0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: '#059669', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.85rem' }}>ĐANG TRONG CA TRỰC HOẠT ĐỘNG</span>
                </div>
                {liveDuration && (
                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: '800' }}>
                    Thời gian: {liveDuration}
                  </span>
                )}
              </div>

              {/* THÔNG TIN CHI TIẾT CA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Vị trí quầy</div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{session.counterNumber}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Giờ bắt đầu ca</div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                    {new Date(session.startTime).toLocaleTimeString('vi-VN')}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Tiền mặt nhận bàn giao</div>
                  <strong style={{ fontSize: '0.9rem', color: '#2563eb' }}>{formatCurrency(session.initialCash)}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Vé bán trong ca</div>
                  <strong style={{ fontSize: '0.9rem', color: '#059669' }}>{session.ticketsSold?.length || 0} vé</strong>
                </div>
              </div>

              {/* BÁO CÁO DOANH THU TẠM THỜI */}
              <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  DOANH THU QUẦY TẠM THỜI:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>Tiền mặt tại két:</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>{formatCurrency(session.cashRevenue || 0)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>Quét mã QR / POS:</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>{formatCurrency(session.cashlessRevenue || 0)}</div>
                  </div>
                </div>
              </div>

              {/* CARD ĐỐI SOÁT FACE ID KHI MỞ CA */}
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>
                    Xác Thực Sinh Trắc Học Face ID Đầu Ca
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: session.faceVerified ? '#ecfdf5' : '#f1f5f9',
                      color: session.faceVerified ? '#059669' : '#64748b',
                      border: `1px solid ${session.faceVerified ? '#a7f3d0' : '#cbd5e1'}`
                    }}
                  >
                    {session.faceVerified ? 'Đạt chuẩn Face ID' : 'Chưa quét Face ID'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {session.checkInPhoto ? (
                    <img
                      src={session.checkInPhoto}
                      alt="Ảnh điểm danh"
                      style={{ width: '64px', height: '64px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '6px',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#64748b',
                        textAlign: 'center',
                        padding: '4px'
                      }}
                    >
                      Không có ảnh
                    </div>
                  )}

                  <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: '1.4' }}>
                    <div>Nhân viên: <strong>{user?.name || 'Nhân viên bán vé'}</strong></div>
                    <div>Thời điểm quét: <strong>{new Date(session.startTime).toLocaleTimeString('vi-VN')}</strong></div>
                    {session.faceDistance !== null && (
                      <div>Độ sai số Euclid: <strong>{Number(session.faceDistance).toFixed(4)}</strong> (ngưỡng: 0.42)</div>
                    )}
                  </div>
                </div>
              </div>

              {/* FORM CHỐT CA VỚI FACE ID */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a' }}>
                  Chấm Công Kết Thúc Ca Trực (Check-Out)
                </div>
                <input
                  type="text"
                  placeholder="Ghi chú bàn giao quỹ tiền hoặc số vé tồn..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCloseShift}
                  disabled={actionLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Đang xác thực & chốt ca...' : 'Chốt Ca & Nộp Báo Cáo Quỹ (Xác Thực Face ID)'}
                </button>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP: CHƯA MỞ CA TRỰC */
            <form
              onSubmit={handleStartShift}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                Thông Tin Khởi Tạo Ca Bán Vé
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    {branchInfo ? `${branchInfo.branchName} - Điểm bán trực *` : 'Điểm bán trực *'}
                  </label>
                  <select
                    className="form-control"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  >
                    {offices.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Số quầy vé *
                  </label>
                  <select
                    className="form-control"
                    value={selectedCounter}
                    onChange={(e) => setSelectedCounter(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  >
                    <option value="1">Quầy số 1</option>
                    <option value="2">Quầy số 2</option>
                    <option value="3">Quầy số 3</option>
                    <option value="4">Quầy số 4</option>
                    <option value="5">Quầy số 5</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Lượng tiền mặt lẻ bàn giao đầu ca (VND)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={initialCash}
                  onChange={(e) => setInitialCash(e.target.value)}
                  placeholder="Nhập số tiền lẻ ban đầu bàn giao"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Tiền mặt dùng để thối tiền thừa cho hành khách tại quầy vé.
                </span>
              </div>

              <div>
                <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ghi chú ca trực
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Ca trực sáng đón khách đi Đà Lạt, Nha Trang..."
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !cameraActive || !faceDetected}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: actionLoading || !cameraActive || !faceDetected ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  cursor: actionLoading || !cameraActive || !faceDetected ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}
              >
                {actionLoading ? 'Đang xác thực Face ID...' : 'Bắt Đầu Ca Trực (Xác Thực Face ID)'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AgentAttendancePage;
