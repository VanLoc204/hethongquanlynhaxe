import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';

// Generate dynamic templates for bus layouts based on passenger count and type if database layout is empty
const generateDefaultSeatLayout = (totalSeats, busType = '') => {
  const lowerFloor = [];
  const upperFloor = [];
  const typeStr = (busType || '').toLowerCase();

  const isDoubleDecker = 
    typeStr.includes('giường') || 
    typeStr.includes('phòng') || 
    typeStr.includes('cabin') || 
    totalSeats === 20 || 
    totalSeats === 22 || 
    totalSeats === 24 || 
    totalSeats === 32 || 
    totalSeats === 34 || 
    totalSeats === 40 || 
    totalSeats === 44;

  if (isDoubleDecker) {
    if (totalSeats === 20 || totalSeats === 22 || totalSeats === 24) {
      if (totalSeats === 20) {
        lowerFloor.push(['A1', null, null]);
        lowerFloor.push(['A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7']);
        lowerFloor.push(['A8', 'A9', 'A10']);

        upperFloor.push(['B1', null, null]);
        upperFloor.push(['B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7']);
        upperFloor.push(['B8', 'B9', 'B10']);
      } else if (totalSeats === 22) {
        lowerFloor.push(['A1', null, 'A2']);
        lowerFloor.push(['A3', null, 'A4']);
        lowerFloor.push(['A5', null, 'A6']);
        lowerFloor.push(['A7', null, 'A8']);
        lowerFloor.push(['A9', 'A10', 'A11']);

        upperFloor.push(['B1', null, 'B2']);
        upperFloor.push(['B3', null, 'B4']);
        upperFloor.push(['B5', null, 'B6']);
        upperFloor.push(['B7', null, 'B8']);
        upperFloor.push(['B9', 'B10', 'B11']);
      } else if (totalSeats === 24) {
        lowerFloor.push(['A1', null, null]);
        lowerFloor.push(['A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7']);
        lowerFloor.push(['A8', null, 'A9']);
        lowerFloor.push(['A10', 'A11', 'A12']);

        upperFloor.push(['B1', null, null]);
        upperFloor.push(['B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7']);
        upperFloor.push(['B8', null, 'B9']);
        upperFloor.push(['B10', 'B11', 'B12']);
      }
      return { lowerFloor, upperFloor, columns: 3 };
    }

    if (totalSeats === 32 || totalSeats === 34 || totalSeats === 40 || totalSeats === 44) {
      if (totalSeats === 32) {
        lowerFloor.push(['A1', null, null, null, 'A2']);
        lowerFloor.push(['A3', null, 'A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7', null, 'A8']);
        lowerFloor.push(['A9', null, 'A10', null, 'A11']);
        lowerFloor.push(['A12', 'A13', 'A14', 'A15', 'A16']);

        upperFloor.push(['B1', null, null, null, 'B2']);
        upperFloor.push(['B3', null, 'B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7', null, 'B8']);
        upperFloor.push(['B9', null, 'B10', null, 'B11']);
        upperFloor.push(['B12', 'B13', 'B14', 'B15', 'B16']);
      } else if (totalSeats === 34) {
        lowerFloor.push(['A1', null, 'A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5', null, 'A6']);
        lowerFloor.push(['A7', null, 'A8', null, 'A9']);
        lowerFloor.push(['A10', null, 'A11', null, 'A12']);
        lowerFloor.push(['A13', 'A14', 'A15', 'A16', 'A17']);

        upperFloor.push(['B1', null, 'B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5', null, 'B6']);
        upperFloor.push(['B7', null, 'B8', null, 'B9']);
        upperFloor.push(['B10', null, 'B11', null, 'B12']);
        upperFloor.push(['B13', 'B14', 'B15', 'B16', 'B17']);
      } else if (totalSeats === 40) {
        lowerFloor.push(['A1', null, 'A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5', null, 'A6']);
        lowerFloor.push(['A7', null, 'A8', null, 'A9']);
        lowerFloor.push(['A10', null, 'A11', null, 'A12']);
        lowerFloor.push(['A13', 'A14', null, 'A15']);
        lowerFloor.push(['A16', 'A17', 'A18', 'A19', 'A20']);

        upperFloor.push(['B1', null, 'B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5', null, 'B6']);
        upperFloor.push(['B7', null, 'B8', null, 'B9']);
        upperFloor.push(['B10', null, 'B11', null, 'B12']);
        upperFloor.push(['B13', 'B14', null, 'B15']);
        upperFloor.push(['B16', 'B17', 'B18', 'B19', 'B20']);
      } else if (totalSeats === 44) {
        lowerFloor.push(['A1', null, null, null, 'A2']);
        lowerFloor.push(['A3', null, 'A4', null, 'A5']);
        lowerFloor.push(['A6', null, 'A7', null, 'A8']);
        lowerFloor.push(['A9', null, 'A10', null, 'A11']);
        lowerFloor.push(['A12', null, 'A13', null, 'A14']);
        lowerFloor.push(['A15', null, 'A16', null, 'A17']);
        lowerFloor.push(['A18', 'A19', 'A20', 'A21', 'A22']);

        upperFloor.push(['B1', null, null, null, 'B2']);
        upperFloor.push(['B3', null, 'B4', null, 'B5']);
        upperFloor.push(['B6', null, 'B7', null, 'B8']);
        upperFloor.push(['B9', null, 'B10', null, 'B11']);
        upperFloor.push(['B12', null, 'B13', null, 'B14']);
        upperFloor.push(['B15', null, 'B16', null, 'B17']);
        upperFloor.push(['B18', 'B19', 'B20', 'B21', 'B22']);
      }
      return { lowerFloor, upperFloor, columns: 5 };
    }
  }

  // 1 Floor Vehicles
  if (totalSeats === 9) {
    lowerFloor.push(['A1', null, 'A2']);
    lowerFloor.push(['A3', null, 'A4']);
    lowerFloor.push(['A5', null, 'A6']);
    lowerFloor.push(['A7', 'A8', 'A9']);
    return { lowerFloor, upperFloor: [], columns: 3 };
  }

  if (totalSeats === 19) {
    lowerFloor.push(['A1', null, 'A2']);
    lowerFloor.push(['A3', null, 'A4']);
    lowerFloor.push(['A5', null, 'A6']);
    lowerFloor.push(['A7', null, 'A8']);
    lowerFloor.push(['A9', null, 'A10']);
    lowerFloor.push(['A11', null, 'A12']);
    lowerFloor.push(['A13', null, 'A14']);
    lowerFloor.push(['A15', null, 'A16']);
    lowerFloor.push(['A17', 'A18', 'A19']);
    return { lowerFloor, upperFloor: [], columns: 3 };
  }

  if (totalSeats === 16) {
    lowerFloor.push(['A1', 'A2', null, 'A3']);
    lowerFloor.push(['A4', 'A5', null, 'A6']);
    lowerFloor.push(['A7', 'A8', null, 'A9']);
    lowerFloor.push(['A10', 'A11', null, 'A12']);
    lowerFloor.push(['A13', 'A14', 'A15', 'A16']);
    return { lowerFloor, upperFloor: [], columns: 4 };
  }

  if (totalSeats === 29) {
    lowerFloor.push(['A1', 'A2', null, 'A3', 'A4']);
    lowerFloor.push(['A5', 'A6', null, 'A7', 'A8']);
    lowerFloor.push(['A9', 'A10', null, 'A11', 'A12']);
    lowerFloor.push(['A13', 'A14', null, 'A15', 'A16']);
    lowerFloor.push(['A17', 'A18', null, 'A19', 'A20']);
    lowerFloor.push(['A21', 'A22', null, 'A23', 'A24']);
    lowerFloor.push(['A25', 'A26', 'A27', 'A28', 'A29']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  if (totalSeats === 35) {
    lowerFloor.push([null, null, null, 'A1', 'A2']);
    lowerFloor.push(['A3', 'A4', null, 'A5', 'A6']);
    lowerFloor.push(['A7', 'A8', null, 'A9', 'A10']);
    lowerFloor.push(['A11', 'A12', null, 'A13', 'A14']);
    lowerFloor.push(['A15', 'A16', null, 'A17', 'A18']);
    lowerFloor.push(['A19', 'A20', null, 'A21', 'A22']);
    lowerFloor.push(['A23', 'A24', null, 'A25', 'A26']);
    lowerFloor.push(['A27', 'A28', null, 'A29', 'A30']);
    lowerFloor.push(['A31', 'A32', 'A33', 'A34', 'A35']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  if (totalSeats === 45) {
    lowerFloor.push(['A1', 'A2', null, 'A3', 'A4']);
    lowerFloor.push(['A5', 'A6', null, 'A7', 'A8']);
    lowerFloor.push(['A9', 'A10', null, 'A11', 'A12']);
    lowerFloor.push(['A13', 'A14', null, 'A15', 'A16']);
    lowerFloor.push(['A17', 'A18', null, 'A19', 'A20']);
    lowerFloor.push(['A21', 'A22', null, 'A23', 'A24']);
    lowerFloor.push(['A25', 'A26', null, 'A27', 'A28']);
    lowerFloor.push(['A29', 'A30', null, 'A31', 'A32']);
    lowerFloor.push(['A33', 'A34', null, 'A35', 'A36']);
    lowerFloor.push(['A37', 'A38', null, 'A39', 'A40']);
    lowerFloor.push(['A41', 'A42', 'A43', 'A44', 'A45']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  // Generic fallback if no specific seat number matches
  const rows = Math.ceil(totalSeats / 4);
  for (let i = 0; i < rows; i++) {
    const row = [];
    row.push(`A${i * 4 + 1}`);
    row.push(i * 4 + 2 <= totalSeats ? `A${i * 4 + 2}` : null);
    row.push(null);
    row.push(i * 4 + 3 <= totalSeats ? `A${i * 4 + 3}` : null);
    row.push(i * 4 + 4 <= totalSeats ? `A${i * 4 + 4}` : null);
    lowerFloor.push(row);
  }
  return { lowerFloor, upperFloor: [], columns: 5 };
};

const ManagerApprovalsPage = () => {
  const { token, user } = useContext(AuthContext);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'leave', 'bus', 'route'
  const [searchTerm, setSearchTerm] = useState('');

  // Detailed Modal state
  const [selectedBus, setSelectedBus] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      if (user?.role === 'fleet_manager') {
        const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          const mappedBuses = (data.buses || []).map(bus => ({
            id: bus._id,
            sender: { name: user.name || 'Quản lý Đội xe', role: 'fleet_manager', phone: user.phone || '0988888888' },
            type: 'bus',
            typeName: 'Thêm xe mới',
            details: `Yêu cầu phê duyệt xe mới biển số ${bus.plateNumber} (${bus.type}, ${bus.totalSeats} chỗ)`,
            createdAt: bus.createdAt,
            status: bus.status || 'pending',
            plateNumber: bus.plateNumber,
            rawBus: bus
          }));
          setApprovals(mappedBuses);
        } else {
          setError(data.message || 'Không thể tải danh sách yêu cầu phê duyệt xe.');
        }
      } else {
        const leaveRes = await fetch(`${API_BASE}/users/admin/leaves`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const leaveData = await leaveRes.json();

        const busRes = await fetch(`${API_BASE}/trips/fleet/buses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const busData = await busRes.json();

        const routeRes = await fetch(`${API_BASE}/trips/ops/routes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const routeData = await routeRes.json();

        let merged = [];

        if (leaveRes.ok && leaveData.success) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const mappedLeaves = (leaveData.leaves || [])
            .filter(item => !item.type || item.type === 'leave')
            .map(item => {
              const isPastLeave = item.startDate && new Date(item.startDate) < today;
              const effectiveStatus = (item.status === 'pending' && isPastLeave) ? 'rejected' : item.status;

              return {
                id: item._id,
                sender: item.userId || { name: 'Nhân viên', role: 'staff' },
                type: 'leave',
                typeName: 'Đơn xin nghỉ phép',
                details: item.details || `Nghỉ từ ${new Date(item.startDate).toLocaleDateString('vi-VN')} đến ${new Date(item.endDate).toLocaleDateString('vi-VN')}. Lý do: ${item.reason}`,
                createdAt: item.createdAt,
                status: effectiveStatus,
                startDate: item.startDate,
                endDate: item.endDate,
                reason: item.reason
              };
            });
          merged = [...merged, ...mappedLeaves];
        }

        if (busRes.ok && busData.success) {
          const mappedBuses = (busData.buses || []).map(bus => ({
            id: bus._id,
            sender: { name: 'Quản lý Đội xe', role: 'fleet_manager', phone: '0988888888' },
            type: 'bus',
            typeName: 'Thêm xe mới',
            details: `Yêu cầu phê duyệt xe mới biển số ${bus.plateNumber} (${bus.type}, ${bus.totalSeats} chỗ)`,
            createdAt: bus.createdAt,
            status: bus.status || 'pending',
            plateNumber: bus.plateNumber,
            rawBus: bus
          }));
          merged = [...merged, ...mappedBuses];
        }

        if (routeRes.ok && routeData.success) {
          const mappedRoutes = (routeData.routes || []).map(route => ({
            id: route._id,
            sender: { name: 'Quản lý Vận tải', role: 'ops_manager', phone: '0977777777' },
            type: 'route',
            typeName: 'Thêm tuyến mới',
            details: `Yêu cầu phê duyệt tuyến đường mới: ${route.startPoint} ⇄ ${route.endPoint} (${route.distance}, ${route.duration})`,
            createdAt: route.createdAt,
            status: route.status || 'pending',
            rawRoute: route
          }));
          merged = [...merged, ...mappedRoutes];
        }

        merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setApprovals(merged);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy danh sách hồ sơ phê duyệt.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchApprovals();
    }
  }, [token, user]);

  const handleStatusUpdate = async (item, status) => {
    setError('');
    setSuccess('');
    const statusText = status === 'approved' ? 'duyệt' : 'từ chối';
    
    if (!window.confirm(`Bạn có chắc chắn muốn ${statusText} yêu cầu này?`)) {
      return;
    }

    try {
      let res;
      if (item.type === 'bus') {
        res = await fetch(`${API_BASE}/trips/fleet/buses/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
      } else if (item.type === 'route') {
        res = await fetch(`${API_BASE}/trips/ops/routes/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
      } else {
        res = await fetch(`${API_BASE}/users/admin/leaves/${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
      }

      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(`Đã ${statusText} yêu cầu thành công!`);
        fetchApprovals();
      } else {
        setError(data.message || `Lỗi khi xử lý phê duyệt.`);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi cập nhật trạng thái phê duyệt.');
    }
  };

  const handleModalStatusUpdate = async (busId, status) => {
    const item = approvals.find(app => app.type === 'bus' && app.id === busId);
    if (item) {
      setSelectedBus(null);
      await handleStatusUpdate(item, status);
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      driver: 'Tài xế',
      attendant: 'Phụ xe',
      ticket_agent: 'Bán vé',
      fleet_manager: 'QL Đội xe',
      ops_manager: 'QL Vận tải',
      admin: 'Quản trị viên',
      staff: 'Nhân viên'
    };
    return roles[role] || role;
  };

  const getInitials = (name) => {
    if (!name) return 'NV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarStyle = (role) => {
    switch (role) {
      case 'ticket_agent':
        return { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' };
      case 'driver':
        return { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' };
      case 'fleet_manager':
        return { bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' };
      case 'ops_manager':
        return { bg: '#e0e7ff', color: '#1e40af', border: '#bfdbfe' };
      default:
        return { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span style={{
            background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span style={{
            background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5',
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Từ chối
          </span>
        );
      default:
        return (
          <span style={{
            background: '#fffbe6', color: '#d97706', border: '1px solid #fef3c7',
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700',
            display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
            Chờ duyệt
          </span>
        );
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'leave':
        return <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Nghỉ phép</span>;
      case 'bus':
        return <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Thêm xe mới</span>;
      case 'route':
        return <span style={{ background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', padding: '3px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Thêm tuyến mới</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Khác</span>;
    }
  };

  // Stat Counters
  const totalCount = approvals.length;
  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;
  const approvalRate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : '95.4';

  const filteredApprovals = approvals.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    if (!searchTerm.trim()) return matchesStatus && matchesType;

    const term = searchTerm.toLowerCase();
    const senderName = (item.sender?.name || '').toLowerCase();
    const senderRole = getRoleLabel(item.sender?.role || '').toLowerCase();
    const senderPhone = (item.sender?.phone || '').toLowerCase();
    const details = (item.details || '').toLowerCase();
    const plate = (item.plateNumber || '').toLowerCase();

    const matchesSearch = 
      senderName.includes(term) || 
      senderRole.includes(term) || 
      senderPhone.includes(term) || 
      details.includes(term) || 
      plate.includes(term);

    return matchesStatus && matchesType && matchesSearch;
  });

  // Render Visual read-only seat map for approval preview
  const renderReadOnlySeatMap = (bus) => {
    const layout = bus.seatLayout && bus.seatLayout.lowerFloor && bus.seatLayout.lowerFloor.length > 0
      ? bus.seatLayout 
      : generateDefaultSeatLayout(bus.totalSeats, bus.type);

    const { lowerFloor, upperFloor, columns = 3 } = layout;
    const hasUpper = upperFloor && upperFloor.length > 0;

    const renderFloor = (floorData, title) => (
      <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: '700', textAlign: 'center', margin: '5px 0', color: 'var(--text-main)' }}>{title}</h4>
        <div style={{
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '12px',
          background: 'rgba(0,0,0,0.03)',
          maxHeight: '340px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--card-border)', paddingBottom: '6px', marginBottom: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>PHÍA TRƯỚC - GHẾ TÀI XẾ</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '8px' }}>
            {(floorData || []).map((row, rIdx) => 
              row.map((cell, cIdx) => {
                const isSeat = cell !== null;
                return (
                  <div 
                    key={`${rIdx}-${cIdx}`}
                    style={{
                      height: '38px',
                      borderRadius: '6px',
                      border: isSeat ? '1.5px solid var(--primary)' : '1px dashed rgba(255,255,255,0.15)',
                      backgroundColor: isSeat ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: isSeat ? '700' : 'normal',
                      color: isSeat ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                  >
                    {cell || ''}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
        {renderFloor(lowerFloor, hasUpper ? 'Tầng 1 (Tầng dưới)' : 'Sơ đồ vị trí ghế')}
        {hasUpper && renderFloor(upperFloor, 'Tầng 2 (Tầng trên)')}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* 1. BREADCRUMBS & TOP HEADER */}
      <div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>
          Hệ thống / Điều hành / <span style={{ color: '#2563eb', fontWeight: '600' }}>Phê duyệt yêu cầu</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              Trung Tâm Phê Duyệt Hồ Sơ &amp; Đơn Từ
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
              Phê duyệt đơn nghỉ phép của nhân sự, hồ sơ thêm phương tiện mới và yêu cầu mở tuyến của Quản lý xe.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => alert('Đang xuất danh sách hồ sơ phê duyệt...')}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                fontSize: '0.825rem', fontWeight: '700', padding: '8px 16px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất danh sách
            </button>
            <button
              onClick={fetchApprovals}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontSize: '0.825rem', fontWeight: '700', padding: '8px 16px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Làm mới dữ liệu
            </button>
          </div>
        </div>
      </div>

      {/* 2. STAT CARDS ROW (4 KPI Cards) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem'
      }}>
        {/* Card 1: Tổng số */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>TỔNG SỐ HỒ SƠ</span>
            <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
              {totalCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Toàn bộ kỳ vận hành 09/2026
            </div>
          </div>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
        </div>

        {/* Card 2: Chờ xem xét (Highlight Warning) */}
        <div style={{
          backgroundColor: '#ffffff', border: '1.5px solid #fed7aa', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.06)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b45309', letterSpacing: '0.5px' }}>CHỜ XEM XÉT</span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#d97706', margin: '4px 0 2px 0', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              {String(pendingCount).padStart(2, '0')}
              <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: '600' }}>yêu cầu</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '500' }}>
              Cần phê duyệt trong ngày
            </div>
          </div>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#fff7ed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>

        {/* Card 3: Đã chấp thuận */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>ĐÃ CHẤP THUẬN</span>
            <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
              {approvedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
              {approvalRate}% tỷ lệ phản hồi
            </div>
          </div>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#ecfdf5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
        </div>

        {/* Card 4: Đã từ chối */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>ĐÃ TỪ CHỐI</span>
            <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#dc2626', margin: '4px 0 2px 0' }}>
              {String(rejectedCount).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Không đủ điều kiện tuyển
            </div>
          </div>
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
        </div>
      </div>

      {/* 3. FILTER & TABLE MAIN PANEL */}
      <section className="panel" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        
        {/* Filter Bar Row 1: Status Pills & Type Dropdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          
          {/* Status Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { key: 'all', label: 'Tất cả trạng thái', count: totalCount },
              { key: 'pending', label: 'Chờ duyệt', count: pendingCount },
              { key: 'approved', label: 'Đã duyệt', count: approvedCount },
              { key: 'rejected', label: 'Từ chối', count: rejectedCount }
            ].map(tab => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
                    border: isActive ? 'none' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#2563eb' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b',
                    padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800'
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Type Filter Dropdown */}
          {user?.role !== 'fleet_manager' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Loại hồ sơ:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: '7px 14px', fontSize: '0.8rem', border: '1px solid #cbd5e1',
                  borderRadius: '8px', background: '#ffffff', color: '#0f172a',
                  fontWeight: '600', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="all">Tất cả loại hồ sơ</option>
                <option value="leave">Đơn xin nghỉ phép</option>
                <option value="bus">Thêm xe mới</option>
                <option value="route">Yêu cầu thêm tuyến</option>
              </select>
            </div>
          )}
        </div>

        {/* Filter Bar Row 2: Search Input & Date Picker Pill */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên người gửi, chức vụ, số điện thoại, biển số xe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.825rem',
                border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc',
                color: '#0f172a', outline: 'none'
              }}
            />
          </div>

          <div style={{
            padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff', color: '#475569', fontSize: '0.8rem', fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            22/09/2026 - Hôm nay
          </div>
        </div>

        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500' }}>{success}</div>}

        {/* TABLE CONTENT */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ color: '#2563eb', fontWeight: '600' }}>Đang tải danh sách hồ sơ...</div>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
            Không tìm thấy hồ sơ hoặc đơn từ nào ở trạng thái này.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NGƯỜI GỬI</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOẠI HỒ SƠ</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHI TIẾT NỘI DUNG HỒ SƠ ĐỀ XUẤT</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>THỜI GIAN GỬI</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((item) => {
                  const senderName = item.sender?.name || 'Nhân viên';
                  const senderRoleKey = item.sender?.role || 'staff';
                  const senderRole = getRoleLabel(senderRoleKey);
                  const senderPhone = item.sender?.phone || '0988888888';
                  const initials = getInitials(senderName);
                  const avatarStyle = getAvatarStyle(senderRoleKey);

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      
                      {/* 1. NGƯỜI GỬI */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            backgroundColor: avatarStyle.bg, color: avatarStyle.color,
                            border: `1px solid ${avatarStyle.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.825rem', fontWeight: '800', flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0f172a', whiteSpace: 'nowrap' }}>{senderName}</span>
                              <span style={{
                                fontSize: '0.675rem', fontWeight: '700', backgroundColor: '#eff6ff',
                                color: '#1e40af', padding: '1px 7px', borderRadius: '10px',
                                border: '1px solid #bfdbfe', whiteSpace: 'nowrap'
                              }}>
                                {senderRole}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {senderPhone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. LOẠI HỒ SƠ */}
                      <td style={{ padding: '1rem' }}>
                        {getTypeBadge(item.type)}
                      </td>

                      {/* 3. CHI TIẾT NỘI DUNG HỒ SƠ ĐỀ XUẤT */}
                      <td style={{ padding: '1rem', fontSize: '0.825rem', color: '#0f172a', maxWidth: '380px' }}>
                        <div style={{ fontWeight: '600', lineHeight: '1.4' }}>{item.details}</div>
                        {item.type === 'bus' && item.rawBus && (
                          <button
                            onClick={() => setSelectedBus(item.rawBus)}
                            style={{
                              background: 'none', border: 'none', color: '#2563eb',
                              fontWeight: '700', padding: 0, textDecoration: 'none',
                              cursor: 'pointer', marginTop: '4px', fontSize: '0.775rem',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Xem sơ đồ ghế &amp; thông tin chi tiết xe
                          </button>
                        )}
                      </td>

                      {/* 4. THỜI GIAN GỬI */}
                      <td style={{ padding: '1rem', fontSize: '0.775rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          {formatDate(item.createdAt)}
                        </div>
                      </td>

                      {/* 5. TRẠNG THÁI */}
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(item.status)}
                      </td>

                      {/* 6. THAO TÁC */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {user?.role === 'fleet_manager' ? (
                          <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}>
                            {item.status === 'pending' && 'Chờ QL nhà xe duyệt'}
                            {item.status === 'approved' && 'Đã được duyệt'}
                            {item.status === 'rejected' && 'Đã bị từ chối'}
                          </span>
                        ) : item.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleStatusUpdate(item, 'approved')}
                              style={{
                                border: 'none', backgroundColor: '#059669', color: '#ffffff',
                                fontSize: '0.75rem', fontWeight: '700', padding: '6px 12px',
                                borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                boxShadow: '0 1px 2px rgba(5,150,105,0.2)'
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(item, 'rejected')}
                              style={{
                                border: '1px solid #fca5a5', backgroundColor: '#ffffff', color: '#dc2626',
                                fontSize: '0.75rem', fontWeight: '700', padding: '5px 11px',
                                borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (item.type === 'bus' && item.rawBus) setSelectedBus(item.rawBus);
                              else alert(`Hồ sơ "${item.typeName}" đã được xử lý ở trạng thái: ${item.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}`);
                            }}
                            style={{
                              background: 'none', border: 'none', color: '#64748b', fontSize: '0.775rem',
                              fontWeight: '600', cursor: 'pointer', textDecoration: 'underline'
                            }}
                          >
                            {item.type === 'bus' ? 'Xem chi tiết' : 'Xem lại'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* DETAIL MODAL FOR VEHICLE INFO & SEAT LAYOUT */}
      {selectedBus && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1050, transition: 'all 0.3s ease'
          }}
        >
          <div 
            style={{
              background: '#ffffff', borderRadius: '12px', width: '90%',
              maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', padding: '1.75rem',
              display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Chi Tiết Xe Biển Số: <span style={{ color: 'var(--primary)' }}>{selectedBus.plateNumber}</span>
              </h2>
              <button 
                onClick={() => setSelectedBus(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }} className="modal-body-grid">
              
              {/* Left Column: Vehicle Info & Image */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <img 
                  src={selectedBus.images?.[0] || DEFAULT_IMAGE} 
                  alt={selectedBus.plateNumber}
                  style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--card-border)' }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                  <div><strong>Loại phương tiện:</strong> {selectedBus.type}</div>
                  <div><strong>Tổng số chỗ ngồi:</strong> {selectedBus.totalSeats} ghế</div>
                  <div>
                    <strong>Tiện ích trên xe:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                      {selectedBus.amenities && selectedBus.amenities.length > 0 ? (
                        selectedBus.amenities.map((am, i) => (
                          <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                            {am}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không có</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <strong>Trạng thái hiện tại:</strong>{' '}
                    <span style={{
                      fontWeight: '700',
                      color: selectedBus.status === 'approved' ? 'var(--success)' : selectedBus.status === 'rejected' ? '#ef4444' : 'var(--warning)'
                    }}>
                      {selectedBus.status === 'approved' && 'Đã phê duyệt'}
                      {selectedBus.status === 'rejected' && 'Đã từ chối'}
                      {selectedBus.status === 'pending' && 'Chờ phê duyệt'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Seat layout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {renderReadOnlySeatMap(selectedBus)}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setSelectedBus(null)} 
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Đóng
              </button>
              
              {/* Only show decision buttons inside modal if GM is logged in and status is pending */}
              {user?.role !== 'fleet_manager' && selectedBus.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleModalStatusUpdate(selectedBus._id, 'rejected')} 
                    className="btn btn-danger"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', backgroundColor: '#ef4444' }}
                  >
                    Từ chối
                  </button>
                  <button 
                    onClick={() => handleModalStatusUpdate(selectedBus._id, 'approved')} 
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    Duyệt xe này
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerApprovalsPage;
