import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const getScenarioBadge = (scenario) => {
  if (scenario === 'need_assistance') {
    return {
      label: 'Cứu hộ khẩn cấp',
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fca5a5'
    };
  }
  return {
    label: 'Xin hoàn ứng',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0'
  };
};

const getStatusBadge = (item) => {
  if (item.scenario === 'need_assistance') {
    switch (item.assistanceStatus) {
      case 'contacted':
        return { label: 'Đã liên hệ tài xế', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'dispatched':
        return { label: 'Đã điều thợ / gara', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'resolved':
        return { label: 'Đã khắc phục xong', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      default:
        return { label: 'Chờ tiếp nhận', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
    }
  } else {
    switch (item.reimbursementStatus) {
      case 'approved':
        return { label: 'Đã duyệt (Cộng vào lương)', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'paid':
        return { label: 'Đã quyết toán theo lương', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
      case 'rejected':
        return { label: 'Từ chối duyệt', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      default:
        return { label: 'Chờ duyệt', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    }
  }
};

const OpsIncidentsPage = () => {
  const { token, user } = useContext(AuthContext);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [scenarioFilter, setScenarioFilter] = useState('all'); // 'all', 'need_assistance', 'self_resolved'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'resolved'
  const [searchTerm, setSearchTerm] = useState('');

  // Detail & Action Modal
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Assistance Form in Modal
  const [assistanceStatusInput, setAssistanceStatusInput] = useState('contacted');
  const [assistanceNotesInput, setAssistanceNotesInput] = useState('');
  const [submittingAssistance, setSubmittingAssistance] = useState(false);

  // Reimbursement Form in Modal
  const [reimburseAction, setReimburseAction] = useState('approved');
  const [reimburseNoteInput, setReimburseNoteInput] = useState('');
  const [submittingReimburse, setSubmittingReimburse] = useState(false);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users/ops/incidents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIncidents(data.incidents || []);
      } else {
        setError(data.message || 'Không thể tải danh sách sự cố trên tuyến.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải danh sách sự cố.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchIncidents();
    }
  }, [token]);

  const openDetailModal = (inc) => {
    setSelectedIncident(inc);
    if (inc.scenario === 'need_assistance') {
      setAssistanceStatusInput(inc.assistanceStatus === 'pending' ? 'contacted' : inc.assistanceStatus);
      setAssistanceNotesInput(inc.assistanceNotes || '');
    } else {
      setReimburseAction('approved');
      setReimburseNoteInput(inc.reimbursementNote || 'Hồ sơ và chứng từ hợp lệ, chấp thuận hoàn ứng.');
    }
  };

  // Handle Assistance Update
  const handleSaveAssistance = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setSubmittingAssistance(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/users/ops/incidents/${selectedIncident._id}/assistance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assistanceStatus: assistanceStatusInput,
          assistanceNotes: assistanceNotesInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Đã cập nhật tiến độ ứng cứu thành công.');
        setSelectedIncident(null);
        fetchIncidents();
      } else {
        setError(data.message || 'Lỗi khi cập nhật tiến độ cứu viện.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi cập nhật cứu viện.');
    } finally {
      setSubmittingAssistance(false);
    }
  };

  // Handle Reimbursement Action
  const handleSaveReimbursement = async (statusOverride = null) => {
    if (!selectedIncident) return;
    const finalStatus = statusOverride || reimburseAction;

    setSubmittingReimburse(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/users/ops/incidents/${selectedIncident._id}/reimbursement`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: finalStatus,
          reimbursementNote: reimburseNoteInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || 'Cập nhật hoàn ứng thành công.');
        setSelectedIncident(null);
        fetchIncidents();
      } else {
        setError(data.message || 'Lỗi khi duyệt hoàn ứng.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi xử lý hoàn ứng.');
    } finally {
      setSubmittingReimburse(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
           d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  // KPIs
  const totalCount = incidents.length;
  const urgentCount = incidents.filter(i => i.scenario === 'need_assistance' && i.assistanceStatus !== 'resolved').length;
  const pendingReimburseCount = incidents.filter(i => i.scenario === 'self_resolved' && i.reimbursementStatus === 'pending').length;
  const totalReimbursedAmount = useMemo(() => {
    return incidents
      .filter(i => i.reimbursementStatus === 'approved' || i.reimbursementStatus === 'paid')
      .reduce((acc, cur) => acc + (Number(cur.reimbursementAmount) || 0), 0);
  }, [incidents]);

  // Filtered List
  const filteredIncidents = incidents.filter(item => {
    if (scenarioFilter !== 'all' && item.scenario !== scenarioFilter) return false;
    if (statusFilter === 'pending') {
      if (item.scenario === 'need_assistance' && item.assistanceStatus === 'resolved') return false;
      if (item.scenario === 'self_resolved' && item.reimbursementStatus !== 'pending') return false;
    }
    if (statusFilter === 'resolved') {
      if (item.scenario === 'need_assistance' && item.assistanceStatus !== 'resolved') return false;
      if (item.scenario === 'self_resolved' && item.reimbursementStatus === 'pending') return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const code = (item.incidentCode || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const loc = (item.location || '').toLowerCase();
      const plate = (item.tripId?.busId?.plateNumber || item.plateNumber || '').toLowerCase();
      const driver = (item.reportedBy?.name || item.driverName || '').toLowerCase();
      const phone = (item.reportedBy?.phone || item.driverPhone || '').toLowerCase();
      return code.includes(q) || title.includes(q) || loc.includes(q) || plate.includes(q) || driver.includes(q) || phone.includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', animation: 'fadeIn 0.25s ease' }}>
      <style>{`
        .ops-box {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .ops-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }
        .ops-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          padding: 10px 12px;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .ops-table td {
          padding: 11px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .ops-table tr:hover td {
          background-color: #f8fafc;
        }
        .filter-tab {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          transition: all 0.15s ease;
        }
        .filter-tab.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
      `}</style>

      {/* Header bar */}
      <div className="ops-box" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
              Tiếp Nhận &amp; Xử Lý Sự Cố Trên Tuyến
            </h1>
            <span style={{
              background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
              padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700'
            }}>
              Quản Lý Vận Tải
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Theo dõi, điều phối cứu hộ phương tiện dọc đường và phê duyệt chi phí hoàn ứng cho tài xế.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          style={{
            padding: '6px 14px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', color: '#334155', cursor: 'pointer'
          }}
        >
          Làm mới
        </button>
      </div>

      {/* Alert Banner if any urgent incident waiting */}
      {urgentCount > 0 && (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecdd3', borderLeft: '4px solid #ef4444',
          borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
        }}>
          <div>
            <strong style={{ color: '#991b1b', fontSize: '0.85rem' }}>
              CẢNH BÁO: CÓ {urgentCount} CHUYẾN XE ĐANG YÊU CẦU CỨU HỘ DỌC ĐƯỜNG
            </strong>
            <div style={{ fontSize: '0.74rem', color: '#b91c1c', marginTop: '2px' }}>
              Tài xế đang dừng xe và chờ Quản lý liên hệ, hỗ trợ tìm người hoặc gara tới hiện trường.
            </div>
          </div>
          <button
            onClick={() => {
              setScenarioFilter('need_assistance');
              setStatusFilter('pending');
            }}
            style={{
              backgroundColor: '#dc2626', color: '#ffffff', border: 'none',
              padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
            }}
          >
            Lọc xe cần cứu hộ
          </button>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div style={{ padding: '0.7rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.78rem', fontWeight: '600' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.7rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.78rem', fontWeight: '600' }}>
          {success}
        </div>
      )}

      {/* 4 KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
        <div className="ops-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Tổng Sự Cố
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
            {totalCount} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>vụ</span>
          </div>
        </div>

        <div className="ops-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>
            Cần Cứu Hộ Khẩn Cấp
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: urgentCount > 0 ? '#dc2626' : '#16a34a' }}>
            {urgentCount} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>chờ điều thợ</span>
          </div>
        </div>

        <div className="ops-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>
            Hoàn Ứng Chờ Duyệt
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: pendingReimburseCount > 0 ? '#d97706' : '#16a34a' }}>
            {pendingReimburseCount} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>đơn</span>
          </div>
        </div>

        <div className="ops-box" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
            Đã Duyệt Hoàn Ứng
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#166534' }}>
            {formatCurrency(totalReimbursedAmount)}
          </div>
        </div>
      </div>

      {/* Main Table Box */}
      <div className="ops-box" style={{ padding: '1rem' }}>
        {/* Controls: Filter tabs, Select status, Search input */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setScenarioFilter('all')}
              className={`filter-tab ${scenarioFilter === 'all' ? 'active' : ''}`}
            >
              Tất cả sự cố ({totalCount})
            </button>
            <button
              onClick={() => setScenarioFilter('need_assistance')}
              className={`filter-tab ${scenarioFilter === 'need_assistance' ? 'active' : ''}`}
            >
              Cần cứu hộ ({incidents.filter(i => i.scenario === 'need_assistance').length})
            </button>
            <button
              onClick={() => setScenarioFilter('self_resolved')}
              className={`filter-tab ${scenarioFilter === 'self_resolved' ? 'active' : ''}`}
            >
              Đề xuất hoàn ứng ({incidents.filter(i => i.scenario === 'self_resolved').length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '5px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="all">Tất cả tiến độ</option>
              <option value="pending">Chưa xử lý xong</option>
              <option value="resolved">Đã hoàn tất</option>
            </select>

            <input
              type="text"
              placeholder="Tìm biển số, tài xế, mã SC, vị trí..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '5px 10px', fontSize: '0.75rem', width: '220px',
                border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Compact Table */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
            Đang tải dữ liệu sự cố trên tuyến...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
            Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ops-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                  <th>Mã sự cố</th>
                  <th>Thời gian</th>
                  <th>Phương tiện &amp; Chuyến</th>
                  <th>Tài xế báo cáo</th>
                  <th>Nghiệp vụ</th>
                  <th>Vị trí sự cố</th>
                  <th>Nội dung tóm tắt</th>
                  <th>Chi phí / Mức độ</th>
                  <th>Tiến độ / Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((item, idx) => {
                  const scBadge = getScenarioBadge(item.scenario);
                  const stBadge = getStatusBadge(item);
                  const plateNumber = item.tripId?.busId?.plateNumber || item.plateNumber || 'N/A';
                  const driverName = item.reportedBy?.name || item.driverName || 'Tài xế';
                  const driverPhone = item.reportedBy?.phone || item.driverPhone || '';
                  const routeLabel = item.tripId?.routeId?.routeName || (item.tripId?.routeId ? `${item.tripId.routeId.startPoint} - ${item.tripId.routeId.endPoint}` : item.tripId?.tripCode || '');

                  return (
                    <tr key={item._id}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1e293b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.incidentCode}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{plateNumber}</div>
                        {routeLabel && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{routeLabel}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{driverName}</div>
                        {driverPhone && <div style={{ fontSize: '0.7rem', color: '#2563eb' }}>{driverPhone}</div>}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                          backgroundColor: scBadge.bg, color: scBadge.color, border: `1px solid ${scBadge.border}`, whiteSpace: 'nowrap'
                        }}>
                          {scBadge.label}
                        </span>
                      </td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={item.location}>
                        {item.location || 'Trên tuyến'}
                      </td>
                      <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }} title={item.title}>
                        {item.title}
                      </td>
                      <td>
                        {item.scenario === 'self_resolved' ? (
                          <strong style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{formatCurrency(item.reimbursementAmount)}</strong>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.75rem' }}>Khẩn cấp</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                          backgroundColor: stBadge.bg, color: stBadge.color, border: `1px solid ${stBadge.border}`, whiteSpace: 'nowrap'
                        }}>
                          {stBadge.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => openDetailModal(item)}
                          style={{
                            padding: '4px 10px', backgroundColor: '#2563eb', color: '#ffffff',
                            border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          Xử lý
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Detail & Action Modal (Hiển thị chi tiết trọn vẹn khi bấm nút Xử lý)       */}
      {/* ========================================================================= */}
      {selectedIncident && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', width: '92%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '800', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {selectedIncident.incidentCode}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                    backgroundColor: getScenarioBadge(selectedIncident.scenario).bg,
                    color: getScenarioBadge(selectedIncident.scenario).color
                  }}>
                    {getScenarioBadge(selectedIncident.scenario).label}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  {selectedIncident.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            {/* Context block: Driver, Phone, Bus, Trip, Location */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px',
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem', marginBottom: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Tài xế:</span>{' '}
                <strong>{selectedIncident.reportedBy?.name || selectedIncident.driverName || 'Tài xế'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Số điện thoại:</span>{' '}
                {(selectedIncident.reportedBy?.phone || selectedIncident.driverPhone) ? (
                  <a
                    href={`tel:${selectedIncident.reportedBy?.phone || selectedIncident.driverPhone}`}
                    style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'none' }}
                  >
                    {selectedIncident.reportedBy?.phone || selectedIncident.driverPhone} (Bấm gọi)
                  </a>
                ) : 'N/A'}
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Phương tiện:</span>{' '}
                <strong>{selectedIncident.tripId?.busId?.plateNumber || selectedIncident.plateNumber || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Tuyến xe:</span>{' '}
                <strong>{selectedIncident.tripId?.routeId?.routeName || (selectedIncident.tripId?.routeId ? `${selectedIncident.tripId.routeId.startPoint} - ${selectedIncident.tripId.routeId.endPoint}` : selectedIncident.tripId?.tripCode || 'N/A')}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#64748b' }}>Vị trí sự cố:</span>{' '}
                <strong style={{ color: '#b91c1c' }}>{selectedIncident.location || 'N/A'}</strong>
              </div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>
                Mô tả chi tiết tình trạng:
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '0.78rem', color: '#334155', lineHeight: '1.4' }}>
                {selectedIncident.details}
              </div>
            </div>

            {/* Photos */}
            {selectedIncident.images && selectedIncident.images.length > 0 && (
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Ảnh hiện trường / Chứng từ hóa đơn ({selectedIncident.images.length}):
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedIncident.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Chứng từ"
                      onClick={() => setPreviewImage(img)}
                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ACTION SECTION: If Cần Cứu Hộ */}
            {selectedIncident.scenario === 'need_assistance' && (
              <form onSubmit={handleSaveAssistance} style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#9f1239', textTransform: 'uppercase' }}>
                  Điều Phối Cứu Viện Sự Cố Khẩn Cấp
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                    Tiến độ xử lý cứu hộ:
                  </label>
                  <select
                    value={assistanceStatusInput}
                    onChange={e => setAssistanceStatusInput(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="contacted">Đã liên hệ tài xế (Đang tìm thợ / gara gần đó)</option>
                    <option value="dispatched">Đã điều thợ / gara tới hiện trường sửa chữa</option>
                    <option value="resolved">Đã khắc phục xong (Xe tiếp tục hành trình)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                    Ghi chú chỉ đạo tài xế / Thông tin thợ hỗ trợ:
                  </label>
                  <textarea
                    rows="2"
                    placeholder="VD: Đã liên hệ anh Hùng gara lưu động km 42, 15 phút nữa có mặt..."
                    value={assistanceNotesInput}
                    onChange={e => setAssistanceNotesInput(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    disabled={submittingAssistance}
                    style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAssistance}
                    style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '800', border: 'none', borderRadius: '6px', backgroundColor: '#dc2626', color: '#ffffff', cursor: 'pointer' }}
                  >
                    {submittingAssistance ? 'Đang lưu...' : 'Lưu Tiến Độ Cứu Hộ'}
                  </button>
                </div>
              </form>
            )}

            {/* ACTION SECTION: If Xin Hoàn Ứng */}
            {selectedIncident.scenario === 'self_resolved' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                    Đề xuất hoàn ứng chi phí:
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: '#b91c1c' }}>
                    {formatCurrency(selectedIncident.reimbursementAmount)}
                  </strong>
                </div>

                {selectedIncident.reimbursementStatus === 'pending' ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="action"
                          value="approved"
                          checked={reimburseAction === 'approved'}
                          onChange={() => setReimburseAction('approved')}
                        />
                        Chấp thuận hoàn tiền
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="action"
                          value="rejected"
                          checked={reimburseAction === 'rejected'}
                          onChange={() => setReimburseAction('rejected')}
                        />
                        Từ chối hoàn tiền
                      </label>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                        Ý kiến chỉ đạo / Lý do:
                      </label>
                      <textarea
                        rows="2"
                        placeholder="Nhập ghi chú duyệt hoàn ứng cho tài xế..."
                        value={reimburseNoteInput}
                        onChange={e => setReimburseNoteInput(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedIncident(null)}
                        disabled={submittingReimburse}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReimbursement()}
                        disabled={submittingReimburse}
                        style={{
                          padding: '6px 14px', fontSize: '0.75rem', fontWeight: '800', border: 'none', borderRadius: '6px',
                          backgroundColor: reimburseAction === 'approved' ? '#16a34a' : '#dc2626', color: '#ffffff', cursor: 'pointer'
                        }}
                      >
                        {submittingReimburse ? 'Đang lưu...' : reimburseAction === 'approved' ? 'Xác Nhận Duyệt' : 'Xác Nhận Từ Chối'}
                      </button>
                    </div>
                  </>
                ) : selectedIncident.reimbursementStatus === 'approved' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                      Quản lý đã duyệt hoàn ứng. Khoản tiền <strong>{formatCurrency(selectedIncident.reimbursementAmount)}</strong> này đã được hệ thống tự động kết chuyển và cộng trực tiếp vào bảng lương tháng này của tài xế.
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: selectedIncident.reimbursementStatus === 'paid' ? '#6b21a8' : '#b91c1c', fontWeight: '700' }}>
                    {selectedIncident.reimbursementStatus === 'paid' ? 'Đã chi trả tiền hoàn ứng cho tài xế hoàn tất.' : 'Đã từ chối đề xuất hoàn ứng chi phí này.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Image Modal */}
      {previewImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300
        }}>
          <div style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
            <img src={previewImage} alt="Chứng từ preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px' }} />
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                onClick={() => setPreviewImage(null)}
                style={{ padding: '6px 16px', background: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
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

export default OpsIncidentsPage;
