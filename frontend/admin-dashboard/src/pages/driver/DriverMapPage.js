import React from 'react';

const DriverMapPage = () => {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease', background: '#ffffff', padding: '2rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text)' }}>
        Bản Đồ Hành Trình Di Chuyển
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Lộ trình di chuyển trực quan chặng Hồ Chí Minh ➔ Đà Lạt và các trạm kiểm soát GPS.
      </p>

      {/* Map visual SVG layout */}
      <div className="map-grid-responsive">
        
        {/* SVG Route Visualization */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid var(--card-border)',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '380px',
          position: 'relative'
        }}>
          {/* Animated path simulating driving route */}
          <svg width="100%" height="320" viewBox="0 0 600 300" style={{ overflow: 'visible' }}>
            {/* Draw road line */}
            <path
              d="M 50 150 C 150 50, 200 250, 300 150 C 400 50, 450 250, 550 150"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 50 150 C 150 50, 200 250, 300 150 C 400 50, 450 250, 550 150"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="12,12"
            />

            {/* Checkpoints */}
            {/* TP.HCM */}
            <circle cx="50" cy="150" r="10" fill="#3b82f6" stroke="#ffffff" strokeWidth="3" />
            <text x="35" y="180" fontSize="0.75rem" fontWeight="bold" fill="var(--text)">Hồ Chí Minh</text>

            {/* Dầu Giây */}
            <circle cx="180" cy="120" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <text x="160" y="100" fontSize="0.7rem" fill="var(--text-muted)">Dầu Giây</text>

            {/* Trạm nghỉ Bảo Lộc */}
            <circle cx="300" cy="150" r="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
            <text x="270" y="180" fontSize="0.7rem" fill="var(--text-muted)">Bảo Lộc (Trạm Nghỉ)</text>

            {/* Di Linh */}
            <circle cx="430" cy="120" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <text x="415" y="100" fontSize="0.7rem" fill="var(--text-muted)">Di Linh</text>

            {/* Đà Lạt */}
            <circle cx="550" cy="150" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
            <text x="535" y="180" fontSize="0.75rem" fontWeight="bold" fill="var(--text)">Đà Lạt</text>

            {/* Bus position cursor indicator */}
            <g transform="translate(180, 120)">
              <circle cx="0" cy="0" r="16" fill="rgba(63, 106, 216, 0.2)" style={{ animation: 'ping 1.5s infinite' }} />
              <rect x="-10" y="-6" width="20" height="12" rx="3" fill="var(--primary)" stroke="#ffffff" strokeWidth="2" />
              <circle cx="-5" cy="8" r="3" fill="#000000" />
              <circle cx="5" cy="8" r="3" fill="#000000" />
            </g>
          </svg>
        </div>

        {/* Side Panel: Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '800', color: 'var(--text)' }}>
              Thông Tin Định Vị
            </h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <div>Trạng thái: <strong style={{ color: '#10b981' }}>Đang di chuyển</strong></div>
              <div>Vị trí gần nhất: <strong>Đèo Bảo Lộc</strong></div>
              <div>Vận tốc hiện tại: <strong>55 km/h</strong></div>
              <div>Hướng di chuyển: <strong>Đông Bắc</strong></div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '800', color: 'var(--text)' }}>
              Khoảng Cách & Thời Gian
            </h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <div>Đã đi: <strong>140 km</strong> / 300 km</div>
              <div>Thời gian đã đi: <strong>2 giờ 45 phút</strong></div>
              <div>Thời gian dự kiến còn lại: <strong>3 giờ 15 phút</strong></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DriverMapPage;
