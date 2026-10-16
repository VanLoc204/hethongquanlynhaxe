import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentDashboardPage = ({ setActiveTab }) => {
  const { user, token } = useContext(AuthContext);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number || 0);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Đang nạp dữ liệu ca trực...</p>
      </div>
    );
  }

  // Tính tổng doanh thu ca
  const totalRevenue = activeShift 
    ? (activeShift.cashRevenue || 0) + (activeShift.cashlessRevenue || 0)
    : 0;

  // Lọc vé theo từ khóa tìm kiếm (tên, SĐT, mã vé)
  const ticketsList = activeShift?.ticketsSold || [];
  const filteredTickets = ticketsList.filter(ticket => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const orderCode = (ticket.orderCode || '').toLowerCase();
    const customerName = (ticket.customerName || '').toLowerCase();
    const customerPhone = (ticket.customerPhone || '').toLowerCase();
    const seats = (ticket.seats || []).join(', ').toLowerCase();
    return orderCode.includes(q) || customerName.includes(q) || customerPhone.includes(q) || seats.includes(q);
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* CSS Cục Bộ Chuẩn Giao Diện Vận Hành Quầy Vé - Responsive Toàn Diện & Tuyệt Đối Không Dùng Icon */}
      <style>{`
        .agent-panel-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .agent-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .agent-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .agent-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .agent-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .agent-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .agent-split-layout {
          display: grid;
          grid-template-columns: 1.75fr 1.25fr;
          gap: 1.25rem;
          align-items: start;
        }

        .agent-action-btn {
          width: 100%;
          padding: 0.85rem 1.15rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
          border: none;
        }

        .agent-action-btn:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        /* Responsive Tablet (<= 992px) */
        @media (max-width: 992px) {
          .agent-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .agent-split-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Responsive Mobile (<= 640px) */
        @media (max-width: 640px) {
          .agent-panel-box {
            padding: 1rem 0.85rem;
            border-radius: 12px;
            gap: 1rem;
          }
          .agent-header-wrap {
            flex-direction: column;
            align-items: flex-start;
          }
          .agent-header-actions {
            width: 100%;
          }
          .agent-header-actions button {
            flex: 1;
            justify-content: center;
          }
          .agent-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* VÙNG 1: KHỐI TRẮNG TIÊU ĐỀ & TRẠNG THÁI CA TRỰC TẠI QUẦY  */}
      {/* ========================================================= */}
      <div className="agent-panel-box">
        <div className="agent-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Bảng Điều Hành Quầy Vé &amp; Ca Trực
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: '700'
              }}>
                Nhân Viên Bán Vé
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
              {activeShift ? (
                <span>
                  Đang trực tại: <strong style={{ color: '#0f172a' }}>{activeShift.counterNumber}</strong>
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                  Bắt đầu: <strong style={{ color: '#0f172a' }}>{new Date(activeShift.startTime).toLocaleTimeString('vi-VN')}</strong> ({new Date(activeShift.startTime).toLocaleDateString('vi-VN')})
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                  Nhân sự: <strong style={{ color: '#0f172a' }}>{user?.fullName || user?.name || user?.email}</strong>
                </span>
              ) : (
                <span style={{ color: '#b45309' }}>
                  Chưa ghi nhận ca trực hôm nay. Vui lòng mở ca trực tại quầy trước khi bắt đầu xuất vé.
                </span>
              )}
            </div>
          </div>

          <div className="agent-header-actions">
            {/* Huy hiệu trạng thái ca */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: activeShift ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${activeShift ? '#bbf7d0' : '#fecaca'}`,
              color: activeShift ? '#15803d' : '#be123c',
              fontSize: '0.72rem',
              fontWeight: '800',
              letterSpacing: '0.3px'
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: activeShift ? '#10b981' : '#ef4444'
              }}></span>
              {activeShift ? 'ĐANG HOẠT ĐỘNG' : 'CHƯA MỞ CA'}
            </div>

            <button
              onClick={fetchShiftData}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: '700',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              title="Tải lại dữ liệu ca trực mới nhất"
            >
              Làm Mới
            </button>

            {activeShift ? (
              <button
                onClick={() => setActiveTab('agent-booking')}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Đặt Vé Tại Quầy
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('agent-attendance')}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Mở Ca Trực Ngay
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#be123c',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            Lưu ý: {error}
          </div>
        )}
      </div>

      {activeShift ? (
        <>
          {/* ========================================================= */}
          {/* VÙNG 2: 4 THẺ CHỈ SỐ DOANH THU & SỐ LƯỢNG VÉ TRONG CA     */}
          {/* ========================================================= */}
          <div className="agent-kpi-grid">
            
            {/* Card 1: Số vé đã bán */}
            <div className="agent-kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Số Vé Đã Bán
                </span>
                <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                  Ca hiện tại
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0f172a', margin: '0.5rem 0 0.25rem 0' }}>
                {activeShift.ticketsSold?.length || 0} <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>vé</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                Ghi nhận trực tiếp từ quầy vé
              </div>
            </div>

            {/* Card 2: Doanh thu tiền mặt */}
            <div className="agent-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Doanh Thu Tiền Mặt
                </span>
                <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                  Thu tại quầy
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#10b981', margin: '0.5rem 0 0.25rem 0' }}>
                {formatCurrency(activeShift.cashRevenue || 0)}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                Tiền mặt cần bàn giao cuối ca
              </div>
            </div>

            {/* Card 3: Doanh thu chuyển khoản / POS */}
            <div className="agent-kpi-card" style={{ borderLeft: '4px solid #6366f1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Chuyển Khoản / POS
                </span>
                <span style={{ fontSize: '0.68rem', background: '#eef2ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                  VietQR &amp; Thẻ
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#4338ca', margin: '0.5rem 0 0.25rem 0' }}>
                {formatCurrency(activeShift.cashlessRevenue || 0)}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                Đã ghi nhận qua ngân hàng
              </div>
            </div>

            {/* Card 4: Tổng doanh thu ca */}
            <div className="agent-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tổng Doanh Thu Ca
                </span>
                <span style={{ fontSize: '0.68rem', background: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                  Chưa tính quỹ đầu ca
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#b45309', margin: '0.5rem 0 0.25rem 0' }}>
                {formatCurrency(totalRevenue)}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                Tổng giá trị vé xuất trong ca
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* VÙNG 3: BỐ CỤC 2 CỘT (DANH SÁCH VÉ & LỐI TẮT QUẦY VÉ)     */}
          {/* ========================================================= */}
          <div className="agent-split-layout">
            
            {/* CỘT TRÁI: DANH SÁCH VÉ ĐÃ XUẤT TRONG CA */}
            <div className="agent-panel-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Vé Đã Xuất Trong Ca
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                    Tổng cộng: {ticketsList.length} vé đã xử lý
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Tìm tên, SĐT, ghế..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      outline: 'none',
                      width: '160px'
                    }}
                  />
                  <button
                    onClick={() => setActiveTab('agent-tickets')}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      color: '#2563eb',
                      cursor: 'pointer'
                    }}
                  >
                    Xem tất cả vé
                  </button>
                </div>
              </div>

              {/* Danh sách vé xuất nhỏ gọn, thanh thoát */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {filteredTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '4px' }}>
                      {searchQuery ? 'Không tìm thấy vé nào phù hợp' : 'Chưa có vé nào được xuất trong ca trực này'}
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      {searchQuery ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm.' : 'Nhấn nút "Bắt đầu Đặt vé tại quầy" để tạo vé mới cho hành khách.'}
                    </div>
                  </div>
                ) : (
                  [...filteredTickets].reverse().map((ticket) => {
                    const price = ticket.tripId?.price || 0;
                    const isCancelled = ticket.status === 'cancelled';
                    return (
                      <div
                        key={ticket._id}
                        style={{
                          background: isCancelled ? '#fff1f2' : '#ffffff',
                          border: `1px solid ${isCancelled ? '#fecdd3' : '#e2e8f0'}`,
                          borderLeft: `4px solid ${isCancelled ? '#ef4444' : '#10b981'}`,
                          borderRadius: '8px',
                          padding: '0.75rem 0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Cột trái: Mã vé, Khách, Ghế, Tuyến */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                            <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#0f172a' }}>
                              #{ticket.orderCode || ticket._id?.slice(-6)?.toUpperCase()}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: '700',
                              backgroundColor: isCancelled ? '#fee2e2' : '#dcfce7',
                              color: isCancelled ? '#b91c1c' : '#15803d'
                            }}>
                              {isCancelled ? 'Đã hủy' : 'Thành công'}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: '800',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              Ghế: {ticket.seats?.join(', ')}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#0f172a' }}>{ticket.customerName}</strong>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span>SĐT: {ticket.customerPhone}</span>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span style={{ color: '#2563eb', fontWeight: '700' }}>
                              {ticket.tripId?.routeId ? `${ticket.tripId.routeId.startPoint} ➔ ${ticket.tripId.routeId.endPoint}` : 'Tuyến N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Cột phải: Giá tiền & Thời gian */}
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: '900', color: isCancelled ? '#94a3b8' : '#0f172a', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            {formatCurrency(price * (ticket.seats?.length || 1))}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CỘT PHẢI: LỐI TẮT & TRỢ LÝ AI & LƯU Ý QUẦY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Box 1: Lối tắt bán vé nhanh */}
              <div className="agent-panel-box">
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Lối Tắt Bán Vé Nhanh
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Thao tác thường dùng trong ca trực</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <button
                    type="button"
                    className="agent-action-btn"
                    style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                    onClick={() => setActiveTab('agent-booking')}
                  >
                    Bắt Đầu Đặt Vé Tại Quầy
                  </button>

                  <button
                    type="button"
                    className="agent-action-btn"
                    style={{ backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    onClick={() => setActiveTab('agent-tickets')}
                  >
                    Tra Cứu &amp; Quản Lý Vé
                  </button>

                  <button
                    type="button"
                    className="agent-action-btn"
                    style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #e2e8f0' }}
                    onClick={() => setActiveTab('agent-trips')}
                  >
                    Tra Cứu Lịch Chạy Xe
                  </button>

                  <button
                    type="button"
                    className="agent-action-btn"
                    style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
                    onClick={() => setActiveTab('agent-shift')}
                  >
                    Tổng Kết &amp; Bàn Giao Ca Trực
                  </button>
                </div>
              </div>

              {/* Box 2: Trợ lý tư vấn AI hỗ trợ quầy */}
              <div className="agent-panel-box" style={{ background: '#f8fafc', border: '1px solid #dbeafe' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Trợ Lý AI Thông Minh
                  </span>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>
                    Hỗ Trợ Tư Vấn &amp; Giải Đáp
                  </h3>
                </div>

                <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  Bạn cần tra cứu nhanh lộ trình, thời gian đón trả, tư vấn chính sách đổi trả vé hoặc phụ thu hành lý cho khách? Hãy sử dụng trợ lý ảo AI để được hướng dẫn tức thì.
                </p>

                <button
                  type="button"
                  className="agent-action-btn"
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem'
                  }}
                  onClick={() => setActiveTab('agent-ai')}
                >
                  Mở Trò Chuyện Với AI
                </button>
              </div>

              {/* Box 3: Quy chuẩn vận hành quầy (SOP) */}
              <div className="agent-panel-box" style={{ background: '#ffffff' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Quy Trình &amp; Lưu Ý Tại Quầy
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.75rem', color: '#334155' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#2563eb' }}>1.</span>
                    <span>Xác nhận kỹ họ tên, số điện thoại, ngày giờ xuất bến và vị trí ghế với khách trước khi bấm in vé.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#2563eb' }}>2.</span>
                    <span>Khách chuyển khoản VietQR: Yêu cầu xem biên lai thành công và kiểm tra đối soát trước khi trao vé.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontWeight: '800', color: '#2563eb' }}>3.</span>
                    <span>Khi hết ca: Thực hiện kiểm đếm tiền mặt thực tế khớp với số liệu trên hệ thống trước khi bàn giao ca.</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </>
      ) : (
        /* ========================================================= */
        /* MÀN HÌNH CHƯA MỞ CA TRỰC (KHÔNG DÙNG ICON/EMOJI)          */
        /* ========================================================= */
        <div className="agent-panel-box" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 14px',
            borderRadius: '20px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            fontSize: '0.75rem',
            fontWeight: '800',
            marginBottom: '1rem',
            letterSpacing: '0.5px'
          }}>
            CHƯA MỞ CA TRỰC HÔM NAY
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Vui Lòng Mở Ca Trực Để Bắt Đầu Bán Vé
          </h2>

          <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6', margin: '0 0 1.75rem 0' }}>
            Hệ thống quản lý ca trực giúp phân định rõ ràng số lượng vé xuất, doanh thu tiền mặt, doanh thu chuyển khoản theo từng nhân viên và quầy vé. Hãy mở ca trực trước khi thực hiện các giao dịch.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('agent-attendance')}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Đi Tới Chấm Công &amp; Mở Ca
            </button>
            <button
              type="button"
              onClick={fetchShiftData}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Kiểm Tra Lại Trạng Thái
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentDashboardPage;
