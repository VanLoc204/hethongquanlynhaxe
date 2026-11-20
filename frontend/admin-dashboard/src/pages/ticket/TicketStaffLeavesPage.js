import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api';

const STATUS_MAP = {
  pending: { label: 'Chờ duyệt', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  approved: { label: 'Đã duyệt', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  rejected: { label: 'Từ chối', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

const TicketStaffLeavesPage = () => {
  const { token, user } = useContext(AuthContext);

  const managerBranchId = user?.branch?.branchId;
  const branchInfo = managerBranchId ? getBranchById(managerBranchId) : null;

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Reject Modal
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: null, employeeName: '', note: '' });
  const [processingId, setProcessingId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/admin/leaves`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves || []);
      } else {
        showToast(data.message || 'Không thể tải danh sách đơn nghỉ.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi tải danh sách đơn nghỉ phép.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchLeaves();
  }, [token, fetchLeaves]);

  const handleApprove = async (leaveId) => {
    if (!window.confirm('Bạn có chắc chắn muốn phê duyệt đơn xin nghỉ phép này không?')) return;
    setProcessingId(leaveId);
    try {
      const res = await fetch(`${API_BASE}/users/admin/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved', reviewNote: 'Quản lý phòng vé đã chấp thuận.' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Phê duyệt đơn xin nghỉ phép thành công!');
        fetchLeaves();
      } else {
        showToast(data.message || 'Phê duyệt thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi duyệt đơn.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (leave) => {
    setRejectModal({
      show: true,
      leaveId: leave._id,
      employeeName: leave.userId?.name || 'Nhân viên',
      note: ''
    });
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModal.note.trim()) {
      showToast('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }

    setProcessingId(rejectModal.leaveId);
    try {
      const res = await fetch(`${API_BASE}/users/admin/leaves/${rejectModal.leaveId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected', reviewNote: rejectModal.note.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã từ chối đơn xin nghỉ phép.');
        setRejectModal({ show: false, leaveId: null, employeeName: '', note: '' });
        fetchLeaves();
      } else {
        showToast(data.message || 'Thao tác thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi từ chối đơn.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredLeaves = leaves.filter(l => {
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    const matchesSearch = !searchTerm.trim() ||
      (l.userId?.name && l.userId.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.userId?.phone && l.userId.phone.includes(searchTerm)) ||
      (l.reason && l.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '10px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700',
          color: '#ffffff', backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Top Banner Card wrapping Header & Stat Cards */}
      <div style={{
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Duyệt Đơn Nghỉ Phép Nhân Viên Bán Vé
              </h1>
              {branchInfo ? (
                <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700', border: '1px solid #bfdbfe' }}>
                  {branchInfo.branchName}
                </span>
              ) : null}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Tiếp nhận, kiểm tra quân số trực quầy và phê duyệt đơn xin nghỉ phép của nhân sự quầy vé thuộc chi nhánh
            </p>
          </div>
          <button
            onClick={fetchLeaves}
            className="btn"
            style={{
              backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
              fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
            Làm mới danh sách
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TỔNG ĐƠN ĐÃ GỬI</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '2px 0' }}>{leaves.length}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Đơn xin nghỉ từ nhân viên quầy</div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>CHỜ PHÊ DUYỆT</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: pendingCount > 0 ? '#b45309' : '#0f172a', margin: '2px 0' }}>{pendingCount}</div>
            <div style={{ fontSize: '0.68rem', color: pendingCount > 0 ? '#b45309' : '#64748b', fontWeight: pendingCount > 0 ? '700' : 'normal' }}>
              {pendingCount > 0 ? 'Cần xử lý sớm' : 'Đã xử lý toàn bộ'}
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>ĐÃ CHẤP THUẬN</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#16a34a', margin: '2px 0' }}>{approvedCount}</div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a' }}>Đã cập nhật vào lịch trực</div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>ĐÃ TỪ CHỐI</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#dc2626', margin: '2px 0' }}>{rejectedCount}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Không đáp ứng quân số trực</div>
          </div>
        </div>

        {/* Counter Coverage Tip */}
        <div style={{
          padding: '0.65rem 0.9rem', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#1e40af'
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>
            <strong>Lưu ý nghiệp vụ:</strong> Hãy kiểm tra lịch phân ca ngày dự kiến nghỉ để đảm bảo luôn có tối thiểu <strong>2 nhân viên</strong> túc trực tại mỗi điểm quầy vé trong các khung giờ cao điểm.
          </span>
        </div>
      </div>

      {/* Filter Bar & Table Panel */}
      <div className="panel" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 260px' }}>
            <input
              type="text"
              placeholder="Tìm theo tên nhân viên, SĐT, lý do nghỉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả ({leaves.length})</option>
              <option value="pending">Chờ duyệt ({pendingCount})</option>
              <option value="approved">Đã duyệt ({approvedCount})</option>
              <option value="rejected">Từ chối ({rejectedCount})</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem' }}>Đang tải danh sách đơn nghỉ...</div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Không có đơn xin nghỉ phép nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '10px 12px' }}>STT</th>
                  <th style={{ padding: '10px 12px' }}>Nhân viên</th>
                  <th style={{ padding: '10px 12px' }}>Thời gian nghỉ</th>
                  <th style={{ padding: '10px 12px' }}>Số ngày</th>
                  <th style={{ padding: '10px 12px' }}>Lý do xin nghỉ</th>
                  <th style={{ padding: '10px 12px' }}>Ngày nộp</th>
                  <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((l, index) => {
                  const statusConf = STATUS_MAP[l.status] || STATUS_MAP.pending;
                  const isPending = l.status === 'pending';

                  let daysCount = 1;
                  if (l.startDate && l.endDate) {
                    const diffTime = Math.abs(new Date(l.endDate) - new Date(l.startDate));
                    daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  }

                  return (
                    <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{l.userId?.name || 'Nhân viên'}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{l.userId?.phone}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ color: '#334155', fontWeight: '600' }}>
                          {l.startDate ? new Date(l.startDate).toLocaleDateString('vi-VN') : '—'} &rarr; {l.endDate ? new Date(l.endDate).toLocaleDateString('vi-VN') : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#0f172a' }}>
                        {daysCount} ngày
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: '280px', color: '#475569' }}>
                        <div>{l.reason || l.details}</div>
                        {l.details && l.details.includes('[Phản hồi QL:') && (
                          <div style={{ fontSize: '0.68rem', color: '#2563eb', marginTop: '2px', fontWeight: '600' }}>
                            {l.details.substring(l.details.indexOf('[Phản hồi QL:'))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.72rem' }}>
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.border}`,
                          padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700'
                        }}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => handleApprove(l._id)}
                              disabled={processingId === l._id}
                              style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700',
                                border: 'none', background: '#10b981', color: '#ffffff', cursor: 'pointer'
                              }}
                            >
                              Phê duyệt
                            </button>
                            <button
                              onClick={() => handleOpenReject(l)}
                              disabled={processingId === l._id}
                              style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700',
                                border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer'
                              }}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Đã xử lý</span>
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

      {/* Reject Modal */}
      {rejectModal.show && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '420px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Từ Chối Đơn Xin Nghỉ Phép
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Nhân viên: <strong style={{ color: '#0f172a' }}>{rejectModal.employeeName}</strong>
            </p>

            <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Lý do từ chối *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectModal.note}
                  onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
                  placeholder="Ví dụ: Thiếu nhân sự bán vé quầy trong dịp cao điểm cuối tuần..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRejectModal({ show: false, leaveId: null, employeeName: '', note: '' })}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={processingId !== null}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {processingId !== null ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketStaffLeavesPage;
