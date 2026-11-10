import React, { useState } from 'react';

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
  return parts[parts.length - 1]; // e.g. "Nguyễn Thị Mai" -> "Mai", "Võ Hoàng Nam" -> "Nam"
};

const MonthlyRevenueReportModal = ({
  isOpen,
  onClose,
  report,
  shifts = [],
  canSign = false,
  onSign,
  onReject,
  actionLoading = false
}) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showSignConfirm, setShowSignConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!isOpen || !report) return null;

  const {
    reportCode = '',
    month = 10,
    year = 2026,
    summary = {},
    agentId = {},
    managerId = {},
    status = 'pending',
    agentNotes = '',
    managerNotes = '',
    submittedAt,
    reviewedAt,
    digitalSignature = {}
  } = report;

  const agentName = agentId?.name || 'Nhân viên bán vé';
  const managerName = managerId?.name || digitalSignature?.signerName || 'Quản lý phòng vé';
  const branchName = agentId?.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh';

  const shiftList = (report.shiftIds && report.shiftIds.length > 0 && typeof report.shiftIds[0] === 'object')
    ? report.shiftIds
    : shifts;

  const totalRev = (summary.cashRevenue || 0) + (summary.cashlessRevenue || 0);
  const cashRate = totalRev > 0 ? Math.round(((summary.cashRevenue || 0) / totalRev) * 100) : 0;
  const cashlessRate = totalRev > 0 ? (100 - cashRate) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmSign = async () => {
    if (onSign) {
      await onSign(approvalNotes);
      setShowSignConfirm(false);
    }
  };

  const handleConfirmReject = async () => {
    if (onReject) {
      if (!rejectNotes.trim()) {
        alert('Vui lòng nhập lý do từ chối để nhân viên điều chỉnh.');
        return;
      }
      await onReject(rejectNotes);
      setShowRejectConfirm(false);
    }
  };

  return (
    <div
      className="report-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1200,
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .report-printable-area, .report-printable-area * {
            visibility: visible !important;
          }
          .report-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm 20mm !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
        .report-custom-table th, .report-custom-table td {
          border: 1px solid #1e293b;
          padding: 5px 8px;
          font-size: 0.82rem;
        }
      `}</style>

      <div
        className="report-modal-container"
        style={{
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          width: '950px',
          maxWidth: '98vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* THANH CÔNG CỤ SAP CRYSTAL REPORTS */}
        <div
          className="no-print"
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
            <span
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}
            >
              SAP CRYSTAL REPORTS
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>
              Mã hồ sơ: {reportCode || `BC-DT-${year}${month}`}
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
                CHỜ QUẢN LÝ DUYỆT
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
            {canSign && status !== 'approved' && (
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
                  onClick={() => setShowSignConfirm(true)}
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
                  Ký Duyệt Điện Tử
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div
            className="report-printable-area"
            style={{
              backgroundColor: '#ffffff',
              width: '850px',
              minHeight: '1100px',
              padding: '24mm 20mm',
              color: '#0f172a',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontFamily: '"Times New Roman", Times, serif',
              position: 'relative',
              fontSize: '0.88rem',
              lineHeight: 1.45
            }}
          >
            {/* HEADER CÔNG TY */}
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
                  Hệ thống Quản lý Vận tải &amp; Bán vé Liên tỉnh Toàn quốc
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  Trụ sở: 395 Kinh Dương Vương, An Lạc, Bình Tân, TP. Hồ Chí Minh
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  Hotline: 1900 6067 | Website: https://anbinhlines.vn | MST: 0312345678
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                  Mã hồ sơ: <span style={{ color: '#1e3a8a' }}>{reportCode || `BC-DT-${year}${month}`}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                  Ngày lập: {formatDate(submittedAt)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Kỳ kiểm toán: Hàng tháng</div>
              </div>
            </div>

            {/* TIÊU ĐỀ BÁO CÁO */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#0f172a'
                }}
              >
                BÁO CÁO TỔNG HỢP DOANH THU BÁN VÉ THÁNG
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1d4ed8', marginTop: '3px' }}>
                KỲ BÁO CÁO: THÁNG {month} / NĂM {year}
              </div>
            </div>

            {/* THÔNG TIN HỒ SƠ & NHÂN VIÊN */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 24px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                marginBottom: '1.25rem',
                fontSize: '0.82rem'
              }}
            >
              <div>
                <strong>Nhân viên bán vé:</strong> {agentName}
              </div>
              <div>
                <strong>Đơn vị / Chi nhánh:</strong> {branchName}
              </div>
              <div>
                <strong>Quản lý phòng vé tiếp nhận:</strong> {managerName}
              </div>
              <div>
                <strong>Thời gian nộp:</strong> {formatDateTime(submittedAt)}
              </div>
              <div>
                <strong>Trạng thái hồ sơ:</strong>{' '}
                {status === 'approved' ? (
                  <span style={{ color: '#16a34a', fontWeight: '700' }}>ĐÃ KÝ DUYỆT ĐIỆN TỬ</span>
                ) : status === 'pending' ? (
                  <span style={{ color: '#d97706', fontWeight: '700' }}>CHỜ DUYỆT</span>
                ) : (
                  <span style={{ color: '#dc2626', fontWeight: '700' }}>TỪ CHỐI / CẦN ĐIỀU CHỈNH</span>
                )}
              </div>
              <div>
                <strong>Thời điểm duyệt:</strong> {reviewedAt ? formatDateTime(reviewedAt) : 'Chưa duyệt'}
              </div>
            </div>

            {/* PHẦN 1: TỔNG HỢP DÒNG TIỀN VÀ SỐ LƯỢNG VÉ */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                1. TỔNG HỢP DÒNG TIỀN &amp; HIỆU SUẤT BÁN VÉ TRONG THÁNG
              </div>
              <table className="report-custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '800' }}>
                    <th style={{ width: '35px', textAlign: 'center' }}>STT</th>
                    <th>Chỉ tiêu tổng hợp dòng tiền</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ width: '135px', textAlign: 'right' }}>Giá trị thực tế</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Tỷ lệ (%)</th>
                    <th>Ghi chú nghiệp vụ đối soát</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td>Tổng số ca trực đã hoàn thành trong tháng</td>
                    <td style={{ textAlign: 'center' }}>Ca</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{summary.totalShifts || 0}</td>
                    <td style={{ textAlign: 'center' }}>100%</td>
                    <td>Số ca đã chốt đóng két thành công</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center' }}>2</td>
                    <td>Tổng số vé đã phát hành &amp; bán ra</td>
                    <td style={{ textAlign: 'center' }}>Vé</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{summary.totalTickets || 0}</td>
                    <td style={{ textAlign: 'center' }}>--</td>
                    <td>Vé hành khách đã thanh toán</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center' }}>3</td>
                    <td>Tiền mặt thu tại quầy vé</td>
                    <td style={{ textAlign: 'center' }}>VNĐ</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f766e' }}>
                      {formatCurrency(summary.cashRevenue)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '700', color: '#0f766e' }}>{cashRate}%</td>
                    <td>Đã đối soát khớp và bàn giao quỹ</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center' }}>4</td>
                    <td>Thanh toán chuyển khoản / Quét mã VietQR</td>
                    <td style={{ textAlign: 'center' }}>VNĐ</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#1d4ed8' }}>
                      {formatCurrency(summary.cashlessRevenue)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '700', color: '#1d4ed8' }}>{cashlessRate}%</td>
                    <td>Chuyển khoản trực tiếp vào tài khoản công ty</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td style={{ textAlign: 'center', fontWeight: '800' }}>5</td>
                    <td style={{ fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
                      TỔNG DOANH THU BÁN VÉ THÁNG
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#166534' }}>VNĐ</td>
                    <td style={{ textAlign: 'right', fontWeight: '900', color: '#166534', fontSize: '0.92rem' }}>
                      {formatCurrency(summary.totalRevenue)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#166534' }}>100%</td>
                    <td style={{ fontWeight: '700', color: '#166534' }}>Căn cứ tính doanh thu nhân viên</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PHẦN 2: BẢNG KÊ CHI TIẾT CÁC CA TRỰC TRONG THÁNG */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                2. BẢNG KÊ CHI TIẾT CÁC CA TRỰC TRONG THÁNG ({shiftList.length} ca trực)
              </div>
              <table className="report-custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '800' }}>
                    <th style={{ width: '35px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '85px', textAlign: 'center' }}>Ngày trực</th>
                    <th>Quầy vé / Điểm làm việc</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Số vé</th>
                    <th style={{ width: '105px', textAlign: 'right' }}>Tiền mặt (VNĐ)</th>
                    <th style={{ width: '105px', textAlign: 'right' }}>Chuyển khoản (VNĐ)</th>
                    <th style={{ width: '115px', textAlign: 'right' }}>Tổng ca (VNĐ)</th>
                    <th style={{ width: '85px', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '1rem', fontStyle: 'italic', color: '#64748b' }}>
                        Không có ca trực nào trong kỳ báo cáo này
                      </td>
                    </tr>
                  ) : (
                    shiftList.map((s, idx) => {
                      const shiftTotal = (s.cashRevenue || 0) + (s.cashlessRevenue || 0);
                      const shiftTickets = s.ticketsSold?.length || 0;
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ textAlign: 'center', fontSize: '0.78rem' }}>{formatDate(s.startTime)}</td>
                          <td>
                            <div style={{ fontWeight: '700' }}>{s.counterNumber || 'Quầy vé'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.officeName || branchName}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>{shiftTickets}</td>
                          <td style={{ textAlign: 'right' }}>{(s.cashRevenue || 0).toLocaleString('vi-VN')}</td>
                          <td style={{ textAlign: 'right' }}>{(s.cashlessRevenue || 0).toLocaleString('vi-VN')}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e3a8a' }}>
                            {shiftTotal.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                            {s.reconciliationStatus === 'verified' ? (
                              <span style={{ color: '#15803d', fontWeight: '700' }}>Đã đối soát</span>
                            ) : (
                              <span style={{ color: '#475569' }}>Hoàn thành</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PHẦN 3: GHI CHÚ GIẢI TRÌNH CỦA NHÂN VIÊN */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                3. GHI CHÚ / GIẢI TRÌNH CỦA NHÂN VIÊN BÁN VÉ
              </div>
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '0.65rem 0.85rem',
                  minHeight: '40px',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff',
                  fontStyle: agentNotes ? 'normal' : 'italic',
                  color: agentNotes ? '#0f172a' : '#64748b'
                }}
              >
                {agentNotes || 'Số liệu doanh thu và số vé phát hành khớp đúng toàn bộ, không có chênh lệch tồn đọng.'}
              </div>
            </div>

            {/* PHẦN 4: Ý KIẾN / ĐÁNH GIÁ CỦA QUẢN LÝ PHÒNG VÉ */}
            {managerNotes && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                  4. Ý KIẾN / ĐÁNH GIÁ CỦA QUẢN LÝ PHÒNG VÉ
                </div>
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '0.65rem 0.85rem',
                    minHeight: '40px',
                    fontSize: '0.82rem',
                    backgroundColor: status === 'rejected' ? '#fef2f2' : '#f0fdf4',
                    color: status === 'rejected' ? '#991b1b' : '#166534'
                  }}
                >
                  {managerNotes}
                </div>
              </div>
            )}

            {/* PHẦN 5: CHỮ KÝ XÁC NHẬN & PHÊ DUYỆT ĐIỆN TỬ */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                marginTop: '1.5rem',
                pageBreakInside: 'avoid',
                alignItems: 'start'
              }}
            >
              {/* CỘT TRÁI: NHÂN VIÊN BÁN VÉ */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '1.25rem' }}></div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase' }}>
                  NHÂN VIÊN BÁN VÉ
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
                  (Ký, ghi rõ họ tên &amp; cam đoan trung thực)
                </div>

                <div
                  style={{
                    height: '75px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
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
                      {getSignatureName(agentName) || 'Mai'}
                    </div>
                    <svg width="105" height="12" viewBox="0 0 105 12" style={{ marginTop: '-4px' }}>
                      <path d="M 5 6 Q 52 1 100 6" stroke="#1d4ed8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  {agentName}
                </div>
              </div>

              {/* CỘT PHẢI: QUẢN LÝ PHÒNG VÉ DUYỆT */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#334155', marginBottom: '2px' }}>
                  TP. Hồ Chí Minh, ngày {formatDateElements(reviewedAt || submittedAt).day} tháng{' '}
                  {formatDateElements(reviewedAt || submittedAt).month} năm{' '}
                  {formatDateElements(reviewedAt || submittedAt).year}
                </div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase' }}>
                  QUẢN LÝ PHÒNG VÉ
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
                  (Ký duyệt điện tử &amp; đóng dấu chứng thực)
                </div>

                {digitalSignature.isSigned ? (
                  <div
                    style={{
                      height: '75px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Chữ ký tay nét ký tên: Nam */}
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
                        {getSignatureName(digitalSignature.signerName || managerName) || 'Nam'}
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
                        <path id="sealTopRev" d="M 12,50 A 38,38 0 0,1 88,50" />
                        <path id="sealBottomRev" d="M 88,50 A 38,38 0 0,1 12,50" />
                      </defs>

                      <text fontSize="7" fontWeight="900" fill="#dc2626" letterSpacing="0.4">
                        <textPath href="#sealTopRev" startOffset="50%" textAnchor="middle">
                          CÔNG TY TNHH VẬN TẢI AN BÌNH
                        </textPath>
                      </text>

                      <text fontSize="6.5" fontWeight="700" fill="#dc2626" letterSpacing="0.6">
                        <textPath href="#sealBottomRev" startOffset="50%" textAnchor="middle">
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
                      fontStyle: 'italic'
                    }}
                  >
                    (Chờ Quản lý phòng vé thẩm định &amp; ký duyệt)
                  </div>
                )}

                <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  {digitalSignature.signerName || managerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Quản lý phòng vé</div>
                {digitalSignature.certCode && (
                  <div style={{ fontSize: '0.68rem', color: '#15803d', marginTop: '2px', fontWeight: '600' }}>
                    Chứng thực số: {digitalSignature.certCode}
                  </div>
                )}
              </div>
            </div>

            {/* CHÂN TRANG VĂN BẢN */}
            <div
              style={{
                position: 'absolute',
                bottom: '15mm',
                left: '20mm',
                right: '20mm',
                borderTop: '1px solid #cbd5e1',
                paddingTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#64748b'
              }}
            >
              <div>Báo cáo doanh thu bán vé hàng tháng - An Bình Lines ERP</div>
              <div>Trang 1 / 1</div>
            </div>
          </div>
        </div>

        {/* MODAL XÁC NHẬN KÝ DUYỆT CỦA QUẢN LÝ */}
        {showSignConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '1.5rem',
                borderRadius: '8px',
                width: '450px',
                maxWidth: '90vw'
              }}
            >
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#166534', fontSize: '1.1rem' }}>
                Xác nhận Ký Duyệt Điện Tử
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '1rem', lineHeight: 1.4 }}>
                Bạn đang thực hiện ký duyệt điện tử và đóng mộc chứng thực cho{' '}
                <strong>Báo cáo doanh thu Tháng {month}/{year}</strong> của nhân viên <strong>{agentName}</strong>. Tổng
                doanh thu: <strong>{formatCurrency(summary.totalRevenue)}</strong>.
              </p>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px' }}>
                Ghi chú / Nhận xét của Quản lý:
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Đã đối soát khớp đúng toàn bộ ca trực và quỹ tiền mặt bàn giao..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setShowSignConfirm(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmSign}
                  disabled={actionLoading}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
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

        {/* MODAL XÁC NHẬN TỪ CHỐI */}
        {showRejectConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '1.5rem',
                borderRadius: '8px',
                width: '450px',
                maxWidth: '90vw'
              }}
            >
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#dc2626', fontSize: '1.1rem' }}>
                Từ Chối / Yêu Cầu Giải Trình Lại
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '1rem', lineHeight: 1.4 }}>
                Nhập lý do từ chối để nhân viên <strong>{agentName}</strong> điều chỉnh lại số liệu hoặc bổ sung giải
                trình:
              </p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Nhập lý do từ chối (bắt buộc)..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setShowRejectConfirm(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={actionLoading}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Từ Chối'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyRevenueReportModal;

