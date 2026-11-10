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

const AgentMonthlyReportPage = () => {
  const { token, user } = useContext(AuthContext);

  // Mặc định chọn tháng trước (hoặc tháng hiện tại: Tháng 10/2026 trong hệ thống mẫu)
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedYear, setSelectedYear] = useState(2026);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agentNotes, setAgentNotes] = useState('');

  // Dữ liệu preview tháng hiện tại
  const [previewData, setPreviewData] = useState({
    summary: { totalShifts: 0, totalTickets: 0, cashRevenue: 0, cashlessRevenue: 0, totalRevenue: 0, initialCashHandover: 0 },
    shifts: [],
    existingReport: null
  });

  // Lịch sử các báo cáo đã nộp
  const [historyReports, setHistoryReports] = useState([]);

  // Modal xem bản in Crystal Report
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState(null);

  // 1. Tải dữ liệu preview theo tháng/năm
  const fetchPreviewData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/users/monthly-reports/preview?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewData({
          summary: data.data.summary || {},
          shifts: data.data.shifts || [],
          existingReport: data.data.existingReport || null
        });
        if (data.data.existingReport) {
          setAgentNotes(data.data.existingReport.agentNotes || '');
        } else {
          setAgentNotes('');
        }
      } else {
        setError(data.message || 'Không thể tải số liệu tổng hợp.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi nạp dữ liệu preview.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Tải lịch sử báo cáo cá nhân
  const fetchHistoryReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/monthly-reports/my-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryReports(data.reports || []);
      }
    } catch (err) {
      console.error('Lỗi nạp lịch sử:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPreviewData();
      fetchHistoryReports();
    }
  }, [token, selectedMonth, selectedYear]);

  // 3. Xử lý nộp báo cáo tháng
  const handleSubmitReport = async (e) => {
    if (e) e.preventDefault();
    if (previewData.shifts.length === 0) {
      alert('Không có ca trực nào đã hoàn thành trong tháng này để tạo báo cáo.');
      return;
    }

    if (!window.confirm(`Xác nhận nộp Báo Cáo Doanh Thu Tháng ${selectedMonth}/${selectedYear} lên Quản Lý Phòng Vé?`)) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/users/monthly-reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          agentNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || 'Nộp báo cáo doanh thu thành công!');
        fetchPreviewData();
        fetchHistoryReports();
      } else {
        setError(data.message || 'Không thể nộp báo cáo doanh thu.');
      }
    } catch (err) {
      setError('Lỗi máy chủ khi nộp báo cáo doanh thu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal xem bản in
  const openReportModal = (report) => {
    setSelectedReportForModal(report);
    setModalOpen(true);
  };

  const existingReport = previewData.existingReport;
  const isApproved = existingReport?.status === 'approved';
  const isPending = existingReport?.status === 'pending';
  const isRejected = existingReport?.status === 'rejected';

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .report-panel-box {
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

        .report-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .kpi-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .kpi-stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .kpi-stat-card.highlight {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .agent-custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .agent-custom-table th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          padding: 0.65rem 0.85rem;
          border: 1px solid #cbd5e1;
          text-align: left;
        }

        .agent-custom-table td {
          padding: 0.65rem 0.85rem;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        }

        .agent-custom-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .form-select-clean {
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

      {/* HEADER TRANG */}
      <div className="report-panel-box">
        <div className="report-header-wrap">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              Báo Cáo Doanh Thu Bán Vé Hàng Tháng
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
              Nhân viên bán vé lập và nộp báo cáo doanh thu định kỳ gửi Quản lý phòng vé chi nhánh phê duyệt.
            </p>
          </div>

          {/* BỘ LỌC THÁNG & NĂM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>Kỳ Báo Cáo:</span>
            <select
              className="form-select-clean"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>

            <select
              className="form-select-clean"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              <option value={2025}>Năm 2025</option>
              <option value={2026}>Năm 2026</option>
              <option value={2027}>Năm 2027</option>
            </select>

            <button
              onClick={fetchPreviewData}
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
              {loading ? 'Đang nạp...' : 'Tải Lại'}
            </button>
          </div>
        </div>

        {/* THÔNG BÁO ERROR / SUCCESS */}
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

        {/* BANNER TRẠNG THÁI BÁO CÁO HIỆN TẠI */}
        {existingReport ? (
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderRadius: '8px',
              border: `1px solid ${
                isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fed7aa'
              }`,
              backgroundColor: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', color: isApproved ? '#166534' : isRejected ? '#991b1b' : '#9a3412' }}>
                {isApproved
                  ? `BÁO CÁO THÁNG ${selectedMonth}/${selectedYear} ĐÃ ĐƯỢC DUYỆT ĐIỆN TỬ`
                  : isRejected
                  ? `BÁO CÁO THÁNG ${selectedMonth}/${selectedYear} BỊ TỪ CHỐI / CẦN GIẢI TRÌNH LẠI`
                  : `BÁO CÁO THÁNG ${selectedMonth}/${selectedYear} ĐÃ GỬI - ĐANG CHỜ QUẢN LÝ DUYỆT`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px' }}>
                Mã hồ sơ: <strong>{existingReport.reportCode}</strong> | Ngày gửi: {formatDateTime(existingReport.submittedAt)}
                {existingReport.managerNotes && (
                  <div style={{ marginTop: '3px', fontWeight: '600', color: isRejected ? '#dc2626' : '#166534' }}>
                    Phản hồi của Quản lý: {existingReport.managerNotes}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => openReportModal(existingReport)}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Xem / In Báo Cáo (A4)
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              fontSize: '0.82rem',
              fontWeight: '600'
            }}
          >
            Chưa có báo cáo nào được nộp cho Tháng {selectedMonth}/{selectedYear}. Vui lòng kiểm tra các số liệu tự động bên dưới, nhập giải trình và nhấn "Ký Tên &amp; Nộp Báo Cáo".
          </div>
        )}

        {/* 5 THẺ CHỈ SỐ KPI TỰ ĐỘNG TỔNG HỢP */}
        <div className="kpi-stat-grid">
          <div className="kpi-stat-card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Ca Đã Trực
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>
              {previewData.summary.totalShifts} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>ca</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Trong tháng {selectedMonth}/{selectedYear}</span>
          </div>

          <div className="kpi-stat-card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Vé Bán Ra
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>
              {previewData.summary.totalTickets} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>vé</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Phát hành thành công</span>
          </div>

          <div className="kpi-stat-card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Tiền Mặt Quầy Vé
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f766e' }}>
              {formatCurrency(previewData.summary.cashRevenue)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Đã bàn giao quỹ két</span>
          </div>

          <div className="kpi-stat-card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Chuyển Khoản / VietQR
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1d4ed8' }}>
              {formatCurrency(previewData.summary.cashlessRevenue)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tài khoản công ty</span>
          </div>

          <div className="kpi-stat-card highlight">
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
              Tổng Doanh Thu Tháng
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: '900', color: '#166534' }}>
              {formatCurrency(previewData.summary.totalRevenue)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '600' }}>Thực thu toàn kỳ</span>
          </div>
        </div>
      </div>

      {/* KHUNG NỘP / CẬP NHẬT BÁO CÁO (NẾU CHƯA DUYỆT) */}
      {!isApproved && (
        <div className="report-panel-box">
          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
            Ý Kiến &amp; Giải Trình Báo Cáo Tháng {selectedMonth}/{selectedYear}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Ghi chú nghiệp vụ / Giải trình chênh lệch quỹ két (nếu có):
            </label>
            <textarea
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              placeholder="Ví dụ: Đối soát 18 ca trực khớp đúng hoàn toàn 100% doanh thu và số vé..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              onClick={handleSubmitReport}
              disabled={submitting || previewData.shifts.length === 0}
              style={{
                backgroundColor: isRejected ? '#ea580c' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '800',
                cursor: 'pointer',
                opacity: previewData.shifts.length === 0 ? 0.6 : 1
              }}
            >
              {submitting
                ? 'Đang gửi báo cáo...'
                : isRejected
                ? `Cập Nhật & Nộp Lại Báo Cáo Tháng ${selectedMonth}/${selectedYear}`
                : isPending
                ? `Cập Nhật Báo Cáo Tháng ${selectedMonth}/${selectedYear}`
                : `Ký Tên & Nộp Báo Cáo Doanh Thu Tháng ${selectedMonth}/${selectedYear}`}
            </button>
          </div>
        </div>
      )}

      {/* BẢNG KÊ CHI TIẾT CÁC CA TRỰC TRONG THÁNG */}
      <div className="report-panel-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
            Bảng Kê Chi Tiết Ca Trực ({previewData.shifts.length} ca hoàn thành)
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Dữ liệu trích xuất tự động từ hệ thống quản lý ca thu ngân
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="agent-custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '120px' }}>Ngày &amp; Giờ Bắt Đầu</th>
                <th>Điểm Bán &amp; Quầy Vé</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Số Vé</th>
                <th style={{ width: '125px', textAlign: 'right' }}>Tiền Mặt (VNĐ)</th>
                <th style={{ width: '125px', textAlign: 'right' }}>Chuyển Khoản (VNĐ)</th>
                <th style={{ width: '135px', textAlign: 'right' }}>Tổng Ca (VNĐ)</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Đối Soát</th>
              </tr>
            </thead>
            <tbody>
              {previewData.shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontStyle: 'italic' }}>
                    Không có ca trực nào đã đóng trong Tháng {selectedMonth}/{selectedYear}.
                  </td>
                </tr>
              ) : (
                previewData.shifts.map((s, idx) => {
                  const shiftTotal = (s.cashRevenue || 0) + (s.cashlessRevenue || 0);
                  const ticketsCount = s.ticketsSold?.length || 0;
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: '700' }}>{formatDate(s.startTime)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700' }}>{s.counterNumber || 'Quầy vé'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {s.officeName || user?.branch?.branchName || 'Văn phòng Sài Gòn'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>{ticketsCount}</td>
                      <td style={{ textAlign: 'right' }}>{(s.cashRevenue || 0).toLocaleString('vi-VN')}</td>
                      <td style={{ textAlign: 'right' }}>{(s.cashlessRevenue || 0).toLocaleString('vi-VN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#1e3a8a' }}>
                        {shiftTotal.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {s.reconciliationStatus === 'verified' ? (
                          <span style={{ color: '#15803d', fontWeight: '700', fontSize: '0.75rem' }}>Đã khớp</span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '0.75rem' }}>Đã đóng</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LỊCH SỬ CÁC BÁO CÁO DOANH THU ĐÃ GỬI */}
      <div className="report-panel-box">
        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
          Lịch Sử Báo Cáo Doanh Thu Đã Nộp
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="agent-custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                <th>Mã Hồ Sơ</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Kỳ Báo Cáo</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Số Ca</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Số Vé</th>
                <th style={{ width: '135px', textAlign: 'right' }}>Tổng Doanh Thu</th>
                <th style={{ width: '140px' }}>Ngày Gửi</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {historyReports.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '1.25rem', color: '#64748b', fontStyle: 'italic' }}>
                    Chưa có lịch sử báo cáo nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                historyReports.map((r, idx) => (
                  <tr key={r._id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '700', color: '#1e3a8a' }}>{r.reportCode}</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>
                      Tháng {r.month}/{r.year}
                    </td>
                    <td style={{ textAlign: 'center' }}>{r.summary?.totalShifts || 0}</td>
                    <td style={{ textAlign: 'center' }}>{r.summary?.totalTickets || 0}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#166534' }}>
                      {formatCurrency(r.summary?.totalRevenue)}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{formatDateTime(r.submittedAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.status === 'approved' && (
                        <span style={{ color: '#15803d', fontWeight: '700', fontSize: '0.75rem' }}>Đã ký duyệt</span>
                      )}
                      {r.status === 'pending' && (
                        <span style={{ color: '#d97706', fontWeight: '700', fontSize: '0.75rem' }}>Chờ duyệt</span>
                      )}
                      {r.status === 'rejected' && (
                        <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.75rem' }}>Từ chối</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openReportModal(r)}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Xem / In A4
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL BẢN IN CRYSTAL REPORT CHUẨN A4 */}
      {modalOpen && selectedReportForModal && (
        <MonthlyRevenueReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          report={selectedReportForModal}
          shifts={selectedReportForModal.month === selectedMonth && selectedReportForModal.year === selectedYear ? previewData.shifts : []}
          canSign={false}
        />
      )}
    </div>
  );
};

export default AgentMonthlyReportPage;

