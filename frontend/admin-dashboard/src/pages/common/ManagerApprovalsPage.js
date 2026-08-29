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
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'leave', 'bus', 'maintenance', 'incident'

  // Detailed Modal state
  const [selectedBus, setSelectedBus] = useState(null); 
  const [activeFloor, setActiveFloor] = useState('lower'); // 'lower', 'upper'

  const fetchApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      if (user?.role === 'fleet_manager') {
        // Fleet Manager: Only view status of their own submitted vehicles
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
        // General Manager / Admin: View and manage Leave requests, Bus approvals AND Route approvals
        // 1. Fetch Leaves
        const leaveRes = await fetch(`${API_BASE}/users/admin/leaves`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const leaveData = await leaveRes.json();

        // 2. Fetch Buses
        const busRes = await fetch(`${API_BASE}/trips/fleet/buses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const busData = await busRes.json();

        // 3. Fetch Routes
        const routeRes = await fetch(`${API_BASE}/trips/ops/routes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const routeData = await routeRes.json();

        let merged = [];

        if (leaveRes.ok && leaveData.success) {
          const mappedLeaves = (leaveData.leaves || [])
            .filter(item => !item.type || item.type === 'leave')
            .map(item => ({
              id: item._id,
              sender: item.userId || { name: 'Nhân viên', role: 'staff' },
              type: 'leave',
              typeName: 'Đơn xin nghỉ phép',
              details: item.details || `Nghỉ từ ${new Date(item.startDate).toLocaleDateString('vi-VN')} đến ${new Date(item.endDate).toLocaleDateString('vi-VN')}. Lý do: ${item.reason}`,
              createdAt: item.createdAt,
              status: item.status
            }));
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

        // Sort by createdAt descending
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
      admin: 'Quản trị viên'
    };
    return roles[role] || role;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN') + ' ' + new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span style={{ background: 'rgba(46, 207, 128, 0.1)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Đã duyệt</span>;
      case 'rejected':
        return <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Từ chối</span>;
      default:
        return <span style={{ background: 'rgba(241, 180, 76, 0.1)', color: 'var(--warning)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Chờ duyệt</span>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'leave':
        return <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Nghỉ phép</span>;
      case 'bus':
        return <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Thêm xe mới</span>;
      case 'route':
        return <span style={{ background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Thêm tuyến mới</span>;
      case 'maintenance':
        return <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Bảo trì xe</span>;
      case 'incident':
        return <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Sự cố đường</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Khác</span>;
    }
  };

  const filteredApprovals = approvals.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesStatus && matchesType;
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
          {/* Driver seat marker */}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Approval Center Panel */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e8ebf3', paddingBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>
              {user?.role === 'fleet_manager' ? 'Danh Sách Xe Đang Chờ Phê Duyệt' : 'Trung Tâm Phê Duyệt Hồ Sơ & Đơn Từ'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              {user?.role === 'fleet_manager' 
                ? 'Theo dõi trạng thái các phương tiện mới gửi lên ban giám đốc chờ phê duyệt vào hệ thống.' 
                : 'Phê duyệt đơn nghỉ phép của nhân sự và hồ sơ thêm phương tiện mới của Quản lý xe.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {user?.role !== 'fleet_manager' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>Loại hồ sơ:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--border-color)',
                    borderRadius: '6px', background: '#ffffff', color: 'var(--text-main)',
                    fontWeight: '600', outline: 'none'
                  }}
                >
                  <option value="all">Tất cả loại hồ sơ</option>
                  <option value="leave">Đơn xin nghỉ phép</option>
                  <option value="bus">Thêm xe mới</option>
                  <option value="route">Yêu cầu thêm tuyến</option>
                </select>
              </div>
            )}

            {/* Status Filter buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['all', 'pending', 'approved', 'rejected'].map((item) => {
                const labels = {
                  all: 'Tất cả trạng thái',
                  pending: 'Chờ duyệt',
                  approved: 'Đã duyệt',
                  rejected: 'Từ chối'
                };
                return (
                  <button
                    key={item}
                    onClick={() => setStatusFilter(item)}
                    className={`btn ${statusFilter === item ? '' : 'btn-secondary'}`}
                    style={{
                      padding: '6px 14px', fontSize: '0.8rem', fontWeight: '700',
                      border: statusFilter === item ? 'none' : '1px solid var(--border-color)',
                      backgroundColor: statusFilter === item ? 'var(--primary)' : '#ffffff',
                      color: statusFilter === item ? '#ffffff' : 'var(--text-main)',
                      borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    {labels[item]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500' }}>{success}</div>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải danh sách hồ sơ...</div>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Không tìm thấy hồ sơ hoặc đơn từ nào ở trạng thái này.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Người gửi</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Loại hồ sơ</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Chi tiết nội dung hồ sơ đề xuất</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Thời gian gửi</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((item) => {
                  const senderName = item.sender?.name || 'Nhân viên';
                  const senderRole = item.sender?.role ? getRoleLabel(item.sender.role) : 'Chưa rõ';
                  const senderPhone = item.sender?.phone || '';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      {/* Sender Info */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{senderName}</span>
                            <span style={{
                              fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#eff6ff',
                              color: '#1e40af', padding: '2px 8px', borderRadius: '12px',
                              border: '1px solid #bfdbfe', whiteSpace: 'nowrap'
                            }}>
                              {senderRole}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            ĐT: {senderPhone}
                          </span>
                        </div>
                      </td>

                      {/* Document Type Badge */}
                      <td style={{ padding: '1rem' }}>
                        {getTypeBadge(item.type)}
                      </td>

                      {/* Content details */}
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', maxWidth: '350px' }}>
                        <div style={{ fontWeight: '600' }}>{item.details}</div>
                        {item.type === 'bus' && item.rawBus && (
                          <button
                            onClick={() => setSelectedBus(item.rawBus)}
                            style={{
                              background: 'none', border: 'none', color: 'var(--primary)',
                              fontWeight: '700', padding: 0, textDecoration: 'underline',
                              cursor: 'pointer', marginTop: '6px', fontSize: '0.8rem'
                            }}
                          >
                            Xem sơ đồ &amp; thông tin chi tiết xe
                          </button>
                        )}
                      </td>

                      {/* Time submitted */}
                      <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {user?.role === 'fleet_manager' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
                            {item.status === 'pending' && 'Chờ QL nhà xe duyệt'}
                            {item.status === 'approved' && 'Đã được duyệt'}
                            {item.status === 'rejected' && 'Đã bị từ chối'}
                          </span>
                        ) : item.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleStatusUpdate(item, 'approved')}
                              style={{
                                border: 'none', backgroundColor: 'var(--success)', color: '#ffffff',
                                fontSize: '0.75rem', fontWeight: '700', padding: '6px 12px',
                                borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap'
                              }}
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(item, 'rejected')}
                              style={{
                                border: 'none', backgroundColor: '#ef4444', color: '#ffffff',
                                fontSize: '0.75rem', fontWeight: '700', padding: '6px 12px',
                                borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap'
                              }}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>
                            {item.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                          </span>
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

      {/* DETAIL MODAL FOR VECHICLE INFO & SEAT LAYOUT */}
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
