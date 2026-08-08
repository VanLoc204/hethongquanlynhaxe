import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentTripsPage = () => {
  const { token } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search state parameters
  const [departureSearch, setDepartureSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');

  const fetchTripsData = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrips(data.trips);
      } else {
        setError(data.message || 'Không thể tải lịch trình chuyến xe.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsData();
  }, [token]);

  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[\.,]/g, '')
      .toLowerCase()
      .trim();
  };


  const canonicalizeLocation = (name) => {
    if (!name) return '';
    const normalized = normalizeText(name);

    if (
      normalized === 'sg' ||
      normalized === 'hcm' ||
      normalized === 'tphcm' ||
      normalized.includes('ho chi minh') ||
      normalized.includes('sai gon')
    ) {
      return 'ho chi minh';
    }
    if (normalized === 'dl' || normalized.includes('da lat')) {
      return 'da lat';
    }
    if (normalized === 'nt' || normalized.includes('nha trang')) {
      return 'nha trang';
    }
    if (normalized === 'dn' || normalized.includes('da nang')) {
      return 'da nang';
    }
    if (normalized === 'vt' || normalized.includes('vung tau')) {
      return 'vung tau';
    }
    if (normalized === 'ct' || normalized.includes('can tho')) {
      return 'can tho';
    }
    if (normalized === 'hp' || normalized.includes('hai phong')) {
      return 'hai phong';
    }
    if (normalized === 'hn' || normalized.includes('ha noi')) {
      return 'ha noi';
    }
    return normalized;
  };

  const filteredTrips = trips.filter(trip => {
    const startInput = canonicalizeLocation(departureSearch);
    const endInput = canonicalizeLocation(destinationSearch);

    const tripStart = canonicalizeLocation(trip.routeId?.startPoint || '');
    const tripEnd = canonicalizeLocation(trip.routeId?.endPoint || '');

    const startMatch = !departureSearch ? true : tripStart.includes(startInput);
    const endMatch = !destinationSearch ? true : tripEnd.includes(endInput);
    return startMatch && endMatch;
  });


  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
  };

  const getDepartureStatusBadge = (departureTime) => {
    const minutesLeft = (new Date(departureTime) - new Date()) / (1000 * 60);
    if (minutesLeft < 0) {
      return <span style={{ backgroundColor: '#edf2f7', color: '#718096', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Đã xuất phát</span>;
    } else if (minutesLeft <= 60) {
      return <span style={{ backgroundColor: '#fff5f5', color: '#e53e3e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>Sắp chạy ({Math.round(minutesLeft)} phút)</span>;
    } else {
      return <span style={{ backgroundColor: '#ebf8ff', color: '#2b6cb0', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>Chờ chạy</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải bảng giờ xe chạy...</div>
      </div>
    );
  }

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <h2>Bảng Giờ Xe Chạy & Tư Vấn Hành Khách</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tìm kiếm nhanh thông tin chuyến xe chạy, giờ xuất phát dự kiến, loại xe giường nằm/limousine để trả lời chuẩn xác thắc mắc cho hành khách tại quầy.</p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '6px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Tìm điểm đi</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ví dụ: Sài Gòn, Nha Trang..."
            value={departureSearch}
            onChange={(e) => setDepartureSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Tìm điểm đến</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ví dụ: Đà Lạt, Nha Trang..."
            value={destinationSearch}
            onChange={(e) => setDestinationSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div style={{ textTransform: 'uppercase', fontStyle: 'italic', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không có chuyến xe nào chạy khớp yêu cầu tra cứu của hành khách.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                <th style={{ padding: '0.75rem' }}>Tuyến chạy</th>
                <th style={{ padding: '0.75rem' }}>Khởi hành</th>
                <th style={{ padding: '0.75rem' }}>Đến dự kiến</th>
                <th style={{ padding: '0.75rem' }}>Phương tiện</th>
                <th style={{ padding: '0.75rem' }}>Giá vé niêm yết</th>
                <th style={{ padding: '0.75rem' }}>Vị trí ghế</th>
                <th style={{ padding: '0.75rem' }}>Trạng thái di chuyển</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map(trip => (
                <tr key={trip._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                    {trip.routeId ? `${trip.routeId.startPoint} ⇄ ${trip.routeId.endPoint}` : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div><strong>{new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(trip.departureTime).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div><strong>{new Date(trip.arrivalTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(trip.arrivalTime).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div><strong>{trip.busId?.plateNumber || 'N/A'}</strong></div>
                    <span className="bus-type-badge">{trip.busId?.type || 'Limousine'}</span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>{formatCurrency(trip.price)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <strong>{trip.busId?.totalSeats - (trip.bookedSeats?.length || 0)} ghế trống</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng số: {trip.busId?.totalSeats || 36} ghế</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{getDepartureStatusBadge(trip.departureTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AgentTripsPage;
