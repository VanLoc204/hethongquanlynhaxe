import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api/v1';

const getSeverityBadge = (sev) => {
  switch (sev) {
    case 'urgent':
      return { label: 'KHẨN CẤP (URGENT)', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
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
      return { label: 'MỚI TIẾP NHẬN', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'processing':
      return { label: 'ĐANG XỬ LÝ', bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    case 'resolved':
      return { label: 'ĐÃ KHẮC PHỤC', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    case 'closed':
      return { label: 'ĐÃ ĐÓNG SỰ CỐ', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    default:
      return { label: st || 'Chưa rõ', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }
};

const TicketIncidentsPage = () => {
  const { token, user } = useContext(AuthContext);

  const managerBranchId = user?.branch?.branchId || 'sg';
  const branchInfo = managerBranchId ? getBranchById(managerBranchId) : null;
  const branchName = branchInfo?.branchName || user?.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh';

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal tạo sự cố khẩn cấp (khi Quản lý muốn tự ghi nhận)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    category: 'equipment',
    severity: 'medium',
    location: 'Văn phòng Sài Gòn (BXMĐ)',
    counterNumber: 'Quầy 01',
    details: '',
    initialAction: '',
    estimatedCost: ''
  });

  // Modal tiếp nhận và chỉ đạo xử lý sự cố
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('processing');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateCost, setUpdateCost] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Nạp danh sách sự cố
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (managerBranchId) params.append('branchId', managerBranchId);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (staffFilter !== 'all') params.append('reportedBy', staffFilter);

      const res = await fetch(`${API_BASE}/users/ticket-manager/incidents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIncidents(data.incidents || []);
      } else {
        showToast(data.message || 'Không thể tải danh sách sự cố.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải danh sách sự cố.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchIncidents();
    }
  }, [token, statusFilter, categoryFilter, severityFilter, staffFilter]);

  // Danh sách các nhân viên có báo cáo sự cố để lọc
  const staffList = useMemo(() => {
    const map = new Map();
    incidents.forEach(i => {
      if (i.reportedBy && i.reportedBy._id) {
        map.set(i.reportedBy._id, i.reportedBy.name || 'Nhân viên');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [incidents]);

  // Xử lý tạo mới sự cố nội bộ
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      const res = await fetch(`${API_BASE}/users/ticket-manager/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newIncident,
          branchId: managerBranchId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Ghi nhận sự cố thành công!');
        setShowCreateModal(false);
        setNewIncident({
          title: '', category: 'equipment', severity: 'medium',
          location: 'Văn phòng Sài Gòn (BXMĐ)', counterNumber: 'Quầy 01',
          details: '', initialAction: '', estimatedCost: ''
        });
        fetchIncidents();
      } else {
        showToast(data.message || 'Không thể tạo sự cố.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Xử lý cập nhật tiến độ xử lý & gửi chỉ đạo cho nhân viên
  const handleUpdateIncident = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setSubmittingUpdate(true);
    try {
      const res = await fetch(`${API_BASE}/users/ticket-manager/incidents/${selectedIncident._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: updateStatus,
          resolutionNotes: updateNotes,
          estimatedCost: updateCost ? Number(updateCost) : selectedIncident.estimatedCost
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã lưu chỉ đạo & cập nhật tiến độ xử lý sự cố thành công!');
        setSelectedIncident(null);
        fetchIncidents();
      } else {
        showToast(data.message || 'Không thể cập nhật sự cố.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    let openCount = 0;
    let procCount = 0;
    let resolvedCount = 0;
    let urgentCount = 0;

    incidents.forEach(i => {
      if (i.status === 'open') openCount++;
      if (i.status === 'processing') procCount++;
      if (i.status === 'resolved' || i.status === 'closed') resolvedCount++;
      if (i.severity === 'urgent') urgentCount++;
    });

    return {
      total: incidents.length,
      pending: openCount + procCount,
      resolved: resolvedCount,
      urgent: urgentCount,
      openCount
    };
  }, [incidents]);

  // Lọc theo từ khóa tìm kiếm
  const filteredIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    const q = searchQuery.toLowerCase().trim();
    return incidents.filter(i =>
      (i.incidentCode && i.incidentCode.toLowerCase().includes(q)) ||
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.location && i.location.toLowerCase().includes(q)) ||
      (i.counterNumber && i.counterNumber.toLowerCase().includes(q)) ||
      (i.reportedBy?.name && i.reportedBy.name.toLowerCase().includes(q)) ||
      (i.details && i.details.toLowerCase().includes(q)) ||
      (i.resolutionNotes && i.resolutionNotes.toLowerCase().includes(q))
    );
  }, [incidents, searchQuery]);

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

      {/* Header Panel */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Tiếp Nhận & Xử Lý Sự Cố Phòng Vé
              </h1>
              <span style={{ fontSize: '0.74rem', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                {branchName}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '6px 0 0 0' }}>
              Tiếp nhận các báo cáo sự cố kỹ thuật máy in/POS, mạng internet, tiền két và khiếu nại khách hàng do <strong>Nhân viên bán vé chi nhánh gửi lên</strong> để Quản lý chỉ đạo giải quyết.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                fontWeight: '700', padding: '0.6rem 1.15rem', borderRadius: '8px', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ghi Nhận Sự Cố Nội Bộ
            </button>
            <button
              onClick={() => { fetchIncidents(); showToast('Đã làm mới danh sách sự cố tiếp nhận!'); }}
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Làm Mới Dữ Liệu
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TỔNG SỰ CỐ TIẾP NHẬN</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {stats.total}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vụ</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap' }}>Nhân viên bán vé gửi báo cáo tại {branchName}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>ĐANG XỬ LÝ / CHỜ CHỈ ĐẠO</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d97706', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {stats.pending}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>sự cố</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: '600', whiteSpace: 'nowrap' }}>
            {stats.openCount > 0 ? `${stats.openCount} sự cố mới gửi cần chỉ đạo ngay` : 'Đang phối hợp khắc phục'}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>ĐÃ KHẮC PHỤC HOÀN TẤT</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {stats.resolved}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vụ</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Tỷ lệ xử lý đạt {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 100}%
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>MỨC ĐỘ KHẨN CẤP (URGENT)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: stats.urgent > 0 ? '#dc2626' : '#0f172a', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {stats.urgent}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vụ</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: stats.urgent > 0 ? '#dc2626' : '#64748b', fontWeight: stats.urgent > 0 ? '700' : 'normal', whiteSpace: 'nowrap' }}>
            {stats.urgent > 0 ? 'Yêu cầu Quản lý can thiệp ngay!' : 'Các quầy vé hoạt động ổn định'}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              TRẠNG THÁI TIẾP NHẬN:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Mới tiếp nhận (Chờ chỉ đạo)</option>
              <option value="processing">Đang xử lý / Khắc phục</option>
              <option value="resolved">Đã khắc phục hoàn tất</option>
              <option value="closed">Đã đóng sự cố</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              PHÂN LOẠI SỰ CỐ:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả phân loại</option>
              <option value="equipment">Thiết bị & Máy in/POS</option>
              <option value="network">Mạng truyền tải & Phần mềm</option>
              <option value="fund">Quỹ két & Tiền mặt</option>
              <option value="service">Dịch vụ & Khiếu nại khách</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              MỨC ĐỘ KHẨN:
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả mức độ</option>
              <option value="urgent">Khẩn cấp (Urgent)</option>
              <option value="high">Mức cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Mức thấp</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              NHÂN VIÊN BÁO CÁO:
            </label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả nhân viên ({staffList.length})</option>
              {staffList.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              TÌM KIẾM SỰ CỐ:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm mã SC, tiêu đề, quầy vé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.85rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b', fontSize: '0.85rem' }}>
            Đang tải dữ liệu sự cố phòng vé từ máy chủ...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Không tìm thấy sự cố phòng vé nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Mã sự cố</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Nhân viên gửi báo cáo</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Vị trí / Quầy vé</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Tiêu đề & Phân loại sự cố</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Mức độ</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Thời gian gửi</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Chỉ đạo của Quản lý chi nhánh</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc, idx) => {
                  const sBadge = getSeverityBadge(inc.severity);
                  const stBadge = getStatusBadge(inc.status);
                  const dateStr = inc.createdAt ? new Date(inc.createdAt).toLocaleString('vi-VN') : '--';
                  const reporterInitial = inc.reportedBy?.name ? inc.reportedBy.name.charAt(0).toUpperCase() : 'N';

                  return (
                    <tr key={inc._id} style={{ borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                        {inc.incidentCode}
                      </td>

                      {/* Nhân viên gửi báo cáo */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff',
                            color: '#2563eb', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', border: '1px solid #bfdbfe'
                          }}>
                            {reporterInitial}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{inc.reportedBy?.name || 'Nhân viên'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{inc.reportedBy?.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Vị trí quầy vé */}
                      <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        <div>{inc.location}</div>
                        {inc.counterNumber && (
                          <span style={{ fontSize: '0.7rem', color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            {inc.counterNumber}
                          </span>
                        )}
                      </td>

                      {/* Tiêu đề & phân loại */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden' }}>{inc.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{getCategoryLabel(inc.category)}</div>
                      </td>

                      {/* Mức độ */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: sBadge.bg, color: sBadge.color, border: `1px solid ${sBadge.border}`,
                          padding: '3px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800',
                          whiteSpace: 'nowrap', display: 'inline-block'
                        }}>
                          {sBadge.label}
                        </span>
                      </td>

                      {/* Thời gian */}
                      <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{dateStr}</td>

                      {/* Trạng thái */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: stBadge.bg, color: stBadge.color, border: `1px solid ${stBadge.border}`,
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700',
                          whiteSpace: 'nowrap', display: 'inline-block'
                        }}>
                          {stBadge.label}
                        </span>
                      </td>

                      {/* Chỉ đạo của Quản lý */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                        {inc.resolutionNotes ? (
                          <div style={{ fontSize: '0.73rem', color: '#047857', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            ✓ {inc.resolutionNotes}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#d97706', fontStyle: 'italic' }}>
                            Chờ Quản lý chỉ đạo phương án...
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => {
                            setSelectedIncident(inc);
                            setUpdateStatus(inc.status === 'open' ? 'processing' : inc.status);
                            setUpdateNotes(inc.resolutionNotes || '');
                            setUpdateCost(inc.estimatedCost || '');
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                            border: '1px solid #bfdbfe', background: '#2563eb', color: '#ffffff', cursor: 'pointer',
                            whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                          }}
                        >
                          Tiếp Nhận & Chỉ Đạo
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

      {/* Modal Quản lý ghi nhận sự cố nội bộ */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '580px', width: '100%',
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Ghi Nhận Sự Cố Nội Bộ Tại {branchName}
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateIncident} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Tiêu đề tóm tắt sự cố *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy in vé quầy 01 bị kẹt phôi vé liên tục..."
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Phân loại sự cố *
                  </label>
                  <select
                    value={newIncident.category}
                    onChange={(e) => setNewIncident({ ...newIncident, category: e.target.value })}
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
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                  >
                    <option value="urgent">Khẩn cấp (Ngưng bán vé)</option>
                    <option value="high">Mức cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Mức thấp</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Vị trí xảy ra *
                  </label>
                  <input
                    type="text"
                    required
                    value={newIncident.location}
                    onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Quầy vé cụ thể
                  </label>
                  <input
                    type="text"
                    value={newIncident.counterNumber}
                    onChange={(e) => setNewIncident({ ...newIncident, counterNumber: e.target.value })}
                    placeholder="Quầy 01, Quầy 02..."
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Mô tả chi tiết sự cố *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Mô tả cụ thể hiện tượng xảy ra và ảnh hưởng đến quầy..."
                  value={newIncident.details}
                  onChange={(e) => setNewIncident({ ...newIncident, details: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Biện pháp ứng phó tạm thời
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyển khách sang Quầy 02 in vé..."
                  value={newIncident.initialAction}
                  onChange={(e) => setNewIncident({ ...newIncident, initialAction: e.target.value })}
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
                  disabled={submittingCreate}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {submittingCreate ? 'Đang lưu...' : 'Lưu Sự Cố'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tiếp Nhận & Chỉ Đạo Phương Án Khắc Phục */}
      {selectedIncident && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '620px', width: '100%',
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Tiếp Nhận & Chỉ Đạo Xử Lý Sự Cố: {selectedIncident.incidentCode}
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  {selectedIncident.title} • {selectedIncident.location}
                </div>
              </div>
              <button onClick={() => setSelectedIncident(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}>✕</button>
            </div>

            {/* Thông tin nhân viên báo cáo */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                <div>
                  Nhân viên gửi báo cáo: <strong style={{ color: '#1d4ed8' }}>{selectedIncident.reportedBy?.name || 'Nhân viên bán vé'}</strong> ({selectedIncident.reportedBy?.phone})
                </div>
                <div style={{ color: '#64748b' }}>
                  {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString('vi-VN') : ''}
                </div>
              </div>

              <div><strong>Hiện tượng chi tiết:</strong> {selectedIncident.details}</div>
              {selectedIncident.initialAction && (
                <div style={{ marginTop: '6px', color: '#0369a1' }}>
                  <strong>Xử lý tạm thời tại quầy:</strong> {selectedIncident.initialAction}
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateIncident} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Cập nhật trạng thái xử lý *
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                >
                  <option value="open">Mới tiếp nhận (Chưa có chỉ đạo)</option>
                  <option value="processing">Đang phối hợp xử lý / Hướng dẫn quầy vé</option>
                  <option value="resolved">Đã khắc phục hoàn tất</option>
                  <option value="closed">Đã đóng sự cố và bàn giao</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Chỉ đạo / Phương án giải quyết của Quản lý chi nhánh *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Ghi rõ hướng dẫn xử lý cho nhân viên, phương án thay thế thiết bị hoặc kỹ thuật hỗ trợ..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Chi phí thực tế phát sinh (VNĐ nếu có)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={updateCost}
                  onChange={(e) => setUpdateCost(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingUpdate}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {submittingUpdate ? 'Đang lưu...' : 'Lưu Chỉ Đạo & Cập Nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketIncidentsPage;
