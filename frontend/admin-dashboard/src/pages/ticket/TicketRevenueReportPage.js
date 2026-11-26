import React, { useState, useEffect, useContext } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { BRANCH_FILTER_OPTIONS, getBranchById } from '../../constants/branches';
import MonthlyAreaRevenueReportModal from '../../components/MonthlyAreaRevenueReportModal';

const API_BASE = API_BASE_URL;

const formatDateToISO = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Xuất file CSV (UTF-8) gồm tổng hợp doanh thu và danh sách nhân viên
const exportAreaRevenueToCsv = (summary, staffBreakdown, branchName, periodLabel) => {
  let csvContent = '\uFEFF';
  csvContent += `BÁO CÁO KHU VỰC - AN BÌNH LINES\n`;
  csvContent += `Khu vực / Chi nhánh: ${branchName}\n`;
  csvContent += `Kỳ báo cáo: ${periodLabel}\n`;
  csvContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;

  // Mục 1: Tổng doanh thu và phân loại dòng tiền
  csvContent += '--- I. TỔNG HỢP DOANH THU & PHÂN LOẠI DÒNG TIỀN KHU VỰC ---\n';
  csvContent += `1. Tổng doanh thu thực thu của khu vực: ${summary.totalRevenue.toLocaleString('vi-VN')} VNĐ\n`;
  csvContent += `2. Doanh thu tiền mặt tại quầy: ${summary.cashRevenue.toLocaleString('vi-VN')} VNĐ (${summary.cashRate}%)\n`;
  csvContent += `3. Doanh thu chuyển khoản / Quét mã VietQR: ${summary.cashlessRevenue.toLocaleString('vi-VN')} VNĐ (${summary.cashlessRate}%)\n\n`;

  // Mục 2: Thống kê doanh thu theo từng nhân viên bán vé trong chi nhánh
  csvContent += '--- II. THỐNG KÊ DOANH THU THEO TỪNG NHÂN VIÊN BÁN VÉ TRONG CHI NHÁNH ---\n';
  csvContent += 'STT,Họ và tên nhân viên,Số điện thoại,Tiền mặt thu được (VNĐ),Chuyển khoản QR (VNĐ),Tổng doanh thu (VNĐ),Tỷ trọng (%)\n';
  staffBreakdown.forEach((s, idx) => {
    const rate = summary.totalRevenue > 0 ? ((s.totalRevenue / summary.totalRevenue) * 100).toFixed(1) : '0.0';
    csvContent += `${idx + 1},"${s.staffName}","${s.phone}",${s.totalCash},${s.totalCashless},${s.totalRevenue},${rate}%\n`;
  });
  csvContent += `TỔNG CỘNG,,,${summary.cashRevenue},${summary.cashlessRevenue},${summary.totalRevenue},100%\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_Khu_Vuc_${branchName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const TicketRevenueReportPage = () => {
  const { token, user } = useContext(AuthContext);

  const isSuperUser = ['general_manager', 'admin'].includes(user?.role);
  const defaultBranchId = user?.branch?.branchId || (isSuperUser ? 'sg' : 'sg');

  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);

  const activeBranchId = isSuperUser ? selectedBranchId : (user?.branch?.branchId || 'sg');
  const branchInfo = getBranchById(activeBranchId);
  const branchName = branchInfo?.branchName || (activeBranchId === 'all' ? 'Toàn mạng lưới' : 'Chi nhánh TP. Hồ Chí Minh');

  // State dữ liệu thống kê
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [data, setData] = useState({
    summary: { totalRevenue: 0, cashRevenue: 0, cashlessRevenue: 0, initialCash: 0, ticketsCount: 0, shiftsCount: 0, cashRate: 0, cashlessRate: 0 },
    staffBreakdown: []
  });

  // State bộ lọc thời gian: theo ngày, tuần, tháng
  const [datePreset, setDatePreset] = useState('this-month'); // 'today' | 'yesterday' | '7days' | 'this-month' | 'last-month' | 'custom' | 'all'
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return formatDateToISO(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return formatDateToISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });

  // Báo cáo chính thức của tháng hiện tại (để nộp và duyệt ký số)
  const [existingReport, setExistingReport] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [ticketManagerNotes, setTicketManagerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lịch sử danh sách hồ sơ báo cáo đã nộp
  const [historyReports, setHistoryReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal văn bản Crystal Report
  const [isCrystalModalOpen, setIsCrystalModalOpen] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Xác định tháng và năm hiện tại của bộ lọc để nộp báo cáo
  const getCurrentReportMonthYear = () => {
    if (startDate) {
      const d = new Date(startDate);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  };

  // Nạp dữ liệu báo cáo thống kê từ API
  const fetchRevenueReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('fromDate', startDate);
      if (endDate) params.append('toDate', endDate);
      if (activeBranchId && activeBranchId !== 'all') params.append('branchId', activeBranchId);

      const res = await fetch(`${API_BASE}/users/ticket-manager/revenue-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setData(resData);
      } else {
        showToast(resData.message || 'Không thể nạp báo cáo khu vực.', 'error');
      }

      // Kiểm tra trạng thái báo cáo đã nộp của tháng này
      const { month: m, year: y } = getCurrentReportMonthYear();
      const prevRes = await fetch(`${API_BASE}/users/area-revenue-reports/preview?month=${m}&year=${y}&branchId=${activeBranchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const prevData = await prevRes.json();
      if (prevRes.ok && prevData.success) {
        setExistingReport(prevData.data?.existingReport || null);
      } else {
        setExistingReport(null);
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi tải báo cáo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Nạp danh sách lịch sử hồ sơ báo cáo khu vực đã gửi
  const fetchHistoryReports = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (activeBranchId && activeBranchId !== 'all') {
        params.append('branchId', activeBranchId);
      }
      const res = await fetch(`${API_BASE}/users/area-revenue-reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setHistoryReports(resData.reports || []);
      }
    } catch (err) {
      console.error('fetchHistoryReports error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRevenueReport();
      fetchHistoryReports();
    }
  }, [token, startDate, endDate, activeBranchId]);

  // Chọn nhanh kỳ báo cáo (theo ngày, tuần hoặc tháng)
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = formatDateToISO(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatDateToISO(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      setStartDate(formatDateToISO(past7));
      setEndDate(formatDateToISO(now));
    } else if (preset === 'this-month') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      const l = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDateToISO(f));
      setEndDate(formatDateToISO(l));
    } else if (preset === 'last-month') {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const l = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDateToISO(f));
      setEndDate(formatDateToISO(l));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const getPeriodLabel = () => {
    switch (datePreset) {
      case 'today':
        return `Hôm nay (${new Date().toLocaleDateString('vi-VN')})`;
      case 'yesterday':
        return 'Hôm qua';
      case '7days':
        return '7 ngày gần nhất (Theo tuần)';
      case 'this-month':
        return `Tháng này (${new Date().getMonth() + 1}/${new Date().getFullYear()})`;
      case 'last-month': {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `Tháng trước (${d.getMonth() + 1}/${d.getFullYear()})`;
      }
      case 'all':
        return 'Toàn bộ thời gian';
      default:
        return startDate && endDate
          ? `Từ ${new Date(startDate).toLocaleDateString('vi-VN')} đến ${new Date(endDate).toLocaleDateString('vi-VN')}`
          : 'Tùy chọn';
    }
  };

  // Quản lý phòng vé nộp Báo cáo lên Ban Giám Đốc
  const handleSubmitReport = async () => {
    const { month: m, year: y } = getCurrentReportMonthYear();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users/area-revenue-reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          month: m,
          year: y,
          branchId: activeBranchId,
          ticketManagerNotes: ticketManagerNotes.trim()
        })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(resData.message || 'Nộp báo cáo khu vực lên Ban Giám đốc thành công!', 'success');
        setExistingReport(resData.report);
        setShowSubmitModal(false);
        setTicketManagerNotes('');
        fetchHistoryReports();
        // Mở modal xem trước văn bản
        setSelectedReportForModal(resData.report);
        setIsCrystalModalOpen(true);
      } else {
        alert(resData.message || 'Lỗi khi nộp báo cáo.');
      }
    } catch {
      alert('Lỗi kết nối máy chủ khi nộp báo cáo.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = data.summary || {
    totalRevenue: 0,
    cashRevenue: 0,
    cashlessRevenue: 0,
    cashRate: 0,
    cashlessRate: 0
  };

  const staffBreakdown = data.staffBreakdown || [];
  const { month: currentM, year: currentY } = getCurrentReportMonthYear();

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report-area, .printable-report-area * {
            visibility: visible;
          }
          .printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
        .area-report-table th {
          background-color: #f8fafc;
          color: #334155;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 10px 14px;
          border-bottom: 2px solid #cbd5e1;
          letter-spacing: 0.3px;
          white-space: nowrap;
          text-align: left;
        }
        .area-report-table td {
          padding: 10px 14px;
          font-size: 0.8rem;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
          text-align: left;
        }
        .area-report-table tr:hover td {
          background-color: #f8fafc;
        }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700',
          backgroundColor: toast.type === 'error' ? '#dc2626' : '#16a34a', color: '#ffffff',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER PANEL: Tiêu đề & Công cụ điều khiển */}
      <div className="no-print" style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Báo Cáo Khu Vực
              </h1>
              <span style={{
                fontSize: '0.74rem',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '3px 10px',
                borderRadius: '6px',
                fontWeight: '700'
              }}>
                {branchName}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
              Báo cáo tổng hợp số liệu thực thu, phân loại dòng tiền mặt & chuyển khoản VietQR, thống kê theo từng quầy vé và nhân viên bán vé trong chi nhánh.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isSuperUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Khu vực:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  <option value="sg">Chi nhánh TP. Hồ Chí Minh</option>
                  <option value="dl">Chi nhánh Đà Lạt</option>
                  <option value="ct">Chi nhánh Cần Thơ</option>
                  <option value="all">Toàn mạng lưới</option>
                </select>
              </div>
            )}

            {/* Nút nộp báo cáo tháng lên Ban Giám Đốc */}
            {user?.role === 'ticket_manager' && (
              existingReport ? (
                <button
                  onClick={() => {
                    setSelectedReportForModal(existingReport);
                    setIsCrystalModalOpen(true);
                  }}
                  style={{
                    backgroundColor: existingReport.status === 'approved' ? '#15803d' : '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: '800',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  {existingReport.status === 'approved' ? 'Xem Bản In Quyết Toán' : 'Xem Phiếu Trình Duyệt'}
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  style={{
                    backgroundColor: '#1d4ed8',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: '800',
                    padding: '6px 15px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(29,78,216,0.3)'
                  }}
                >
                  + Nộp Báo Cáo Tháng {currentM}/{currentY} Lên Ban Giám Đốc
                </button>
              )
            )}

            <button
              onClick={() => exportAreaRevenueToCsv(summary, staffBreakdown, branchName, getPeriodLabel())}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#2563eb',
                fontWeight: '700',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Xuất Excel (CSV)
            </button>

            <button
              onClick={() => { fetchRevenueReport(); fetchHistoryReports(); showToast('Đã làm mới dữ liệu báo cáo khu vực!'); }}
              style={{
                backgroundColor: '#0f172a',
                border: 'none',
                color: '#ffffff',
                fontWeight: '700',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Làm Mới
            </button>
          </div>
        </div>

        {/* BỘ LỌC KỲ BÁO CÁO: THEO NGÀY, TUẦN HOẶC THÁNG */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '0.85rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginRight: '4px' }}>
            Kỳ báo cáo:
          </span>

          {[
            { key: 'today', label: 'Hôm nay' },
            { key: 'yesterday', label: 'Hôm qua' },
            { key: '7days', label: 'Theo tuần (7 ngày)' },
            { key: 'this-month', label: 'Tháng này' },
            { key: 'last-month', label: 'Tháng trước' },
            { key: 'all', label: 'Tất cả' }
          ].map(p => {
            const isSel = datePreset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyDatePreset(p.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: isSel ? '700' : '600',
                  border: isSel ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  backgroundColor: isSel ? '#0f172a' : '#ffffff',
                  color: isSel ? '#ffffff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
            />
          </div>
        </div>

        {/* BANNER THÔNG BÁO HỒ SƠ BÁO CÁO THÁNG NẾU ĐÃ NỘP */}
        {existingReport && (
          <div style={{
            marginTop: '0.85rem',
            padding: '10px 14px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: existingReport.status === 'approved' ? '#f0fdf4' : existingReport.status === 'rejected' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${existingReport.status === 'approved' ? '#bbf7d0' : existingReport.status === 'rejected' ? '#fecaca' : '#fde68a'}`,
            fontSize: '0.78rem'
          }}>
            <div>
              <span style={{ fontWeight: '800', color: existingReport.status === 'approved' ? '#166534' : existingReport.status === 'rejected' ? '#991b1b' : '#b45309' }}>
                {existingReport.status === 'approved' && 'BÁO CÁO ĐÃ ĐƯỢC BAN GIÁM ĐỐC PHÊ DUYỆT QUYẾT TOÁN'}
                {existingReport.status === 'pending' && 'BÁO CÁO ĐANG CHỜ BAN GIÁM ĐỐC THẨM ĐỊNH & PHÊ DUYỆT'}
                {existingReport.status === 'rejected' && 'BÁO CÁO BỊ BAN GIÁM ĐỐC TỪ CHỐI / YÊU CẦU GIẢI TRÌNH'}
              </span>
              <span style={{ marginLeft: '8px', color: '#475569' }}>
                (Mã văn bản: <strong>{existingReport.reportCode}</strong> — Nộp ngày {new Date(existingReport.submittedAt).toLocaleDateString('vi-VN')})
              </span>
              {existingReport.directorNotes && (
                <div style={{ marginTop: '2px', color: existingReport.status === 'approved' ? '#15803d' : '#b91c1c' }}>
                  <strong>Ý kiến Ban Giám Đốc:</strong> {existingReport.directorNotes}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedReportForModal(existingReport);
                setIsCrystalModalOpen(true);
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                padding: '4px 10px',
                fontWeight: '700',
                fontSize: '0.72rem',
                color: '#1e293b',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Mở Văn Bản Ký Duyệt
            </button>
          </div>
        )}
      </div>

      {/* VÙNG IN VĂN BẢN VÀ HIỂN THỊ CHÍNH */}
      <div className="printable-report-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

        {/* 1 & 2. TỔNG HỢP DOANH THU VÀ PHÂN LOẠI DÒNG TIỀN (3 CARDS CHÍNH) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          {/* Card 1: Tổng doanh thu thực thu của khu vực */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '1.2rem 1.4rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
              1. TỔNG DOANH THU THỰC THU KHU VỰC
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', margin: '6px 0 2px 0', whiteSpace: 'nowrap' }}>
              {summary.totalRevenue.toLocaleString('vi-VN')}&nbsp;<span style={{ fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>đ</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Kỳ báo cáo: <strong>{getPeriodLabel()}</strong>
            </div>
          </div>

          {/* Card 2: Doanh thu tiền mặt tại quầy */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1.5px solid #fed7aa',
            backgroundColor: '#fffaf5',
            padding: '1.2rem 1.4rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '0.74rem', color: '#c2410c', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
              2A. DOANH THU TIỀN MẶT TẠI QUẦY
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ea580c', margin: '6px 0 2px 0', whiteSpace: 'nowrap' }}>
              {summary.cashRevenue.toLocaleString('vi-VN')}&nbsp;<span style={{ fontSize: '1rem', fontWeight: '700', color: '#ea580c' }}>đ</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Chiếm <strong>{summary.cashRate}%</strong> tổng doanh thu thực thu khu vực
            </div>
          </div>

          {/* Card 3: Doanh thu chuyển khoản / Quét mã VietQR */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1.5px solid #bbf7d0',
            backgroundColor: '#f6fef9',
            padding: '1.2rem 1.4rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
              2B. DOANH THU CHUYỂN KHOẢN / VIETQR
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#16a34a', margin: '6px 0 2px 0', whiteSpace: 'nowrap' }}>
              {summary.cashlessRevenue.toLocaleString('vi-VN')}&nbsp;<span style={{ fontSize: '1rem', fontWeight: '700', color: '#16a34a' }}>đ</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Chiếm <strong>{summary.cashlessRate}%</strong> tổng doanh thu thực thu khu vực
            </div>
          </div>
        </div>

        {/* 3. BẢNG THỐNG KÊ DOANH THU THEO TỪNG NHÂN VIÊN BÁN VÉ TRONG CHI NHÁNH */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
              3. Thống Kê Doanh Thu Theo Từng Nhân Viên Bán Vé Trong Chi Nhánh
            </h2>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
              Theo dõi năng suất bán hàng thực tế, doanh thu trực tiếp thu tiền mặt và chuyển khoản của từng nhân sự phòng vé.
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
              Đang thống kê doanh thu theo nhân viên...
            </div>
          ) : staffBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.82rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              Chưa ghi nhận ca trực hoặc giao dịch của nhân viên bán vé trong kỳ báo cáo này.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="area-report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'left', whiteSpace: 'nowrap' }}>STT</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Nhân Viên Bán Vé</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Số Điện Thoại</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Tiền Mặt Thu Được</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Chuyển Khoản / VietQR</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Tổng Doanh Thu</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Tỷ Trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {staffBreakdown.map((s, idx) => {
                    const rate = summary.totalRevenue > 0 ? ((s.totalRevenue / summary.totalRevenue) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx}>
                        <td style={{ textAlign: 'left', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '700', color: '#0f172a', textAlign: 'left', whiteSpace: 'nowrap' }}>{s.staffName}</td>
                        <td style={{ color: '#64748b', fontSize: '0.76rem', fontFamily: 'monospace', textAlign: 'left', whiteSpace: 'nowrap' }}>{s.phone || 'N/A'}</td>
                        <td style={{ textAlign: 'left', fontWeight: '700', color: '#c2410c', whiteSpace: 'nowrap' }}>
                          {s.totalCash.toLocaleString('vi-VN')}&nbsp;đ
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: '700', color: '#15803d', whiteSpace: 'nowrap' }}>
                          {s.totalCashless.toLocaleString('vi-VN')}&nbsp;đ
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {s.totalRevenue.toLocaleString('vi-VN')}&nbsp;đ
                        </td>
                        <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                          <span style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap'
                          }}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Dòng tổng cộng */}
                  <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: '800' }}>
                    <td colSpan={3} style={{ textAlign: 'left', textTransform: 'uppercase', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      Tổng Cộng Nhân Viên:
                    </td>
                    <td style={{ textAlign: 'left', color: '#c2410c', whiteSpace: 'nowrap' }}>
                      {summary.cashRevenue.toLocaleString('vi-VN')}&nbsp;đ
                    </td>
                    <td style={{ textAlign: 'left', color: '#15803d', whiteSpace: 'nowrap' }}>
                      {summary.cashlessRevenue.toLocaleString('vi-VN')}&nbsp;đ
                    </td>
                    <td style={{ textAlign: 'left', color: '#0f172a', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                      {summary.totalRevenue.toLocaleString('vi-VN')}&nbsp;đ
                    </td>
                    <td style={{ textAlign: 'left', color: '#0f172a', whiteSpace: 'nowrap' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. LỊCH SỬ DANH SÁCH HỒ SƠ BÁO CÁO ĐÃ GỬI */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.4rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                4. Lịch Sử Danh Sách Hồ Sơ Báo Cáo Đã Gửi
              </h2>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                Theo dõi tiến độ thẩm định, phê duyệt và tra cứu lại bản in các báo cáo khu vực đã nộp lên Ban Giám Đốc.
              </div>
            </div>
            <button
              onClick={fetchHistoryReports}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Làm mới danh sách
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
              Đang nạp danh sách hồ sơ báo cáo...
            </div>
          ) : historyReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.82rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              Chưa có hồ sơ báo cáo nào được gửi cho khu vực này.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="area-report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Mã Báo Cáo</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Kỳ Báo Cáo</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Tổng Thực Thu</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Tiền Mặt Quầy</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Chuyển Khoản / QR</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Thời Gian Gửi</th>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {historyReports.map((item) => {
                    const statusBadge = () => {
                      if (item.status === 'approved') {
                        return (
                          <span style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            Đã phê duyệt
                          </span>
                        );
                      }
                      if (item.status === 'rejected') {
                        return (
                          <span style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            Từ chối
                          </span>
                        );
                      }
                      return (
                        <span style={{
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap'
                        }}>
                          Chờ duyệt
                        </span>
                      );
                    };

                    return (
                      <tr key={item._id}>
                        <td style={{ fontWeight: '800', color: '#1d4ed8', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          {item.reportCode}
                        </td>
                        <td style={{ fontWeight: '700', color: '#0f172a', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          Tháng {item.month}/{item.year}
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {(item.summary?.totalRevenue || 0).toLocaleString('vi-VN')}&nbsp;đ
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: '700', color: '#c2410c', whiteSpace: 'nowrap' }}>
                          {(item.summary?.cashRevenue || 0).toLocaleString('vi-VN')}&nbsp;đ
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: '700', color: '#15803d', whiteSpace: 'nowrap' }}>
                          {(item.summary?.cashlessRevenue || 0).toLocaleString('vi-VN')}&nbsp;đ
                        </td>
                        <td style={{ textAlign: 'left', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleString('vi-VN', {
                            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                          }) : '--'}
                        </td>
                        <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                          {statusBadge()}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => {
                              setSelectedReportForModal(item);
                              setIsCrystalModalOpen(true);
                            }}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#1d4ed8',
                              fontWeight: '700',
                              fontSize: '0.72rem',
                              padding: '4px 10px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Bản in
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

      </div>

      {/* MODAL DIALOG: NỘP BÁO CÁO THÁNG LÊN BAN GIÁM ĐỐC */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            padding: '1.5rem',
            width: '480px',
            maxWidth: '95vw',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              Nộp Báo Cáo Khu Vực Tháng {currentM}/{currentY}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Hồ sơ Báo cáo Thống kê của <strong>{branchName}</strong> sẽ được gửi trực tiếp đến Trung tâm Phê duyệt của Ban Giám Đốc để kiểm tra và ký số chứng thực.
            </p>

            {/* Tóm tắt nhanh số liệu trình duyệt */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Tổng doanh thu thực thu:</span>
                <strong style={{ color: '#0f172a' }}>{summary.totalRevenue.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Tiền mặt tại quầy (nộp quỹ):</span>
                <strong style={{ color: '#ea580c' }}>{summary.cashRevenue.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Chuyển khoản VietQR:</span>
                <strong style={{ color: '#16a34a' }}>{summary.cashlessRevenue.toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px' }}>
                Ghi chú giải trình của Quản lý Bán vé (tùy chọn):
              </label>
              <textarea
                value={ticketManagerNotes}
                onChange={(e) => setTicketManagerNotes(e.target.value)}
                placeholder="Đã đối soát đầy đủ tiền két tại các quầy và sao kê VietQR, kính trình Ban Giám Đốc duyệt..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submitting}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {submitting ? 'Đang gửi...' : 'Xác Nhận Nộp Báo Cáo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM VÀ IN BẢN BÁO CÁO CRYSTAL REPORT CHUẨN MỘC ĐỎ & CHỮ KÝ TAY */}
      <MonthlyAreaRevenueReportModal
        isOpen={isCrystalModalOpen}
        onClose={() => setIsCrystalModalOpen(false)}
        report={selectedReportForModal || existingReport}
        canApprove={false}
      />

    </div>
  );
};

export default TicketRevenueReportPage;
