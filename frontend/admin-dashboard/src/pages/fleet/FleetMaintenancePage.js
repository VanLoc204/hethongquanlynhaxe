import React, { useState, useEffect, useContext, useMemo } from 'react';
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

  // Filtering & Search
  const [searchHistory, setSearchHistory] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Completion Modal State
  const [completingBus, setCompletingBus] = useState(null);
  const [actualCost, setActualCost] = useState('');
  const [finalDescription, setFinalDescription] = useState('');
  const [finalGarage, setFinalGarage] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Expand/Collapse state for active list cards
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
        // Filter only approved buses currently in maintenance or repairing
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

  const refreshAll = () => {
    fetchActiveBuses();
    fetchHistoryRecords();
  };

  useEffect(() => {
    if (token) {
      fetchActiveBuses();
      fetchHistoryRecords();
    }
  }, [token]);

  const handleOpenComplete = (bus) => {
    if (bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus !== 'approved') {
      alert(
        bus.maintenanceInfo?.approvalStatus === 'rejected'
          ? `Khoản chi phí bảo dưỡng xe ${bus.plateNumber} đã bị Giám đốc TỪ CHỐI DUYỆT (Lý do: "${bus.maintenanceInfo?.rejectionReason || 'Ngân sách không phù hợp'}"). Vui lòng kiểm tra lại báo giá từ gara!`
          : `Khoản chi phí bảo dưỡng xe ${bus.plateNumber} là ${formatCurrency(bus.maintenanceInfo?.estimatedCost)} (≥ 10.000.000 ₫ - Chi phí lớn) đang CHỜ GIÁM ĐỐC DUYỆT NGÂN SÁCH. Chưa thể nghiệm thu xe xuất xưởng!`
      );
      return;
    }
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
        cost: Number(actualCost) || 0,
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
        setSuccess(`Hoàn tất bảo trì xe ${completingBus.plateNumber} thành công. Phương tiện đã chuyển về trạng thái Sẵn sàng hoạt động.`);
        setCompletingBus(null);
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

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // KPIs
  const totalInShop = activeBuses.length;
  const inMaintenance = activeBuses.filter(b => b.activeStatus === 'maintenance').length;
  const inRepair = activeBuses.filter(b => b.activeStatus === 'repairing').length;
  const totalSpent = useMemo(() => {
    return historyRecords.reduce((acc, cur) => acc + (Number(cur.cost) || 0), 0);
  }, [historyRecords]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyRecords.filter(item => {
      const matchType = typeFilter === 'all' || item.type === typeFilter;
      const q = searchHistory.trim().toLowerCase();
      const matchSearch = !q ||
        (item.plateNumber && item.plateNumber.toLowerCase().includes(q)) ||
        (item.garage && item.garage.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [historyRecords, typeFilter, searchHistory]);

  const totalFilteredSpent = useMemo(() => {
    return filteredHistory.reduce((acc, cur) => acc + (Number(cur.cost) || 0), 0);
  }, [filteredHistory]);

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <style>{`
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

        .kpi-stat-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 0.9rem 1.1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fleet-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.1rem 1.15rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .maintenance-grid {
          display: grid;
          grid-template-columns: 290px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
        }

        .history-table th {
          background: #f8fafc;
          padding: 8px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.2px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .history-table td {
          padding: 8px 10px;
          font-size: 0.74rem;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          white-space: nowrap;
        }

        .history-table tr:hover td {
          background: #f8fafc;
        }

        .filter-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          transition: all 0.15s ease;
        }
        .filter-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        @media (max-width: 1024px) {
          .maintenance-grid {
            grid-template-columns: 1fr;
          }
          .kpi-stat-container {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .kpi-stat-container {
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
            Quản Lý Bảo Trì & Sửa Chữa Đội Xe
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Theo dõi phương tiện đang tại xưởng kỹ thuật, nghiệm thu hoàn tất và lưu trữ hồ sơ chi phí sửa chữa toàn đội.
          </p>
        </div>

        <button
          onClick={refreshAll}
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

      {/* Notification banner */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.82rem',
          fontWeight: '600'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '0.82rem',
          fontWeight: '600'
        }}>
          {success}
        </div>
      )}

      {/* KPI Cards Row */}
      <div
        className="kpi-stat-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px'
        }}
      >
        <div className="kpi-stat-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Xe Đang Tại Xưởng
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: totalInShop > 0 ? '#ea580c' : '#16a34a' }}>
              {totalInShop}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              phương tiện
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: totalInShop > 0 ? '#c2410c' : '#166534', fontWeight: '600' }}>
            {totalInShop > 0 ? 'Tạm ngưng phục vụ chuyến' : 'Toàn đội sẵn sàng hoạt động'}
          </div>
        </div>

        <div className="kpi-stat-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Bảo Dưỡng Định Kỳ
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#d97706' }}>
              {inMaintenance}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              phương tiện
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: '600' }}>
            Bảo trì theo định mức km
          </div>
        </div>

        <div className="kpi-stat-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Sửa Chữa Sự Cố
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#dc2626' }}>
              {inRepair}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
              phương tiện
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: '600' }}>
            Sửa chữa đột xuất / hỏng hóc
          </div>
        </div>

        <div className="kpi-stat-card">
          <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Tổng Chi Phí Đã Thanh Toán
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
              {formatCurrency(totalSpent)}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
            {historyRecords.length} lượt hoàn tất bảo dưỡng
          </div>
        </div>
      </div>

      {/* Main 2-Panel Layout */}
      <div className="maintenance-grid">

        {/* Panel 1: Vehicles currently in garage */}
        <div className="fleet-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>
                  Xe Đang Tại Xưởng
                </h2>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: totalInShop > 0 ? '#ffedd5' : '#dcfce7',
                  color: totalInShop > 0 ? '#9a3412' : '#166534'
                }}>
                  {totalInShop} xe
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Xe tạm khóa trên lịch điều hành cho đến khi bấm Nghiệm thu hoàn tất.
              </p>
            </div>
          </div>

          {loadingActive ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              Đang tải danh sách xe tại xưởng...
            </div>
          ) : activeBuses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px'
            }}>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                Không có phương tiện nào đang tại xưởng
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '340px', margin: '0 auto' }}>
                Tất cả các phương tiện thuộc đội xe hiện đều đạt chuẩn kỹ thuật và sẵn sàng phục vụ hành trình.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeBuses.map((bus) => {
                const isMaint = bus.activeStatus === 'maintenance';
                const isExpanded = !!expandedBuses[bus._id];

                return (
                  <div
                    key={bus._id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.9rem 1rem',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="plate-box">{bus.plateNumber}</div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>
                            {bus.type}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                            Sức chứa: {bus.totalSeats} chỗ
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: isMaint ? '#fef3c7' : '#fee2e2',
                          color: isMaint ? '#b45309' : '#b91c1c',
                          border: `1px solid ${isMaint ? '#fde68a' : '#fecaca'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {isMaint ? 'Bảo dưỡng' : 'Sửa chữa'}
                        </span>

                        {bus.maintenanceInfo?.isMajor && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor:
                              bus.maintenanceInfo?.approvalStatus === 'approved' ? '#dcfce7' :
                              bus.maintenanceInfo?.approvalStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
                            color:
                              bus.maintenanceInfo?.approvalStatus === 'approved' ? '#166534' :
                              bus.maintenanceInfo?.approvalStatus === 'rejected' ? '#991b1b' : '#9a3412',
                            border: `1px solid ${
                              bus.maintenanceInfo?.approvalStatus === 'approved' ? '#86efac' :
                              bus.maintenanceInfo?.approvalStatus === 'rejected' ? '#fca5a5' : '#fde047'
                            }`,
                            whiteSpace: 'nowrap'
                          }}>
                            {bus.maintenanceInfo?.approvalStatus === 'approved' ? '✓ GĐ Đã duyệt' :
                             bus.maintenanceInfo?.approvalStatus === 'rejected' ? '✕ GĐ Từ chối' : '⏳ Chờ GĐ duyệt'}
                          </span>
                        )}

                        <button
                          onClick={() => handleOpenComplete(bus)}
                          disabled={bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus !== 'approved'}
                          title={
                            bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus !== 'approved'
                              ? 'Chi phí lớn cần được Giám đốc phê duyệt trước khi nghiệm thu xuất xưởng'
                              : 'Nghiệm thu hoàn tất xuất xưởng'
                          }
                          style={{
                            backgroundColor: (bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus !== 'approved') ? '#94a3b8' : '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: (bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus !== 'approved') ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            opacity: (bus.maintenanceInfo?.isMajor && bus.maintenanceInfo?.approvalStatus !== 'approved') ? 0.75 : 1
                          }}
                        >
                          Nghiệm thu
                        </button>
                      </div>
                    </div>

                    {/* Quick details */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.72rem',
                      color: '#475569'
                    }}>
                      <div>
                        <span style={{ fontWeight: '600' }}>Garage:</span> {bus.maintenanceInfo?.garage || 'Chưa ghi nhận'}
                      </div>
                      <button
                        onClick={() => toggleExpandBus(bus._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: '700',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '8px 10px',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: '0.72rem',
                        color: '#334155',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px'
                      }}>
                        <div><strong>Nội dung:</strong> {bus.maintenanceInfo?.description || 'Không có mô tả chi tiết'}</div>
                        <div>
                          <strong>Dự toán chi phí:</strong>{' '}
                          <span style={{ fontWeight: '700', color: bus.maintenanceInfo?.isMajor ? '#b91c1c' : '#0f172a' }}>
                            {formatCurrency(bus.maintenanceInfo?.estimatedCost)}
                          </span>
                          {bus.maintenanceInfo?.isMajor && (
                            <span style={{ marginLeft: '6px', color: '#b91c1c', fontSize: '0.68rem', fontWeight: '700' }}>
                              (Hạn mức lớn ≥ 10.000.000 ₫)
                            </span>
                          )}
                        </div>
                        <div><strong>Hạn dự kiến xong:</strong> {formatDate(bus.maintenanceInfo?.estimatedCompletion)}</div>
                        
                        {bus.maintenanceInfo?.isMajor && (
                          <div style={{
                            marginTop: '4px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: bus.maintenanceInfo?.approvalStatus === 'approved' ? '#f0fdf4' : bus.maintenanceInfo?.approvalStatus === 'rejected' ? '#fef2f2' : '#fffbeb',
                            border: `1px solid ${bus.maintenanceInfo?.approvalStatus === 'approved' ? '#bbf7d0' : bus.maintenanceInfo?.approvalStatus === 'rejected' ? '#fecaca' : '#fde68a'}`
                          }}>
                            <strong>Phê duyệt của Giám đốc: </strong>
                            {bus.maintenanceInfo?.approvalStatus === 'approved' ? (
                              <span style={{ color: '#166534', fontWeight: '700' }}>
                                ĐÃ PHÊ DUYỆT NGÂN SÁCH {bus.maintenanceInfo?.approvedAt ? `(${new Date(bus.maintenanceInfo.approvedAt).toLocaleDateString('vi-VN')})` : ''}
                                {bus.maintenanceInfo?.approvalNote ? ` - Chỉ đạo: "${bus.maintenanceInfo.approvalNote}"` : ''}
                              </span>
                            ) : bus.maintenanceInfo?.approvalStatus === 'rejected' ? (
                              <span style={{ color: '#991b1b', fontWeight: '700' }}>
                                TỪ CHỐI DUYỆT {bus.maintenanceInfo?.rejectionReason ? ` - Lý do: "${bus.maintenanceInfo.rejectionReason}"` : ''}
                              </span>
                            ) : (
                              <span style={{ color: '#b45309', fontWeight: '700' }}>
                                ĐANG CHỜ GIÁM ĐỐC DUYỆT (Hệ thống tạm khóa nghiệm thu xuất xưởng)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2: Maintenance history log */}
        <div className="fleet-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>
                Hồ Sơ Lịch Sử Bảo Dưỡng & Sửa Chữa
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Danh sách chi tiết các đợt kiểm tra, bảo trì và sửa chữa đã hoàn tất nghiệm thu.
              </p>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                Tất cả ({historyRecords.length})
              </button>
              <button
                className={`filter-btn ${typeFilter === 'maintenance' ? 'active' : ''}`}
                onClick={() => setTypeFilter('maintenance')}
              >
                Bảo dưỡng
              </button>
              <button
                className={`filter-btn ${typeFilter === 'repairing' ? 'active' : ''}`}
                onClick={() => setTypeFilter('repairing')}
              >
                Sửa chữa
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '0.85rem' }}>
            <input
              type="text"
              placeholder="Tìm theo biển số, garage hoặc nội dung bảo trì..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
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

          {loadingHistory ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              Đang tải lịch sử bảo trì...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#64748b',
              fontSize: '0.82rem'
            }}>
              Không tìm thấy hồ sơ bảo dưỡng nào phù hợp.
            </div>
          ) : (
            <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Phân loại</th>
                    <th>Nội dung thực hiện</th>
                    <th>Garage tiếp nhận</th>
                    <th>Ngày hoàn tất</th>
                    <th style={{ textAlign: 'right' }}>Chi phí</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((rec) => {
                    const isMaint = rec.type === 'maintenance';
                    return (
                      <tr key={rec._id}>
                        <td>
                          <div className="plate-box-mini">{rec.plateNumber}</div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isMaint ? '#fef3c7' : '#fee2e2',
                            color: isMaint ? '#b45309' : '#b91c1c',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}>
                            {isMaint ? 'Bảo dưỡng định kỳ' : 'Sửa chữa sự cố'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '240px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rec.description}>
                          {rec.description || 'Không ghi nhận'}
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.74rem' }}>
                          {rec.garage || 'N/A'}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.74rem' }}>
                          {formatDate(rec.endDate || rec.createdAt)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#0f172a', fontSize: '0.78rem' }}>
                          <div>{formatCurrency(rec.cost)}</div>
                          {(rec.isMajor || (Number(rec.cost) >= 10000000)) && (
                            <span style={{
                              display: 'inline-block',
                              fontSize: '0.64rem',
                              fontWeight: '700',
                              color: '#166534',
                              backgroundColor: '#dcfce7',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              border: '1px solid #bbf7d0',
                              marginTop: '2px',
                              whiteSpace: 'nowrap'
                            }}>
                              Đại tu đã duyệt
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan="5" style={{ padding: '8px 10px', fontSize: '0.74rem', fontWeight: '700', color: '#475569' }}>
                      Tổng cộng {filteredHistory.length} hồ sơ hoàn tất
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>
                      {formatCurrency(totalFilteredSpent)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Completion Modal */}
      {completingBus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1200
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            width: '90%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            padding: '1.4rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: '700', color: '#64748b' }}>
                  Nghiệm Thu & Đưa Vào Vận Hành
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div className="plate-box-mini">{completingBus.plateNumber}</div>
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>
                    {completingBus.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCompletingBus(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmComplete} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                  Chi Phí Thực Tế Quyết Toán (VNĐ) *
                </label>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="Ví dụ: 800000"
                  required
                  min="0"
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                  Garage Tiếp Nhận Thực Hiện *
                </label>
                <input
                  type="text"
                  value={finalGarage}
                  onChange={(e) => setFinalGarage(e.target.value)}
                  placeholder="Tên garage tiếp nhận..."
                  required
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155' }}>
                  Nội Dung & Hạng Mục Đã Sửa Chữa *
                </label>
                <textarea
                  rows="3"
                  value={finalDescription}
                  onChange={(e) => setFinalDescription(e.target.value)}
                  placeholder="Ghi rõ chi tiết hạng mục đã thay thế, bảo trì..."
                  required
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '0.72rem',
                color: '#475569'
              }}>
                Lưu ý: Sau khi xác nhận, hệ thống sẽ lưu biên bản bảo trì vào hồ sơ toàn đội và tự động mở lại phương tiện sang trạng thái <strong>Sẵn sàng hoạt động</strong>.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCompletingBus(null)}
                  style={{
                    padding: '7px 14px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                  disabled={loadingSubmit}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                  disabled={loadingSubmit}
                >
                  {loadingSubmit ? 'Đang lưu hồ sơ...' : 'Xác Nhận Nghiệm Thu'}
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
