import React, { useState } from 'react';

const formatCurrency = (val) => {
  return (val || 0).toLocaleString('vi-VN') + ' đ';
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

const formatDateElements = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return { day, month, year };
};

const getSignatureName = (fullName) => {
  if (!fullName || !fullName.trim()) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1]; // e.g. "Lê Trọng Nghĩa" -> "Nghĩa", "Nguyễn An Bình" -> "Bình"
};

const MonthlyAreaRevenueReportModal = ({
  isOpen,
  onClose,
  report,
  canApprove = false,
  onApprove,
  onReject,
  actionLoading = false
}) => {
  const [directorNotes, setDirectorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!isOpen || !report) return null;

  const {
    reportCode = '',
    branchName = 'Chi nhánh TP. Hồ Chí Minh',
    month = 10,
    year = 2026,
    ticketManagerId = {},
    summary = {},
    staffBreakdown = [],
    ticketManagerNotes = '',
    status = 'pending',
    directorId = {},
    directorNotes: existingDirectorNotes = '',
    submittedAt,
    reviewedAt,
    digitalSignature = {}
  } = report;

  const managerName = ticketManagerId?.name || 'Lê Trọng Nghĩa';
  const directorName = directorId?.name || digitalSignature?.signerName || 'Nguyễn An Bình';

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmApprove = () => {
    if (onApprove) {
      onApprove(directorNotes);
      setShowApproveConfirm(false);
    }
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối / yêu cầu giải trình!');
      return;
    }
    if (onReject) {
      onReject(rejectionReason);
      setShowRejectConfirm(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .crystal-report-modal, .crystal-report-modal * {
            visibility: visible;
          }
          .crystal-report-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .no-print-area {
            display: none !important;
          }
        }
        .revenue-report-table th {
          background-color: #f1f5f9;
          color: #0f172a;
          border: 1px solid #94a3b8;
          padding: 6px 10px;
          font-size: 0.78rem;
          font-weight: 700;
          text-align: center;
          white-space: nowrap;
        }
        .revenue-report-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          font-size: 0.8rem;
          color: #0f172a;
          white-space: nowrap;
        }
      `}</style>

      <div
        className="crystal-report-modal"
        style={{
          backgroundColor: '#ffffff',
          width: '980px',
          maxWidth: '96vw',
          maxHeight: '94vh',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* THANH ĐIỀU HƯỚNG BÁO CÁO (TOOLBAR) */}
        <div
          className="no-print-area"
          style={{
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            padding: '0.65rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '0.9rem', color: '#93c5fd' }}>
              {reportCode}
            </span>
            <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f1f5f9' }}>
              {branchName}
            </span>
            <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
              Tháng {month}/{year}
            </span>

            {status === 'approved' && (
              <span
                style={{
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                ĐÃ KÝ DUYỆT ĐIỆN TỬ
              </span>
            )}
            {status === 'pending' && (
              <span
                style={{
                  backgroundColor: '#b45309',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                CHỜ BAN GIÁM ĐỐC DUYỆT
              </span>
            )}
            {status === 'rejected' && (
              <span
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                BỊ TỪ CHỐI / CẦN GIẢI TRÌNH
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canApprove && status !== 'approved' && (
              <>
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Từ Chối
                </button>
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Ký Duyệt Quyết Toán
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.35rem 0.85rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              In Báo Cáo (A4)
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#475569',
                color: '#ffffff',
                border: 'none',
                padding: '0.35rem 0.85rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Đóng
            </button>
          </div>
        </div>

        {/* NỘI DUNG VĂN BẢN TRANG A4 BÁO CÁO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 1rem 5rem 1rem', display: 'flex', justifyContent: 'center', backgroundColor: '#e2e8f0' }}>
          <div
            className="report-printable-area"
            style={{
              backgroundColor: '#ffffff',
              width: '900px',
              minHeight: '1350px',
              padding: '24mm 18mm 50mm 18mm',
              color: '#0f172a',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '0.88rem',
              lineHeight: 1.45,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* HEADER CÔNG TY (ĐỒNG BỘ 100% ERP) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '0.85rem',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase' }}>
                  CÔNG TY TNHH VẬN TẢI AN BÌNH
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
                  Ban Kế toán &amp; Quản trị Doanh thu - {branchName}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  Trụ sở: 395 Kinh Dương Vương, An Lạc, Bình Tân, TP. Hồ Chí Minh
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                <div>Mã biểu mẫu: <strong>BM-TC-04/AB</strong></div>
                <div>Ban hành: <strong>01/01/2026</strong></div>
                <div>Lưu trữ: <strong>Ban Kế toán &amp; Phòng Vé</strong></div>
              </div>
            </div>

            {/* TIÊU ĐỀ VĂN BẢN */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '900',
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}
              >
                BÁO CÁO THỐNG KÊ DOANH THU KHU VỰC
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e3a8a' }}>
                {branchName} — Kỳ Báo Cáo: Tháng {String(month).padStart(2, '0')} Năm {year}
              </div>
              <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>
                (Tổng hợp doanh thu thực thu, đối soát tiền mặt quầy vé &amp; dòng tiền chuyển khoản VietQR)
              </div>
            </div>

            {/* THÔNG TIN HÀNH CHÍNH */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '0.75rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '0.65rem 1rem',
                fontSize: '0.84rem',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <div>Cán bộ lập báo cáo: <strong>{managerName}</strong></div>
                <div style={{ marginTop: '2px' }}>Chức vụ: <strong>Quản lý Bán vé Chi nhánh</strong></div>
                <div style={{ marginTop: '2px' }}>Đơn vị: <strong>{branchName}</strong></div>
              </div>
              <div>
                <div>Thời gian nộp: <strong>{formatDateTime(submittedAt)}</strong></div>
                <div style={{ marginTop: '2px' }}>Cấp phê duyệt: <strong>Ban Giám Đốc An Bình Lines</strong></div>
                <div style={{ marginTop: '2px' }}>
                  Trạng thái:{' '}
                  <strong style={{ color: status === 'approved' ? '#15803d' : '#b45309' }}>
                    {status === 'approved' ? 'Đã phê duyệt quyết toán' : 'Đang chờ phê duyệt'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 1 & 2. BẢNG TỔNG HỢP DOANH THU & PHÂN LOẠI DÒNG TIỀN */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.92rem', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                I. BẢNG TỔNG HỢP DOANH THU &amp; PHÂN LOẠI DÒNG TIỀN THỰC THU
              </div>
              <table className="revenue-report-table" style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                      1. Doanh thu Tiền mặt thu trực tiếp tại quầy vé (Đối soát nộp quỹ két):
                    </td>
                    <td style={{ fontWeight: '800', textAlign: 'right', color: '#c2410c', whiteSpace: 'nowrap' }}>
                      {formatCurrency(summary.cashRevenue)} ({summary.cashRate || 0}%)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                      2. Doanh thu Chuyển khoản / Quét mã VietQR (Tài khoản công ty):
                    </td>
                    <td style={{ fontWeight: '800', textAlign: 'right', color: '#15803d', whiteSpace: 'nowrap' }}>
                      {formatCurrency(summary.cashlessRevenue)} ({summary.cashlessRate || 0}%)
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #0f172a' }}>
                    <td style={{ fontWeight: '900', color: '#166534', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                      TỔNG DOANH THU THỰC THU KHU VỰC THÁNG {month}/{year}:
                    </td>
                    <td style={{ fontWeight: '900', textAlign: 'right', color: '#15803d', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                      {formatCurrency(summary.totalRevenue)}
                    </td>
                  </tr>
                  <tr style={{ fontSize: '0.78rem', color: '#475569' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>Tổng lượt vé xuất bán qua các ca trực tại chi nhánh:</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      {(summary.totalTickets || 0).toLocaleString('vi-VN')} vé ({summary.shiftsCount || 0} ca trực)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* II. BẢNG THỐNG KÊ DOANH THU THEO TỪNG NHÂN VIÊN BÁN VÉ TRONG CHI NHÁNH */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.92rem', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                II. THỐNG KÊ DOANH THU THEO TỪNG NHÂN VIÊN BÁN VÉ TRONG CHI NHÁNH
              </div>
              <table className="revenue-report-table" style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th style={{ width: '38px', whiteSpace: 'nowrap' }}>STT</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Họ Tên Nhân Viên</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Số Điện Thoại</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Tiền Mặt Thu Được</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Chuyển Khoản / QR</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Tổng Doanh Thu</th>
                    <th style={{ width: '75px', whiteSpace: 'nowrap' }}>Tỷ Trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {staffBreakdown.map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                      <td style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>{s.staffName}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.phone || 'N/A'}</td>
                      <td style={{ textAlign: 'right', color: '#c2410c', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {formatCurrency(s.totalCash)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#15803d', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {formatCurrency(s.totalCashless)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', whiteSpace: 'nowrap' }}>
                        {formatCurrency(s.totalRevenue)}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {s.rate}%
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: '800' }}>
                    <td colSpan={3} style={{ textAlign: 'center', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TỔNG CỘNG:</td>
                    <td style={{ textAlign: 'right', color: '#c2410c', whiteSpace: 'nowrap' }}>{formatCurrency(summary.cashRevenue)}</td>
                    <td style={{ textAlign: 'right', color: '#15803d', whiteSpace: 'nowrap' }}>{formatCurrency(summary.cashlessRevenue)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(summary.totalRevenue)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* GIẢI TRÌNH CỦA QUẢN LÝ PHÒNG VÉ */}
            {ticketManagerNotes && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.84rem',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ fontWeight: '800', color: '#0f172a' }}>Giải trình của Quản lý Bán vé:</div>
                <div style={{ marginTop: '3px', fontStyle: 'italic', color: '#334155' }}>
                  "{ticketManagerNotes}"
                </div>
              </div>
            )}

            {/* Ý KIẾN CHỈ ĐẠO CỦA BAN GIÁM ĐỐC */}
            {existingDirectorNotes && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '4px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.84rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontWeight: '800', color: '#166534' }}>Ý kiến phê duyệt của Ban Giám Đốc:</div>
                <div style={{ marginTop: '3px', color: '#14532d' }}>
                  {existingDirectorNotes}
                </div>
              </div>
            )}

            {/* KHUNG KÝ TÊN VĂN BẢN (CHỮ KÝ TAY & DẤU MỘC ĐỎ) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '1.5rem',
                pageBreakInside: 'avoid'
              }}
            >
              {/* CỘT TRÁI: NGƯỜI LẬP BÁO CÁO (QUẢN LÝ PHÒNG VÉ) */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#334155', marginBottom: '2px' }}>
                  {branchName}, ngày {formatDateElements(submittedAt).day} tháng{' '}
                  {formatDateElements(submittedAt).month} năm {formatDateElements(submittedAt).year}
                </div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase' }}>
                  NGƯỜI LẬP BÁO CÁO
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
                  (Ký, ghi rõ họ tên)
                </div>

                {/* Chữ ký tay nét mực bút máy: Nghĩa */}
                <div
                  style={{
                    height: '75px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div
                    style={{
                      fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                      fontSize: '2.5rem',
                      color: '#1d4ed8',
                      transform: 'rotate(-5deg)',
                      userSelect: 'none',
                      lineHeight: 1
                    }}
                  >
                    {getSignatureName(managerName) || 'Nghĩa'}
                  </div>
                  <svg width="105" height="12" viewBox="0 0 105 12" style={{ marginTop: '-4px' }}>
                    <path d="M 5 6 Q 52 1 100 6" stroke="#1d4ed8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  </svg>
                </div>

                <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  {managerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Quản lý Bán vé Chi nhánh</div>
              </div>

              {/* CỘT PHẢI: BAN GIÁM ĐỐC PHÊ DUYỆT (KÈM DẤU MỘC ĐỎ VÀ CHỮ KÝ TAY MỰC XANH) */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#334155', marginBottom: '2px' }}>
                  TP. Hồ Chí Minh, ngày {formatDateElements(reviewedAt || submittedAt).day} tháng{' '}
                  {formatDateElements(reviewedAt || submittedAt).month} năm{' '}
                  {formatDateElements(reviewedAt || submittedAt).year}
                </div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase' }}>
                  BAN GIÁM ĐỐC PHÊ DUYỆT
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
                  (Ký duyệt điện tử &amp; đóng dấu chứng thực)
                </div>

                {status === 'approved' ? (
                  <div
                    style={{
                      height: '75px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Chữ ký tay nét mực bút máy: Bình */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 2
                      }}
                    >
                      <div
                        style={{
                          fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                          fontSize: '2.5rem',
                          color: '#1d4ed8',
                          transform: 'rotate(-6deg)',
                          userSelect: 'none',
                          lineHeight: 1
                        }}
                      >
                        {getSignatureName(directorName) || 'Bình'}
                      </div>
                      <svg width="105" height="12" viewBox="0 0 105 12" style={{ marginTop: '-4px' }}>
                        <path d="M 5 6 Q 52 1 100 6" stroke="#1d4ed8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Dấu mộc tròn đỏ chứng thực điện tử */}
                    <svg
                      width="86"
                      height="86"
                      viewBox="0 0 100 100"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-62%, -50%) rotate(-12deg)',
                        pointerEvents: 'none',
                        opacity: 0.88,
                        zIndex: 1
                      }}
                    >
                      <circle cx="50" cy="50" r="47" stroke="#dc2626" strokeWidth="2" fill="none" />
                      <circle cx="50" cy="50" r="43" stroke="#dc2626" strokeWidth="1" fill="none" />
                      <circle cx="50" cy="50" r="28" stroke="#dc2626" strokeWidth="1" strokeDasharray="2,2" fill="none" />

                      <defs>
                        <path id="sealTopAreaRev" d="M 12,50 A 38,38 0 0,1 88,50" />
                        <path id="sealBottomAreaRev" d="M 88,50 A 38,38 0 0,1 12,50" />
                      </defs>

                      <text fontSize="7" fontWeight="900" fill="#dc2626" letterSpacing="0.4">
                        <textPath href="#sealTopAreaRev" startOffset="50%" textAnchor="middle">
                          CÔNG TY TNHH VẬN TẢI AN BÌNH
                        </textPath>
                      </text>

                      <text fontSize="6.5" fontWeight="700" fill="#dc2626" letterSpacing="0.6">
                        <textPath href="#sealBottomAreaRev" startOffset="50%" textAnchor="middle">
                          ★ MST: 0312345678 ★
                        </textPath>
                      </text>

                      <text x="50" y="47" fontSize="8" fontWeight="900" fill="#dc2626" textAnchor="middle">
                        ĐÃ KÝ DUYỆT
                      </text>
                      <text x="50" y="57" fontSize="6.8" fontWeight="700" fill="#dc2626" textAnchor="middle">
                        ĐIỆN TỬ
                      </text>
                    </svg>
                  </div>
                ) : (
                  <div
                    style={{
                      height: '75px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontStyle: 'italic',
                      fontSize: '0.8rem'
                    }}
                  >
                    (Chờ Ban Giám Đốc thẩm định &amp; ký duyệt)
                  </div>
                )}

                <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  {directorName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tổng Giám Đốc Điều Hành</div>
                {digitalSignature?.certCode && (
                  <div style={{ fontSize: '0.68rem', color: '#15803d', marginTop: '2px', fontWeight: '600' }}>
                    Chứng thực số: {digitalSignature.certCode}
                  </div>
                )}
              </div>
            </div>

            {/* CHÂN TRANG VĂN BẢN */}
            <div
              style={{
                marginTop: '3.5rem',
                paddingTop: '16px',
                borderTop: '1px solid #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#64748b'
              }}
            >
              <div>Báo cáo thống kê doanh thu khu vực - An Bình Lines ERP</div>
              <div>Trang 1/1</div>
            </div>

          </div>
        </div>

        {/* DIALOG XÁC NHẬN PHÊ DUYỆT KÈM Ý KIẾN */}
        {showApproveConfirm && (
          <div
            className="no-print-area"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '1.5rem',
                width: '450px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#15803d' }}>
                Ký Duyệt Quyết Toán Doanh Thu Khu Vực
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 1rem 0' }}>
                Xác nhận phê duyệt báo cáo <strong>{reportCode}</strong> của {branchName}. Hệ thống sẽ đóng mộc điện tử và tạo mã chứng thực số cho văn bản.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>
                  Ý kiến phê duyệt của Giám đốc (tùy chọn):
                </label>
                <textarea
                  value={directorNotes}
                  onChange={(e) => setDirectorNotes(e.target.value)}
                  placeholder="Đã đối soát đầy đủ tiền mặt và sao kê ngân hàng. Duyệt quyết toán..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setShowApproveConfirm(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmApprove}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Đang ký duyệt...' : 'Xác Nhận Ký Duyệt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG XÁC NHẬN TỪ CHỐI BÁO CÁO */}
        {showRejectConfirm && (
          <div
            className="no-print-area"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '1.5rem',
                width: '450px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#dc2626' }}>
                Yêu Cầu Giải Trình / Từ Chối Báo Cáo
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 1rem 0' }}>
                Nhập lý do từ chối để Quản lý phòng vé chi nhánh kiểm tra và nộp lại báo cáo.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>
                  Lý do từ chối / chỉ đạo hiệu chỉnh (*):
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Số tiền mặt chưa khớp với bảng kê nộp quỹ, yêu cầu kiểm tra lại quầy 02..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setShowRejectConfirm(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Đang gửi...' : 'Gửi Yêu Cầu Hiệu Chỉnh'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MonthlyAreaRevenueReportModal;

