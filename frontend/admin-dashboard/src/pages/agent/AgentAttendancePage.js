import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentAttendancePage = () => {
  const { token } = useContext(AuthContext);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const locations = [
    { id: 'sg', name: 'Văn phòng Sài Gòn (BXMĐ)' },
    { id: 'hn', name: 'Văn phòng Hà Nội (BX Mỹ Đình)' },
    { id: 'nt', name: 'Văn phòng Nha Trang (BX Phía Nam)' },
    { id: 'dl', name: 'Văn phòng Đà Lạt (BX Liên Tỉnh)' },
    { id: 'dn', name: 'Văn phòng Đà Nẵng (BX Trung Tâm)' },
    { id: 'vt', name: 'Văn phòng Vũng Tàu (BX Vũng Tàu)' },
    { id: 'ct', name: 'Văn phòng Cần Thơ (BX Trung Tâm)' }
  ];

  const [selectedLocation, setSelectedLocation] = useState('sg');
  const [selectedCounter, setSelectedCounter] = useState('1');
  const [initialCash, setInitialCash] = useState('500000');

  const fetchCurrentShift = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/shift/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
      } else {
        setError(data.message || 'Không thể kiểm tra trạng thái ca trực.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, [token]);

  const handleStartShift = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const locName = locations.find(l => l.id === selectedLocation)?.name || '';
    const counterStr = `${locName} - Quầy số ${selectedCounter}`;

    try {
      const res = await fetch('http://localhost:8000/api/v1/users/shift/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ counterNumber: counterStr, initialCash: Number(initialCash) || 0 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
        setSuccess('Mở ca bán vé trực tiếp thành công!');
      } else {
        setError(data.message || 'Không thể mở ca trực.');
      }
    } catch (err) {
      setError('Lỗi kết nối khi mở ca trực.');
    }
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang kiểm tra ca trực...</div>
      </div>
    );
  }

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.4s ease', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2>Chấm Công Ca Bán Vé</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bắt đầu ca trực tại quầy vé bến xe An Bình Lines để kích hoạt các chức năng đặt vé tại quầy.</p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.25rem' }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: '1.25rem', backgroundColor: '#e6fffa', color: '#00af80', padding: '0.75rem', borderRadius: '4px', fontStyle: '500' }}>{success}</div>}

      {session ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0, 175, 128, 0.1)', color: '#00af80', padding: '1rem', borderRadius: '6px', fontWeight: '600' }}>
            <span style={{ height: '12px', width: '12px', borderRadius: '50%', backgroundColor: '#00af80', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
            <span>Trạng thái: ĐANG TRONG CA TRỰC HOẠT ĐỘNG (HOẠT ĐỘNG BÌNH THƯỜNG)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Số quầy đăng ký</div>
              <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{session.counterNumber}</strong>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Giờ bắt đầu ca</div>
              <strong>{new Date(session.startTime).toLocaleTimeString('vi-VN')}</strong> ({new Date(session.startTime).toLocaleDateString('vi-VN')})
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Lượng tiền bàn giao đầu ca</div>
              <strong style={{ color: '#2b6cb0' }}>{formatCurrency(session.initialCash)}</strong>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.25rem' }}>Số vé đã bán ra</div>
              <strong style={{ fontSize: '1.2rem' }}>{session.ticketsSold?.length || 0} vé</strong>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #ebf8ff 0%, #dbeafe 100%)', padding: '1.25rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <h4 style={{ color: '#2b6cb0', marginBottom: '0.75rem', marginTop: 0 }}>Kết quả doanh thu tạm thời:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Thu tiền mặt:</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2d3748' }}>{formatCurrency(session.cashRevenue || 0)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Thu POS / QR cashless:</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2d3748' }}>{formatCurrency(session.cashlessRevenue || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleStartShift} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fffaf0', color: '#dd6b20', padding: '1rem', borderRadius: '6px', fontWeight: '500' }}>
            <span style={{ height: '12px', width: '12px', borderRadius: '50%', backgroundColor: '#dd6b20', display: 'inline-block' }}></span>
            <span>Trạng thái: CHƯA MỞ CA TRỰC. Vui lòng điền thông tin để bắt đầu bán vé.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Chi nhánh / Bến xe *</label>
              <select
                className="form-control"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem' }}
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Số quầy vé *</label>
              <select
                className="form-control"
                value={selectedCounter}
                onChange={(e) => setSelectedCounter(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem' }}
              >
                <option value="1">Quầy số 1</option>
                <option value="2">Quầy số 2</option>
                <option value="3">Quầy số 3</option>
                <option value="4">Quầy số 4</option>
                <option value="5">Quầy số 5</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Lượng tiền mặt ban đầu nhận bàn giao (VND)</label>
            <input
              type="number"
              className="form-control"
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value)}
              placeholder="Nhập số tiền mặt lẻ ban đầu bàn giao"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Tiền mặt lẻ dùng để thối tiền thừa cho hành khách tại quầy.</span>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem' }}>Bắt đầu ca trực</button>
        </form>
      )}
    </section>
  );
};

export default AgentAttendancePage;
