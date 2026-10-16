import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentBookingPage = () => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [publicLocations, setPublicLocations] = useState({ origins: [], destinations: [], routes: [] });
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper chuyển đổi ngày sang YYYY-MM-DD chuẩn local
  const formatDateToYMD = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatDateToYMD(new Date());
  const tomorrowStr = formatDateToYMD(new Date(Date.now() + 86400000));
  const dayAfterTomorrowStr = formatDateToYMD(new Date(Date.now() + 86400000 * 2));

  // Search parameters - Mặc định ngày nào thì hiển thị ngày đó (Hôm nay)
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [departureDate, setDepartureDate] = useState(() => todayStr);
  const [plateSearch, setPlateSearch] = useState('');
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);

  // Filter & View states
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'morning', 'afternoon', 'evening'
  const [busType, setBusType] = useState('all'); // 'all', 'Xe Giường Nằm', 'Xe Ghế Ngồi', 'Limousine'
  const [onlyAvailableSeats, setOnlyAvailableSeats] = useState(false);
  const [sortBy, setSortBy] = useState('early'); // 'early', 'price_low', 'most_seats'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  // Calendar view state
  const [currentYearMonth, setCurrentYearMonth] = useState({ year: 2026, month: 9 }); // Month 9 is October (0-indexed)
  const [selectedCalDateStr, setSelectedCalDateStr] = useState('2026-10-16');

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
      // 1. Kiểm tra thông tin ca trực tại quầy của nhân viên
      const shiftRes = await fetch('http://localhost:8000/api/v1/users/shift/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shiftData = await shiftRes.json();
      if (shiftRes.ok && shiftData.success) {
        setActiveShift(shiftData.session);
      }

      // 2. Lấy danh sách điểm đi / điểm đến thực tế từ CSDL
      try {
        const locRes = await fetch('http://localhost:8000/api/v1/trips/routes');
        const locData = await locRes.json();
        if (locRes.ok && locData.success) {
          setPublicLocations({
            origins: locData.origins || [],
            destinations: locData.destinations || [],
            routes: locData.routes || []
          });
        }
      } catch (locErr) {
        console.warn('Lỗi lấy danh sách địa điểm:', locErr);
      }

      // 3. Lấy toàn bộ chuyến xe thực tế từ CSDL hệ thống
      const tripsRes = await fetch('http://localhost:8000/api/v1/trips/ops/trips', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tripsData = await tripsRes.json();
      if (tripsRes.ok && tripsData.success) {
        setTrips(tripsData.trips || []);
      } else {
        // Phương án dự phòng nếu không phải ops_manager: dùng my-schedule
        const backupRes = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const backupData = await backupRes.json();
        if (backupRes.ok && backupData.success) {
          setTrips(backupData.trips || []);
        }
      }
    } catch (err) {
      setError('Lỗi kết nối tới máy chủ khi tải dữ liệu chuyến xe từ CSDL.');
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

  const matchesStart = (trip, query) => {
    if (!query) return true;
    const qCanon = canonicalizeLocation(query);
    const qNorm = normalizeText(query);
    const startPoint = trip.routeId?.startPoint || '';
    if (canonicalizeLocation(startPoint).includes(qCanon) || normalizeText(startPoint).includes(qNorm)) {
      return true;
    }
    return (trip.pickupPoints || []).some(p => 
      normalizeText(p.location).includes(qNorm) || normalizeText(p.address || '').includes(qNorm)
    );
  };

  const matchesEnd = (trip, query) => {
    if (!query) return true;
    const qCanon = canonicalizeLocation(query);
    const qNorm = normalizeText(query);
    const endPoint = trip.routeId?.endPoint || '';
    if (canonicalizeLocation(endPoint).includes(qCanon) || normalizeText(endPoint).includes(qNorm)) {
      return true;
    }
    return (trip.dropoffPoints || []).some(d => 
      normalizeText(d.location).includes(qNorm) || normalizeText(d.address || '').includes(qNorm)
    );
  };

  // Hoán đổi điểm đi và điểm đến
  const handleSwapLocations = () => {
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  // Format tiền tệ
  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number || 0);
  };

  // Lọc chuyến xe
  const filteredTrips = trips.filter(trip => {
    const startMatch = matchesStart(trip, startPoint);
    const endMatch = matchesEnd(trip, endPoint);

    // Khớp ngày khởi hành theo chuẩn YYYY-MM-DD
    let dateMatch = true;
    if (departureDate) {
      dateMatch = (formatDateToYMD(trip.departureTime) === departureDate);
    }

    let plateMatch = true;
    if (plateSearch.trim()) {
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

  // Gợi ý địa điểm tìm kiếm
  const startSuggestions = (publicLocations.origins || [])
    .filter(loc => normalizeText(loc.name).includes(normalizeText(startPoint)));

  const endSuggestions = (publicLocations.destinations || [])
    .filter(loc => normalizeText(loc.name).includes(normalizeText(endPoint)));

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
      setError('Bạn phải mở ca tại quầy vé trước khi thực hiện xuất vé.');
      return;
    }

    if (selectedSeats.length === 0) {
      setError('Vui lòng chọn ít nhất một vị trí ghế.');
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
        setSuccess(paymentMethod === 'cashless' ? 'Đang chờ khách quét mã VietQR thanh toán...' : 'Nhận tiền tại quầy và xuất vé thành công! Mã vé: ' + data.booking.orderCode);
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
        setError(data.message || 'Xuất vé tại quầy thất bại.');
      }
    } catch (err) {
      setError('Mất kết nối với máy chủ khi xử lý xuất vé.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper đặt ngày nhanh
  const setQuickDate = (daysFromToday) => {
    if (daysFromToday === null) {
      setDepartureDate('');
      return;
    }
    const d = new Date(Date.now() + daysFromToday * 86400000);
    setDepartureDate(formatDateToYMD(d));
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* CSS Cục Bộ Chuẩn Giao Diện Bán Vé - Responsive Toàn Diện & Tuyệt Đối Không Dùng Icon */}
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

        .agent-filter-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr 180px 1.2fr;
          gap: 0.75rem;
          align-items: end;
        }

        .agent-form-control {
          width: 100%;
          height: 40px;
          padding: 0 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.82rem;
          color: #0f172a;
          outline: none;
          background: #ffffff;
          transition: border-color 0.15s;
        }

        .agent-form-control:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .agent-trip-row {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1fr 140px;
          gap: 1rem;
          align-items: center;
          transition: all 0.15s ease;
        }

        .agent-trip-row:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .agent-trip-row.departed {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .agent-pill-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .agent-pill-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .agent-suggestion-box {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 50;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .agent-suggestion-item {
          padding: 8px 12px;
          font-size: 0.8rem;
          color: #334155;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
        }

        .agent-suggestion-item:hover {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 700;
        }

        /* Responsive Tablet (<= 992px) */
        @media (max-width: 992px) {
          .agent-filter-grid {
            grid-template-columns: 1fr 1fr;
          }
          .agent-trip-row {
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }
        }

        /* Responsive Mobile (<= 640px) */
        @media (max-width: 640px) {
          .agent-panel-box {
            padding: 1rem 0.85rem;
            border-radius: 12px;
            gap: 1rem;
          }
          .agent-filter-grid {
            grid-template-columns: 1fr;
          }
          .agent-trip-row {
            grid-template-columns: 1fr;
            gap: 0.65rem;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* VÙNG 1: KHỐI TRẮNG TIÊU ĐỀ & TRẠNG THÁI QUẦY VÉ            */}
      {/* ========================================================= */}
      <div className="agent-panel-box">
        <div className="agent-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Đặt Vé Xe Tại Quầy
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

            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>
              {activeShift ? (
                <span>
                  Đang mở ca tại: <strong style={{ color: '#0f172a' }}>{activeShift.counterNumber}</strong>
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                  Bắt đầu: <strong style={{ color: '#0f172a' }}>{new Date(activeShift.startTime).toLocaleTimeString('vi-VN')}</strong> ({new Date(activeShift.startTime).toLocaleDateString('vi-VN')})
                </span>
              ) : (
                <span style={{ color: '#b45309' }}>
                  Chưa ghi nhận ca trực quầy hôm nay. Vui lòng mở ca để liên kết doanh thu và lịch sử bán vé.
                </span>
              )}
            </div>
          </div>

          <div className="agent-header-actions">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
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
            >
              {viewMode === 'list' ? 'Chuyển Sang Dạng Lịch' : 'Chuyển Sang Danh Sách'}
            </button>

            <button
              onClick={fetchInitialData}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              title="Tải lại dữ liệu chuyến xe từ CSDL"
            >
              Làm Mới Dữ Liệu
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
            Lưu ý: {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
            Thành công: {success}
          </div>
        )}
      </div>

      {!selectedTrip && (
        <>
          {/* ========================================================= */}
          {/* VÙNG 2: BỘ LỌC TÌM KIẾM CHUYẾN XE (KHÔNG DÙNG ICON)       */}
          {/* ========================================================= */}
          <div className="agent-panel-box">
            
            {/* Dòng 1: Điểm đi, Nút đảo chiều, Điểm đến, Ngày đi, Biển số */}
            <div className="agent-filter-grid">
              
              {/* Điểm xuất phát */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Điểm Xuất Phát
                </label>
                <input
                  type="text"
                  className="agent-form-control"
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
                  <div className="agent-suggestion-box">
                    {startSuggestions.map((loc, idx) => (
                      <div
                        key={idx}
                        className="agent-suggestion-item"
                        onClick={() => {
                          setStartPoint(loc.name);
                          setShowStartSuggestions(false);
                        }}
                      >
                        {loc.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nút đổi chiều */}
              <div>
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  style={{
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Đổi chiều điểm đi và điểm đến"
                >
                  Đổi Chiều
                </button>
              </div>

              {/* Điểm đến */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Điểm Đến
                </label>
                <input
                  type="text"
                  className="agent-form-control"
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
                  <div className="agent-suggestion-box">
                    {endSuggestions.map((loc, idx) => (
                      <div
                        key={idx}
                        className="agent-suggestion-item"
                        onClick={() => {
                          setEndPoint(loc.name);
                          setShowEndSuggestions(false);
                        }}
                      >
                        {loc.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ngày khởi hành */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Ngày Khởi Hành
                </label>
                <input
                  type="date"
                  className="agent-form-control"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </div>

              {/* Tìm nhanh theo xe / biển số */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Biển Số / Dòng Xe
                </label>
                <input
                  type="text"
                  className="agent-form-control"
                  placeholder="Tìm biển số (vd: 51B-044.44)..."
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                />
              </div>

            </div>

            {/* Dòng 2: Nút chọn ngày nhanh & Khung giờ & Loại xe & Sắp xếp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
              
              {/* Chọn ngày nhanh */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>Chọn ngày:</span>
                <button
                  type="button"
                  className={`agent-pill-btn ${departureDate === '' ? 'active' : ''}`}
                  onClick={() => setQuickDate(null)}
                >
                  Tất Cả Ngày
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${departureDate === todayStr ? 'active' : ''}`}
                  onClick={() => setQuickDate(0)}
                >
                  Hôm Nay
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${departureDate === tomorrowStr ? 'active' : ''}`}
                  onClick={() => setQuickDate(1)}
                >
                  Ngày Mai
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${departureDate === dayAfterTomorrowStr ? 'active' : ''}`}
                  onClick={() => setQuickDate(2)}
                >
                  Ngày Kia
                </button>
              </div>

              {/* Lọc khung giờ */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>Khung giờ:</span>
                <button
                  type="button"
                  className={`agent-pill-btn ${timeRange === 'all' ? 'active' : ''}`}
                  onClick={() => setTimeRange('all')}
                >
                  Tất Cả
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${timeRange === 'morning' ? 'active' : ''}`}
                  onClick={() => setTimeRange('morning')}
                >
                  Sáng (06:00 - 12:00)
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${timeRange === 'afternoon' ? 'active' : ''}`}
                  onClick={() => setTimeRange('afternoon')}
                >
                  Chiều (12:00 - 18:00)
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${timeRange === 'evening' ? 'active' : ''}`}
                  onClick={() => setTimeRange('evening')}
                >
                  Tối (18:00 - 24:00)
                </button>
              </div>

            </div>

            {/* Dòng 3: Loại xe & Tùy chọn còn chỗ & Sắp xếp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              
              {/* Loại xe */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>Loại xe:</span>
                <button
                  type="button"
                  className={`agent-pill-btn ${busType === 'all' ? 'active' : ''}`}
                  onClick={() => setBusType('all')}
                >
                  Mọi Loại Xe
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${busType === 'Xe Giường Nằm' ? 'active' : ''}`}
                  onClick={() => setBusType('Xe Giường Nằm')}
                >
                  Xe Giường Nằm
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${busType === 'Xe Ghế Ngồi' ? 'active' : ''}`}
                  onClick={() => setBusType('Xe Ghế Ngồi')}
                >
                  Xe Ghế Ngồi
                </button>
                <button
                  type="button"
                  className={`agent-pill-btn ${busType === 'Limousine' ? 'active' : ''}`}
                  onClick={() => setBusType('Limousine')}
                >
                  Limousine
                </button>
              </div>

              {/* Tùy chọn & Sắp xếp */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyAvailableSeats}
                    onChange={(e) => setOnlyAvailableSeats(e.target.checked)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  Chỉ chuyến còn chỗ
                </label>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', background: '#fff' }}
                  >
                    <option value="early">Khởi hành sớm</option>
                    <option value="price_low">Giá vé thấp</option>
                    <option value="most_seats">Ghế trống nhiều</option>
                  </select>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================= */}
          {/* VÙNG 3: DANH SÁCH CHUYẾN XE KHẢ DỤNG                       */}
          {/* ========================================================= */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Danh Sách Chuyến Xe Khả Dụng {departureDate ? `- ${departureDate === todayStr ? 'Hôm Nay' : departureDate === tomorrowStr ? 'Ngày Mai' : 'Ngày'} (${new Date(departureDate + 'T00:00:00').toLocaleDateString('vi-VN')})` : '(Tất Cả Các Ngày)'} ({filteredTrips.length} chuyến)
            </h2>
            {departureDate && (
              <button
                type="button"
                onClick={() => setDepartureDate('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Xem tất cả các ngày
              </button>
            )}
          </div>

          {loading ? (
            <div className="agent-panel-box" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Đang nạp dữ liệu chuyến xe từ CSDL...</div>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="agent-panel-box" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
              <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#334155', marginBottom: '4px' }}>
                Không tìm thấy chuyến xe nào phù hợp
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                Vui lòng thử chọn ngày khác hoặc thay đổi điểm xuất phát / điểm đến để tìm chuyến.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredTrips.map(trip => {
                const totalSeats = trip.busId?.totalSeats || 36;
                const bookedCount = trip.bookedSeats?.length || 0;
                const availableSeats = Math.max(0, totalSeats - bookedCount);
                const isSoldOut = availableSeats === 0;
                
                const depDateObj = new Date(trip.departureTime);
                const isDeparted = depDateObj < new Date();
                const timeStr = depDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                const dateStr = depDateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

                return (
                  <div
                    key={trip._id}
                    className={`agent-trip-row ${isDeparted ? 'departed' : ''}`}
                    style={{
                      borderLeft: isDeparted ? '4px solid #cbd5e1' : isSoldOut ? '4px solid #ef4444' : '4px solid #2563eb'
                    }}
                  >
                    {/* Cột 1: Tuyến đường & Dòng xe */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.98rem', color: isDeparted ? '#64748b' : '#0f172a' }}>
                          {trip.routeId?.startPoint || 'N/A'} ➔ {trip.routeId?.endPoint || 'N/A'}
                        </span>
                        {isDeparted && (
                          <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            Đã xuất bến
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          {trip.busId?.type || 'Xe Khách'}
                        </span>
                        <span>Biển số: <strong style={{ color: '#0f172a' }}>{trip.busId?.plateNumber || 'N/A'}</strong></span>
                      </div>
                    </div>

                    {/* Cột 2: Thời gian xuất phát */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: isDeparted ? '#64748b' : '#0f172a' }}>
                        {timeStr}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {dateStr}
                      </div>
                    </div>

                    {/* Cột 3: Tình trạng chỗ */}
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>Tình trạng chỗ:</div>
                      {isSoldOut ? (
                        <div>
                          <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '0.85rem' }}>
                            Đã hết vé (0/{totalSeats})
                          </span>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Toàn bộ ghế đã được đặt</div>
                        </div>
                      ) : (
                        <div>
                          <span style={{ color: isDeparted ? '#64748b' : '#15803d', fontWeight: '800', fontSize: '0.85rem' }}>
                            Còn {availableSeats}/{totalSeats} chỗ trống
                          </span>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Đã bán: {bookedCount} ghế</div>
                        </div>
                      )}
                    </div>

                    {/* Cột 4: Giá vé */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Giá vé</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '900', color: isDeparted ? '#64748b' : '#0f172a' }}>
                        {formatCurrency(trip.price)}
                      </div>
                    </div>

                    {/* Cột 5: Nút thao tác */}
                    <div style={{ textAlign: 'right' }}>
                      {isDeparted ? (
                        <button
                          type="button"
                          disabled
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#f1f5f9',
                            color: '#94a3b8',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'not-allowed'
                          }}
                        >
                          Đã Xuất Bến
                        </button>
                      ) : isSoldOut ? (
                        <button
                          type="button"
                          disabled
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#fee2e2',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'not-allowed'
                          }}
                        >
                          Hết Vé
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTrip(trip);
                            setSelectedSeats([]);
                            setSelectedFloor('lower');
                            setSelectedPickup(trip.pickupPoints?.[0]?.location || '');
                            setSelectedDropoff(trip.dropoffPoints?.[0]?.location || '');
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                          }}
                        >
                          Chọn Mua Vé
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

      {/* ========================================================= */}
      {/* VÙNG 4: SƠ ĐỒ CHỌN GHẾ & FORM XUẤT VÉ TRỰC TIẾP TẠI QUẦY  */}
      {/* ========================================================= */}
      {selectedTrip && (
        <div className="agent-panel-box" style={{ animation: 'fadeIn 0.25s ease' }}>
          
          {/* Header chọn vé */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tiến Hành Xuất Vé Cho Chuyến
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a', margin: '2px 0 4px 0' }}>
                {selectedTrip.routeId?.startPoint} ➔ {selectedTrip.routeId?.endPoint}
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Khởi hành: <strong style={{ color: '#0f172a' }}>{new Date(selectedTrip.departureTime).toLocaleTimeString('vi-VN')}</strong> ({new Date(selectedTrip.departureTime).toLocaleDateString('vi-VN')}) • Xe: {selectedTrip.busId?.plateNumber} ({selectedTrip.busId?.type})
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTrip(null)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Quay Lại Danh Sách
            </button>
          </div>

          <form onSubmit={handleCreateBooking}>
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '2rem', alignItems: 'start' }}>

              {/* CỘT TRÁI: SƠ ĐỒ GHẾ XE */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontWeight: '800', fontSize: '0.9rem' }}>
                  Sơ Đồ Ghế Xe ({selectedTrip.busId?.type || 'Xe khách'})
                </h3>

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
                    <div style={{ width: '100%', maxWidth: '300px' }}>
                      {hasUpperFloor && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}>
                          <button
                            type="button"
                            style={{
                              padding: '5px 12px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              backgroundColor: activeFloor === 'lower' ? '#2563eb' : '#e2e8f0',
                              color: activeFloor === 'lower' ? '#ffffff' : '#334155',
                              border: 'none',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedFloor('lower')}
                          >
                            Tầng Dưới (Tầng 1)
                          </button>
                          <button
                            type="button"
                            style={{
                              padding: '5px 12px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              backgroundColor: activeFloor === 'upper' ? '#2563eb' : '#e2e8f0',
                              color: activeFloor === 'upper' ? '#ffffff' : '#334155',
                              border: 'none',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedFloor('upper')}
                          >
                            Tầng Trên (Tầng 2)
                          </button>
                        </div>
                      )}

                      {/* Đầu xe */}
                      <div style={{
                        padding: '8px 12px',
                        background: '#0f172a',
                        borderRadius: '10px 10px 0 0',
                        color: '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textAlign: 'center',
                        letterSpacing: '1px'
                      }}>
                        KHU VỰC TÀI XẾ &amp; CỬA LÊN
                      </div>

                      {/* Lưới ghế */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns || 3}, 1fr)`,
                        gap: '8px',
                        padding: '1rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '0 0 10px 10px',
                        backgroundColor: '#ffffff'
                      }}>
                        {currentFloorRows.flat().map((seat, index) => {
                          if (seat === null) {
                            return <div key={`spacer-${index}`} style={{ height: '40px' }}></div>;
                          }

                          const isBooked = (selectedTrip.bookedSeats || []).includes(seat);
                          const isSelected = selectedSeats.includes(seat);

                          let seatBg = 'rgba(37, 99, 235, 0.06)';
                          let seatBorder = '#bfdbfe';
                          let seatColor = '#2563eb';

                          if (isBooked) {
                            seatBg = '#f1f5f9';
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
                                height: '40px',
                                borderRadius: '6px',
                                border: `2px solid ${seatBorder}`,
                                backgroundColor: seatBg,
                                color: seatColor,
                                fontWeight: '800',
                                fontSize: '0.8rem',
                                cursor: isBooked ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.12s'
                              }}
                              onClick={() => handleSeatClick(seat)}
                            >
                              {seat}
                            </button>
                          );
                        })}
                      </div>

                      {/* Chú thích màu ghế */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '0.85rem', fontSize: '0.72rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '10px', height: '10px', border: '2px solid #bfdbfe', backgroundColor: 'rgba(37, 99, 235, 0.08)', borderRadius: '2px' }}></span>
                          <span>Trống</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px' }}></span>
                          <span>Đang chọn</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '10px', height: '10px', backgroundColor: '#cbd5e1', borderRadius: '2px' }}></span>
                          <span>Đã bán</span>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>

              {/* CỘT PHẢI: THÔNG TIN XUẤT VÉ & THANH TOÁN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '0.95rem' }}>
                  Thông Tin Hành Khách &amp; Thanh Toán Tại Quầy
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Điểm Đón Của Khách *
                    </label>
                    <select
                      className="agent-form-control"
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
                    <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Điểm Xuống Của Khách *
                    </label>
                    <select
                      className="agent-form-control"
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Họ Và Tên Khách Hàng *
                    </label>
                    <input
                      type="text"
                      className="agent-form-control"
                      placeholder="Nhập họ tên người đi xe..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Số Điện Thoại Khách Hàng *
                    </label>
                    <input
                      type="tel"
                      className="agent-form-control"
                      placeholder="Nhập SĐT nhận vé SMS..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Hình Thức Thu Tiền Tại Quầy *
                  </label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: '#1e293b', fontWeight: '700' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                        style={{ accentColor: '#2563eb' }}
                      />
                      Tiền Mặt (Thu trực tiếp tại quầy)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: '#1e293b', fontWeight: '700' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cashless"
                        checked={paymentMethod === 'cashless'}
                        onChange={() => setPaymentMethod('cashless')}
                        style={{ accentColor: '#2563eb' }}
                      />
                      Quét Mã VietQR / Thẻ POS
                    </label>
                  </div>
                </div>

                {/* Hộp tóm tắt tổng tiền */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>
                    <span>Vị trí ghế đã chọn:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn ghế'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>
                    <span>Đơn giá vé:</span>
                    <strong style={{ color: '#0f172a' }}>{formatCurrency(selectedTrip.price)}</strong>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', margin: '0.6rem 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem', color: '#2563eb' }}>
                    <span>Tổng Tiền Thu Khách:</span>
                    <span>{formatCurrency(selectedTrip.price * selectedSeats.length)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '800',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)'
                  }}
                >
                  {submitting ? 'Đang Xử Lý Xuất Vé...' : 'Xác Nhận Thu Tiền & Xuất Vé'}
                </button>

              </div>

            </div>
          </form>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL BIÊN LAI IN VÉ TẠI QUẦY (KHÔNG DÙNG ICON)            */}
      {/* ========================================================= */}
      {printTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div style={{ maxWidth: '380px', width: '100%', fontFamily: 'Courier New, monospace', backgroundColor: '#ffffff', border: '2px solid #000000', padding: '1.25rem', borderRadius: '6px' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: '0 0 2px 0', fontWeight: '800' }}>NHÀ XE AN BÌNH LINES</h3>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem' }}>HỆ THỐNG VẬN TẢI HÀNH KHÁCH CAO CẤP</p>
              <div style={{ margin: '0.4rem 0', borderTop: '1px dashed #000000' }}></div>
              <h4 style={{ margin: '4px 0', fontSize: '0.95rem', fontWeight: '800' }}>VÉ XE KHÁCH KIÊM BIÊN LAI THU TIỀN</h4>
            </div>

            <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Mã đơn (Order Code):</strong> #{printTarget.orderCode}</div>
              <div><strong>Hành khách:</strong> {printTarget.customerName}</div>
              <div><strong>SĐT liên hệ:</strong> {printTarget.customerPhone}</div>
              <div style={{ margin: '4px 0', borderTop: '1px dashed #000000' }}></div>
              <div><strong>Tuyến:</strong> {printTarget.tripId?.routeId?.startPoint} ➔ {printTarget.tripId?.routeId?.endPoint}</div>
              <div><strong>Xuất bến:</strong> {new Date(printTarget.tripId?.departureTime).toLocaleTimeString('vi-VN')} ({new Date(printTarget.tripId?.departureTime).toLocaleDateString('vi-VN')})</div>
              <div><strong>Xe:</strong> {printTarget.tripId?.busId?.plateNumber} ({printTarget.tripId?.busId?.type})</div>
              <div><strong>Ghế đã đặt:</strong> {printTarget.seats?.join(', ')}</div>
              <div><strong>Số lượng vé:</strong> {printTarget.seats?.length} vé</div>
              <div style={{ margin: '4px 0', borderTop: '1px dashed #000000' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: '800' }}>
                <span>TỔNG TIỀN:</span>
                <span>{formatCurrency((printTarget.tripId?.price || 0) * (printTarget.seats?.length || 1))}</span>
              </div>
              <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                Trạng thái: ĐÃ THANH TOÁN TẠI QUẦY
              </div>
            </div>

            {printTarget.qrSignature && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0.85rem', textAlign: 'center' }}>
                <div style={{ border: '1px solid #000', padding: '4px', backgroundColor: '#fff', display: 'inline-block' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                      JSON.stringify({ ticketId: printTarget._id, signature: printTarget.qrSignature })
                    )}`}
                    alt="Mã QR Soát Vé"
                    style={{ width: '110px', height: '110px', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.62rem', marginTop: '2px', color: '#000', fontWeight: '800' }}>
                  MÃ QR XÁC THỰC LÊN XE
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #000', marginTop: '0.85rem', paddingTop: '0.65rem', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: '6px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                In Hóa Đơn Ra Giấy
              </button>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                style={{ padding: '6px 14px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL THANH TOÁN VIETQR KHÔNG DÙNG TIỀN MẶT               */}
      {/* ========================================================= */}
      {showQRModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div style={{ maxWidth: '380px', width: '100%', backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              Quét Mã VietQR Thanh Toán
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#64748b' }}>
              Hướng màn hình cho khách hàng quét mã bằng ứng dụng Ngân Hàng bất kỳ.
            </p>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `https://pay.anbinhlines.vn/checkout/${showQRModal._id}`
                )}`}
                alt="VietQR Code"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ marginTop: '0.85rem', fontSize: '0.85rem', fontWeight: '800', color: '#2563eb' }}>
              Số tiền: {formatCurrency((showQRModal.tripId?.price || 0) * (showQRModal.seats?.length || 1))}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              Nội dung CK: ANBINH {showQRModal.orderCode}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => {
                  setPrintTarget(showQRModal);
                  setShowQRModal(null);
                }}
                style={{
                  padding: '7px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Khách Đã Thanh Toán &amp; In Vé
              </button>
              <button
                type="button"
                onClick={() => setShowQRModal(null)}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentBookingPage;
