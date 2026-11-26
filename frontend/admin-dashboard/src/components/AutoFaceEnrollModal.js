import React, { useState, useEffect, useRef, useCallback } from 'react';
import API_BASE_URL from '../config/api';
import {
  loadFaceApiModels,
  startWebcam,
  stopWebcam,
  detectFaceAndExtractDescriptor,
  captureSnapshot,
  analyzeFacePose
} from '../utils/faceApiHelper';

const API_BASE = API_BASE_URL;

/**
 * AutoFaceEnrollModal - Modal Đăng Ký Sinh Trắc Học Face ID 3 Góc Mặt Tự Động
 * Mô phỏng trải nghiệm Apple Face ID với khả năng so khớp góc mặt nghiêm ngặt và đo thời gian giữ yên thực tế:
 * - Bước 1: Góc chính diện (Front) - Giữ thẳng 0.8s -> Tự động chụp
 * - Bước 2: Góc nghiêng nhẹ bên trái (Left) - Bắt buộc quay sang TRÁI (15°-30°), quay sang phải sẽ báo sai hướng -> Tự động chụp
 * - Bước 3: Góc nghiêng nhẹ bên phải (Right) - Bắt buộc quay sang PHẢI (15°-30°), quay sang trái sẽ báo sai hướng -> Tự động chụp
 */
