import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  Bus,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  X,
  PhoneCall
} from 'lucide-react';
import './AuthPage.css';

const AuthPage = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [isWiping, setIsWiping] = useState(false);

  // Login form state
  const [loginKey, setLoginKey] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Common error state
  const [validationError, setValidationError] = useState('');
  const [loginErrors, setLoginErrors] = useState({ key: '', password: '' });
  const [regErrors, setRegErrors] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' });

  // Kiểm tra chi tiết định dạng Họ và tên
  const validateNameInput = (rawName) => {
    const name = (rawName || '').trim();
    if (!name) return 'Vui lòng nhập Họ và tên.';
    if (name.length < 2) return 'Họ và tên phải có tối thiểu 2 ký tự.';
    if (name.length > 50) return 'Họ và tên không được vượt quá 50 ký tự.';
    if (/\d/.test(name)) return 'Họ và tên không được chứa chữ số.';
    const vietnameseNameRegex = /^[a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ\s]+$/;
    if (!vietnameseNameRegex.test(name)) {
      return 'Họ và tên chỉ được chứa chữ cái và khoảng trắng.';
    }
    return null;
  };

  // Kiểm tra chi tiết định dạng Email (Bắt buộc để nhận OTP)
  const validateEmailInput = (rawEmail) => {
    const email = (rawEmail || '').trim();
    if (!email) return 'Vui lòng nhập Email.';
    if (email.length > 100) return 'Email không được vượt quá 100 ký tự.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return 'Email không đúng định dạng.';
    }
    return null;
  };

  // Kiểm tra độ an toàn mật khẩu theo chuẩn OWASP / NIST
  const validatePasswordSecurity = (pass) => {
    if (!pass) return 'Vui lòng nhập mật khẩu.';
    if (pass.length < 8) return 'Mật khẩu phải chứa tối thiểu 8 ký tự.';
    if (!/[A-Z]/.test(pass)) return 'Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z).';
    if (!/[a-z]/.test(pass)) return 'Mật khẩu phải chứa ít nhất 1 chữ cái in thường (a-z).';
    if (!/\d/.test(pass)) return 'Mật khẩu phải chứa ít nhất 1 chữ số (0-9).';
    if (!/[@$!%*?&#_.-]/.test(pass)) return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
    return null;
  };

  // Kiểm tra chi tiết định dạng số điện thoại Việt Nam
  const validatePhoneInput = (rawPhone) => {
    let clean = (rawPhone || '').trim().replace(/[\s\-\.]/g, '');
    if (clean.startsWith('+84')) clean = '0' + clean.slice(3);
    else if (clean.startsWith('84') && clean.length === 11) clean = '0' + clean.slice(2);

    if (!clean) return 'Vui lòng nhập Số điện thoại.';
    if (!/^\d+$/.test(clean)) return 'Số điện thoại chỉ được chứa các chữ số.';
    if (!clean.startsWith('0')) return 'Số điện thoại phải bắt đầu bằng số 0.';
    if (clean.length !== 10) return 'Số điện thoại phải có đúng 10 chữ số.';
    if (!/^(0[35789])/.test(clean)) return 'Đầu số không đúng định dạng.';
    return null;
  };

  // Forgot password modal state (3-step OTP recovery)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [forgotTimer, setForgotTimer] = useState(0); // 180s = 3 phút
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  const {
    login,
    register,
    sendForgotOtp,
    verifyForgotOtp,
    resetForgotPass,
    isAuthenticated,
    error,
    setError,
    loading
  } = useContext(AuthContext);

  // Bộ đếm ngược 3 phút (180s) cho mã OTP và nút gửi lại
  useEffect(() => {
    let interval = null;
    if (forgotTimer > 0) {
      interval = setInterval(() => {
        setForgotTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [forgotTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtp('');
    setForgotResetToken('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setShowForgotNewPass(false);
    setShowForgotConfirmPass(false);
    setModalError('');
    setModalSuccess('');
    setForgotTimer(0);
    setIsSubmittingForgot(false);
  };
  const navigate = useNavigate();
  const location = useLocation();

  // Sync mode with route if navigating between /login and /register
  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  // Clear errors when switching
  useEffect(() => {
    setError(null);
    setValidationError('');
    setLoginErrors({ key: '', password: '' });
    setRegErrors({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
  }, [mode, setError]);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Switch mode with smooth wipe effect
  const handleSwitchMode = (newMode) => {
    if (newMode === mode) return;
    setIsWiping(true);
    setValidationError('');
    setError(null);
    setMode(newMode);

    // Update URL seamlessly without full reload
    if (newMode === 'register') {
      window.history.replaceState(null, '', '/register');
    } else {
      window.history.replaceState(null, '', '/login');
    }

    setTimeout(() => {
      setIsWiping(false);
    }, 500);
  };

  // Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setError(null);

    const key = (loginKey || '').trim();
    const newErrors = { key: '', password: '' };
    let hasError = false;

    // 1. Kiểm tra Email hoặc Số điện thoại
    if (!key) {
      newErrors.key = 'Vui lòng nhập Email hoặc Số điện thoại.';
      hasError = true;
    } else if (/[a-zA-Z]/.test(key) || key.includes('@')) {
      // Người dùng đang nhập Email (chứa chữ cái hoặc ký tự @)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(key)) {
        newErrors.key = 'Email không đúng định dạng.';
        hasError = true;
      }
    } else {
      // Người dùng đang nhập Số điện thoại
      const phoneErr = validatePhoneInput(key);
      if (phoneErr) {
        newErrors.key = phoneErr;
        hasError = true;
      }
    }

    // 2. Kiểm tra Mật khẩu form đăng nhập
    if (!loginPassword) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
      hasError = true;
    } else if (loginPassword.length < 8) {
      newErrors.password = 'Mật khẩu phải chứa tối thiểu 8 ký tự.';
      hasError = true;
    }

    if (hasError) {
      setLoginErrors(newErrors);
      return;
    }

    setLoginErrors({ key: '', password: '' });
    const res = await login(key, loginPassword);
    if (res && res.success) {
      navigate('/');
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setError(null);

    const newErrors = { name: '', phone: '', email: '', password: '', confirmPassword: '' };
    let hasError = false;

    const name = regName.trim();
    const phone = regPhone.trim().replace(/[\s\-\.]/g, '').replace(/^\+84/, '0');
    const email = regEmail.trim();

    const nameErr = validateNameInput(regName);
    if (nameErr) {
      newErrors.name = nameErr;
      hasError = true;
    }

    const phoneErr = validatePhoneInput(regPhone);
    if (phoneErr) {
      newErrors.phone = phoneErr;
      hasError = true;
    }

    const emailErr = validateEmailInput(regEmail);
    if (emailErr) {
      newErrors.email = emailErr;
      hasError = true;
    }

    const passError = validatePasswordSecurity(regPassword);
    if (passError) {
      newErrors.password = passError;
      hasError = true;
    }

    if (!regConfirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
      hasError = true;
    } else if (regPassword !== regConfirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không trùng khớp.';
      hasError = true;
    }

    if (hasError) {
      setRegErrors(newErrors);
      return;
    }

    setRegErrors({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
    const res = await register(name, email, phone, regPassword);
    if (res && res.success) {
      navigate('/');
    }
  };

  // ================= QUY TRÌNH KHÔI PHỤC MẬT KHẨU 3 BƯỚC =================
  // Bước 1: Gửi mã OTP xác thực qua Email
  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    const email = (forgotEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setModalError('Email không đúng định dạng.');
      return;
    }

    setIsSubmittingForgot(true);
    const res = await sendForgotOtp(email);
    setIsSubmittingForgot(false);

    if (res && res.success) {
      setForgotTimer(180); // 3 phút theo yêu cầu
      setForgotStep(2);
      if (res.devOtp) {
        setForgotOtp(res.devOtp);
      }
      setModalSuccess(res.message || 'Mã xác thực OTP đã được tạo thành công.');
    } else {
      setModalError(res.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.');
    }
  };

  // Gửi lại mã OTP (chỉ bấm được khi hết 3 phút)
  const handleResendForgotOtp = async () => {
    if (forgotTimer > 0 || isSubmittingForgot) return;
    setModalError('');
    setModalSuccess('');

    setIsSubmittingForgot(true);
    const res = await sendForgotOtp(forgotEmail);
    setIsSubmittingForgot(false);

    if (res && res.success) {
      setForgotTimer(180);
      if (res.devOtp) {
        setForgotOtp(res.devOtp);
      }
      setModalSuccess(res.message || 'Mã xác thực mới đã được gửi lại.');
    } else {
      setModalError(res.message || 'Không thể gửi lại mã xác thực.');
    }
  };

  // Bước 2: Xác thực mã OTP 6 số
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
    const res = await verifyForgotOtp(forgotEmail, cleanOtp);
    setIsSubmittingForgot(false);

    if (res && res.success) {
      setForgotResetToken(res.resetToken);
      setForgotStep(3);
      setModalSuccess('Xác thực OTP thành công! Vui lòng thiết lập mật khẩu mới.');
    } else {
      setModalError(res.message || 'Mã xác thực không chính xác hoặc đã hết hạn.');
    }
  };

  // Bước 3: Đặt lại mật khẩu mới
  const handleResetForgotPass = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!forgotNewPass || !forgotConfirmPass) {
      setModalError('Vui lòng điền đầy đủ các thông tin yêu cầu.');
      return;
    }

    const passError = validatePasswordSecurity(forgotNewPass);
    if (passError) {
      setModalError(passError);
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setModalError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setIsSubmittingForgot(true);
    const res = await resetForgotPass(forgotEmail, forgotResetToken, forgotNewPass);
    setIsSubmittingForgot(false);

    if (res && res.success) {
      setModalSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setTimeout(() => {
        closeForgotModal();
        setMode('login');
      }, 1500);
    } else {
      setModalError(res.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="auth-wrapper">
      {/* 1. Header gọn gàng */}
      <header className="auth-header">
        <Link to="/" className="auth-header-brand">
          <div className="auth-brand-icon-box">
            <Bus size={18} />
          </div>
          <span className="auth-brand-name">An Bình Lines</span>
        </Link>

        <div className="auth-header-nav">
          <Link to="/" className="auth-header-link">
            Tìm chuyến
          </Link>

          <button
            type="button"
            className={`auth-header-btn-login ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('login')}
          >
            <LogIn size={15} />
            Đăng nhập
          </button>

          <button
            type="button"
            className="auth-header-btn-register"
            onClick={() => handleSwitchMode('register')}
          >
            <UserPlus size={15} />
            Đăng ký
          </button>
        </div>
      </header>

      {/* 2. Hero Background xe khách biển siêu nét 8K */}
      <section
        className="auth-hero-container"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/auth_banner.jpg)` }}
      >
        <div className="auth-hero-overlay" />

        {/* 3. Card Đăng Nhập / Đăng Ký (Fit gọn gàng 1 màn hình) */}
        <div className={`auth-card mode-${mode} ${isWiping ? 'wipe-active' : ''}`}>
          {/* Segmented Pill Tabs */}
          <div className="auth-tabs-pill">
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('login')}
            >
              <LogIn size={15} />
              Đăng Nhập
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('register')}
            >
              <UserPlus size={15} />
              Đăng Ký
            </button>
          </div>

          {/* Center Badge Icon */}
          <div className="auth-badge-icon">
            {mode === 'login' ? <Bus size={22} /> : <UserPlus size={22} />}
          </div>

          {/* Title & Subtitle */}
          <h2 className="auth-card-title">
            {mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký Thành Viên'}
          </h2>
          <p className="auth-card-subtitle">
            {mode === 'login'
              ? 'Đăng nhập để đặt vé xe và theo dõi hành trình'
              : 'Đăng ký tài khoản để đặt vé và quản lý chuyến đi'}
          </p>

          {/* Error Alert Banner */}
          {(validationError || error) && (
            <div className="auth-alert-banner">
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* ================= FORM ĐĂNG NHẬP (2 HÀNG GỌN GÀNG) ================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              <div className="auth-form-group">
                <label className="auth-form-label">Email hoặc Số điện thoại</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    className={`auth-input ${loginErrors.key ? 'has-error' : ''}`}
                    placeholder="09xxx hoặc email@example.com"
                    value={loginKey}
                    onChange={(e) => {
                      setLoginKey(e.target.value);
                      if (loginErrors.key) setLoginErrors(prev => ({ ...prev, key: '' }));
                      if (validationError) setValidationError('');
                      if (error) setError(null);
                    }}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                {loginErrors.key && (
                  <span className="auth-field-error">{loginErrors.key}</span>
                )}
              </div>

              <div className="auth-form-group">
                <div className="auth-form-label-row">
                  <label className="auth-form-label">Mật khẩu</label>
                  <span
                    className="auth-forgot-link"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Quên mật khẩu?
                  </span>
                </div>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    className={`auth-input ${loginErrors.password ? 'has-error' : ''}`}
                    placeholder="Nhập mật khẩu..."
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginErrors.password) setLoginErrors(prev => ({ ...prev, password: '' }));
                      if (validationError) setValidationError('');
                      if (error) setError(null);
                    }}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    tabIndex="-1"
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {loginErrors.password && (
                  <span className="auth-field-error">{loginErrors.password}</span>
                )}
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                <span>{loading ? 'Đang xử lý...' : 'Đăng Nhập'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>

              <div className="auth-card-footer">
                <span>Chưa có tài khoản?</span>
                <button
                  type="button"
                  className="auth-switch-text-btn"
                  onClick={() => handleSwitchMode('register')}
                >
                  Đăng ký thành viên
                </button>
              </div>
            </form>
          )}

          {/* ================= FORM ĐĂNG KÝ (BỐ CỤC 3 HÀNG GỌN GÀNG KHÔNG TRÀN) ================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              {/* Hàng 1: Họ tên + Số điện thoại (2 cột) */}
              <div className="auth-form-grid-2">
                <div className="auth-form-group">
                  <label className="auth-form-label">Họ và tên *</label>
                  <div className="auth-input-wrapper">
                    <User size={15} className="auth-input-icon" />
                    <input
                      type="text"
                      className={`auth-input ${regErrors.name ? 'has-error' : ''}`}
                      placeholder="Nguyễn Văn A"
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        if (regErrors.name) setRegErrors(prev => ({ ...prev, name: '' }));
                        if (validationError) setValidationError('');
                      }}
                      disabled={loading}
                    />
                  </div>
                  {regErrors.name && (
                    <span className="auth-field-error">{regErrors.name}</span>
                  )}
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label">Số điện thoại *</label>
                  <div className="auth-input-wrapper">
                    <Phone size={15} className="auth-input-icon" />
                    <input
                      type="tel"
                      className={`auth-input ${regErrors.phone ? 'has-error' : ''}`}
                      placeholder="0901 234 567"
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(e.target.value);
                        if (regErrors.phone) setRegErrors(prev => ({ ...prev, phone: '' }));
                        if (validationError) setValidationError('');
                      }}
                      disabled={loading}
                    />
                  </div>
                  {regErrors.phone && (
                    <span className="auth-field-error">{regErrors.phone}</span>
                  )}
                </div>
              </div>

              {/* Hàng 2: Email (1 cột) */}
              <div className="auth-form-group">
                <label className="auth-form-label">Email *</label>
                <div className="auth-input-wrapper">
                  <Mail size={15} className="auth-input-icon" />
                  <input
                    type="email"
                    className={`auth-input ${regErrors.email ? 'has-error' : ''}`}
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regErrors.email) setRegErrors(prev => ({ ...prev, email: '' }));
                      if (validationError) setValidationError('');
                    }}
                    disabled={loading}
                  />
                </div>
                {regErrors.email && (
                  <span className="auth-field-error">{regErrors.email}</span>
                )}
              </div>

              {/* Hàng 3: Mật khẩu + Xác nhận mật khẩu (2 cột) */}
              <div className="auth-form-grid-2">
                <div className="auth-form-group">
                  <label className="auth-form-label">Mật khẩu *</label>
                  <div className="auth-input-wrapper">
                    <Lock size={15} className="auth-input-icon" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      className={`auth-input ${regErrors.password ? 'has-error' : ''}`}
                      placeholder="Tối thiểu 8 ký tự"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regErrors.password) setRegErrors(prev => ({ ...prev, password: '' }));
                        if (validationError) setValidationError('');
                      }}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      tabIndex="-1"
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {regErrors.password && (
                    <span className="auth-field-error">{regErrors.password}</span>
                  )}
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label">Xác nhận MK *</label>
                  <div className="auth-input-wrapper">
                    <KeyRound size={15} className="auth-input-icon" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      className={`auth-input ${regErrors.confirmPassword ? 'has-error' : ''}`}
                      placeholder="Nhập lại mật khẩu"
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        if (regErrors.confirmPassword) setRegErrors(prev => ({ ...prev, confirmPassword: '' }));
                        if (validationError) setValidationError('');
                      }}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      tabIndex="-1"
                    >
                      {showRegConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {regErrors.confirmPassword && (
                    <span className="auth-field-error">{regErrors.confirmPassword}</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Tài Khoản'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>

              <div className="auth-card-footer">
                <span>Đã có tài khoản?</span>
                <button
                  type="button"
                  className="auth-switch-text-btn"
                  onClick={() => handleSwitchMode('login')}
                >
                  Đăng nhập ngay
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 4. Footer nhỏ gọn */}
      <footer className="auth-footer">
        <div className="auth-footer-left">
          <span className="auth-footer-brand-title">An Bình Lines</span>
          <span>•</span>
          <span>© 2026 An Bình Lines. Toàn bộ quyền được bảo lưu.</span>
        </div>

        <div className="auth-footer-right">
          <a href="#about" className="auth-footer-link">Về chúng tôi</a>
          <a href="#terms" className="auth-footer-link">Điều khoản</a>
          <a href="#privacy" className="auth-footer-link">Bảo mật</a>
          <span className="auth-footer-hotline">
            <PhoneCall size={13} />
            1900 6868
          </span>
        </div>
      </footer>

      {/* Modal Quên Mật Khẩu (3 Bước chuẩn bảo mật qua Email OTP) */}
      {showForgotModal && (
        <div className="auth-modal-backdrop" onClick={closeForgotModal}>
          <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Khôi phục mật khẩu
              </h3>
              <button
                type="button"
                onClick={closeForgotModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Bước chỉ dẫn */}
            <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '700', marginBottom: '12px' }}>
              {forgotStep === 1 && 'Bước 1/3: Nhập email tài khoản để nhận mã OTP.'}
              {forgotStep === 2 && `Bước 2/3: Nhập mã xác thực đã gửi tới ${forgotEmail}.`}
              {forgotStep === 3 && 'Bước 3/3: Thiết lập mật khẩu mới chuẩn an ninh.'}
            </div>

            {modalError && (
              <div className="auth-alert-banner" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
                <ShieldAlert size={15} />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="auth-alert-banner" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857' }}>
                <CheckCircle2 size={15} />
                <span>{modalSuccess}</span>
              </div>
            )}

            {/* ================= BƯỚC 1: NHẬP EMAIL ================= */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendForgotOtp}>
                <div className="auth-form-group">
                  <label className="auth-form-label" style={{ color: '#334155' }}>Email đã đăng ký</label>
                  <div className="auth-input-wrapper">
                    <Mail size={15} className="auth-input-icon" style={{ color: '#94a3b8' }} />
                    <input
                      type="email"
                      className="auth-input"
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (modalError) setModalError('');
                      }}
                      disabled={isSubmittingForgot}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', marginTop: '14px' }}
                  disabled={isSubmittingForgot}
                >
                  <span>{isSubmittingForgot ? 'Đang gửi mã...' : 'Gửi mã xác thực'}</span>
                  {!isSubmittingForgot && <ArrowRight size={15} />}
                </button>
              </form>
            )}

            {/* ================= BƯỚC 2: NHẬP MÃ OTP (3 PHÚT) ================= */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyForgotOtp}>
                <div className="auth-form-group">
                  <label className="auth-form-label" style={{ color: '#334155' }}>
                    Mã xác thực OTP (6 chữ số)
                  </label>
                  <div className="auth-input-wrapper">
                    <KeyRound size={15} className="auth-input-icon" style={{ color: '#94a3b8' }} />
                    <input
                      type="text"
                      maxLength="6"
                      className="auth-input"
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        letterSpacing: '6px',
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        textAlign: 'center'
                      }}
                      placeholder="------"
                      value={forgotOtp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setForgotOtp(val);
                        if (modalError) setModalError('');
                      }}
                      disabled={isSubmittingForgot}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Đồng hồ đếm ngược 3 phút (180s) và nút Gửi lại mã */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.8rem' }}>
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
                      background: 'none',
                      border: 'none',
                      color: forgotTimer > 0 ? '#94a3b8' : '#2563eb',
                      cursor: forgotTimer > 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '700',
                      textDecoration: forgotTimer > 0 ? 'none' : 'underline'
                    }}
                  >
                    {forgotTimer > 0 ? `Gửi lại sau (${formatTimer(forgotTimer)})` : 'Gửi lại mã OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', marginTop: '14px' }}
                  disabled={isSubmittingForgot}
                >
                  <span>{isSubmittingForgot ? 'Đang xác thực...' : 'Xác thực mã OTP'}</span>
                  {!isSubmittingForgot && <ArrowRight size={15} />}
                </button>

                <button
                  type="button"
                  onClick={() => { setForgotStep(1); setModalError(''); setModalSuccess(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    marginTop: '12px',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  ← Đổi địa chỉ email khác
                </button>
              </form>
            )}

            {/* ================= BƯỚC 3: THIẾT LẬP MẬT KHẨU MỚI ================= */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetForgotPass}>
                <div className="auth-form-group">
                  <label className="auth-form-label" style={{ color: '#334155' }}>Mật khẩu mới *</label>
                  <div className="auth-input-wrapper">
                    <Lock size={15} className="auth-input-icon" style={{ color: '#94a3b8' }} />
                    <input
                      type={showForgotNewPass ? 'text' : 'password'}
                      className="auth-input"
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                      placeholder="Tối thiểu 8 ký tự"
                      value={forgotNewPass}
                      onChange={(e) => {
                        setForgotNewPass(e.target.value);
                        if (modalError) setModalError('');
                      }}
                      disabled={isSubmittingForgot}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                      tabIndex="-1"
                    >
                      {showForgotNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label" style={{ color: '#334155' }}>Xác nhận mật khẩu mới *</label>
                  <div className="auth-input-wrapper">
                    <KeyRound size={15} className="auth-input-icon" style={{ color: '#94a3b8' }} />
                    <input
                      type={showForgotConfirmPass ? 'text' : 'password'}
                      className="auth-input"
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                      placeholder="Nhập lại mật khẩu mới"
                      value={forgotConfirmPass}
                      onChange={(e) => {
                        setForgotConfirmPass(e.target.value);
                        if (modalError) setModalError('');
                      }}
                      disabled={isSubmittingForgot}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)}
                      tabIndex="-1"
                    >
                      {showForgotConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', marginTop: '14px' }}
                  disabled={isSubmittingForgot}
                >
                  <span>{isSubmittingForgot ? 'Đang lưu...' : 'Đặt lại mật khẩu'}</span>
                  {!isSubmittingForgot && <ArrowRight size={15} />}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
