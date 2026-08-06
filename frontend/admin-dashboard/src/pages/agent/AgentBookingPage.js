import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentBookingPage = () => {
  const { token } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search parameters
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [departureDate, setDepartureDate] = useState('');

  // Booking session states
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [printTarget, setPrintTarget] = useState(null);
  const [lastBooking, setLastBooking] = useState(null);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Verify shift session status
      const shiftRes = await fetch('http://localhost:8000/api/v1/users/shift/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shiftData = await shiftRes.json();
      if (shiftRes.ok && shiftData.success) {
        setActiveShift(shiftData.session);
      }

      // 2. Fetch all trips to lookup from schedule (since schedule returns all trips for ticket agents)
      const tripsRes = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tripsData = await tripsRes.json();
      if (tripsRes.ok && tripsData.success) {
        setTrips(tripsData.trips);
      }
    } catch (err) {
      setError('Lỗi kết nối tới máy chủ khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
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

  const parseDateStr = (str) => {
    if (!str) return null;
    const cleanStr = str.trim();

    // Check if it's 8 digits only (like 26082026)
    const digitsOnly = cleanStr.replace(/\s+/g, '').replace(/[-\/]/g, '');
    if (/^\d{8}$/.test(digitsOnly)) {
      const day = parseInt(digitsOnly.substring(0, 2), 10);
      const month = parseInt(digitsOnly.substring(2, 4), 10) - 1;
      const year = parseInt(digitsOnly.substring(4, 8), 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }

    let parts = cleanStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  };

  const handleDateBlur = () => {
    if (!departureDate) return;
    const parsed = parseDateStr(departureDate);
    if (parsed) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      setDepartureDate(`${day}/${month}/${year}`);
    }
  };

  // Filtering trips based on search controls
  const filteredTrips = trips.filter(trip => {
    const startInput = canonicalizeLocation(startPoint);
    const endInput = canonicalizeLocation(endPoint);

    const tripStart = canonicalizeLocation(trip.routeId?.startPoint || '');
    const tripEnd = canonicalizeLocation(trip.routeId?.endPoint || '');

    const startMatch = !startPoint ? true : tripStart.includes(startInput);
    const endMatch = !endPoint ? true : tripEnd.includes(endInput);

    let dateMatch = true;
    if (departureDate) {
      const parsedSearchDate = parseDateStr(departureDate);
      if (parsedSearchDate) {
        const tripDate = new Date(trip.departureTime).toDateString();
        dateMatch = tripDate === parsedSearchDate.toDateString();
      } else {
        // If date query is incomplete, temporarily hide display
        dateMatch = false;
      }
    }
    return startMatch && endMatch && dateMatch;
  });

  const handleSeatClick = (seatCode) => {
    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatCode));
    } else {
      setSelectedSeats([...selectedSeats, seatCode]);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!activeShift) {
      setError('Bạn phải mở ca tại quầy vé trước khi thực hiện đặt vé.');
      return;
    }

    if (selectedSeats.length === 0) {
      setError('Vui lòng chọn ít nhất một ghế.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/agent/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tripId: selectedTrip._id,
          seats: selectedSeats,
          pickup: selectedTrip.routeId?.startPoint || 'Bến xe xuất phát',
          dropoff: selectedTrip.routeId?.endPoint || 'Bến xe kết thúc',
          customerName,
          customerPhone,
          paymentMethod
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Nhận tiền tại quầy và xuất vé thành công! Mã Code: ' + data.booking.orderCode);
        const printedBooking = {
          ...data.booking,
          tripId: selectedTrip
        };
        setPrintTarget(printedBooking);
        setLastBooking(printedBooking);
        setSelectedTrip(null);
        setSelectedSeats([]);
        setCustomerName('');
        setCustomerPhone('');
        fetchInitialData(); // Refresh remaining seats and revenues
      } else {
        setError(data.message || 'Đặt vé thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi thanh toán vé.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate generic seats layout: 15 seats upper floor (B1-B15), 15 seats lower floor (A1-A15)
  const renderSeatMap = (deck) => {
    const list = Array.from({ length: 15 }, (_, i) => `${deck}${i + 1}`);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px' }}>
        {list.map(seat => {
          const isBooked = selectedTrip?.bookedSeats?.includes(seat);
          const isSelected = selectedSeats.includes(seat);

          let btnStyle = {
            padding: '0.5rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: '600',
            borderRadius: '4px',
            cursor: 'pointer',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#1e293b'
          };

          if (isBooked) {
            btnStyle.backgroundColor = '#cbd5e1';
            btnStyle.color = '#94a3b8';
            btnStyle.cursor = 'not-allowed';
          } else if (isSelected) {
            btnStyle.backgroundColor = 'var(--primary)';
            btnStyle.color = '#ffffff';
            btnStyle.borderColor = 'var(--primary)';
          }

          return (
            <button
              key={seat}
              type="button"
              disabled={isBooked}
              style={btnStyle}
              onClick={() => handleSeatClick(seat)}
            >
              {seat}
            </button>
          );
        })}
      </div>
    );
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải lịch bán vé...</div>
      </div>
    );
  }

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
        <h2>Đặt Vé Xe Tại Quầy</h2>
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
      {success && (
        <div className="success-message" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', borderRadius: '4px', fontWeight: '500' }}>
          <span>{success}</span>
          {lastBooking && (
            <button
              type="button"
              className="btn"
              style={{
                marginLeft: '1.5rem',
                padding: '0.4rem 1rem',
                fontSize: '0.85rem',
                backgroundColor: '#00af80',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
              onClick={() => setPrintTarget(lastBooking)}
            >
              🖨️ In Vé Ngay
            </button>
          )}
        </div>
      )}

      {/* Search Bar controls */}
      {!selectedTrip && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Điểm xuất phát</label>
              <input
                type="text"
                className="form-control"
                style={{ marginTop: '0.25rem' }}
                placeholder="Ví dụ: Sài Gòn, Nha Trang..."
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Điểm đến</label>
              <input
                type="text"
                className="form-control"
                style={{ marginTop: '0.25rem' }}
                placeholder="Ví dụ: Nha Trang, Đà Lạt..."
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Ngày khởi hành (dd/mm/yyyy)</label>
              <input
                type="text"
                className="form-control"
                style={{ marginTop: '0.25rem' }}
                placeholder="Ví dụ: 23/08/2026"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                onBlur={handleDateBlur}
              />
            </div>
          </div>

          {filteredTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: '6px' }}>
              Không tìm thấy chuyến xe nào phù hợp với yêu cầu tìm kiếm.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                    <th style={{ padding: '1rem' }}>Tuyến xe chạy</th>
                    <th style={{ padding: '1rem' }}>Thời gian khới hành</th>
                    <th style={{ padding: '1rem' }}>Phương tiện</th>
                    <th style={{ padding: '1rem' }}>Giá vé</th>
                    <th style={{ padding: '1rem' }}>Trạng thái ghế</th>
                    <th style={{ padding: '1rem' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map(trip => (
                    <tr key={trip._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>
                        {trip.routeId ? `${trip.routeId.startPoint} ⇄ ${trip.routeId.endPoint}` : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600' }}>{new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(trip.departureTime).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div>{trip.busId?.plateNumber || 'N/A'}</div>
                        <span className="bus-type-badge">{trip.busId?.type || 'Limousine'}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>
                        {formatCurrency(trip.price)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong>{trip.bookedSeats?.length || 0}</strong> / {trip.busId?.totalSeats || 36} ghế đã đặt
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {(() => {
                          const isExpired = new Date(trip.departureTime) < new Date();
                          return (
                            <button
                              className="btn"
                              disabled={isExpired}
                              style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.8rem',
                                backgroundColor: isExpired ? '#cbd5e1' : 'var(--primary)',
                                color: isExpired ? '#94a3b8' : '#ffffff',
                                cursor: isExpired ? 'not-allowed' : 'pointer',
                                border: 'none',
                                borderRadius: '4px'
                              }}
                              onClick={() => {
                                setSelectedTrip(trip);
                                setSelectedSeats([]);
                              }}
                            >
                              {isExpired ? 'Đã khởi hành' : 'Chọn mua vé'}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Booking Form Layout */}
      {selectedTrip && (
        <div style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '1.5rem', background: '#f8fafc', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>
              Đặt vé: {selectedTrip.routeId ? `${selectedTrip.routeId.startPoint} ⇄ ${selectedTrip.routeId.endPoint}` : 'N/A'}
            </h3>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setSelectedTrip(null)}
            >
              Quay lại danh sách
            </button>
          </div>

          <form onSubmit={handleCreateBooking}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '2rem' }}>

              {/* Left Column: Interactive Seat Maps */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>Chọn vị trí ghế ngồi:</h4>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem', display: 'block' }}>Tầng dưới (A1 - A15)</label>
                  {renderSeatMap('A')}
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem', display: 'block' }}>Tầng trên (B1 - B15)</label>
                  {renderSeatMap('B')}
                </div>
              </div>

              {/* Right Column: Customer Info & Payments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text)' }}>Thông tin thanh toán trực tiếp:</h4>

                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Số điện thoại khách hàng *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Nhập SĐT để tự động kết nối kiểm tra thành viên..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hệ thống tự động liên kết tài khoản và tích điểm thành viên (Membership points) theo số điện thoại này.</span>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Họ và tên khách hàng *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tên người đi xe..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Phương thức thanh toán trực tiếp tại quầy *</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                      />
                      💵 Tiền mặt (Cash)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cashless"
                        checked={paymentMethod === 'cashless'}
                        onChange={() => setPaymentMethod('cashless')}
                      />
                      💳 Thẻ POS / Chuyển khoản QR
                    </label>
                  </div>
                </div>

                {/* Final receipt calculator */}
                <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '6px', marginTop: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Số ghế lựa chọn:</span>
                    <strong>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Đơn giá vé:</span>
                    <span>{formatCurrency(selectedTrip.price)}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '0.5rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary)' }}>
                    <span>Tổng tiền thu:</span>
                    <span>{formatCurrency(selectedTrip.price * selectedSeats.length)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', fontWeight: '600' }}
                  disabled={submitting}
                >
                  {submitting ? 'Đang thanh toán...' : 'Xác nhận thu tiền & Xuất vé'}
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* POS Receipt Printing Mock Modal */}
      {printTarget && (
        <div className="modal-backdrop" onClick={() => setPrintTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', fontFamily: 'Courier New, monospace', color: '#000000', backgroundColor: '#ffffff', border: '2px solid #000000', padding: '1.5rem', margin: '0 auto' }}>
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
                style={{ padding: '0.3rem 1rem', fontSize: '0.8rem', fontFamily: 'sans-serif', marginLeft: '0.5rem', backgroundColor: '#e2e8f0', color: '#1e293b' }}
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

export default AgentBookingPage;
