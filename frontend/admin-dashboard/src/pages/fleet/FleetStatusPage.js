import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const FleetStatusPage = () => {
  const { token, user } = useContext(AuthContext);
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

  // Status History Logs
  const [logs, setLogs] = useState([]);

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

  useEffect(() => {
    if (token) {
      fetchBuses();
      // Load history logs from localStorage
      const savedLogs = localStorage.getItem('fleet_status_logs');
      if (savedLogs) {
        try {
          setLogs(JSON.parse(savedLogs));
        } catch (e) {
          console.error(e);
        }
      } else {
        // Initial clean enterprise logs
        const initialLogs = [
          {
            id: 'log-1',
            plateNumber: '51B-016.16',
            fromStatus: 'ready',
            toStatus: 'ready',
            time: new Date(Date.now() - 3600000 * 4).toISOString(),
            details: 'Kiểm tra kỹ thuật đầu ca xuất bến. Xe hoạt động ổn định.'
          },
          {
            id: 'log-2',
            plateNumber: '51B-044.44',
            fromStatus: 'maintenance',
            toStatus: 'ready',
            time: new Date(Date.now() - 3600000 * 28).toISOString(),
            details: 'Hoàn tất bảo dưỡng định kỳ thay dầu động cơ tại Garage Thiên Phúc. Đưa xe trở lại kíp chạy.'
          }
        ];
        setLogs(initialLogs);
        localStorage.setItem('fleet_status_logs', JSON.stringify(initialLogs));
      }
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

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingBus) return;

    try {
      const isMaintenance = newStatus === 'maintenance' || newStatus === 'repairing';
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
        if (isMaintenance) {
          logDetails += ` Nơi thực hiện: ${garage.trim() || 'Chưa ghi nhận'}. Nội dung: ${description.trim() || 'Kiểm tra kỹ thuật'}.`;
          if (estimatedCost) {
            logDetails += ` Chi phí dự kiến: ${Number(estimatedCost).toLocaleString('vi-VN')} VNĐ.`;
          }
        }

        const newLog = {
          id: 'log-' + Date.now(),
          plateNumber: editingBus.plateNumber,
          fromStatus: editingBus.activeStatus || 'ready',
          toStatus: newStatus,
          time: new Date().toISOString(),
          details: logDetails
        };

        const updatedLogs = [newLog, ...logs.slice(0, 19)];
        setLogs(updatedLogs);
        localStorage.setItem('fleet_status_logs', JSON.stringify(updatedLogs));

        // Refetch to synchronize UI
        fetchBuses();
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

  const readyCount = buses.filter(b => b.activeStatus === 'ready' || b.activeStatus === 'active' || !b.activeStatus).length;
  const maintCount = buses.filter(b => b.activeStatus === 'maintenance').length;
  const repairCount = buses.filter(b => b.activeStatus === 'repairing').length;
  const inactiveCount = buses.filter(b => b.activeStatus === 'inactive').length;

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
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
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .fleet-kpi-card {
          background: #ffffff;
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .plate-box {
          display: inline-block;
          background: #ffffff;
          border: 2px solid #0f172a;
          border-radius: 6px;
          padding: 2px 8px;
          font-family: monospace;
          font-weight: 800;
          font-size: 0.88rem;
          color: #0f172a;
          letter-spacing: 0.5px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .bus-select-card {
          display: flex;
          justifyContent: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          background-color: #ffffff;
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
          grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
          gap: 12px;
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
      {/* VÙNG 1: HEADER QUẢN TRỊ ĐỘI XE                            */}
      {/* ========================================================= */}
      <div className="fleet-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Cập Nhật &amp; Điều Phối Tình Trạng Phương Tiện
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                An Bình Fleet 2.0
              </span>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Sẵn Sàng {readyCount}/{buses.length} Xe
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                {user?.name || 'Quản Lý Đội Xe'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Hệ thống giám sát và điều chuyển trạng thái kỹ thuật phương tiện giữa phục vụ tuyến, bảo dưỡng định kỳ và sửa chữa xưởng.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={fetchBuses}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Tải lại danh sách
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: 4 THẺ THỐNG KÊ KPI ĐỘI XE                         */}
      {/* ========================================================= */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              XE SẴN SÀNG HOẠT ĐỘNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#ecfdf5', color: '#059669', borderRadius: '4px', fontWeight: '700' }}>
              Chạy tuyến
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginBottom: '2px' }}>
            {readyCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>xe sẵn sàng</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600' }}>
            Đang hoạt động tốt trên các biểu đồ chạy
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              XE ĐANG BẢO DƯỠNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#fff7ed', color: '#c2410c', borderRadius: '4px', fontWeight: '700' }}>
              Định kỳ
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#c2410c', marginBottom: '2px' }}>
            {maintCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>xe nằm xưởng</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {maintCount > 0 ? 'Đang thực hiện bảo dưỡng kỹ thuật' : 'Bảo trì và thay dầu máy theo chu kỳ'}
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              XE ĐANG SỬA CHỮA
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontWeight: '700' }}>
              Sự cố
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#dc2626', marginBottom: '2px' }}>
            {repairCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>xe</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {repairCount > 0 ? 'Khắc phục hư hỏng tại garage' : 'Không có sự cố đột xuất nằm xưởng'}
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TẠM NGƯNG HOẠT ĐỘNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: '700' }}>
              Dự phòng
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {inactiveCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>xe</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Đỗ bãi dự phòng thay thế khi cần thiết
          </div>
        </div>
      </div>

      {/* Thông báo cập nhật */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: '#ecfdf5', color: '#047857', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid #a7f3d0' }}>
          {success}
        </div>
      )}

      {/* ========================================================= */}
      {/* VÙNG 3: BỐ CỤC CHÍNH (DANH SÁCH BÊN TRÁI & FORM/LOG PHẢI) */}
      {/* ========================================================= */}
      <div className="status-layout-grid">
        
        {/* CỘT TRÁI: DANH SÁCH PHƯƠNG TIỆN TRONG ĐỘI XE */}
        <div className="fleet-box" style={{ margin: 0, padding: '1rem 1.15rem' }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Tình Trạng Hoạt Động Đội Xe
              </h2>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Bấm vào phương tiện để thiết lập trạng thái hoặc ghi nhận bảo dưỡng
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
              {buses.length} phương tiện
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#2563eb', fontWeight: '700', fontSize: '0.82rem' }}>
              Đang tải danh sách phương tiện...
            </div>
          ) : buses.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              Không có phương tiện nào trong cơ sở dữ liệu.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {buses.map((bus) => {
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
                        {isMaint && bus.maintenanceInfo?.garage && (
                          <div style={{ fontSize: '0.65rem', color: '#c2410c', fontWeight: '600', marginTop: '2px' }}>
                            Garage: {bus.maintenanceInfo.garage} • {bus.maintenanceInfo.description || 'Đang bảo dưỡng'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      {getStatusChip(bus.activeStatus || 'ready')}
                      <span style={{
                        fontSize: '0.65rem',
                        color: isSelected ? '#1d4ed8' : '#64748b',
                        fontWeight: '700'
                      }}>
                        {isSelected ? 'Đang chọn' : 'Chỉnh sửa'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: FORM CẬP NHẬT TRẠNG THÁI & NHẬT KÝ ĐIỀU PHỐI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* PANEL 1: FORM CẬP NHẬT TRẠNG THÁI */}
          <div className="fleet-box" style={{ margin: 0, padding: '1rem 1.15rem' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Thiết Lập Trạng Thái Phương Tiện
              </h2>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Thay đổi trạng thái vận hành và lưu vào hồ sơ kỹ thuật
              </div>
            </div>

            {editingBus ? (
              <form onSubmit={handleSaveStatus} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Banner xe đang chọn */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                      PHƯƠNG TIỆN ĐANG CHỌN
                    </div>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.88rem' }}>
                      Xe {editingBus.plateNumber}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#475569' }}>
                      {editingBus.type} ({editingBus.totalSeats} chỗ)
                    </div>
                  </div>
                  <div>
                    {getStatusChip(editingBus.activeStatus || 'ready')}
                  </div>
                </div>

                {/* Chọn trạng thái mới */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Trạng thái vận hành mới
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: '600',
                      outline: 'none'
                    }}
                  >
                    <option value="ready">Sẵn sàng hoạt động (Phục vụ tuyến đường)</option>
                    <option value="maintenance">Đang bảo dưỡng (Thay dầu, kiểm tra định kỳ)</option>
                    <option value="repairing">Đang sửa chữa (Gặp sự cố, khắc phục tại xưởng)</option>
                    <option value="inactive">Tạm ngưng hoạt động (Lưu bãi dự phòng)</option>
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
                    padding: '10px',
                    backgroundColor: '#fff7ed'
                  }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c2410c', textTransform: 'uppercase' }}>
                      THÔNG TIN XƯỞNG BẢO DƯỠNG &amp; SỬA CHỮA
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#431407', marginBottom: '2px' }}>
                        Garage / Nơi thực hiện
                      </label>
                      <input
                        type="text"
                        value={garage}
                        onChange={(e) => setGarage(e.target.value)}
                        placeholder="Ví dụ: Garage Thiên Phúc, Hyundai Service..."
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #fdba74',
                          background: '#ffffff',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#431407', marginBottom: '2px' }}>
                        Nội dung thực hiện
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ví dụ: Thay dầu động cơ, lọc gió, kiểm tra phanh..."
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #fdba74',
                          background: '#ffffff',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#431407', marginBottom: '2px' }}>
                          Chi phí dự kiến (VNĐ)
                        </label>
                        <input
                          type="number"
                          value={estimatedCost}
                          onChange={(e) => setEstimatedCost(e.target.value)}
                          placeholder="Ví dụ: 800000"
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #fdba74',
                            background: '#ffffff',
                            color: '#0f172a',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#431407', marginBottom: '2px' }}>
                          Ngày dự kiến hoàn tất
                        </label>
                        <input
                          type="date"
                          value={estimatedCompletion}
                          onChange={(e) => setEstimatedCompletion(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #fdba74',
                            background: '#ffffff',
                            color: '#0f172a',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      backgroundColor: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    Lưu cập nhật trạng thái
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#64748b', fontSize: '0.78rem' }}>
                Vui lòng chọn một phương tiện ở danh sách bên trái để chỉnh sửa trạng thái vận hành.
              </div>
            )}
          </div>

          {/* PANEL 2: NHẬT KÝ ĐIỀU PHỐI TRẠNG THÁI */}
          <div className="fleet-box" style={{ margin: 0, padding: '1rem 1.15rem' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Nhật Ký Thay Đổi Trạng Thái Gần Nhất
              </h2>
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Live Audit Logs
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>
                  Chưa ghi nhận nhật ký điều chuyển nào.
                </div>
              ) : (
                logs.slice(0, 5).map((log) => (
                  <div key={log.id} style={{ padding: '7px 9px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <strong style={{ color: '#1d4ed8' }}>Xe {log.plateNumber}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                        {new Date(log.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(log.time).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div style={{ color: '#334155', lineHeight: '1.3' }}>
                      <span>{getStatusLabelText(log.fromStatus)}</span> chuyển sang <strong>{getStatusLabelText(log.toStatus)}</strong>
                      <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '2px' }}>
                        {log.details}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default FleetStatusPage;
