import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api/v1';

const getSeverityBadge = (sev) => {
  switch (sev) {
    case 'urgent':
      return { label: 'KHẨN CẤP', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    case 'high':
      return { label: 'MỨC CAO', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'medium':
      return { label: 'TRUNG BÌNH', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
    default:
      return { label: 'MỨC THẤP', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  }
};

const getCategoryLabel = (cat) => {
  switch (cat) {
    case 'equipment': return 'Thiết bị & Máy in/POS';
    case 'network': return 'Mạng truyền tải & Phần mềm';
    case 'fund': return 'Quỹ két & Tiền mặt';
    case 'service': return 'Dịch vụ & Khiếu nại khách';
    default: return 'Khác';
  }
};

const getStatusBadge = (st) => {
  switch (st) {
    case 'open':
      return { label: 'ĐÃ GỬI (CHỜ QUẢN LÝ TIẾP NHẬN)', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'processing':
      return { label: 'QUẢN LÝ ĐANG XỬ LÝ', bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    case 'resolved':
      return { label: 'ĐÃ ĐƯỢC KHẮC PHỤC', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    case 'closed':
      return { label: 'ĐÃ ĐÓNG SỰ CỐ', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    default:
      return { label: st || 'Chưa rõ', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
};

const AgentIncidentPage = () => {
  const { token, user } = useContext(AuthContext);

  const agentBranchId = user?.branch?.branchId || 'sg';
  const branchInfo = agentBranchId ? getBranchById(agentBranchId) : null;
  const branchName = branchInfo?.branchName || user?.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh';

  const defaultLocation = (user?.branch?.assignedOffices && user.branch.assignedOffices[0]) || 'Quầy vé Bến xe Miền Đông';

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form gửi sự cố
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'equipment',
    severity: 'medium',
    location: defaultLocation,
    counterNumber: 'Quầy 01',
    details: '',
    initialAction: ''
  });

  // Modal xem chi tiết chỉ đạo
  const [selectedIncident, setSelectedIncident] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMyIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/ticket-manager/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIncidents(data.incidents || []);
      } else {
        showToast(data.message || 'Không thể tải lịch sử sự cố.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải danh sách sự cố.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMyIncidents();
  }, [token]);

  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users/ticket-manager/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          branchId: agentBranchId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã gửi báo cáo sự cố thành công cho Quản lý chi nhánh!');
        setShowCreateModal(false);
        setFormData({
          title: '', category: 'equipment', severity: 'medium',
          location: defaultLocation, counterNumber: 'Quầy 01',
          details: '', initialAction: ''
        });
        fetchMyIncidents();
      } else {
        showToast(data.message || 'Không thể gửi báo cáo sự cố.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    let pending = 0;
    let resolved = 0;
    incidents.forEach(i => {
      if (i.status === 'open' || i.status === 'processing') pending++;
      if (i.status === 'resolved' || i.status === 'closed') resolved++;
    });
    return { total: incidents.length, pending, resolved };
  }, [incidents]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#ffffff',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Báo Cáo Sự Cố Cho Quản Lý Phòng Vé
              </h1>
              <span style={{ fontSize: '0.74rem', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                {branchName}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '6px 0 0 0' }}>
              Gửi trực tiếp báo cáo sự cố máy in vé, máy quẹt thẻ POS, rớt mạng hoặc khiếu nại tại quầy lên <strong>Quản lý phòng vé chi nhánh ({branchName})</strong> để được chỉ đạo xử lý kịp thời.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: '#dc2626', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.65rem 1.35rem', borderRadius: '8px', fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(220,38,38,0.25)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Gửi Báo Cáo Sự Cố Mới
            </button>
            <button
              onClick={() => { fetchMyIncidents(); showToast('Đã làm mới danh sách!'); }}
              style={{
                backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569',
                fontWeight: '700', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Làm Mới
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TỔNG SỰ CỐ BẠN ĐÃ GỬI</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {stats.total}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vụ</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap' }}>Đã gửi đến Quản lý {branchName}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>QUẢN LÝ ĐANG XỬ LÝ</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d97706', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {stats.pending}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>sự cố</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: '600', whiteSpace: 'nowrap' }}>Đang chờ Quản lý duyệt & chỉ đạo</div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>ĐÃ KHẮC PHỤC XONG</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {stats.resolved}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vụ</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap' }}>Đã hoàn tất khắc phục và bàn giao</div>
        </div>
      </div>

      {/* Danh sách sự cố */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1rem 0' }}>
          Lịch Sử Báo Cáo Sự Cố & Chỉ Đạo Từ Quản Lý
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem' }}>
            Đang tải dữ liệu sự cố của bạn...
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Bạn chưa gửi báo cáo sự cố nào. Quầy vé hiện đang vận hành bình thường!
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Mã sự cố</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Vị trí / Quầy</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Tiêu đề sự cố</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Mức độ</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Thời gian gửi</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Chỉ đạo của Quản lý chi nhánh</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc, idx) => {
                  const sBadge = getSeverityBadge(inc.severity);
                  const stBadge = getStatusBadge(inc.status);
                  const dateStr = inc.createdAt ? new Date(inc.createdAt).toLocaleString('vi-VN') : '--';

                  return (
                    <tr key={inc._id} style={{ borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: '#2563eb', whiteSpace: 'nowrap' }}>
                        {inc.incidentCode}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {inc.location} {inc.counterNumber ? `(${inc.counterNumber})` : ''}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden' }}>{inc.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{getCategoryLabel(inc.category)}</div>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: sBadge.bg, color: sBadge.color, border: `1px solid ${sBadge.border}`,
                          padding: '3px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800',
                          whiteSpace: 'nowrap', display: 'inline-block'
                        }}>
                          {sBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{dateStr}</td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: stBadge.bg, color: stBadge.color, border: `1px solid ${stBadge.border}`,
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700',
                          whiteSpace: 'nowrap', display: 'inline-block'
                        }}>
                          {stBadge.label}
                        </span>
                      </td>

                      {/* Chỉ đạo từ Quản lý */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        {inc.resolutionNotes ? (
                          <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: '600', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                            ✓ Quản lý: {inc.resolutionNotes}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#d97706', fontStyle: 'italic' }}>
                            Đang chờ Quản lý chi nhánh tiếp nhận & chỉ đạo...
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          style={{
                            padding: '5px 12px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '700',
                            border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Xem chi tiết
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

      {/* Modal Gửi Sự Cố Cho Quản Lý */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '560px', width: '100%',
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Gửi Báo Cáo Sự Cố Cho Quản Lý Chi Nhánh
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}>✕</button>
            </div>

            <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1rem', fontSize: '0.78rem', color: '#1e40af' }}>
              Báo cáo sẽ được chuyển thẳng đến <strong>Quản lý phòng vé chi nhánh ({branchName})</strong> để tiếp nhận và chỉ đạo phương án hỗ trợ ngay.
            </div>

            <form onSubmit={handleSubmitIncident} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Tiêu đề tóm tắt sự cố *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy in quầy 01 kẹt phôi vé, không nhả cuống..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Phân loại sự cố *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                  >
                    <option value="equipment">Thiết bị & Máy in/POS</option>
                    <option value="network">Mạng truyền tải & Phần mềm</option>
                    <option value="fund">Quỹ két & Tiền mặt</option>
                    <option value="service">Dịch vụ & Khiếu nại khách</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Mức độ nghiêm trọng *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                  >
                    <option value="urgent">Khẩn cấp (Ngưng bán vé)</option>
                    <option value="high">Mức cao (Cần xử lý gấp)</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Mức thấp</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Vị trí làm việc *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Số quầy vé
                  </label>
                  <input
                    type="text"
                    value={formData.counterNumber}
                    onChange={(e) => setFormData({ ...formData, counterNumber: e.target.value })}
                    placeholder="Quầy 01, Quầy 02..."
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Mô tả chi tiết sự cố đang xảy ra *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Mô tả cụ thể hiện tượng gì, máy báo lỗi gì, khách có đang chờ đông không..."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Xử lý tạm thời tại quầy (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Em đã chuyển khách sang quầy bên cạnh in tạm..."
                  value={formData.initialAction}
                  onChange={(e) => setFormData({ ...formData, initialAction: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi Báo Cáo Cho Quản Lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Báo Cáo */}
      {selectedIncident && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '560px', width: '100%',
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Chi Tiết Sự Cố: {selectedIncident.incidentCode}
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  {selectedIncident.title}
                </div>
              </div>
              <button onClick={() => setSelectedIncident(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem', color: '#334155' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <div><strong>Vị trí / Quầy:</strong> {selectedIncident.location} ({selectedIncident.counterNumber})</div>
                <div><strong>Mức độ:</strong> {selectedIncident.severity}</div>
                <div><strong>Thời gian gửi:</strong> {new Date(selectedIncident.createdAt).toLocaleString('vi-VN')}</div>
                <div><strong>Trạng thái:</strong> {getStatusBadge(selectedIncident.status).label}</div>
              </div>

              <div>
                <strong>Chi tiết sự cố đã báo:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{selectedIncident.details}</p>
              </div>

              {selectedIncident.initialAction && (
                <div>
                  <strong>Xử lý tạm thời:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{selectedIncident.initialAction}</p>
                </div>
              )}

              {/* Chỉ đạo của Quản lý */}
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 14px', borderRadius: '10px' }}>
                <strong style={{ color: '#065f46', display: 'block', marginBottom: '4px' }}>
                  Chỉ đạo / Phương án xử lý của Quản lý chi nhánh:
                </strong>
                <p style={{ margin: 0, color: '#047857', fontWeight: '600' }}>
                  {selectedIncident.resolutionNotes || 'Quản lý đang xem xét và sẽ gửi chỉ đạo xử lý sớm nhất.'}
                </p>
                {selectedIncident.resolvedAt && (
                  <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '6px' }}>
                    Thời gian duyệt: {new Date(selectedIncident.resolvedAt).toLocaleString('vi-VN')}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
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

export default AgentIncidentPage;

