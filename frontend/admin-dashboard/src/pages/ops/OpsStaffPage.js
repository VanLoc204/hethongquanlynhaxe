import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const OpsStaffPage = () => {
  const { token } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableAssistants, setAvailableAssistants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // View & Filter states
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [calendarRefDate, setCalendarRefDate] = useState(new Date());
  
  const [filterRoute, setFilterRoute] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterBus, setFilterBus] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'assigned', 'missing'
  const [filterDate, setFilterDate] = useState('');

  // Modal state
  const [editingTrip, setEditingTrip] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedAssistant, setSelectedAssistant] = useState('');
  const [applyScope, setApplyScope] = useState('single');
  const [algoRunning, setAlgoRunning] = useState(false);

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
      if (data.success) setRoutes(data.routes || []);
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
      if (data.success) setBuses(data.buses || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const drivers = data.staff.filter(s => s.role === 'driver' && s.status === 'active');
        const assistants = data.staff.filter(s => 
          (s.role === 'attendant' || s.role === 'assistant') && 
          s.status === 'active'
        );

        setAvailableDrivers(drivers.map(d => ({ name: d.name, phone: d.phone })));
        setAvailableAssistants(assistants.map(a => ({ name: a.name, phone: a.phone })));
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách nhân viên:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrips();
      fetchRoutes();
      fetchBuses();
      fetchStaff();
    }
  }, [token]);

  // Filtering Logic
  const getFilteredTrips = () => {
    return trips.filter(trip => {
      // Filter by Route
      if (filterRoute && (!trip.routeId || trip.routeId._id !== filterRoute)) {
        return false;
      }
      // Filter by Driver
      if (filterDriver && (!trip.driver || trip.driver.name !== filterDriver)) {
        return false;
      }
      // Filter by Bus
      if (filterBus && (!trip.busId || trip.busId._id !== filterBus)) {
        return false;
      }
      // Filter by Status
      const hasStaff = trip.driver?.name && trip.assistant?.name;
      if (filterStatus === 'assigned' && !hasStaff) return false;
      if (filterStatus === 'missing' && hasStaff) return false;

      // Filter by Date (in list view)
      if (viewMode === 'list' && filterDate) {
        const depDate = new Date(trip.departureTime);
        const depDateStr = depDate.toLocaleDateString('en-CA');
        if (depDateStr !== filterDate) return false;
      }

      return true;
    });
  };

  const filteredTrips = getFilteredTrips();

  const getDaysOfWeek = (refDate) => {
    const date = new Date(refDate);
    const day = date.getDay(); // 0 = Sunday, 1 = Monday...
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(date.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getTripsForDay = (dayDate) => {
    const dayStr = dayDate.toLocaleDateString('en-CA');
    return filteredTrips
      .filter(trip => {
        const depDate = new Date(trip.departureTime);
        return depDate.toLocaleDateString('en-CA') === dayStr;
      })
      .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
  };

  // Lập bản đồ các xe đã có tổ lái chuyên trách (1 Xe ⇄ 1 Tổ lái)
  const busStaffMap = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const bId = t.busId?._id ? String(t.busId._id) : (t.busId ? String(t.busId) : null);
      const bPlate = t.busId?.plateNumber;
      if (t.driver?.phone) {
        if (bId && !map[bId]) {
          map[bId] = {
            plateNumber: bPlate,
            driver: { name: t.driver.name, phone: t.driver.phone },
            assistant: t.assistant?.phone ? { name: t.assistant.name, phone: t.assistant.phone } : null
          };
        }
        if (bPlate && !map[bPlate]) {
          map[bPlate] = {
            busId: bId,
            driver: { name: t.driver.name, phone: t.driver.phone },
            assistant: t.assistant?.phone ? { name: t.assistant.name, phone: t.assistant.phone } : null
          };
        }
      }
    });
    return map;
  }, [trips]);

  const assignedDriverPhones = useMemo(() => {
    const set = new Set();
    Object.values(busStaffMap).forEach(team => {
      if (team.driver?.phone) set.add(team.driver.phone);
    });
    return set;
  }, [busStaffMap]);

  const assignedAssistantPhones = useMemo(() => {
    const set = new Set();
    Object.values(busStaffMap).forEach(team => {
      if (team.assistant?.phone) set.add(team.assistant.phone);
    });
    return set;
  }, [busStaffMap]);

  // Bộ lọc tài xế và phụ xe phù hợp với chuyến xe đang điều động
  const { filteredDrivers, filteredAssistants, isFixedTeamBus, fixedTeamInfo, isRelieverMode } = useMemo(() => {
    if (!editingTrip) {
      return { 
        filteredDrivers: availableDrivers, 
        filteredAssistants: availableAssistants, 
        isFixedTeamBus: false, 
        fixedTeamInfo: null,
        isRelieverMode: false
      };
    }

    const bId = editingTrip.busId?._id ? String(editingTrip.busId._id) : (editingTrip.busId ? String(editingTrip.busId) : null);
    const bPlate = editingTrip.busId?.plateNumber;
    const fixedTeam = (bId && busStaffMap[bId]) || (bPlate && busStaffMap[bPlate]);

    // Trường hợp A: Điều động người chạy thay tạm thời cho chuyến này
    if (applyScope === 'single' || editingTrip.needsReplacement) {
      const tripStart = new Date(editingTrip.departureTime);
      const tripEnd = new Date(editingTrip.arrivalTime);

      const busyDriverPhones = new Set();
      const busyAssistantPhones = new Set();

      trips.forEach(t => {
        if (String(t._id) === String(editingTrip._id)) return;
        const tStart = new Date(t.departureTime);
        const tEnd = new Date(t.arrivalTime);
        if (tripStart < tEnd && tripEnd > tStart) {
          if (t.driver?.phone) busyDriverPhones.add(t.driver.phone);
          if (t.assistant?.phone) busyAssistantPhones.add(t.assistant.phone);
        }
      });

      // Lọc các nhân sự không bị trùng lịch chạy trong khung giờ này
      const relieverDrivers = availableDrivers.filter(d => !busyDriverPhones.has(d.phone));
      const relieverAssistants = availableAssistants.filter(a => !busyAssistantPhones.has(a.phone));

      return {
        filteredDrivers: relieverDrivers,
        filteredAssistants: relieverAssistants,
        isFixedTeamBus: false,
        fixedTeamInfo: null,
        isRelieverMode: true
      };
    }

    // Trường hợp B: Điều động cố định (đồng bộ tất cả các tuần)
    if (fixedTeam && fixedTeam.driver?.phone) {
      const matchedDriver = availableDrivers.find(d => d.phone === fixedTeam.driver.phone) || fixedTeam.driver;
      const matchedAssistant = fixedTeam.assistant?.phone
        ? (availableAssistants.find(a => a.phone === fixedTeam.assistant.phone) || fixedTeam.assistant)
        : null;

      return {
        filteredDrivers: matchedDriver ? [matchedDriver] : [],
        filteredAssistants: matchedAssistant ? [matchedAssistant] : [],
        isFixedTeamBus: true,
        fixedTeamInfo: fixedTeam,
        isRelieverMode: false
      };
    } else {
      const unassignedDrivers = availableDrivers.filter(d => !assignedDriverPhones.has(d.phone));
      const unassignedAssistants = availableAssistants.filter(a => !assignedAssistantPhones.has(a.phone));

      return {
        filteredDrivers: unassignedDrivers,
        filteredAssistants: unassignedAssistants,
        isFixedTeamBus: false,
        fixedTeamInfo: null,
        isRelieverMode: false
      };
    }
  }, [editingTrip, availableDrivers, availableAssistants, busStaffMap, assignedDriverPhones, assignedAssistantPhones, applyScope, trips]);

  const handleOpenEdit = (trip) => {
    setEditingTrip(trip);
    if (trip.needsReplacement) {
      setApplyScope('single');
    } else {
      setApplyScope('all');
    }

    const bId = trip.busId?._id ? String(trip.busId._id) : (trip.busId ? String(trip.busId) : null);
    const bPlate = trip.busId?.plateNumber;
    const fixedTeam = (bId && busStaffMap[bId]) || (bPlate && busStaffMap[bPlate]);

    let targetDriver = trip.driver?.phone
      ? availableDrivers.find(d => d.phone === trip.driver.phone || d.name === trip.driver.name)
      : (fixedTeam ? fixedTeam.driver : null);

    let targetAssistant = trip.assistant?.phone
      ? availableAssistants.find(a => a.phone === trip.assistant.phone || a.name === trip.assistant.name)
      : (fixedTeam ? fixedTeam.assistant : null);

    setSelectedDriver(targetDriver ? JSON.stringify(targetDriver) : '');
    setSelectedAssistant(targetAssistant ? JSON.stringify(targetAssistant) : '');
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!editingTrip) return;

    const driverObj = selectedDriver ? JSON.parse(selectedDriver) : { name: '', phone: '' };
    const assistantObj = selectedAssistant ? JSON.parse(selectedAssistant) : { name: '', phone: '' };

    try {
      const busIdVal = editingTrip.busId?._id || editingTrip.busId;
      const res = await fetch(`${API_BASE}/trips/ops/trips/${editingTrip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          busId: busIdVal,
          driver: driverObj,
          assistant: assistantObj,
          applyOnlyThisTrip: applyScope === 'single',
          isReliever: applyScope === 'single'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          applyScope === 'single'
            ? 'Bố trí nhân sự chạy thay cho chuyến này thành công (không ảnh hưởng các chuyến khác).'
            : 'Điều động thành công! Đội ngũ đã được đồng bộ cho toàn bộ các chuyến của phương tiện này.'
        );
        setEditingTrip(null);
        fetchTrips();
      } else {
        showToast(data.message || 'Lỗi cập nhật nhân sự.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const runGreedyAlgorithm = async () => {
    if (availableDrivers.length === 0) {
      showToast('Không có tài xế nào khả dụng trong hệ thống để phân công.', 'error');
      return;
    }

    setAlgoRunning(true);
    showToast('Bắt đầu tính toán phân công tự động...', 'info');

    await new Promise(resolve => setTimeout(resolve, 1500));

    const sortedTrips = [...trips].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
    const busyDrivers = {};
    const busyAssistants = {};
    const updatedAssignments = [];

    for (const trip of sortedTrips) {
      const tripStart = new Date(trip.departureTime);
      const tripEnd = new Date(trip.arrivalTime);

      const bId = trip.busId?._id ? String(trip.busId._id) : (trip.busId ? String(trip.busId) : null);
      const bPlate = trip.busId?.plateNumber;
      const fixedTeam = (bId && busStaffMap[bId]) || (bPlate && busStaffMap[bPlate]);

      let chosenDriver = null;
      let chosenAssistant = null;

      if (fixedTeam && fixedTeam.driver?.phone) {
        // Xe đã có tổ lái cố định -> luôn gán đúng tổ lái đó
        chosenDriver = availableDrivers.find(d => d.phone === fixedTeam.driver.phone) || fixedTeam.driver;
        chosenAssistant = fixedTeam.assistant?.phone
          ? (availableAssistants.find(a => a.phone === fixedTeam.assistant.phone) || fixedTeam.assistant)
          : null;
      } else {
        // Xe chưa có tổ lái cố định -> chỉ lấy từ các tài xế / phụ xe tự do (chưa gán xe cố định)
        const freeDrivers = availableDrivers.filter(d => !assignedDriverPhones.has(d.phone));
        for (const driver of freeDrivers) {
          const intervals = busyDrivers[driver.phone] || [];
          const isOverlap = intervals.some(interval => (tripStart < interval.end && tripEnd > interval.start));
          if (!isOverlap) {
            chosenDriver = driver;
            if (!busyDrivers[driver.phone]) busyDrivers[driver.phone] = [];
            busyDrivers[driver.phone].push({ start: tripStart, end: tripEnd });
            break;
          }
        }

        const freeAssistants = availableAssistants.filter(a => !assignedAssistantPhones.has(a.phone));
        for (const assistant of freeAssistants) {
          const intervals = busyAssistants[assistant.phone] || [];
          const isOverlap = intervals.some(interval => (tripStart < interval.end && tripEnd > interval.start));
          if (!isOverlap) {
            chosenAssistant = assistant;
            if (!busyAssistants[assistant.phone]) busyAssistants[assistant.phone] = [];
            busyAssistants[assistant.phone].push({ start: tripStart, end: tripEnd });
            break;
          }
        }
      }

      if (chosenDriver || chosenAssistant) {
        updatedAssignments.push({
          tripId: trip._id,
          driver: chosenDriver || { name: '', phone: '' },
          assistant: chosenAssistant || { name: '', phone: '' }
        });
      }
    }

    try {
      let successCount = 0;
      for (const update of updatedAssignments) {
        const res = await fetch(`${API_BASE}/trips/ops/trips/${update.tripId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            driver: update.driver,
            assistant: update.assistant
          })
        });
        const data = await res.json();
        if (data.success) successCount++;
      }

      showToast(`Đã tự động phân công thành công ${successCount}/${sortedTrips.length} chuyến xe!`);
      fetchTrips();
    } catch {
      showToast('Lỗi lưu kết quả phân công vào cơ sở dữ liệu.', 'error');
    } finally {
      setAlgoRunning(false);
    }
  };

  const resetFilters = () => {
    setFilterRoute('');
    setFilterDriver('');
    setFilterBus('');
    setFilterStatus('all');
    setFilterDate('');
  };

  const isFiltered = filterRoute || filterDriver || filterBus || filterStatus !== 'all' || filterDate;

  return (
    <section className="panel" style={{ minHeight: '500px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header & Actions */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          padding: '20px 24px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          border: '1px solid #e2e8f0'
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '700', fontSize: '1.5rem', tracking: '-0.02em' }}>Quản lý nhân sự chuyến</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px', marginBottom: 0 }}>
            Điều động, phân công Tài xế và Phụ xe theo dõi theo dạng Danh sách hoặc Lịch tuần.
          </p>
        </div>
      </div>

      {/* Filter Toolbar & View Switcher - 2 Clean Modern Rows */}
      <div style={{
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '16px',
        padding: '20px 24px', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
      }}>
        {/* Row 1: Main 5 Filters (Compact Single-Row Flex) */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {/* Route */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Tuyến:</span>
            <select 
              value={filterRoute} 
              onChange={(e) => setFilterRoute(e.target.value)}
              className="form-control"
              style={{ 
                width: '100%',
                minWidth: '110px', 
                padding: '6px 8px', 
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: '500',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả tuyến</option>
              {routes.map(r => (
                <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
              ))}
            </select>
          </div>

          {/* Driver */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Tài xế:</span>
            <select 
              value={filterDriver} 
              onChange={(e) => setFilterDriver(e.target.value)}
              className="form-control"
              style={{ 
                width: '100%',
                minWidth: '100px', 
                padding: '6px 8px', 
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: '500',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả tài xế</option>
              {availableDrivers.map((d, i) => (
                <option key={i} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Bus */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Xe:</span>
            <select 
              value={filterBus} 
              onChange={(e) => setFilterBus(e.target.value)}
              className="form-control"
              style={{ 
                width: '100%',
                minWidth: '95px', 
                padding: '6px 8px', 
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: '500',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả xe</option>
              {buses.map(b => (
                <option key={b._id} value={b._id}>{b.plateNumber}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Trạng thái:</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-control"
              style={{ 
                width: '100%',
                minWidth: '95px', 
                padding: '6px 8px', 
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: '500',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">Tất cả</option>
              <option value="assigned">Đã bố trí</option>
              <option value="missing">Thiếu nhân sự</option>
            </select>
          </div>

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Thời gian:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="form-control"
              style={{ 
                width: '100%',
                minWidth: '115px', 
                padding: '5px 8px', 
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: '500',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Row 2: View Switcher & Reset Filter Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderTop: '1px solid #f1f5f9', 
          paddingTop: '14px' 
        }}>
          {/* View Switcher */}
          <div style={{ 
            display: 'flex', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '12px', 
            gap: '4px',
            border: '1px solid #e2e8f0',
            whiteSpace: 'nowrap'
          }}>
            <button 
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 18px', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'list' ? '0 2px 6px rgba(37, 99, 235, 0.12)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Danh sách
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '8px 18px', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer', background: viewMode === 'calendar' ? '#ffffff' : 'transparent',
                color: viewMode === 'calendar' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'calendar' ? '0 2px 6px rgba(37, 99, 235, 0.12)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Lịch tuần
            </button>
          </div>

          {/* Reset Action if filtered */}
          {isFiltered && (
            <button 
              onClick={resetFilters}
              style={{ 
                padding: '6px 14px', 
                fontSize: '0.85rem', 
                fontWeight: '600', 
                color: '#ef4444', 
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải thông tin chuyến xe...
        </div>
      ) : viewMode === 'list' ? (
        /* TABLE LIST VIEW */
        filteredTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Chưa có chuyến xe nào khớp với điều kiện lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '12px' }}>Chuyến xe</th>
                  <th style={{ padding: '12px' }}>Giờ xuất phát</th>
                  <th style={{ padding: '12px' }}>Xe khách</th>
                  <th style={{ padding: '12px' }}>Tài xế chính</th>
                  <th style={{ padding: '12px' }}>Phụ xe</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => {
                  const depDate = new Date(trip.departureTime);
                  const hasStaff = trip.driver?.name && trip.assistant?.name;
                  
                  return (
                    <tr key={trip._id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--primary)' }}>
                          {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '0.9rem' }}>
                        {depDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '0.9rem', fontWeight: '600' }}>
                        {trip.busId?.plateNumber || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        {trip.driver?.name ? (
                          <div>
                            <div style={{ fontWeight: '600' }}>{trip.driver.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{trip.driver.phone}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa có tài xế</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        {trip.assistant?.name ? (
                          <div>
                            <div style={{ fontWeight: '600' }}>{trip.assistant.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{trip.assistant.phone}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa có phụ xe</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        {trip.needsReplacement ? (
                          <span 
                            style={{ 
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              fontWeight: '700',
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa'
                            }}
                          >
                            Cần bố trí người chạy thay ({trip.replacementReason || 'Tài xế nghỉ phép'})
                          </span>
                        ) : trip.isReliever ? (
                          <span 
                            style={{ 
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              fontWeight: '700',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0'
                            }}
                          >
                            Đã có người chạy thay
                          </span>
                        ) : (
                          <span 
                            style={{ 
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              fontWeight: '700',
                              backgroundColor: hasStaff ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: hasStaff ? '#10b981' : '#ef4444',
                              border: hasStaff ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                          >
                            {hasStaff ? 'Đã bố trí' : 'Thiếu nhân sự'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleOpenEdit(trip)} 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          Điều động
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* WEEKLY CALENDAR VIEW */
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
                    minWidth: '220px', 
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

                  {/* Day trip staff list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: '150px' }}>
                    {dayTrips.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '120px', color: '#94a3b8' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', fontStyle: 'italic' }}>Không có chuyến</span>
                      </div>
                    ) : (
                      dayTrips.map(trip => {
                        const dep = new Date(trip.departureTime);
                        const depTime = dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        const hasStaff = trip.driver?.name && trip.assistant?.name;

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
                              gap: '8px'
                            }}
                          >
                            <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                              {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                            </div>

                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                Giờ: {depTime}
                              </span>
                              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                                Xe: {trip.busId?.plateNumber || 'Chưa gán'}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.8rem', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>Tài xế: </span>
                                <strong style={{ color: trip.driver?.name ? '#1e293b' : '#ef4444' }}>
                                  {trip.driver?.name || 'Chưa có'}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>Phụ xe: </span>
                                <strong style={{ color: trip.assistant?.name ? '#1e293b' : '#ef4444' }}>
                                  {trip.assistant?.name || 'Chưa có'}
                                </strong>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              {trip.needsReplacement ? (
                                <span 
                                  style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.7rem', 
                                    fontWeight: '700',
                                    backgroundColor: '#fff7ed',
                                    color: '#c2410c',
                                    border: '1px solid #fed7aa'
                                  }}
                                >
                                  Cần người chạy thay
                                </span>
                              ) : trip.isReliever ? (
                                <span 
                                  style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.7rem', 
                                    fontWeight: '700',
                                    backgroundColor: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0'
                                  }}
                                >
                                  Đã có người chạy thay
                                </span>
                              ) : (
                                <span 
                                  style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '10px', 
                                    fontSize: '0.7rem', 
                                    fontWeight: '700',
                                    backgroundColor: hasStaff ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: hasStaff ? '#10b981' : '#ef4444'
                                  }}
                                >
                                  {hasStaff ? 'Đã bố trí' : 'Thiếu nhân sự'}
                                </span>
                              )}

                              <button 
                                onClick={() => handleOpenEdit(trip)} 
                                style={{ 
                                  padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--primary)', 
                                  backgroundColor: '#ffffff', cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', outline: 'none'
                                }}
                              >
                                Điều động
                              </button>
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

      {/* Manual Assignment Modal */}
      {editingTrip && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '450px', padding: '24px', position: 'relative' }}>
            <h3 style={{ marginBottom: '8px' }}>Điều động nhân sự</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Chuyến: <strong style={{ color: 'var(--primary)' }}>{editingTrip.routeId ? `${editingTrip.routeId.startPoint} → ${editingTrip.routeId.endPoint}` : 'N/A'}</strong>
              <br />
              Khởi hành: {new Date(editingTrip.departureTime).toLocaleString('vi-VN')}
              <br />
              Xe khách: <strong>{editingTrip.busId?.plateNumber || 'N/A'}</strong>
            </p>

            <form onSubmit={handleSaveAssignment}>
              {/* Banner trạng thái phân công */}
              {editingTrip.needsReplacement ? (
                <div style={{
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  color: '#c2410c',
                  lineHeight: '1.4'
                }}>
                  <strong>Cần bố trí người chạy thay:</strong> {editingTrip.replacementReason || 'Tài xế/Phụ xe nghỉ phép'}. Hệ thống đã tự động lọc danh sách nhân sự dự bị phù hợp và không trùng lịch chạy.
                </div>
              ) : isFixedTeamBus && applyScope === 'all' ? (
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  color: '#1e40af',
                  lineHeight: '1.4'
                }}>
                  <strong>Xe chuyên trách có tổ lái cố định:</strong> Phương tiện <strong>{editingTrip.busId?.plateNumber}</strong> gắn với 1 tổ lái cố định. Danh sách điều động chỉ hiển thị tài xế và phụ xe chuyên trách của xe này.
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  color: '#92400e',
                  lineHeight: '1.4'
                }}>
                  <strong>Xe chưa có đội ngũ cố định:</strong> Phương tiện <strong>{editingTrip.busId?.plateNumber}</strong> là xe mới/tự do. Hệ thống chỉ hiển thị nhân sự tự do sẵn sàng nhận xe.
                </div>
              )}

              {/* Lựa chọn phạm vi áp dụng */}
              <div style={{ marginBottom: '16px', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Phạm vi áp dụng:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="applyScope"
                      value="single"
                      checked={applyScope === 'single'}
                      onChange={() => setApplyScope('single')}
                    />
                    <span><strong>Chỉ áp dụng chuyến này</strong> (Người chạy thay tạm thời cho ngày này)</span>
                  </label>
                  <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="applyScope"
                      value="all"
                      checked={applyScope === 'all'}
                      onChange={() => setApplyScope('all')}
                    />
                    <span><strong>Áp dụng cố định</strong> (Cập nhật cho chuyến này và các tuần tiếp theo)</span>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Chọn tài xế chính</label>
                {filteredDrivers.length === 0 ? (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Không có tài xế dự bị khả dụng trong khung giờ này.
                  </p>
                ) : (
                  <select 
                    className="form-control" 
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                  >
                    <option value="">-- Bỏ trống / Chưa phân công --</option>
                    {filteredDrivers.map((driver, idx) => (
                      <option key={idx} value={JSON.stringify(driver)}>
                        {driver.name} ({driver.phone}) {isRelieverMode ? '[Dự bị khả dụng]' : isFixedTeamBus ? `[Tổ lái xe ${editingTrip.busId?.plateNumber}]` : '[Tự do]'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Chọn phụ xe</label>
                {filteredAssistants.length === 0 ? (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Không có phụ xe dự bị khả dụng trong khung giờ này.
                  </p>
                ) : (
                  <select 
                    className="form-control" 
                    value={selectedAssistant}
                    onChange={(e) => setSelectedAssistant(e.target.value)}
                  >
                    <option value="">-- Bỏ trống / Chưa phân công --</option>
                    {filteredAssistants.map((assistant, idx) => (
                      <option key={idx} value={JSON.stringify(assistant)}>
                        {assistant.name} ({assistant.phone}) {isRelieverMode ? '[Dự bị khả dụng]' : isFixedTeamBus ? `[Tổ lái xe ${editingTrip.busId?.plateNumber}]` : '[Tự do]'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setEditingTrip(null)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={filteredDrivers.length === 0}>
                  Xác nhận điều động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default OpsStaffPage;
