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
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);

  // Booking session states
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('lower');
  const [selectedPickup, setSelectedPickup] = useState('');
  const [selectedDropoff, setSelectedDropoff] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [printTarget, setPrintTarget] = useState(null);
  const [showQRModal, setShowQRModal] = useState(null);
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

  // Helper to check if a trip matches the start point (city or detailed pickup)
  const matchesStart = (trip, input) => {
    if (!input) return true;
    const cleanInput = canonicalizeLocation(input);
    const tripStart = canonicalizeLocation(trip.routeId?.startPoint || '');
    const hasMatchingPickup = (trip.pickupPoints || []).some(pt => 
      canonicalizeLocation(pt.location).includes(cleanInput)
    );
    return tripStart.includes(cleanInput) || hasMatchingPickup;
  };

  // Helper to check if a trip matches the end point (city or detailed dropoff)
  const matchesEnd = (trip, input) => {
    if (!input) return true;
    const cleanInput = canonicalizeLocation(input);
    const tripEnd = canonicalizeLocation(trip.routeId?.endPoint || '');
    const hasMatchingDropoff = (trip.dropoffPoints || []).some(pt => 
      canonicalizeLocation(pt.location).includes(cleanInput)
    );
    return tripEnd.includes(cleanInput) || hasMatchingDropoff;
  };

  // Filtering trips based on search controls
  const filteredTrips = trips.filter(trip => {
    const startMatch = matchesStart(trip, startPoint);
    const endMatch = matchesEnd(trip, endPoint);

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

  // Helper for word-boundary matching (prevents "phong" matching "ho")
  const matchesWordBoundary = (locationName, query) => {
    if (!query) return true;
    const cleanLocation = normalizeText(locationName);
    const cleanQuery = normalizeText(query).trim();
    
    // Check if query starts at beginning of string or after a space
    const regex = new RegExp('(^|\\s)' + cleanQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
    return regex.test(cleanLocation);
  };

  // Dynamically extract start points based on selected end point (if any) to prevent mixing routes
  const availableTripsForStart = trips.filter(t => matchesEnd(t, endPoint));
  const startLocationsGroup = [];
  availableTripsForStart.forEach(t => {
    const city = t.routeId?.startPoint;
    if (!city) return;
    
    if (!startLocationsGroup.some(item => item.name === city)) {
      startLocationsGroup.push({ name: city, type: 'city', parentCity: city });
    }
    
    (t.pickupPoints || []).forEach(p => {
      if (!startLocationsGroup.some(item => item.name === p.location)) {
        startLocationsGroup.push({ name: p.location, type: 'pickup', parentCity: city });
      }
    });
  });

  // Dynamically extract end points based on selected start point (if any) to prevent mixing routes
  const availableTripsForEnd = trips.filter(t => matchesStart(t, startPoint));
  const endLocationsGroup = [];
  availableTripsForEnd.forEach(t => {
    const city = t.routeId?.endPoint;
    if (!city) return;
    
    if (!endLocationsGroup.some(item => item.name === city)) {
      endLocationsGroup.push({ name: city, type: 'city', parentCity: city });
    }
    
    (t.dropoffPoints || []).forEach(d => {
      if (!endLocationsGroup.some(item => item.name === d.location)) {
        endLocationsGroup.push({ name: d.location, type: 'dropoff', parentCity: city });
      }
    });
  });

  // Filter suggestions by matching query against location name OR parent city name (so typing "Hồ" includes pickup points of HCM)
  const startSuggestions = startLocationsGroup.filter(item => 
    matchesWordBoundary(item.name, startPoint) || matchesWordBoundary(item.parentCity, startPoint)
  );

  const endSuggestions = endLocationsGroup.filter(item => 
    matchesWordBoundary(item.name, endPoint) || matchesWordBoundary(item.parentCity, endPoint)
  );

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
          pickup: selectedPickup || selectedTrip.routeId?.startPoint || 'Bến xe xuất phát',
          dropoff: selectedDropoff || selectedTrip.routeId?.endPoint || 'Bến xe kết thúc',
          customerName,
          customerPhone,
          paymentMethod
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(paymentMethod === 'cashless' ? 'Đang chờ khách quét mã VietQR thanh toán...' : 'Nhận tiền tại quầy và xuất vé thành công! Mã Code: ' + data.booking.orderCode);
        const printedBooking = {
          ...data.booking,
          tripId: selectedTrip
        };
        if (paymentMethod === 'cashless') {
          setShowQRModal(printedBooking);
        } else {
          setPrintTarget(printedBooking);
        }
        setLastBooking(printedBooking);
        setSelectedTrip(null);
        setSelectedSeats([]);
        setCustomerName('');
        setCustomerPhone('');
        setSelectedPickup('');
        setSelectedDropoff('');
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
      <style>{`
        .trip-card-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          margin-bottom: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02);
          gap: 1.5rem;
        }
        .trip-card-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04) !important;
          border-color: #cbd5e1 !important;
        }
        .suggestion-list-item {
          padding: 0.6rem 1rem;
          cursor: pointer;
          font-size: 0.85rem;
          color: #334155;
          transition: background-color 0.2s ease;
        }
        .suggestion-list-item:hover {
          background-color: #f1f5f9 !important;
          color: var(--primary) !important;
        }
        .form-control-custom {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #1e293b !important;
          padding: 0.8rem 1rem !important;
          border-radius: 8px !important;
          font-size: 0.9rem !important;
          width: 100% !important;
          height: 45px !important;
          outline: none !important;
          transition: all 0.2s ease !important;
        }
        .form-control-custom:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(63, 106, 216, 0.15) !important;
        }
        .license-plate {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 0.15rem 0.4rem;
          font-family: 'Courier New', Courier, monospace;
          font-weight: 700;
          font-size: 0.8rem;
          background-color: #f8fafc;
          color: #334155;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
        <h2>Đặt Vé Xe Tại Quầy</h2>
        <div>
          {activeShift ? (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#e6fffa', color: '#00af80', padding: '0.4rem 0.8rem', borderRadius: '4px', fontWeight: '500' }}>
              Đang mở: <strong>{activeShift.counterNumber}</strong>
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#fff5f5', color: '#e53e3e', padding: '0.4rem 0.8rem', borderRadius: '4px', fontWeight: '500' }}>
              Chưa mở ca trực!
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
              In Vé Ngay
            </button>
          )}
        </div>
      )}

      {/* Search Bar controls */}
      {!selectedTrip && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            
            {/* Start Point Input with Auto-suggestions */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Điểm xuất phát</label>
              <input
                type="text"
                className="form-control-custom"
                style={{ marginTop: '0.35rem' }}
                placeholder="Ví dụ: Hồ Chí Minh, Đà Lạt..."
                value={startPoint}
                onChange={(e) => {
                  setStartPoint(e.target.value);
                  setShowStartSuggestions(true);
                }}
                onFocus={() => setShowStartSuggestions(true)}
                onBlur={() => setTimeout(() => setShowStartSuggestions(false), 250)}
              />
              {showStartSuggestions && startSuggestions.length > 0 && (
                <ul style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 99,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  listStyle: 'none',
                  margin: '0.25rem 0 0 0',
                  padding: '0.35rem 0'
                }}>
                  {startSuggestions.map(item => (
                    <li
                      key={item.name}
                      onMouseDown={() => {
                        setStartPoint(item.name);
                        setShowStartSuggestions(false);
                      }}
                      className="suggestion-list-item"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {item.type === 'city' ? 'Tỉnh / Thành phố' : `Điểm đón tại ${item.parentCity}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* End Point Input with Auto-suggestions */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Điểm đến</label>
              <input
                type="text"
                className="form-control-custom"
                style={{ marginTop: '0.35rem' }}
                placeholder="Ví dụ: Đà Lạt, Cần Thơ..."
                value={endPoint}
                onChange={(e) => {
                  setEndPoint(e.target.value);
                  setShowEndSuggestions(true);
                }}
                onFocus={() => setShowEndSuggestions(true)}
                onBlur={() => setTimeout(() => setShowEndSuggestions(false), 250)}
              />
              {showEndSuggestions && endSuggestions.length > 0 && (
                <ul style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 99,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  listStyle: 'none',
                  margin: '0.25rem 0 0 0',
                  padding: '0.35rem 0'
                }}>
                  {endSuggestions.map(item => (
                    <li
                      key={item.name}
                      onMouseDown={() => {
                        setEndPoint(item.name);
                        setShowEndSuggestions(false);
                      }}
                      className="suggestion-list-item"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {item.type === 'city' ? 'Tỉnh / Thành phố' : `Điểm trả tại ${item.parentCity}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Departure Date using Date Picker */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Ngày khởi hành</label>
              <input
                type="date"
                className="form-control-custom"
                style={{ marginTop: '0.35rem' }}
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
          </div>

          {filteredTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: '6px' }}>
              Không tìm thấy chuyến xe nào phù hợp với yêu cầu tìm kiếm.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {filteredTrips.map(trip => {
                const occupancyRate = Math.min(100, ((trip.bookedSeats?.length || 0) / (trip.busId?.totalSeats || 36)) * 100);
                return (
                  <div key={trip._id} className="trip-card-item">
                    
                    {/* Column 1: Route & Vehicle */}
                    <div style={{ flex: '1.3' }}>
                      <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                        {trip.routeId ? `${trip.routeId.startPoint} ⇄ ${trip.routeId.endPoint}` : 'N/A'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="bus-type-badge" style={{ margin: 0, fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                          {trip.busId?.type || 'Limousine'}
                        </span>
                        <span className="license-plate">
                          {trip.busId?.plateNumber || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Departure Time & Date */}
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b' }}>
                        {new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {new Date(trip.departureTime).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    {/* Column 3: Seat Occupancy Rate */}
                    <div style={{ flex: '1.1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>Đã đặt:</span>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>
                          {trip.bookedSeats?.length || 0}/{trip.busId?.totalSeats || 36} ghế
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${occupancyRate}%`, 
                          height: '100%', 
                          backgroundColor: occupancyRate >= 90 ? '#ef4444' : occupancyRate >= 50 ? '#f59e0b' : '#10b981', 
                          borderRadius: '3px' 
                        }}></div>
                      </div>
                    </div>

                    {/* Column 4: Price */}
                    <div style={{ flex: '1', fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', textAlign: 'right', paddingRight: '0.5rem' }}>
                      {formatCurrency(trip.price)}
                    </div>

                    {/* Column 5: Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: '130px' }}>
                      {(() => {
                        const isExpired = new Date(trip.departureTime) < new Date();
                        return (
                          <button
                            className="btn"
                            disabled={isExpired}
                            style={{
                              padding: '0.55rem 1.1rem',
                              fontSize: '0.85rem',
                              backgroundColor: isExpired ? '#cbd5e1' : 'var(--primary)',
                              color: isExpired ? '#94a3b8' : '#ffffff',
                              cursor: isExpired ? 'not-allowed' : 'pointer',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              width: '100%',
                              transition: 'all 0.2s',
                              boxShadow: isExpired ? 'none' : '0 4px 6px -1px rgba(63, 106, 216, 0.15)'
                            }}
                            onClick={() => {
                              setSelectedTrip(trip);
                              setSelectedSeats([]);
                              setSelectedFloor('lower');
                              setSelectedPickup(trip.pickupPoints?.[0]?.location || '');
                              setSelectedDropoff(trip.dropoffPoints?.[0]?.location || '');
                            }}
                          >
                            {isExpired ? 'Đã khởi hành' : 'Chọn mua vé'}
                          </button>
                        );
                      })()}
                    </div>

                  </div>
                );
              })}
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
            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2.5rem' }}>

               {/* Left Column: Interactive Seat Maps */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontWeight: '700', textAlign: 'center' }}>
                  Sơ Đồ Ghế ({selectedTrip.busId?.type || 'Xe khách'})
                </h4>
                
                {(() => {
                  const { lowerFloor, upperFloor, columns } = (selectedTrip.busId?.seatLayout && selectedTrip.busId.seatLayout.lowerFloor)
                    ? selectedTrip.busId.seatLayout
                    : {
                        columns: 3,
                        lowerFloor: [
                          ['A1', 'A2', 'A3'],
                          ['A4', 'A5', 'A6'],
                          ['A7', 'A8', 'A9'],
                          ['A10', 'A11', 'A12'],
                          ['A13', 'A14', 'A15'],
                          ['A16', 'A17', 'A18']
                        ],
                        upperFloor: [
                          ['B1', 'B2', 'B3'],
                          ['B4', 'B5', 'B6'],
                          ['B7', 'B8', 'B9'],
                          ['B10', 'B11', 'B12'],
                          ['B13', 'B14', 'B15'],
                          ['B16', 'B17', 'B18']
                        ]
                      };
                  const hasUpperFloor = upperFloor && upperFloor.length > 0;
                  const activeFloor = (selectedFloor === 'upper' && hasUpperFloor) ? 'upper' : 'lower';
                  const currentFloorRows = activeFloor === 'lower' ? lowerFloor : upperFloor;

                  return (
                    <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
                      {/* Floor Tabs Selector */}
                      {hasUpperFloor && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              padding: '6px 16px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              backgroundColor: activeFloor === 'lower' ? 'var(--primary)' : '#e2e8f0',
                              color: activeFloor === 'lower' ? '#ffffff' : '#334155',
                              border: 'none',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: activeFloor === 'lower' ? '0 4px 6px -1px rgba(63, 106, 216, 0.2)' : 'none'
                            }}
                            onClick={() => setSelectedFloor('lower')}
                          >
                            Tầng Dưới (Tầng 1)
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              padding: '6px 16px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              backgroundColor: activeFloor === 'upper' ? 'var(--primary)' : '#e2e8f0',
                              color: activeFloor === 'upper' ? '#ffffff' : '#334155',
                              border: 'none',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: activeFloor === 'upper' ? '0 4px 6px -1px rgba(63, 106, 216, 0.2)' : 'none'
                            }}
                            onClick={() => setSelectedFloor('upper')}
                          >
                            Tầng Trên (Tầng 2)
                          </button>
                        </div>
                      )}

                      {/* Windshield & Driver Seat Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: '#1e293b',
                        borderRadius: '16px 16px 0 0',
                        color: '#ffffff',
                        border: '2px solid #1e293b',
                        borderBottom: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>ĐẦU XE</span>
                        {/* Steering Wheel Icon */}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="2" x2="12" y2="22" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <circle cx="12" cy="12" r="3" fill="#94a3b8" />
                        </svg>
                      </div>

                      {/* Seat Grid Card */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gap: '12px',
                        padding: '1.5rem 1.25rem',
                        border: '2px solid #cbd5e1',
                        borderRadius: '0 0 16px 16px',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)'
                      }}>
                        {currentFloorRows.flat().map((seat, index) => {
                          if (seat === null) {
                            return <div key={`spacer-${index}`} style={{ height: '48px' }}></div>;
                          }

                          const isBooked = (selectedTrip.bookedSeats || []).includes(seat);
                          const isSelected = selectedSeats.includes(seat);

                          let seatBg = 'rgba(63, 106, 216, 0.08)';
                          let seatBorder = 'var(--primary)';
                          let seatColor = 'var(--primary)';

                          if (isBooked) {
                            seatBg = '#cbd5e1';
                            seatBorder = '#cbd5e1';
                            seatColor = '#94a3b8';
                          } else if (isSelected) {
                            seatBg = 'var(--primary)';
                            seatBorder = 'var(--primary)';
                            seatColor = '#ffffff';
                          }

                          return (
                            <button
                              key={seat}
                              type="button"
                              disabled={isBooked}
                              style={{
                                height: '48px',
                                borderRadius: '8px',
                                border: `2px solid ${seatBorder}`,
                                backgroundColor: seatBg,
                                color: seatColor,
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: isBooked ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              onClick={() => handleSeatClick(seat)}
                            >
                              {seat}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '12px', height: '12px', border: '2px solid var(--primary)', backgroundColor: 'rgba(63, 106, 216, 0.08)', borderRadius: '3px' }}></div>
                          <span>Trống</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
                          <span>Đang chọn</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#cbd5e1', borderRadius: '3px' }}></div>
                          <span>Đã mua</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Customer Info & Payments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text)' }}>Thông tin thanh toán trực tiếp:</h4>

                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Chọn điểm đón *</label>
                  <select
                    className="form-control-custom"
                    style={{ marginTop: '0.35rem' }}
                    value={selectedPickup}
                    onChange={(e) => setSelectedPickup(e.target.value)}
                    required
                  >
                    {(selectedTrip.pickupPoints || []).map((p, idx) => (
                      <option key={idx} value={p.location}>
                        {p.time} - {p.location} ({p.address})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Chọn điểm trả *</label>
                  <select
                    className="form-control-custom"
                    style={{ marginTop: '0.35rem' }}
                    value={selectedDropoff}
                    onChange={(e) => setSelectedDropoff(e.target.value)}
                    required
                  >
                    {(selectedTrip.dropoffPoints || []).map((d, idx) => (
                      <option key={idx} value={d.location}>
                        {d.time} - {d.location} ({d.address})
                      </option>
                    ))}
                  </select>
                </div>

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
                      Tiền mặt (Cash)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cashless"
                        checked={paymentMethod === 'cashless'}
                        onChange={() => setPaymentMethod('cashless')}
                      />
                      Thẻ POS / Chuyển khoản QR
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
              <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>NHÀ XE AN BÌNH LINES</h3>
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
              <p style={{ margin: '0 0 0.25rem 0' }}>Cảm ơn quý khách đã tin tưởng An Bình Lines!</p>
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

      {/* Cashless QR Payment Modal */}
      {showQRModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            maxWidth: '380px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            fontFamily: 'sans-serif'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header wind shield style */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              background: '#1e293b',
              color: '#ffffff'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.05em' }}>THANH TOÁN CHUYỂN KHOẢN QR</span>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                onClick={() => setShowQRModal(null)}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>
                QUÉT MÃ THANH TOÁN VIETQR (PAYOS)
              </div>
              
              <img
                src={`https://img.vietqr.io/image/MB-0919210046-compact2.png?amount=${(showQRModal.tripId?.price || 0) * showQRModal.seats?.length}&addInfo=SmartBus%20${showQRModal.orderCode}&accountName=HO%20VAN%20LOC`}
                alt="VietQR PayOS"
                style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem' }}
              />

              <div style={{ textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 auto', width: '100%', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>Ngân hàng: <strong>MBBank (Ngân hàng Quân Đội)</strong></div>
                <div>Số tài khoản: <strong>0919210046</strong></div>
                <div>Chủ tài khoản: <strong>HO VAN LOC</strong></div>
                <div>Số tiền: <strong style={{ color: 'var(--primary)' }}>{formatCurrency((showQRModal.tripId?.price || 0) * showQRModal.seats?.length)}</strong></div>
                <div>Nội dung chuyển khoản: <strong style={{ color: '#ef4444' }}>SmartBus {showQRModal.orderCode}</strong></div>
              </div>

              <div style={{ width: '100%', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                  }}
                  onClick={async () => {
                    try {
                      await fetch('http://localhost:8000/api/v1/payment/webhook', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          code: '00',
                          desc: 'success',
                          data: {
                            orderCode: showQRModal.orderCode,
                            amount: (showQRModal.tripId?.price || 0) * showQRModal.seats?.length,
                            description: `Thanh toan ve xe cho ma dat cho ${showQRModal._id}`
                          }
                        })
                      });
                    } catch (err) {
                      console.error(err);
                    }
                    setPrintTarget(showQRModal);
                    setShowQRModal(null);
                  }}
                >
                  Giả lập chuyển khoản thành công (Webhook)
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(63, 106, 216, 0.2)'
                  }}
                  onClick={() => {
                    setPrintTarget(showQRModal);
                    setShowQRModal(null);
                  }}
                >
                  Xác nhận đã thanh toán xong
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default AgentBookingPage;
