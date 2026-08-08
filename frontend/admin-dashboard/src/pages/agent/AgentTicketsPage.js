import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentTicketsPage = () => {
  const { token } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Shift check
  const [activeShift, setActiveShift] = useState(null);

  // Cancellation Modal State
  const [cancellationTarget, setCancellationTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Print Ticket State
  const [printTarget, setPrintTarget] = useState(null);

  const fetchShiftStatus = async () => {
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
      console.error('Lỗi lấy ca hiện tại:', err);
    }
  };

  useEffect(() => {
    fetchShiftStatus();
  }, [token]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/users/agent/tickets?query=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookings(data.bookings);
        if (data.bookings.length === 0) {
          setError('Không tìm thấy vé xe nào khớp với thông tin tra cứu.');
        }
      } else {
        setError(data.message || 'Không thể tra cứu thông tin vé.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelConfirmation = (booking) => {
    setCancellationTarget(booking);
    setError('');
    setSuccess('');
  };

  const handleExecuteCancellation = async () => {
    if (!cancellationTarget) return;

    setCancelling(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/users/agent/cancel-ticket/${cancellationTarget._id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Hủy vé thành công! Đã phạt ${formatCurrency(data.refundSummary.cancellationFee)} (${data.refundSummary.feePercent}%) và hoàn trả ${formatCurrency(data.refundSummary.refundAmount)} cho hành khách.`);
        setCancellationTarget(null);
        // Refresh values
        setBookings(bookings.map(b => b._id === data.booking._id ? { ...b, ...data.booking } : b));
      } else {
        setError(data.message || 'Hủy vé thất bại.');
      }
    } catch (err) {
      setError('Lỗi máy chủ khi hủy vé.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrintReceipt = (booking) => {
    setPrintTarget(booking);
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
  };

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h2>Tra Cứu & Quản Lý Vé Tại Quầy</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Tìm kiếm vé đã mua bằng số điện thoại, tên khách hàng hoặc mã vạch hóa đơn để in lại biên lai hoặc thực hiện hoàn hủy vé.</p>
        </div>
        <div>
          {activeShift ? (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#e6fffa', color: '#00af80', padding: '0.4rem 0.8rem', borderRadius: '4px', fontWeight: '500' }}>
              🏪 Đang mở: <strong>{activeShift.counterNumber}</strong>
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#fff5f5', color: '#e53e3e', padding: '0.4rem 0.8rem', borderRadius: '4px', fontWeight: '500' }}>
              ⚠️ Chưa mở ca trực!
            </span>
          )}
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.25rem' }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: '1.25rem' }}>{success}</div>}

      {/* Search form controls */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Nhập Số điện thoại, Mã vé (6 chữ số) hoặc Tên hành khách..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1 }}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '120px' }}>
          {loading ? 'Đang tìm...' : 'Tra cứu nhanh'}
        </button>
      </form>

      {/* Bookings Result Table */}
      {bookings.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                <th style={{ padding: '1rem' }}>Mã vé (Code)</th>
                <th style={{ padding: '1rem' }}>Khách hàng</th>
                <th style={{ padding: '1rem' }}>Tuyến đường</th>
                <th style={{ padding: '1rem' }}>Vị trí ghế</th>
                <th style={{ padding: '1rem' }}>Trạng thái</th>
                <th style={{ padding: '1rem' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{booking.orderCode}</strong>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600' }}>{booking.customerName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SĐT: {booking.customerPhone}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {booking.tripId?.routeId ? (
                      <div>
                        <strong>{booking.tripId.routeId.startPoint} ⇄ {booking.tripId.routeId.endPoint}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Khởi hành: {new Date(booking.tripId.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(booking.tripId.departureTime).toLocaleDateString('vi-VN')})
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <strong>{booking.seats?.join(', ')}</strong> ({booking.seats?.length || 0} ghế)
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {booking.status === 'paid' && <span style={{ backgroundColor: '#e6fffa', color: '#00af80', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Đã thanh toán</span>}
                    {booking.status === 'pending' && <span style={{ backgroundColor: '#fffaf0', color: '#dd6b20', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Chờ thanh toán</span>}
                    {booking.status === 'cancelled' && <span style={{ backgroundColor: '#fff5f5', color: '#e53e3e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Đã hủy</span>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                        onClick={() => handlePrintReceipt(booking)}
                      >
                        🖨️ In vé
                      </button>
                      {booking.status !== 'cancelled' && (
                        <button
                          className="btn"
                          disabled={!activeShift}
                          style={{
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.75rem',
                            backgroundColor: activeShift ? '#fed7d7' : '#cbd5e1',
                            color: activeShift ? '#c53030' : '#94a3b8',
                            cursor: activeShift ? 'pointer' : 'not-allowed',
                            border: '1px solid ' + (activeShift ? '#feb2b2' : '#cbd5e1'),
                            borderRadius: '4px'
                          }}
                          onClick={() => handleOpenCancelConfirmation(booking)}
                          title={!activeShift ? 'Vui lòng mở ca trực để thực hiện hủy vé' : ''}
                        >
                          ❌ Hủy vé
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancellation Penalty Calculation Modal */}
      {cancellationTarget && (
        <div className="modal-backdrop" onClick={() => setCancellationTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Xác Nhận Hủy Vé & Hoàn Tiền</h2>
              <button className="modal-close" onClick={() => setCancellationTarget(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#fff5f5', color: '#c53030', padding: '0.75rem', borderRadius: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                ⚠️ Cảnh báo: Yêu cầu này sẽ hủy toàn bộ các vé đã chọn và giải phóng ghế ngồi tương ứng về sơ đồ chuyến.
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mã code vé hủy:</label>
                <div><strong>{cancellationTarget.orderCode}</strong> (Khách hàng: {cancellationTarget.customerName})</div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thời gian xuất hành chuyến đi:</label>
                <div>
                  <strong>
                    {cancellationTarget.tripId ? `${new Date(cancellationTarget.tripId.departureTime).toLocaleTimeString('vi-VN')} ngày ${new Date(cancellationTarget.tripId.departureTime).toLocaleDateString('vi-VN')}` : 'N/A'}
                  </strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <span>Số lượng vé:</span>
                  <strong>{cancellationTarget.seats?.length} vé ({cancellationTarget.seats?.join(', ')})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>Tổng tiền thanh toán ban đầu:</span>
                  <strong>{formatCurrency((cancellationTarget.tripId?.price || 0) * cancellationTarget.seats?.length)}</strong>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                * Quy định khấu trừ phí phạt sẽ tự động áp dụng theo thời gian hủy so với giờ đi và ngày nghỉ Lễ/Tết theo quy định nhà xe.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setCancellationTarget(null)} disabled={cancelling}>Quay lại</button>
              <button
                className="btn"
                style={{ backgroundColor: '#e53e3e', color: '#ffffff' }}
                onClick={handleExecuteCancellation}
                disabled={cancelling}
              >
                {cancelling ? 'Đang xử lý...' : 'Xác nhận hủy và Hoàn tiền'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Receipt Printing Mock Modal */}
      {printTarget && (
        <div className="modal-backdrop" onClick={() => setPrintTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', fontFamily: 'Courier New, monospace', color: '#000000', backgroundColor: '#ffffff', border: '2px solid #000000', padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>NHÀ XE Á ĐÔNG TRAVEL</h3>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem' }}>MANG NIỀM TIN TRÊN MỌI NẺO ĐƯỜNG</p>
              <p style={{ margin: '0', fontSize: '0.75rem' }}>Hotline: 1900 8888</p>
              <div style={{ margin: '0.5rem 0', borderTop: '1px dashed #000000' }}></div>
              <h4 style={{ margin: '0.25rem 0', fontSize: '1rem', fontWeight: 'bold' }}>HÓA ĐƠN VÉ XE KIÊM BIÊN LAI</h4>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div><strong>Mã vé (Code): </strong> {printTarget.orderCode}</div>
              <div><strong>Hành khách: </strong> {printTarget.customerName}</div>
              <div><strong>SĐT: </strong> {printTarget.customerPhone}</div>
              <div style={{ margin: '0.25rem 0', borderTop: '1px dashed #000000' }}></div>
              {printTarget.tripId ? (
                <>
                  <div><strong>Tuyến đường: </strong> {printTarget.tripId.routeId?.startPoint} - {printTarget.tripId.routeId?.endPoint}</div>
                  <div><strong>Xuất phát: </strong> {new Date(printTarget.tripId.departureTime).toLocaleTimeString('vi-VN')} ({new Date(printTarget.tripId.departureTime).toLocaleDateString('vi-VN')})</div>
                  <div><strong>Xe khách: </strong> {printTarget.tripId.busId?.plateNumber} ({printTarget.tripId.busId?.type})</div>
                </>
              ) : null}
              <div><strong>Số ghế: </strong> {printTarget.seats?.join(', ')}</div>
              <div><strong>Số lượng: </strong> {printTarget.seats?.length}</div>
              <div style={{ margin: '0.25rem 0', borderTop: '1px dashed #000000' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}>
                <span>TỔNG TIỀN:</span>
                <span>{formatCurrency((printTarget.tripId?.price || 0) * printTarget.seats?.length)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Trạng thái: {printTarget.status === 'cancelled' ? 'ĐÃ HỦY (CANCELLED)' : 'ĐÃ THANH TOÁN (COUNTER CLEAR)'}</div>
            </div>

            {/* Ticket Boarding QR Code */}
            {printTarget.qrSignature && printTarget.status !== 'cancelled' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                <div style={{ border: '1px solid #000', padding: '4px', backgroundColor: '#fff', display: 'inline-block' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                      JSON.stringify({ ticketId: printTarget._id, signature: printTarget.qrSignature })
                    )}`}
                    alt="Vé QR Soát Vé"
                    style={{ width: '120px', height: '120px', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.65rem', marginTop: '0.25rem', color: '#000', fontWeight: 'bold' }}>
                  MÃ QR SOÁT VÉ LÊN XE (HMAC SECURE)
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem' }}>
              <p style={{ margin: '0 0 0.25rem 0' }}>Cảm ơn quý khách đã tin tưởng Á Đông Travel!</p>
              <p style={{ margin: '0' }}>Chúc quý khách thượng lộ bình an!</p>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px dashed #000', marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 1rem', fontSize: '0.8rem', fontFamily: 'sans-serif' }}
                onClick={() => {
                  window.print();
                }}
              >
                In hóa đơn trực tiếp
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 1rem', fontSize: '0.8rem', fontFamily: 'sans-serif', marginLeft: '0.5rem', backgroundColor: '#e2e8f0' }}
                onClick={() => setPrintTarget(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default AgentTicketsPage;
