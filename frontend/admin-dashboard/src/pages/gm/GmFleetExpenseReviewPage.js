import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import MonthlyFleetExpenseReportModal from '../../components/MonthlyFleetExpenseReportModal';

const API_BASE = 'http://localhost:8000/api';

const formatCurrency = (val) => {
  return (val || 0).toLocaleString('vi-VN') + ' đ';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '--/--/----';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const GmFleetExpenseReviewPage = () => {
  const { token, user } = useContext(AuthContext);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [selectedYear, setSelectedYear] = useState(2026);

  // Modal Chi Tiết & Ký Duyệt
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/trips/fleet-expense-reports?year=${selectedYear}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.reports || []);
      } else {
        setError(data.message || 'Không thể tải danh sách báo cáo chi tiêu.');
      }
    } catch (err) {
      console.error('fetchReports error:', err);
      setError('Lỗi kết nối máy chủ khi lấy danh sách báo cáo chi tiêu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token, statusFilter, selectedYear]);

  // Giám đốc Phê Duyệt & Ký Số
  const handleApprove = async (directorNotes) => {
    if (!selectedReport) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/trips/fleet-expense-reports/${selectedReport._id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ directorNotes })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Đã phê duyệt và ký số báo cáo chi tiêu ${selectedReport.reportCode} thành công!`);
        setModalOpen(false);
        fetchReports();
      } else {
        alert(data.message || 'Lỗi phê duyệt báo cáo.');
      }
    } catch (err) {
      console.error('handleApprove error:', err);
      alert('Lỗi máy chủ khi phê duyệt báo cáo.');
    } finally {
      setActionLoading(false);
    }
  };

  // Giám đốc Từ Chối / Yêu Cầu Giải Trình
  const handleReject = async (rejectionReason) => {
    if (!selectedReport) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/trips/fleet-expense-reports/${selectedReport._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rejectionReason })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Đã gửi yêu cầu hiệu chỉnh báo cáo ${selectedReport.reportCode}.`);
        setModalOpen(false);
        fetchReports();
      } else {
        alert(data.message || 'Lỗi khi từ chối báo cáo.');
      }
    } catch (err) {
      console.error('handleReject error:', err);
      alert('Lỗi máy chủ khi từ chối báo cáo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setModalOpen(true);
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div style={{ padding: '24px 28px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'inherit' }}>
      {/* Toast thông báo */}
      {success && (
        <div style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', fontSize: '0.85rem' }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', fontWeight: '700', fontSize: '0.85rem' }}>
          ✕ {error}
        </div>
      )}

      {/* Header Giám Đốc Phê Duyệt */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Phê Duyệt Báo Cáo Chi Tiêu &amp; Quyết Toán Đội Xe
            </h1>
            <span style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', fontSize: '0.72rem', fontWeight: '800', padding: '2px 10px', borderRadius: '20px' }}>
              BAN GIÁM ĐỐC
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Kiểm tra đối soát hóa đơn gara sửa chữa, định mức tiêu thụ dầu Diesel và phê duyệt ngân sách đội xe hàng tháng
          </p>
        </div>

        {/* Bộ lọc trạng thái & Năm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ phê duyệt ({pendingCount})</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="rejected">Yêu cầu giải trình</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}
          >
            <option value={2025}>Năm 2025</option>
            <option value={2026}>Năm 2026</option>
            <option value={2027}>Năm 2027</option>
          </select>
        </div>
      </div>

      {/* Danh Sách Các Báo Cáo Chi Tiêu Cần Duyệt */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '0.85rem' }}>
            Đang tải danh sách báo cáo chi tiêu...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', fontSize: '0.85rem' }}>
            Không có báo cáo chi tiêu nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>MÃ BÁO CÁO</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>KỲ BÁO CÁO</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>NGƯỜI LẬP (QUẢN LÝ XE)</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>TỔNG CHI PHÍ THÁNG</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>TIỀN DẦU DO</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>TIỀN SỬA CHỮA GARA</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>NGÀY NỘP</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: '#2563eb' }}>
                      {item.reportCode}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>
                      Tháng {item.month}/{item.year}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.fleetManagerId?.name || 'Phạm Minh Tuấn'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.fleetManagerId?.phone || '0988888888'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#16a34a', fontSize: '0.88rem' }}>
                      {formatCurrency(item.summary?.totalExpenses)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#d97706', fontWeight: '600' }}>
                      {formatCurrency(item.summary?.totalFuelCost)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#dc2626', fontWeight: '600' }}>
                      {formatCurrency(item.summary?.totalMaintenanceCost)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>
                      {formatDate(item.submittedAt)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {item.status === 'approved' ? (
                        <span style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                          ✓ Đã duyệt
                        </span>
                      ) : item.status === 'pending' ? (
                        <span style={{ backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                          ⏳ Chờ duyệt
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                          ✕ Yêu cầu sửa
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenReport(item)}
                        style={{
                          backgroundColor: item.status === 'pending' ? '#2563eb' : '#f1f5f9',
                          color: item.status === 'pending' ? '#ffffff' : '#334155',
                          border: item.status === 'pending' ? 'none' : '1px solid #cbd5e1',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxShadow: item.status === 'pending' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none'
                        }}
                      >
                        {item.status === 'pending' ? 'Xem & Phê Duyệt' : 'Xem Báo Cáo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crystal Report Kèm Nút Duyệt / Từ Chối */}
      <MonthlyFleetExpenseReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        report={selectedReport}
        canApprove={true}
        onApprove={handleApprove}
        onReject={handleReject}
        actionLoading={actionLoading}
      />
    </div>
  );
};

export default GmFleetExpenseReviewPage;

