import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const FleetStatusPage = () => {
  const { token } = useContext(AuthContext);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Local state for the bus currently being updated
  const [editingBus, setEditingBus] = useState(null);
  const [newStatus, setNewStatus] = useState('ready');
  const [description, setDescription] = useState('');
  const [garage, setGarage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');

  // Loading state when performing direct acceptance
  const [loadingSubmitComplete, setLoadingSubmitComplete] = useState(false);

  // Filters for buses list (Left column)
  const [busSearchText, setBusSearchText] = useState('');
  const [busStatusFilter, setBusStatusFilter] = useState('all');

  // Status History Logs & Maintenance Records (Bottom table)
  const [logs, setLogs] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [logFilterTab, setLogFilterTab] = useState('all');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null);

  const fetchBuses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Only show approved buses for operational status updates
        const approvedBuses = (data.buses || []).filter(b => b.status === 'approved' || !b.status);
        setBuses(approvedBuses);

        // Auto-select the first bus if none is selected currently
        if (approvedBuses.length > 0) {
          setEditingBus(prev => {
            if (!prev) return approvedBuses[0];
            const found = approvedBuses.find(b => b._id === prev._id);
            return found || approvedBuses[0];
          });
        }
      } else {
        setError(data.message || 'Không thể tải danh sách phương tiện.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy danh sách xe.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceRecords = async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/maintenance-records`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMaintenanceRecords(data.records || []);
      }
    } catch (err) {
      console.error('Lỗi tải hồ sơ bảo trì:', err);
    }
  };

  const fetchStatusLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/status-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Lỗi tải nhật ký trạng thái xe từ máy chủ:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBuses();
      fetchMaintenanceRecords();
      fetchStatusLogs();
    }
  }, [token]);

  // Synchronize editing fields when editingBus changes
  useEffect(() => {
    if (editingBus) {
      setNewStatus(editingBus.activeStatus || 'ready');
      setDescription(editingBus.maintenanceInfo?.description || '');
      setGarage(editingBus.maintenanceInfo?.garage || '');
      setEstimatedCost(editingBus.maintenanceInfo?.estimatedCost || '');

      if (editingBus.maintenanceInfo?.estimatedCompletion) {
        const d = new Date(editingBus.maintenanceInfo.estimatedCompletion);
        setEstimatedCompletion(d.toISOString().substring(0, 10));
      } else {
        setEstimatedCompletion('');
      }
    }
  }, [editingBus]);

  const handleSelectBus = (bus) => {
    setEditingBus(bus);
    setError('');
    setSuccess('');
  };

  // Direct Acceptance: confirms maintenance and returns bus to ready without opening an edit modal
  const handleConfirmAcceptance = async (bus) => {
    if (!bus) return;

    if (bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus !== 'approved') {
      setError(
        bus.maintenanceInfo?.approvalStatus === 'rejected'
          ? `Khoản chi phí bảo dưỡng xe ${bus.plateNumber} đã bị Giám đốc TỪ CHỐI DUYỆT (Lý do: "${bus.maintenanceInfo?.rejectionReason || 'Ngân sách không phù hợp'}"). Vui lòng kiểm tra lại báo giá từ gara!`
          : `Khoản chi phí bảo dưỡng xe ${bus.plateNumber} là ${Number(bus.maintenanceInfo?.estimatedCost).toLocaleString('vi-VN')} đ (≥ 10.000.000 ₫ - Chi phí lớn) đang CHỜ GIÁM ĐỐC DUYỆT NGÂN SÁCH. Chưa thể nghiệm thu xe!`
      );
      return;
    }

    const cost = Number(bus.maintenanceInfo?.estimatedCost || 0);
    const garageName = bus.maintenanceInfo?.garage?.trim() || 'Xưởng nội bộ';
    const desc = bus.maintenanceInfo?.description?.trim() || (bus.activeStatus === 'repairing' ? 'Khắc phục sự cố kỹ thuật hoàn tất' : 'Bảo dưỡng định kỳ hoàn tất');

    setLoadingSubmitComplete(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        busId: bus._id,
        plateNumber: bus.plateNumber,
        type: bus.activeStatus,
        description: desc,
        garage: garageName,
        cost: cost,
        startDate: bus.updatedAt || new Date(),
        endDate: new Date()
      };

      const res = await fetch(`${API_BASE}/trips/fleet/maintenance-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Xác nhận nghiệm thu xe ${bus.plateNumber} thành công! Phương tiện đã chuyển về trạng thái Sẵn sàng hoạt động.`);

        fetchBuses();
        fetchMaintenanceRecords();
        fetchStatusLogs();
      } else {
        setError(data.message || 'Lỗi khi nghiệm thu phương tiện.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi nghiệm thu.');
    } finally {
      setLoadingSubmitComplete(false);
    }
  };

  // Submit Status Change (e.g. ready -> maintenance / repairing / inactive)
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingBus) {
      setError('Vui lòng chọn một phương tiện từ danh sách bên trái.');
      return;
    }

    const isMaintenance = newStatus === 'maintenance' || newStatus === 'repairing';
    if (isMaintenance) {
      if (!garage || !garage.trim()) {
        setError('Vui lòng nhập Tên xưởng / Garage tiếp nhận phương tiện.');
        return;
      }
      if (!description || !description.trim()) {
        setError('Vui lòng nhập Nội dung thực hiện bảo dưỡng / sửa chữa.');
        return;
      }
      if (estimatedCost === '' || estimatedCost === null || estimatedCost === undefined) {
        setError('Vui lòng nhập Chi phí dự kiến.');
        return;
      }
      const costNum = Number(estimatedCost);
      if (isNaN(costNum) || costNum < 0) {
        setError('Chi phí dự kiến phải là một số hợp lệ lớn hơn hoặc bằng 0.');
        return;
      }
      if (!estimatedCompletion) {
        setError('Vui lòng chọn Ngày dự kiến hoàn tất.');
        return;
      }
      const completionDate = new Date(estimatedCompletion);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (completionDate < today) {
        setError('Ngày dự kiến hoàn tất không thể là ngày trong quá khứ.');
        return;
      }
    }

    try {
      const payload = {
        activeStatus: newStatus,
        maintenanceInfo: isMaintenance ? {
          description: description.trim(),
          garage: garage.trim(),
          estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
          estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : undefined
        } : null
      };

      const res = await fetch(`${API_BASE}/trips/fleet/buses/${editingBus._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Cập nhật trạng thái xe ${editingBus.plateNumber} thành công!`);

        const statusLabels = {
          ready: 'Sẵn sàng hoạt động',
          maintenance: 'Đang bảo dưỡng',
          repairing: 'Đang sửa chữa',
          inactive: 'Tạm ngưng hoạt động'
        };

        let logDetails = `Chuyển trạng thái sang: ${statusLabels[newStatus]}.`;
        let logGarage = '-';
        let logCost = 0;

        if (isMaintenance) {
          logGarage = garage.trim() || 'Chưa ghi nhận';
          logCost = estimatedCost ? Number(estimatedCost) : 0;
          logDetails += ` Nơi thực hiện: ${logGarage}. Nội dung: ${description.trim() || 'Kiểm tra kỹ thuật'}.`;
          if (estimatedCost) {
            logDetails += ` Chi phí dự kiến: ${Number(estimatedCost).toLocaleString('vi-VN')} VNĐ.`;
          }
        } else if (newStatus === 'ready' && (editingBus.activeStatus === 'maintenance' || editingBus.activeStatus === 'repairing')) {
          const desc = editingBus.maintenanceInfo?.description || 'Kiểm tra kỹ thuật hoàn tất';
          logGarage = editingBus.maintenanceInfo?.garage || 'Xưởng nội bộ';
          logCost = Number(editingBus.maintenanceInfo?.estimatedCost || 0);
          logDetails = `Nghiệm thu hoàn tất: ${desc}. Chi phí quyết toán: ${logCost.toLocaleString('vi-VN')} VNĐ. Garage: ${logGarage}.`;
        } else if (newStatus === 'ready' && editingBus.activeStatus === 'inactive') {
          logDetails = 'Chuyển trạng thái sang: Sẵn sàng hoạt động. Đưa xe từ bãi lưu trở lại phục vụ tuyến đường.';
        } else if (newStatus === 'inactive') {
          logDetails = 'Chuyển trạng thái sang: Tạm ngưng hoạt động. Đưa xe về bãi lưu dự phòng.';
        }

        fetchBuses();
        fetchMaintenanceRecords();
        fetchStatusLogs();
      } else {
        setError(data.message || 'Lỗi khi cập nhật trạng thái phương tiện.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi cập nhật trạng thái.');
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'maintenance':
        return (
          <span style={{
            background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
            padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '800'
          }}>
            Đang bảo dưỡng
          </span>
        );
      case 'repairing':
        return (
          <span style={{
            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
            padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '800'
          }}>
            Đang sửa chữa
          </span>
        );
      case 'inactive':
        return (
          <span style={{
            background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1',
            padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '800'
          }}>
            Tạm ngưng hoạt động
          </span>
        );
      default:
        return (
          <span style={{
            background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
            padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '800'
          }}>
            Sẵn sàng hoạt động
          </span>
        );
    }
  };

  const getStatusLabelText = (status) => {
    const labels = {
      ready: 'Sẵn sàng hoạt động',
      maintenance: 'Đang bảo dưỡng',
      repairing: 'Đang sửa chữa',
      inactive: 'Tạm ngưng hoạt động'
    };
    return labels[status] || 'Sẵn sàng hoạt động';
  };

  // KPIs calculation
  const readyCount = buses.filter(b => b.activeStatus === 'ready' || b.activeStatus === 'active' || !b.activeStatus).length;
  const maintCount = buses.filter(b => b.activeStatus === 'maintenance').length;
  const repairCount = buses.filter(b => b.activeStatus === 'repairing').length;
  const inactiveCount = buses.filter(b => b.activeStatus === 'inactive').length;
  const totalCompletedCost = useMemo(() => {
    return maintenanceRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  }, [maintenanceRecords]);

  // Filtered buses in left column
  const filteredBuses = buses.filter(b => {
    const searchMatch = !busSearchText ||
      (b.plateNumber && b.plateNumber.toLowerCase().includes(busSearchText.toLowerCase())) ||
      (b.type && b.type.toLowerCase().includes(busSearchText.toLowerCase()));

    let statusMatch = true;
    if (busStatusFilter === 'ready') {
      statusMatch = b.activeStatus === 'ready' || b.activeStatus === 'active' || !b.activeStatus;
    } else if (busStatusFilter !== 'all') {
      statusMatch = b.activeStatus === busStatusFilter;
    }

    return searchMatch && statusMatch;
  });

  // Consolidated audit logs for bottom full-width table
  const combinedLogItems = logs.flatMap(l => {
    const isRepair = l.type === 'repairing' || l.toStatus === 'repairing';
    const isMaint = l.type === 'maintenance' || l.toStatus === 'maintenance';
    const isInactive = l.type === 'inactive' || l.toStatus === 'inactive';
    const isReadyYard = (l.type === 'ready' || l.toStatus === 'ready') && (!l.cost || l.cost === 0) && (!l.garage || l.garage === '-');

    // 1. Trường hợp xe ở bãi lưu: Tạm ngưng hoạt động
    if (isInactive) {
      return [{
        id: l.id || l._id,
        category: 'status_change',
        categoryLabel: 'Tạm ngưng hoạt động',
        categoryColor: '#475569',
        categoryBg: '#f1f5f9',
        categoryBorder: '#cbd5e1',
        fromStatus: 'ready',
        toStatus: 'inactive',
        isHandover: false,
        isRepair: false,
        isMaint: false,
        isInactive: true,
        isReactivated: false,
        time: l.time || l.startDate,
        plateNumber: l.plateNumber,
        busType: l.busType || '',
        summary: 'Sẵn sàng hoạt động -> Tạm ngưng hoạt động',
        details: l.details || 'Chuyển trạng thái sang: Tạm ngưng hoạt động.',
        garage: '-',
        cost: 0,
        approvalStatus: 'approved'
      }];
    }

    // 2. Trường hợp xe ở bãi lưu: Tái hoạt động từ bãi lưu về sẵn sàng
    if (isReadyYard) {
      return [{
        id: l.id || l._id,
        category: 'status_change',
        categoryLabel: 'Sẵn sàng hoạt động',
        categoryColor: '#15803d',
        categoryBg: '#dcfce7',
        categoryBorder: '#bbf7d0',
        fromStatus: 'inactive',
        toStatus: 'ready',
        isHandover: false,
        isRepair: false,
        isMaint: false,
        isInactive: false,
        isReactivated: true,
        time: l.time || l.endDate,
        plateNumber: l.plateNumber,
        busType: l.busType || '',
        summary: 'Tạm ngưng hoạt động -> Sẵn sàng hoạt động',
        details: l.details || 'Chuyển trạng thái sang: Sẵn sàng hoạt động.',
        garage: '-',
        cost: 0,
        approvalStatus: 'approved'
      }];
    }

    // 3. Trường hợp bảo dưỡng hoặc sửa chữa tại xưởng
    if (isMaint || isRepair) {
      const items = [];
      const isRep = isRepair;
      const workshopLabel = isRep ? 'Vào xưởng sửa chữa' : 'Vào xưởng bảo dưỡng';
      const workshopColor = isRep ? '#b91c1c' : '#c2410c';
      const workshopBg = isRep ? '#fee2e2' : '#fff7ed';
      const workshopBorder = isRep ? '#fecaca' : '#fed7aa';

      // 3.1 Dòng vào xưởng bảo dưỡng hoặc sửa chữa (GHI NHẬN CHI PHÍ TẠI ĐÂY)
      items.push({
        id: (l.id || l._id) + '-entry',
        category: 'status_change',
        categoryLabel: workshopLabel,
        categoryColor: workshopColor,
        categoryBg: workshopBg,
        categoryBorder: workshopBorder,
        fromStatus: 'ready',
        toStatus: isRep ? 'repairing' : 'maintenance',
        isHandover: false,
        isRepair: isRep,
        isMaint: !isRep,
        isInactive: false,
        isReactivated: false,
        time: l.startDate || l.time,
        plateNumber: l.plateNumber,
        busType: l.busType || '',
        summary: `Sẵn sàng hoạt động -> ${isRep ? 'Đang sửa chữa' : 'Đang bảo dưỡng'}`,
        details: l.details || (isRep ? 'Đưa xe vào sửa chữa sự cố' : 'Đưa xe vào bảo dưỡng định kỳ'),
        garage: (l.garage && l.garage !== '-') ? l.garage : 'Xưởng nội bộ',
        cost: l.cost || 0,
        approvalStatus: l.approvalStatus || 'approved'
      });

      // 3.2 Dòng nghiệm thu xuất xưởng đưa xe về SẴN SÀNG HOẠT ĐỘNG (MIỄN PHÍ)
      if (l.endDate) {
        items.push({
          id: (l.id || l._id) + '-exit',
          category: 'status_change',
          categoryLabel: 'Sẵn sàng hoạt động',
          categoryColor: '#15803d',
          categoryBg: '#dcfce7',
          categoryBorder: '#bbf7d0',
          fromStatus: isRep ? 'repairing' : 'maintenance',
          toStatus: 'ready',
          isHandover: true,
          isRepair: false,
          isMaint: false,
          isInactive: false,
          isReactivated: false,
          time: l.endDate,
          plateNumber: l.plateNumber,
          busType: l.busType || '',
          summary: `${isRep ? 'Đang sửa chữa' : 'Đang bảo dưỡng'} -> Sẵn sàng hoạt động`,
          details: `Nghiệm thu hoàn tất: ${l.details || (isRep ? 'Sửa chữa kỹ thuật' : 'Bảo dưỡng kỹ thuật')}. Garage: ${(l.garage && l.garage !== '-') ? l.garage : 'Xưởng nội bộ'}. Phương tiện trở lại phục vụ tuyến đường.`,
          garage: (l.garage && l.garage !== '-') ? l.garage : 'Xưởng nội bộ',
          cost: 0,
          approvalStatus: 'approved'
        });
      }

      return items;
    }

    // 4. Mặc định
    return [{
      id: l.id || l._id,
      category: 'status_change',
      categoryLabel: 'Sẵn sàng hoạt động',
      categoryColor: '#15803d',
      categoryBg: '#dcfce7',
      categoryBorder: '#bbf7d0',
      fromStatus: l.fromStatus || 'ready',
      toStatus: l.toStatus || 'ready',
      isHandover: false,
      isRepair: false,
      isMaint: false,
      isInactive: false,
      isReactivated: false,
      time: l.time,
      plateNumber: l.plateNumber,
      busType: l.busType || '',
      summary: 'Biến động vận hành phương tiện',
      details: l.details || 'Cập nhật trạng thái',
      garage: l.garage || '-',
      cost: l.cost || 0,
      approvalStatus: l.approvalStatus || '-'
    }];
  }).sort((a, b) => new Date(b.time) - new Date(a.time));

  // Compute status counts for bottom table tabs matching activity categories
  const countLogAll = combinedLogItems.length;
  const countLogReady = combinedLogItems.filter(i => i.toStatus === 'ready').length;
  const countLogMaint = combinedLogItems.filter(i => i.toStatus === 'maintenance').length;
  const countLogRepair = combinedLogItems.filter(i => i.toStatus === 'repairing').length;
  const countLogInactive = combinedLogItems.filter(i => i.toStatus === 'inactive').length;

  // Filter logs by Category Tab and Date Range
  const filteredLogs = combinedLogItems.filter(item => {
    let matchesTab = true;
    if (logFilterTab === 'ready') {
      matchesTab = item.toStatus === 'ready';
    } else if (logFilterTab === 'maintenance') {
      matchesTab = item.toStatus === 'maintenance';
    } else if (logFilterTab === 'repairing') {
      matchesTab = item.toStatus === 'repairing';
    } else if (logFilterTab === 'inactive') {
      matchesTab = item.toStatus === 'inactive';
    }

    let matchesDate = true;
    if (item.time) {
      const itemDate = new Date(item.time);
      if (logStartDate) {
        const start = new Date(logStartDate + 'T00:00:00');
        matchesDate = matchesDate && itemDate >= start;
      }
      if (logEndDate) {
        const end = new Date(logEndDate + 'T23:59:59');
        matchesDate = matchesDate && itemDate <= end;
      }
    }

    return matchesTab && matchesDate;
  });

  const handleResetLogFilters = () => {
    setLogFilterTab('all');
    setLogStartDate('');
    setLogEndDate('');
  };

  const isEditingBusInWorkshop = editingBus && (editingBus.activeStatus === 'maintenance' || editingBus.activeStatus === 'repairing');

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .fleet-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .fleet-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .fleet-kpi-card {
          background: #ffffff;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .fleet-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }

        .plate-box {
          display: inline-block;
          background: #ffffff;
          border: 2px solid #0f172a;
          border-radius: 6px;
          padding: 2px 7px;
          font-family: monospace;
          font-weight: 800;
          font-size: 0.84rem;
          color: #0f172a;
          letter-spacing: 0.5px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .bus-select-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          background-color: #ffffff;
          width: 100%;
          box-sizing: border-box;
        }
        .bus-select-card:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }
        .bus-select-card.active {
          background-color: #eff6ff;
          border-color: #3b82f6;
          box-shadow: 0 2px 6px rgba(37,99,235,0.08);
        }

        .status-layout-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.15fr);
          gap: 14px;
          align-items: start;
        }

        .filter-btn-pill {
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          transition: all 0.12s ease;
        }
        .filter-btn-pill.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .audit-table th {
          background: #f8fafc;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 10px 14px;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .audit-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.75rem;
          vertical-align: middle;
          color: #1e293b;
        }
        .audit-table tr:hover td {
          background-color: #f8fafc;
        }

        @media (max-width: 1200px) {
          .fleet-kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 1024px) {
          .fleet-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .status-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .fleet-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* 1. HEADER CHÍNH: TÌNH TRẠNG & BẢO TRÌ XE                   */}
      {/* ========================================================= */}
      <div className="fleet-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              Tình Trạng &amp; Bảo Trì Xe
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', margin: 0 }}>
              Hệ thống giám sát vận hành, điều chuyển trạng thái xe và nghiệm thu xuất xưởng toàn diện.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => { fetchBuses(); fetchMaintenanceRecords(); }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Tải lại dữ liệu
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 5 THẺ KPI TOÀN DIỆN VỀ ĐỘI XE & KINH PHÍ               */}
      {/* ========================================================= */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              XE SẴN SÀNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#ecfdf5', color: '#059669', borderRadius: '4px', fontWeight: '700' }}>
              Chạy tuyến
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginBottom: '2px' }}>
            {readyCount} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748b' }}>/ {buses.length} xe</span>
          </div>
          <div style={{ fontSize: '0.67rem', color: '#059669', fontWeight: '600' }}>
            Đang hoạt động tốt trên tuyến
          </div>
        </div>

        <div className="fleet-kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              ĐANG BẢO DƯỠNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#fff7ed', color: '#c2410c', borderRadius: '4px', fontWeight: '700' }}>
              Định kỳ
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ea580c', marginBottom: '2px' }}>
            {maintCount} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748b' }}>xe nằm xưởng</span>
          </div>
          <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
            {maintCount > 0 ? 'Bảo trì và thay dầu định kỳ' : 'Không có xe đang bảo dưỡng'}
          </div>
        </div>

        <div className="fleet-kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              ĐANG SỬA CHỮA
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontWeight: '700' }}>
              Sự cố
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#dc2626', marginBottom: '2px' }}>
            {repairCount} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748b' }}>xe nằm xưởng</span>
          </div>
          <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
            {repairCount > 0 ? 'Đang khắc phục sự cố tại garage' : 'Không có sự cố đột xuất'}
          </div>
        </div>

        <div className="fleet-kpi-card" style={{ borderLeft: '4px solid #64748b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TẠM NGƯNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: '700' }}>
              Dự phòng
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {inactiveCount} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748b' }}>xe bãi</span>
          </div>
          <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
            Lưu bãi dự phòng thay thế
          </div>
        </div>

        <div className="fleet-kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TỔNG CHI PHÍ BẢO TRÌ
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontWeight: '700' }}>
              Đã chi
            </span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1d4ed8', marginBottom: '2px' }}>
            {totalCompletedCost.toLocaleString('vi-VN')} ₫
          </div>
          <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
            {maintenanceRecords.length} hồ sơ bảo dưỡng đã quyết toán
          </div>
        </div>
      </div>

      {/* Thông báo toàn cục */}
      {error && (
        <div style={{ padding: '0.65rem 0.95rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.65rem 0.95rem', background: '#ecfdf5', color: '#047857', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', border: '1px solid #a7f3d0' }}>
          {success}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. KHU VỰC TRUNG TÂM (DANH SÁCH XE & BẢNG TÁC VỤ NGỮ CẢNH) */}
      {/* ========================================================= */}
      <div className="status-layout-grid">

        {/* CỘT TRÁI: DANH SÁCH TÌNH TRẠNG XE */}
        <div className="fleet-box" style={{ margin: 0, padding: '1.1rem 1.25rem' }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Tình Trạng Hoạt Động Xe
                </h2>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Bấm vào phương tiện để thiết lập điều chuyển hoặc nghiệm thu xuất xưởng
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid #bfdbfe' }}>
                {filteredBuses.length} / {buses.length} xe
              </span>
            </div>

            {/* Tìm kiếm & nút lọc trạng thái */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Tìm nhanh theo biển số, dòng xe..."
                value={busSearchText}
                onChange={(e) => setBusSearchText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setBusStatusFilter('all')}
                  className={`filter-btn-pill ${busStatusFilter === 'all' ? 'active' : ''}`}
                >
                  Tất cả ({buses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBusStatusFilter('ready')}
                  className={`filter-btn-pill ${busStatusFilter === 'ready' ? 'active' : ''}`}
                >
                  Sẵn sàng ({readyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBusStatusFilter('maintenance')}
                  className={`filter-btn-pill ${busStatusFilter === 'maintenance' ? 'active' : ''}`}
                >
                  Bảo dưỡng ({maintCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBusStatusFilter('repairing')}
                  className={`filter-btn-pill ${busStatusFilter === 'repairing' ? 'active' : ''}`}
                >
                  Sửa chữa ({repairCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBusStatusFilter('inactive')}
                  className={`filter-btn-pill ${busStatusFilter === 'inactive' ? 'active' : ''}`}
                >
                  Tạm ngưng ({inactiveCount})
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#2563eb', fontWeight: '700', fontSize: '0.82rem' }}>
              Đang tải danh sách phương tiện...
            </div>
          ) : filteredBuses.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
              Không tìm thấy phương tiện nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '440px', overflowY: 'auto', paddingRight: '2px' }}>
              {filteredBuses.map((bus) => {
                const isSelected = editingBus?._id === bus._id;
                const isMaint = bus.activeStatus === 'maintenance' || bus.activeStatus === 'repairing';

                return (
                  <div
                    key={bus._id}
                    onClick={() => handleSelectBus(bus)}
                    className={`bus-select-card ${isSelected ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="plate-box">
                        {bus.plateNumber}
                      </div>

                      <div>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.82rem' }}>
                          {bus.type}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>
                          Sức chứa: {bus.totalSeats} chỗ ngồi/nằm
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
                      {getStatusChip(bus.activeStatus || 'ready')}
                      <span style={{
                        fontSize: '0.7rem',
                        color: isSelected ? '#1d4ed8' : '#475569',
                        fontWeight: '700',
                        backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${isSelected ? '#bfdbfe' : '#cbd5e1'}`,
                        whiteSpace: 'nowrap',
                        minWidth: '66px',
                        textAlign: 'center',
                        display: 'inline-block'
                      }}>
                        {isSelected ? 'Đang chọn' : 'Xử lý'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: BẢNG TÁC VỤ THEO NGỮ CẢNH CỦA XE ĐANG CHỌN */}
        <div className="fleet-box" style={{ margin: 0, padding: '1.1rem 1.25rem' }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {isEditingBusInWorkshop
                ? 'Thông Tin Hồ Sơ Xưởng & Xác Nhận Nghiệm Thu'
                : 'Thiết Lập Trạng Thái Phương Tiện'}
            </h2>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
              {isEditingBusInWorkshop
                ? 'Phương tiện đang nằm xưởng. Kiểm tra tiến độ kỹ thuật và xác nhận nghiệm thu phương tiện.'
                : 'Điều chuyển trạng thái vận hành kỹ thuật của xe vào xưởng hoặc đỗ bãi dự phòng.'}
            </div>
          </div>

          {editingBus ? (
            <div>
              {/* Thẻ hiển thị thông tin xe đang chọn */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                    PHƯƠNG TIỆN ĐANG CHỌN
                  </div>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem' }}>
                    Xe {editingBus.plateNumber}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                    {editingBus.type} ({editingBus.totalSeats} chỗ)
                  </div>
                </div>
                <div>
                  {getStatusChip(editingBus.activeStatus || 'ready')}
                </div>
              </div>

              {/* TRƯỜNG HỢP 1: XE ĐANG Ở XƯỞNG (BẢO DƯỠNG HOẶC SỬA CHỮA) */}
              {isEditingBusInWorkshop ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    backgroundColor: editingBus.activeStatus === 'repairing' ? '#fef2f2' : '#fff7ed',
                    border: editingBus.activeStatus === 'repairing' ? '1px solid #fecaca' : '1px solid #fed7aa',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: editingBus.activeStatus === 'repairing' ? '#b91c1c' : '#c2410c', textTransform: 'uppercase' }}>
                        HỒ SƠ XE ĐANG TẠI XƯỞNG
                      </span>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: '#1e293b', lineHeight: '1.4' }}>
                      <div><strong>Garage tiếp nhận:</strong> {editingBus.maintenanceInfo?.garage || 'Chưa ghi nhận'}</div>
                      <div style={{ marginTop: '2px' }}><strong>Nội dung kỹ thuật:</strong> {editingBus.maintenanceInfo?.description || 'Kiểm tra bảo dưỡng định kỳ'}</div>
                      <div style={{ marginTop: '2px' }}><strong>Dự toán chi phí:</strong> <span style={{ fontWeight: '800', color: '#b91c1c' }}>{Number(editingBus.maintenanceInfo?.estimatedCost || 0).toLocaleString('vi-VN')} ₫</span></div>
                      {editingBus.maintenanceInfo?.estimatedCompletion && (
                        <div style={{ marginTop: '2px' }}><strong>Hạn dự kiến hoàn tất:</strong> {new Date(editingBus.maintenanceInfo.estimatedCompletion).toLocaleDateString('vi-VN')}</div>
                      )}
                    </div>

                    {/* Banner phê duyệt Giám đốc nếu là chi phí lớn */}
                    {editingBus.maintenanceInfo?.isMajor && (
                      <div style={{
                        marginTop: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        backgroundColor: editingBus.maintenanceInfo?.approvalStatus === 'approved' ? '#dcfce7' : '#ffedd5',
                        color: editingBus.maintenanceInfo?.approvalStatus === 'approved' ? '#15803d' : '#c2410c',
                        border: editingBus.maintenanceInfo?.approvalStatus === 'approved' ? '1px solid #bbf7d0' : '1px solid #fed7aa'
                      }}>
                        {editingBus.maintenanceInfo?.approvalStatus === 'approved'
                          ? '✓ Giám đốc đã chuẩn chi ngân sách sửa chữa (Cho phép nghiệm thu phương tiện).'
                          : '⏳ Chi phí lớn (≥ 10.000.000 ₫) đang chờ Giám đốc duyệt ngân sách. Chưa thể nghiệm thu.'}
                      </div>
                    )}
                  </div>

                  {/* NÚT TÁC VỤ CHÍNH: XÁC NHẬN NGHIỆM THU TRỰC TIẾP */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleConfirmAcceptance(editingBus)}
                      disabled={loadingSubmitComplete || (editingBus.maintenanceInfo?.isMajor && editingBus.maintenanceInfo?.approvalStatus !== 'approved')}
                      style={{
                        width: '100%',
                        backgroundColor: (editingBus.maintenanceInfo?.isMajor && editingBus.maintenanceInfo?.approvalStatus !== 'approved') ? '#94a3b8' : '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: '800',
                        cursor: (loadingSubmitComplete || (editingBus.maintenanceInfo?.isMajor && editingBus.maintenanceInfo?.approvalStatus !== 'approved')) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {loadingSubmitComplete ? 'Đang xử lý...' : 'Xác Nhận Nghiệm Thu'}
                    </button>
                  </div>
                </div>
              ) : (
                /* TRƯỜNG HỢP 2: FORM THIẾT LẬP TRẠNG THÁI (CHO XE SẴN SÀNG, TẠM NGƯNG) */
                <form noValidate onSubmit={handleSaveStatus} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Chọn trạng thái mới */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Trạng thái vận hành mới
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => {
                        setNewStatus(e.target.value);
                        if (error) setError('');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: '600',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="ready">Sẵn sàng hoạt động</option>
                      <option value="maintenance">Đang bảo dưỡng</option>
                      <option value="repairing">Đang sửa chữa</option>
                      <option value="inactive">Tạm ngưng hoạt động</option>
                    </select>
                  </div>

                  {/* Các trường bổ sung khi đưa xe vào Bảo dưỡng hoặc Sửa chữa */}
                  {(newStatus === 'maintenance' || newStatus === 'repairing') && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: '#fff7ed'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c2410c', textTransform: 'uppercase' }}>
                        THÔNG TIN XƯỞNG BẢO DƯỠNG &amp; SỬA CHỮA
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#431407', marginBottom: '2px' }}>
                          Garage / Nơi thực hiện *
                        </label>
                        <input
                          type="text"
                          value={garage}
                          onChange={(e) => {
                            setGarage(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="Ví dụ: Garage Thiên Phúc, Hyundai Service..."
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            fontSize: '0.76rem',
                            borderRadius: '6px',
                            border: (error && !garage.trim()) ? '1.5px solid #ef4444' : '1px solid #fdba74',
                            background: (error && !garage.trim()) ? '#fff5f5' : '#ffffff',
                            color: '#0f172a',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#431407', marginBottom: '2px' }}>
                          Nội dung thực hiện *
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => {
                            setDescription(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="Ví dụ: Thay dầu động cơ, lọc gió, kiểm tra phanh..."
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            fontSize: '0.76rem',
                            borderRadius: '6px',
                            border: (error && !description.trim()) ? '1.5px solid #ef4444' : '1px solid #fdba74',
                            background: (error && !description.trim()) ? '#fff5f5' : '#ffffff',
                            color: '#0f172a',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#431407', marginBottom: '2px' }}>
                            Chi phí dự kiến (VNĐ) *
                          </label>
                          <input
                            type="number"
                            value={estimatedCost}
                            onChange={(e) => {
                              setEstimatedCost(e.target.value);
                              if (error) setError('');
                            }}
                            placeholder="Ví dụ: 800000"
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              fontSize: '0.76rem',
                              borderRadius: '6px',
                              border: (error && (estimatedCost === '' || isNaN(Number(estimatedCost)) || Number(estimatedCost) < 0)) ? '1.5px solid #ef4444' : '1px solid #fdba74',
                              background: (error && (estimatedCost === '' || isNaN(Number(estimatedCost)) || Number(estimatedCost) < 0)) ? '#fff5f5' : '#ffffff',
                              color: '#0f172a',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#431407', marginBottom: '2px' }}>
                            Ngày dự kiến hoàn tất *
                          </label>
                          <input
                            type="date"
                            value={estimatedCompletion}
                            onChange={(e) => {
                              setEstimatedCompletion(e.target.value);
                              if (error) setError('');
                            }}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              fontSize: '0.76rem',
                              borderRadius: '6px',
                              border: (error && (!estimatedCompletion || new Date(estimatedCompletion) < new Date().setHours(0, 0, 0, 0))) ? '1.5px solid #ef4444' : '1px solid #fdba74',
                              background: (error && (!estimatedCompletion || new Date(estimatedCompletion) < new Date().setHours(0, 0, 0, 0))) ? '#fff5f5' : '#ffffff',
                              color: '#0f172a',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {Number(estimatedCost) >= 10000000 && (
                          <div style={{
                            gridColumn: 'span 2',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            fontSize: '0.72rem',
                            color: '#991b1b',
                            fontWeight: '600',
                            lineHeight: '1.4'
                          }}>
                            <strong>Chi phí lớn (&ge; 10.000.000 VNĐ):</strong> Hồ sơ này sẽ gửi Giám đốc phê duyệt trước khi bạn được quyền nghiệm thu xuất xưởng.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        backgroundColor: '#2563eb',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.55rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                      }}
                    >
                      Lưu cập nhật trạng thái
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
              Vui lòng chọn một phương tiện ở danh sách bên trái để thực hiện tác vụ.
            </div>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* 4. VÙNG DƯỚI CÙNG: LỊCH SỬ NHẬT KÝ                         */}
      {/* ========================================================= */}
      <div className="fleet-box" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Lịch Sử Nhật Ký
              </h2>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                Toàn bộ nhật ký bảo dưỡng, sửa chữa kỹ thuật và biến động trạng thái hoạt động của phương tiện
              </div>
            </div>

            {/* Bộ lọc theo phân loại lịch sử kỹ thuật & thời gian */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', flexWrap: 'wrap', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setLogFilterTab('all')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    background: logFilterTab === 'all' ? '#ffffff' : 'transparent',
                    color: logFilterTab === 'all' ? '#1e293b' : '#64748b',
                    boxShadow: logFilterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Tất cả ({countLogAll})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilterTab('ready')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    background: logFilterTab === 'ready' ? '#ffffff' : 'transparent',
                    color: logFilterTab === 'ready' ? '#047857' : '#64748b',
                    boxShadow: logFilterTab === 'ready' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Sẵn sàng hoạt động ({countLogReady})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilterTab('maintenance')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    background: logFilterTab === 'maintenance' ? '#ffffff' : 'transparent',
                    color: logFilterTab === 'maintenance' ? '#c2410c' : '#64748b',
                    boxShadow: logFilterTab === 'maintenance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Lịch sử bảo dưỡng ({countLogMaint})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilterTab('repairing')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    background: logFilterTab === 'repairing' ? '#ffffff' : 'transparent',
                    color: logFilterTab === 'repairing' ? '#dc2626' : '#64748b',
                    boxShadow: logFilterTab === 'repairing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Lịch sử sửa chữa ({countLogRepair})
                </button>
                <button
                  type="button"
                  onClick={() => setLogFilterTab('inactive')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    background: logFilterTab === 'inactive' ? '#ffffff' : 'transparent',
                    color: logFilterTab === 'inactive' ? '#475569' : '#64748b',
                    boxShadow: logFilterTab === 'inactive' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Tạm ngưng hoạt động ({countLogInactive})
                </button>
              </div>

              {/* Bộ lọc khoảng thời gian */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '2px 8px'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Từ:</span>
                <input
                  type="date"
                  value={logStartDate}
                  onChange={(e) => setLogStartDate(e.target.value)}
                  style={{
                    border: 'none',
                    fontSize: '0.72rem',
                    outline: 'none',
                    color: '#0f172a',
                    background: 'transparent',
                    padding: '1px 0'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Đến:</span>
                <input
                  type="date"
                  value={logEndDate}
                  onChange={(e) => setLogEndDate(e.target.value)}
                  style={{
                    border: 'none',
                    fontSize: '0.72rem',
                    outline: 'none',
                    color: '#0f172a',
                    background: 'transparent',
                    padding: '1px 0'
                  }}
                />
              </div>

              {/* Nút biểu tượng Reset */}
              <button
                type="button"
                onClick={handleResetLogFilters}
                title="Đặt lại toàn bộ bộ lọc"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: (logFilterTab !== 'all' || logStartDate || logEndDate) ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  background: (logFilterTab !== 'all' || logStartDate || logEndDate) ? '#fef2f2' : '#ffffff',
                  color: (logFilterTab !== 'all' || logStartDate || logEndDate) ? '#dc2626' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu nhật ký toàn diện */}
        <div style={{ overflowX: 'auto' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.78rem' }}>
              Không có bản ghi nhật ký nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <table className="audit-table" style={{ minWidth: '1080px' }}>
              <thead>
                <tr>
                  <th style={{ width: '135px', whiteSpace: 'nowrap' }}>Thời Gian</th>
                  <th style={{ width: '170px', textAlign: 'center', whiteSpace: 'nowrap' }}>Biển Số &amp; Dòng Xe</th>
                  <th style={{ width: '175px', whiteSpace: 'nowrap' }}>Loại Biến Động</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Chi Tiết / Hạng Mục Kỹ Thuật</th>
                  <th style={{ width: '160px', whiteSpace: 'nowrap' }}>Garage / Tiếp Nhận</th>
                  <th style={{ width: '110px', textAlign: 'right', whiteSpace: 'nowrap' }}>Chi Phí</th>
                  <th style={{ width: '135px', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng Thái Duyệt</th>
                  <th style={{ width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item, idx) => {
                  const d = new Date(item.time);
                  const timeStr = !isNaN(d.getTime())
                    ? `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • ${d.toLocaleDateString('vi-VN')}`
                    : '-';

                  const relatedBus = buses.find(b => b.plateNumber === item.plateNumber);
                  const isCurrentlyInWorkshop = relatedBus && (relatedBus.activeStatus === 'maintenance' || relatedBus.activeStatus === 'repairing');
                  const isEntryWorkshopRow = (item.toStatus === 'maintenance' || item.toStatus === 'repairing') && !item.isHandover;

                  return (
                    <tr key={item.id || idx}>
                      {/* Thời gian */}
                      <td style={{ color: '#64748b', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                        {timeStr}
                      </td>

                      {/* Biển số & Dòng xe: Căn giữa, dòng xe nằm dưới biển số */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px'
                        }}>
                          <span className="plate-box" style={{ fontSize: '0.76rem', padding: '1px 7px' }}>
                            {item.plateNumber}
                          </span>
                          {item.busType && (
                            <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>
                              {item.busType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Loại biến động: Hiển thị ngắn gọn nhãn biến động */}
                      <td>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: item.categoryBg || '#eff6ff',
                          color: item.categoryColor || '#1d4ed8',
                          border: `1px solid ${item.categoryBorder || '#bfdbfe'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {item.categoryLabel}
                        </span>
                      </td>

                      {/* Chi tiết / Nội dung */}
                      <td>
                        <div style={{ color: '#1e293b', fontSize: '0.74rem', lineHeight: '1.4' }}>
                          {item.details}
                        </div>
                      </td>

                      {/* Garage */}
                      <td>
                        <span style={{ color: '#475569', fontSize: '0.73rem', fontWeight: '600' }}>
                          {item.garage}
                        </span>
                      </td>

                      {/* Chi phí */}
                      <td style={{ textAlign: 'right', fontWeight: '700', color: item.cost > 0 ? '#b91c1c' : '#94a3b8', whiteSpace: 'nowrap' }}>
                        {item.cost > 0 ? `${Number(item.cost).toLocaleString('vi-VN')} ₫` : '-'}
                      </td>

                      {/* Trạng thái duyệt */}
                      <td style={{ textAlign: 'center' }}>
                        {item.approvalStatus === 'approved' || item.approvalStatus === 'auto_approved' ? (
                          <span style={{ fontSize: '0.67rem', padding: '2px 7px', background: '#dcfce7', color: '#15803d', borderRadius: '10px', fontWeight: '700' }}>
                            Đã duyệt
                          </span>
                        ) : item.approvalStatus === 'rejected' ? (
                          <span style={{ fontSize: '0.67rem', padding: '2px 7px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px', fontWeight: '700' }}>
                            Từ chối
                          </span>
                        ) : item.approvalStatus === 'pending' || item.approvalStatus === 'pending_approval' ? (
                          <span style={{ fontSize: '0.67rem', padding: '2px 7px', background: '#ffedd5', color: '#c2410c', borderRadius: '10px', fontWeight: '700' }}>
                            Chờ duyệt
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.67rem', color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Cột Thao Tác: Nghiệm Thu (nếu xe đang còn nằm xưởng) & Xem Chi Tiết */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          {isEntryWorkshopRow && isCurrentlyInWorkshop && (
                            <button
                              type="button"
                              disabled={loadingSubmitComplete}
                              onClick={() => handleConfirmAcceptance(relatedBus)}
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                color: '#ffffff',
                                background: '#16a34a',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(22, 163, 74, 0.25)'
                              }}
                              title={`Xác nhận nghiệm thu đưa xe ${item.plateNumber} về sẵn sàng hoạt động`}
                            >
                              Nghiệm thu
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedDetailRecord({
                              ...item,
                              currentBusStatus: relatedBus?.activeStatus || 'ready',
                              relatedBus: relatedBus,
                              canDirectAccept: isEntryWorkshopRow && isCurrentlyInWorkshop
                            })}
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: '#2563eb',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            Xem
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. MODAL XEM CHI TIẾT HỒ SƠ BIẾN ĐỘNG / BẢO TRÌ           */}
      {/* ========================================================= */}
      {selectedDetailRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1400
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            width: '90%',
            maxWidth: '540px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            padding: '1.4rem 1.6rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Chi Tiết Hồ Sơ Kỹ Thuật &amp; Biến Động
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Thông tin đầy đủ của đợt điều chuyển và nhật ký bảo trì phương tiện
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem', color: '#1e293b' }}>
              {/* Thẻ xe */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="plate-box" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                    {selectedDetailRecord.plateNumber}
                  </span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    {selectedDetailRecord.busType}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {new Date(selectedDetailRecord.time).toLocaleString('vi-VN')}
                </span>
              </div>

              {/* Thông tin biến động */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Loại biến động</div>
                  <div style={{ fontWeight: '700', color: selectedDetailRecord.categoryColor || '#1d4ed8', marginTop: '2px' }}>
                    {selectedDetailRecord.categoryLabel}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '1px' }}>
                    {selectedDetailRecord.summary}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Trạng thái duyệt</div>
                  <div style={{ marginTop: '4px' }}>
                    {selectedDetailRecord.approvalStatus === 'approved' || selectedDetailRecord.approvalStatus === 'auto_approved' ? (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', fontWeight: '700' }}>
                        Đã duyệt
                      </span>
                    ) : selectedDetailRecord.approvalStatus === 'rejected' ? (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontWeight: '700' }}>
                        Từ chối duyệt
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#ffedd5', color: '#c2410c', borderRadius: '6px', fontWeight: '700' }}>
                        Chờ duyệt
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Garage & Chi phí */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Garage / Nơi tiếp nhận</div>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                    {selectedDetailRecord.garage || 'Xưởng nội bộ'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Chi phí thực tế</div>
                  <div style={{ fontWeight: '800', color: selectedDetailRecord.cost > 0 ? '#b91c1c' : '#94a3b8', fontSize: '0.88rem', marginTop: '2px' }}>
                    {selectedDetailRecord.cost > 0 ? `${Number(selectedDetailRecord.cost).toLocaleString('vi-VN')} ₫` : '-'}
                  </div>
                </div>
              </div>

              {/* Chi tiết kỹ thuật */}
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Nội dung / Hạng mục kỹ thuật thực hiện
                </div>
                <div style={{ fontSize: '0.76rem', color: '#0f172a', lineHeight: '1.5' }}>
                  {selectedDetailRecord.details}
                </div>
              </div>

              {/* Hiện trạng phương tiện */}
              <div style={{
                background: selectedDetailRecord.currentBusStatus === 'ready' ? '#f0fdf4' : (selectedDetailRecord.currentBusStatus === 'maintenance' || selectedDetailRecord.currentBusStatus === 'repairing' ? '#fff7ed' : '#f8fafc'),
                padding: '9px 12px',
                borderRadius: '6px',
                border: selectedDetailRecord.currentBusStatus === 'ready' ? '1px solid #bbf7d0' : (selectedDetailRecord.currentBusStatus === 'maintenance' || selectedDetailRecord.currentBusStatus === 'repairing' ? '1px solid #fed7aa' : '1px solid #e2e8f0'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                    Hiện trạng phương tiện hiện tại
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: '700', color: selectedDetailRecord.currentBusStatus === 'ready' ? '#15803d' : '#c2410c', marginTop: '2px' }}>
                    {selectedDetailRecord.currentBusStatus === 'ready'
                      ? 'Phương tiện đang Sẵn sàng hoạt động (Đã nghiệm thu xuất xưởng)'
                      : (selectedDetailRecord.currentBusStatus === 'maintenance'
                          ? 'Phương tiện đang trong xưởng bảo dưỡng'
                          : (selectedDetailRecord.currentBusStatus === 'repairing'
                              ? 'Phương tiện đang trong xưởng sửa chữa'
                              : 'Tạm ngưng hoạt động'))}
                  </div>
                </div>
                {selectedDetailRecord.canDirectAccept && selectedDetailRecord.relatedBus && (
                  <button
                    type="button"
                    disabled={loadingSubmitComplete}
                    onClick={() => {
                      const busToAccept = selectedDetailRecord.relatedBus;
                      setSelectedDetailRecord(null);
                      handleConfirmAcceptance(busToAccept);
                    }}
                    style={{
                      padding: '0.4rem 0.9rem',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      color: '#ffffff',
                      background: '#16a34a',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Nghiệm Thu Xe Ngay
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                style={{
                  padding: '0.45rem 1.2rem',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#334155',
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

export default FleetStatusPage;
