import React, { useState, useEffect, useContext, useMemo } from 'react';
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
  const [repeatWeekly, setRepeatWeekly] = useState(true);
  
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

  const calculateStopTime = (baseTimeStr, offsetMinutes) => {
    if (!baseTimeStr || !baseTimeStr.includes(':')) return '';
    const [h, m] = baseTimeStr.split(':').map(Number);
    const total = h * 60 + m + (offsetMinutes || 0);
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const getPointsFromRoute = (routeIdVal, depTimeStr, arrTimeStr) => {
    const selectedRoute = routes.find(r => r._id === routeIdVal);
    if (!selectedRoute) return { pickup: [], dropoff: [] };

    let pickup = [];
    let dropoff = [];

    if (selectedRoute.stops && selectedRoute.stops.length > 0) {
      const pickupStops = selectedRoute.stops.filter(s => s.type === 'start' || s.type === 'pickup' || s.type === 'both');
      const dropoffStops = selectedRoute.stops.filter(s => s.type === 'end' || s.type === 'dropoff' || s.type === 'both');

      const baseDep = depTimeStr || '08:00';

      if (pickupStops.length > 0) {
        pickup = pickupStops.map(s => ({
          time: calculateStopTime(baseDep, s.arrivalTimeOffset || 0),
          location: s.name,
          address: s.address || '',
          lat: s.lat,
          lng: s.lng
        }));
      }

      if (dropoffStops.length > 0) {
        dropoff = dropoffStops.map((s, idx) => ({
          time: (idx === dropoffStops.length - 1 && arrTimeStr)
            ? arrTimeStr
            : calculateStopTime(baseDep, s.arrivalTimeOffset || 0),
          location: s.name,
          address: s.address || '',
          lat: s.lat,
          lng: s.lng
        }));
      }
    }

    if (pickup.length === 0) {
      pickup = [{ time: depTimeStr || '08:00', location: selectedRoute.startPoint, address: `Bến xe ${selectedRoute.startPoint}` }];
    }
    if (dropoff.length === 0) {
      dropoff = [{ time: arrTimeStr || '15:00', location: selectedRoute.endPoint, address: `Bến xe ${selectedRoute.endPoint}` }];
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
      const { pickup, dropoff } = getPointsFromRoute(autoRouteId, slot.departureTime, slot.arrivalTime);
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

  const handleRouteChange = (newRouteId) => {
    setRouteId(newRouteId);
    const depTimeStr = departureTime ? departureTime.split('T')[1]?.slice(0, 5) || '08:00' : '08:00';
    const arrTimeStr = arrivalTime ? arrivalTime.split('T')[1]?.slice(0, 5) || '15:00' : '15:00';
    const { pickup, dropoff } = getPointsFromRoute(newRouteId, depTimeStr, arrTimeStr);
    if (pickup.length > 0) setPickupPoints(pickup);
    if (dropoff.length > 0) setDropoffPoints(dropoff);
  };

  const handleDepartureChange = (val) => {
    setDepartureTime(val);
    if (val && val.includes('T')) {
      const timePart = val.split('T')[1]?.slice(0, 5);
      if (timePart && routeId) {
        const { pickup, dropoff } = getPointsFromRoute(routeId, timePart, arrivalTime?.split('T')[1]?.slice(0, 5));
        if (pickup.length > 0) setPickupPoints(pickup);
        if (dropoff.length > 0) setDropoffPoints(dropoff);

        // Auto calculate arrival time if route has last stop offset
        const selectedRoute = routes.find(r => r._id === routeId);
        if (selectedRoute && selectedRoute.stops && selectedRoute.stops.length > 0) {
          const dropoffs = selectedRoute.stops.filter(s => s.type === 'end' || s.type === 'dropoff' || s.type === 'both');
          const lastDropoff = dropoffs[dropoffs.length - 1];
          if (lastDropoff && typeof lastDropoff.arrivalTimeOffset === 'number' && lastDropoff.arrivalTimeOffset > 0) {
            const depDate = new Date(val);
            if (!isNaN(depDate.getTime())) {
              const newArrDate = new Date(depDate.getTime() + lastDropoff.arrivalTimeOffset * 60000);
              setArrivalTime(formatDatetimeForInput(newArrDate.toISOString()));
            }
          }
        }
      }
    }
  };

  const handleArrivalChange = (val) => {
    setArrivalTime(val);
    if (val && val.includes('T')) {
      const timePart = val.split('T')[1]?.slice(0, 5);
      if (timePart && dropoffPoints.length > 0) {
        setDropoffPoints(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = { ...updated[lastIdx], time: timePart };
          return updated;
        });
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingTrip(null);
    const initialRouteId = routes[0]?._id || '';
    setRouteId(initialRouteId);
    setBusId(buses[0]?._id || '');
    setDepartureTime('');
    setArrivalTime('');
    setPrice('');
    setRepeatWeekly(true);
    const { pickup, dropoff } = getPointsFromRoute(initialRouteId, '08:00', '15:00');
    setPickupPoints(pickup);
    setDropoffPoints(dropoff);
    setShowModal(true);
  };

  const handleSyncStopsWithRoute = () => {
    if (!routeId) {
      showToast('Vui lòng chọn tuyến đường trước.', 'warning');
      return;
    }
    const depTimeStr = departureTime ? departureTime.split('T')[1]?.slice(0, 5) || '08:00' : '08:00';
    const arrTimeStr = arrivalTime ? arrivalTime.split('T')[1]?.slice(0, 5) || '15:00' : '15:00';
    const { pickup, dropoff } = getPointsFromRoute(routeId, depTimeStr, arrTimeStr);
    setPickupPoints(pickup);
    setDropoffPoints(dropoff);
    showToast('Đã đồng bộ lại toàn bộ điểm đón và điểm trả từ Tuyến đường!');
  };

  const handleOpenEdit = (trip) => {
    setEditingTrip(trip);
    const rId = trip.routeId?._id || '';
    setRouteId(rId);
    setBusId(trip.busId?._id || '');
    const depFormatted = formatDatetimeForInput(trip.departureTime);
    const arrFormatted = formatDatetimeForInput(trip.arrivalTime);
    setDepartureTime(depFormatted);
    setArrivalTime(arrFormatted);
    setPrice(trip.price);
    setRepeatWeekly(true);

    let curPickup = trip.pickupPoints && trip.pickupPoints.length > 0 ? trip.pickupPoints : [];
    let curDropoff = trip.dropoffPoints && trip.dropoffPoints.length > 0 ? trip.dropoffPoints : [];

    // Auto-sync if trip had only 1 or 0 points
    if ((curPickup.length <= 1 || curDropoff.length <= 1) && rId) {
      const depTimeStr = depFormatted ? depFormatted.split('T')[1]?.slice(0, 5) || '08:00' : '08:00';
      const arrTimeStr = arrFormatted ? arrFormatted.split('T')[1]?.slice(0, 5) || '15:00' : '15:00';
      const pts = getPointsFromRoute(rId, depTimeStr, arrTimeStr);
      if (curPickup.length <= 1 && pts.pickup.length > 0) curPickup = pts.pickup;
      if (curDropoff.length <= 1 && pts.dropoff.length > 0) curDropoff = pts.dropoff;
    }

    setPickupPoints(curPickup);
    setDropoffPoints(curDropoff);
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
      dropoffPoints,
      repeatWeekly
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

  // Dashboard Stats Memo
  const totalBookedSeats = useMemo(() => {
    return trips.reduce((acc, t) => acc + (t.bookedSeats?.length || 0), 0);
  }, [trips]);

  const avgOccupancy = useMemo(() => {
    const totalCapacity = trips.reduce((acc, t) => acc + (t.busId?.totalSeats || 0), 0);
    return totalCapacity > 0 ? Math.round((totalBookedSeats / totalCapacity) * 100) : 0;
  }, [trips, totalBookedSeats]);

  const runningTripsCount = useMemo(() => {
    const now = new Date();
    return trips.filter(t => new Date(t.departureTime) <= now && new Date(t.arrivalTime) >= now).length;
  }, [trips]);

  const upcomingTripsCount = useMemo(() => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return trips.filter(t => new Date(t.departureTime) > now && new Date(t.departureTime) <= in24h).length;
  }, [trips]);

  const getTripDurationStr = (depTime, arrTime) => {
    if (!depTime || !arrTime) return '';
    const diffMs = new Date(arrTime) - new Date(depTime);
    if (diffMs <= 0) return '';
    const totalMin = Math.round(diffMs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m > 0 ? String(m).padStart(2, '0') + 'm' : '00m'}`;
  };

  const getTodayStr = () => new Date().toLocaleDateString('en-CA');
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '400px' }}>
      {/* Toast Alert */}
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

      {/* =========================================================================
          KHỐI 1 (TRÊN): HEADER & 4 THẺ THỐNG KÊ TỔNG QUAN (DASHBOARD STYLE)
          ========================================================================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Quản lý chuyến xe
              </h1>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', border: '1px solid #bfdbfe' }}>
                • {filteredTrips.length} chuyến đang hiển thị (Tổng số: {trips.length})
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', margin: '4px 0 0 0' }}>
              Theo dõi kế hoạch vận hành, điều phối lộ trình và kiểm soát lấp đầy số ghế • <span style={{ color: '#16a34a', fontWeight: '600' }}>{runningTripsCount} chuyến đang chạy</span> • <span style={{ color: '#d97706', fontWeight: '600' }}>{upcomingTripsCount} sắp xuất bến</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleOpenAutoModal} 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '700', borderRadius: '10px', borderColor: '#c084fc', color: '#7e22ce', backgroundColor: '#faf5ff' }}
            >
              Xếp lịch tự động
            </button>
            <button 
              onClick={handleOpenAdd} 
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.15rem', fontSize: '0.82rem', fontWeight: '700', borderRadius: '10px', backgroundColor: '#2563eb', border: 'none', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
            >
              + Tạo chuyến xe mới
            </button>
          </div>
        </div>

        {/* 4 Overview Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Card 1: Tuyến khai thác */}
          <div style={{ background: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              TUYẾN ĐƯỜNG KHAI THÁC
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
              {routes.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>tuyến</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', marginTop: '6px' }}>
              • {routes.length} tuyến đang vận hành ổn định
            </div>
          </div>

          {/* Card 2: Chuyến xe vận hành */}
          <div style={{ background: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              CHUYẾN XE VẬN HÀNH
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
              {trips.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', marginTop: '6px' }}>
              • {runningTripsCount} chuyến đang chạy trong ngày
            </div>
          </div>

          {/* Card 3: Đội xe khả dụng */}
          <div style={{ background: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ĐỘI XE KHẢ DỤNG
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
              {buses.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>phương tiện</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', marginTop: '6px' }}>
              • {buses.filter(b => b.status === 'active' || !b.status).length} xe sẵn sàng xuất bến
            </div>
          </div>

          {/* Card 4: Tổng vé đã đặt */}
          <div style={{ background: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              TỔNG VÉ ĐÃ ĐẶT
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
              {totalBookedSeats} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vé</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '6px' }}>
              • {avgOccupancy}% Tỷ lệ lấp đầy ghế trung bình
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KHỐI 2 (DƯỚI): BỘ LỌC ĐA NĂNG & DANH SÁCH CHUYẾN XE / LỊCH TUẦN
          ========================================================================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Filters Top Bar */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* Row 1: Route, Date, Quick Date Buttons, View Mode Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Route filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TUYẾN:</span>
                <select 
                  value={filterRoute} 
                  onChange={(e) => setFilterRoute(e.target.value)}
                  className="form-control"
                  style={{ width: '190px', padding: '6px 10px', fontSize: '0.82rem', borderRadius: '8px' }}
                >
                  <option value="">Tất cả các tuyến</option>
                  {routes.map(r => (
                    <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                  ))}
                </select>
              </div>
              
              {/* Date filter & Quick Date buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>THỜI GIAN:</span>
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="form-control"
                  style={{ width: '145px', padding: '5px 10px', fontSize: '0.82rem', borderRadius: '8px' }}
                />
                <button
                  type="button"
                  onClick={() => setFilterDate(getTodayStr())}
                  style={{
                    padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600', borderRadius: '8px',
                    border: '1px solid #cbd5e1', cursor: 'pointer',
                    backgroundColor: filterDate === getTodayStr() ? '#2563eb' : '#ffffff',
                    color: filterDate === getTodayStr() ? '#ffffff' : '#475569'
                  }}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDate(getTomorrowStr())}
                  style={{
                    padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600', borderRadius: '8px',
                    border: '1px solid #cbd5e1', cursor: 'pointer',
                    backgroundColor: filterDate === getTomorrowStr() ? '#2563eb' : '#ffffff',
                    color: filterDate === getTomorrowStr() ? '#ffffff' : '#475569'
                  }}
                >
                  Ngày mai
                </button>
                {filterDate && (
                  <button
                    type="button"
                    onClick={() => setFilterDate('')}
                    style={{
                      padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600', borderRadius: '8px',
                      border: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: '#f1f5f9', color: '#64748b'
                    }}
                  >
                    Tất cả ngày
                  </button>
                )}
              </div>
            </div>

            {/* Right: View Switcher (Danh sách / Lịch tuần) */}
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '4px' }}>
              <button 
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 16px', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700',
                  cursor: 'pointer', background: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? '#2563eb' : '#64748b',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Danh sách
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                style={{
                  padding: '6px 16px', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700',
                  cursor: 'pointer', background: viewMode === 'calendar' ? '#ffffff' : 'transparent',
                  color: viewMode === 'calendar' ? '#2563eb' : '#64748b',
                  boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Lịch tuần
              </button>
            </div>
          </div>

          {/* Row 2: Advanced filters */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
            gap: '12px', 
            paddingTop: '12px', 
            borderTop: '1px solid #e2e8f0',
            alignItems: 'flex-end'
          }}>
            {/* 1. Loại xe */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>LOẠI XE:</label>
              <select
                value={filterBusType}
                onChange={(e) => setFilterBusType(e.target.value)}
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <option value="all">Tất cả loại xe</option>
                <option value="giường nằm">Giường nằm</option>
                <option value="ghế ngồi">Ghế ngồi</option>
                <option value="limousine">Limousine / VIP</option>
              </select>
            </div>

            {/* 2. Khung giờ chạy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>KHUNG GIỜ CHẠY:</label>
              <select
                value={filterTimeOfDay}
                onChange={(e) => setFilterTimeOfDay(e.target.value)}
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <option value="all">Tất cả khung giờ</option>
                <option value="morning">Buổi sáng (06:00 - 12:00)</option>
                <option value="afternoon">Buổi chiều (12:00 - 18:00)</option>
                <option value="evening">Buổi tối &amp; đêm (18:00 - 06:00)</option>
              </select>
            </div>

            {/* 3. Số chỗ ngồi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>SỐ CHỖ:</label>
              <select
                value={filterSeats}
                onChange={(e) => setFilterSeats(e.target.value)}
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
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
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>GIÁ VÉ TỐI ĐA (VND):</label>
              <input
                type="number"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                placeholder="Ví dụ: 300000"
                className="form-control"
                style={{ padding: '5px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
              />
            </div>

            {/* 5. Dịch vụ đi kèm */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>DỊCH VỤ ĐI KÈM:</label>
              <select
                value={filterAmenity}
                onChange={(e) => setFilterAmenity(e.target.value)}
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <option value="all">Tất cả dịch vụ</option>
                <option value="wifi">Wifi miễn phí</option>
                <option value="điều hòa">Điều hòa</option>
                <option value="nước">Nước uống / Khăn lạnh</option>
                <option value="tivi">Màn hình Tivi</option>
                <option value="cổng sạc">Cổng sạc USB</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(filterRoute || filterDate || filterBusType !== 'all' || filterTimeOfDay !== 'all' || filterSeats !== 'all' || filterMaxPrice || filterAmenity !== 'all') && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
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
                  style={{ width: '100%', padding: '6px 12px', fontSize: '0.78rem', fontWeight: '700', color: '#ef4444', borderColor: '#fca5a5', borderRadius: '8px', backgroundColor: '#ffffff' }}
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            )}
          </div>
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
              <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.92rem' }}>
                Danh sách trạm đón/trả: <span style={{ color: '#2563eb' }}>{hoveredTrip.routeId ? `${hoveredTrip.routeId.startPoint} → ${hoveredTrip.routeId.endPoint}` : ''}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                Xe: <strong>{hoveredTrip.busId?.plateNumber || 'Chưa gán'}</strong> ({hoveredTrip.busId?.type || 'N/A'})
              </div>
            </div>

            {/* Timeline of Pickup & Dropoff Stops */}
            <div style={{ position: 'relative', paddingLeft: '20px' }}>
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
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#059669', fontWeight: '700' }}>[{p.time || 'Đón'}]</span>
                    <span>{p.location}</span>
                    <span style={{ fontSize: '0.68rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '4px' }}>Điểm đón</span>
                  </div>
                  {p.address && <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{p.address}</div>}
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
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#dc2626', fontWeight: '700' }}>[{d.time || 'Trả'}]</span>
                    <span>{d.location}</span>
                    <span style={{ fontSize: '0.68rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>Điểm trả</span>
                  </div>
                  {d.address && <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{d.address}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem' }}>
            Đang tải danh sách chuyến xe...
          </div>
        ) : viewMode === 'list' ? (
          /* List View Cards */
          filteredTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem' }}>
              Chưa có chuyến xe nào khớp với điều kiện lọc.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredTrips.map((trip) => {
                const departureDate = new Date(trip.departureTime);
                const arrivalDate = new Date(trip.arrivalTime);
                const totalSeats = trip.busId?.totalSeats || 0;
                const bookedSeatsCount = trip.bookedSeats?.length || 0;
                const remainingSeats = Math.max(0, totalSeats - bookedSeatsCount);
                const occupancyPercent = totalSeats > 0 ? Math.min(100, Math.round((bookedSeatsCount / totalSeats) * 100)) : 0;
                const isHighOccupancy = occupancyPercent >= 85;
                const isLimousine = (trip.busId?.type || '').toLowerCase().includes('limousine');
                const durationStr = getTripDurationStr(trip.departureTime, trip.arrivalTime);
                const totalStops = (trip.pickupPoints?.length || 0) + (trip.dropoffPoints?.length || 0);
                const depTimeStr = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const depDateStr = departureDate.toLocaleDateString('vi-VN');
                const arrTimeStr = arrivalDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div 
                    key={trip._id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '18px 22px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '20px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    {/* Col 1: Route & Schedule */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 320px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: isLimousine ? '#f3e8ff' : isHighOccupancy ? '#fef3c7' : '#eff6ff',
                        color: isLimousine ? '#7e22ce' : isHighOccupancy ? '#b45309' : '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '1.15rem',
                        flexShrink: 0
                      }}>
                        ⇄
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                            {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                          </span>
                          {isHighOccupancy ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px' }}>
                              Sắp hết vé
                            </span>
                          ) : isLimousine ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: '12px' }}>
                              VIP Limousine
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px' }}>
                              Đúng giờ
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '6px', fontWeight: '600' }}>
                          <span>Khởi hành: </span>
                          <strong style={{ color: '#2563eb' }}>{depTimeStr}</strong> - {depDateStr}
                          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                          <span style={{ color: '#64748b', fontWeight: '500' }}>Dự kiến: {arrTimeStr} {durationStr ? `(${durationStr})` : ''}</span>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                          <span
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTripTooltipPos({
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY
                              });
                              setHoveredTrip(trip);
                            }}
                            onMouseLeave={() => setHoveredTrip(null)}
                            style={{
                              fontSize: '0.75rem',
                              backgroundColor: '#f1f5f9',
                              color: '#2563eb',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {totalStops} Trạm đón/trả (Rê chuột)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Vehicle & Occupancy */}
                    <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          color: '#1e293b'
                        }}>
                          {trip.busId?.plateNumber || 'Chưa gán xe'}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                          {trip.busId?.type || 'Xe khách'}
                        </span>
                        {remainingSeats <= 2 ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px' }}>
                            {remainingSeats === 0 ? 'Hết chỗ' : `Chỉ còn ${remainingSeats} ghế`}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px' }}>
                            Còn {remainingSeats} trống
                          </span>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                          <span>Đã đặt: {bookedSeatsCount}/{totalSeats} ghế</span>
                          <span style={{ color: occupancyPercent >= 85 ? '#d97706' : '#2563eb' }}>{occupancyPercent}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${occupancyPercent}%`,
                            height: '100%',
                            backgroundColor: occupancyPercent >= 85 ? '#f59e0b' : '#2563eb',
                            borderRadius: '3px',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Tài xế: <strong style={{ color: '#334155' }}>{trip.driver?.name ? `${trip.driver.name} (Chính)${trip.assistant?.name ? ` • ${trip.assistant.name} (Phụ)` : ''}` : 'Chưa phân công'}</strong>
                      </div>
                    </div>

                    {/* Col 3: Price & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-end', flex: '0 0 auto' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          GIÁ VÉ NIÊM YẾT
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
                          {trip.price?.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(trip); }} 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(trip); }} 
                          className="btn btn-secondary" 
                          style={{ color: '#ef4444', borderColor: '#fca5a5', backgroundColor: '#ffffff', padding: '6px 14px', fontSize: '0.85rem', fontWeight: '600', borderRadius: '8px', cursor: 'pointer' }}
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
      </div>

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
                    onChange={(e) => handleRouteChange(e.target.value)}
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
                    onChange={(e) => handleDepartureChange(e.target.value)} 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Giờ đến dự kiến *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={arrivalTime} 
                    onChange={(e) => handleArrivalChange(e.target.value)} 
                    required
                  />
                </div>
              </div>

              {/* Weekly Recurring Toggle */}
              <div style={{ 
                marginBottom: '16px', 
                backgroundColor: '#f0fdf4', 
                border: '1.5px solid #bbf7d0', 
                padding: '12px 16px', 
                borderRadius: '10px' 
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', color: '#166534', margin: 0, fontSize: '0.9rem' }}>
                  <input 
                    type="checkbox" 
                    checked={repeatWeekly} 
                    onChange={(e) => setRepeatWeekly(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                  />
                  <span>Lặp lại hàng tuần (Tự động tạo lịch chạy cố định vào thứ này mỗi tuần đến cuối năm)</span>
                </label>
                <small style={{ color: '#15803d', display: 'block', marginTop: '4px', marginLeft: '28px', fontSize: '0.8rem' }}>
                  Chuyến xe sẽ tự động được nhân bản cố định vào cùng khung giờ của các tuần tiếp theo để không phải cài đặt lại ngày tháng.
                </small>
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
                    ? "Tuyến đường & loại xe này chưa được thiết lập giá vé bởi quản lý!" 
                    : "Giá vé tự động áp dụng theo quy định của quản lý nhà xe."
                  }
                </small>
              </div>

              {/* Pickup points builder */}
              <div style={{ marginBottom: '20px', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ margin: 0, color: '#166534', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Danh sách Điểm đón khách</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      Cố định theo tuyến ({pickupPoints.length} điểm)
                    </span>
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={handleSyncStopsWithRoute} className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: '0.75rem', color: '#2563eb', borderColor: '#bfdbfe' }}>
                      Đồng bộ theo tuyến
                    </button>
                    <button type="button" onClick={handleAddPickupPoint} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                      + Thêm điểm ngoài tuyến
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 12px 0' }}>
                  Các trạm đón đã được đồng bộ tự động từ Tuyến đường. Bạn chỉ cần thiết lập <strong>Giờ xe đón</strong> tại từng trạm:
                </p>
                {pickupPoints.map((pt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: '700', color: '#475569' }}>Giờ đón *</label>
                      <input 
                        type="text" 
                        placeholder="08:00" 
                        value={pt.time} 
                        onChange={(e) => handlePickupChange(idx, 'time', e.target.value)}
                        style={{ width: '90px', padding: '6px 8px', fontSize: '0.85rem', fontWeight: '700', color: '#166534', textAlign: 'center', borderRadius: '6px' }}
                        className="form-control"
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>
                        {idx === 0 && <span style={{ color: '#16a34a', marginRight: '4px' }}>[Khởi hành]</span>}
                        {pt.location}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {pt.address || 'Địa chỉ đang cập nhật'}
                      </div>
                    </div>
                    {pickupPoints.length > 1 && (
                      <button type="button" onClick={() => handleRemovePickupPoint(idx)} title="Xóa điểm này" style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Dropoff points builder */}
              <div style={{ marginBottom: '24px', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ margin: 0, color: '#991b1b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Danh sách Điểm trả khách</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                      Cố định theo tuyến ({dropoffPoints.length} điểm)
                    </span>
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={handleSyncStopsWithRoute} className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: '0.75rem', color: '#b91c1c', borderColor: '#fecaca' }}>
                      Đồng bộ theo tuyến
                    </button>
                    <button type="button" onClick={handleAddDropoffPoint} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                      + Thêm điểm ngoài tuyến
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 12px 0' }}>
                  Các trạm trả đã được đồng bộ tự động từ Tuyến đường. Bạn chỉ cần thiết lập <strong>Giờ xe trả</strong> tại từng trạm:
                </p>
                {dropoffPoints.map((pt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: '700', color: '#475569' }}>Giờ trả *</label>
                      <input 
                        type="text" 
                        placeholder="15:00" 
                        value={pt.time} 
                        onChange={(e) => handleDropoffChange(idx, 'time', e.target.value)}
                        style={{ width: '90px', padding: '6px 8px', fontSize: '0.85rem', fontWeight: '700', color: '#991b1b', textAlign: 'center', borderRadius: '6px' }}
                        className="form-control"
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>
                        {idx === dropoffPoints.length - 1 && <span style={{ color: '#dc2626', marginRight: '4px' }}>[Điểm đích]</span>}
                        {pt.location}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {pt.address || 'Địa chỉ đang cập nhật'}
                      </div>
                    </div>
                    {dropoffPoints.length > 1 && (
                      <button type="button" onClick={() => handleRemoveDropoffPoint(idx)} title="Xóa điểm này" style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}>
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
            <h3 style={{ marginBottom: '20px' }}>Xếp lịch chuyến xe tự động</h3>
            
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
                  Bắt đầu xếp lịch
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
    </div>
  );
};

export default OpsTripsPage;
