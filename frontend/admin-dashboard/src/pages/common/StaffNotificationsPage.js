import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StaffNotificationsPage = () => {
  const { token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/users/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setNotifications(data.notifications);
        } else {
          setError(data.message || 'Không thể tải danh sách thông báo.');
        }
      } catch (err) {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [token]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN') + ' - ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2>Thông Báo Từ Ban Điều Hành</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Theo dõi các thông báo điều động, chỉ thị và quy định vận hành</p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải hộp thông báo...</div>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Hộp thông báo của bạn trống.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {notifications.map((item) => (
            <div
              key={item._id}
              style={{
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1.25rem',
                backgroundColor: '#ffffff',
                borderLeft: '4px solid var(--primary)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{item.title}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(item.createdAt)}</span>
              </div>
              <p style={{ color: '#4d5475', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default StaffNotificationsPage;
