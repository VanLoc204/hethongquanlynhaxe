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

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const { login, register, forgotPassword, isAuthenticated, error, setError, loading } = useContext(AuthContext);
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

    if (!loginKey || !loginPassword) {
      setValidationError('Vui lòng nhập Email/Số điện thoại và Mật khẩu.');
      return;
    }

    const res = await login(loginKey, loginPassword);
    if (res && res.success) {
      navigate('/');
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!regName.trim()) {
      setValidationError('Vui lòng nhập Họ và tên.');
      return;
    }
    if (!regPhone.trim()) {
      setValidationError('Vui lòng nhập Số điện thoại.');
      return;
    }
    if (!regPassword) {
      setValidationError('Vui lòng nhập Mật khẩu.');
      return;
    }
    if (regPassword.length < 6) {
      setValidationError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setValidationError('Xác nhận mật khẩu không trùng khớp.');
      return;
    }

    const res = await register(regName.trim(), regEmail.trim(), regPhone.trim(), regPassword);
    if (res && res.success) {
      navigate('/');
    }
  };

  // Submit Forgot Password
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!forgotPhone || !forgotNewPass || !forgotConfirmPass) {
      setModalError('Vui lòng điền đầy đủ các thông tin yêu cầu.');
      return;
    }
    if (forgotNewPass.length < 6) {
      setModalError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setModalError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    const res = await forgotPassword(forgotPhone, forgotNewPass);
    if (res && res.success) {
      setModalSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotPhone('');
        setForgotNewPass('');
        setForgotConfirmPass('');
        setModalSuccess('');
      }, 1500);
    } else {
      setModalError(res.message || 'Có lỗi xảy ra, vui lòng thử lại.');
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
                    className="auth-input"
                    placeholder="09xxx hoặc email@example.com"
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
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
                    className="auth-input"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
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
                      className="auth-input"
                      placeholder="Nguyễn Văn A"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label">Số điện thoại *</label>
                  <div className="auth-input-wrapper">
                    <Phone size={15} className="auth-input-icon" />
                    <input
                      type="tel"
                      className="auth-input"
                      placeholder="0901 234 567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Hàng 2: Email (1 cột) */}
              <div className="auth-form-group">
                <label className="auth-form-label">Email (nhận vé điện tử)</label>
                <div className="auth-input-wrapper">
                  <Mail size={15} className="auth-input-icon" />
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Hàng 3: Mật khẩu + Xác nhận mật khẩu (2 cột) */}
              <div className="auth-form-grid-2">
                <div className="auth-form-group">
                  <label className="auth-form-label">Mật khẩu *</label>
                  <div className="auth-input-wrapper">
                    <Lock size={15} className="auth-input-icon" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Tối thiểu 6 ký tự"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
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
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label">Xác nhận MK *</label>
                  <div className="auth-input-wrapper">
                    <KeyRound size={15} className="auth-input-icon" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Nhập lại mật khẩu"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
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

      {/* Modal Quên Mật Khẩu */}
      {showForgotModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                Khôi phục mật khẩu
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
              Nhập số điện thoại đã đăng ký để thiết lập lại mật khẩu mới.
            </p>

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

            <form onSubmit={handleForgotSubmit}>
              <div className="auth-form-group">
                <label className="auth-form-label" style={{ color: '#334155' }}>Số điện thoại</label>
                <div className="auth-input-wrapper">
                  <Phone size={15} className="auth-input-icon" style={{ color: '#94a3b8' }} />
                  <input
                    type="tel"
                    className="auth-input"
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    placeholder="0901234567"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label className="auth-form-label" style={{ color: '#334155' }}>Mật khẩu mới</label>
                <div className="auth-input-wrapper">
                  <Lock size={15} className="auth-input-icon" style={{ color: '#94a3b8' }} />
                  <input
                    type={showForgotNewPass ? 'text' : 'password'}
                    className="auth-input"
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    placeholder="Tối thiểu 6 ký tự"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
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
                <label className="auth-form-label" style={{ color: '#334155' }}>Xác nhận mật khẩu mới</label>
                <div className="auth-input-wrapper">
                  <KeyRound size={15} className="auth-input-icon" style={{ color: '#94a3b8' }} />
                  <input
                    type="password"
                    className="auth-input"
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    placeholder="Nhập lại mật khẩu mới"
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', marginTop: '14px' }}
                disabled={loading}
              >
                <span>Đặt lại mật khẩu</span>
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
