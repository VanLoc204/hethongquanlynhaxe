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
  return parts[parts.length - 1]; // e.g. "Phạm Minh Tuấn" -> "Tuấn", "Nguyễn An Bình" -> "Bình"
};

const MonthlyFleetExpenseReportModal = ({
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
    month = 11,
    year = 2026,
    fleetManagerId = {},
    summary = {},
    busDetails = [],
    maintenanceRecords = [],
    fleetManagerNotes = '',
    status = 'pending',
    directorId = {},
    directorNotes: existingDirectorNotes = '',
    submittedAt,
    reviewedAt,
    digitalSignature = {}
  } = report;

  const managerName = fleetManagerId?.name || 'Phạm Minh Tuấn';
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
        .fleet-report-table th, .fleet-report-table td {
          border: 1px solid #1e293b;
          padding: 6px 10px;
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
        {/* THANH CÔNG CỤ SAP CRYSTAL REPORTS CHUẨN ĐỒNG BỘ */}
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
              Mã hồ sơ: {reportCode || `BCCT-${year}${month}`}
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
            {/* HEADER CÔNG TY (ĐỒNG BỘ 100% VỚI HỆ THỐNG) */}
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
                  Ban Kỹ thuật &amp; Quản lý Phương tiện
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  Trụ sở: 395 Kinh Dương Vương, An Lạc, Bình Tân, TP. Hồ Chí Minh
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                <div>Mã biểu mẫu: <strong>BM-KT-09/AB</strong></div>
                <div>Ban hành: <strong>01/01/2026</strong></div>
                <div>Lưu trữ: <strong>Ban Kỹ thuật &amp; Kế toán</strong></div>
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
                BÁO CÁO TỔNG HỢP CHI PHÍ VẬN HÀNH &amp; BẢO TRÌ ĐỘI XE
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e3a8a' }}>
                Kỳ Báo Cáo: Tháng {String(month).padStart(2, '0')} Năm {year}
              </div>
              <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>
                (Tổng hợp quyết toán công nợ gara bảo dưỡng, tiêu hao nhiên liệu &amp; tỷ lệ sẵn sàng phương tiện)
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
                <div style={{ marginTop: '2px' }}>Chức vụ: <strong>Quản lý Đội xe</strong></div>
                <div style={{ marginTop: '2px' }}>Đơn vị: <strong>Ban Kỹ thuật &amp; Phương tiện</strong></div>
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

            {/* PHẦN 1: BẢNG TỔNG HỢP CHI PHÍ CỐT LÕI */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.92rem', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                I. BẢNG TỔNG HỢP CHI PHÍ VẬN HÀNH THÁNG {month}/{year}
              </div>
              <table className="fleet-report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '55%', fontWeight: '600' }}>
                      1. Chi phí Bảo trì &amp; Sửa chữa Phương tiện (Gara):
                    </td>
                    <td style={{ fontWeight: '800', textAlign: 'right', color: '#b91c1c' }}>
                      {formatCurrency(summary.totalMaintenanceCost)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>
                      2. Chi phí Tiêu hao Nhiên liệu (Dầu Diesel DO):
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', fontWeight: 'normal' }}>
                        ({(summary.totalFuelLiters || 0).toLocaleString('vi-VN')} lít × {(summary.fuelUnitPrice || 21500).toLocaleString('vi-VN')} đ/lít)
                      </div>
                    </td>
                    <td style={{ fontWeight: '800', textAlign: 'right', color: '#d97706' }}>
                      {formatCurrency(summary.totalFuelCost)}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #0f172a' }}>
                    <td style={{ fontWeight: '900', color: '#166534', fontSize: '0.92rem' }}>
                      TỔNG CHI PHÍ ĐỘI XE THÁNG {month}/{year}:
                    </td>
                    <td style={{ fontWeight: '900', textAlign: 'right', color: '#15803d', fontSize: '1.05rem' }}>
                      {formatCurrency(summary.totalExpenses)}
                    </td>
                  </tr>
                  <tr style={{ fontSize: '0.78rem', color: '#475569' }}>
                    <td>Tổng quãng đường lăn bánh toàn đội xe:</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>
                      {(summary.totalDistanceKm || 0).toLocaleString('vi-VN')} km
                    </td>
                  </tr>
                  <tr style={{ fontSize: '0.78rem', color: '#475569' }}>
                    <td>Tỷ lệ phương tiện sẵn sàng hoạt động (Availability):</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                      {summary.availabilityRate || 100}% ({summary.readyBusesCount || 0} xe sẵn sàng / {summary.maintenanceBusesCount || 0} xe xưởng)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PHẦN 2: CHI TIẾT THEO TỪNG XE */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.92rem', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                II. CHI TIẾT CHI PHÍ &amp; QUÃNG ĐƯỜNG LĂN BÁNH THEO TỪNG XE ({busDetails.length} xe)
              </div>
              <table className="fleet-report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'center', fontWeight: '800' }}>
                    <th style={{ width: '35px' }}>#</th>
                    <th>BIỂN SỐ</th>
                    <th>LOẠI XE</th>
                    <th style={{ width: '65px' }}>CHUYẾN</th>
                    <th>QUÃNG ĐƯỜNG</th>
                    <th>TIỀN DẦU DO</th>
                    <th>TIỀN SỬA CHỮA</th>
                    <th>TỔNG CỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {busDetails.map((bus, idx) => (
                    <tr key={bus.busId || idx}>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ fontWeight: '800', textAlign: 'center' }}>{bus.plateNumber}</td>
                      <td>{bus.busType}</td>
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>{bus.tripsCount || 0}</td>
                      <td style={{ textAlign: 'right' }}>{(bus.distanceKm || 0).toLocaleString('vi-VN')} km</td>
                      <td style={{ textAlign: 'right', color: '#d97706' }}>{formatCurrency(bus.fuelCost)}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(bus.maintenanceCost)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '800' }}>
                        {formatCurrency((bus.fuelCost || 0) + (bus.maintenanceCost || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PHẦN 3: BẢNG KÊ QUYẾT TOÁN GARA BẢO TRÌ */}
            {maintenanceRecords.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: '800', fontSize: '0.92rem', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                  III. BẢNG KÊ QUYẾT TOÁN CÔNG NỢ GARA BẢO TRÌ ({maintenanceRecords.length} phiếu)
                </div>
                <table className="fleet-report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'center', fontWeight: '800' }}>
                      <th style={{ width: '80px' }}>NGÀY</th>
                      <th style={{ width: '90px' }}>XE</th>
                      <th>GARA TIẾP NHẬN</th>
                      <th>HẠNG MỤC SỬA CHỮA / BẢO DƯỠNG</th>
                      <th style={{ width: '115px' }}>SỐ TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceRecords.map((m, idx) => (
                      <tr key={m.recordId || idx}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{formatDate(m.date)}</td>
                        <td style={{ fontWeight: '700', textAlign: 'center' }}>{m.plateNumber}</td>
                        <td>{m.garage}</td>
                        <td>{m.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#b91c1c' }}>
                          {formatCurrency(m.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ghi chú của Quản lý Đội xe */}
            {fleetManagerNotes && (
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                  backgroundColor: '#f8fafc'
                }}
              >
                <strong>Giải trình từ Quản lý Đội xe:</strong> {fleetManagerNotes}
              </div>
            )}

            {/* Ý kiến của Giám đốc (nếu có) */}
            {existingDirectorNotes && (
              <div
                style={{
                  border: '1px solid #bbf7d0',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  marginBottom: '1.25rem',
                  backgroundColor: '#f0fdf4',
                  color: '#166534'
                }}
              >
                <strong>Ý kiến phê duyệt của Ban Giám Đốc:</strong> {existingDirectorNotes}
              </div>
            )}

            {/* CHỮ KÝ XÁC NHẬN CHUẨN ĐỒNG BỘ 100% VỚI HỆ THỐNG */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                marginTop: '1.5rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed #cbd5e1'
              }}
            >
              {/* CỘT TRÁI: NGƯỜI LẬP BÁO CÁO (QUẢN LÝ ĐỘI XE) */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#334155', marginBottom: '2px' }}>
                  TP. Hồ Chí Minh, ngày {formatDateElements(submittedAt).day} tháng{' '}
                  {formatDateElements(submittedAt).month} năm {formatDateElements(submittedAt).year}
                </div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase' }}>
                  NGƯỜI LẬP BÁO CÁO
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
                  (Ký, ghi rõ họ tên)
                </div>

                {/* Chữ ký tay nét mực bút máy: Tuấn */}
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
                    {getSignatureName(managerName) || 'Tuấn'}
                  </div>
                  <svg width="105" height="12" viewBox="0 0 105 12" style={{ marginTop: '-4px' }}>
                    <path d="M 5 6 Q 52 1 100 6" stroke="#1d4ed8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  </svg>
                </div>

                <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  {managerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Quản lý Đội xe</div>
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
                        <path id="sealTopFleet" d="M 12,50 A 38,38 0 0,1 88,50" />
                        <path id="sealBottomFleet" d="M 88,50 A 38,38 0 0,1 12,50" />
                      </defs>

                      <text fontSize="7" fontWeight="900" fill="#dc2626" letterSpacing="0.4">
                        <textPath href="#sealTopFleet" startOffset="50%" textAnchor="middle">
                          CÔNG TY TNHH VẬN TẢI AN BÌNH
                        </textPath>
                      </text>

                      <text fontSize="6.5" fontWeight="700" fill="#dc2626" letterSpacing="0.6">
                        <textPath href="#sealBottomFleet" startOffset="50%" textAnchor="middle">
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
              <div>Báo cáo chi phí vận hành &amp; bảo trì đội xe - An Bình Lines ERP</div>
              <div>Trang 1 / 1</div>
            </div>
          </div>
        </div>

        {/* MODAL XÁC NHẬN DUYỆT CỦA GIÁM ĐỐC */}
        {showApproveConfirm && (
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
                Xác nhận Ký Duyệt Quyết Toán
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '1rem', lineHeight: 1.4 }}>
                Bạn đang thực hiện ký duyệt điện tử và đóng mộc chứng thực cho{' '}
                <strong>Báo cáo chi tiêu Tháng {month}/{year}</strong> của Quản lý Đội xe <strong>{managerName}</strong>. Tổng
                chi phí quyết toán: <strong>{formatCurrency(summary.totalExpenses)}</strong>.
              </p>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px' }}>
                Ý kiến chỉ đạo / Nhận xét của Ban Giám Đốc:
              </label>
              <textarea
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                placeholder="Đã đối soát đầy đủ hóa đơn gara và định mức dầu. Duyệt quyết toán giải ngân..."
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
                  onClick={() => setShowApproveConfirm(false)}
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
                  onClick={handleConfirmApprove}
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
                  {actionLoading ? 'Đang duyệt...' : 'Xác Nhận Ký Duyệt'}
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
                Nhập lý do từ chối để Quản lý Đội xe <strong>{managerName}</strong> điều chỉnh lại số liệu hoặc bổ sung giải trình:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
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

export default MonthlyFleetExpenseReportModal;
