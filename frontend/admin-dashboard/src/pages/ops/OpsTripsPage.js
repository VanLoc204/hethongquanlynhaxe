import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const OpsTripsPage = () => {
  const { token } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null); // null = add new, object = edit
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Form states
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState('');
  
  // Pickup / Dropoff subforms
  const [pickupPoints, setPickupPoints] = useState([
    { time: '08:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }
  ]);
  const [dropoffPoints, setDropoffPoints] = useState([
    { time: '15:30', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }
  ]);

  // Filters & Views states
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [filterRoute, setFilterRoute] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [calendarRefDate, setCalendarRefDate] = useState(new Date());
  
  // Advanced filters states
  const [filterBusType, setFilterBusType] = useState('all');
  const [filterTimeOfDay, setFilterTimeOfDay] = useState('all');
  const [filterSeats, setFilterSeats] = useState('all');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterAmenity, setFilterAmenity] = useState('all');

  // Hover Tooltip State for Pickup/Dropoff Stops Preview
  const [hoveredTrip, setHoveredTrip] = useState(null);
  const [tripTooltipPos, setTripTooltipPos] = useState({ x: 0, y: 0 });

  // Auto scheduling modal states
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoStartDate, setAutoStartDate] = useState('2026-07-24');
  const [autoEndDate, setAutoEndDate] = useState('2026-07-30');
  const [autoRouteId, setAutoRouteId] = useState('');
  const [autoBusId, setAutoBusId] = useState('');
  const [autoSlots, setAutoSlots] = useState([
    { departureTime: '08:00', arrivalTime: '15:00' }
  ]);

  // Sync auto scheduling dropdown default values when routes/buses load
  useEffect(() => {
    if (routes.length > 0 && !autoRouteId) setAutoRouteId(routes[0]._id);
    if (buses.length > 0 && !autoBusId) setAutoBusId(buses[0]._id);
  }, [routes, buses]);

  // Jump to specific week when filterDate is selected
  useEffect(() => {
    if (filterDate) {
      setCalendarRefDate(new Date(filterDate));
    }
  }, [filterDate]);

  const getDefaultPoints = (routeIdVal, depTimeStr, arrTimeStr) => {
    const selectedRoute = routes.find(r => r._id === routeIdVal);
    if (!selectedRoute) return { pickup: [], dropoff: [] };

    const start = selectedRoute.startPoint.toLowerCase();
    const end = selectedRoute.endPoint.toLowerCase();

    let pickup = [];
    let dropoff = [];

    if (start.includes('hồ chí minh') || start.includes('hcm')) {
      pickup = [{ time: depTimeStr || '08:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }];
    } else if (start.includes('đà lạt')) {
      pickup = [{ time: depTimeStr || '08:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }];
    } else if (start.includes('cần thơ')) {
      pickup = [{ time: depTimeStr || '08:00', location: 'Bến xe Cần Thơ', address: 'Bến xe Cần Thơ, TP. Cần Thơ' }];
    } else {
      pickup = [{ time: depTimeStr || '08:00', location: `Bến xe ${selectedRoute.startPoint}`, address: `Địa chỉ tại ${selectedRoute.startPoint}` }];
    }

    if (end.includes('hồ chí minh') || end.includes('hcm')) {
      dropoff = [{ time: arrTimeStr || '15:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }];
    } else if (end.includes('đà lạt')) {
      dropoff = [{ time: arrTimeStr || '15:00', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }];
    } else if (end.includes('cần thơ')) {
      dropoff = [{ time: arrTimeStr || '15:00', location: 'Bến xe Cần Thơ', address: 'Bến xe Cần Thơ, TP. Cần Thơ' }];
    } else {
      dropoff = [{ time: arrTimeStr || '15:00', location: `Bến xe ${selectedRoute.endPoint}`, address: `Địa chỉ tại ${selectedRoute.endPoint}` }];
    }

    return { pickup, dropoff };
  };

  const handleOpenAutoModal = () => {
    setAutoStartDate('2026-07-24');
    setAutoEndDate('2026-07-30');
    setAutoRouteId(routes[0]?._id || '');
    setAutoBusId(buses[0]?._id || '');
    setAutoSlots([{ departureTime: '08:00', arrivalTime: '15:00' }]);
    setShowAutoModal(true);
  };

  const handleAddSlot = () => {
    setAutoSlots([...autoSlots, { departureTime: '08:00', arrivalTime: '15:00' }]);
  };

  const handleRemoveSlot = (idx) => {
    setAutoSlots(autoSlots.filter((_, i) => i !== idx));
  };

  const handleSlotChange = (idx, field, val) => {
    const updated = [...autoSlots];
    updated[idx][field] = val;
    setAutoSlots(updated);
  };

  const handleAutoScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!autoRouteId || !autoBusId || !autoStartDate || !autoEndDate || autoSlots.length === 0) {
      showToast('Vui lòng cung cấp đầy đủ thông tin để xếp lịch tự động.', 'error');
      return;
    }

    // Build configurations with smart station lookup
    const configs = autoSlots.map(slot => {
      const { pickup, dropoff } = getDefaultPoints(autoRouteId, slot.departureTime, slot.arrivalTime);
      return {
        routeId: autoRouteId,
        busId: autoBusId,
        departureTime: slot.departureTime,
        arrivalTime: slot.arrivalTime,
        pickupPoints: pickup,
        dropoffPoints: dropoff
      };
    });

    try {
      const res = await fetch(`${API_BASE}/trips/ops/trips/auto-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: autoStartDate,
          endDate: autoEndDate,
          configs
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Xếp lịch tự động thành công!');
        setShowAutoModal(false);
        fetchTrips();
      } else {
        showToast(data.message || 'Lỗi xếp lịch tự động.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const getDaysOfWeek = (refDate) => {
    const date = new Date(refDate);
    const day = date.getDay(); // 0 = Sunday, 1 = Monday...
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const startOfWeek = new Date(date.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getFilteredTrips = () => {
    return trips.filter(trip => {
      // Filter by Route
      if (filterRoute && (!trip.routeId || trip.routeId._id !== filterRoute)) {
        return false;
      }
      // Filter by Date (only list view is filtered by this input directly)
      if (viewMode === 'list' && filterDate) {
        const depDate = new Date(trip.departureTime);
        const depDateStr = depDate.toLocaleDateString('en-CA');
        if (depDateStr !== filterDate) {
          return false;
        }
      }

      // Filter by Bus Type
      if (filterBusType !== 'all') {
        const typeStr = (trip.busId?.type || '').toLowerCase();
        if (!typeStr.includes(filterBusType.toLowerCase())) {
          return false;
        }
      }

      // Filter by Seats
      if (filterSeats !== 'all') {
        const seatsVal = Number(filterSeats);
        if (trip.busId?.totalSeats !== seatsVal) {
          return false;
        }
      }

      // Filter by Max Price
      if (filterMaxPrice) {
        const maxPriceVal = Number(filterMaxPrice);
        if (trip.price > maxPriceVal) {
          return false;
        }
      }

      // Filter by Time of Day
      if (filterTimeOfDay !== 'all') {
        const depDate = new Date(trip.departureTime);
        const hours = depDate.getHours();
        if (filterTimeOfDay === 'morning') { // 06:00 - 12:00
          if (hours < 6 || hours >= 12) return false;
        } else if (filterTimeOfDay === 'afternoon') { // 12:00 - 18:00
          if (hours < 12 || hours >= 18) return false;
        } else if (filterTimeOfDay === 'evening') { // 18:00 - 06:00
          if (hours >= 6 && hours < 18) return false;
        }
      }

      // Filter by Accompanying Services (Amenity)
      if (filterAmenity !== 'all') {
        const busAmenities = trip.busId?.amenities || [];
        const hasAmenity = busAmenities.some(a => a.toLowerCase().includes(filterAmenity.toLowerCase()));
        if (!hasAmenity) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
  };

  const filteredTrips = getFilteredTrips();

  const getTripsForDay = (dayDate) => {
    const dayStr = dayDate.toLocaleDateString('en-CA');
    return filteredTrips
      .filter(trip => {
        const depDate = new Date(trip.departureTime);
        return depDate.toLocaleDateString('en-CA') === dayStr;
      })
      .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/ops/trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips);
      }
    } catch {
      showToast('Không thể tải danh sách chuyến xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/ops/routes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Only allow approved routes for scheduling trips
        const approved = (data.routes || []).filter(r => r.status === 'approved' || !r.status);
        setRoutes(approved);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBuses = async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBuses(data.buses);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrips();
      fetchRoutes();
      fetchBuses();
    }
  }, [token]);

  // Auto-fetch price when routeId or busId changes
  useEffect(() => {
    const fetchBasePrice = async () => {
      if (!routeId || !busId) return;
      try {
        const res = await fetch(`${API_BASE}/pricing/base-prices/lookup?routeId=${routeId}&busId=${busId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.price !== null) {
          setPrice(data.price);
        } else {
          setPrice('');
        }
      } catch (err) {
        console.error('Lỗi tải giá vé cơ bản:', err);
      }
    };
    fetchBasePrice();
  }, [routeId, busId, token]);

  // Helper to format ISO datetime to local string suitable for input
  const formatDatetimeForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzoffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleOpenAdd = () => {
    setEditingTrip(null);
    setRouteId(routes[0]?._id || '');
    setBusId(buses[0]?._id || '');
    setDepartureTime('');
    setArrivalTime('');
    setPrice('');
    setPickupPoints([
      { time: '08:00', location: 'Trạm Đi', address: 'Địa chỉ xuất phát' }
    ]);
    setDropoffPoints([
      { time: '15:00', location: 'Trạm Đến', address: 'Địa chỉ kết thúc' }
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (trip) => {
    setEditingTrip(trip);
    setRouteId(trip.routeId?._id || '');
    setBusId(trip.busId?._id || '');
    setDepartureTime(formatDatetimeForInput(trip.departureTime));
    setArrivalTime(formatDatetimeForInput(trip.arrivalTime));
    setPrice(trip.price);
    setPickupPoints(trip.pickupPoints || []);
    setDropoffPoints(trip.dropoffPoints || []);
    setShowModal(true);
  };

  const handleDelete = (trip) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa chuyến xe',
      message: `Bạn có chắc chắn muốn xóa chuyến xe ngày ${new Date(trip.departureTime).toLocaleDateString('vi-VN')}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/trips/ops/trips/${trip._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Xóa chuyến xe thành công!');
            fetchTrips();
          } else {
            showToast(data.message || 'Lỗi xóa chuyến xe.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  const handleAddPickupPoint = () => {
    setPickupPoints([...pickupPoints, { time: '', location: '', address: '' }]);
  };

  const handleRemovePickupPoint = (idx) => {
    setPickupPoints(pickupPoints.filter((_, i) => i !== idx));
  };

  const handlePickupChange = (idx, field, val) => {
    const updated = [...pickupPoints];
    updated[idx][field] = val;
    setPickupPoints(updated);
  };

  const handleAddDropoffPoint = () => {
    setDropoffPoints([...dropoffPoints, { time: '', location: '', address: '' }]);
  };

  const handleRemoveDropoffPoint = (idx) => {
    setDropoffPoints(dropoffPoints.filter((_, i) => i !== idx));
  };

  const handleDropoffChange = (idx, field, val) => {
    const updated = [...dropoffPoints];
    updated[idx][field] = val;
    setDropoffPoints(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!routeId || !busId || !departureTime || !arrivalTime || !price) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    const payload = {
      routeId,
      busId,
      departureTime,
      arrivalTime,
      price: Number(price),
      pickupPoints,
      dropoffPoints
    };

    try {
      const url = editingTrip 
        ? `${API_BASE}/trips/ops/trips/${editingTrip._id}`
        : `${API_BASE}/trips/ops/trips`;
      const method = editingTrip ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingTrip ? 'Cập nhật chuyến xe thành công!' : 'Tạo chuyến xe mới thành công!');
        setShowModal(false);
        fetchTrips();
      } else {
        showToast(data.message || 'Lỗi xử lý yêu cầu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  return (
    <section className="panel" style={{ minHeight: '400px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Quản lý chuyến xe</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {filteredTrips.length} chuyến xe hiển thị (Tổng số: {trips.length})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleOpenAutoModal} className="btn btn-secondary" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: '600' }}>
            Xếp lịch tự động
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            + Tạo chuyến xe mới
          </button>
        </div>
      </div>

      {/* Filters & View Switcher */}
      <div style={{
        background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '12px',
        padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Row 1: Route, Date, View mode */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Tuyến:</span>
              <select 
                value={filterRoute} 
                onChange={(e) => setFilterRoute(e.target.value)}
                className="form-control"
                style={{ width: '180px', padding: '6px 12px' }}
              >
                <option value="">Tất cả các tuyến</option>
                {routes.map(r => (
                  <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Thời gian:</span>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="form-control"
                style={{ width: '160px', padding: '5px 12px' }}
              />
            </div>
          </div>

          {/* Right: View Switcher */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            <button 
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', background: viewMode === 'list' ? 'white' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Danh sách
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', background: viewMode === 'calendar' ? 'white' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Lịch tuần
            </button>
          </div>
        </div>

        {/* Row 2: Advanced filters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid #e2e8f0' 
        }}>
          {/* 1. Loại xe */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Loại xe:</label>
            <select
              value={filterBusType}
              onChange={(e) => setFilterBusType(e.target.value)}
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="all">Tất cả loại xe</option>
              <option value="giường nằm">Giường nằm</option>
              <option value="ghế ngồi">Ghế ngồi</option>
              <option value="limousine">Limousine / Phòng nằm</option>
            </select>
          </div>

          {/* 2. Khung giờ chạy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Khung giờ chạy:</label>
            <select
              value={filterTimeOfDay}
              onChange={(e) => setFilterTimeOfDay(e.target.value)}
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="all">Tất cả khung giờ</option>
              <option value="morning">Buổi sáng (06:00 - 12:00)</option>
              <option value="afternoon">Buổi chiều (12:00 - 18:00)</option>
              <option value="evening">Buổi tối &amp; đêm (18:00 - 06:00)</option>
            </select>
          </div>

          {/* 3. Số chỗ ngồi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Số chỗ:</label>
            <select
              value={filterSeats}
              onChange={(e) => setFilterSeats(e.target.value)}
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="all">Tất cả số chỗ</option>
              <option value="16">16 chỗ</option>
              <option value="20">20 chỗ</option>
              <option value="22">22 chỗ</option>
              <option value="29">29 chỗ</option>
              <option value="32">32 chỗ</option>
              <option value="34">34 chỗ</option>
              <option value="44">44 chỗ</option>
              <option value="45">45 chỗ</option>
            </select>
          </div>

          {/* 4. Giá vé tối đa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Giá vé tối đa (VND):</label>
            <input
              type="number"
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(e.target.value)}
              placeholder="Ví dụ: 300000"
              className="form-control"
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
            />
          </div>

          {/* 5. Dịch vụ đi kèm */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Dịch vụ đi kèm:</label>
            <select
              value={filterAmenity}
              onChange={(e) => setFilterAmenity(e.target.value)}
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="all">Tất cả dịch vụ</option>
              <option value="wifi">Wifi miễn phí</option>
              <option value="điều hòa">Điều hòa</option>
              <option value="nước">Nước uống / Khăn lạnh</option>
              <option value="tivi">Màn hình Tivi</option>
              <option value="cổng sạc">Cổng sạc USB</option>
            </select>
          </div>
        </div>

        {/* Row 3: Action Buttons */}
        {(filterRoute || filterDate || filterBusType !== 'all' || filterTimeOfDay !== 'all' || filterSeats !== 'all' || filterMaxPrice || filterAmenity !== 'all') && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button 
              onClick={() => {
                setFilterRoute('');
                setFilterDate('');
                setFilterBusType('all');
                setFilterTimeOfDay('all');
                setFilterSeats('all');
                setFilterMaxPrice('');
                setFilterAmenity('all');
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700', color: '#ef4444', borderColor: '#fca5a5' }}
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Hover Itinerary Tooltip for Trips */}
      {hoveredTrip && (
        <div 
          style={{
            position: 'absolute',
            top: `${tripTooltipPos.y - 120}px`,
            left: `${tripTooltipPos.x}px`,
            zIndex: 9999,
            width: '380px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(37, 99, 235, 0.08)',
            border: '1px solid #cbd5e1',
            padding: '16px 20px',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          {/* Header Tooltip */}
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>
              Danh sách trạm đón/trả chuyến: <span style={{ color: '#2563eb' }}>{hoveredTrip.routeId ? `${hoveredTrip.routeId.startPoint} → ${hoveredTrip.routeId.endPoint}` : ''}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              Xe: <strong>{hoveredTrip.busId?.plateNumber || 'Chưa gán'}</strong> ({hoveredTrip.busId?.type || 'N/A'})
            </div>
          </div>

          {/* Timeline of Pickup & Dropoff Stops */}
          <div style={{ position: 'relative', paddingLeft: '20px' }}>
            {/* Timeline Line */}
            <div style={{
              position: 'absolute',
              top: '8px',
              bottom: '8px',
              left: '6px',
              width: '2px',
              backgroundColor: '#cbd5e1',
              borderRadius: '1px'
            }} />

            {/* Pickup Points */}
            {(hoveredTrip.pickupPoints || []).map((p, idx) => (
              <div key={`p-${idx}`} style={{ position: 'relative', marginBottom: '10px' }}>
                <div style={{
                  position: 'absolute',
                  left: '-18px',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 2px rgba(16,185,129,0.2)'
                }} />
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#059669', fontWeight: '700' }}>[{p.time || 'Đón'}]</span>
                  <span>{p.location}</span>
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '4px' }}>Điểm đón</span>
                </div>
                {p.address && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{p.address}</div>}
              </div>
            ))}

            {/* Dropoff Points */}
            {(hoveredTrip.dropoffPoints || []).map((d, idx) => (
              <div key={`d-${idx}`} style={{ position: 'relative', marginBottom: idx === hoveredTrip.dropoffPoints.length - 1 ? 0 : '10px' }}>
                <div style={{
                  position: 'absolute',
                  left: '-18px',
                  top: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 2px rgba(239,68,68,0.2)'
                }} />
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#dc2626', fontWeight: '700' }}>[{d.time || 'Trả'}]</span>
                  <span>{d.location}</span>
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>Điểm trả</span>
                </div>
                {d.address && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{d.address}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải danh sách chuyến xe...
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        filteredTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Chưa có chuyến xe nào khớp với điều kiện lọc.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredTrips.map((trip) => {
              const departureDate = new Date(trip.departureTime);
              const arrivalDate = new Date(trip.arrivalTime);
              const totalSeats = trip.busId?.totalSeats || 0;
              const bookedSeatsCount = trip.bookedSeats?.length || 0;
              
              return (
                <div 
                  key={trip._id} 
                  className="panel" 
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTripTooltipPos({
                      x: rect.left + window.scrollX + 280,
                      y: rect.top + window.scrollY
                    });
                    setHoveredTrip(trip);
                  }}
                  onMouseLeave={() => setHoveredTrip(null)}
                  style={{ 
                    display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', border: '1px solid var(--border-color)', borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Left info: Route & DateTime */}
                  <div style={{ minWidth: '220px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '6px' }}>
                      {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      Khởi hành: {departureDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Dự kiến đến: {arrivalDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    {/* Badge Trạm Đón/Trả */}
                    <div style={{ marginTop: '6px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        backgroundColor: '#eff6ff', 
                        color: '#2563eb', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        border: '1px solid #bfdbfe',
                        fontWeight: '600' 
                      }}>
                        {(trip.pickupPoints?.length || 0) + (trip.dropoffPoints?.length || 0)} Trạm đón/trả (Rê chuột)
                      </span>
                    </div>
                  </div>

                  {/* Middle info: Bus Details */}
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>
                      Xe: {trip.busId?.plateNumber || 'Chưa gán'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Loại: {trip.busId?.type || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '600' }}>
                      Đã đặt: {bookedSeatsCount}/{totalSeats} ghế (Còn {totalSeats - bookedSeatsCount} trống)
                    </div>
                  </div>

                  {/* Right info: Price & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '200px', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent)' }}>
                        {trip.price?.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(trip); }} 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(trip); }} 
                        className="btn btn-secondary" 
                        style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '8px 14px', fontSize: '0.85rem' }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Weekly Calendar View */
        <div>
          {/* Week Selector */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px', 
            background: '#ffffff', 
            padding: '16px 24px', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
            flexWrap: 'wrap', 
            gap: '12px' 
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  const prev = new Date(calendarRefDate);
                  prev.setDate(prev.getDate() - 7);
                  setCalendarRefDate(prev);
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                ← Tuần trước
              </button>
              <button 
                onClick={() => setCalendarRefDate(new Date())}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                Hôm nay
              </button>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(() => {
                const days = getDaysOfWeek(calendarRefDate);
                return `Tuần: ${days[0].toLocaleDateString('vi-VN')} - ${days[6].toLocaleDateString('vi-VN')}`;
              })()}
            </div>
            <button 
              onClick={() => {
                const next = new Date(calendarRefDate);
                next.setDate(next.getDate() + 7);
                setCalendarRefDate(next);
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
            >
              Tuần sau →
            </button>
          </div>

          {/* Grid columns */}
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '16px' }}>
            {getDaysOfWeek(calendarRefDate).map((dayDate, dayIdx) => {
              const dayTrips = getTripsForDay(dayDate);
              const isToday = dayDate.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');
              const daysOfWeekLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
              
              return (
                <div 
                  key={dayIdx} 
                  style={{
                    flex: 1, 
                    minWidth: '200px', 
                    background: isToday ? 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)' : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                    borderRadius: '16px', 
                    padding: '16px 12px', 
                    border: isToday ? '2px solid #2563eb' : '1px solid var(--border-color)',
                    boxShadow: isToday ? '0 8px 24px rgba(37, 99, 235, 0.08)' : '0 4px 12px rgba(0,0,0,0.02)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px'
                  }}
                >
                  {/* Column Header */}
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '4px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isToday ? '#1e40af' : '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {daysOfWeekLabels[dayIdx]}
                    </div>
                    <div style={{ 
                      display: 'inline-block',
                      marginTop: '6px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.85rem', 
                      backgroundColor: isToday ? '#2563eb' : 'transparent',
                      color: isToday ? '#ffffff' : '#64748b', 
                      fontWeight: '700' 
                    }}>
                      {dayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>

                  {/* Day trip list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: '150px' }}>
                    {dayTrips.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '120px', color: '#94a3b8' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', fontStyle: 'italic' }}>Không có chuyến</span>
                      </div>
                    ) : (
                      dayTrips.map(trip => {
                        const dep = new Date(trip.departureTime);
                        const depTime = dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        const totalSeats = trip.busId?.totalSeats || 0;
                        const bookedSeatsCount = trip.bookedSeats?.length || 0;

                        return (
                          <div 
                            key={trip._id}
                            style={{
                              background: '#ffffff', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '12px',
                              padding: '12px', 
                              boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '8px',
                              transition: 'transform 0.2s',
                            }}
                          >
                            <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                              {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                Giờ chạy: {depTime}
                              </span>
                              <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                Xe: {trip.busId?.plateNumber || 'Chưa gán'}
                              </span>
                            </div>
                            
                            {/* Occupancy Progress Bar */}
                            {(() => {
                              const percentage = totalSeats > 0 ? Math.min(100, Math.round((bookedSeatsCount / totalSeats) * 100)) : 0;
                              let progressColor = '#10b981'; // Green
                              if (percentage >= 85) progressColor = '#ef4444'; // Red
                              else if (percentage >= 50) progressColor = '#f59e0b'; // Amber

                              return (
                                <div style={{ marginTop: '2px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                                    <span>{bookedSeatsCount}/{totalSeats} ghế</span>
                                    <span>{percentage}%</span>
                                  </div>
                                  <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: progressColor, borderRadius: '3px' }} />
                                  </div>
                                </div>
                              );
                            })()}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                              <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                {trip.price?.toLocaleString('vi-VN')} đ
                              </span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  onClick={() => handleOpenEdit(trip)} 
                                  style={{ 
                                    padding: '5px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', 
                                    backgroundColor: '#ffffff', cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', outline: 'none'
                                  }}
                                >
                                  Sửa
                                </button>
                                <button 
                                  onClick={() => handleDelete(trip)} 
                                  style={{ 
                                    padding: '5px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #fecaca', 
                                    backgroundColor: '#fff5f5', color: '#ef4444', cursor: 'pointer', fontWeight: '600', outline: 'none'
                                  }}
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <div 
            className="panel" 
            style={{ 
              width: '100%', maxWidth: '650px', padding: '24px', margin: '40px auto', 
              maxHeight: '90vh', overflowY: 'auto', position: 'relative' 
            }}
          >
            <h3 style={{ marginBottom: '20px' }}>
              {editingTrip ? 'Cập nhật chuyến xe' : 'Tạo chuyến xe mới'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              {/* Route & Bus dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tuyến đường *</label>
                  <select 
                    className="form-control" 
                    value={routeId} 
                    onChange={(e) => setRouteId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn tuyến --</option>
                    {routes.map(r => (
                      <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Phương tiện (Xe) *</label>
                  <select 
                    className="form-control" 
                    value={busId} 
                    onChange={(e) => setBusId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn xe --</option>
                    {buses.map(b => (
                      <option key={b._id} value={b._id}>{b.plateNumber} ({b.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Times & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Giờ khởi hành *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={departureTime} 
                    onChange={(e) => setDepartureTime(e.target.value)} 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Giờ đến dự kiến *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={arrivalTime} 
                    onChange={(e) => setArrivalTime(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Giá vé (VNĐ) *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder={price === '' ? "Chưa thiết lập giá vé cho Tuyến & Loại xe này" : "Giá vé"}
                  disabled
                  required
                />
                <small style={{ color: price === '' ? '#ef4444' : '#10b981', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                  {price === '' 
                    ? "⚠️ Tuyến đường & loại xe này chưa được thiết lập giá vé bởi quản lý!" 
                    : "✓ Giá vé tự động áp dụng theo quy định của quản lý nhà xe."
                  }
                </small>
              </div>

              {/* Pickup points builder */}
              <div style={{ marginBottom: '20px', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>Điểm đón khách</h4>
                  <button type="button" onClick={handleAddPickupPoint} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                    + Thêm điểm đón
                  </button>
                </div>
                {pickupPoints.map((pt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Giờ (VD: 08:00)" 
                      value={pt.time} 
                      onChange={(e) => handlePickupChange(idx, 'time', e.target.value)}
                      style={{ width: '120px' }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Tên điểm đón" 
                      value={pt.location} 
                      onChange={(e) => handlePickupChange(idx, 'location', e.target.value)}
                      style={{ flex: 1 }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Địa chỉ chi tiết" 
                      value={pt.address} 
                      onChange={(e) => handlePickupChange(idx, 'address', e.target.value)}
                      style={{ flex: 1.5 }}
                      className="form-control"
                      required
                    />
                    {pickupPoints.length > 1 && (
                      <button type="button" onClick={() => handleRemovePickupPoint(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Dropoff points builder */}
              <div style={{ marginBottom: '24px', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>Điểm trả khách</h4>
                  <button type="button" onClick={handleAddDropoffPoint} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                    + Thêm điểm trả
                  </button>
                </div>
                {dropoffPoints.map((pt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Giờ (VD: 15:00)" 
                      value={pt.time} 
                      onChange={(e) => handleDropoffChange(idx, 'time', e.target.value)}
                      style={{ width: '120px' }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Tên điểm trả" 
                      value={pt.location} 
                      onChange={(e) => handleDropoffChange(idx, 'location', e.target.value)}
                      style={{ flex: 1 }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Địa chỉ chi tiết" 
                      value={pt.address} 
                      onChange={(e) => handleDropoffChange(idx, 'address', e.target.value)}
                      style={{ flex: 1.5 }}
                      className="form-control"
                      required
                    />
                    {dropoffPoints.length > 1 && (
                      <button type="button" onClick={() => handleRemoveDropoffPoint(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTrip ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto Scheduling Modal */}
      {showAutoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <div 
            className="panel" 
            style={{ 
              width: '100%', maxWidth: '600px', padding: '24px', margin: '40px auto', 
              maxHeight: '90vh', overflowY: 'auto', position: 'relative' 
            }}
          >
            <h3 style={{ marginBottom: '20px' }}>⚡ Xếp lịch chuyến xe tự động</h3>
            
            <form onSubmit={handleAutoScheduleSubmit}>
              {/* Date range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Từ ngày chạy *</label>
                  <input 
                    type="date" 
                    value={autoStartDate}
                    onChange={(e) => setAutoStartDate(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đến ngày chạy *</label>
                  <input 
                    type="date" 
                    value={autoEndDate}
                    onChange={(e) => setAutoEndDate(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Route & Bus */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Tuyến đường áp dụng *</label>
                  <select 
                    value={autoRouteId} 
                    onChange={(e) => setAutoRouteId(e.target.value)}
                    className="form-control"
                    required
                  >
                    {routes.map(r => (
                      <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phương tiện (Xe) *</label>
                  <select 
                    value={autoBusId} 
                    onChange={(e) => setAutoBusId(e.target.value)}
                    className="form-control"
                    required
                  >
                    {buses.map(b => (
                      <option key={b._id} value={b._id}>{b.plateNumber} ({b.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slots builder */}
              <div style={{ marginBottom: '24px', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>Khung giờ chạy trong ngày</h4>
                  <button type="button" onClick={handleAddSlot} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                    + Thêm khung giờ
                  </button>
                </div>
                {autoSlots.map((slot, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Giờ xuất phát:</span>
                      <input 
                        type="time" 
                        value={slot.departureTime}
                        onChange={(e) => handleSlotChange(idx, 'departureTime', e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Giờ đến dự kiến:</span>
                      <input 
                        type="time" 
                        value={slot.arrivalTime}
                        onChange={(e) => handleSlotChange(idx, 'arrivalTime', e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    {autoSlots.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSlot(idx)} 
                        style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.4rem', marginTop: '16px' }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAutoModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}>
                  ✓ Bắt đầu xếp lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="confirm-backdrop">
          <div className="confirm-card">
            <div className="confirm-header">{confirmModal.title}</div>
            <div className="confirm-body">{confirmModal.message}</div>
            <div className="confirm-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OpsTripsPage;
