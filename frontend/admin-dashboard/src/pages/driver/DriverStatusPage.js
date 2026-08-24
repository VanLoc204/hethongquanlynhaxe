import React, { useState } from 'react';

const DriverStatusPage = () => {
  const [currentStatus, setCurrentStatus] = useState('rời bến'); // rời bến, dừng nghỉ, đến bến
  const [log, setLog] = useState([
    { time: '06:05 - 24/08/2026', desc: 'Xe xuất phát từ Văn Phòng Tân Bình chặng Hồ Chí Minh ➔ Đà Lạt.' }
  ]);

  const handleUpdate = (nextStatus, message) => {
    setCurrentStatus(nextStatus);
    const now = new Date();
    const formatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.toLocaleDateString('vi-VN')}`;
    setLog(prev => [
      { time: formatted, desc: message },
      ...prev
    ]);
  };

  return (
    <div className="responsive-grid-layout" style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* Left side: status controls */}
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text)' }}>
          Cập Nhật Hành Trình Xe Chạy
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <button
            onClick={() => handleUpdate('rời bến', 'Bắt đầu khởi hành từ bến xuất phát chặng HCM ➔ Đà Lạt.')}
            disabled={currentStatus === 'rời bến'}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              background: currentStatus === 'rời bến' ? '#e2e8f0' : 'var(--primary)',
              color: currentStatus === 'rời bến' ? '#94a3b8' : '#ffffff',
              transition: 'all 0.2s'
            }}
          >
            Khởi Hành Rời Bến
          </button>

          <button
            onClick={() => handleUpdate('dừng nghỉ', 'Xe dừng chân tại trạm nghỉ Bảo Lộc.')}
            disabled={currentStatus === 'dừng nghỉ'}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              background: currentStatus === 'dừng nghỉ' ? '#e2e8f0' : '#f59e0b',
              color: currentStatus === 'dừng nghỉ' ? '#94a3b8' : '#ffffff',
              transition: 'all 0.2s'
            }}
          >
            Cập Nhật: Dừng Nghỉ Chân
          </button>

          <button
            onClick={() => handleUpdate('đến bến', 'Xe đã đến bến đích an toàn tại Văn Phòng Đà Lạt.')}
            disabled={currentStatus === 'đến bến'}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              background: currentStatus === 'đến bến' ? '#e2e8f0' : '#10b981',
              color: currentStatus === 'đến bến' ? '#94a3b8' : '#ffffff',
              transition: 'all 0.2s'
            }}
          >
            Đến Bến Đích (Hoàn Thành)
          </button>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#1e40af', fontWeight: '800' }}>
            Thông Tin Chuyến Xe Hiện Tại:
          </h4>
          <div style={{ fontSize: '0.8rem', color: '#1e3a8a', lineHeight: '1.5' }}>
            <div>Tuyến: <strong>Hồ Chí Minh ➔ Đà Lạt</strong></div>
            <div>Giờ đi: 06:00 (24/08/2026)</div>
            <div>Tài xế: Á Đông | Phụ xe: Quốc Bảo</div>
          </div>
        </div>
      </div>

      {/* Right side: journey log */}
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text)' }}>
          Nhật Ký Hành Trình Chuyến Chạy
        </h3>

        <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid #e2e8f0' }}>
          {log.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '-1.9rem',
                top: '0.2rem',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: idx === 0 ? 'var(--primary)' : '#cbd5e1',
                border: '2px solid #ffffff'
              }}></span>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                {item.time}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.4' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DriverStatusPage;
