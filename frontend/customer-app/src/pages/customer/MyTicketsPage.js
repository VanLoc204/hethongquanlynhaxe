import React, { useState, useEffect } from 'react';
import { Ticket, MapPin, Calendar, Clock, DollarSign, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  useEffect(() => {
    // 1. Initialize some premium mock tickets if local storage is empty
    let stored = localStorage.getItem('booked_tickets');
    if (!stored) {
      const mockTickets = [
        {
          id: 'TKT-782941',
          tripId: 'mock-trip-1',
          busName: 'Á Đông Limousine 22',
          busType: 'Limousine 22 Phòng VIP',
          from: 'Hồ Chí Minh',
          to: 'Đà Lạt',
          departureTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days in future
          price: 400000,
          seats: ['A5', 'A6'],
          pickup: 'Văn Phòng Tân Bình',
          dropoff: 'Văn Phòng Đà Lạt',
          bookingDate: new Date().toISOString(),
          status: 'Confirmed'
        },
        {
          id: 'TKT-239104',
          tripId: 'mock-trip-2',
          busName: 'Á Đông Limousine 34',
          busType: 'Limousine 34 Giường thường',
          from: 'Đà Lạt',
          to: 'Hồ Chí Minh',
          departureTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          price: 290000,
          seats: ['B12'],
          pickup: 'Văn Phòng Đà Lạt',
          dropoff: 'Văn Phòng Quận 9',
          bookingDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Completed'
        }
      ];
      localStorage.setItem('booked_tickets', JSON.stringify(mockTickets));
      setTickets(mockTickets);
    } else {
      setTickets(JSON.parse(stored));
    }
  }, []);

  const handleCancelTicket = (ticketId) => {
    if (window.confirm('Bạn có chắc chắn muốn yêu cầu hủy vé xe này không?')) {
      const updated = tickets.map(t => {
        if (t.id === ticketId) {
          return { ...t, status: 'Cancelled' };
        }
        return t;
      });
      localStorage.setItem('booked_tickets', JSON.stringify(updated));
      setTickets(updated);
      alert('Yêu cầu hủy vé đã được gửi. Chúng tôi sẽ hoàn tiền trong vòng 24 giờ làm việc.');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const toggleExpand = (id) => {
    setExpandedTicketId(expandedTicketId === id ? null : id);
  };

  return (
    <div className="section-container animate-fade-in" style={{ maxWidth: '900px', paddingBottom: '5rem' }}>
      
      {/* Page Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Ticket size={32} style={{ color: 'var(--primary)' }} />
          Quản Lý Vé & Lịch Sử Hành Trình
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Xem chi tiết vé xe đã đặt, thực hiện hủy/trả vé, và lưu giữ lịch sử các chuyến đi của bạn.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Ticket size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>Bạn chưa đặt vé nào</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Hãy bắt đầu tìm chuyến xe của bạn trên hệ thống Á Đông SmartBus để nhận nhiều phần quà hấp dẫn!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {tickets.map((t) => {
            const isExpanded = expandedTicketId === t.id;
            const isFuture = new Date(t.departureTime) > new Date();

            return (
              <div key={t.id} className="glass-card" style={{ padding: '0', overflow: 'hidden', borderLeft: `6px solid ${t.status === 'Cancelled' ? '#ef4444' : t.status === 'Completed' ? '#10b981' : 'var(--primary)'}` }}>
                {/* Header Ticket Summary */}
                <div style={{ padding: '1.5rem 2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                  
                  {/* Left part: Route info */}
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        backgroundColor: t.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' : t.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: t.status === 'Cancelled' ? '#ef4444' : t.status === 'Completed' ? '#10b981' : 'var(--primary)' 
                      }}>
                        {t.status === 'Cancelled' ? 'Đã hủy' : t.status === 'Completed' ? 'Đã hoàn thành' : 'Đang chờ đi'}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>#{t.id}</span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 4px 0' }}>
                      {t.from} → {t.to}
                    </h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {formatDate(t.departureTime)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {formatTime(t.departureTime)}
                      </span>
                    </div>
                  </div>

                  {/* Mid part: Seat & Price info */}
                  <div style={{ textAlign: 'right', minWidth: '150px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Ghế: <strong style={{ color: 'var(--text-primary)' }}>{t.seats.join(', ')}</strong>
                    </p>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent)', margin: '4px 0 0 0' }}>
                      {formatCurrency(t.price * t.seats.length)}
                    </h4>
                  </div>

                  {/* Right part: Toggle Expand */}
                  <div>
                    <button 
                      onClick={() => toggleExpand(t.id)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        color: 'var(--text-secondary)', 
                        padding: '10px' 
                      }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div style={{ 
                    borderTop: '1px dashed var(--border-color)', 
                    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
                    padding: '2rem'
                  }} className="ticket-detail-layout animate-fade-in">
                    
                    {/* Left: Journey specifics */}
                    <div>
                      <h4 style={{ fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>Thông tin chi tiết chuyến đi</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Nhà xe & Dịch vụ:</span>
                          <strong style={{ marginLeft: '6px' }}>{t.busName} ({t.busType})</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Điểm đón khách:</span>
                          <strong style={{ marginLeft: '6px' }}>{t.pickup}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Điểm trả khách:</span>
                          <strong style={{ marginLeft: '6px' }}>{t.dropoff}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Thời gian đặt vé:</span>
                          <span style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>{formatDate(t.bookingDate)} lúc {formatTime(t.bookingDate)}</span>
                        </div>
                      </div>

                      {/* Cancel action button for upcoming trips */}
                      {isFuture && t.status === 'Confirmed' && (
                        <div style={{ marginTop: '2rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ borderColor: '#ef4444', color: '#ef4444', hoverBg: 'rgba(239, 68, 68, 0.1)' }}
                            onClick={() => handleCancelTicket(t.id)}
                          >
                            Yêu cầu Hủy vé (Hoàn tiền)
                          </button>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                            * Theo chính sách của Á Đông Bus, việc hoàn hủy chỉ được áp dụng trước giờ khởi hành ít nhất 24 tiếng.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Boarding QR Code mockup */}
                    <div className="ticket-qr-section">
                      {t.status === 'Cancelled' ? (
                        <div style={{ textAlign: 'center', color: '#ef4444' }}>
                          <XCircle size={64} style={{ opacity: 0.8 }} />
                          <p style={{ fontSize: '0.8rem', fontWeight: '700', marginTop: '10px' }}>VÉ ĐÃ BỊ HỦY</p>
                        </div>
                      ) : (
                        <>
                          <div style={{ 
                            padding: '8px', 
                            backgroundColor: '#ffffff', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '8px',
                            boxShadow: 'var(--card-shadow)'
                          }}>
                            {/* Mock QR image */}
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(t.id)}`} 
                              alt="Boarding QR Code" 
                              style={{ display: 'block', width: '130px', height: '130px' }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', marginTop: '10px', letterSpacing: '0.5px' }}>
                            MÃ BẢN VÉ (QR)
                          </span>
                        </>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default MyTicketsPage;
