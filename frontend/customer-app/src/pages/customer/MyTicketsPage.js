import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import {
  Ticket, Calendar, Clock, CreditCard, XCircle,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Timer, Info, Eye,
  Bus, ShieldCheck, Sparkles, MapPin, Receipt, ArrowRight, CheckCircle
} from 'lucide-react';
import './MyTicketsPage.css';

const BOOKING_API = 'http://localhost:8000/api/trips';
const TRIP_API = 'http://localhost:8000/api/trips';
const CANCEL_HOURS_LIMIT = 120; // Must cancel at least 5 days (120h) before departure

const MyTicketsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [tripDetails, setTripDetails] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [payingTicketId, setPayingTicketId] = useState(null);
  const fetchedTrips = useRef(new Set());

  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Tự động cuộn lên đầu khi chuyển tab, bộ lọc hoặc trang
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [activeTab, statusFilter, currentPage]);

  // 1-second clock for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch a single trip detail (guard against re-fetch)
  const fetchTripDetail = async (tripId) => {
    if (!tripId || fetchedTrips.current.has(tripId)) return;
    fetchedTrips.current.add(tripId);
    try {
      const res = await axios.get(`${TRIP_API}/${tripId}`);
      if (res.data.success && res.data.trip) {
        setTripDetails(prev => ({ ...prev, [tripId]: res.data.trip }));
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết chuyến:', err.message);
    }
  };

  // Fetch all bookings from backend
  const fetchMyBookings = async () => {
    if (!isAuthenticated || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const userId = user.id || user._id;
      const res = await axios.get(`${BOOKING_API}/my-bookings/${userId}`);
      if (res.data.success) {
        const bookings = res.data.bookings || [];
        setTickets(bookings);
        [...new Set(bookings.map(b => b.tripId))].forEach(fetchTripDetail);
      }
    } catch (err) {
      console.error('Lỗi lấy vé:', err.message);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyBookings(); }, []); // run once on mount

  // Auto-cancel expired/overdue tickets and release seats
  useEffect(() => {
    tickets.forEach(async (t) => {
      if (t.status !== 'pending') return;

      const trip = tripDetails[t.tripId];
      const hoursUntilDep = trip ? (new Date(trip.departureTime) - now) / 3600000 : null;

      // Condition 1: Pay-later payment deadline expired
      const paymentExpired = t.paymentType === 'later' && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;

      // Condition 2: Past cancellation deadline (< 24h) AND still unpaid → auto-cancel to free seat
      const pastCancelDeadlineUnpaid = hoursUntilDep !== null && hoursUntilDep < CANCEL_HOURS_LIMIT;

      if (paymentExpired || pastCancelDeadlineUnpaid) {
        try {
          await axios.patch(`${BOOKING_API}/book/${t._id}/cancel`);
          setTickets(prev => prev.map(x => x._id === t._id ? { ...x, status: 'cancelled' } : x));
        } catch (e) { /* silent - booking may already be cancelled */ }
      }
    });
  }, [now, tripDetails]); // re-check when time or trip info changes

  // Cancel a ticket (with 5-day / 120h policy, refunded as points)
  const handleCancelTicket = async (ticket) => {
    const trip = tripDetails[ticket.tripId];
    if (trip) {
      const hoursUntilDeparture = (new Date(trip.departureTime) - now) / (1000 * 60 * 60);
      if (hoursUntilDeparture < CANCEL_HOURS_LIMIT) {
        alert(`Không thể hủy vé! Quy định nhà xe chỉ cho phép hủy vé trước giờ khởi hành ít nhất 5 ngày (120 giờ).\nChuyến xe khởi hành lúc: ${formatDateTime(trip.departureTime)}`);
        return;
      }
    }
    if (!window.confirm('Bạn có chắc muốn hủy vé này?\nTheo chính sách của nhà xe, hủy trước 5 ngày được hoàn 100% giá trị vé thành Điểm Tích Lũy vào tài khoản hội viên của bạn (1 VNĐ = 1 Điểm) để sử dụng cho lần đặt vé kế tiếp.')) return;
    try {
      const id = ticket._id;
      await axios.patch(`${BOOKING_API}/book/${id}/cancel`);
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status: 'cancelled' } : t));
      alert('Vé đã được hủy thành công! Toàn bộ số tiền vé đã được quy đổi thành Điểm Tích Lũy và cộng trực tiếp vào ví hội viên của bạn.');
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi hủy vé. Vui lòng thử lại.');
    }
  };

  // Pay Now - show inline QR modal
  const handlePayNow = (ticket) => {
    setPayingTicketId(prev => prev === ticket._id ? null : ticket._id);
  };

  // Simulate webhook payment success
  const handleSimulatePayment = async (ticket) => {
    const trip = tripDetails[ticket.tripId];
    const amount = (trip?.price || 0) * (ticket.seats?.length || 1);
    try {
      const res = await axios.post(`${BOOKING_API}/payment/webhook`, {
        code: '00',
        data: {
          orderCode: ticket.orderCode,
          amount,
          description: `Thanh toan ve xe cho ma dat cho ${ticket._id}`
        }
      });
      if (res.data.success) {
        setTickets(prev => prev.map(t => t._id === ticket._id ? { ...t, status: 'paid' } : t));
        setPayingTicketId(null);
        alert('Thanh toán thành công! Vé đã được xác nhận.');
      } else {
        alert('Giả lập thanh toán thất bại.');
      }
    } catch (err) {
      alert('Có lỗi xảy ra khi gửi webhook thanh toán.');
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = d => d ? new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const formatTime = d => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  const formatDateTime = d => d ? `${formatTime(d)} ngày ${new Date(d).toLocaleDateString('vi-VN')}` : '';
  const formatCurrency = v => `${(v || 0).toLocaleString('vi-VN')}đ`;

  const getCountdown = (expiresAt) => {
    const diff = new Date(expiresAt) - now;
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d} ngày ${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    return `${m} phút ${s} giây`;
  };

  // Filter logic
  const getFilteredTickets = () => {
    let list = [...tickets];

    // Filter by Active Tab
    if (activeTab === 'upcoming') {
      list = list.filter(t => {
        const trip = tripDetails[t.tripId];
        const isExpired = t.status === 'pending' && t.paymentType === 'later' && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;
        return t.status !== 'cancelled' && !isExpired && trip && new Date(trip.departureTime) >= now;
      });
    } else if (activeTab === 'completed') {
      list = list.filter(t => {
        const trip = tripDetails[t.tripId];
        return t.status !== 'cancelled' && trip && new Date(trip.departureTime) < now;
      });
    } else if (activeTab === 'cancelled') {
      list = list.filter(t => {
        const isExpired = t.status === 'pending' && t.paymentType === 'later' && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;
        return t.status === 'cancelled' || isExpired;
      });
    }

    // Filter by Dropdown Status
    if (statusFilter === 'paid') {
      list = list.filter(t => t.status === 'paid');
    } else if (statusFilter === 'pending') {
      list = list.filter(t => t.status === 'pending' && !(t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now));
    } else if (statusFilter === 'cancelled') {
      list = list.filter(t => {
        const isExpired = t.status === 'pending' && t.paymentType === 'later' && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;
        return t.status === 'cancelled' || isExpired;
      });
    }

    return list;
  };

  // Stats calculation
  const stats = {
    total: tickets.length,
    upcoming: tickets.filter(t => {
      const trip = tripDetails[t.tripId];
      const isExpired = t.status === 'pending' && t.paymentType === 'later' && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;
      return t.status !== 'cancelled' && !isExpired && trip && new Date(trip.departureTime) >= now;
    }).length,
    pending: tickets.filter(t => t.status === 'pending' && !(t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now)).length,
    completed: tickets.filter(t => {
      const trip = tripDetails[t.tripId];
      return t.status !== 'cancelled' && trip && new Date(trip.departureTime) < now;
    }).length,
    cancelled: tickets.filter(t => {
      const isExpired = t.status === 'pending' && t.paymentType === 'later' && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;
      return t.status === 'cancelled' || isExpired;
    }).length
  };

  // ── Render one ticket card ──────────────────────────────────────────────
  const renderTicket = (t) => {
    const trip = tripDetails[t.tripId];
    const id = t._id;
    const isExpanded = expandedId === id;
    const isPendingLater = t.status === 'pending' && t.paymentType === 'later';
    const isExpired = isPendingLater && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;
    const countdown = (isPendingLater && !isExpired && t.paymentExpiresAt) ? getCountdown(t.paymentExpiresAt) : null;
    const totalPrice = (trip?.price || t.price || 0) * (t.seats?.length || 1);
    const hoursUntilDep = trip ? (new Date(trip.departureTime) - now) / 3600000 : 999;
    const canCancel = t.status !== 'cancelled' && !isExpired && hoursUntilDep >= CANCEL_HOURS_LIMIT;

    // Status Styling
    let statusClass = 'paid';
    let statusLabel = 'Đã thanh toán';
    if (t.status === 'cancelled' || isExpired) {
      statusClass = 'cancelled';
      statusLabel = isExpired ? 'Hết hạn TT' : 'Đã hủy';
    } else if (isPendingLater || t.status === 'pending') {
      statusClass = 'pending';
      statusLabel = 'Chờ thanh toán';
    }

    // Departure & Arrival info
    const depTime = trip?.departureTime ? new Date(trip.departureTime) : null;
    const arrTime = trip?.arrivalTime 
      ? new Date(trip.arrivalTime) 
      : (depTime ? new Date(depTime.getTime() + 5.5 * 3600000) : null);
    
    const depStation = trip?.pickupPoints?.[0]?.location || trip?.routeId?.startPoint || 'Bến Xe Xuất Phát';
    const arrStation = trip?.dropoffPoints?.[trip.dropoffPoints?.length - 1]?.location || trip?.routeId?.endPoint || 'Bến Xe Đến';
    const busType = trip?.busId?.type || 'Xe Limousine VIP';

    return (
      <div key={id} className="ticket-boarding-card animate-fade-in">
        {/* Card Header Strip */}
        <div className="ticket-card-header-strip">
          <div className="ticket-header-left">
            <span className={`ticket-status-pill ${statusClass}`}>
              <span className="ticket-status-dot" />
              <span>{statusLabel}</span>
            </span>
            <span className="ticket-order-code-badge">
              #{t.orderCode || id?.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="ticket-bus-type-tag">
            <Bus size={13} />
            <span>{busType}</span>
          </div>
        </div>

        {/* Card Main Body Grid: Journey on Left, Stub on Right */}
        <div className="ticket-card-main-grid">
          {/* Left: Journey Flow */}
          <div className="ticket-journey-section">
            <div className="ticket-route-title">
              <span className="ticket-route-name">
                {trip?.routeId?.startPoint || 'Đà Lạt'} → {trip?.routeId?.endPoint || 'Hồ Chí Minh'}
              </span>
            </div>

            <div className="ticket-timeline-flow">
              {/* Departure */}
              <div className="ticket-station-block">
                <div className="ticket-station-time">
                  {depTime ? formatTime(depTime) : '--:--'}
                </div>
                <span className="ticket-station-name" title={depStation}>{depStation}</span>
                <span className="ticket-station-sub">
                  <Calendar size={12} />
                  <span>{depTime ? depTime.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' }) : ''}</span>
                </span>
              </div>

              {/* Graphic in Middle */}
              <div className="ticket-center-graphic">
                <span className="ticket-direct-pill">Trực tiếp • Cao tốc</span>
                <div className="ticket-track-line-wrapper">
                  <div className="ticket-track-line" />
                  <div className="ticket-bus-icon-circle">
                    <Bus size={14} />
                  </div>
                </div>
              </div>

              {/* Arrival */}
              <div className="ticket-station-block arrival">
                <div className="ticket-station-time">
                  {arrTime ? formatTime(arrTime) : '--:--'}
                </div>
                <span className="ticket-station-name" title={arrStation}>{arrStation}</span>
                <span className="ticket-station-sub arrival">
                  <Calendar size={12} />
                  <span>{arrTime ? arrTime.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' }) : ''}</span>
                </span>
              </div>
            </div>

            {/* Countdown / Alert Pill */}
            {countdown && (
              <div className="ticket-notice-pill countdown">
                <Timer size={14} />
                <span>Còn lại <strong>{countdown}</strong> để hoàn tất thanh toán vé</span>
              </div>
            )}

            {isExpired && (
              <div className="ticket-notice-pill warning">
                <AlertTriangle size={14} />
                <span>Đã quá hạn thanh toán – vé đã tự động hủy</span>
              </div>
            )}

            {t.status !== 'cancelled' && !isExpired && trip && hoursUntilDep < CANCEL_HOURS_LIMIT && hoursUntilDep > 0 && (
              <div className="ticket-notice-pill warning">
                <Info size={14} />
                <span>Đã quá hạn hủy vé (quy định chỉ được hủy trước 5 ngày khởi hành)</span>
              </div>
            )}
          </div>

          {/* Right: Boarding Pass Stub */}
          <div className="ticket-stub-section">
            <span className="ticket-notch-top" />
            <span className="ticket-notch-bottom" />

            <div className="ticket-stub-info-box">
              <div className="ticket-stub-seats-badge">
                <span>Ghế:</span>
                <strong>{t.seats?.join(', ') || 'N/A'}</strong>
              </div>
              <div className="ticket-stub-price-label">Tổng thanh toán</div>
              <div className="ticket-stub-price-amount">
                {formatCurrency(totalPrice)}
              </div>
            </div>

            <div className="ticket-stub-actions">
              {isPendingLater && !isExpired && (
                <button
                  type="button"
                  className="ticket-btn-pay-now"
                  onClick={() => {
                    if (!isExpanded) setExpandedId(id);
                    setPayingTicketId(id);
                  }}
                >
                  <CreditCard size={14} />
                  <span>Thanh toán ngay</span>
                </button>
              )}

              <button
                type="button"
                className="ticket-btn-toggle-details"
                onClick={() => setExpandedId(isExpanded ? null : id)}
              >
                <Eye size={14} />
                <span>{isExpanded ? 'Đóng chi tiết' : 'Xem chi tiết'}</span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Details Drawer */}
        {isExpanded && (
          <div className="ticket-expanded-drawer animate-fade-in">
            {/* Left: Journey details & info */}
            <div className="ticket-details-col-left">
              <div>
                <h4 className="ticket-drawer-section-title">
                  <MapPin size={18} color="#2563eb" />
                  <span>Lịch trình đón trả khách</span>
                </h4>
                <div className="ticket-points-timeline">
                  <div className="ticket-point-node">
                    <span className="ticket-point-dot pickup" />
                    <div className="ticket-point-type">Điểm đón khách</div>
                    <div className="ticket-point-address">{t.pickup}</div>
                  </div>
                  <div className="ticket-point-node">
                    <span className="ticket-point-dot dropoff" />
                    <div className="ticket-point-type">Điểm trả khách</div>
                    <div className="ticket-point-address">{t.dropoff}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="ticket-drawer-section-title">
                  <Receipt size={18} color="#2563eb" />
                  <span>Thông tin đặt chỗ & Vé điện tử</span>
                </h4>
                <div className="ticket-meta-grid">
                  <div>
                    <div className="ticket-meta-item-label">Mã vé điện tử</div>
                    <div className="ticket-meta-item-value">#{t.orderCode || id?.slice(-6).toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="ticket-meta-item-label">Loại xe</div>
                    <div className="ticket-meta-item-value">{busType}</div>
                  </div>
                  <div>
                    <div className="ticket-meta-item-label">Thời gian đặt vé</div>
                    <div className="ticket-meta-item-value">{formatDate(t.createdAt)} {formatTime(t.createdAt)}</div>
                  </div>
                  <div>
                    <div className="ticket-meta-item-label">Hành khách / SĐT</div>
                    <div className="ticket-meta-item-value">{t.customerName || user?.name || 'Hành khách'} ({t.phone || user?.phone || 'Chưa cập nhật'})</div>
                  </div>
                </div>
              </div>

              {canCancel && (
                <div>
                  <button
                    type="button"
                    onClick={() => handleCancelTicket(t)}
                    className="ticket-drawer-cancel-btn"
                  >
                    <XCircle size={15} />
                    <span>{t.status === 'paid' ? 'Yêu cầu hủy vé & tích điểm' : 'Hủy đặt chỗ này'}</span>
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                    * Còn hơn {Math.floor(hoursUntilDep / 24)} ngày {Math.floor(hoursUntilDep % 24)}h đến giờ xuất bến. Hủy trước 5 ngày được hoàn 100% thành điểm tích lũy.
                  </p>
                </div>
              )}
            </div>

            {/* Right: E-Ticket QR Code or VietQR PayOS panel */}
            <div className="ticket-details-col-right">
              {t.status === 'cancelled' || isExpired ? (
                <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#ef4444' }}>
                  <XCircle size={52} style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                  <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>VÉ ĐÃ BỊ HỦY</div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>Vé này không còn giá trị sử dụng</p>
                  
                  {t.refundAmount !== undefined && t.refundAmount > 0 && (
                    <div style={{ marginTop: '12px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'left', fontSize: '0.78rem' }}>
                      <div style={{ color: '#166534', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>Thông Tin Hoàn Tiền</div>
                      <div style={{ color: '#15803d', fontWeight: '800', fontSize: '0.92rem', marginBottom: '4px' }}>
                        Đã hoàn: {formatCurrency(t.refundAmount)}
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.74rem' }}>
                        Hình thức: <strong>{t.refundMethod === 'payos_payout' ? 'Bắn về STK (payOS Payout)' : 'Tiền mặt'}</strong>
                      </div>
                      {t.bankInfo?.accountNumber && (
                        <div style={{ color: '#475569', fontSize: '0.74rem', marginTop: '2px' }}>
                          STK nhận: <strong>{t.bankInfo.bankCode} - {t.bankInfo.accountNumber}</strong> ({t.bankInfo.accountHolder})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="ticket-qr-container">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`AnBinhLines-${t.orderCode || id}`)}`}
                      alt="E-Ticket QR Code"
                      style={{ display: 'block', width: '140px', height: '140px', borderRadius: '4px' }}
                    />
                  </div>
                  <div className="ticket-qr-caption">MÃ VÉ ĐIỆN TỬ (QR)</div>
                  <div className="ticket-qr-subtext">Xuất trình mã này cho nhân viên soát vé khi lên xe</div>

                  {/* If Pending Later, show PayOS Payment Panel */}
                  {isPendingLater && (
                    <div className="ticket-payos-panel">
                      <div className="ticket-payos-title">QUÉT MÃ THANH TOÁN VIETQR (PAYOS)</div>
                      <img
                        src={`https://img.vietqr.io/image/MB-0919210046-compact2.png?amount=${totalPrice}&addInfo=SmartBus%20${t.orderCode}&accountName=HO%20VAN%20LOC`}
                        alt="VietQR"
                        style={{ width: '100%', maxWidth: '180px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', margin: '0 auto 10px auto', display: 'block' }}
                      />
                      <div style={{ fontSize: '0.8rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
                        <div>Ngân hàng: <strong>MBBank</strong></div>
                        <div>STK: <strong>0919210046</strong></div>
                        <div>Chủ TK: <strong>HO VAN LOC</strong></div>
                        <div>Số tiền: <strong style={{ color: '#ea580c' }}>{formatCurrency(totalPrice)}</strong></div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '8px', fontSize: '0.82rem', fontWeight: '700' }}
                        onClick={() => handleSimulatePayment(t)}
                      >
                        Giả lập chuyển khoản thành công
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div className="tickets-page-container">
        <div className="tickets-hero-banner">
          <div className="tickets-hero-badge">
            <Sparkles size={14} />
            <span>AN BÌNH LINES • HỆ THỐNG VÉ ĐIỆN TỬ</span>
          </div>
          <h1 className="tickets-hero-title">Quản Lý Vé & Lịch Sử Hành Trình</h1>
          <p className="tickets-hero-subtitle">
            Vui lòng đăng nhập để tra cứu vé, kiểm tra lịch trình và theo dõi thanh toán.
          </p>
        </div>

        <div className="tickets-main-wrapper" style={{ marginTop: '-2rem' }}>
          <div className="tickets-empty-card">
            <div className="tickets-empty-icon-box">
              <Ticket size={40} />
            </div>
            <h3 className="tickets-empty-title">Đăng nhập tài khoản</h3>
            <p className="tickets-empty-desc">
              Bạn cần đăng nhập tài khoản để xem danh sách vé đã đặt và thông tin lịch trình.
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: '12px 32px', borderRadius: '12px', fontWeight: '700' }}
              onClick={() => navigate('/login')}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filtered = getFilteredTickets();
  const indexOfLastTicket = currentPage * 5;
  const indexOfFirstTicket = indexOfLastTicket - 5;
  const currentTickets = filtered.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filtered.length / 5) || 1;

  return (
    <div className="tickets-page-container">
      {/* 1. Hero Header Banner */}
      <div className="tickets-hero-banner">
        <div className="tickets-hero-badge">
          <Sparkles size={14} />
          <span>AN BÌNH LINES • HỆ THỐNG VÉ ĐIỆN TỬ</span>
        </div>
        <h1 className="tickets-hero-title">Quản Lý Vé & Lịch Sử Hành Trình</h1>
        <p className="tickets-hero-subtitle">
          Theo dõi hành trình, tra cứu mã vé điện tử QR và quản lý thanh toán an toàn, tiện lợi.
        </p>
      </div>

      <div className="tickets-main-wrapper">
        {/* 2. Stats Overview Cards */}
        <div className="tickets-stats-grid">
          <div className="tickets-stat-card">
            <div className="tickets-stat-icon-wrapper blue">
              <Ticket size={24} />
            </div>
            <div>
              <div className="tickets-stat-number">{stats.total}</div>
              <div className="tickets-stat-label">Tổng vé đã đặt</div>
            </div>
          </div>

          <div className="tickets-stat-card">
            <div className="tickets-stat-icon-wrapper emerald">
              <Calendar size={24} />
            </div>
            <div>
              <div className="tickets-stat-number">{stats.upcoming}</div>
              <div className="tickets-stat-label">Vé sắp khởi hành</div>
            </div>
          </div>

          <div className="tickets-stat-card">
            <div className="tickets-stat-icon-wrapper amber">
              <Timer size={24} />
            </div>
            <div>
              <div className="tickets-stat-number">{stats.pending}</div>
              <div className="tickets-stat-label">Chờ thanh toán</div>
            </div>
          </div>

          <div className="tickets-stat-card">
            <div className="tickets-stat-icon-wrapper purple">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="tickets-stat-number">{stats.completed}</div>
              <div className="tickets-stat-label">Hành trình đã đi</div>
            </div>
          </div>
        </div>

        {/* 3. Toolbar & Filters */}
        <div className="tickets-toolbar-card">
          <div className="tickets-tabs-nav">
            {[
              { id: 'all', label: 'Tất cả vé', count: stats.total },
              { id: 'upcoming', label: 'Vé sắp tới', count: stats.upcoming },
              { id: 'completed', label: 'Đã hoàn thành', count: stats.completed },
              { id: 'cancelled', label: 'Đã hủy', count: stats.cancelled }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`tickets-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                >
                  <span>{tab.label}</span>
                  <span className="tickets-tab-badge">{tab.count}</span>
                </button>
              );
            })}
          </div>

          <div className="tickets-toolbar-actions">
            <div className="tickets-status-select-wrap">
              <select
                className="tickets-status-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="paid">Đã thanh toán</option>
                <option value="pending">Chờ thanh toán</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              <ChevronDown size={14} className="tickets-status-icon" />
            </div>

            <button
              type="button"
              className="tickets-btn-new"
              onClick={() => navigate('/')}
            >
              <span>+ Đặt vé mới</span>
            </button>
          </div>
        </div>

        {/* 4. Ticket Content List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e3a8a' }}>Đang tải danh sách vé...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="tickets-empty-card">
            <div className="tickets-empty-icon-box">
              <Ticket size={40} />
            </div>
            <h3 className="tickets-empty-title">Không tìm thấy vé xe nào</h3>
            <p className="tickets-empty-desc">
              Bạn chưa có vé xe nào trong mục này hoặc chưa có lịch trình đặt chỗ phù hợp.
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: '700' }}
              onClick={() => navigate('/')}
            >
              Tìm chuyến xe ngay
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {currentTickets.map(renderTicket)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '2.5rem' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  style={{
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                    fontSize: '0.9rem',
                    fontWeight: '700'
                  }}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        border: isCurrent ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: isCurrent ? '#2563eb' : '#ffffff',
                        color: isCurrent ? '#ffffff' : '#334155',
                        borderRadius: '8px',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '700'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                    fontSize: '0.9rem',
                    fontWeight: '700'
                  }}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTicketsPage;
