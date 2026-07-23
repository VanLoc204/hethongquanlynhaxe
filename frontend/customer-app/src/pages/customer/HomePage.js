import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, TrendingUp, PhoneCall } from 'lucide-react';

// Components
import SearchBox from '../../components/SearchBox';
import PromoCard from '../../components/PromoCard';
import RouteCard from '../../components/RouteCard';
import StatsPanel from '../../components/StatsPanel';

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

  const popularRoutes = [
    {
      title: 'Tuyến xe từ Tp Hồ Chí Minh',
      bgImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=500&q=80',
      routes: [
        { dest: 'Đà Lạt', price: '200.000đ', meta: '310km - 7 giờ 50 phút' },
        { dest: 'Cần Thơ', price: '165.000đ', meta: '172km - 3 giờ' }
      ]
    },
    {
      title: 'Tuyến xe từ Đà Lạt',
      bgImage: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=500&q=80',
      routes: [
        { dest: 'Tp. Hồ Chí Minh', price: '290.000đ', meta: '305km - 7 giờ' }
      ]
    },
    {
      title: 'Tuyến xe từ Cần Thơ',
      bgImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=500&q=80',
      routes: [
        { dest: 'Tp. Hồ Chí Minh', price: '165.000đ', meta: '172km - 3 giờ' }
      ]
    }
  ];

  const promotions = [
    {
      title: 'Giảm giá vé Tết Nguyên Đán 2027',
      desc: 'Đặt vé sớm ngay hôm nay để nhận ưu đãi lên đến 15% và đảm bảo giữ chỗ tốt nhất trên mọi tuyến xe.',
      image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80'
    },
    {
      title: 'Khai trương tuyến mới Tp. HCM - Mũi Né',
      desc: 'Trải nghiệm dòng xe Limousine giường nằm cao cấp mới chỉ với 190.000đ. Đưa đón tận nơi tại các resort.',
      image: 'https://images.unsplash.com/photo-1520116468816-95b69f847357?auto=format&fit=crop&w=400&q=80'
    },
    {
      title: 'Tích điểm thành viên - Nhận quà lớn',
      desc: 'Mỗi lượt đi tích 5% giá trị vé quy đổi điểm thưởng mua vé miễn phí hoặc quà tặng dịch vụ giá trị.',
      image: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80'
    }
  ];

  return (
    <div className="placeholder-page animate-fade-in">
      
      {/* 1. Hero Banner */}
      <div className="hero-section-futa">
        <h1>Á ĐÔNG TRAVEL - CHẤT LƯỢNG LÀ DANH DỰ</h1>
        <p>Hệ thống đặt vé xe khách trực tuyến thông minh, an toàn, nhanh chóng hàng đầu Việt Nam</p>
      </div>

      {/* 2. Trip Search Card Overlay */}
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

      {/* 3. Khuyến mãi nổi bật */}
      <div className="section-container">
        <h2 className="section-title">KHUYẾN MÃI NỔI BẬT</h2>
        <p className="section-subtitle">Ưu đãi cực khủng dành riêng cho khách hàng đăng ký thành viên</p>
        <div className="promo-grid">
          {promotions.map((promo, idx) => (
            <PromoCard 
              key={idx} 
              image={promo.image} 
              title={promo.title} 
              desc={promo.desc} 
            />
          ))}
        </div>
      </div>

      {/* 4. Tuyến đường phổ biến */}
      <div className="section-container">
        <h2 className="section-title">TUYẾN ĐƯỜNG PHỔ BIẾN</h2>
        <p className="section-subtitle">Được khách hàng tin dùng và lựa chọn hàng đầu</p>
        <div className="routes-grid">
          {popularRoutes.map((section, idx) => (
            <RouteCard 
              key={idx} 
              bgImage={section.bgImage} 
              title={section.title} 
              routes={section.routes} 
            />
          ))}
        </div>
      </div>

      {/* 5. Thống kê */}
      <StatsPanel />

      {/* 6. Cam kết dịch vụ */}
      <div className="section-container" style={{ marginTop: '5rem' }}>
        <h2 className="section-title">DỊCH VỤ SỰ KHÁC BIỆT</h2>
        <p className="section-subtitle">Chất lượng dịch vụ hành trình là cam kết hàng đầu của chúng tôi</p>
        <div className="promo-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <ShieldCheck size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h4 style={{ marginBottom: '0.5rem', fontWeight: '700' }}>An Toàn Tuyệt Đối</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Đội ngũ tài xế giàu kinh nghiệm, hệ thống định vị GPS 24/7 kiểm soát tốc độ và độ an toàn.
            </p>
          </div>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <TrendingUp size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h4 style={{ marginBottom: '0.5rem', fontWeight: '700' }}>Tối Ưu Thời Gian</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Giờ xuất phát chính xác, lộ trình tối ưu được hỗ trợ từ trợ lý AI thông minh điều phối tuyến.
            </p>
          </div>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <PhoneCall size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h4 style={{ marginBottom: '0.5rem', fontWeight: '700' }}>Hỗ Trợ 24/7</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Tổng đài chăm sóc khách hàng và tổng đài đặt vé sẵn sàng hỗ trợ bạn bất kỳ khi nào cần thiết.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default HomePage;
