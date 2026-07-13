import React, { useState, useEffect } from 'react';
import { Bell, Percent, Truck, CheckCircle2, MailOpen, Trash2 } from 'lucide-react';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Populate mock notifications
    setNotifications([
      {
        id: 1,
        type: 'promotion',
        title: 'Khuyến mãi hè cực khủng: Giảm giá 15% tất cả các tuyến Đà Lạt!',
        content: 'Chào hè rực rỡ, Á Đông Express giảm ngay 15% giá vé cho khách hàng thân thiết đặt vé tuyến đi/về Đà Lạt từ 10/07 đến 20/07. Nhập mã ADONGHE15 khi thanh toán.',
        time: '1 giờ trước',
        read: false
      },
      {
        id: 2,
        type: 'trip',
        title: 'Xác nhận đặt vé thành công - Chuyến đi Đà Lạt ngày 10/07',
        content: 'Mã vé TKT-782941 của bạn đã được xác nhận thành công. Giờ khởi hành: 08:00 ngày 10/07/2026. Vui lòng có mặt tại Văn Phòng Tân Bình trước 15 phút.',
        time: '3 giờ trước',
        read: false
      },
      {
        id: 3,
        type: 'system',
        title: 'Cập nhật tính năng: Theo dõi hành trình xe thời gian thực',
        content: 'Á Đông Travel vừa cập nhật tính năng định vị xe trực tuyến. Giờ đây bạn có thể theo dõi chính xác vị trí chiếc xe mình đi ngay trên giao diện Web!',
        time: '1 ngày trước',
        read: true
      },
      {
        id: 4,
        type: 'promotion',
        title: 'Tặng 50 điểm thưởng chào mừng thành viên mới!',
        content: 'Cảm ơn bạn đã đăng ký tài khoản thành viên Á Đông. Hệ thống đã cộng 50 điểm thưởng (tương đương 50.000đ) vào tài khoản của bạn để đặt vé xe.',
        time: '3 ngày trước',
        read: true
      }
    ]);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkSingleRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredList = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'promotion':
        return <Percent size={18} style={{ color: 'var(--accent)' }} />;
      case 'trip':
        return <Truck size={18} style={{ color: 'var(--primary)' }} />;
      default:
        return <Bell size={18} style={{ color: '#8b5cf6' }} />;
    }
  };

  return (
    <div className="section-container animate-fade-in" style={{ maxWidth: '850px', paddingBottom: '5rem' }}>
      
      {/* Header Title */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Bell size={32} className="animate-swing" style={{ color: 'var(--primary)', animationIterationCount: 'infinite', animationDuration: '3s' }} />
          Thông Báo Từ Hệ Thống & Ưu Đãi
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Nhận các chương trình khuyến mãi giá vé mới nhất, tin tức cập nhật và thông báo lịch chạy của các chuyến đi của bạn.
        </p>
      </div>

      {/* Action controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {['all', 'trip', 'promotion', 'system'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                backgroundColor: filter === cat ? 'var(--primary)' : '#ffffff',
                color: filter === cat ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {cat === 'all' ? 'Tất cả' : cat === 'trip' ? 'Chuyến đi' : cat === 'promotion' ? 'Ưu đãi' : 'Hệ thống'}
            </button>
          ))}
        </div>

        {/* Mark read button */}
        <button 
          onClick={handleMarkAllRead}
          className="btn btn-secondary" 
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <MailOpen size={16} />
          Đánh dấu đã đọc tất cả
        </button>
      </div>

      {/* Notifications stack */}
      {filteredList.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>Không có thông báo nào</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Bạn đã đọc hết tất cả các thông báo của hệ thống.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredList.map((n) => (
            <div 
              key={n.id} 
              onClick={() => handleMarkSingleRead(n.id)}
              className="glass-card" 
              style={{ 
                padding: '1.25rem 1.5rem', 
                backgroundColor: n.read ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
                borderLeft: `4px solid ${n.read ? 'transparent' : 'var(--primary)'}`,
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              {/* Unread indicator badge */}
              {!n.read && (
                <div style={{
                  position: 'absolute',
                  right: '15px',
                  top: '15px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)'
                }}></div>
              )}

              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                {/* Icon wrapper */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: n.read ? '#f3f4f6' : 'rgba(59, 130, 246, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getIcon(n.type)}
                </div>

                <div style={{ flexGrow: 1, paddingRight: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontWeight: n.read ? '700' : '800', margin: '0', fontSize: '1rem', color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {n.title}
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.45', margin: '0 0 8px 0' }}>
                    {n.content}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.time}</span>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(n.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '6px'
                  }}
                >
                  <Trash2 size={16} />
                </button>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default NotificationsPage;
