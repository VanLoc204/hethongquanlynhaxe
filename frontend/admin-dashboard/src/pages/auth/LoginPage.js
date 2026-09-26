import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const LoginPage = () => {
  const { login, loading } = useContext(AuthContext);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone || !password) {
      setError('Vui lòng điền đầy đủ số điện thoại hoặc mã nhân viên và mật khẩu.');
      return;
    }
    const result = await login(phone, password);
    if (!result.success) {
      setError(result.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.');
    }
  };

  const handleQuickLogin = (presetPhone, presetPass) => {
    setPhone(presetPhone);
    setPassword(presetPass);
    setError('');
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      maxHeight: '100vh',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#0f172a',
      boxSizing: 'border-box'
    }}>

      {/* Dynamic Keyframes for Active Pulse, Tech Grid Wave & Hover Micro-Transitions */}
      <style>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6);
            transform: scale(0.95);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(22, 163, 74, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
            transform: scale(0.95);
          }
        }

        @keyframes waveGlowPulse {
          0% {
            transform: translate(-15%, -15%) scale(1) rotate(0deg);
            opacity: 0.55;
          }
          50% {
            transform: translate(15%, 12%) scale(1.3) rotate(180deg);
            opacity: 0.9;
          }
          100% {
            transform: translate(-15%, -15%) scale(1) rotate(360deg);
            opacity: 0.55;
          }
        }

        @keyframes gridScanBeam {
          0% {
            background-position: -120% -120%;
          }
          50% {
            background-position: 100% 100%;
          }
          100% {
            background-position: 220% 220%;
          }
        }

        .animated-grid-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
          background-color: #ffffff;
          background-image: 
            linear-gradient(to right, rgba(37, 99, 235, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(37, 99, 235, 0.08) 1px, transparent 1px);
          background-size: 36px 36px;
        }

        .tech-wave-glow-1 {
          position: absolute;
          width: 750px;
          height: 750px;
          top: -220px;
          left: -180px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(96, 165, 250, 0.1) 45%, transparent 70%);
          filter: blur(50px);
          animation: waveGlowPulse 14s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .tech-wave-glow-2 {
          position: absolute;
          width: 700px;
          height: 700px;
          bottom: -220px;
          right: -120px;
          background: radial-gradient(circle, rgba(147, 51, 234, 0.18) 0%, rgba(59, 130, 246, 0.12) 50%, transparent 70%);
          filter: blur(60px);
          animation: waveGlowPulse 18s ease-in-out infinite reverse;
          pointer-events: none;
        }

        .tech-wave-beam {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            125deg,
            transparent 15%,
            rgba(37, 99, 235, 0.03) 30%,
            rgba(59, 130, 246, 0.18) 48%,
            rgba(147, 51, 234, 0.2) 52%,
            rgba(37, 99, 235, 0.05) 65%,
            transparent 85%
          );
          background-size: 220% 220%;
          animation: gridScanBeam 6.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
        }

        .active-node-dot {
          width: 8px;
          height: 8px;
          background-color: #16a34a;
          border-radius: 50%;
          display: inline-block;
          animation: pulseGlow 2s infinite cubic-bezier(0.45, 0, 0.55, 1);
        }

        .hover-card-item {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
          cursor: pointer;
        }

        .hover-card-item:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 24px -4px rgba(37, 99, 235, 0.12) !important;
          border-color: #93c5fd !important;
        }

        .btn-portal-submit {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .btn-portal-submit:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 20px -3px rgba(37, 99, 235, 0.35) !important;
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
        }

        .btn-portal-submit:active {
          transform: translateY(0) !important;
        }
      `}</style>

      {/* Animated Tech Grid & Wave Light Layer */}
      <div className="animated-grid-bg">
        <div className="tech-wave-glow-1"></div>
        <div className="tech-wave-glow-2"></div>
        <div className="tech-wave-beam"></div>
      </div>

      {/* Top Header Bar (Full Width Compact) */}
      <header style={{
        position: 'relative',
        zIndex: 2,
        padding: '0.75rem 3.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left Side: Brand Logo + Version Badge + Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(37,99,235,0.25)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="13" rx="3" />
              <path d="M4 11h16" />
              <path d="M8 3v4" />
              <path d="M16 3v4" />
              <circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" />
              <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.3px', textTransform: 'uppercase' }}>
                AN BÌNH LINES
              </span>
              <span style={{
                background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                padding: '1px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800',
                letterSpacing: '0.3px'
              }}>
                PORTAL v4.2
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginTop: '0px' }}>
              Hệ Thống Quản Trị Vận Tải
            </div>
          </div>
        </div>

        {/* Right Side: Node Status Pill + Divider + Tech Hotline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.78rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '20px',
            border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <span className="active-node-dot"></span>
            <span style={{ color: '#64748b' }}>Node:</span>
            <span style={{ color: '#0f172a', fontWeight: '700' }}>VN-CENTRAL-01 (Active)</span>
          </div>

          <div style={{ height: '16px', width: '1px', background: '#cbd5e1' }}></div>

          <div style={{ color: '#2563eb', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Hotline Kỹ Thuật: <strong style={{ color: '#1d4ed8', fontSize: '0.88rem', fontWeight: '900' }}>1900 8888</strong></span>
          </div>
        </div>
      </header>

      {/* Main Full Viewport Centered Content Body (No Scroll) */}
      <main style={{
        position: 'relative',
        zIndex: 2,
        flex: 1,
        width: '100%',
        maxWidth: '1750px',
        margin: '0 auto',
        padding: '1.25rem 3.5rem',
        display: 'grid',
        gridTemplateColumns: '1.2fr 440px',
        gap: '3.5rem',
        alignItems: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>

        {/* Left Column: Vision & 3 Feature Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.35rem 0.85rem',
              borderRadius: '20px', fontSize: '0.75rem', color: '#2563eb', fontWeight: '700',
              marginBottom: '0.75rem'
            }}>
              Hệ Thống Điều Hành &amp; Quản Trị Vận Tải Toàn Diện
            </div>

            <h1 style={{
              fontSize: '2.3rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.2',
              letterSpacing: '-0.8px', margin: 0
            }}>
              Hành Trình Thông Minh,<br />
              <span style={{ color: '#2563eb' }}>Kết Nối Trọn Vẹn Niềm Tin.</span>
            </h1>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.55', marginTop: '0.6rem', maxWidth: '720px', margin: '0.6rem 0 0 0' }}>
              Nền tảng số hóa toàn diện vận tải hành khách liên tỉnh cao cấp. Tối ưu hóa điều vận, quản lý biểu đồ giờ, kiểm soát vé điện tử tập trung và nâng chuẩn trải nghiệm khách hàng vượt trội.
            </p>
          </div>

          {/* 3 Interactive Hover Feature Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>

            <div
              className="hover-card-item"
              style={{
                background: '#ffffff', padding: '1rem', borderRadius: '12px',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h3v3H7z" /><path d="M14 7h3v3h-3z" /><path d="M7 14h3v3H7z" /><path d="M14 14h3v3h-3z" /></svg>
              </div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                Đặt vé &amp; Tra cứu 24/7
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                Tối ưu đặt chỗ theo sơ đồ ghế 3D, xuất vé điện tử QR Code tức thì trong 10 giây.
              </p>
            </div>

            <div
              className="hover-card-item"
              style={{
                background: '#ffffff', padding: '1rem', borderRadius: '12px',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-3" /><rect x="9" y="9" width="2" height="2" /><rect x="9" y="13" width="2" height="2" /><rect x="9" y="17" width="2" height="2" /></svg>
              </div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                Trạm dừng cao cấp
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                Mạng lưới 36 trạm dừng chuẩn dịch vụ 5 sao tiện nghi dọc trục cao tốc Bắc - Nam.
              </p>
            </div>

            <div
              className="hover-card-item"
              style={{
                background: '#ffffff', padding: '1rem', borderRadius: '12px',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                An toàn &amp; Tiện nghi
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                100% dòng xe Limousine &amp; Giường nằm công thái học trang bị WIFI tốc độ cao.
              </p>
            </div>

          </div>

          {/* Metrics Banner Bar with 3 Equal Columns */}
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: '12px', padding: '0.85rem 1.25rem',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
            alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }}></span>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.1' }}>
                  5.000.000+
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>Lượt khách hài lòng</div>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.1' }}>
                63
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>Tỉnh thành kết nối</div>
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#2563eb', lineHeight: '1.1' }}>
                99.9%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>Chuyến đi đúng giờ</div>
            </div>

          </div>

        </div>

        {/* Right Column: Centered Secure Login Form Card */}
        <div>

          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px -5px rgba(15, 23, 42, 0.08)',
            padding: '2.25rem 2.25rem'
          }}>

            {/* Card Top Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: '800', fontSize: '0.76rem', letterSpacing: '0.5px' }}>
                SECURE ACCESS
              </div>
              <div style={{ background: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                SSL 256-bit
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
              Đăng Nhập Hệ Thống
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: '1.45' }}>
              Dành cho Cán bộ Quản lý, Điều hành tuyến &amp; Nhân viên vận hành
            </p>

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

              {/* Input 1: Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                  Số điện thoại
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%', padding: '0.7rem 1rem', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#f8fafc',
                    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Input 2: Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                  Mật khẩu truy cập
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu truy cập..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%', padding: '0.7rem 2.5rem 0.7rem 1rem', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#f8fafc',
                      outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700'
                    }}
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
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
                  color: '#ffffff', border: 'none', padding: '0.8rem 1.25rem',
                  borderRadius: '8px', fontSize: '0.95rem', fontWeight: '800',
                  cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  marginTop: '0.5rem'
                }}
              >
                {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP HỆ THỐNG ➔'}
              </button>
            </form>

            {/* Security Callout Banner */}
            <div style={{
              marginTop: '1.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.74rem',
              color: '#475569'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div>
                <div style={{ fontWeight: '800', color: '#0f172a' }}>Kênh Đăng Nhập Nội Bộ An Toàn</div>
                <div style={{ color: '#64748b', marginTop: '1px' }}>Mã hóa TLS 1.3 • Định danh Zero-Trust • ISO 27001</div>
              </div>
            </div>

            {/* Card Footer Support Info */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
              Trợ giúp truy cập hệ thống? Liên hệ CNTT: <strong style={{ color: '#1d4ed8' }}>1900 8888 (Phím 1)</strong>
            </div>

          </div>

        </div>

      </main>

      {/* Page Footer Bar (Full Width Compact) */}
      <footer style={{
        position: 'relative',
        zIndex: 2,
        padding: '0.75rem 3.5rem',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: '#64748b',
        background: '#ffffff',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div>
          © 2026 <strong>An Bình Lines Corp.</strong> Nền Tảng Điều Hành &amp; Vận Tải Hành Khách Cao Cấp. Bản quyền đã được bảo hộ.
        </div>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <span style={{ cursor: 'pointer' }}>Chính sách bảo mật</span>
          <span>•</span>
          <span style={{ cursor: 'pointer' }}>Điều khoản vận hành</span>
          <span>•</span>
          <span>Trạng thái hệ thống (<strong>99.98%</strong>)</span>
        </div>
      </footer>

    </div>
  );
};

export default LoginPage;
