import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import busImage from '../../assets/bus_image.jpg';

const API_BASE = 'http://localhost:8000/api';

const LoginPage = () => {
  const { login, loading } = useContext(AuthContext);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ phone: '', password: '' });

  // Forgot password modal state (3-step OTP recovery via email)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotTimer, setForgotTimer] = useState(0);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  // Countdown timer for 3-minute OTP
  useEffect(() => {
    let interval = null;
    if (showForgotModal && forgotStep === 2 && forgotTimer > 0) {
      interval = setInterval(() => {
        setForgotTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showForgotModal, forgotStep, forgotTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setForgotResetToken('');
    setModalError('');
    setModalSuccess('');
    setForgotTimer(0);
  };

  // 1. Gửi mã OTP xác thực qua Email
  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    const email = (forgotEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setModalError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgotpassword/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotTimer(data.expiresIn || 180);
        setForgotStep(2);
        setModalSuccess('Mã xác thực OTP đã được gửi đến email của bạn. Mã có hiệu lực trong 3 phút.');
      } else {
        setModalError(data.message || 'Không tìm thấy tài khoản liên kết với email này.');
      }
    } catch (err) {
      setModalError('Lỗi kết nối máy chủ khi gửi mã xác thực.');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // 2. Gửi lại mã OTP (khi hết 3 phút)
  const handleResendForgotOtp = async () => {
    if (forgotTimer > 0 || isSubmittingForgot) return;
    setModalError('');
    setModalSuccess('');

    setIsSubmittingForgot(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgotpassword/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotTimer(data.expiresIn || 180);
        setModalSuccess('Mã xác thực mới đã được gửi đến email của bạn.');
      } else {
        setModalError(data.message || 'Không thể gửi lại mã xác thực.');
      }
    } catch (err) {
      setModalError('Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // 3. Xác thực mã OTP 6 số
  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    const cleanOtp = (forgotOtp || '').trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setModalError('Vui lòng nhập đủ 6 chữ số mã xác thực OTP.');
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgotpassword/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), otp: cleanOtp })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotResetToken(data.resetToken);
        setForgotStep(3);
        setModalSuccess('Xác thực OTP thành công! Vui lòng thiết lập mật khẩu mới.');
      } else {
        setModalError(data.message || 'Mã xác thực không chính xác hoặc đã hết hạn.');
      }
    } catch (err) {
      setModalError('Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // 4. Đặt lại mật khẩu mới
  const handleResetForgotPass = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!forgotNewPass || !forgotConfirmPass) {
      setModalError('Vui lòng điền đầy đủ mật khẩu mới và xác nhận mật khẩu.');
      return;
    }
    if (forgotNewPass.length < 8) {
      setModalError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setModalError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgotpassword/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          resetToken: forgotResetToken,
          newPassword: forgotNewPass
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
        setTimeout(() => {
          closeForgotModal();
          setPassword(forgotNewPass);
          if (forgotEmail) setPhone(forgotEmail);
        }, 1500);
      } else {
        setModalError(data.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      setModalError('Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // Kiểm tra chi tiết định dạng số điện thoại Việt Nam
  const validatePhoneInput = (rawPhone) => {
    let clean = (rawPhone || '').trim().replace(/[\s\-\.]/g, '');
    if (clean.startsWith('+84')) clean = '0' + clean.slice(3);
    else if (clean.startsWith('84') && clean.length === 11) clean = '0' + clean.slice(2);

    if (!clean) return 'Vui lòng điền Số điện thoại hoặc Email nhân sự.';
    if (!/^\d+$/.test(clean)) return 'Số điện thoại chỉ được chứa các chữ số.';
    if (!clean.startsWith('0')) return 'Số điện thoại phải bắt đầu bằng số 0.';
    if (clean.length !== 10) return 'Số điện thoại phải có đúng 10 chữ số.';
    if (!/^(0[35789])/.test(clean)) return 'Đầu số không đúng định dạng.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const newErrors = { phone: '', password: '' };
    let hasError = false;

    const key = (phone || '').trim();

    // 1. Kiểm tra Số điện thoại / Email
    if (!key) {
      newErrors.phone = 'Vui lòng điền Số điện thoại hoặc Email nhân sự.';
      hasError = true;
    } else if (/[a-zA-Z]/.test(key) || key.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(key)) {
        newErrors.phone = 'Email không đúng định dạng.';
        hasError = true;
      }
    } else {
      const phoneErr = validatePhoneInput(key);
      if (phoneErr) {
        newErrors.phone = phoneErr;
        hasError = true;
      }
    }

    // 2. Kiểm tra Mật khẩu
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu truy cập.';
      hasError = true;
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải chứa tối thiểu 8 ký tự.';
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({ phone: '', password: '' });
    const result = await login(key, password);
    if (!result.success) {
      setError(result.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.');
    }
  };

  return (
    <div className="login-page-root" style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      backgroundColor: '#0a1128',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#ffffff',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>

      {/* CSS Stylesheet & Responsive Breakpoints */}
      <style>{`
        /* Cinematic Dark Coastal Bus Background */
        .cinematic-bg-container {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background-image: url('${busImage}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .cinematic-bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(10, 17, 40, 0.92) 0%,
            rgba(15, 23, 42, 0.84) 45%,
            rgba(15, 23, 42, 0.94) 100%
          );
          backdrop-filter: blur(2px);
        }

        .glass-card {
          background: rgba(15, 23, 42, 0.62) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
          transition: all 0.25s ease !important;
        }

        .glass-card:hover {
          background: rgba(15, 23, 42, 0.75) !important;
          border-color: rgba(56, 189, 248, 0.35) !important;
          transform: translateY(-2px) !important;
        }

        .login-input-box:focus-within {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
        }

        .btn-portal-submit {
          transition: all 0.2s ease !important;
        }

        .btn-portal-submit:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 20px -2px rgba(37, 99, 235, 0.45) !important;
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
        }

        .btn-portal-submit:active {
          transform: translateY(0) !important;
        }

        /* Modal Transitions */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(10, 17, 40, 0.78);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
        }

        .modal-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          color: #0f172a;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          position: relative;
        }

        /* RESPONSIVE MEDIA QUERIES */
        @media (max-width: 1080px) {
          .login-main-container {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
            padding: 2rem 1.5rem !important;
            max-width: 480px !important;
          }
          .login-hero-section {
            display: none !important;
          }
          .login-header {
            padding: 0.85rem 1.5rem !important;
          }
          .login-footer {
            padding: 1rem 1.5rem !important;
            flex-direction: column !important;
            text-align: center !important;
            gap: 0.6rem !important;
          }
          .login-footer-links {
            justify-content: center !important;
          }
        }

        @media (max-width: 640px) {
          .login-main-container {
            padding: 1.25rem 1rem !important;
          }
          .login-card {
            padding: 1.75rem 1.25rem !important;
            border-radius: 16px !important;
          }
          .login-card h2 {
            font-size: 1.38rem !important;
          }
          .login-header {
            padding: 0.75rem 1rem !important;
          }
          .login-footer {
            padding: 0.85rem 1rem !important;
            font-size: 0.7rem !important;
          }
          .login-footer-links {
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 0.75rem !important;
          }
        }
      `}</style>

      {/* Cinematic Fullscreen Background */}
      <div className="cinematic-bg-container">
        <div className="cinematic-bg-overlay" />
      </div>

      {/* Top Header Bar */}
      <header className="login-header" style={{
        position: 'relative',
        zIndex: 2,
        padding: '0.85rem 3.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(10, 17, 40, 0.75)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Brand Logo An Bình Lines */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 3px 10px rgba(37, 99, 235, 0.35)',
            flexShrink: 0
          }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 6v6" />
              <path d="M15 6v6" />
              <path d="M2 12h19.6" />
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
              <circle cx="7" cy="18" r="2" />
              <path d="M9 18h5" />
              <circle cx="16" cy="18" r="2" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', lineHeight: '1.1', letterSpacing: '-0.3px' }}>
              An Bình Lines
            </span>
            <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.6px', marginTop: '1px' }}>
              HỆ THỐNG QUẢN TRỊ VẬN TẢI
            </span>
          </div>
        </div>


      </header>

      {/* Main Content Body */}
      <main className="login-main-container" style={{
        position: 'relative',
        zIndex: 2,
        flex: 1,
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '2rem 3.5rem',
        display: 'grid',
        gridTemplateColumns: '1.2fr 440px',
        gap: '3.5rem',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>

        {/* Left Column: Vision, Real Bus Showcase & Feature Highlights */}
        <div className="login-hero-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <h1 style={{
              fontSize: '2.4rem', fontWeight: '900', color: '#ffffff', lineHeight: '1.2',
              letterSpacing: '-0.8px', margin: 0
            }}>
              Hành Trình Thông Minh,<br />
              <span style={{ color: '#38bdf8' }}>Kết Nối Trọn Vẹn Niềm Tin.</span>
            </h1>

            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', marginTop: '0.65rem', maxWidth: '680px' }}>
              Nền tảng số hóa toàn diện vận tải hành khách liên tỉnh cao cấp. Tối ưu hóa điều vận, quản lý biểu đồ giờ, kiểm soát vé điện tử tập trung và nâng chuẩn trải nghiệm khách hàng vượt trội.
            </p>
          </div>

          {/* Glassmorphic Bus Fleet Showcase Card */}
          <div className="glass-card" style={{
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
              flexShrink: 0
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12l4 6-10 12L2 9z" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Đội xe An Bình Lines
                </span>
                <span style={{ fontSize: '0.86rem', fontWeight: '800', color: '#ffffff' }}>
                  Dòng xe Limousine &amp; Giường nằm cao cấp
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: '1.4' }}>
                Hành trình ven biển tuyệt đẹp &amp; liên tỉnh Bắc - Nam. 100% phương tiện vận hành chuẩn hóa, giám sát an toàn 24/7.
              </div>
            </div>
          </div>

          {/* 3 Dark Glassmorphic Feature Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>

            <div className="glass-card" style={{ borderRadius: '12px', padding: '0.9rem' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h3v3H7z" /><path d="M14 7h3v3h-3z" /><path d="M7 14h3v3H7z" /><path d="M14 14h3v3h-3z" /></svg>
              </div>
              <h3 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#ffffff', margin: '0 0 3px 0' }}>
                Đặt vé &amp; Tra cứu 24/7
              </h3>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.35', margin: 0 }}>
                Sơ đồ ghế 3D trực quan, xuất vé QR tức thì.
              </p>
            </div>

            <div className="glass-card" style={{ borderRadius: '12px', padding: '0.9rem' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(147, 51, 234, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-3" /><rect x="9" y="9" width="2" height="2" /><rect x="9" y="13" width="2" height="2" /><rect x="9" y="17" width="2" height="2" /></svg>
              </div>
              <h3 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#ffffff', margin: '0 0 3px 0' }}>
                Trạm dừng cao cấp
              </h3>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.35', margin: 0 }}>
                Mạng lưới trạm dừng tiện nghi hiện đại Bắc - Nam.
              </p>
            </div>

            <div className="glass-card" style={{ borderRadius: '12px', padding: '0.9rem' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <h3 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#ffffff', margin: '0 0 3px 0' }}>
                An toàn &amp; Tiện nghi
              </h3>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.35', margin: 0 }}>
                Ghế ngả công thái học, WiFi tốc độ cao &amp; sạc pin.
              </p>
            </div>

          </div>

          {/* Metrics Banner Bar */}
          <div className="glass-card" style={{
            borderRadius: '14px',
            padding: '0.9rem 1.4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', lineHeight: '1.1' }}>
                5.000.000+
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Lượt khách hài lòng
              </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.12)', paddingLeft: '1.4rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', lineHeight: '1.1' }}>
                63
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tỉnh thành kết nối
              </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.12)', paddingLeft: '1.4rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#38bdf8', lineHeight: '1.1' }}>
                99.9%
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Chuyến đi đúng giờ
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Clean White Login Card */}
        <div className="login-card-wrapper" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>

          <div className="login-card" style={{
            width: '100%',
            maxWidth: '440px',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            padding: '2.5rem 2.25rem',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Glowing Accent Top Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #38bdf8 0%, #2563eb 50%, #818cf8 100%)'
            }} />

            {/* Title & Subtitle */}
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
              Đăng Nhập Hệ Thống
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: '1.45' }}>
              Dành cho Cán bộ Quản lý, Điều hành tuyến &amp; Nhân viên vận hành
            </p>

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

              {/* Input 1: Email hoặc Số điện thoại */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                  Email hoặc Số điện thoại
                </label>
                <div className="login-input-box" style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: fieldErrors.phone ? '#fef2f2' : '#ffffff',
                  border: `1px solid ${fieldErrors.phone ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ position: 'absolute', left: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <polyline points="3 7 12 13 21 7" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="09xxx hoặc email@example.com"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                      if (error) setError('');
                    }}
                    style={{
                      width: '100%', padding: '0.78rem 1rem 0.78rem 2.6rem',
                      border: 'none', background: 'transparent',
                      fontSize: '0.92rem', color: '#0f172a',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                {fieldErrors.phone && (
                  <div style={{ color: '#ef4444', fontSize: '0.74rem', marginTop: '4px', fontWeight: '600' }}>
                    {fieldErrors.phone}
                  </div>
                )}
              </div>

              {/* Input 2: Mật khẩu */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotEmail(phone.includes('@') ? phone : '');
                    }}
                    style={{
                      background: 'none', border: 'none', color: '#2563eb',
                      fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', padding: 0
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="login-input-box" style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: fieldErrors.password ? '#fef2f2' : '#ffffff',
                  border: `1px solid ${fieldErrors.password ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ position: 'absolute', left: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                      if (error) setError('');
                    }}
                    style={{
                      width: '100%', padding: '0.78rem 2.8rem 0.78rem 2.6rem',
                      border: 'none', background: 'transparent',
                      fontSize: '0.92rem', color: '#0f172a',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    style={{
                      position: 'absolute', right: '12px',
                      background: 'none', border: 'none', color: '#64748b',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div style={{ color: '#ef4444', fontSize: '0.74rem', marginTop: '4px', fontWeight: '600' }}>
                    {fieldErrors.password}
                  </div>
                )}
              </div>

              {/* Options Row: Remember Me */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#2563eb', cursor: 'pointer', width: '15px', height: '15px' }}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {/* Error Alert */}
              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
                  padding: '0.65rem 0.9rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600'
                }}>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-portal-submit"
                style={{
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff', border: 'none', padding: '0.85rem 1.25rem',
                  borderRadius: '10px', fontSize: '0.95rem', fontWeight: '800',
                  cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  marginTop: '0.35rem'
                }}
              >
                {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP HỆ THỐNG ➔'}
              </button>
            </form>



          </div>

        </div>

      </main>

      {/* Page Footer Bar */}
      <footer className="login-footer" style={{
        position: 'relative',
        zIndex: 2,
        padding: '0.85rem 3.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: '#94a3b8',
        background: 'rgba(10, 17, 40, 0.8)',
        backdropFilter: 'blur(10px)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div>
          © 2026 <strong>An Bình Lines Corporation.</strong> Bảo lưu toàn bộ quyền thương hiệu và điều hành vận tải.
        </div>
        <div className="login-footer-links" style={{ display: 'flex', gap: '1.25rem' }}>
          <span style={{ cursor: 'pointer' }}>Điều khoản dịch vụ</span>
          <span>•</span>
          <span style={{ cursor: 'pointer' }}>Quy chuẩn vận hành</span>
          <span>•</span>
          <span style={{ cursor: 'pointer' }}>Chính sách bảo mật</span>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* MODAL QUÊN MẬT KHẨU (3 BƯỚC XÁC THỰC QUA EMAIL OTP) */}
      {/* ============================================================== */}
      {showForgotModal && (
        <div className="modal-backdrop" onClick={closeForgotModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem 1.85rem' }}>

            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: '#eff6ff', color: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  Khôi phục mật khẩu
                </h3>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', fontSize: '1.25rem', padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Subtitle / Step Indicator */}
            <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '700', marginBottom: '14px' }}>
              {forgotStep === 1 && 'Bước 1/3: Nhập email tài khoản để nhận mã xác thực OTP.'}
              {forgotStep === 2 && `Bước 2/3: Nhập mã xác thực đã gửi tới ${forgotEmail}.`}
              {forgotStep === 3 && 'Bước 3/3: Thiết lập mật khẩu mới.'}
            </div>

            {/* Alert Message */}
            {modalError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem',
                fontWeight: '600', marginBottom: '12px'
              }}>
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div style={{
                background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857',
                padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem',
                fontWeight: '600', marginBottom: '12px'
              }}>
                {modalSuccess}
              </div>
            )}

            {/* ================= BƯỚC 1: NHẬP EMAIL ================= */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendForgotOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Email đã đăng ký trong hồ sơ nhân viên
                  </label>
                  <input
                    type="email"
                    placeholder="ví dụ: admin@anbinhlines.vn"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (modalError) setModalError('');
                    }}
                    disabled={isSubmittingForgot}
                    autoFocus
                    style={{
                      width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '0.9rem',
                      background: '#f8fafc', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingForgot}
                  className="btn-portal-submit"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff', border: 'none', padding: '0.8rem',
                    borderRadius: '8px', fontSize: '0.92rem', fontWeight: '800',
                    cursor: isSubmittingForgot ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmittingForgot ? 'Đang gửi mã...' : 'GỬI MÃ XÁC THỰC OTP ➔'}
                </button>
              </form>
            )}

            {/* ================= BƯỚC 2: NHẬP MÃ OTP ================= */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyForgotOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Mã xác thực OTP (6 chữ số)
                  </label>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="------"
                    value={forgotOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setForgotOtp(val);
                      if (modalError) setModalError('');
                    }}
                    disabled={isSubmittingForgot}
                    autoFocus
                    style={{
                      width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '1.3rem',
                      fontWeight: '800', letterSpacing: '8px', textAlign: 'center',
                      background: '#f8fafc', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Countdown & Resend Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  {forgotTimer > 0 ? (
                    <span style={{ color: '#64748b' }}>
                      Mã có hiệu lực: <strong style={{ color: '#dc2626' }}>{formatTimer(forgotTimer)}</strong>
                    </span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: '700' }}>
                      Mã OTP đã hết hạn!
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleResendForgotOtp}
                    disabled={forgotTimer > 0 || isSubmittingForgot}
                    style={{
                      background: 'none', border: 'none',
                      color: forgotTimer > 0 ? '#94a3b8' : '#2563eb',
                      cursor: forgotTimer > 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '700', textDecoration: forgotTimer > 0 ? 'none' : 'underline'
                    }}
                  >
                    {forgotTimer > 0 ? `Gửi lại sau (${formatTimer(forgotTimer)})` : 'Gửi lại mã OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingForgot}
                  className="btn-portal-submit"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff', border: 'none', padding: '0.8rem',
                    borderRadius: '8px', fontSize: '0.92rem', fontWeight: '800',
                    cursor: isSubmittingForgot ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmittingForgot ? 'Đang xác thực...' : 'XÁC THỰC MÃ OTP ➔'}
                </button>

                <button
                  type="button"
                  onClick={() => { setForgotStep(1); setModalError(''); setModalSuccess(''); }}
                  style={{
                    background: 'none', border: 'none', color: '#64748b',
                    cursor: 'pointer', fontSize: '0.8rem', textAlign: 'center'
                  }}
                >
                  ← Đổi địa chỉ email khác
                </button>
              </form>
            )}

            {/* ================= BƯỚC 3: ĐẶT MẬT KHẨU MỚI ================= */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetForgotPass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Mật khẩu mới (tối thiểu 8 ký tự)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showForgotNewPass ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu mới..."
                      value={forgotNewPass}
                      onChange={(e) => {
                        setForgotNewPass(e.target.value);
                        if (modalError) setModalError('');
                      }}
                      disabled={isSubmittingForgot}
                      autoFocus
                      style={{
                        width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '8px',
                        border: '1px solid #cbd5e1', fontSize: '0.9rem',
                        background: '#f8fafc', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      {showForgotNewPass ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                    Xác nhận mật khẩu mới
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showForgotConfirmPass ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới..."
                      value={forgotConfirmPass}
                      onChange={(e) => {
                        setForgotConfirmPass(e.target.value);
                        if (modalError) setModalError('');
                      }}
                      disabled={isSubmittingForgot}
                      style={{
                        width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '8px',
                        border: '1px solid #cbd5e1', fontSize: '0.9rem',
                        background: '#f8fafc', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      {showForgotConfirmPass ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingForgot}
                  className="btn-portal-submit"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff', border: 'none', padding: '0.8rem',
                    borderRadius: '8px', fontSize: '0.92rem', fontWeight: '800',
                    cursor: isSubmittingForgot ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmittingForgot ? 'Đang lưu...' : 'LƯU MẬT KHẨU MỚI ➔'}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
