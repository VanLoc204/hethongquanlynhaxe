import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const FleetMaintenancePage = () => {
  const { token } = useContext(AuthContext);
  
  // Real data states
  const [activeBuses, setActiveBuses] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Completion Modal State
  const [completingBus, setCompletingBus] = useState(null);
  const [actualCost, setActualCost] = useState('');
  const [finalDescription, setFinalDescription] = useState('');
  const [finalGarage, setFinalGarage] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Expand/Collapse state for compacting active list cards
  const [expandedBuses, setExpandedBuses] = useState({});

  const toggleExpandBus = (busId) => {
    setExpandedBuses(prev => ({
      ...prev,
      [busId]: !prev[busId]
    }));
  };

  const fetchActiveBuses = async () => {
    setLoadingActive(true);
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Filter only buses currently in maintenance or repairing
        const filtered = (data.buses || []).filter(
          b => b.status === 'approved' && (b.activeStatus === 'maintenance' || b.activeStatus === 'repairing')
        );
        setActiveBuses(filtered);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách xe bảo dưỡng:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchHistoryRecords = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/maintenance-records`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryRecords(data.records || []);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử bảo trì:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchActiveBuses();
      fetchHistoryRecords();
    }
  }, [token]);

  const handleOpenComplete = (bus) => {
    setCompletingBus(bus);
    setActualCost(bus.maintenanceInfo?.estimatedCost || '');
    setFinalDescription(bus.maintenanceInfo?.description || '');
    setFinalGarage(bus.maintenanceInfo?.garage || '');
  };

  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!completingBus) return;
    
    setLoadingSubmit(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        busId: completingBus._id,
        plateNumber: completingBus.plateNumber,
        type: completingBus.activeStatus,
        description: finalDescription.trim(),
        garage: finalGarage.trim(),
        cost: Number(actualCost),
        startDate: completingBus.updatedAt,
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
        setSuccess(`Hoàn tất bảo trì xe ${completingBus.plateNumber} thành công! Trạng thái xe đã chuyển về Sẵn sàng hoạt động.`);
        setCompletingBus(null);
        // Refresh lists
        fetchActiveBuses();
        fetchHistoryRecords();
      } else {
        setError(data.message || 'Lỗi khi lưu hoàn tất bảo trì.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lưu thông tin hoàn tất bảo trì.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      maintenance: 'Bảo dưỡng định kỳ',
      repairing: 'Sửa chữa sự cố'
    };
    return labels[status] || status;
  };

  const formatCurrency = (val) => {
    if (!val) return '0đ';
    return Number(val).toLocaleString('vi-VN') + 'đ';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      
      {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ padding: '0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '2rem', alignItems: 'start' }} className="maintenance-grid">
        
        {/* Left Column: Active Tickets */}
        <section className="panel" style={{ margin: 0 }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Xe đang nằm xưởng bảo trì/sửa chữa</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
              Xe sẽ tạm khóa trên hệ thống điều hành chuyến cho tới khi bạn bấm nút "Hoàn tất".
            </p>
          </div>

          {loadingActive ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách...</div>
          ) : activeBuses.length === 0 ? (
            <div style={{ 
              textAlign: 'center', padding: '3.5rem 1rem', border: '2px dashed var(--card-border)', 
              borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' 
            }}>
              🎉 Tuyệt vời! Hiện tại không có phương tiện nào bị hỏng hóc hay đang bảo trì. Toàn đội xe hoạt động tốt.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeBuses.map((bus) => (
                <div 
                  key={bus._id}
                  style={{
                    border: '1px solid var(--card-border)', borderRadius: '8px',
                    padding: '0.75rem 1rem', backgroundColor: '#ffffff', display: 'flex',
                    flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    {/* Left: Bus Icon and Basic Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🚌</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{bus.plateNumber}</strong>
                          <span style={{ 
                            fontSize: '0.7rem', fontWeight: '700', padding: '1px 6px', borderRadius: '4px',
                            background: bus.activeStatus === 'maintenance' ? '#fef3c7' : '#fee2e2',
                            color: bus.activeStatus === 'maintenance' ? '#d97706' : '#dc2626'
                          }}>
                            {bus.activeStatus === 'maintenance' ? 'Bảo dưỡng' : 'Sửa chữa'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{bus.type}</span>
                      </div>
                    </div>

                    {/* Right: Compact Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={() => toggleExpandBus(bus._id)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--primary)',
                          fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', padding: '4px 8px',
                          textDecoration: 'underline', outline: 'none'
                        }}
                      >
                        {expandedBuses[bus._id] ? 'Ẩn bớt' : 'Chi tiết'}
                      </button>
                      
                      <button 
                        onClick={() => handleOpenComplete(bus)}
                        style={{
                          border: 'none', background: 'var(--success)', color: '#ffffff',
                          fontWeight: '700', fontSize: '0.75rem', padding: '6px 12px',
                          borderRadius: '4px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        Hoàn tất
                      </button>
                    </div>
                  </div>

                  {/* Expanded details dropdown inside the card */}
                  {expandedBuses[bus._id] && (
                    <div style={{ 
                      display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', 
                      color: 'var(--text-muted)', borderTop: '1px dashed var(--card-border)', 
                      paddingTop: '8px', marginTop: '2px', animation: 'fadeIn 0.15s' 
                    }}>
                      <div><strong>Garage:</strong> {bus.maintenanceInfo?.garage}</div>
                      <div><strong>Nội dung:</strong> {bus.maintenanceInfo?.description}</div>
                      <div><strong>Chi phí dự kiến:</strong> {formatCurrency(bus.maintenanceInfo?.estimatedCost)}</div>
                      <div><strong>Hạn dự kiến:</strong> {formatDate(bus.maintenanceInfo?.estimatedCompletion)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Historical Logs */}
        <section className="panel" style={{ margin: 0 }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Lịch sử sửa chữa &amp; bảo dưỡng toàn đội</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
              Danh sách các đợt sửa chữa/bảo dưỡng đã hoàn tất của đội xe.
            </p>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải lịch sử...</div>
          ) : historyRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Chưa ghi nhận lịch sử bảo dưỡng nào.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                    <th style={{ padding: '8px 12px' }}>Biển số</th>
                    <th style={{ padding: '8px 12px' }}>Loại hình</th>
                    <th style={{ padding: '8px 12px' }}>Nội dung thực hiện</th>
                    <th style={{ padding: '8px 12px' }}>Garage</th>
                    <th style={{ padding: '8px 12px' }}>Ngày hoàn thành</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Chi phí</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map((record) => (
                    <tr key={record._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--primary)' }}>{record.plateNumber}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '600', color: record.type === 'maintenance' ? '#d97706' : '#dc2626' }}>
                        {getStatusLabel(record.type)}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-main)' }}>{record.description}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{record.garage}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{formatDate(record.endDate)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                        {formatCurrency(record.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* COMPLETION DIALOG MODAL */}
      {completingBus && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1100
          }}
        >
          <div 
            style={{
              background: '#ffffff', borderRadius: '12px', width: '90%',
              maxWidth: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
              padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                Hoàn Tất Bảo Trì: {completingBus.plateNumber}
              </h3>
              <button 
                onClick={() => setCompletingBus(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmComplete} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Chi phí thực tế thanh toán (đ)</label>
                <input 
                  type="number" 
                  className="form-control"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="Nhập chi phí thực tế..."
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                  required
                  min="0"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Garage thực hiện</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={finalGarage}
                  onChange={(e) => setFinalGarage(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Nội dung công việc hoàn thành</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  value={finalDescription}
                  onChange={(e) => setFinalDescription(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.85rem', resize: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setCompletingBus(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  disabled={loadingSubmit}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', backgroundColor: 'var(--success)' }}
                  disabled={loadingSubmit}
                >
                  {loadingSubmit ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FleetMaintenancePage;