const AutoFaceEnrollModal = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  userId,
  userName = 'Nhân sự'
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const holdStartRef = useRef(null);

  // Trạng thái bước quét: 1 (Chính diện) -> 2 (Nghiêng trái) -> 3 (Nghiêng phải) -> 4 (Đang lưu) -> 5 (Thành công)
  const [step, setStep] = useState(1);
  const [modelLoading, setModelLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [guidanceMessage, setGuidanceMessage] = useState('Đang khởi tạo máy ảnh và mô hình nhận diện AI...');
  const [guidanceStatus, setGuidanceStatus] = useState('info'); // 'info' | 'warning' | 'capturing' | 'error' | 'success'
  const [holdProgress, setHoldProgress] = useState(0); // 0 -> 100% khi người dùng đang giữ đúng góc
  const [isFlashing, setIsFlashing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Lưu trữ các vector descriptor trích xuất từ 3 góc mặt
  const samplesRef = useRef({
    front: null,
    left: null,
    right: null,
    snapshot: null
  });

  const [samplesCount, setSamplesCount] = useState(0);

  // Dừng toàn bộ camera và vòng lặp
  const cleanup = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      stopWebcam(streamRef.current);
      streamRef.current = null;
    }
    holdStartRef.current = null;
  }, []);

  // Xử lý gửi 3 mẫu vector lên server
  const handleSaveBiometrics = async (front, left, right, snapshot) => {
    setIsSaving(true);
    setSaveError('');
    setGuidanceMessage('Đang mã hóa và lưu trữ mẫu sinh trắc học 3 góc lên hệ thống...');
    setGuidanceStatus('capturing');

    try {
      const res = await fetch(`${API_BASE}/attendance/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId || undefined,
          faceDescriptors: [front, left, right],
          facePhoto: snapshot
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep(5);
        setGuidanceMessage('Đăng ký sinh trắc học 3 góc mặt Face ID thành công!');
        setGuidanceStatus('success');
        if (onSuccess) {
          onSuccess({
            success: true,
            samplesCount: 3,
            facePhoto: snapshot,
            message: data.message
          });
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setSaveError(data.message || 'Không thể lưu mẫu khuôn mặt.');
        setGuidanceMessage(data.message || 'Lỗi khi lưu dữ liệu sinh trắc học.');
        setGuidanceStatus('error');
        setIsSaving(false);
      }
    } catch (err) {
      console.error('[AutoFaceEnrollModal Save Error]:', err);
      setSaveError('Lỗi kết nối máy chủ khi lưu mẫu khuôn mặt.');
      setGuidanceMessage('Lỗi kết nối máy chủ. Vui lòng thử lại.');
      setGuidanceStatus('error');
      setIsSaving(false);
    }
  };

  // Khởi động Camera và AI Model khi Modal mở
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    let isMounted = true;
    setStep(1);
    setSamplesCount(0);
    samplesRef.current = { front: null, left: null, right: null, snapshot: null };
    holdStartRef.current = null;
    setHoldProgress(0);
    setCameraError('');
    setSaveError('');
    setModelLoading(true);
    setGuidanceMessage('Đang nạp mô hình nhận diện khuôn mặt...');
    setGuidanceStatus('info');

    const init = async () => {
      try {
        await loadFaceApiModels();
        if (!isMounted) return;
        setModelLoading(false);

        if (!videoRef.current) return;
        const stream = await startWebcam(videoRef.current);
        if (!isMounted) {
          stopWebcam(stream);
          return;
        }
        streamRef.current = stream;

        setGuidanceMessage('Vui lòng nhìn thẳng');
        setGuidanceStatus('info');

        // Bắt đầu vòng lặp phân tích và tự động chụp
        startAnalysisLoop();
      } catch (err) {
        console.error('[AutoFaceEnrollModal Init Error]:', err);
        if (isMounted) {
          setCameraError(err.message || 'Không thể truy cập máy ảnh camera. Vui lòng cấp quyền.');
          setModelLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isOpen, cleanup]);

  // Vòng lặp nhận diện & tự động chụp theo tiến trình 3 góc mặt nghiêm ngặt
  const startAnalysisLoop = () => {
    let currentStep = 1;

    const tick = async () => {
      if (!videoRef.current || !streamRef.current || videoRef.current.paused || videoRef.current.ended) {
        loopRef.current = requestAnimationFrame(tick);
        return;
      }

      try {
        const video = videoRef.current;
        const vWidth = video.videoWidth || 640;
        const vHeight = video.videoHeight || 480;

        const result = await detectFaceAndExtractDescriptor(video, 416);
        const { detection, landmarks, descriptor } = result;

        const analysis = analyzeFacePose(detection, landmarks, vWidth, vHeight);

        // 1. Kiểm tra vị trí tổng quan (Khoảng cách & Căn giữa)
        if (!analysis.isValidPosition) {
          holdStartRef.current = null;
          setHoldProgress(0);
          setGuidanceMessage(analysis.message);
          setGuidanceStatus(analysis.positionStatus === 'no_face' ? 'info' : 'warning');
        } else {
          // 2. Vị trí trong khung đã chuẩn -> Kiểm tra hướng góc mặt theo từng bước
          const REQUIRED_HOLD_MS = 850; // Giữ yên ổn định liên tục trong 850 mili-giây mới tự động chụp

          if (currentStep === 1) {
            // ── BƯỚC 1: YÊU CẦU GÓC CHÍNH DIỆN ──
            if (analysis.pose === 'front') {
              if (!holdStartRef.current) {
                holdStartRef.current = Date.now();
              }
              const elapsed = Date.now() - holdStartRef.current;
              const progress = Math.min(100, Math.round((elapsed / REQUIRED_HOLD_MS) * 100));
              setHoldProgress(progress);
              setGuidanceMessage('Đúng góc! Giữ yên...');
              setGuidanceStatus('capturing');

              // Khi đã giữ yên đủ 850ms liên tục -> Tự động chụp góc 1
              if (elapsed >= REQUIRED_HOLD_MS && descriptor) {
                const snapshot = captureSnapshot(video, 0.75, 480);
                samplesRef.current.front = descriptor;
                samplesRef.current.snapshot = snapshot;
                holdStartRef.current = null;
                setHoldProgress(0);

                // Hiệu ứng flash
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 250);

                currentStep = 2;
                setStep(2);
                setSamplesCount(1);
                setGuidanceMessage('Hãy quay sang trái');
                setGuidanceStatus('info');
              }
            } else {
              // Nhìn lệch khi đang ở bước chính diện
              holdStartRef.current = null;
              setHoldProgress(0);
              setGuidanceMessage('Vui lòng nhìn thẳng');
              setGuidanceStatus('warning');
            }
          } else if (currentStep === 2) {
            // ── BƯỚC 2: YÊU CẦU NGHIÊNG SANG BÊN TRÁI ──
            if (analysis.pose === 'left') {
              // Đúng hướng bên trái
              if (!holdStartRef.current) {
                holdStartRef.current = Date.now();
              }
              const elapsed = Date.now() - holdStartRef.current;
              const progress = Math.min(100, Math.round((elapsed / REQUIRED_HOLD_MS) * 100));
              setHoldProgress(progress);
              setGuidanceMessage('Đúng góc! Giữ yên...');
              setGuidanceStatus('capturing');

              if (elapsed >= REQUIRED_HOLD_MS && descriptor) {
                samplesRef.current.left = descriptor;
                holdStartRef.current = null;
                setHoldProgress(0);

                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 250);

                currentStep = 3;
                setStep(3);
                setSamplesCount(2);
                setGuidanceMessage('Hãy quay sang phải');
                setGuidanceStatus('info');
              }
            } else if (analysis.pose === 'right') {
              // Quay nhầm sang phải -> Báo lỗi sai hướng ngắn gọn
              holdStartRef.current = null;
              setHoldProgress(0);
              setGuidanceMessage('Sai hướng! Hãy quay sang trái');
              setGuidanceStatus('error');
            } else {
              // Đang nhìn thẳng
              holdStartRef.current = null;
              setHoldProgress(0);
              setGuidanceMessage('Hãy quay sang trái');
              setGuidanceStatus('info');
            }
          } else if (currentStep === 3) {
            // ── BƯỚC 3: YÊU CẦU NGHIÊNG SANG BÊN PHẢI ──
            if (analysis.pose === 'right') {
              // Đúng hướng bên phải
              if (!holdStartRef.current) {
                holdStartRef.current = Date.now();
              }
              const elapsed = Date.now() - holdStartRef.current;
              const progress = Math.min(100, Math.round((elapsed / REQUIRED_HOLD_MS) * 100));
              setHoldProgress(progress);
              setGuidanceMessage('Đúng góc! Giữ yên...');
              setGuidanceStatus('capturing');

              if (elapsed >= REQUIRED_HOLD_MS && descriptor) {
                samplesRef.current.right = descriptor;
                holdStartRef.current = null;
                setHoldProgress(0);

                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 250);

                currentStep = 4;
                setStep(4);
                setSamplesCount(3);
                cleanup();

                // Lưu dữ liệu sinh trắc học lên server
                handleSaveBiometrics(
                  samplesRef.current.front,
                  samplesRef.current.left,
                  descriptor,
                  samplesRef.current.snapshot
                );
                return;
              }
            } else if (analysis.pose === 'left') {
              // Quay nhầm sang trái -> Báo lỗi sai hướng ngắn gọn
              holdStartRef.current = null;
              setHoldProgress(0);
              setGuidanceMessage('Sai hướng! Hãy quay sang phải');
              setGuidanceStatus('error');
            } else {
              // Đang nhìn thẳng
              holdStartRef.current = null;
              setHoldProgress(0);
              setGuidanceMessage('Hãy quay sang phải');
              setGuidanceStatus('info');
            }
          }
        }
      } catch (loopErr) {
        // Bỏ qua lỗi frame
      }

      if (currentStep < 4) {
        loopRef.current = requestAnimationFrame(tick);
      }
    };

    loopRef.current = requestAnimationFrame(tick);
  };

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.round((samplesCount / 3) * 100));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: step === 5 ? '#10b981' : step === 4 ? '#2563eb' : '#3b82f6',
                  display: 'inline-block'
                }}
              />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>
                Đăng Ký Sinh Trắc Học Face ID (3 Góc)
              </h3>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              Hệ thống tự động canh chỉnh và chụp khi đạt góc độ chuẩn
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '700',
              padding: '5px 10px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          {/* 3 Thẻ Trạng Thái Tiến Trình Góc Mặt */}
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <div
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.72rem',
                fontWeight: '700',
                background: step > 1 ? '#ecfdf5' : step === 1 ? '#eff6ff' : '#f8fafc',
                color: step > 1 ? '#059669' : step === 1 ? '#2563eb' : '#94a3b8',
                border: `1.5px solid ${step > 1 ? '#a7f3d0' : step === 1 ? '#bfdbfe' : '#e2e8f0'}`
              }}
            >
              1. CHÍNH DIỆN {step > 1 ? '✓' : ''}
            </div>

            <div
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.72rem',
                fontWeight: '700',
                background: step > 2 ? '#ecfdf5' : step === 2 ? '#eff6ff' : '#f8fafc',
                color: step > 2 ? '#059669' : step === 2 ? '#2563eb' : '#94a3b8',
                border: `1.5px solid ${step > 2 ? '#a7f3d0' : step === 2 ? '#bfdbfe' : '#e2e8f0'}`
              }}
            >
              2. NGHIÊNG TRÁI {step > 2 ? '✓' : ''}
            </div>

            <div
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.72rem',
                fontWeight: '700',
                background: step > 3 ? '#ecfdf5' : step === 3 ? '#eff6ff' : '#f8fafc',
                color: step > 3 ? '#059669' : step === 3 ? '#2563eb' : '#94a3b8',
                border: `1.5px solid ${step > 3 ? '#a7f3d0' : step === 3 ? '#bfdbfe' : '#e2e8f0'}`
              }}
            >
              3. NGHIÊNG PHẢI {step > 3 ? '✓' : ''}
            </div>
          </div>

          {/* Khung Oval Quét Khuôn Mặt Chuẩn Face ID */}
          <div
            style={{
              position: 'relative',
              width: '280px',
              height: '350px',
              borderRadius: '50% / 46%',
              overflow: 'hidden',
              backgroundColor: '#0f172a',
              boxShadow: `0 0 0 4px ${
                guidanceStatus === 'capturing'
                  ? '#10b981'
                  : guidanceStatus === 'error'
                  ? '#dc2626'
                  : guidanceStatus === 'warning'
                  ? '#f59e0b'
                  : '#2563eb'
              }, 0 10px 25px -5px rgba(0, 0, 0, 0.3)`,
              transition: 'box-shadow 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Flash Effect khi chụp thành công một góc */}
            {isFlashing && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#ffffff',
                  zIndex: 20,
                  opacity: 0.85,
                  transition: 'opacity 0.2s'
                }}
              />
            )}

            {/* Video Camera (Lật gương scaleX(-1) tự nhiên) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)'
              }}
            />

            {/* Loading Overlay khi nạp mô hình AI */}
            {modelLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  padding: '20px',
                  textAlign: 'center',
                  zIndex: 10
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #3b82f6',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: '12px'
                  }}
                />
                <span>Đang nạp mô hình nhận diện AI...</span>
              </div>
            )}

            {/* Lỗi Camera */}
            {cameraError && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.92)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  padding: '20px',
                  textAlign: 'center',
                  zIndex: 10
                }}
              >
                <div style={{ fontWeight: '800', marginBottom: '6px' }}>Lỗi Camera</div>
                <div>{cameraError}</div>
              </div>
            )}

            {/* Vạch Quét Radar Sinh Trắc Học Tinh Tế */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
                boxShadow: '0 0 8px #38bdf8',
                animation: 'radarScan 2.5s ease-in-out infinite',
                pointerEvents: 'none'
              }}
            />
          </div>

          {/* Thanh Tiến Trình Giữ Yên Tự Động Chụp (Hold Stability Progress Bar) */}
          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${holdProgress}%`,
                height: '100%',
                background: holdProgress === 100 ? '#10b981' : '#2563eb',
                transition: 'width 0.1s linear'
              }}
            />
          </div>

          {/* Dòng Chỉ Dẫn Thời Gian Thực Đổi Màu Động (Có cảnh báo màu đỏ khi quay sai hướng) */}
          <div
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.84rem',
              fontWeight: '700',
              background:
                guidanceStatus === 'capturing'
                  ? '#ecfdf5'
                  : guidanceStatus === 'error'
                  ? '#fef2f2'
                  : guidanceStatus === 'warning'
                  ? '#fffbeb'
                  : guidanceStatus === 'success'
                  ? '#ecfdf5'
                  : '#f1f5f9',
              color:
                guidanceStatus === 'capturing'
                  ? '#059669'
                  : guidanceStatus === 'error'
                  ? '#dc2626'
                  : guidanceStatus === 'warning'
                  ? '#b45309'
                  : guidanceStatus === 'success'
                  ? '#059669'
                  : '#1e293b',
              border: `1.5px solid ${
                guidanceStatus === 'capturing'
                  ? '#a7f3d0'
                  : guidanceStatus === 'error'
                  ? '#fecaca'
                  : guidanceStatus === 'warning'
                  ? '#fde68a'
                  : guidanceStatus === 'success'
                  ? '#a7f3d0'
                  : '#e2e8f0'
              }`,
              transition: 'all 0.2s ease',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {guidanceMessage}
          </div>

          {/* Thanh Tiến Trình Hoàn Thành 3 Góc */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>
              <span>Tiến trình hoàn thành sinh trắc học</span>
              <span>{progressPercent}% ({samplesCount}/3 góc)</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: progressPercent === 100 ? '#10b981' : '#2563eb',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {saveError && (
            <div style={{ color: '#dc2626', fontSize: '0.76rem', fontWeight: '600', textAlign: 'center' }}>
              {saveError}
            </div>
          )}

          {/* Nút Đóng / Hủy */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy Bỏ
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes radarScan {
          0% { top: 5%; opacity: 0.2; }
          50% { top: 90%; opacity: 1; }
          100% { top: 5%; opacity: 0.2; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AutoFaceEnrollModal;