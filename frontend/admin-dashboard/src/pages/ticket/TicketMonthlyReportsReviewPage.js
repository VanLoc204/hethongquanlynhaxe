import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import MonthlyRevenueReportModal from '../../components/MonthlyRevenueReportModal';

const API_BASE = 'http://localhost:8000/api/v1';

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

const formatDateTime = (dateStr) => {
  if (!dateStr) return '--:-- --/--/----';
  return new Date(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const TicketMonthlyReportsReviewPage = () => {
  const { token, user } = useContext(AuthContext);

  const managerBranch = user?.branch?.branchId || 'sg';

  // State bộ lọc
  const [selectedBranch, setSelectedBranch] = useState(managerBranch);
  const [selectedMonth, setSelectedMonth] = useState('10');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Danh sách báo cáo
  const [reports, setReports] = useState([]);

  // Modal chi tiết
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // 1. Tải danh sách báo cáo
  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedMonth && selectedMonth !== 'all') params.append('month', selectedMonth);
      if (selectedYear && selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`${API_BASE}/users/monthly-reports/manager?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.reports || []);
      } else {
        setError(data.message || 'Không thể tải danh sách báo cáo doanh thu.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi nạp danh sách báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token, selectedBranch, selectedMonth, selectedYear, selectedStatus]);

  // 2. Mở chi tiết 1 báo cáo (Fetch chi tiết kèm ca trực)
  const handleOpenDetail = async (reportId) => {
    try {
      const res = await fetch(`${API_BASE}/users/monthly-reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedReport(data.report);
        setModalOpen(true);
      } else {
        alert(data.message || 'Không thể tải chi tiết báo cáo.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi tải chi tiết hồ sơ.');
    }
  };

  // 3. Quản lý ký duyệt điện tử
  const handleSignApprove = async (managerNotes) => {
    if (!selectedReport) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/users/monthly-reports/${selectedReport._id}/sign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ managerNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Ký duyệt điện tử & đóng mộc thành công!');
        setSelectedReport(data.report);
        fetchReports();
      } else {
        alert(data.message || 'Không thể ký duyệt báo cáo.');
      }
    } catch (err) {
      alert('Lỗi máy chủ khi ký duyệt điện tử.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Quản lý từ chối
  const handleReject = async (managerNotes) => {
    if (!selectedReport) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/users/monthly-reports/${selectedReport._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ managerNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Đã gửi phản hồi từ chối về cho nhân viên.');
        setSelectedReport(data.report);
        fetchReports();
      } else {
        alert(data.message || 'Không thể từ chối báo cáo.');
      }
    } catch (err) {
      alert('Lỗi máy chủ khi từ chối báo cáo.');
    } finally {
      setActionLoading(false);
    }
  };

  // Tính thống kê KPI
  const totalReportsCount = reports.length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;
  const approvedReportsCount = reports.filter((r) => r.status === 'approved').length;
  const totalApprovedRevenue = reports
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.summary?.totalRevenue || 0), 0);

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .review-panel-box {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          box-sizing: border-box;
        }

        .review-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .kpi-review-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 1rem;
        }

        .kpi-review-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .kpi-review-card.warning {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .kpi-review-card.success {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .review-custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .review-custom-table th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          padding: 0.65rem 0.85rem;
          border: 1px solid #cbd5e1;
          text-align: left;
        }

        .review-custom-table td {
          padding: 0.65rem 0.85rem;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        }

        .review-custom-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .select-filter-clean {
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.82rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
        }
      `}</style>

      {/* HEADER & BỘ LỌC */}
      <div className="review-panel-box">
        <div className="review-header-wrap">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              Duyệt Báo Cáo Doanh Thu Bán Vé Hàng Tháng
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
              Tiếp nhận, kiểm toán đối soát số liệu ca trực và ký duyệt điện tử báo cáo doanh thu tháng của nhân viên phòng vé.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <select
              className="select-filter-clean"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">Toàn mạng lưới</option>
              <option value="sg">Chi nhánh TP.HCM</option>
              <option value="dl">Chi nhánh Đà Lạt</option>
              <option value="ct">Chi nhánh Cần Thơ</option>
            </select>

            <select
              className="select-filter-clean"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">Tất cả tháng</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>

            <select
              className="select-filter-clean"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">Tất cả năm</option>
              <option value="2025">Năm 2025</option>
              <option value="2026">Năm 2026</option>
              <option value="2027">Năm 2027</option>
            </select>

            <select
              className="select-filter-clean"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ phê duyệt</option>
              <option value="approved">Đã ký duyệt</option>
              <option value="rejected">Bị từ chối</option>
            </select>

            <button
              onClick={fetchReports}
              disabled={loading}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Đang lọc...' : 'Lọc Dữ Liệu'}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.65rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '600'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '0.65rem 1rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '600'
            }}
          >
            {success}
          </div>
        )}

        {/* 4 THẺ KPI TỔNG HỢP TIẾP NHẬN BÁO CÁO */}
        <div className="kpi-review-grid">
          <div className="kpi-review-card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Hồ Sơ Tiếp Nhận
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>
              {totalReportsCount} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>báo cáo</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Theo bộ lọc hiện tại</span>
          </div>

          <div className="kpi-review-card warning">
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>
              Hồ Sơ Chờ Phê Duyệt
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#b45309' }}>
              {pendingReportsCount} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>hồ sơ</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '600' }}>Cần đối soát &amp; ký duyệt</span>
          </div>

          <div className="kpi-review-card success">
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
              Đã Ký Duyệt Điện Tử
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#166534' }}>
              {approvedReportsCount} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>hồ sơ</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '600' }}>Đã đóng mộc hoàn tất</span>
          </div>

          <div className="kpi-review-card success">
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
              Tổng Doanh Thu Đã Duyệt
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: '900', color: '#166534' }}>
              {formatCurrency(totalApprovedRevenue)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '600' }}>Doanh số hợp lệ</span>
          </div>
        </div>
      </div>

      {/* BẢNG DANH SÁCH BÁO CÁO CỦA NHÂN VIÊN GỬI VỀ */}
      <div className="review-panel-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
            Danh Sách Báo Cáo Doanh Thu Bán Vé ({reports.length} hồ sơ)
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Click "Thẩm Định &amp; Ký Duyệt" để mở bản in A4 và thực hiện chứng thực chữ ký số
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="review-custom-table">
            <thead>
              <tr>
                <th style={{ width: '35px', textAlign: 'center' }}>STT</th>
                <th>Mã Hồ Sơ</th>
                <th>Nhân Viên Bán Vé</th>
                <th style={{ width: '95px', textAlign: 'center' }}>Kỳ Báo Cáo</th>
                <th style={{ width: '65px', textAlign: 'center' }}>Số Ca</th>
                <th style={{ width: '65px', textAlign: 'center' }}>Số Vé</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Tiền Mặt (VNĐ)</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Chuyển Khoản (VNĐ)</th>
                <th style={{ width: '135px', textAlign: 'right' }}>Tổng Doanh Thu</th>
                <th style={{ width: '125px' }}>Thời Gian Nộp</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontStyle: 'italic' }}>
                    Không tìm thấy báo cáo doanh thu nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                reports.map((r, idx) => (
                  <tr key={r._id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '700', color: '#1e3a8a' }}>{r.reportCode}</td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{r.agentId?.name || 'Nhân viên bán vé'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {r.agentId?.phone} • {r.agentId?.branch?.branchName || 'Chi nhánh TP.HCM'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>
                      Tháng {r.month}/{r.year}
                    </td>
                    <td style={{ textAlign: 'center' }}>{r.summary?.totalShifts || 0}</td>
                    <td style={{ textAlign: 'center' }}>{r.summary?.totalTickets || 0}</td>
                    <td style={{ textAlign: 'right' }}>{(r.summary?.cashRevenue || 0).toLocaleString('vi-VN')}</td>
                    <td style={{ textAlign: 'right' }}>{(r.summary?.cashlessRevenue || 0).toLocaleString('vi-VN')}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#166534' }}>
                      {formatCurrency(r.summary?.totalRevenue)}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{formatDateTime(r.submittedAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.status === 'approved' && (
                        <span
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem'
                          }}
                        >
                          Đã Ký Duyệt
                        </span>
                      )}
                      {r.status === 'pending' && (
                        <span
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem'
                          }}
                        >
                          Chờ Duyệt
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem'
                          }}
                        >
                          Từ Chối
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenDetail(r._id)}
                        style={{
                          backgroundColor: r.status === 'pending' ? '#16a34a' : '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {r.status === 'pending' ? 'Thẩm Định & Ký' : 'Xem / In A4'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL BẢN IN & THẨM ĐỊNH KÝ DUYỆT ĐIỆN TỬ */}
      {modalOpen && selectedReport && (
        <MonthlyRevenueReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          report={selectedReport}
          canSign={['ticket_manager', 'general_manager', 'admin'].includes(user?.role)}
          onSign={handleSignApprove}
          onReject={handleReject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
};

export default TicketMonthlyReportsReviewPage;

