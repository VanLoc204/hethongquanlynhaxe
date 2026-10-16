import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Star,
  Headphones,
  ArrowRight,
  Wifi,
  Tv,
  CheckCircle2,
  Calendar,
  Sparkles,
  Search,
  Bot,
  Ticket,
  HelpCircle,
  Phone,
  Shield,
  Bus
} from 'lucide-react';

import SearchBox from '../../components/SearchBox';
import './HomePage.css';

const HomePage = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState('one-way');

  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!from || !to || !date) {
      alert('Vui lòng chọn đầy đủ Điểm đi, Điểm đến và Ngày đi.');
      return;
    }
    navigate(`/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&passengers=${passengers}&type=${tripType}`);
  };

  // Các tuyến đường xe hiện có trong hệ thống
  const activeRoutes = [
    {
      id: 'sg-dl',
      title: 'Hồ Chí Minh ⇄ Đà Lạt',
      badge: 'Limousine & Giường Nằm',
      badgeClass: 'badge-blue',
      meta: '5h06m • 323 km',
      image: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=600&q=80',
      from: 'Hồ Chí Minh',
      to: 'Đà Lạt',
      features: [
        'Bến Xe Miền Tây ⇄ Bến Xe Liên Tỉnh Đà Lạt',
        'Đón tại Lê Hồng Phong, Hàng Xanh, BX Miền Đông',
        'Nhiều khung giờ khởi hành trong ngày'
      ],
      price: '300.000đ'
    },
    {
      id: 'dl-sg',
      title: 'Đà Lạt ⇄ Hồ Chí Minh',
      badge: 'Cabin Cao Cấp',
      badgeClass: 'badge-purple',
      meta: '5h14m • 320 km',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      from: 'Đà Lạt',
      to: 'Hồ Chí Minh',
      features: [
        'Bến Xe Liên Tỉnh Đà Lạt ⇄ Bến Xe Miền Tây',
        'Đón trả tại Đức Trọng, Di Linh, Bảo Lộc',
        'Nội thất hiện đại, êm ái suốt hành trình'
      ],
      price: '300.000đ'
    },
    {
      id: 'sg-ct',
      title: 'Hồ Chí Minh ⇄ Cần Thơ',
      badge: 'Cao Tốc Trung Lương',
      badgeClass: 'badge-green',
      meta: '3h32m • 217 km',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      from: 'Hồ Chí Minh',
      to: 'Cần Thơ',
      features: [
        'Bến Xe Miền Tây ⇄ Bến Xe Trung Tâm Cần Thơ',
        'Wifi tốc độ cao, khăn lạnh & nước suối',
        'Xe chạy êm ái, đón trả linh hoạt'
      ],
      price: '180.000đ'
    },
    {
      id: 'ct-sg',
      title: 'Cần Thơ ⇄ Hồ Chí Minh',
      badge: 'Chuyến Nhanh Liên Tỉnh',
      badgeClass: 'badge-amber',
      meta: '3h34m • 218 km',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      from: 'Cần Thơ',
      to: 'Hồ Chí Minh',
      features: [
        'Bến Xe Trung Tâm Cần Thơ ⇄ Bến Xe Miền Tây',
        'Đón tại 91B Nguyễn Văn Linh, Vĩnh Long, Cái Bè',
        'Tài xế chuyên nghiệp, xuất bến đúng giờ'
      ],
      price: '180.000đ'
    }
  ];

  return (
    <div className="home-container">
      {/* 1. HERO BANNER */}
      <section
        className="home-hero"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/auth_banner.jpg)` }}
      >
        <div className="home-hero-overlay" />

        <div className="home-hero-content">
          <div className="home-hero-badge">
            <span>HÃNG XE KHÁCH LIMOUSINE CHẤT LƯỢNG CAO</span>
          </div>

          <h1 className="home-hero-title">
            AN BÌNH LINES - CHẤT LƯỢNG LÀ DANH DỰ
          </h1>

          <p className="home-hero-subtitle">
            Hệ thống đặt vé xe khách trực tuyến thông minh, an toàn, nhanh chóng hàng đầu Việt Nam
          </p>

          <div className="home-trust-badges">
            <div className="trust-item">
              <CheckCircle2 size={18} className="trust-check-icon" />
              <span>100% Giữ Chỗ Đúng Số</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={18} className="trust-check-icon" />
              <span>Hủy Vé Hoàn Tiền 100%</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={18} className="trust-check-icon" />
              <span>Giường Cung Điện Cao Cấp</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEARCH BOX CONTAINER (Nổi đè lên Hero) */}
      <SearchBox
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        date={date}
        setDate={setDate}
        passengers={passengers}
        setPassengers={setPassengers}
        tripType={tripType}
        setTripType={setTripType}
        onSubmit={handleSearch}
      />

      {/* 3. QUICK ACTION CARDS (2 thẻ thao tác nhanh bên dưới Form) */}
      <div className="home-quick-actions">
        <Link to="/my-tickets" className="quick-action-card">
          <div className="action-icon-box blue">
            <Ticket size={24} />
          </div>
          <div className="action-text-box">
            <h4>Tra cứu vé đã đặt</h4>
            <p>Kiểm tra thông tin vé qua mã hoặc số điện thoại</p>
          </div>
        </Link>

        <Link to="/ai-assistant" className="quick-action-card">
          <div className="action-icon-box purple">
            <Bot size={24} />
          </div>
          <div className="action-text-box">
            <h4>Trợ lý AI 24/7</h4>
            <p>Gợi ý lịch trình và tư vấn điểm dừng đỗ chuẩn xác</p>
          </div>
        </Link>
      </div>

      {/* 4. CÁC TUYẾN XE ĐANG HOẠT ĐỘNG */}
      <section className="section-popular-routes">
        <div className="section-routes-header">
          <div>
            <div className="routes-badge-tag">
              <Bus size={15} />
              <span>MẠNG LƯỚI TUYẾN XE</span>
            </div>
            <h2 className="routes-title-main">Các Tuyến Xe Đang Hoạt Động</h2>
            <p className="routes-subtitle-main">
              Các lộ trình xe khách chất lượng cao phục vụ hành khách mỗi ngày
            </p>
          </div>

          <Link to="/trips" className="routes-view-all-link">
            <span>Xem tất cả chuyến xe</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="popular-routes-grid-4">
          {activeRoutes.map((route) => (
            <div key={route.id} className="route-card-vip">
              <div className="route-card-img-wrapper">
                <img src={route.image} alt={route.title} className="route-card-img" />
                <span className={`route-badge-pill ${route.badgeClass}`}>
                  {route.badge}
                </span>
                <span className="route-meta-distance-badge">
                  {route.meta}
                </span>
              </div>

              <div className="route-card-body">
                <h3 className="route-card-title">{route.title}</h3>

                <ul className="route-features-list">
                  {route.features.map((feat, i) => (
                    <li key={i}>
                      <span className="route-feature-icon">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="route-card-footer">
                  <div className="route-price-box">
                    <span className="price-label-small">Giá chỉ từ</span>
                    <span className="price-val-big">{route.price}</span>
                  </div>

                  <button
                    className="btn-choose-seat"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      navigate(`/trips?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${today}`);
                    }}
                  >
                    Chọn ghế
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. TẠI SAO NÊN CHỌN AN BÌNH LINES? */}
      <section className="section-why-us">
        <h2 className="why-us-title">Tại Sao Nên Chọn An Bình Lines?</h2>
        <p className="why-us-subtitle">
          Chúng tôi không chỉ bán vé, chúng tôi kiến tạo hành trình trọn vẹn và an tâm cho từng hành khách.
        </p>

        <div className="why-us-grid-4">
          <div className="why-us-item">
            <div className="why-us-icon-circle">
              <Clock size={28} />
            </div>
            <h3>99.8% Đúng Giờ</h3>
            <p>Xuất bến và cập bến chuẩn theo cam kết, không làm lỡ công việc của bạn.</p>
          </div>

          <div className="why-us-item">
            <div className="why-us-icon-circle">
              <Star size={28} />
            </div>
            <h3>Tiện Nghi 5 Sao</h3>
            <p>Dàn xe Limousine cao cấp đời mới 2024 – 2026, bảo dưỡng định kỳ nghiêm ngặt.</p>
          </div>

          <div className="why-us-item">
            <div className="why-us-icon-circle">
              <ShieldCheck size={28} />
            </div>
            <h3>Hủy Vé Linh Hoạt</h3>
            <p>Hỗ trợ đổi trả, hoàn tiền nhanh chóng trực tiếp qua ứng dụng và website.</p>
          </div>

          <div className="why-us-item">
            <div className="why-us-icon-circle">
              <Headphones size={28} />
            </div>
            <h3>Hỗ Trợ 24/7 Tận Tâm</h3>
            <p>Tổng đài viên và trợ lý AI luôn sẵn sàng phục vụ và giải đáp mọi khúc mắc.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
