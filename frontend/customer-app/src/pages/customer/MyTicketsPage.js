import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import {
  Ticket, Calendar, Clock, CreditCard, XCircle,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Timer, Info, Eye
} from 'lucide-react';

const BOOKING_API = 'http://localhost:8000/api/v1/trips';
const TRIP_API = 'http://localhost:8000/api/v1/trips';
const CANCEL_HOURS_LIMIT = 24; // Must cancel at least 24h before departure

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

  // Cancel a ticket (with 24h policy)
  const handleCancelTicket = async (ticket) => {
    const trip = tripDetails[ticket.tripId];
    if (trip) {
      const hoursUntilDeparture = (new Date(trip.departureTime) - now) / (1000 * 60 * 60);
      if (hoursUntilDeparture < CANCEL_HOURS_LIMIT) {
        alert(`Không thể hủy vé! Chỉ được hủy trước giờ khởi hành ít nhất ${CANCEL_HOURS_LIMIT} giờ.\nChuyến xe khởi hành lúc: ${formatDateTime(trip.departureTime)}`);
        return;
      }
    }
    if (!window.confirm('Bạn có chắc muốn hủy vé này?\nTheo chính sách, hủy trước 24 giờ được hoàn 100% tiền vé.')) return;
    try {
      const id = ticket._id;
      await axios.patch(`${BOOKING_API}/book/${id}/cancel`);
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status: 'cancelled' } : t));
      alert('Vé đã được hủy. Tiền sẽ được hoàn trong vòng 3-5 ngày làm việc.');
    } catch (err) {
      alert('Có lỗi xảy ra khi hủy vé. Vui lòng thử lại.');
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
  const formatTime = d => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
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

  const getStatusStyle = (t) => {
    if (t.status === 'cancelled') return { border: '#ef4444', bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Đã hủy' };
    if (t.status === 'paid') return { border: '#10b981', bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Đã thanh toán' };
    if (t.paymentType === 'later' && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now)
      return { border: '#ef4444', bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Hết hạn TT' };
    if (t.paymentType === 'later') return { border: '#f59e0b', bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'Chờ thanh toán' };
    return { border: 'var(--primary)', bg: 'rgba(59,130,246,0.1)', color: 'var(--primary)', label: 'Đang chờ đi' };
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

  // ── Render one ticket card ──────────────────────────────────────────────
  const renderTicket = (t) => {
    const trip = tripDetails[t.tripId];
    const id = t._id;
    const isExpanded = expandedId === id;
    const ss = getStatusStyle(t);
    const isPendingLater = t.status === 'pending' && t.paymentType === 'later';
    const isExpired = isPendingLater && t.paymentExpiresAt && new Date(t.paymentExpiresAt) < now;
    const countdown = (isPendingLater && !isExpired && t.paymentExpiresAt) ? getCountdown(t.paymentExpiresAt) : null;
    const totalPrice = (trip?.price || t.price || 0) * (t.seats?.length || 1);
    const hoursUntilDep = trip ? (new Date(trip.departureTime) - now) / 3600000 : 999;
    const canCancel = t.status !== 'cancelled' && !isExpired && hoursUntilDep >= CANCEL_HOURS_LIMIT;

    return (
      <div 
        key={id} 
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: `5px solid ${ss.border}`,
          borderRadius: '12px',
          marginBottom: '1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}
      >
        {/* Main Card Header */}
        <div style={{ padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            
            {/* Left side: status badge, order ID, route, date and time */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: ss.bg,
                  color: ss.color
                }}>
                  {ss.label}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
                  #{t.orderCode || id?.slice(-6)}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: '0 0 10px 0' }}>
                {trip?.routeId?.startPoint || '...'} → {trip?.routeId?.endPoint || '...'}
              </h3>

              {trip?.departureTime && (
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} style={{ color: '#94a3b8' }} />
                    {new Date(trip.departureTime).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} style={{ color: '#94a3b8' }} />
                    {formatTime(trip.departureTime)}
                  </span>
                </div>
              )}

              {/* Countdown */}
              {countdown && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '8px 12px', maxWidth: '380px' }}>
                  <Timer size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>Hạn TT: {formatDateTime(t.paymentExpiresAt)}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', fontFamily: 'monospace', fontWeight: '700' }}>Còn lại: {countdown}</span>
                  </div>
                </div>
              )}

              {isExpired && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '8px 12px', maxWidth: '380px' }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600' }}>Đã hết hạn thanh toán – vé bị hủy tự động</span>
                </div>
              )}

              {/* Cancel time warning */}
              {t.status !== 'cancelled' && !isExpired && trip && hoursUntilDep < CANCEL_HOURS_LIMIT && hoursUntilDep > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px', maxWidth: '420px' }}>
                  <Info size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600' }}>
                    Đã quá thời hạn hủy vé (cần hủy trước {CANCEL_HOURS_LIMIT}h khởi hành)
                  </span>
                </div>
              )}
            </div>

            {/* Middle side: Seats & Price */}
            <div style={{ minWidth: '180px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                Ghế: <strong style={{ color: '#1e293b' }}>{t.seats?.join(', ')}</strong>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '6px' }}>
                {formatCurrency(totalPrice)}
              </div>
            </div>

            {/* Right side: Action Button & Dropdown arrow */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : id)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                <Eye size={16} style={{ color: '#64748b' }} />
                Xem chi tiết
              </button>
              <button
                onClick={() => setExpandedId(isExpanded ? null : id)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  outline: 'none'
                }}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div style={{ borderTop: '1px dashed var(--border-color)', backgroundColor: '#f8fafc', padding: '2rem' }} className="ticket-detail-layout animate-fade-in">
            <div>
              <h4 style={{ fontWeight: '700', marginBottom: '1rem' }}>Thông tin chi tiết chuyến đi</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                {trip && <div><span style={{ color: 'var(--text-secondary)' }}>Nhà xe & Dịch vụ:</span><strong style={{ marginLeft: '6px' }}>{trip.busId?.name} ({trip.busId?.type})</strong></div>}
                <div><span style={{ color: 'var(--text-secondary)' }}>Điểm đón khách:</span><strong style={{ marginLeft: '6px' }}>{t.pickup}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Điểm trả khách:</span><strong style={{ marginLeft: '6px' }}>{t.dropoff}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Thời gian đặt vé:</span><span style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>{formatDate(t.createdAt)} lúc {formatTime(t.createdAt)}</span></div>

                {/* Payment status block */}
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: t.status === 'paid' ? 'rgba(16,185,129,0.07)' : isExpired ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)', border: `1px solid ${t.status === 'paid' ? 'rgba(16,185,129,0.25)' : isExpired ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Trạng thái thanh toán:</span>
                  {t.status === 'paid' ? (
                    <>
                      <strong style={{ color: '#10b981' }}>Đã thanh toán</strong>
                      {t.updatedAt && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Thời gian thanh toán: {formatDate(t.updatedAt)} lúc {formatTime(t.updatedAt)}</span>}
                    </>
                  ) : isExpired ? (
                    <strong style={{ color: '#ef4444' }}>Hết hạn – chưa thanh toán</strong>
                  ) : (
                    <>
                      <strong style={{ color: '#d97706' }}>Chưa thanh toán</strong>
                      {t.paymentExpiresAt && <span style={{ display: 'block', fontSize: '0.8rem', color: '#b45309', marginTop: '2px' }}>Hạn chót: {formatDate(t.paymentExpiresAt)} lúc {formatTime(t.paymentExpiresAt)}</span>}
                    </>
                  )}
                </div>

                {/* Cancellation policy note */}
                {t.status !== 'cancelled' && !isExpired && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px', padding: '8px 12px' }}>
                    <Info size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>Chính sách hủy vé: Hủy trước <strong>{CANCEL_HOURS_LIMIT} giờ</strong> khởi hành được hoàn 100% tiền vé. Hủy sau thời hạn không được hoàn tiền.</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isPendingLater && !isExpired && (
                  <div>
                    <button onClick={() => handlePayNow(t)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: '700', background: 'linear-gradient(135deg, #f59e0b, #ef6c00)', border: 'none', boxShadow: '0 4px 14px rgba(245,158,11,0.4)' }}>
                      <CreditCard size={18} /> {payingTicketId === id ? 'Ẩn QR thanh toán' : 'Thanh toán ngay'}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>* Vé sẽ bị hủy tự động nếu hết hạn chưa thanh toán.</p>

                    {/* Inline QR Payment Panel */}
                    {payingTicketId === id && (() => {
                      const trip = tripDetails[t.tripId];
                      const amount = (trip?.price || 0) * (t.seats?.length || 1);
                      return (
                        <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center', maxWidth: '380px' }}>
                          <p style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '12px', fontSize: '0.9rem' }}>QUÉT MÃ THANH TOÁN VIETQR (PAYOS)</p>
                          <img
                            src={`https://img.vietqr.io/image/MB-0919210046-compact2.png?amount=${amount}&addInfo=SmartBus%20${t.orderCode}&accountName=HO%20VAN%20LOC`}
                            alt="VietQR" style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem' }}
                          />
                          <div style={{ textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '280px', margin: '0 auto 1rem auto' }}>
                            <div>Ngân hàng: <strong>MBBank (Ngân hàng Quân Đội)</strong></div>
                            <div>Số tài khoản: <strong>0919210046</strong></div>
                            <div>Chủ tài khoản: <strong>HO VAN LOC</strong></div>
                            <div>Số tiền: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(amount)}</strong></div>
                            <div>Nội dung CK: <strong style={{ color: 'var(--primary)' }}>SmartBus {t.orderCode}</strong></div>
                          </div>
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '10px', fontWeight: '700' }}
                            onClick={() => handleSimulatePayment(t)}
                          >
                            Giả lập chuyển khoản thành công (Webhook)
                          </button>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                            Hệ thống tự động kích hoạt PayOS Webhook cập nhật trạng thái sau khi chuyển khoản thành công.
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {canCancel && (
                  <div>
                    <button onClick={() => handleCancelTicket(t)} className="btn btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
                      <XCircle size={16} />
                      {t.status === 'paid' ? 'Yêu cầu hủy & hoàn tiền' : 'Yêu cầu hủy vé'}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      * Còn {Math.floor(hoursUntilDep)} giờ đến giờ khởi hành. {hoursUntilDep >= CANCEL_HOURS_LIMIT ? 'Đủ điều kiện hoàn tiền 100%.' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="ticket-qr-section">
              {t.status === 'cancelled' || isExpired ? (
                <div style={{ textAlign: 'center', color: '#ef4444' }}>
                  <XCircle size={64} style={{ opacity: 0.8 }} />
                  <p style={{ fontSize: '0.8rem', fontWeight: '700', marginTop: '10px' }}>VÉ ĐÃ BỊ HỦY</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: 'var(--card-shadow)', opacity: isPendingLater ? 0.5 : 1, filter: isPendingLater ? 'grayscale(60%)' : 'none' }}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`AnBinhLines-${t.orderCode || id}`)}`} alt="QR Code" style={{ display: 'block', width: '130px', height: '130px' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', marginTop: '10px', textAlign: 'center' }}>
                    {isPendingLater ? 'QR KHẢ DỤNG SAU THANH TOÁN' : 'MÃ BẢN VÉ (QR)'}
                  </span>
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
      <div className="section-container animate-fade-in" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '4rem' }}>
        <Ticket size={56} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h3>Đăng nhập để xem vé của bạn</h3>
        <button className="btn btn-primary" style={{ padding: '12px 32px', marginTop: '1.5rem' }} onClick={() => navigate('/login')}>Đăng nhập ngay</button>
      </div>
    );
  }

  const filtered = getFilteredTickets();
  const indexOfLastTicket = currentPage * 5;
  const indexOfFirstTicket = indexOfLastTicket - 5;
  const currentTickets = filtered.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filtered.length / 5) || 1;

  const tabLabels = {
    all: 'Vé hoạt động & lịch sử',
    upcoming: 'Vé sắp tới',
    completed: 'Vé đã đi',
    cancelled: 'Vé đã hủy'
  };

  return (
    <div className="section-container animate-fade-in" style={{ maxWidth: '1200px', width: '95%', paddingBottom: '5rem' }}>
      
      {/* Visual Header - Just clean text without banner background */}
      <div style={{ marginBottom: '2.5rem', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Ticket size={28} /> Quản Lý Vé & Lịch Sử Hành Trình
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem', fontWeight: '500' }}>
          Xem chi tiết, thanh toán và quản lý vé xe của bạn.
        </p>
      </div>

      {/* Tabs & Filters block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.75rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Left Side Tabs */}
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { id: 'all', label: 'Tất cả vé' },
            { id: 'upcoming', label: 'Vé sắp tới' },
            { id: 'completed', label: 'Đã hoàn thành' },
            { id: 'cancelled', label: 'Đã hủy' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                {tab.label}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-13px',
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: 'var(--primary)',
                    borderRadius: '2px'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Dropdown status */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{
                appearance: 'none',
                padding: '8px 36px 8px 16px',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: 'var(--text-main)',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '160px'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="paid">Đã thanh toán</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Book new ticket button */}
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: '700',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.15)'
            }}
          >
            + Đặt vé mới
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Đang tải danh sách vé...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Ticket size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>
            Không tìm thấy vé nào phù hợp
          </h3>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '1.5rem', padding: '10px 24px', borderRadius: '8px' }} 
            onClick={() => navigate('/')}
          >
            Tìm chuyến xe ngay
          </button>
        </div>
      ) : (
        <div>
          {/* Section Count Title */}
          <h3 style={{ fontWeight: '700', fontSize: '1.05rem', color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} style={{ color: '#10b981' }} />
            {tabLabels[activeTab]} ({filtered.length})
          </h3>

          {/* Ticket items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#cbd5e1' : '#334155',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  outline: 'none'
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
                      border: isCurrent ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                      backgroundColor: isCurrent ? 'var(--primary)' : '#ffffff',
                      color: isCurrent ? '#ffffff' : '#334155',
                      borderRadius: '6px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      outline: 'none'
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
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyTicketsPage;
