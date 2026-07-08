import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Compass, User, LogIn, LogOut, Loader, Ticket, Map, Package, MessageSquare, Bell, Menu, X } from 'lucide-react';
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

const Navigation = () => {
  const { user, isAuthenticated, logout, loading } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <header className="navbar glass-card">
      <Link to="/" className="nav-logo" onClick={handleLinkClick}>
        <Compass className="logo-icon" />
        <span>Á Đông SmartBus</span>
      </Link>

      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'none', // Overridden in mobile media query
          padding: '4px'
        }}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      <nav className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
        <Link to="/" className="nav-item" onClick={handleLinkClick}>
          Tìm chuyến
        </Link>
        
        {loading ? (
          <Loader size={18} className="logo-icon" />
        ) : isAuthenticated && user ? (
          <>
            <Link to="/my-tickets" className="nav-item" onClick={handleLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Ticket size={16} />
              <span>Quản lý vé</span>
            </Link>
            <Link to="/track-journey" className="nav-item" onClick={handleLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Map size={16} />
              <span>Hành trình</span>
            </Link>
            <Link to="/shipment" className="nav-item" onClick={handleLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Package size={16} />
              <span>Gửi hàng</span>
            </Link>
            <Link to="/ai-assistant" className="nav-item" onClick={handleLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MessageSquare size={16} />
              <span>Tư vấn AI</span>
            </Link>
            <Link to="/notifications" className="nav-item" onClick={handleLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Bell size={16} />
              <span>Thông báo</span>
            </Link>

            <Link to="/profile" className="nav-item" onClick={handleLinkClick} style={{ color: 'var(--text-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '10px' }}>
              <User size={18} style={{ color: 'var(--accent)' }} />
              <span>{user.name}</span>
            </Link>
            <button onClick={handleLogoutClick} className="btn btn-secondary" style={{ padding: '8px 16px', marginLeft: '10px' }}>
              <LogOut size={16} />
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-item" onClick={handleLinkClick}>
              <LogIn size={18} />
              Đăng nhập
            </Link>
            <Link to="/register" className="btn btn-primary" onClick={handleLinkClick} style={{ padding: '8px 16px' }}>
              Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          {/* Navigation Header */}
          <Navigation />

          {/* Main Content Area */}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
              <Route path="/track-journey" element={<TrackJourneyPage />} />
              <Route path="/shipment" element={<ShipmentPage />} />
              <Route path="/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="footer-futa">
            <div className="footer-grid">
              <div className="footer-col">
                <h4>TỔNG ĐÀI & CSKH</h4>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '10px' }}>
                  1900 6067
                </p>
                <p><strong>CÔNG TY CỔ PHẦN XE KHÁCH Á ĐÔNG</strong></p>
                <p>Địa chỉ: 486-486A Lê Văn Lương, Phường Tân Hưng, Quận 7, TP. Hồ Chí Minh.</p>
                <p>Email: hotro@adongbus.vn</p>
                <p>Điện thoại: 02838386852</p>
              </div>

              <div className="footer-col">
                <h4>Á ĐÔNG BUS LINES</h4>
                <ul>
                  <li><a href="#about">Về chúng tôi</a></li>
                  <li><a href="#schedule">Lịch trình chuyến</a></li>
                  <li><a href="#recruit">Tuyển dụng</a></li>
                  <li><a href="#news">Tin tức & Sự kiện</a></li>
                  <li><a href="#contact">Liên hệ</a></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4>HỖ TRỢ</h4>
                <ul>
                  <li><a href="#lookup">Tra cứu thông tin đặt vé</a></li>
                  <li><a href="#terms">Điều khoản sử dụng</a></li>
                  <li><a href="#faq">Câu hỏi thường gặp</a></li>
                  <li><a href="#policy">Chính sách bảo mật</a></li>
                  <li><a href="#guide">Hướng dẫn đặt vé trên Web</a></li>
                </ul>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>© 2026 Bản quyền thuộc về Công ty Cổ phần Xe khách Á Đông - FUTA Bus Lines copy style. Đăng ký kinh doanh số 0302741234.</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
