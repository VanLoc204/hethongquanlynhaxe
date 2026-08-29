import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

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

  // Status History Logs (saved in localStorage for demonstration persistence)
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
        const approvedBuses = (data.buses || []).filter(b => b.status === 'approved');
        setBuses(approvedBuses);
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
        setLogs(JSON.parse(savedLogs));
      } else {
        // Seed some initial logs for display
        const initialLogs = [
          {
            id: 'log-1',
            plateNumber: '51B-016.16',
            fromStatus: 'ready',
            toStatus: 'maintenance',
            time: new Date(Date.now() - 3600000 * 24).toISOString(),
            details: 'Thay nhớt định kỳ tại Garage Auto Á Đông. Chi phí: 650.000đ'
          },
          {
            id: 'log-2',
            plateNumber: '51B-029.29',
            fromStatus: 'repairing',
            toStatus: 'ready',
            time: new Date(Date.now() - 3600000 * 6).toISOString(),
            details: 'Hoàn tất sửa chữa máy phát điện. Đưa xe trở lại hoạt động.'
          }
        ];
        setLogs(initialLogs);
        localStorage.setItem('fleet_status_logs', JSON.stringify(initialLogs));
      }
    }
  }, [token]);

  const handleOpenUpdate = (bus) => {
    setEditingBus(bus);
    setNewStatus(bus.activeStatus || 'ready');
    setDescription(bus.maintenanceInfo?.description || '');
    setGarage(bus.maintenanceInfo?.garage || '');
    setEstimatedCost(bus.maintenanceInfo?.estimatedCost || '');
    
    // Format date for input: YYYY-MM-DD
    if (bus.maintenanceInfo?.estimatedCompletion) {
      const d = new Date(bus.maintenanceInfo.estimatedCompletion);
      const formatted = d.toISOString().substring(0, 10);
      setEstimatedCompletion(formatted);
    } else {
      setEstimatedCompletion('');
    }
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
        
        // Add log entry
        const statusLabels = {
          ready: 'Sẵn sàng hoạt động',
          maintenance: 'Đang bảo dưỡng',
          repairing: 'Đang sửa chữa',
          inactive: 'Tạm ngưng hoạt động'
        };
        let logDetails = `Chuyển trạng thái sang: ${statusLabels[newStatus]}.`;
        if (isMaintenance) {
          logDetails += ` Nơi thực hiện: ${garage.trim() || 'Chưa ghi nhận'}. Nội dung: ${description.trim() || 'Nội dung trống'}.`;
          if (estimatedCost) {
            logDetails += ` Chi phí dự kiến: ${Number(estimatedCost).toLocaleString('vi-VN')}đ.`;
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

        const updatedLogs = [newLog, ...logs];
        setLogs(updatedLogs);
        localStorage.setItem('fleet_status_logs', JSON.stringify(updatedLogs));

        setEditingBus(null);
        fetchBuses();
      } else {
        setError(data.message || 'Lỗi khi cập nhật trạng thái.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi cập nhật trạng thái.');
    }
  };

  const getActiveStatusBadge = (status) => {
    switch (status) {
      case 'maintenance':
        return <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>Bảo dưỡng</span>;
      case 'repairing':
        return <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>Sửa chữa</span>;
      case 'inactive':
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>Tạm ngưng</span>;
      default:
        return <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>Sẵn sàng</span>;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      ready: 'Sẵn sàng hoạt động',
      maintenance: 'Đang bảo dưỡng',
      repairing: 'Đang sửa chữa',
      inactive: 'Tạm ngưng hoạt động'
    };
    return labels[status] || status;
  };

  const formatCurrency = (val) => {
    if (!val) return '0đ';
    return Number(val).toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Overview Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="stat-card" style={{ background: '#ffffff', borderLeft: '5px solid #16a34a', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>XE SẴN SÀNG</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '5px 0', color: '#16a34a' }}>
            {buses.filter(b => b.activeStatus === 'ready' || !b.activeStatus).length} Xe
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đang hoạt động tốt trên tuyến</span>
        </div>

        <div className="stat-card" style={{ background: '#ffffff', borderLeft: '5px solid #d97706', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>XE ĐANG BẢO DƯỠNG</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '5px 0', color: '#d97706' }}>
            {buses.filter(b => b.activeStatus === 'maintenance').length} Xe
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bảo trì và thay dầu định kỳ</span>
        </div>

        <div className="stat-card" style={{ background: '#ffffff', borderLeft: '5px solid #dc2626', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>XE ĐANG SỬA CHỮA</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '5px 0', color: '#dc2626' }}>
            {buses.filter(b => b.activeStatus === 'repairing').length} Xe
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ghi nhận sự cố nằm xưởng</span>
        </div>

        <div className="stat-card" style={{ background: '#ffffff', borderLeft: '5px solid #64748b', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>TẠM NGƯNG HOẠT ĐỘNG</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', margin: '5px 0', color: '#64748b' }}>
            {buses.filter(b => b.activeStatus === 'inactive').length} Xe
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đang đỗ bãi dự phòng</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'start' }} className="status-container-grid">
        
        {/* Main List Section */}
        <section className="panel" style={{ margin: 0 }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Tình trạng hoạt động đội xe</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
              Danh sách các phương tiện đã được duyệt hoạt động. Nhấp vào xe để cập nhật lại tình trạng vận hành thực tế.
            </p>
          </div>

          {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
          {success && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500' }}>{success}</div>}

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách xe...</div>
          ) : buses.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy phương tiện nào được duyệt hoạt động trên hệ thống.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {buses.map((bus) => (
                <div 
                  key={bus._id}
                  onClick={() => handleOpenUpdate(bus)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem', border: editingBus?._id === bus._id ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: editingBus?._id === bus._id ? 'rgba(59, 130, 246, 0.04)' : '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  className="status-bus-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '45px', height: '45px', borderRadius: '6px',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: '700',
                      color: 'var(--primary)', fontSize: '1.3rem'
                    }}>
                      🚌
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>{bus.plateNumber}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bus.type} ({bus.totalSeats} chỗ)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'right' }}>
                      {getActiveStatusBadge(bus.activeStatus || 'ready')}
                      {bus.activeStatus === 'maintenance' && bus.maintenanceInfo?.estimatedCost && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Dự kiến: {formatCurrency(bus.maintenanceInfo.estimatedCost)}
                        </div>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Update Form & History Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Status Update Card */}
          <section className="panel" style={{ margin: 0, border: '1px solid var(--card-border)' }}>
            <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Cập nhật nhanh tình trạng</h2>
            </div>

            {editingBus ? (
              <form onSubmit={handleSaveStatus} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #e2e8f0', marginBottom: '5px' }}>
                  Đang chọn xe: <strong style={{ color: 'var(--primary)' }}>{editingBus.plateNumber}</strong>
                  <br />
                  Loại xe: <span style={{ color: '#475569' }}>{editingBus.type}</span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Trạng thái vận hành mới</label>
                  <select 
                    className="form-control"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  >
                    <option value="ready">Sẵn sàng hoạt động (Hoạt động tốt)</option>
                    <option value="maintenance">Đang bảo dưỡng (Thay dầu, kiểm tra định kỳ)</option>
                    <option value="repairing">Đang sửa chữa (Gặp sự cố máy móc, nằm xưởng)</option>
                    <option value="inactive">Tạm ngưng hoạt động (Lưu bãi dự phòng)</option>
                  </select>
                </div>

                {/* Form fields for maintenance / repairing details */}
                {(newStatus === 'maintenance' || newStatus === 'repairing') && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px',
                    backgroundColor: '#fafafa', marginTop: '5px'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>CHI TIẾT ĐỀ XUẤT PHÁT SINH</div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Garage / Nơi thực hiện</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={garage}
                        onChange={(e) => setGarage(e.target.value)}
                        placeholder="Ví dụ: Garage Auto Á Đông, Hyundai Service..."
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.75rem' }}>Nội dung sửa chữa / bảo dưỡng</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ví dụ: Thay dầu động cơ, má phanh..."
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>Chi phí dự kiến (đ)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={estimatedCost}
                          onChange={(e) => setEstimatedCost(e.target.value)}
                          placeholder="Ví dụ: 800000"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>Ngày hoàn thành dự kiến</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          value={estimatedCompletion}
                          onChange={(e) => setEstimatedCompletion(e.target.value)}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setEditingBus(null)}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ flex: 1.5, padding: '0.5rem', fontSize: '0.85rem' }}
                  >
                    Lưu cập nhật
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Vui lòng chọn một phương tiện ở danh sách bên trái để chỉnh sửa trạng thái vận hành.
              </div>
            )}
          </section>

          {/* Operational Log Section */}
          <section className="panel" style={{ margin: 0, maxHeight: '280px', overflowY: 'auto' }}>
            <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>Nhật ký thay đổi trạng thái</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logs.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Chưa có nhật ký nào ghi nhận.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <strong style={{ color: 'var(--primary)' }}>{log.plateNumber}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(log.time).toLocaleTimeString('vi-VN')} {new Date(log.time).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div style={{ color: 'var(--text-main)', lineHeight: '1.3' }}>
                      <strong>{getStatusLabel(log.fromStatus)}</strong> ➔ <strong>{getStatusLabel(log.toStatus)}</strong>
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>{log.details}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

      </div>

    </div>
  );
};

export default FleetStatusPage;
