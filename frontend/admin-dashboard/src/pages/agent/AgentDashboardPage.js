import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';

const AgentDashboardPage = ({ setActiveTab }) => {
  const { user, token } = useContext(AuthContext);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchShiftData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/shift/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveShift(data.session);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải dữ liệu ca trực.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchShiftData();
    }
  }, [token]);

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu ca trực...</p>
      </div>
    );
  }

  // Calculate total shift revenue
  const totalRevenue = activeShift 
    ? (activeShift.cashRevenue || 0) + (activeShift.cashlessRevenue || 0)
    : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Shift status header banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--card-border)',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)', fontWeight: '700' }}>
            {activeShift ? `Đang trực tại Quầy: ${activeShift.counterNumber}` : 'Chưa Mở Ca Trực'}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeShift 
              ? `Thời gian bắt đầu: ${new Date(activeShift.startTime).toLocaleTimeString('vi-VN')} (${new Date(activeShift.startTime).toLocaleDateString('vi-VN')})`
              : 'Vui lòng thực hiện mở ca trực tại quầy để bắt đầu bán vé.'
            }
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: activeShift ? '#10b981' : '#ef4444',
            boxShadow: activeShift ? '0 0 8px #10b981' : '0 0 8px #ef4444'
          }}></span>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: activeShift ? '#10b981' : '#ef4444' }}>
            {activeShift ? 'ĐANG HOẠT ĐỘNG' : 'CHƯA MỞ CA'}
          </span>
        </div>
      </div>

      {activeShift ? (
        <>
          {/* Stats Grid */}
          <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard 
              label="Số vé đã bán" 
              value={`${activeShift.ticketsSold?.length || 0} vé`} 
              trend="Trong ca hiện tại" 
              colorClass="blue" 
            />
            <StatCard 
              label="Doanh thu tiền mặt" 
              value={formatCurrency(activeShift.cashRevenue || 0)} 
              trend="Thu trực tiếp" 
              colorClass="green" 
            />
            <StatCard 
              label="Doanh thu chuyển khoản / POS" 
              value={formatCurrency(activeShift.cashlessRevenue || 0)} 
              trend="Quét VietQR & Thẻ" 
              colorClass="purple" 
            />
            <StatCard 
              label="Tổng doanh thu ca" 
              value={formatCurrency(totalRevenue)} 
              trend="Chưa tính tiền đầu ca" 
              colorClass="yellow" 
            />
          </section>

          {/* Two columns content */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
            
            {/* Column 1: Recent tickets sold in this shift */}
            <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)' }}>
                Vé đã xuất trong ca
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(!activeShift.ticketsSold || activeShift.ticketsSold.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Chưa có vé nào được xuất trong ca trực này.
                  </div>
                ) : (
                  [...activeShift.ticketsSold].reverse().map((ticket) => {
                    const price = ticket.tripId?.price || 0;
                    return (
                      <div 
                        key={ticket._id} 
                        style={{
                          padding: '12px 16px',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                              SmartBus #{ticket.orderCode}
                            </strong>
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: '600',
                              backgroundColor: ticket.status === 'cancelled' ? '#fee2e2' : '#d1fae5',
                              color: ticket.status === 'cancelled' ? '#ef4444' : '#10b981'
                            }}>
                              {ticket.status === 'cancelled' ? 'Đã hủy' : 'Thành công'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Khách: {ticket.customerName} ({ticket.customerPhone}) | Ghế: {ticket.seats?.join(', ')}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600', marginTop: '2px' }}>
                            {ticket.tripId?.routeId ? `${ticket.tripId.routeId.startPoint} ⇄ ${ticket.tripId.routeId.endPoint}` : 'N/A'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                            {formatCurrency(price * (ticket.seats?.length || 0))}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(ticket.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Quick Links & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)' }}>
                  Lối tắt bán vé nhanh
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ padding: '12px', fontWeight: '700', borderRadius: '8px', fontSize: '0.85rem', width: '100%', textTransform: 'none' }}
                    onClick={() => setActiveTab('agent-booking')}
                  >
                    Bắt đầu Đặt vé tại quầy
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    style={{ padding: '12px', fontWeight: '700', borderRadius: '8px', fontSize: '0.85rem', width: '100%', textTransform: 'none', backgroundColor: '#e2e8f0', color: '#1e293b' }}
                    onClick={() => setActiveTab('agent-tickets')}
                  >
                    Tra cứu &amp; Hủy vé
                  </button>
                </div>
              </div>

              <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'linear-gradient(135deg, rgba(63, 106, 216, 0.03) 0%, rgba(121, 40, 202, 0.03) 100%)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)' }}>
                  Trợ lý tư vấn AI hỗ trợ
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1rem' }}>
                  Bạn cần tra cứu lộ trình, tư vấn khách hàng hoặc kiểm tra chính sách vé? Hãy sử dụng trợ lý ảo AI để được hướng dẫn tức thì.
                </p>
                <button 
                  type="button" 
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, #7928ca 100%)',
                    color: '#ffffff',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 6px -1px rgba(121, 40, 202, 0.15)'
                  }}
                  onClick={() => setActiveTab('agent-ai')}
                >
                  Trò chuyện với AI
                </button>
              </div>

            </div>

          </section>
        </>
      ) : (
        <div className="panel" style={{ padding: '2.5rem', borderRadius: '12px', border: '1px solid var(--card-border)', textAlign: 'center', background: '#ffffff' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
            Bạn chưa mở ca trực hôm nay
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
            Để ghi nhận doanh thu bán vé, số lượng vé xuất và liên kết với mã quầy tương ứng, vui lòng mở ca trực trước khi thao tác bán vé.
          </p>
          <button 
            type="button" 
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontWeight: '700', borderRadius: '8px' }}
            onClick={() => setActiveTab('agent-attendance')}
          >
            Đi tới mở ca trực
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentDashboardPage;
