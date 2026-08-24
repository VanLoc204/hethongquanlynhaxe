import React, { useState } from 'react';

const DriverAttendancePage = () => {
  const [status, setStatus] = useState('check-out'); // check-in or check-out
  const [log, setLog] = useState([
    { time: '05:30:22 - 24/08/2026', action: 'Bắt đầu ca trực', method: 'GPS - Bến xe Miền Đông', status: 'Hợp lệ' }
  ]);
  const [gpsSimulated, setGpsSimulated] = useState('10.7904° N, 106.7078° E (Bến Xe Miền Đông)');

  const handleAction = () => {
    const now = new Date();
    const formatted = `${now.toLocaleTimeString()} - ${now.toLocaleDateString('vi-VN')}`;
    
    if (status === 'check-out') {
      setStatus('check-in');
      setLog(prev => [
        { time: formatted, action: 'Bắt đầu ca trực', method: 'GPS - Bến Xe Đà Lạt', status: 'Hợp lệ' },
        ...prev
      ]);
    } else {
      setStatus('check-out');
      setLog(prev => [
        { time: formatted, action: 'Kết thúc ca trực', method: 'GPS - Bến Xe Miền Đông', status: 'Hợp lệ' },
        ...prev
      ]);
    }
  };

  return (
    <div className="responsive-grid-layout" style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* Left Column: Actions */}
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text)' }}>
          Chấm Công Ghi Nhận Ca Trực
        </h3>

        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <button
            onClick={handleAction}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              border: 'none',
              background: status === 'check-out' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontSize: '1.2rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {status === 'check-out' ? 'Bắt Đầu Ca' : 'Kết Thúc Ca'}
          </button>
        </div>

        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)', fontSize: '0.85rem' }}>
          <div style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            Định vị GPS hiện tại:
          </div>
          <div style={{ fontWeight: '700', color: 'var(--text)' }}>
            {gpsSimulated}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            Độ chính xác cao (+/- 5m)
          </div>
        </div>
      </div>

      {/* Right Column: History */}
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text)' }}>
          Nhật Ký Chấm Công Gần Đây
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {log.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: '#ffffff'
            }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>
                  {item.action}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.method}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  marginBottom: '4px'
                }}>
                  {item.status}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {item.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DriverAttendancePage;
