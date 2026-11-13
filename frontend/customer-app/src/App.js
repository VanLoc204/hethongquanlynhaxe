import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  Bus,
  User,
  LogIn,
  LogOut,
  Loader,
  Ticket,
  MapPin,
  Package,
  MessageSquare,
  Bell,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Search,
  Phone
} from 'lucide-react';
import './App.css';

// Context
import { AuthProvider, AuthContext } from './context/AuthContext';

// Pages
import HomePage from './pages/customer/HomePage';
import LoginPage from './pages/customer/LoginPage';
import RegisterPage from './pages/customer/RegisterPage';
import TripsPage from './pages/customer/TripsPage';
import MyTicketsPage from './pages/customer/MyTicketsPage';
import TrackJourneyPage from './pages/customer/TrackJourneyPage';
import ShipmentPage from './pages/customer/ShipmentPage';
import AIAssistantPage from './pages/customer/AIAssistantPage';
import NotificationsPage from './pages/customer/NotificationsPage';
import ProfilePage from './pages/customer/ProfilePage';
import AIChatbotWidget from './components/AIChatbotWidget';
import ScrollToTop from './components/ScrollToTop';

// Protected Route - chỉ dành cho khách hàng đã đăng nhập
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-primary)' }}>
        <Loader className="logo-icon animate-spin" size={32} />
        <span style={{ marginLeft: '10px', fontWeight: '600' }}>Đang tải...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const Navigation = () => {
  const { user, isAuthenticated, logout, loading } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      {/* Brand Logo An Bình Lines */}
      <Link to="/" className="nav-logo" onClick={handleLinkClick} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 3px 10px rgba(37, 99, 235, 0.25)'
        }}>
          <Bus size={20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e3a8a', lineHeight: '1.1', letterSpacing: '-0.3px' }}>
            An Bình Lines
          </span>
          <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.6px', marginTop: '1px' }}>
            CHẤT LƯỢNG LÀ DANH DỰ
          </span>
        </div>
      </Link>

      <button 
        type="button"
        className="mobile-menu-toggle" 
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      {/* Lớp nền mờ để đóng menu khi bấm ra ngoài trên mobile */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <nav className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
        {/* Tìm chuyến (Active Pill) */}
        <Link
          to="/"
          className={`nav-item ${location.pathname === '/' ? 'active-pill' : ''}`}
          onClick={handleLinkClick}
        >
          <Search size={16} />
          <span>Tìm chuyến</span>
        </Link>

        {/* Quản lý vé */}
        <Link
          to="/my-tickets"
          className={`nav-item ${location.pathname === '/my-tickets' ? 'active-pill' : ''}`}
          onClick={handleLinkClick}
        >
          <Ticket size={16} />
          <span>Quản lý vé</span>
        </Link>

        {/* Hành trình */}
        <Link
          to="/track-journey"
          className={`nav-item ${location.pathname === '/track-journey' ? 'active-pill' : ''}`}
          onClick={handleLinkClick}
        >
          <MapPin size={16} />
          <span>Hành trình</span>
        </Link>

        {/* Tư vấn AI với nhãn AI Badge */}
        <Link
          to="/ai-assistant"
          className={`nav-item ${location.pathname === '/ai-assistant' ? 'active-pill' : ''}`}
          onClick={handleLinkClick}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sparkles size={16} color="#4f46e5" />
          <span>Tư vấn AI</span>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: '800',
            color: '#ffffff',
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            padding: '1px 6px',
            borderRadius: '6px',
            marginLeft: '2px'
          }}>AI</span>
        </Link>

        {/* Chuông thông báo */}
        <Link
          to="/notifications"
          className="nav-item nav-notification-link"
          onClick={handleLinkClick}
          title="Thông báo"
        >
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-3px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ef4444'
            }} />
          </div>
          <span className="mobile-only-text">Thông báo</span>
        </Link>
        
        {loading ? (
          <Loader size={18} className="logo-icon" />
        ) : isAuthenticated && user ? (
          <div className="nav-user-actions">
            <Link to="/profile" className="user-profile-pill" onClick={handleLinkClick}>
              <span style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: '800' }}>
                {user.name}
              </span>
              <ChevronDown size={14} color="#64748b" />
            </Link>

            <button type="button" onClick={handleLogoutClick} className="btn-logout-pill">
              <LogOut size={15} />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          <div className="nav-auth-actions">
            <Link to="/login" className="btn-login-outline" onClick={handleLinkClick}>
              <LogIn size={15} />
              <span>Đăng nhập</span>
            </Link>
            <Link to="/register" className="btn-register-solid" onClick={handleLinkClick}>
              <span>Đăng ký</span>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isAssistantPage = location.pathname === '/ai-assistant';

  return (
    <div className={`app-container ${isAuthPage ? 'auth-mode-container' : ''}`}>
      {/* Navigation Header - ẩn trên trang Login/Register vì trang Auth có Header riêng */}
      {!isAuthPage && <Navigation />}

      {/* Main Content Area */}
      <main className={isAuthPage ? 'auth-main-content' : 'main-content'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
          <Route path="/track-journey" element={<ProtectedRoute><TrackJourneyPage /></ProtectedRoute>} />
          <Route path="/shipment" element={<ProtectedRoute><ShipmentPage /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* Floating AI Chatbot Widget (ẩn trên Login/Register và trên trang AI Assistant chuyên biệt) */}
      {!isAuthPage && !isAssistantPage && <AIChatbotWidget />}

      {/* Footer Dark Navy Luxury theo thiết kế */}
      {!isAuthPage && (
        <footer className="home-footer-dark">
          <div className="footer-dark-inner">
            <div className="footer-dark-grid">
              {/* Cột 1: Thông tin thương hiệu */}
              <div>
                <div className="footer-brand-title">
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Bus size={18} />
                  </div>
                  <span>An Bình Lines</span>
                </div>
                <p className="footer-brand-desc">
                  Hãng vận tải hành khách công nghệ cao với phương châm "Chất lượng là danh dự". Chúng tôi đồng hành cùng hàng triệu chuyến đi an toàn khắp mọi miền tổ quốc.
                </p>
                <div className="footer-social-row">
                  <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="Facebook">
                    f
                  </a>
                  <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="TikTok">
                    ♪
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noreferrer" className="social-circle-btn" aria-label="YouTube">
                    ▶
                  </a>
                </div>
              </div>

              {/* Cột 2: Tuyến đường */}
              <div>
                <h4 className="footer-col-header">TUYẾN ĐƯỜNG</h4>
                <ul className="footer-links-col">
                  <li><Link to="/trips?from=TP.+Hồ+Chí+Minh&to=Nha+Trang">Xe Sài Gòn - Nha Trang</Link></li>
                  <li><Link to="/trips?from=TP.+Hồ+Chí+Minh&to=Đà+Lạt">Xe Sài Gòn - Đà Lạt</Link></li>
                  <li><Link to="/trips?from=Hà+Nội&to=Sapa">Xe Hà Nội - Sapa</Link></li>
                  <li><Link to="/trips?from=Đà+Nẵng&to=Quy+Nhơn">Xe Đà Nẵng - Quy Nhơn</Link></li>
                  <li><Link to="/trips?from=TP.+Hồ+Chí+Minh&to=Cần+Thơ">Xe Sài Gòn - Cần Thơ</Link></li>
                </ul>
              </div>

              {/* Cột 3: Chính sách */}
              <div>
                <h4 className="footer-col-header">CHÍNH SÁCH</h4>
                <ul className="footer-links-col">
                  <li><a href="#terms">Điều khoản dịch vụ</a></li>
                  <li><a href="#privacy">Chính sách bảo mật</a></li>
                  <li><a href="#refund">Quy chế đổi trả vé</a></li>
                  <li><a href="#luggage">Quy định đặt chỗ & hành lý xách tay</a></li>
                  <li><a href="#payment">Hướng dẫn thanh toán</a></li>
                </ul>
              </div>

              {/* Cột 4: Tổng đài 24/7 */}
              <div>
                <h4 className="footer-col-header">TỔNG ĐÀI 24/7</h4>
                <div className="footer-hotline-big">
                  <Phone size={22} color="#38bdf8" />
                  <span>1900 6868</span>
                </div>
                <p className="footer-contact-detail">Email: <strong>hotro@anbinhlines.vn</strong></p>
                <p className="footer-contact-detail">
                  Văn phòng chính: Bến Xe Miền Đông Mới, TP. Thủ Đức, TP. Hồ Chí Minh
                </p>
              </div>
            </div>

            <div className="footer-dark-bottom">
              <p>© 2024 - 2026 An Bình Lines. Toàn bộ bản quyền được bảo lưu.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
