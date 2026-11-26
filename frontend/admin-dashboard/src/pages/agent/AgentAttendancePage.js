import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import API_BASE_URL from '../../config/api';
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
  verifyFaceMatch
} from '../../utils/faceApiHelper';
import { getBranchById, getOfficesByBranchId } from '../../constants/branches';

const API_BASE = API_BASE_URL;

const AgentAttendancePage = ({ setActiveTab }) => {
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
  const [showAutoEnrollModal, setShowAutoEnrollModal] = useState(false);
  const blinkRef = useRef({ state: 'open', lastTime: Date.now() });

  // Trạng thái ca trực của nhân viên bán vé
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveDuration, setLiveDuration] = useState('');
  const [notification, setNotification] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);

  // Phân cấp Chi nhánh phòng vé
  const agentBranchId = user?.branch?.branchId || 'sg';
  const branchInfo = getBranchById(agentBranchId);
  const assignedOffice = user?.assignedOffice || user?.branch?.assignedOffices?.[0] || 'Văn phòng Sài Gòn (BXMĐ)';
  const branchName = user?.branch?.branchName || branchInfo?.branchName || 'Chi nhánh TP. Hồ Chí Minh';
  const shiftName = user?.shiftName || 'Ca Sáng (06:30 - 14:30)';

  const isShiftExpired = useMemo(() => {
    const now = new Date();
    const isEvening = shiftName.toLowerCase().includes('tối') || shiftName.toLowerCase().includes('chiều');
    const [endH, endM] = isEvening ? [22, 0] : [14, 30];
    const shiftEnd = new Date(now);
    shiftEnd.setHours(endH, endM + 15, 0, 0);
    return now > shiftEnd;
  }, [shiftName]);

  const [initialCash, setInitialCash] = useState('500000');
  const [expectedInitialCash, setExpectedInitialCash] = useState(500000);
  const [lastShiftInfo, setLastShiftInfo] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [notes, setNotes] = useState('');

  // Trạng thái Tạm Khóa Quầy / Nghỉ Giữa Ca
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReasonInput, setPauseReasonInput] = useState('Nghỉ trưa / Giải lao giữa ca');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockMethod, setUnlockMethod] = useState('password'); // 'password' or 'face'
  const [scheduledShift, setScheduledShift] = useState(null);
  const [pauseTimer, setPauseTimer] = useState('');

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
        if (Array.isArray(attData.history)) {
          setRecentHistory(attData.history);
        }
      }

      // c. Lấy lịch làm việc hôm nay để đối chiếu giờ phân công ca trực
      try {
        const schedRes = await fetch(`${API_BASE}/users/my-schedule`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const schedData = await schedRes.json();
        if (schedRes.ok && schedData.success && Array.isArray(schedData.schedules)) {
          const todayStr = new Date().toLocaleDateString('en-CA');
          const todaySched = schedData.schedules.find(s => {
            const d = new Date(s.date);
            return d.toLocaleDateString('en-CA') === todayStr;
          });
          setScheduledShift(todaySched || null);
        }
      } catch (sErr) {
        console.warn('Lỗi lấy lịch phân công:', sErr);
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

  // Bộ đếm thời gian tạm khóa quầy
  useEffect(() => {
    if (!session?.isPaused || !session?.pausedAt) {
      setPauseTimer('');
      return;
    }
    const updateTimer = () => {
      const diffMs = Date.now() - new Date(session.pausedAt).getTime();
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setPauseTimer(`${mins} phút ${secs < 10 ? '0' : ''}${secs} giây`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.isPaused, session?.pausedAt]);

  // 1b. Tra cứu số dư két tiền mặt ca trước bàn giao tại văn phòng công tác
  const fetchCounterBalance = useCallback(async () => {
    if (!token) return;
    setBalanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/shift/counter-balance?location=${encodeURIComponent(assignedOffice)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const suggested = Number(data.suggestedCash) || 0;
        setExpectedInitialCash(suggested);
        setInitialCash(String(suggested));
        setLastShiftInfo(data.lastShift || null);
        setDiscrepancyNote('');
      }
    } catch (err) {
      console.error('[fetchCounterBalance Error]:', err);
    } finally {
      setBalanceLoading(false);
    }
  }, [assignedOffice, token]);

  useEffect(() => {
    if (!session && token) {
      fetchCounterBalance();
    }
  }, [session, token, fetchCounterBalance]);

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

    if (isShiftExpired) {
      showToast('Đã hết giờ ca trực. Hệ thống đã khóa chức năng chấm công.', 'error');
      return;
    }

    if (!cameraActive) {
      showToast('Vui lòng BẬT CAMERA để quét khuôn mặt trước khi bấm Mở ca!', 'error');
      return;
    }
    if (!faceDetected) {
      showToast('Không tìm thấy khuôn mặt trong khung hình. Vui lòng nhìn thẳng vào ống kính!', 'error');
      return;
    }

    const actualCashNum = Number(initialCash) || 0;
    const cashDiff = actualCashNum - expectedInitialCash;
    if (cashDiff !== 0 && (!discrepancyNote || !discrepancyNote.trim())) {
      showToast('Tiền mặt thực đếm có chênh lệch so với két ca trước. Vui lòng nhập lý do giải trình để mở ca!', 'error');
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
      const locName = assignedOffice;

      const payload = {
        initialCash: actualCashNum,
        expectedInitialCash: expectedInitialCash,
        cashDiscrepancy: cashDiff,
        discrepancyNote: cashDiff !== 0 ? discrepancyNote.trim() : '',
        notes: notes || 'Mở ca trực bán vé',
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

  // 8. Tạm Khóa Quầy / Nghỉ Giữa Ca (Không kết toán két tiền)
  const handlePauseShift = async (reason) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/shift/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason || pauseReasonInput || 'Tạm khóa quầy / Nghỉ giữa ca' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
        setShowPauseModal(false);
        showToast('Quầy vé đã được tạm khóa an toàn. Bạn có thể yên tâm nghỉ ngơi.', 'success');
      } else {
        showToast(data.message || 'Không thể tạm khóa ca trực.', 'error');
      }
    } catch (err) {
      showToast('Lỗi máy chủ khi tạm khóa ca trực.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Mở Khóa Quầy Sau Khi Tạm Nghỉ (Mật khẩu hoặc Face ID)
  const handleResumeShift = async () => {
    setActionLoading(true);
    try {
      let descriptor = null;
      if (unlockMethod === 'face' && cameraActive && faceDetected) {
        const detResult = await detectFaceAndExtractDescriptor(videoRef.current, 416);
        if (detResult.descriptor && detResult.descriptor.length === 128) {
          descriptor = detResult.descriptor;
        }
      }

      const res = await fetch(`${API_BASE}/users/shift/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: unlockMethod === 'password' ? unlockPassword : null,
          faceDescriptor: descriptor
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
        setUnlockPassword('');
        showToast('Mở khóa quầy vé thành công! Tiếp tục ca trực.', 'success');
      } else {
        showToast(data.message || 'Mở khóa thất bại. Vui lòng kiểm tra lại mật khẩu hoặc Face ID.', 'error');
      }
    } catch (err) {
      showToast('Lỗi máy chủ khi mở khóa ca trực.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Check-out và đóng ca làm việc được thực hiện chuyên biệt tại trang "Tổng Kết Ca Làm Việc" (/agent/shift-summary)

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
          </div>
          <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>
            Hệ thống nhận diện khuôn mặt AI tự động đối soát nhân viên trực tại quầy vé bến xe An Bình Lines, ngăn ngừa điểm danh hộ.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('agent-attendance-report')}
              style={{
                backgroundColor: '#2563eb',
                border: '1px solid #1d4ed8',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
              }}
            >
              Báo Cáo Chấm Công
            </button>
          )}
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

          {/* NÚT TỰ ĐĂNG KÝ KHUÔN MẶT LẦN ĐẦU (3 GÓC MẶT TỰ ĐỘNG CHUẨN FACE ID) */}
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
                <strong>Chưa có mẫu Face ID:</strong> Vui lòng quét đăng ký sinh trắc học 3 góc mặt (tự động nhận diện chính diện, nghiêng trái, nghiêng phải) trước khi mở ca trực.
              </div>
              <button
                type="button"
                onClick={() => setShowAutoEnrollModal(true)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                Đăng Ký Khuôn Mặt Face ID (3 Góc Tự Động)
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
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Văn phòng làm việc</div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{session.location || user?.assignedOffice || 'Văn phòng Bến xe Miền Đông'}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Giờ bắt đầu ca</div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                    {new Date(session.startTime).toLocaleTimeString('vi-VN')}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Tiền mặt nhận bàn giao</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#2563eb' }}>{formatCurrency(session.initialCash)}</strong>
                    {session.cashDiscrepancy ? (
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: '800',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: session.cashDiscrepancy < 0 ? '#fef2f2' : '#fffbeb',
                        color: session.cashDiscrepancy < 0 ? '#dc2626' : '#d97706',
                        border: `1px solid ${session.cashDiscrepancy < 0 ? '#fecaca' : '#fde68a'}`
                      }}>
                        {session.cashDiscrepancy < 0 ? `Lệch: -${formatCurrency(Math.abs(session.cashDiscrepancy))}` : `Lệch: +${formatCurrency(session.cashDiscrepancy)}`}
                      </span>
                    ) : null}
                  </div>
                  {session.discrepancyNote && (
                    <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '2px', fontStyle: 'italic' }}>
                      Lý do: {session.discrepancyNote}
                    </div>
                  )}
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

              {/* KHU VỰC ĐIỀU HÀNH CA: TẠM KHÓA QUẦY & CHỐT CA */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a' }}>
                  Quản Lý Ca Làm Việc & Bàn Giao Quầy Vé
                </div>

                {/* THẺ TẠM KHÓA QUẦY ĐỂ ĐI ĂN TRƯA HOẶC NGHỈ GIỮA CA */}
                <div style={{
                  background: session.isPaused ? '#fef2f2' : '#fefce8',
                  border: `1px solid ${session.isPaused ? '#fecaca' : '#fef08a'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: session.isPaused ? '#991b1b' : '#854d0e' }}>
                      {session.isPaused ? 'Quầy Vé Đang Tạm Khóa An Toàn' : 'Tạm Khóa Quầy (Đi Ăn Trưa / Nghỉ Giữa Ca)'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: session.isPaused ? '#b91c1c' : '#a16207' }}>
                      {session.isPaused
                        ? `Đã tạm khóa lúc ${new Date(session.pausedAt).toLocaleTimeString('vi-VN')} (${pauseTimer || 'vừa tạm khóa'}). Dữ liệu két tiền và phiên trực được bảo vệ tuyệt đối.`
                        : 'Giữ nguyên phiên làm việc và số dư két tiền. Không cần đóng ca hay đối soát lại.'}
                    </div>
                  </div>
                  {session.isPaused ? (
                    <button
                      type="button"
                      onClick={() => setUnlockMethod('password')}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Mở Khóa Quầy
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPauseModal(true)}
                      disabled={actionLoading}
                      style={{
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Tạm Khóa Quầy
                    </button>
                  )}
                </div>

                {/* ĐIỀU HƯỚNG TÁC NGHIỆP: BÁN VÉ HOẶC SANG TRANG TỔNG KẾT ĐÓNG CA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab ? setActiveTab('booking') : (window.location.href = '/agent/booking')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    🎫 Bắt Đầu Bán Vé Tại Quầy
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab ? setActiveTab('shift-summary') : (window.location.href = '/agent/shift-summary')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    📊 Tổng Kết & Đóng Ca
                  </button>
                </div>
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

              {isShiftExpired && (
                <div style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.78rem',
                  fontWeight: '700'
                }}>
                  Đã hết giờ ca trực hôm nay. Hệ thống đã khóa chấm công.
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem 1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                    Điểm bán trực phân công
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                    {assignedOffice}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: '600', marginTop: '1px' }}>
                    {branchName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                    Khung giờ ca trực
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                    {shiftName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                    Định mức chuẩn 8 giờ / ca
                  </div>
                </div>
              </div>

              {/* KHỐI ĐỐI SOÁT TIỀN MẶT BÀN GIAO ĐẦU CA */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {/* TIÊU ĐỀ KHỐI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                    Đối Soát Tiền Mặt & Két Quầy Đầu Ca
                  </span>
                  {balanceLoading ? (
                    <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: '600' }}>
                      Đang tải số dư ca trước...
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchCounterBalance()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Cập nhật số dư két
                    </button>
                  )}
                </div>

                {/* THẺ THÔNG TIN BÀN GIAO CA TRƯỚC */}
                {lastShiftInfo ? (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '0.75rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af' }}>
                        Số dư két ca trước bàn giao lại:
                      </span>
                      <strong style={{ fontSize: '0.95rem', fontWeight: '900', color: '#1d4ed8' }}>
                        {formatCurrency(expectedInitialCash)}
                      </strong>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#3b82f6', lineHeight: '1.4' }}>
                      Nhân viên bàn giao: <strong>{lastShiftInfo.employeeName}</strong> {lastShiftInfo.employeePhone ? `(${lastShiftInfo.employeePhone})` : ''} • Đóng ca lúc: <strong>{new Date(lastShiftInfo.endTime).toLocaleTimeString('vi-VN')} ({new Date(lastShiftInfo.endTime).toLocaleDateString('vi-VN')})</strong>
                    </div>

                    <div style={{ fontSize: '0.68rem', color: '#64748b', borderTop: '1px dashed #bfdbfe', paddingTop: '4px', marginTop: '2px' }}>
                      Chi tiết sổ sách: Vốn đầu ca {formatCurrency(lastShiftInfo.initialCash)} + Thu tiền mặt {formatCurrency(lastShiftInfo.cashRevenue)} - Hoàn vé {formatCurrency(lastShiftInfo.refundCash || 0)}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.73rem',
                      color: '#475569',
                      lineHeight: '1.4'
                    }}
                  >
                    <strong>Chưa có ca trước kết thúc tại quầy này:</strong> Áp dụng hạn mức tiền lẻ bàn giao mặc định <strong>500.000 đ</strong>.
                  </div>
                )}

                {/* Ô NHẬP TIỀN THỰC ĐẾM TRONG KÉT */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#334155', margin: 0 }}>
                      Số tiền mặt thực tế kiểm đếm trong két (VND) *
                    </label>
                    {Number(initialCash) !== expectedInitialCash && (
                      <button
                        type="button"
                        onClick={() => {
                          setInitialCash(String(expectedInitialCash));
                          setDiscrepancyNote('');
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          color: '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        Đặt lại bằng tiền ca trước ({formatCurrency(expectedInitialCash)})
                      </button>
                    )}
                  </div>

                  <input
                    type="number"
                    className="form-control"
                    value={initialCash}
                    onChange={(e) => setInitialCash(e.target.value)}
                    placeholder="Nhập số tiền mặt thực đếm được..."
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: `1px solid ${Number(initialCash) !== expectedInitialCash ? '#f87171' : '#cbd5e1'}`,
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                    Số tiền đếm được: <strong>{formatCurrency(Number(initialCash) || 0)}</strong>. Vui lòng kiểm đếm chính xác từng cọc tiền mặt trong két trước khi nhận ca.
                  </div>
                </div>

                {/* HIỂN THỊ CHÊNH LỆCH VÀ YÊU CẦU GIẢI TRÌNH */}
                {(() => {
                  const actual = Number(initialCash) || 0;
                  const diff = actual - expectedInitialCash;

                  if (diff === 0) {
                    return (
                      <div
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.72rem',
                          color: '#065f46',
                          fontWeight: '700'
                        }}
                      >
                        Tiền mặt thực nhận khớp chính xác 100% với số dư ca trước bàn giao ({formatCurrency(expectedInitialCash)}).
                      </div>
                    );
                  }

                  const isDeficit = diff < 0;
                  return (
                    <div
                      style={{
                        background: isDeficit ? '#fef2f2' : '#fffbeb',
                        border: `1px solid ${isDeficit ? '#fecaca' : '#fde68a'}`,
                        borderRadius: '8px',
                        padding: '0.75rem 0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isDeficit ? '#991b1b' : '#92400e' }}>
                          PHÁT HIỆN SAI LỆCH TIỀN MẶT ĐẦU CA:
                        </span>
                        <strong
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: '900',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isDeficit ? '#fee2e2' : '#fef3c7',
                            color: isDeficit ? '#b91c1c' : '#b45309',
                            border: `1px solid ${isDeficit ? '#fca5a5' : '#fcd34d'}`
                          }}
                        >
                          {isDeficit ? `Thiếu hụt: -${formatCurrency(Math.abs(diff))}` : `Dư thừa: +${formatCurrency(diff)}`}
                        </strong>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: isDeficit ? '#7f1d1d' : '#78350f', lineHeight: '1.4' }}>
                        Sổ sách ca trước: <strong>{formatCurrency(expectedInitialCash)}</strong> | Thực nhận trong két: <strong>{formatCurrency(actual)}</strong>
                      </div>

                      <div style={{ marginTop: '4px' }}>
                        <label style={{ display: 'block', fontWeight: '800', fontSize: '0.74rem', color: isDeficit ? '#991b1b' : '#92400e', marginBottom: '3px' }}>
                          Lý do / Giải trình chênh lệch két (* Bắt buộc để mở ca)
                        </label>
                        <textarea
                          rows={2}
                          value={discrepancyNote}
                          onChange={(e) => setDiscrepancyNote(e.target.value)}
                          placeholder={isDeficit ? "Ví dụ: Ca trước của Mai để thiếu 15.000đ tiền lẻ, đã xác nhận qua điện thoại với Mai..." : "Ví dụ: Trong két có thêm 20.000đ khách bỏ quên ca trước chưa nộp..."}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            border: `1px solid ${discrepancyNote.trim() ? '#cbd5e1' : (isDeficit ? '#ef4444' : '#f59e0b')}`,
                            fontSize: '0.76rem',
                            boxSizing: 'border-box',
                            resize: 'vertical',
                            background: '#ffffff'
                          }}
                        />
                        {!discrepancyNote.trim() && (
                          <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: '700', marginTop: '2px' }}>
                            * Vui lòng điền rõ lý do chênh lệch để hệ thống ghi nhận biên bản đối soát gửi Quản lý.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
                disabled={actionLoading || !cameraActive || !faceDetected || isShiftExpired}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: isShiftExpired ? '#dc2626' : (actionLoading || !cameraActive || !faceDetected ? '#94a3b8' : '#2563eb'),
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  cursor: isShiftExpired || actionLoading || !cameraActive || !faceDetected ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}
              >
                {isShiftExpired
                  ? 'Đã Hết Giờ Chấm Công'
                  : actionLoading
                    ? 'Đang xác thực Face ID...'
                    : 'Bắt Đầu Ca Trực (Xác Thực Face ID)'}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* ================= PHẦN DƯỚI: NHẬT KÝ CHẤM CÔNG GẦN ĐÂY ================= */}
      <div style={{
        marginTop: '1.5rem',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'nowrap', gap: '8px' }}>
          <div style={{ whiteSpace: 'nowrap' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
              Nhật Ký Chấm Công Gần Đây (Các Ca Trực Trước)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
              Theo dõi đối soát giờ công và doanh thu bán vé ca trực của bạn.
            </span>
          </div>

          {setActiveTab && (
            <button
              onClick={() => setActiveTab('agent-attendance-report')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Xem toàn bộ báo cáo chấm công &rarr;
            </button>
          )}
        </div>

        {recentHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            Chưa có lịch sử ca trực nào được ghi nhận.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '8px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Ngày làm việc</th>
                  <th style={{ padding: '8px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Quầy vé</th>
                  <th style={{ padding: '8px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Vào ca</th>
                  <th style={{ padding: '8px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Tan ca</th>
                  <th style={{ padding: '8px 12px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Số giờ làm</th>
                  <th style={{ padding: '8px 12px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Xác thực Face ID</th>
                  <th style={{ padding: '8px 12px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>Doanh số vé</th>
                  <th style={{ padding: '8px 12px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.slice(0, 5).map((sh, idx) => (
                  <tr key={sh.id || idx} style={{ borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap' }}>{sh.date}</td>
                    <td style={{ padding: '10px 12px', color: '#334155', whiteSpace: 'nowrap' }}>{sh.officeName || sh.location || 'Văn phòng bán vé'}</td>
                    <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap' }}>{sh.checkInTime}</td>
                    <td style={{ padding: '10px 12px', color: (sh.status === 'open' || sh.status === 'active') ? '#ca8a04' : '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {(sh.status === 'open' || sh.status === 'active') ? 'Đang trực' : sh.checkOutTime}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {sh.durationHours}h
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {sh.faceVerified ? (
                        <span style={{ color: '#16a34a', fontWeight: '700', whiteSpace: 'nowrap' }}>Đã xác thực</span>
                      ) : (
                        <span style={{ color: '#dc2626', whiteSpace: 'nowrap' }}>Chưa nhận diện</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {(sh.totalRevenue || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {(sh.status === 'open' || sh.status === 'active') ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          ● Đang mở ca
                        </span>
                      ) : (
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          Đã đóng ca
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: XÁC NHẬN TẠM KHÓA QUẦY (NGHỈ GIỮA CA)           */}
      {/* ========================================================= */}
      {showPauseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', color: '#d97706', fontWeight: '800' }}>[!]</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                Tạm Khóa Quầy (Nghỉ Giữa Ca)
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.45' }}>
              Hệ thống sẽ tạm khóa màn hình làm việc để bạn đi ăn trưa hoặc giải lao giữa ca. Số dư két tiền và phiên trực hiện tại được bảo lưu nguyên vẹn, không cần chốt nộp két hay mở lại ca.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Lý do tạm khóa quầy:
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {['Nghỉ trưa / Ăn trưa', 'Nghỉ giải lao giữa ca (30p)', 'Rời quầy việc nội bộ'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPauseReasonInput(opt)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      border: `1px solid ${pauseReasonInput === opt ? '#2563eb' : '#cbd5e1'}`,
                      background: pauseReasonInput === opt ? '#eff6ff' : '#ffffff',
                      color: pauseReasonInput === opt ? '#1d4ed8' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={pauseReasonInput}
                onChange={(e) => setPauseReasonInput(e.target.value)}
                placeholder="Nhập lý do cụ thể..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                disabled={actionLoading}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handlePauseShift(pauseReasonInput)}
                disabled={actionLoading}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#d97706',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Đang khóa...' : 'Xác nhận Tạm Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================= */}
      {/* OVERLAY: MÀN HÌNH KHÓA AN TOÀN KHI SESSION ĐANG TẠM KHÓA  */}
      {/* ========================================================= */}
      {session && session.isPaused && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.88)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '2rem 1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.15rem'
          }}>
            <div>
              <span style={{
                display: 'inline-block',
                background: '#fef3c7',
                color: '#b45309',
                padding: '3px 12px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                border: '1px solid #fde68a'
              }}>
                MÀN HÌNH ĐANG TẠM KHÓA AN TOÀN
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: '8px 0 2px 0' }}>
                Quầy Vé Tạm Nghỉ Giữa Ca
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Hệ thống bảo vệ dữ liệu tài chính quầy vé trong thời gian nhân viên nghỉ giữa ca
              </p>
            </div>

            {/* Thông tin quầy đang tạm khóa */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              textAlign: 'left',
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nhân viên trực:</span>
                <strong style={{ color: '#0f172a' }}>{user?.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Văn phòng làm việc:</span>
                <strong style={{ color: '#0f172a' }}>{session.location || user?.assignedOffice || 'Văn phòng Bến xe Miền Đông'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Thời gian đã tạm nghỉ:</span>
                <strong style={{ color: '#d97706' }}>{pauseTimer || 'Vừa tạm khóa'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Lý do:</span>
                <span style={{ color: '#334155', fontWeight: '600' }}>{session.pauseReason || 'Nghỉ giữa ca'}</span>
              </div>
            </div>

            {/* Phương thức mở khóa */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <button
                  type="button"
                  onClick={() => setUnlockMethod('password')}
                  style={{
                    background: unlockMethod === 'password' ? '#2563eb' : 'transparent',
                    color: unlockMethod === 'password' ? '#ffffff' : '#64748b',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Mở Bằng Mật Khẩu
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockMethod('face')}
                  style={{
                    background: unlockMethod === 'face' ? '#2563eb' : 'transparent',
                    color: unlockMethod === 'face' ? '#ffffff' : '#64748b',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Mở Bằng Face ID
                </button>
              </div>

              {unlockMethod === 'password' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Nhập mật khẩu tài khoản của bạn:
                  </label>
                  <input
                    type="password"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Mật khẩu tài khoản..."
                    onKeyDown={(e) => e.key === 'Enter' && handleResumeShift()}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.75rem',
                  color: '#1e40af'
                }}>
                  Đảm bảo khuôn mặt hướng thẳng vào webcam bên dưới rồi nhấn nút Mở Khóa Quầy để hệ thống đối soát sinh trắc học Face ID.
                </div>
              )}

              <button
                type="button"
                onClick={handleResumeShift}
                disabled={actionLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Đang xác thực...' : 'Mở Khóa Tiếp Tục Bán Vé'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL ĐĂNG KÝ SINH TRẮC HỌC FACE ID 3 GÓC MẶT TỰ ĐỘNG */}
      <AutoFaceEnrollModal
        isOpen={showAutoEnrollModal}
        onClose={() => setShowAutoEnrollModal(false)}
        onSuccess={(data) => {
          setFaceRegistered(true);
          showToast('Đăng ký mẫu khuôn mặt Face ID 3 góc thành công! Bây giờ bạn có thể chấm công mở ca.', 'success');
          setShowAutoEnrollModal(false);
          if (fetchAttendanceSession) {
            fetchAttendanceSession();
          }
        }}
        token={token}
        userId={user?._id || user?.id}
        userName={user?.name}
      />
    </div>
  );
};

export default AgentAttendancePage;
