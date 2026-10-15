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
  const [plateSearch, setPlateSearch] = useState('');
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);

  // Filter & View states matching exact screenshot
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'morning', 'afternoon', 'evening'
  const [busType, setBusType] = useState('all'); // 'all', 'Xe Giường Nằm', 'Xe Ghế Ngồi', 'Limousine'
  const [onlyAvailableSeats, setOnlyAvailableSeats] = useState(false);
  const [sortBy, setSortBy] = useState('early'); // 'early', 'price_low', 'most_seats'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  // Calendar view state
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: 2026, month: 11 }); // Default to Dec 2026 where trips exist
  const [selectedCalDateStr, setSelectedCalDateStr] = useState('2026-12-21');

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

      // 2. Fetch all trips to lookup from schedule
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

  const matchesStart = (trip, input) => {
    if (!input) return true;
    const cleanInput = canonicalizeLocation(input);
    const tripStart = canonicalizeLocation(trip.routeId?.startPoint || '');
    const hasMatchingPickup = (trip.pickupPoints || []).some(pt => 
      canonicalizeLocation(pt.location).includes(cleanInput)
    );
    return tripStart.includes(cleanInput) || hasMatchingPickup;
  };

  const matchesEnd = (trip, input) => {
    if (!input) return true;
    const cleanInput = canonicalizeLocation(input);
    const tripEnd = canonicalizeLocation(trip.routeId?.endPoint || '');
    const hasMatchingDropoff = (trip.dropoffPoints || []).some(pt => 
      canonicalizeLocation(pt.location).includes(cleanInput)
    );
    return tripEnd.includes(cleanInput) || hasMatchingDropoff;
  };

  const handleSwapLocations = () => {
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  // Compute Calendar Grid Days
  const getCalendarDays = () => {
    const { year, month } = currentYearMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Monday = 0, Sunday = 6

    const totalDays = lastDay.getDate();
    const daysArr = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      daysArr.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const yearStr = year;
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateISO = `${yearStr}-${monthStr}-${dayStr}`;

      const tripsOnDate = trips.filter(t => {
        const tDate = new Date(t.departureTime);
        return tDate.getFullYear() === year &&
               tDate.getMonth() === month &&
               tDate.getDate() === d &&
               matchesStart(t, startPoint) &&
               matchesEnd(t, endPoint);
      });

      const totalAvailSeats = tripsOnDate.reduce((acc, t) => {
        const total = t.busId?.totalSeats || 36;
        const booked = t.bookedSeats?.length || 0;
        return acc + Math.max(0, total - booked);
      }, 0);

      daysArr.push({
        dayNumber: d,
        dateISO,
        tripsCount: tripsOnDate.length,
        availableSeats: totalAvailSeats
      });
    }

    return daysArr;
  };

  // Filter & sort trips based on inputs & filter controls
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
        dateMatch = false;
      }
    }

    let plateMatch = true;
    if (plateSearch && plateSearch.trim()) {
      const q = normalizeText(plateSearch);
      const plate = normalizeText(trip.busId?.plateNumber || '');
      const type = normalizeText(trip.busId?.type || '');
      const startP = normalizeText(trip.routeId?.startPoint || '');
      const endP = normalizeText(trip.routeId?.endPoint || '');
      plateMatch = plate.includes(q) || type.includes(q) || startP.includes(q) || endP.includes(q);
    }

    let timeMatch = true;
    if (timeRange !== 'all') {
      const hour = new Date(trip.departureTime).getHours();
      if (timeRange === 'morning') timeMatch = hour >= 6 && hour < 12;
      else if (timeRange === 'afternoon') timeMatch = hour >= 12 && hour < 18;
      else if (timeRange === 'evening') timeMatch = hour >= 18 && hour <= 23;
    }

    let typeMatch = true;
    if (busType !== 'all') {
      const t = normalizeText(trip.busId?.type || '');
      const target = normalizeText(busType);
      typeMatch = t.includes(target);
    }

    let availableMatch = true;
    if (onlyAvailableSeats) {
      const totalSeats = trip.busId?.totalSeats || 36;
      const bookedCount = trip.bookedSeats?.length || 0;
      availableMatch = (totalSeats - bookedCount) > 0;
    }

    return startMatch && endMatch && dateMatch && plateMatch && timeMatch && typeMatch && availableMatch;
  }).sort((a, b) => {
    if (sortBy === 'price_low') {
      return (a.price || 0) - (b.price || 0);
    }
    if (sortBy === 'most_seats') {
      const remA = (a.busId?.totalSeats || 36) - (a.bookedSeats?.length || 0);
      const remB = (b.busId?.totalSeats || 36) - (b.bookedSeats?.length || 0);
      return remB - remA;
    }
    return new Date(a.departureTime) - new Date(b.departureTime);
  });

  const matchesWordBoundary = (locationName, query) => {
    if (!query) return true;
    const cleanLocation = normalizeText(locationName);
    const cleanQuery = normalizeText(query).trim();
    const regex = new RegExp('(^|\\s)' + cleanQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
    return regex.test(cleanLocation);
  };

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
        fetchInitialData();
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
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number || 0);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
        <div style={{ color: '#2563eb', fontWeight: '600', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          Đang tải lịch xe & ca làm việc...
        </div>
      </div>
    );
  }

  return (
    <section style={{ animation: 'fadeIn 0.3s ease', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        .agent-card-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .filter-pill-btn {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-size: 0.82rem;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .filter-pill-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: #1e293b;
        }
        .filter-pill-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .text-link-filter {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .text-link-filter:hover {
          color: #1e293b;
          background: #f1f5f9;
        }
        .text-link-filter.active {
          color: #2563eb;
          font-weight: 700;
        }
        .trip-item-row {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.15rem 1.5rem;
          margin-bottom: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
          gap: 1.5rem;
        }
        .trip-item-row:hover {
          border-color: #cbd5e1;
          box-shadow: 0 6px 16px -4px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
        .trip-item-row.sold-out {
          background: #fafafa;
          border-color: #f1f5f9;
        }
        .form-input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .form-input-with-icon input {
          width: 100%;
          height: 42px;
          padding: 0.5rem 0.85rem 0.5rem 2.4rem;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.88rem;
          color: #0f172a;
          outline: none;
          background: #ffffff;
          transition: all 0.2s;
        }
        .form-input-with-icon input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .form-input-with-icon .input-icon {
          position: absolute;
          left: 0.8rem;
          color: #64748b;
          pointer-events: none;
        }
        .suggestion-item {
          padding: 0.6rem 1rem;
          cursor: pointer;
          font-size: 0.85rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
        }
        .suggestion-item:hover {
          background: #eff6ff;
          color: #2563eb;
        }
        .swap-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1.35rem;
          flex-shrink: 0;
        }
        .swap-btn:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #eff6ff;
          transform: rotate(180deg);
        }
        .bus-badge-type {
          background: #eff6ff;
          color: #2563eb;
          padding: 3px 9px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .bus-badge-plate {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .btn-buy-ticket {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.55rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.18);
        }
        .btn-buy-ticket:hover {
          background: #1d4ed8;
          box-shadow: 0 6px 10px -1px rgba(37, 99, 235, 0.25);
        }
        .btn-sold-out {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
          padding: 0.55rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: not-allowed;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
      `}</style>

      {/* HEADER SECTION MATCHING SCREENSHOT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
              Đặt Vé Xe Tại Quầy
            </h2>
            <span style={{ 
              backgroundColor: '#ecfdf5', 
              color: '#059669', 
              border: '1px solid #a7f3d0',
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px', 
              fontSize: '0.8rem', 
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              Đang mở: {activeShift?.counterNumber ? `Văn phòng Sài Gòn (BXMĐ) - ${activeShift.counterNumber}` : 'Văn phòng Sài Gòn (BXMĐ) - Quầy số 1'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Bán vé nhanh tại quầy, kiểm soát tuyến & điều phối ca trực
          </p>
        </div>

        {/* View mode switcher */}
        <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            className={`filter-pill-btn ${viewMode === 'list' ? 'active' : ''}`}
            style={{ borderRadius: '8px', padding: '6px 12px' }}
            onClick={() => setViewMode('list')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
            </svg>
            Danh sách
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            style={{ borderRadius: '8px', padding: '6px 12px' }}
            onClick={() => setViewMode('calendar')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Dạng lịch
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.25rem' }}>{error}</div>}
      {success && (
        <div className="success-message" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', borderRadius: '8px', fontWeight: '500' }}>
          <span>{success}</span>
          {lastBooking && (
            <button
              type="button"
              className="btn"
              style={{
                marginLeft: '1.5rem',
                padding: '0.4rem 1rem',
                fontSize: '0.85rem',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
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

      {!selectedTrip && (
        <>
          {/* SEARCH & FILTER CONTROLLER PANEL */}
          <div className="agent-card-panel">
            
            {/* ROW 1: SEARCH INPUTS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 1fr 1fr', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              
              {/* Điểm xuất phát */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Điểm xuất phát
                </label>
                <div className="form-input-with-icon">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Hồ Chí Minh, Đà Lạt..."
                    value={startPoint}
                    onChange={(e) => {
                      setStartPoint(e.target.value);
                      setShowStartSuggestions(true);
                    }}
                    onFocus={() => setShowStartSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowStartSuggestions(false), 250)}
                  />
                </div>
                {showStartSuggestions && startSuggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 99,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    listStyle: 'none',
                    margin: '0.25rem 0 0 0',
                    padding: '0.25rem 0'
                  }}>
                    {startSuggestions.map(item => (
                      <li
                        key={item.name}
                        onMouseDown={() => {
                          setStartPoint(item.name);
                          setShowStartSuggestions(false);
                        }}
                        className="suggestion-item"
                      >
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {item.type === 'city' ? 'Tỉnh / Thành phố' : `Điểm đón tại ${item.parentCity}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Swap Button */}
              <button
                type="button"
                className="swap-btn"
                title="Đổi điểm đi và điểm đến"
                onClick={handleSwapLocations}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
                </svg>
              </button>

              {/* Điểm đến */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Điểm đến
                </label>
                <div className="form-input-with-icon">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Đà Lạt, Cần Thơ..."
                    value={endPoint}
                    onChange={(e) => {
                      setEndPoint(e.target.value);
                      setShowEndSuggestions(true);
                    }}
                    onFocus={() => setShowEndSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEndSuggestions(false), 250)}
                  />
                </div>
                {showEndSuggestions && endSuggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 99,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    listStyle: 'none',
                    margin: '0.25rem 0 0 0',
                    padding: '0.25rem 0'
                  }}>
                    {endSuggestions.map(item => (
                      <li
                        key={item.name}
                        onMouseDown={() => {
                          setEndPoint(item.name);
                          setShowEndSuggestions(false);
                        }}
                        className="suggestion-item"
                      >
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {item.type === 'city' ? 'Tỉnh / Thành phố' : `Điểm trả tại ${item.parentCity}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Ngày khởi hành */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Ngày khởi hành
                </label>
                <div className="form-input-with-icon">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                  </span>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => {
                      setDepartureDate(e.target.value);
                      setSelectedCalDateStr(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* Tìm nhanh xe / Biển số */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Tìm nhanh xe / Biển số
                </label>
                <div className="form-input-with-icon">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Biển số (vd: 51B-044.44) ..."
                    value={plateSearch}
                    onChange={(e) => setPlateSearch(e.target.value)}
                  />
                </div>
              </div>

            </div>

            {/* ROW 2: FILTERS (Khung giờ & Loại xe) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', marginBottom: '0.85rem' }}>
              
              {/* Khung giờ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Khung giờ:
                </span>
                <button
                  type="button"
                  className={`filter-pill-btn ${timeRange === 'all' ? 'active' : ''}`}
                  onClick={() => setTimeRange('all')}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${timeRange === 'morning' ? 'active' : ''}`}
                  onClick={() => setTimeRange('morning')}
                >
                  🌅 Sáng (06:00 - 12:00)
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${timeRange === 'afternoon' ? 'active' : ''}`}
                  onClick={() => setTimeRange('afternoon')}
                >
                  🌄 Chiều (12:00 - 18:00)
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${timeRange === 'evening' ? 'active' : ''}`}
                  onClick={() => setTimeRange('evening')}
                >
                  🌙 Tối (18:00 - 24:00)
                </button>
              </div>

              {/* Loại xe */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18"/>
                  </svg>
                  Loại xe:
                </span>
                <button
                  type="button"
                  className={`filter-pill-btn ${busType === 'all' ? 'active' : ''}`}
                  onClick={() => setBusType('all')}
                >
                  Mọi loại xe
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${busType === 'Xe Giường Nằm' ? 'active' : ''}`}
                  onClick={() => setBusType('Xe Giường Nằm')}
                >
                  Xe Giường Nằm
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${busType === 'Xe Ghế Ngồi' ? 'active' : ''}`}
                  onClick={() => setBusType('Xe Ghế Ngồi')}
                >
                  Xe Ghế Ngồi
                </button>
                <button
                  type="button"
                  className={`filter-pill-btn ${busType === 'Limousine' ? 'active' : ''}`}
                  onClick={() => setBusType('Limousine')}
                >
                  Limousine
                </button>
              </div>

            </div>

            {/* ROW 3: EXTRA FILTERS & SORTING */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              
              {/* Checkbox Chỉ chuyến còn ghế */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={onlyAvailableSeats}
                  onChange={(e) => setOnlyAvailableSeats(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  Chỉ chuyến còn ghế
                </span>
              </label>

              {/* Sắp xếp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>
                  </svg>
                  Sắp xếp:
                </span>
                <span
                  className={`text-link-filter ${sortBy === 'early' ? 'active' : ''}`}
                  onClick={() => setSortBy('early')}
                >
                  Khởi hành sớm
                </span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span
                  className={`text-link-filter ${sortBy === 'price_low' ? 'active' : ''}`}
                  onClick={() => setSortBy('price_low')}
                >
                  Giá vé thấp
                </span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span
                  className={`text-link-filter ${sortBy === 'most_seats' ? 'active' : ''}`}
                  onClick={() => setSortBy('most_seats')}
                >
                  Ghế trống nhiều
                </span>
              </div>

            </div>

          </div>

          {/* CALENDAR VIEW MODE PANEL */}
          {viewMode === 'calendar' && (
            <div className="agent-card-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Month Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                    📅 Lịch Trình Xe Chạy - Tháng {currentYearMonth.month + 1}/{currentYearMonth.year}
                  </h3>
                  <span className="bus-badge-type">
                    {trips.filter(t => new Date(t.departureTime).getMonth() === currentYearMonth.month && new Date(t.departureTime).getFullYear() === currentYearMonth.year).length} chuyến xe trong tháng
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="filter-pill-btn"
                    onClick={() => {
                      let m = currentYearMonth.month - 1;
                      let y = currentYearMonth.year;
                      if (m < 0) { m = 11; y--; }
                      setCurrentYearMonth({ year: y, month: m });
                    }}
                  >
                    &larr; Tháng trước
                  </button>
                  <button
                    type="button"
                    className="filter-pill-btn"
                    onClick={() => {
                      const today = new Date();
                      setCurrentYearMonth({ year: today.getFullYear(), month: today.getMonth() });
                      const yStr = today.getFullYear();
                      const mStr = String(today.getMonth() + 1).padStart(2, '0');
                      const dStr = String(today.getDate()).padStart(2, '0');
                      setSelectedCalDateStr(`${yStr}-${mStr}-${dStr}`);
                      setDepartureDate(`${yStr}-${mStr}-${dStr}`);
                    }}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    className="filter-pill-btn"
                    onClick={() => {
                      let m = currentYearMonth.month + 1;
                      let y = currentYearMonth.year;
                      if (m > 11) { m = 0; y++; }
                      setCurrentYearMonth({ year: y, month: m });
                    }}
                  >
                    Tháng sau &rarr;
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '0.85rem', color: '#64748b' }}>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>Thứ 2</div>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>Thứ 3</div>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>Thứ 4</div>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>Thứ 5</div>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>Thứ 6</div>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', color: '#2563eb' }}>Thứ 7</div>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', color: '#ef4444' }}>Chủ Nhật</div>
              </div>

              {/* Days Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {getCalendarDays().map((cell, idx) => {
                  if (!cell) {
                    return <div key={`empty-${idx}`} style={{ minHeight: '90px', background: '#fafafa', borderRadius: '10px', border: '1px dashed #f1f5f9' }}></div>;
                  }

                  const isSelected = selectedCalDateStr === cell.dateISO || departureDate === cell.dateISO;
                  const hasTrips = cell.tripsCount > 0;

                  return (
                    <div
                      key={cell.dateISO}
                      onClick={() => {
                        setSelectedCalDateStr(cell.dateISO);
                        setDepartureDate(cell.dateISO);
                      }}
                      style={{
                        minHeight: '95px',
                        padding: '10px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : hasTrips ? '#ffffff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? '#2563eb' : 'transparent',
                          color: isSelected ? '#ffffff' : '#0f172a'
                        }}>
                          {cell.dayNumber}
                        </span>
                        {hasTrips && (
                          <span style={{ fontSize: '0.72rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '10px', fontWeight: '600' }}>
                            {cell.tripsCount} chuyến
                          </span>
                        )}
                      </div>

                      {hasTrips ? (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                            {cell.availableSeats} chỗ trống
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 'auto' }}>
                          Không có chuyến
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TRIP LIST MATCHING SCREENSHOT */}
          <div style={{ marginBottom: '1rem', fontWeight: '700', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              {departureDate ? `Danh sách chuyến xe khởi hành ngày ${departureDate}` : 'Tất cả chuyến xe khả dụng'} ({filteredTrips.length} chuyến)
            </span>
            {departureDate && (
              <button
                type="button"
                className="text-link-filter"
                style={{ fontSize: '0.8rem', color: '#ef4444' }}
                onClick={() => {
                  setDepartureDate('');
                  setSelectedCalDateStr('');
                }}
              >
                &times; Xóa lọc ngày
              </button>
            )}
          </div>

          {filteredTrips.length === 0 ? (
            <div className="agent-card-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 1rem auto', display: 'block' }}>
                <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
              </svg>
              <div style={{ fontWeight: '600', fontSize: '1rem', color: '#334155', marginBottom: '0.25rem' }}>
                Không tìm thấy chuyến xe nào phù hợp
              </div>
              <div style={{ fontSize: '0.85rem' }}>Vui lòng chọn ngày khác hoặc thay đổi điểm xuất phát, điểm đến để xem kết quả khác.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {filteredTrips.map(trip => {
                const totalSeats = trip.busId?.totalSeats || 36;
                const bookedCount = trip.bookedSeats?.length || 0;
                const availableSeats = Math.max(0, totalSeats - bookedCount);
                const isSoldOut = availableSeats === 0;
                const isExpired = new Date(trip.departureTime) < new Date();

                const depDateObj = new Date(trip.departureTime);
                const timeStr = depDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                const dateStr = depDateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

                return (
                  <div key={trip._id} className={`trip-item-row ${isSoldOut ? 'sold-out' : ''}`}>
                    
                    {/* COLUMN 1: ROUTE & VEHICLE INFO */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1.4' }}>
                      {/* Bus Icon Container */}
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: isSoldOut ? '#f1f5f9' : '#eff6ff',
                        color: isSoldOut ? '#94a3b8' : '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 17h2l.64-2.54c.24-.96.36-1.95.36-2.94V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4.52c0 .99.12 1.98.36 2.94L3 17h2"/>
                          <path d="M14 17H10"/><path d="M5 21v-4"/><path d="M19 21v-4"/><rect x="4" y="7" width="16" height="5" rx="1"/>
                        </svg>
                      </div>

                      {/* Route Title & Badges */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '1.1rem', color: isSoldOut ? '#64748b' : '#0f172a' }}>
                            {trip.routeId ? `${trip.routeId.startPoint} ⇄ ${trip.routeId.endPoint}` : 'N/A'}
                          </span>
                          {isSoldOut && (
                            <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                              Hết vé
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="bus-badge-type">
                            {trip.busId?.type || 'Xe Giường Nằm 44 Chỗ'}
                          </span>
                          <span className="bus-badge-plate">
                            {trip.busId?.plateNumber || '51B-000.00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 2: DEPARTURE TIME & DATE */}
                    <div style={{ flex: '0.9', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.45rem', fontWeight: '800', color: isSoldOut ? '#64748b' : '#0f172a', letterSpacing: '-0.02em' }}>
                        {timeStr}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                        {dateStr}
                      </div>
                    </div>

                    {/* COLUMN 3: SEAT STATUS */}
                    <div style={{ flex: '1.2' }}>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '2px' }}>
                        Tình trạng chỗ:
                      </div>
                      {!isSoldOut ? (
                        <div>
                          <div style={{ color: '#059669', fontWeight: '700', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                            Còn {availableSeats}/{totalSeats} chỗ trống
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            Đã đặt: {bookedCount}/{totalSeats} ghế
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                            Đã hết vé (0/{totalSeats} chỗ)
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            Đã đặt: {totalSeats}/{totalSeats} ghế
                          </div>
                        </div>
                      )}
                    </div>

                    {/* COLUMN 4: PRICE & ACTION */}
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1px' }}>
                        Giá vé
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '800', color: isSoldOut ? '#94a3b8' : '#0f172a', marginBottom: '0.4rem' }}>
                        {formatCurrency(trip.price)}
                      </div>
                    </div>

                    <div style={{ minWidth: '135px', display: 'flex', justifyContent: 'flex-end' }}>
                      {!isSoldOut && !isExpired ? (
                        <button
                          type="button"
                          className="btn-buy-ticket"
                          onClick={() => {
                            setSelectedTrip(trip);
                            setSelectedSeats([]);
                            setSelectedFloor('lower');
                            setSelectedPickup(trip.pickupPoints?.[0]?.location || '');
                            setSelectedDropoff(trip.dropoffPoints?.[0]?.location || '');
                          }}
                        >
                          Chọn mua vé
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </button>
                      ) : (
                        <button type="button" className="btn-sold-out" disabled>
                          Hết chỗ
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* BOOKING FORM & SEAT MAP SELECTION LAYOUT */}
      {selectedTrip && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', background: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                Đặt Vé Xe: {selectedTrip.routeId ? `${selectedTrip.routeId.startPoint} ⇄ ${selectedTrip.routeId.endPoint}` : 'N/A'}
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Khởi hành: {new Date(selectedTrip.departureTime).toLocaleTimeString('vi-VN')} ({new Date(selectedTrip.departureTime).toLocaleDateString('vi-VN')}) - Xe {selectedTrip.busId?.plateNumber} ({selectedTrip.busId?.type})
              </span>
            </div>
            <button
              type="button"
              className="filter-pill-btn"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '600' }}
              onClick={() => setSelectedTrip(null)}
            >
              &larr; Quay lại danh sách
            </button>
          </div>

          <form onSubmit={handleCreateBooking}>
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2.5rem' }}>

              {/* Left Column: Seat Map Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontWeight: '700', textAlign: 'center', fontSize: '1rem' }}>
                  Sơ Đồ Ghế Xe ({selectedTrip.busId?.type || 'Xe khách'})
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
                    <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}>
                      {hasUpperFloor && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                          <button
                            type="button"
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              backgroundColor: activeFloor === 'lower' ? '#2563eb' : '#e2e8f0',
                              color: activeFloor === 'lower' ? '#ffffff' : '#334155',
                              border: 'none',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedFloor('lower')}
                          >
                            Tầng Dưới (Tầng 1)
                          </button>
                          <button
                            type="button"
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              backgroundColor: activeFloor === 'upper' ? '#2563eb' : '#e2e8f0',
                              color: activeFloor === 'upper' ? '#ffffff' : '#334155',
                              border: 'none',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedFloor('upper')}
                          >
                            Tầng Trên (Tầng 2)
                          </button>
                        </div>
                      )}

                      {/* Header Driver Windshield */}
                      <div style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        padding: '10px 18px',
                        background: '#0f172a',
                        borderRadius: '14px 14px 0 0',
                        color: '#ffffff'
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>ĐẦU XE</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="3" fill="#94a3b8"/>
                        </svg>
                      </div>

                      {/* Grid Box */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gap: '10px',
                        padding: '1.25rem 1rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '0 0 14px 14px',
                        backgroundColor: '#ffffff'
                      }}>
                        {currentFloorRows.flat().map((seat, index) => {
                          if (seat === null) {
                            return <div key={`spacer-${index}`} style={{ height: '44px' }}></div>;
                          }

                          const isBooked = (selectedTrip.bookedSeats || []).includes(seat);
                          const isSelected = selectedSeats.includes(seat);

                          let seatBg = 'rgba(37, 99, 235, 0.08)';
                          let seatBorder = '#2563eb';
                          let seatColor = '#2563eb';

                          if (isBooked) {
                            seatBg = '#e2e8f0';
                            seatBorder = '#cbd5e1';
                            seatColor = '#94a3b8';
                          } else if (isSelected) {
                            seatBg = '#2563eb';
                            seatBorder = '#2563eb';
                            seatColor = '#ffffff';
                          }

                          return (
                            <button
                              key={seat}
                              type="button"
                              disabled={isBooked}
                              style={{
                                height: '44px',
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
                                transition: 'all 0.15s'
                              }}
                              onClick={() => handleSeatClick(seat)}
                            >
                              {seat}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '1rem', fontSize: '0.78rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '12px', height: '12px', border: '2px solid #2563eb', backgroundColor: 'rgba(37, 99, 235, 0.08)', borderRadius: '3px' }}></div>
                          <span>Trống</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '3px' }}></div>
                          <span>Đang chọn</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '3px' }}></div>
                          <span>Đã mua</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Customer Info & Payments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: '700', fontSize: '1.05rem' }}>
                  Thông tin xuất vé trực tiếp tại quầy:
                </h4>

                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Chọn điểm đón *
                  </label>
                  <select
                    style={{ width: '100%', height: '42px', padding: '0 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.88rem' }}
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

                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Chọn điểm trả *
                  </label>
                  <select
                    style={{ width: '100%', height: '42px', padding: '0 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.88rem' }}
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

                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Số điện thoại khách hàng *
                  </label>
                  <input
                    type="tel"
                    style={{ width: '100%', height: '42px', padding: '0 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.88rem' }}
                    placeholder="Nhập SĐT để tự động kết nối kiểm tra thành viên..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Hệ thống tự động liên kết tài khoản và tích điểm thành viên (Membership points) theo số điện thoại này.
                  </span>
                </div>

                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Họ và tên khách hàng *
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', height: '42px', padding: '0 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.88rem' }}
                    placeholder="Nhập tên người đi xe..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                    Phương thức thanh toán trực tiếp tại quầy *
                  </label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b', fontWeight: '500' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                        style={{ accentColor: '#2563eb' }}
                      />
                      Tiền mặt (Cash)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b', fontWeight: '500' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cashless"
                        checked={paymentMethod === 'cashless'}
                        onChange={() => setPaymentMethod('cashless')}
                        style={{ accentColor: '#2563eb' }}
                      />
                      Thẻ POS / Chuyển khoản VietQR
                    </label>
                  </div>
                </div>

                {/* Summary Calculator Box */}
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#475569' }}>
                    <span>Số ghế lựa chọn:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#475569' }}>
                    <span>Đơn giá vé:</span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(selectedTrip.price)}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.75rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.15rem', color: '#2563eb' }}>
                    <span>Tổng tiền thu:</span>
                    <span>{formatCurrency(selectedTrip.price * selectedSeats.length)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-buy-ticket"
                  style={{ width: '100%', height: '46px', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.95rem' }}
                  disabled={submitting}
                >
                  {submitting ? 'Đang xuất vé...' : 'Xác nhận thu tiền & Xuất vé'}
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* POS Receipt Printing Mock Modal */}
      {printTarget && (
        <div className="modal-backdrop" onClick={() => setPrintTarget(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', fontFamily: 'Courier New, monospace', color: '#000000', backgroundColor: '#ffffff', border: '2px solid #000000', padding: '1.5rem', margin: '0 auto', borderRadius: '4px' }}>
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

            <div style={{ borderTop: '1px dashed #000', marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                type="button"
                className="filter-pill-btn"
                style={{ padding: '0.3rem 1rem', fontSize: '0.8rem' }}
                onClick={() => window.print()}
              >
                In hóa đơn trực tiếp
              </button>
              <button
                type="button"
                className="filter-pill-btn"
                style={{ padding: '0.3rem 1rem', fontSize: '0.8rem', backgroundColor: '#e2e8f0' }}
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
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.5rem', background: '#0f172a', color: '#ffffff'
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
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a', marginBottom: '1rem' }}>
                QUÉT MÃ THANH TOÁN VIETQR (PAYOS)
              </div>
              
              <img
                src={`https://img.vietqr.io/image/MB-0919210046-compact2.png?amount=${(showQRModal.tripId?.price || 0) * showQRModal.seats?.length}&addInfo=SmartBus%20${showQRModal.orderCode}&accountName=HO%20VAN%20LOC`}
                alt="VietQR PayOS"
                style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem' }}
              />

              <div style={{ textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>Ngân hàng: <strong>MBBank (Ngân hàng Quân Đội)</strong></div>
                <div>Số tài khoản: <strong>0919210046</strong></div>
                <div>Chủ tài khoản: <strong>HO VAN LOC</strong></div>
                <div>Số tiền: <strong style={{ color: '#2563eb' }}>{formatCurrency((showQRModal.tripId?.price || 0) * showQRModal.seats?.length)}</strong></div>
                <div>Nội dung: <strong style={{ color: '#ef4444' }}>SmartBus {showQRModal.orderCode}</strong></div>
              </div>

              <div style={{ width: '100%', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-buy-ticket"
                  style={{ width: '100%', justifyContent: 'center', backgroundColor: '#10b981' }}
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
                  Giả lập chuyển khoản thành công
                </button>

                <button
                  type="button"
                  className="btn-buy-ticket"
                  style={{ width: '100%', justifyContent: 'center' }}
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
