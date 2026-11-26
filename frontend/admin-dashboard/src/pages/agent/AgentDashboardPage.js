import React, { useContext, useState, useEffect } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';

const AgentDashboardPage = ({ setActiveTab }) => {
  const { user, token } = useContext(AuthContext);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Cập nhật đồng hồ thời gian thực mỗi giây
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchShiftData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE_URL + '/api/users/shift/current', {
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
        <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Đang nạp dữ liệu ca trực từ máy chủ...</p>
      </div>
    );
  }

  // 1. Tính tổng doanh thu ca (Dữ liệu thật từ MongoDB)
  const cashRevenue = activeShift?.cashRevenue || 0;
  const cashlessRevenue = activeShift?.cashlessRevenue || 0;
  const totalRevenue = activeShift ? (cashRevenue + cashlessRevenue) : 0;
  const initialCash = activeShift?.initialCash || 0;
  const refundCash = activeShift?.refundCash || 0;
  const cashInDrawer = initialCash + cashRevenue - refundCash;

  // 2. Lọc vé theo từ khóa tìm kiếm (mã vé, tên khách, số điện thoại, ghế)
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

  // 3. Xử lý dữ liệu biểu đồ phân bố theo khung giờ trong ca
  const hourlySlots = [
    { label: '06h-09h', start: 6, end: 9, count: 0, revenue: 0 },
    { label: '09h-12h', start: 9, end: 12, count: 0, revenue: 0 },
    { label: '12h-15h', start: 12, end: 15, count: 0, revenue: 0 },
    { label: '15h-18h', start: 15, end: 18, count: 0, revenue: 0 },
    { label: '18h-21h', start: 18, end: 21, count: 0, revenue: 0 },
    { label: '21h-24h', start: 21, end: 24, count: 0, revenue: 0 }
  ];

  ticketsList.forEach(ticket => {
    if (!ticket.createdAt) return;
    const hour = new Date(ticket.createdAt).getHours();
    const slot = hourlySlots.find(s => hour >= s.start && hour < s.end);
    if (slot) {
      slot.count += (ticket.seats?.length || 1);
      slot.revenue += (ticket.totalAmount || ((ticket.tripId?.price || 0) * (ticket.seats?.length || 1)));
    }
  });

  const maxSlotCount = Math.max(...hourlySlots.map(s => s.count), 4);

  // 4. Xử lý dữ liệu biểu đồ tròn phương thức thanh toán
  const totalPayment = cashRevenue + cashlessRevenue;
  const cashPct = totalPayment > 0 ? Math.round((cashRevenue / totalPayment) * 100) : 0;
  const cashlessPct = totalPayment > 0 ? (100 - cashPct) : 0;

  // Tính toán hình khuyên SVG (Donut Chart)
  const donutSize = 140;
  const donutStroke = 18;
  const donutRadius = (donutSize - donutStroke) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const cashStrokeDash = totalPayment > 0 ? (cashRevenue / totalPayment) * donutCircumference : 0;
  const cashlessStrokeDash = totalPayment > 0 ? (cashlessRevenue / totalPayment) * donutCircumference : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* CSS Cục Bộ Chuẩn Giao Diện Vận Hành Quầy Vé */}
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
          gap: 10px;
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

        .agent-charts-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 1.25rem;
        }

        /* Responsive Tablet (<= 1024px) */
        @media (max-width: 1024px) {
          .agent-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .agent-charts-grid {
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
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              Bảng Điều Hành Quầy Vé &amp; Ca Trực
            </h1>

            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Theo dõi tình trạng hoạt động quầy vé, doanh thu ca trực và danh sách vé trong ngày.
            </p>
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
              fontSize: '0.74rem',
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
              title="Tải lại dữ liệu ca trực mới nhất từ máy chủ"
            >
              Làm Mới
            </button>

            {/* Chỉ hiển thị nút Đặt vé tại quầy khi ca đang mở (Không đặt 2 nút mở ca trùng lặp) */}
            {activeShift && (
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
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                Đặt Vé Tại Quầy
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
                {ticketsList.length} <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>vé</span>
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
                {formatCurrency(cashRevenue)}
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
                {formatCurrency(cashlessRevenue)}
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
                  Doanh số vé
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
          {/* VÙNG 3: KHỐI BIỂU ĐỒ TRỰC QUAN CA TRỰC (THAY THẾ HÌNH SỐ 2) */}
          {/* ========================================================= */}
          <div className="agent-charts-grid">
            
            {/* Biểu đồ 1: Xu hướng bán vé theo khung giờ */}
            <div className="agent-panel-box" style={{ gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Xu Hướng Xuất Vé Theo Khung Giờ
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Phân bố số vé bán ra trong các khung giờ của ca trực</span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                  Tổng: {ticketsList.length} vé
                </span>
              </div>

              {/* Histogram Columns */}
              <div style={{ width: '100%', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                  {hourlySlots.map((slot, idx) => {
                    const heightPct = Math.round((slot.count / maxSlotCount) * 100);
                    const hasData = slot.count > 0;
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', color: hasData ? '#2563eb' : 'transparent', marginBottom: '4px' }}>
                          {hasData ? `${slot.count} vé` : ''}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '38px',
                            height: hasData ? `${Math.max(heightPct, 12)}%` : '6px',
                            background: hasData
                              ? 'linear-gradient(to top, #2563eb 0%, #38bdf8 100%)'
                              : '#f1f5f9',
                            borderRadius: '6px 6px 0 0',
                            transition: 'height 0.4s ease'
                          }}
                          title={`${slot.label}: ${slot.count} vé (${formatCurrency(slot.revenue)})`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {hourlySlots.map((slot, idx) => (
                    <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '0.68rem', fontWeight: '700', color: '#64748b' }}>
                      {slot.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Biểu đồ 2: Cơ cấu phương thức thanh toán */}
            <div className="agent-panel-box" style={{ gap: '0.85rem' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Cơ Cấu Phương Thức Thanh Toán
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Tỷ lệ doanh thu tiền mặt và chuyển khoản VietQR / POS</span>
              </div>

              {/* Donut Chart & Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', justifyContent: 'center', padding: '0.5rem 0' }}>
                <div style={{ position: 'relative', width: `${donutSize}px`, height: `${donutSize}px`, flexShrink: 0 }}>
                  <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx={donutSize / 2}
                      cy={donutSize / 2}
                      r={donutRadius}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth={donutStroke}
                    />
                    {totalPayment > 0 ? (
                      <>
                        <circle
                          cx={donutSize / 2}
                          cy={donutSize / 2}
                          r={donutRadius}
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth={donutStroke}
                          strokeDasharray={`${cashStrokeDash} ${donutCircumference}`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                        <circle
                          cx={donutSize / 2}
                          cy={donutSize / 2}
                          r={donutRadius}
                          fill="transparent"
                          stroke="#6366f1"
                          strokeWidth={donutStroke}
                          strokeDasharray={`${cashlessStrokeDash} ${donutCircumference}`}
                          strokeDashoffset={-cashStrokeDash}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                      </>
                    ) : (
                      <circle
                        cx={donutSize / 2}
                        cy={donutSize / 2}
                        r={donutRadius}
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth={donutStroke}
                        strokeDasharray={`${donutCircumference} 0`}
                      />
                    )}
                  </svg>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>
                      Tổng Doanh Thu
                    </span>
                    <span style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: '900', marginTop: '1px' }}>
                      {formatCurrency(totalPayment)}
                    </span>
                  </div>
                </div>

                {/* Legend Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div style={{
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '0.74rem', color: '#334155', fontWeight: '700' }}>Tiền mặt</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#10b981' }}>{cashPct}%</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                      {formatCurrency(cashRevenue)}
                    </div>
                  </div>

                  <div style={{
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                        <span style={{ fontSize: '0.74rem', color: '#334155', fontWeight: '700' }}>VietQR / POS</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#4338ca' }}>{cashlessPct}%</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                      {formatCurrency(cashlessRevenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Đối soát tiền mặt thực tế tại ngăn kéo quầy */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '0.25rem'
              }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.76rem', color: '#64748b' }}>
                  <span>Quỹ tiền lẻ đầu ca: <strong style={{ color: '#0f172a' }}>{formatCurrency(initialCash)}</strong></span>
                  <span>Tiền mặt thu thêm: <strong style={{ color: '#10b981' }}>+{formatCurrency(cashRevenue)}</strong></span>
                  {refundCash > 0 && <span>Hoàn vé: <strong style={{ color: '#ef4444' }}>-{formatCurrency(refundCash)}</strong></span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                  <span style={{ color: '#0f172a', fontWeight: '800' }}>Tiền mặt trong két:</span>
                  <strong style={{ color: '#2563eb', fontSize: '1.02rem', fontWeight: '900' }}>
                    {formatCurrency(cashInDrawer)}
                  </strong>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================= */}
          {/* VÙNG 4: DANH SÁCH VÉ ĐÃ XUẤT TRONG CA TRỰC                */}
          {/* ========================================================= */}
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
                    padding: '6px 12px',
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
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    color: '#2563eb',
                    cursor: 'pointer'
                  }}
                >
                  Xem tất cả vé
                </button>
              </div>
            </div>

            {/* Danh sách vé xuất */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '4px' }}>
                    {searchQuery ? 'Không tìm thấy vé nào phù hợp' : 'Chưa có vé nào được xuất trong ca trực này'}
                  </div>
                  <div style={{ fontSize: '0.75rem' }}>
                    {searchQuery ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm.' : 'Nhấn nút "Đặt Vé Tại Quầy" để tạo vé mới cho hành khách.'}
                  </div>
                </div>
              ) : (
                [...filteredTickets].reverse().map((ticket) => {
                  const price = ticket.totalAmount || ((ticket.tripId?.price || 0) * (ticket.seats?.length || 1));
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
                            Ghế: {(ticket.seats || []).join(', ')}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#0f172a' }}>{ticket.customerName}</strong>
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <span>SĐT: {ticket.customerPhone}</span>
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <span style={{ color: '#2563eb', fontWeight: '700' }}>
                            {ticket.tripId?.routeId ? `${ticket.tripId.routeId.startPoint} ➔ ${ticket.tripId.routeId.endPoint}` : 'Tuyến vận tải'}
                          </span>
                        </div>
                      </div>

                      {/* Cột phải: Giá tiền & Thời gian */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: '900', color: isCancelled ? '#94a3b8' : '#0f172a', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                          {formatCurrency(price)}
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
        </>
      ) : (
        /* ========================================================= */
        /* MÀN HÌNH CHỜ MỞ CA TRỰC (ĐƯỢC THIẾT KẾ LẠI CHUYÊN NGHIỆP)   */
        /* ========================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '900px', margin: '1rem auto' }}>
          
          <div className="agent-panel-box" style={{
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
            border: '1px solid #cbd5e1'
          }}>
            
            {/* Huy hiệu trạm quầy vé */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: '0.76rem',
              fontWeight: '800',
              margin: '0 auto 1.25rem auto'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
              TRẠM ĐIỀU HÀNH BÁN VÉ • SẴN SÀNG TIẾP NHẬN CA
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.3px' }}>
              Khởi Tạo Ca Trực Để Bắt Đầu Bán Vé
            </h2>

            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.6', margin: '0 auto 2rem auto', maxWidth: '640px' }}>
              Hệ thống bán vé thông minh An Bình Lines tự động ghi nhận doanh thu, phân bổ chỉ tiêu vé và quản lý ngăn kéo tiền mặt độc lập theo từng ca trực của nhân viên.
            </p>

            {/* 3 Thẻ Trạng Thái Tiền Trạm (Terminal Readiness) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              textAlign: 'left',
              marginBottom: '2rem'
            }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                  Nhân Viên Trực Quầy
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                  {user?.name || user?.fullName || user?.email}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700', marginTop: '2px' }}>
                  ✓ Đã đăng nhập hệ thống
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                  Văn Phòng Chỉ Định
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                  {user?.assignedOffice || user?.branch?.assignedOffices?.[0] || user?.branch?.branchName || 'Văn phòng Bến xe Miền Đông'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '700', marginTop: '2px' }}>
                  Hệ thống POS Bán vé trực tuyến
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                  Định Danh &amp; Mở Két
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>
                  Face ID &amp; Quỹ Đầu Ca
                </div>
                <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: '700', marginTop: '2px' }}>
                  Xác nhận khi chấm công
                </div>
              </div>
            </div>

            {/* Nút hành động duy nhất, nổi bật */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveTab('agent-attendance')}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.9rem 2.25rem',
                  borderRadius: '10px',
                  fontSize: '0.92rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                Chấm Công Face ID &amp; Mở Ca Ngay ➔
              </button>

              <button
                type="button"
                onClick={fetchShiftData}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '0.9rem 1.5rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Kiểm Tra Lại Trạng Thái
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default AgentDashboardPage;
