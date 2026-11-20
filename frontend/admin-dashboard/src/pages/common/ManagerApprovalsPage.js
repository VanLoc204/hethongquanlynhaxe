import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import MonthlyFleetExpenseReportModal from '../../components/MonthlyFleetExpenseReportModal';
import MonthlyAreaRevenueReportModal from '../../components/MonthlyAreaRevenueReportModal';

const API_BASE = 'http://localhost:8000/api';
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
        lowerFloor.push(['A1', null, 'A2', null, 'A3']);
        lowerFloor.push(['A4', null, 'A5', null, 'A6']);
        lowerFloor.push(['A7', null, 'A8', null, 'A9']);
        lowerFloor.push(['A10', null, 'A11', null, 'A12']);
        lowerFloor.push(['A13', null, 'A14', null, 'A15']);
        lowerFloor.push(['A16', null, 'A17', null, 'A18']);
        lowerFloor.push(['A19', 'A20', 'A21', 'A22']);

        upperFloor.push(['B1', null, 'B2', null, 'B3']);
        upperFloor.push(['B4', null, 'B5', null, 'B6']);
        upperFloor.push(['B7', null, 'B8', null, 'B9']);
        upperFloor.push(['B10', null, 'B11', null, 'B12']);
        upperFloor.push(['B13', null, 'B14', null, 'B15']);
        upperFloor.push(['B16', null, 'B17', null, 'B18']);
        upperFloor.push(['B19', 'B20', 'B21', 'B22']);
      }
      return { lowerFloor, upperFloor, columns: 5 };
    }
  }

  // Single decker layout
  if (totalSeats <= 9) {
    lowerFloor.push([null, 'A1', 'A2']);
    lowerFloor.push(['A3', null, 'A4']);
    lowerFloor.push(['A5', null, 'A6']);
    lowerFloor.push(['A7', 'A8', 'A9']);
    return { lowerFloor, upperFloor: [], columns: 3 };
  }

  if (totalSeats <= 16) {
    lowerFloor.push([null, 'A1', null]);
    lowerFloor.push(['A2', null, 'A3']);
    lowerFloor.push(['A4', null, 'A5']);
    lowerFloor.push(['A6', null, 'A7']);
    lowerFloor.push(['A8', 'A9', 'A10']);
    lowerFloor.push(['A11', 'A12', 'A13']);
    lowerFloor.push(['A14', 'A15', 'A16']);
    return { lowerFloor, upperFloor: [], columns: 3 };
  }

  if (totalSeats <= 29) {
    lowerFloor.push(['A1', 'A2', null, 'A3', 'A4']);
    lowerFloor.push(['A5', 'A6', null, 'A7', 'A8']);
    lowerFloor.push(['A9', 'A10', null, 'A11', 'A12']);
    lowerFloor.push(['A13', 'A14', null, 'A15', 'A16']);
    lowerFloor.push(['A17', 'A18', null, 'A19', 'A20']);
    lowerFloor.push(['A21', 'A22', null, 'A23', 'A24']);
    lowerFloor.push(['A25', 'A26', 'A27', 'A28', 'A29']);
    return { lowerFloor, upperFloor: [], columns: 5 };
  }

  // 45 / 47 seats
  for (let i = 1; i <= 40; i += 4) {
    lowerFloor.push([`A${i}`, `A${i+1}`, null, `A${i+2}`, `A${i+3}`]);
  }
  lowerFloor.push(['A41', 'A42', 'A43', 'A44', 'A45']);
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
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [selectedFleetExpenseReport, setSelectedFleetExpenseReport] = useState(null);
  const [actionLoadingExpense, setActionLoadingExpense] = useState(false);
  const [selectedAreaRevenueReport, setSelectedAreaRevenueReport] = useState(null);
  const [actionLoadingAreaRev, setActionLoadingAreaRev] = useState(false);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [maintenanceRejectionReason, setMaintenanceRejectionReason] = useState('');
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const fetchApprovals = async () => {
    setLoading(true);
    setError('');

    const mapMaintenanceBus = (bus) => {
      const mInfo = bus.maintenanceInfo || {};
      let effectiveStatus = 'pending';
      if (mInfo.approvalStatus === 'approved') effectiveStatus = 'approved';
      else if (mInfo.approvalStatus === 'rejected') effectiveStatus = 'rejected';
      else effectiveStatus = 'pending';

      const sender = (mInfo.proposedBy && typeof mInfo.proposedBy === 'object') ? {
        name: mInfo.proposedBy.name || 'Quản lý Đội xe',
        role: mInfo.proposedBy.role || 'fleet_manager',
        phone: mInfo.proposedBy.phone || '0988888888'
      } : {
        name: 'Quản lý Đội xe',
        role: 'fleet_manager',
        phone: '0988888888'
      };

      const costFormatted = Number(mInfo.estimatedCost || 0).toLocaleString('vi-VN') + ' ₫';

      return {
        id: bus._id,
        sender,
        type: 'maintenance',
        typeName: 'Chi phí bảo trì xe',
        details: `Đề xuất phê duyệt ngân sách bảo trì xe ${bus.plateNumber}: ${costFormatted} (Gara: ${mInfo.garage || 'N/A'}). Hạng mục: ${mInfo.description || 'Không có mô tả chi tiết'}`,
        createdAt: bus.updatedAt || bus.createdAt,
        status: effectiveStatus,
        plateNumber: bus.plateNumber,
        rawBus: bus,
        maintenanceInfo: mInfo,
        cost: mInfo.estimatedCost
      };
    };

    try {
      if (user?.role === 'fleet_manager') {
        const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const maintRes = await fetch(`${API_BASE}/trips/fleet/maintenance-approvals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const maintData = await maintRes.json();
        
        let merged = [];
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
          merged = [...merged, ...mappedBuses];
        }

        if (maintRes.ok && maintData.success) {
          const mappedMaint = (maintData.buses || []).map(mapMaintenanceBus);
          merged = [...merged, ...mappedMaint];
        }

        const expenseRes = await fetch(`${API_BASE}/trips/fleet-expense-reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const expenseData = await expenseRes.json();
        if (expenseRes.ok && expenseData.success) {
          const mappedExpenses = (expenseData.reports || []).map(rep => ({
            id: rep._id,
            sender: rep.fleetManagerId || { name: 'Phạm Minh Tuấn', role: 'fleet_manager', phone: '0988888888' },
            type: 'fleet_expense',
            typeName: 'Chi tiêu đội xe',
            details: `Báo cáo chi tiêu Đội xe Tháng ${rep.month}/${rep.year} (${rep.reportCode}) - Tổng chi phí quyết toán: ${formatCurrency(rep.summary?.totalExpenses)}. Tiền bảo trì: ${formatCurrency(rep.summary?.totalMaintenanceCost)}, Tiền dầu: ${formatCurrency(rep.summary?.totalFuelCost)}`,
            createdAt: rep.submittedAt || rep.createdAt,
            status: rep.status || 'pending',
            rawReport: rep
          }));
          merged = [...merged, ...mappedExpenses];
        }

        const areaRevRes = await fetch(`${API_BASE}/users/area-revenue-reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const areaRevData = await areaRevRes.json();
        if (areaRevRes.ok && areaRevData.success) {
          const mappedAreaRev = (areaRevData.reports || []).map(rep => ({
            id: rep._id,
            sender: rep.ticketManagerId || { name: 'Lê Trọng Nghĩa', role: 'ticket_manager', phone: '0977888999' },
            type: 'area_revenue',
            typeName: 'Doanh thu khu vực',
            details: `Báo cáo doanh thu ${rep.branchName || 'Chi nhánh'} Tháng ${rep.month}/${rep.year} (${rep.reportCode}) - Tổng thực thu: ${formatCurrency(rep.summary?.totalRevenue)}. Tiền mặt quầy: ${formatCurrency(rep.summary?.cashRevenue)}, VietQR/CK: ${formatCurrency(rep.summary?.cashlessRevenue)}`,
            createdAt: rep.submittedAt || rep.createdAt,
            status: rep.status || 'pending',
            rawReport: rep
          }));
          merged = [...merged, ...mappedAreaRev];
        }

        merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setApprovals(merged);
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

        const maintRes = await fetch(`${API_BASE}/trips/fleet/maintenance-approvals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const maintData = await maintRes.json();

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

        if (maintRes.ok && maintData.success) {
          const mappedMaint = (maintData.buses || []).map(mapMaintenanceBus);
          merged = [...merged, ...mappedMaint];
        }

        const expenseRes = await fetch(`${API_BASE}/trips/fleet-expense-reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const expenseData = await expenseRes.json();
        if (expenseRes.ok && expenseData.success) {
          const mappedExpenses = (expenseData.reports || []).map(rep => ({
            id: rep._id,
            sender: rep.fleetManagerId || { name: 'Phạm Minh Tuấn', role: 'fleet_manager', phone: '0988888888' },
            type: 'fleet_expense',
            typeName: 'Chi tiêu đội xe',
            details: `Báo cáo chi tiêu Đội xe Tháng ${rep.month}/${rep.year} (${rep.reportCode}) - Tổng chi phí quyết toán: ${formatCurrency(rep.summary?.totalExpenses)}. Tiền bảo trì: ${formatCurrency(rep.summary?.totalMaintenanceCost)}, Tiền dầu: ${formatCurrency(rep.summary?.totalFuelCost)}`,
            createdAt: rep.submittedAt || rep.createdAt,
            status: rep.status || 'pending',
            rawReport: rep
          }));
          merged = [...merged, ...mappedExpenses];
        }

        const areaRevRes = await fetch(`${API_BASE}/users/area-revenue-reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const areaRevData = await areaRevRes.json();
        if (areaRevRes.ok && areaRevData.success) {
          const mappedAreaRev = (areaRevData.reports || []).map(rep => ({
            id: rep._id,
            sender: rep.ticketManagerId || { name: 'Lê Trọng Nghĩa', role: 'ticket_manager', phone: '0977888999' },
            type: 'area_revenue',
            typeName: 'Doanh thu khu vực',
            details: `Báo cáo doanh thu ${rep.branchName || 'Chi nhánh'} Tháng ${rep.month}/${rep.year} (${rep.reportCode}) - Tổng thực thu: ${formatCurrency(rep.summary?.totalRevenue)}. Tiền mặt quầy: ${formatCurrency(rep.summary?.cashRevenue)}, VietQR/CK: ${formatCurrency(rep.summary?.cashlessRevenue)}`,
            createdAt: rep.submittedAt || rep.createdAt,
            status: rep.status || 'pending',
            rawReport: rep
          }));
          merged = [...merged, ...mappedAreaRev];
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
      } else if (item.type === 'maintenance') {
        let note = '';
        let reason = '';
        if (status === 'rejected') {
          reason = window.prompt('Nhập lý do từ chối duyệt ngân sách bảo trì (tùy chọn):', 'Chi phí chưa phù hợp') || '';
        } else {
          note = window.prompt('Nhập ý kiến chỉ đạo của Giám đốc (tùy chọn):', 'Đồng ý cấp ngân sách bảo trì') || '';
        }

        res = await fetch(`${API_BASE}/trips/fleet/maintenance-approvals/${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status,
            approvalNote: note,
            rejectionReason: reason
          })
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
        setSuccess(`Đã ${statusText} yêu cầu thành công.`);
        fetchApprovals();
      } else {
        setError(data.message || `Lỗi khi xử lý phê duyệt.`);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi cập nhật trạng thái phê duyệt.');
    }
  };

  const handleMaintenanceModalUpdate = async (status) => {
    if (!selectedMaintenance) return;
    setIsSubmittingMaint(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/trips/fleet/maintenance-approvals/${selectedMaintenance.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          approvalNote: maintenanceNote.trim(),
          rejectionReason: maintenanceRejectionReason.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(status === 'approved' 
          ? `Đã phê duyệt ngân sách bảo trì cho xe ${selectedMaintenance.plateNumber}.` 
          : `Đã từ chối đề xuất ngân sách bảo trì cho xe ${selectedMaintenance.plateNumber}.`
        );
        setSelectedMaintenance(null);
        setMaintenanceNote('');
        setMaintenanceRejectionReason('');
        fetchApprovals();
      } else {
        setError(data.message || 'Lỗi khi xử lý phê duyệt chi phí bảo trì.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi xử lý phê duyệt bảo dưỡng.');
    } finally {
      setIsSubmittingMaint(false);
    }
  };

  const handleApproveFleetExpense = async (directorNotes) => {
    if (!selectedFleetExpenseReport) return;
    setActionLoadingExpense(true);
    try {
      const res = await fetch(`${API_BASE}/trips/fleet-expense-reports/${selectedFleetExpenseReport._id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ directorNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Đã phê duyệt và ký số báo cáo chi tiêu ${selectedFleetExpenseReport.reportCode} thành công!`);
        setSelectedFleetExpenseReport(null);
        fetchApprovals();
      } else {
        alert(data.message || 'Lỗi khi phê duyệt báo cáo chi tiêu.');
      }
    } catch (err) {
      alert('Lỗi máy chủ khi duyệt báo cáo chi tiêu.');
    } finally {
      setActionLoadingExpense(false);
    }
  };

  const handleRejectFleetExpense = async (rejectionReason) => {
    if (!selectedFleetExpenseReport) return;
    setActionLoadingExpense(true);
    try {
      const res = await fetch(`${API_BASE}/trips/fleet-expense-reports/${selectedFleetExpenseReport._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rejectionReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Đã gửi yêu cầu hiệu chỉnh báo cáo chi tiêu ${selectedFleetExpenseReport.reportCode}.`);
        setSelectedFleetExpenseReport(null);
        fetchApprovals();
      } else {
        alert(data.message || 'Lỗi khi từ chối báo cáo.');
      }
    } catch (err) {
      alert('Lỗi máy chủ khi từ chối báo cáo.');
    } finally {
      setActionLoadingExpense(false);
    }
  };

  const handleApproveAreaRevenue = async (directorNotes) => {
    if (!selectedAreaRevenueReport) return;
    setActionLoadingAreaRev(true);
    try {
      const res = await fetch(`${API_BASE}/users/area-revenue-reports/${selectedAreaRevenueReport._id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ directorNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Đã phê duyệt và ký số báo cáo doanh thu ${selectedAreaRevenueReport.reportCode} thành công!`);
        setSelectedAreaRevenueReport(null);
        fetchApprovals();
      } else {
        alert(data.message || 'Lỗi khi phê duyệt báo cáo doanh thu.');
      }
    } catch (err) {
      alert('Lỗi máy chủ khi duyệt báo cáo doanh thu.');
    } finally {
      setActionLoadingAreaRev(false);
    }
  };

  const handleRejectAreaRevenue = async (rejectionReason) => {
    if (!selectedAreaRevenueReport) return;
    setActionLoadingAreaRev(true);
    try {
      const res = await fetch(`${API_BASE}/users/area-revenue-reports/${selectedAreaRevenueReport._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rejectionReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Đã gửi yêu cầu hiệu chỉnh báo cáo doanh thu ${selectedAreaRevenueReport.reportCode}.`);
        setSelectedAreaRevenueReport(null);
        fetchApprovals();
      } else {
        alert(data.message || 'Lỗi khi từ chối báo cáo.');
      }
    } catch (err) {
      alert('Lỗi máy chủ khi từ chối báo cáo.');
    } finally {
      setActionLoadingAreaRev(false);
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
            padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
            whiteSpace: 'nowrap', display: 'inline-block'
          }}>
            Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span style={{
            background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5',
            padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
            whiteSpace: 'nowrap', display: 'inline-block'
          }}>
            Từ chối
          </span>
        );
      default:
        return (
          <span style={{
            background: '#fffbe6', color: '#b45309', border: '1px solid #fef3c7',
            padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
            whiteSpace: 'nowrap', display: 'inline-block'
          }}>
            Chờ duyệt
          </span>
        );
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'leave':
        return <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Nghỉ phép</span>;
      case 'bus':
        return <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Thêm xe mới</span>;
      case 'route':
        return <span style={{ background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Thêm tuyến mới</span>;
      case 'maintenance':
        return <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Chi phí bảo trì xe</span>;
      case 'fleet_expense':
        return <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', whiteSpace: 'nowrap' }}>Chi tiêu đội xe</span>;
      case 'area_revenue':
        return <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', whiteSpace: 'nowrap' }}>Doanh thu khu vực</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Khác</span>;
    }
  };

  // Stat Counters
  const totalCount = approvals.length;
  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;
  const approvalRate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : '100.0';

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
      <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: '700', textAlign: 'center', margin: '4px 0', color: '#0f172a' }}>{title}</h4>
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '10px',
          background: '#f8fafc',
          maxHeight: '320px',
          overflowY: 'auto'
        }}>
          <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px', marginBottom: '8px', fontSize: '0.72rem', color: '#64748b', textAlign: 'center', fontWeight: '700' }}>
            PHÍA TRƯỚC - GHẾ TÀI XẾ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '6px' }}>
            {(floorData || []).map((row, rIdx) => 
              row.map((cell, cIdx) => {
                const isSeat = cell !== null;
                return (
                  <div 
                    key={`${rIdx}-${cIdx}`}
                    style={{
                      height: '32px',
                      borderRadius: '5px',
                      border: isSeat ? '1.5px solid #2563eb' : '1px dashed #cbd5e1',
                      backgroundColor: isSeat ? '#eff6ff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: isSeat ? '700' : 'normal',
                      color: isSeat ? '#1d4ed8' : '#94a3b8'
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
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px' }}>
        {renderFloor(lowerFloor, hasUpper ? 'Tầng 1 (Tầng dưới)' : 'Sơ đồ vị trí ghế')}
        {hasUpper && renderFloor(upperFloor, 'Tầng 2 (Tầng trên)')}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.35s ease', width: '100%' }}>
      <style>{`
        .plate-box-mini {
          display: inline-block;
          background: #ffffff;
          border: 1.5px solid #0f172a;
          border-radius: 5px;
          padding: 1px 6px;
          font-family: monospace;
          font-weight: 800;
          font-size: 0.74rem;
          color: #0f172a;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .approval-kpi-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 0.9rem 1.1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .approval-table th {
          background: #f8fafc;
          padding: 8px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.2px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .approval-table td {
          padding: 8px 10px;
          font-size: 0.75rem;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .approval-table tr:hover td {
          background: #f8fafc;
        }

        .filter-chip {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          transition: all 0.15s ease;
        }
        .filter-chip.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        @media (max-width: 1024px) {
          .approval-kpi-container {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .approval-kpi-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Header bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
            Trung Tâm Phê Duyệt Hồ Sơ & Đơn Từ
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Phê duyệt đơn nghỉ phép của nhân sự, hồ sơ thêm phương tiện mới và yêu cầu mở tuyến của Quản lý xe.
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          style={{
            padding: '6px 14px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: '700',
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          Làm mới dữ liệu
        </button>
      </div>

      {/* KPI Cards Row (Zero Icons, Executive Style) */}
      <div
        className="approval-kpi-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px'
        }}
      >
        <div className="approval-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Tổng Số Hồ Sơ
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
              {totalCount}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              yêu cầu
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
            Toàn bộ hồ sơ trên hệ thống
          </div>
        </div>

        <div className="approval-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Chờ Xem Xét
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: pendingCount > 0 ? '#ea580c' : '#16a34a' }}>
              {pendingCount}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              yêu cầu
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: pendingCount > 0 ? '#c2410c' : '#166534', fontWeight: '600' }}>
            {pendingCount > 0 ? 'Cần phản hồi phê duyệt' : 'Đã xử lý tất cả yêu cầu'}
          </div>
        </div>

        <div className="approval-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Đã Chấp Thuận
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16a34a' }}>
              {approvedCount}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              hồ sơ
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '600' }}>
            {approvalRate}% tỷ lệ chấp thuận
          </div>
        </div>

        <div className="approval-kpi-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Đã Từ Chối
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: rejectedCount > 0 ? '#dc2626' : '#64748b' }}>
              {rejectedCount}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              hồ sơ
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: rejectedCount > 0 ? '#991b1b' : '#64748b', fontWeight: '600' }}>
            Hồ sơ không đạt điều kiện
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.15rem 1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Filter Bar Row 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '0.85rem' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                  className={`filter-chip ${isActive ? 'active' : ''}`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>Loại hồ sơ:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '6px 12px', fontSize: '0.78rem', border: '1px solid #cbd5e1',
                borderRadius: '6px', background: '#ffffff', color: '#0f172a',
                fontWeight: '600', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="all">Tất cả loại hồ sơ</option>
              {user?.role !== 'fleet_manager' && <option value="leave">Đơn xin nghỉ phép</option>}
              <option value="bus">Thêm xe mới</option>
              {user?.role !== 'fleet_manager' && <option value="route">Yêu cầu thêm tuyến</option>}
              <option value="maintenance">Chi phí bảo trì xe (≥ 10tr)</option>
              <option value="fleet_expense">Chi tiêu đội xe hàng tháng</option>
              <option value="area_revenue">Doanh thu khu vực hàng tháng</option>
            </select>
          </div>
        </div>

        {/* Filter Bar Row 2: Search Input */}
        <div style={{ marginBottom: '0.85rem' }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên người gửi, số điện thoại, biển số xe, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              fontSize: '0.8rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{
            marginBottom: '0.85rem', padding: '0.75rem 1rem', background: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b',
            fontSize: '0.8rem', fontWeight: '600'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            marginBottom: '0.85rem', padding: '0.75rem 1rem', background: '#f0fdf4',
            border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534',
            fontSize: '0.8rem', fontWeight: '600'
          }}>
            {success}
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
            Đang tải danh sách hồ sơ...
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '0.82rem'
          }}>
            Không tìm thấy hồ sơ hoặc đơn từ nào ở trạng thái này.
          </div>
        ) : (
          <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table className="approval-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th>Người gửi</th>
                  <th>Loại hồ sơ</th>
                  <th>Chi tiết nội dung hồ sơ đề xuất</th>
                  <th>Thời gian gửi</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map((item) => {
                  const senderName = item.sender?.name || 'Nhân viên';
                  const senderRoleKey = item.sender?.role || 'staff';
                  const senderRole = getRoleLabel(senderRoleKey);
                  const senderPhone = item.sender?.phone || '0988888888';

                  return (
                    <tr key={item.id}>
                      {/* 1. NGƯỜI GỬI */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>{senderName}</span>
                            <span style={{
                              fontSize: '0.66rem', fontWeight: '700', backgroundColor: '#eff6ff',
                              color: '#1e40af', padding: '1px 6px', borderRadius: '4px',
                              border: '1px solid #bfdbfe'
                            }}>
                              {senderRole}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {senderPhone}
                          </span>
                        </div>
                      </td>

                      {/* 2. LOẠI HỒ SƠ */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {getTypeBadge(item.type)}
                      </td>

                      {/* 3. CHI TIẾT NỘI DUNG */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {item.plateNumber && (
                            <div className="plate-box-mini">{item.plateNumber}</div>
                          )}
                          <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.78rem' }}>
                            {item.details}
                          </span>
                        </div>
                        {item.type === 'bus' && item.rawBus && (
                          <button
                            onClick={() => setSelectedBus(item.rawBus)}
                            style={{
                              background: 'none', border: 'none', color: '#2563eb',
                              fontWeight: '700', padding: 0, textDecoration: 'underline',
                              cursor: 'pointer', marginTop: '3px', fontSize: '0.72rem',
                              display: 'block'
                            }}
                          >
                            Xem sơ đồ ghế & thông tin chi tiết xe
                          </button>
                        )}
                        {item.type === 'maintenance' && (
                          <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              color: '#b91c1c',
                              fontWeight: '800',
                              fontSize: '0.75rem'
                            }}>
                              Dự toán: {formatCurrency(item.cost)}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedMaintenance(item);
                                setMaintenanceNote(item.maintenanceInfo?.approvalNote || '');
                                setMaintenanceRejectionReason(item.maintenanceInfo?.rejectionReason || '');
                              }}
                              style={{
                                background: 'none', border: 'none', color: '#ea580c',
                                fontWeight: '700', padding: 0, textDecoration: 'underline',
                                cursor: 'pointer', fontSize: '0.72rem'
                              }}
                            >
                              Xem dự toán chi tiết & phê duyệt ngân sách
                            </button>
                          </div>
                        )}
                        {item.type === 'fleet_expense' && item.rawReport && (
                          <div style={{ marginTop: '3px' }}>
                            <button
                              onClick={() => setSelectedFleetExpenseReport(item.rawReport)}
                              style={{
                                background: 'none', border: 'none', color: '#059669',
                                fontWeight: '700', padding: 0, textDecoration: 'underline',
                                cursor: 'pointer', fontSize: '0.72rem', display: 'block'
                              }}
                            >
                              Xem toàn bộ bảng kê chi phí &amp; phiếu in Crystal Report
                            </button>
                          </div>
                        )}
                        {item.type === 'area_revenue' && item.rawReport && (
                          <div style={{ marginTop: '3px' }}>
                            <button
                              onClick={() => setSelectedAreaRevenueReport(item.rawReport)}
                              style={{
                                background: 'none', border: 'none', color: '#1d4ed8',
                                fontWeight: '700', padding: 0, textDecoration: 'underline',
                                cursor: 'pointer', fontSize: '0.72rem', display: 'block'
                              }}
                            >
                              Xem toàn bộ bảng kê doanh thu &amp; phiếu in Crystal Report
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 4. THỜI GIAN GỬI */}
                      <td style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.74rem' }}>
                        {formatDate(item.createdAt)}
                      </td>

                      {/* 5. TRẠNG THÁI */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {getStatusBadge(item.status)}
                      </td>

                      {/* 6. THAO TÁC */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {user?.role === 'fleet_manager' ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              color: item.status === 'approved' ? '#166534' : item.status === 'rejected' ? '#991b1b' : '#b45309',
                              fontSize: '0.74rem',
                              fontWeight: '700'
                            }}>
                              {item.status === 'pending' && 'Chờ duyệt'}
                              {item.status === 'approved' && 'Đã duyệt'}
                              {item.status === 'rejected' && 'Từ chối'}
                            </span>
                            {item.type === 'bus' && item.rawBus && (
                              <button
                                onClick={() => setSelectedBus(item.rawBus)}
                                style={{
                                  background: '#f1f5f9', border: '1px solid #cbd5e1',
                                  borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem',
                                  fontWeight: '700', color: '#334155', cursor: 'pointer'
                                }}
                              >
                                Chi tiết
                              </button>
                            )}
                            {item.type === 'maintenance' && (
                              <button
                                onClick={() => {
                                  setSelectedMaintenance(item);
                                  setMaintenanceNote(item.maintenanceInfo?.approvalNote || '');
                                  setMaintenanceRejectionReason(item.maintenanceInfo?.rejectionReason || '');
                                }}
                                style={{
                                  background: '#fff7ed', border: '1px solid #fed7aa',
                                  borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem',
                                  fontWeight: '700', color: '#c2410c', cursor: 'pointer'
                                }}
                              >
                                Chi tiết
                              </button>
                            )}
                            {item.type === 'fleet_expense' && item.rawReport && (
                              <button
                                onClick={() => setSelectedFleetExpenseReport(item.rawReport)}
                                style={{
                                  background: '#ecfdf5', border: '1px solid #a7f3d0',
                                  borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem',
                                  fontWeight: '700', color: '#047857', cursor: 'pointer'
                                }}
                              >
                                Chi tiết
                              </button>
                            )}
                          </div>
                        ) : item.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {item.type === 'area_revenue' ? (
                              <button
                                onClick={() => setSelectedAreaRevenueReport(item.rawReport)}
                                style={{
                                  border: 'none', backgroundColor: '#1d4ed8', color: '#ffffff',
                                  fontSize: '0.72rem', fontWeight: '800', padding: '4px 12px',
                                  borderRadius: '4px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(29,78,216,0.25)'
                                }}
                              >
                                Xem &amp; Duyệt
                              </button>
                            ) : item.type === 'fleet_expense' ? (
                              <button
                                onClick={() => setSelectedFleetExpenseReport(item.rawReport)}
                                style={{
                                  border: 'none', backgroundColor: '#059669', color: '#ffffff',
                                  fontSize: '0.72rem', fontWeight: '800', padding: '4px 12px',
                                  borderRadius: '4px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(5,150,105,0.25)'
                                }}
                              >
                                Xem &amp; Duyệt
                              </button>
                            ) : item.type === 'maintenance' ? (
                              <button
                                onClick={() => {
                                  setSelectedMaintenance(item);
                                  setMaintenanceNote('');
                                  setMaintenanceRejectionReason('');
                                }}
                                style={{
                                  border: 'none', backgroundColor: '#ea580c', color: '#ffffff',
                                  fontSize: '0.72rem', fontWeight: '700', padding: '4px 10px',
                                  borderRadius: '4px', cursor: 'pointer'
                                }}
                              >
                                Xem & Duyệt
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(item, 'approved')}
                                  style={{
                                    border: 'none', backgroundColor: '#16a34a', color: '#ffffff',
                                    fontSize: '0.72rem', fontWeight: '700', padding: '4px 10px',
                                    borderRadius: '4px', cursor: 'pointer'
                                  }}
                                >
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(item, 'rejected')}
                                  style={{
                                    border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#dc2626',
                                    fontSize: '0.72rem', fontWeight: '700', padding: '4px 10px',
                                    borderRadius: '4px', cursor: 'pointer'
                                  }}
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (item.type === 'area_revenue' && item.rawReport) setSelectedAreaRevenueReport(item.rawReport);
                              else if (item.type === 'fleet_expense' && item.rawReport) setSelectedFleetExpenseReport(item.rawReport);
                              else if (item.type === 'bus' && item.rawBus) setSelectedBus(item.rawBus);
                              else if (item.type === 'maintenance') {
                                setSelectedMaintenance(item);
                                setMaintenanceNote(item.maintenanceInfo?.approvalNote || '');
                                setMaintenanceRejectionReason(item.maintenanceInfo?.rejectionReason || '');
                              }
                              else alert(`Hồ sơ "${item.typeName}" đã được xử lý ở trạng thái: ${item.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}`);
                            }}
                            style={{
                              background: '#f1f5f9', border: '1px solid #cbd5e1',
                              borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem',
                              fontWeight: '700', color: '#475569', cursor: 'pointer'
                            }}
                          >
                            {(item.type === 'area_revenue' || item.type === 'fleet_expense') ? 'Bản in' : (item.type === 'bus' || item.type === 'maintenance' ? 'Chi tiết' : 'Xem lại')}
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
      </div>

      {/* Detail Modal for Vehicle Info & Seat Layout */}
      {selectedBus && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1200
          }}
        >
          <div 
            style={{
              background: '#ffffff', borderRadius: '14px', width: '90%',
              maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="plate-box-mini">{selectedBus.plateNumber}</div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {selectedBus.type}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedBus(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Left Column: Vehicle Info & Image */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <img 
                  src={selectedBus.images?.[0] || DEFAULT_IMAGE} 
                  alt={selectedBus.plateNumber}
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  <div><strong>Loại xe:</strong> {selectedBus.type}</div>
                  <div><strong>Sức chứa:</strong> {selectedBus.totalSeats} ghế/chỗ</div>
                  <div>
                    <strong>Tiện ích:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {selectedBus.amenities && selectedBus.amenities.length > 0 ? (
                        selectedBus.amenities.map((am, i) => (
                          <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', fontWeight: '600' }}>
                            {am}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tiêu chuẩn</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <strong>Trạng thái:</strong>{' '}
                    <span style={{
                      fontWeight: '700',
                      color: selectedBus.status === 'approved' ? '#166534' : selectedBus.status === 'rejected' ? '#991b1b' : '#b45309'
                    }}>
                      {selectedBus.status === 'approved' && 'Đã phê duyệt'}
                      {selectedBus.status === 'rejected' && 'Đã từ chối'}
                      {selectedBus.status === 'pending' && 'Chờ phê duyệt'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Seat layout */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {renderReadOnlySeatMap(selectedBus)}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
              <button 
                onClick={() => setSelectedBus(null)} 
                style={{
                  padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700',
                  border: '1px solid #cbd5e1', borderRadius: '6px',
                  backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              
              {user?.role !== 'fleet_manager' && selectedBus.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleModalStatusUpdate(selectedBus._id, 'rejected')} 
                    style={{
                      padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700',
                      border: '1px solid #cbd5e1', borderRadius: '6px',
                      backgroundColor: '#ffffff', color: '#dc2626', cursor: 'pointer'
                    }}
                  >
                    Từ chối
                  </button>
                  <button 
                    onClick={() => handleModalStatusUpdate(selectedBus._id, 'approved')} 
                    style={{
                      padding: '7px 16px', fontSize: '0.78rem', fontWeight: '700',
                      border: 'none', borderRadius: '6px',
                      backgroundColor: '#16a34a', color: '#ffffff', cursor: 'pointer'
                    }}
                  >
                    Duyệt xe này
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Detail Modal for Maintenance Approval */}
      {selectedMaintenance && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1200
          }}
        >
          <div 
            style={{
              background: '#ffffff', borderRadius: '14px', width: '90%',
              maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="plate-box-mini">{selectedMaintenance.plateNumber}</div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Hồ Sơ Duyệt Ngân Sách Bảo Trì & Sửa Chữa
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Quy trình kiểm soát chi phí đại tu đội xe (Hạn mức ≥ 10.000.000 ₫)
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMaintenance(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Cost Highlight Box */}
              <div style={{
                background: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase' }}>
                    Dự toán chi phí đề xuất
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#9a3412', marginTop: '2px' }}>
                    {formatCurrency(selectedMaintenance.cost)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    Vượt định mức cơ sở
                  </span>
                  <div style={{ fontSize: '0.7rem', color: '#7c2d12', marginTop: '4px' }}>
                    Quy định: Hạn mức ≥ 10tr cần Giám đốc duyệt
                  </div>
                </div>
              </div>

              {/* Maintenance Specs Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.78rem'
              }}>
                <div>
                  <strong>Phương tiện:</strong> {selectedMaintenance.rawBus?.type || 'Xe khách'} ({selectedMaintenance.rawBus?.totalSeats || 0} chỗ)
                </div>
                <div>
                  <strong>Garage tiếp nhận:</strong> {selectedMaintenance.maintenanceInfo?.garage || 'Chưa ghi nhận'}
                </div>
                <div>
                  <strong>Ngày đưa xe vào gara:</strong> {formatDate(selectedMaintenance.createdAt)}
                </div>
                <div>
                  <strong>Người đề xuất:</strong> {selectedMaintenance.sender?.name} ({getRoleLabel(selectedMaintenance.sender?.role)})
                </div>
              </div>

              {/* Description & Work Details */}
              <div style={{ fontSize: '0.8rem' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                  Hạng mục kỹ thuật / Nội dung hư hỏng cần sửa chữa & thay thế:
                </div>
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#334155',
                  lineHeight: '1.4'
                }}>
                  {selectedMaintenance.maintenanceInfo?.description || 'Không có mô tả chi tiết từ Đội xe.'}
                </div>
              </div>

              {/* Reviewer Note / Decision result */}
              {selectedMaintenance.status === 'pending' && user?.role !== 'fleet_manager' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                      Ý kiến chỉ đạo của Giám đốc (lưu hồ sơ và phản hồi đến Đội xe):
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Đồng ý duyệt ngân sách, yêu cầu gara bảo hành phụ tùng 12 tháng..."
                      value={maintenanceNote}
                      onChange={(e) => setMaintenanceNote(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#991b1b', marginBottom: '3px' }}>
                      Lý do từ chối (chỉ nhập khi Giám đốc quyết định từ chối cấp tiền):
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Báo giá quá cao so với mặt bằng chung, yêu cầu khảo sát gara khác..."
                      value={maintenanceRejectionReason}
                      onChange={(e) => setMaintenanceRejectionReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#fef2f2'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: selectedMaintenance.status === 'approved' ? '#f0fdf4' : selectedMaintenance.status === 'rejected' ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${selectedMaintenance.status === 'approved' ? '#bbf7d0' : selectedMaintenance.status === 'rejected' ? '#fecaca' : '#fde68a'}`,
                  fontSize: '0.78rem'
                }}>
                  <div style={{ fontWeight: '700', color: selectedMaintenance.status === 'approved' ? '#166534' : selectedMaintenance.status === 'rejected' ? '#991b1b' : '#b45309' }}>
                    {selectedMaintenance.status === 'approved' && '✓ GIÁM ĐỐC ĐÃ PHÊ DUYỆT NGÂN SÁCH'}
                    {selectedMaintenance.status === 'rejected' && '✕ GIÁM ĐỐC ĐÃ TỪ CHỐI NGÂN SÁCH'}
                    {selectedMaintenance.status === 'pending' && '⏳ HỒ SƠ ĐANG CHỜ GIÁM ĐỐC PHÊ DUYỆT'}
                  </div>
                  {selectedMaintenance.maintenanceInfo?.approvedAt && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Thời gian quyết định: {formatDate(selectedMaintenance.maintenanceInfo.approvedAt)}
                    </div>
                  )}
                  {selectedMaintenance.maintenanceInfo?.approvalNote && (
                    <div style={{ marginTop: '4px', color: '#166534' }}>
                      <strong>Chỉ đạo:</strong> {selectedMaintenance.maintenanceInfo.approvalNote}
                    </div>
                  )}
                  {selectedMaintenance.maintenanceInfo?.rejectionReason && (
                    <div style={{ marginTop: '4px', color: '#991b1b' }}>
                      <strong>Lý do từ chối:</strong> {selectedMaintenance.maintenanceInfo.rejectionReason}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
              <button 
                onClick={() => setSelectedMaintenance(null)} 
                disabled={isSubmittingMaint}
                style={{
                  padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700',
                  border: '1px solid #cbd5e1', borderRadius: '6px',
                  backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              
              {user?.role !== 'fleet_manager' && selectedMaintenance.status === 'pending' && (
                <>
                  <button 
                    onClick={() => handleMaintenanceModalUpdate('rejected')} 
                    disabled={isSubmittingMaint}
                    style={{
                      padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700',
                      border: '1px solid #cbd5e1', borderRadius: '6px',
                      backgroundColor: '#ffffff', color: '#dc2626', cursor: isSubmittingMaint ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmittingMaint ? 'Đang xử lý...' : 'Từ chối ngân sách'}
                  </button>
                  <button 
                    onClick={() => handleMaintenanceModalUpdate('approved')} 
                    disabled={isSubmittingMaint}
                    style={{
                      padding: '7px 16px', fontSize: '0.78rem', fontWeight: '700',
                      border: 'none', borderRadius: '6px',
                      backgroundColor: '#16a34a', color: '#ffffff', cursor: isSubmittingMaint ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmittingMaint ? 'Đang duyệt...' : 'Phê Duyệt Ngân Sách'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal Báo Cáo Chi Tiêu Đội Xe (Crystal Report) */}
      <MonthlyFleetExpenseReportModal
        isOpen={Boolean(selectedFleetExpenseReport)}
        onClose={() => setSelectedFleetExpenseReport(null)}
        report={selectedFleetExpenseReport}
        canApprove={user?.role !== 'fleet_manager'}
        onApprove={handleApproveFleetExpense}
        onReject={handleRejectFleetExpense}
        actionLoading={actionLoadingExpense}
      />

      {/* Modal Báo Cáo Doanh Thu Khu Vực (Crystal Report) */}
      <MonthlyAreaRevenueReportModal
        isOpen={Boolean(selectedAreaRevenueReport)}
        onClose={() => setSelectedAreaRevenueReport(null)}
        report={selectedAreaRevenueReport}
        canApprove={user?.role !== 'ticket_manager'}
        onApprove={handleApproveAreaRevenue}
        onReject={handleRejectAreaRevenue}
        actionLoading={actionLoadingAreaRev}
      />

    </div>
  );
};

export default ManagerApprovalsPage;
