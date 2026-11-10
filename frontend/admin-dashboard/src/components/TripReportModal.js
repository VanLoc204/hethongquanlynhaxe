import React, { useState } from 'react';

const TripReportModal = ({
  isOpen,
  onClose,
  report,
  canSign = false,
  onSign,
  signingLoading = false
}) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showSignConfirm, setShowSignConfirm] = useState(false);

  if (!isOpen || !report) return null;

  const {
    reportCode,
    routeInfo = {},
    submissionType,
    submittedAt,
    notes,
    stats = {},
    passengers = [],
    approvalStatus,
    approvedAt,
    digitalSignature = {}
  } = report;

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

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
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
    return parts[parts.length - 1]; // e.g. "Phạm Quốc Bảo" -> "Bảo", "Lê Trọng Nghĩa" -> "Nghĩa"
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmSign = async () => {
    if (onSign) {
      await onSign(approvalNotes);
      setShowSignConfirm(false);
    }
  };

  return (
    <div className="report-modal-backdrop" style={{
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
    }}>
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
            padding: 10mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
        }
        .report-custom-table th, .report-custom-table td {
          border: 1px solid #334155;
          padding: 6px 8px;
          font-size: 0.78rem;
        }
      `}</style>

      {/* Main Container */}
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: '800',
              letterSpacing: '0.5px'
            }}>
              ERP REPORT
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
              Mã hồ sơ: {reportCode}
            </span>
            {approvalStatus === 'approved' ? (
              <span style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: '700'
              }}>
                ĐÃ KÝ DUYỆT ĐIỆN TỬ
              </span>
            ) : (
              <span style={{
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: '700'
              }}>
                CHỜ KÝ DUYỆT
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {canSign && approvalStatus !== 'approved' && !showSignConfirm && (
              <button
                type="button"
                onClick={() => setShowSignConfirm(true)}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Ký Duyệt Bằng Chữ Ký Điện Tử
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              In Báo Cáo (A4)
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#334155',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Digital Signature Confirmation Banner (If Ops Manager clicks Sign) */}
        {showSignConfirm && (
          <div className="no-print" style={{
            backgroundColor: '#f0fdf4',
            borderBottom: '2px solid #86efac',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontWeight: '800', color: '#166534', fontSize: '0.88rem' }}>
              Xác nhận ký duyệt điện tử và chốt quyết toán chuyến xe
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d' }}>
              Khi xác nhận, hệ thống sẽ sinh mã băm bảo mật SHA-256 kèm mã chứng thư số có giá trị pháp lý nội bộ để đóng dấu niêm phong dữ liệu chuyến xe.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="Nhập ghi chú phê duyệt (tùy chọn)..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #86efac',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleConfirmSign}
                disabled={signingLoading}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontWeight: '800',
                  fontSize: '0.8rem',
                  cursor: signingLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {signingLoading ? 'Đang đóng dấu...' : 'Ký Duyệt Ngay'}
              </button>
              <button
                type="button"
                onClick={() => setShowSignConfirm(false)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Document Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem 2.5rem',
          backgroundColor: '#f8fafc'
        }}>
          {/* A4 Paper Document Container */}
          <div className="report-printable-area" style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '2.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            fontFamily: '"Times New Roman", Times, serif',
            color: '#0f172a',
            lineHeight: 1.4
          }}>

            {/* HEADER: LOGO & COMPANY INFO (Crystal Reports Format) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '1rem',
              marginBottom: '1.25rem'
            }}>
              {/* Left Brand */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{
                  backgroundColor: '#1e3a8a',
                  color: '#ffffff',
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '1.4rem',
                  letterSpacing: '1px'
                }}>
                  AB
                </div>
                <div>
                  <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#1e3a8a', textTransform: 'uppercase' }}>
                    CÔNG TY TNHH VẬN TẢI AN BÌNH - AN BÌNH LINES
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    Địa chỉ: Bến xe Miền Tây, 395 Kinh Dương Vương, P. An Lạc, Q. Bình Tân, TP. HCM
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    Điện thoại: 1900 6067 - Hotline: 0912 345 678 | Email: vanhanh@anbinhlines.vn
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    Website: www.anbinhlines.vn
                  </div>
                </div>
              </div>

              {/* Right Tax Code */}
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#1e293b' }}>
                <div>Mã số thuế: <strong>0312345678</strong></div>
              </div>
            </div>

            {/* TITLE */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{
                fontSize: '1.35rem',
                fontWeight: '900',
                textTransform: 'uppercase',
                margin: '0 0 4px 0',
                letterSpacing: '0.5px',
                color: '#0f172a'
              }}>
                BÁO CÁO THỐNG KÊ HÀNH KHÁCH CHUYẾN XE
              </h1>
              <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#475569' }}>
                (Bảng kê đối soát hành khách thực tế lên xe &amp; Quyết toán vận hành tuyến)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '4px' }}>
                Ngày lập báo cáo: <strong>{formatDate(submittedAt)}</strong> - Giờ lập: <strong>{formatTimeOnly(submittedAt)}</strong>
              </div>
            </div>

            {/* METADATA SUMMARY GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 24px',
              fontSize: '0.82rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                Số hồ sơ báo cáo: <strong>{reportCode}</strong>
              </div>
              <div>
                Hình thức nộp: <strong>
                  {submissionType === 'auto_midnight' ? 'Hệ thống tự động chốt (00:00)' : 'Phụ xe gửi sau chuyến đi'}
                </strong>
              </div>
              <div>
                Tuyến vận tải: <strong>{routeInfo.routeName || `${routeInfo.startPoint} - ${routeInfo.endPoint}`}</strong>
              </div>
              <div>
                Biển số kiểm soát: <strong>{routeInfo.plateNumber}</strong> ({routeInfo.busType || 'Ghế ngồi/Giường nằm'})
              </div>
              <div>
                Giờ xuất bến thực tế: <strong>{formatDateTime(routeInfo.departureTime)}</strong>
              </div>
              <div>
                Giờ cập bến dự kiến: <strong>{formatDateTime(routeInfo.arrivalTime)}</strong>
              </div>
              <div>
                Tài xế phụ trách: <strong>{routeInfo.driverName || 'Chưa cập nhật'}</strong>
              </div>
              <div>
                Nhân viên phụ xe: <strong>{routeInfo.assistantName || 'Chưa cập nhật'}</strong>
              </div>
            </div>

            {/* SECTION 1: KPI CHUYẾN XE */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                1. TỔNG HỢP CHỈ SỐ VẬN HÀNH (KPI CHUYẾN XE)
              </div>
              <table className="report-custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '800' }}>
                    <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                    <th>Chỉ số vận hành</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Quy chuẩn / ĐVT</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Số lượng thực tế</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Tỷ lệ (%)</th>
                    <th>Ghi chú nghiệp vụ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td>Tổng số ghế thiết kế trên xe</td>
                    <td style={{ textAlign: 'center' }}>Ghế</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>{stats.totalSeats || 16}</td>
                    <td style={{ textAlign: 'center' }}>100%</td>
                    <td>Sức chứa quy định đăng kiểm</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'center' }}>2</td>
                    <td>Tổng số vé đã đặt (Booking xác nhận)</td>
                    <td style={{ textAlign: 'center' }}>Vé</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>{stats.totalBooked}</td>
                    <td style={{ textAlign: 'center' }}>
                      {stats.totalSeats ? Math.round((stats.totalBooked / stats.totalSeats) * 100) : 0}%
                    </td>
                    <td>Hệ thống phòng vé &amp; online ghi nhận</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td style={{ textAlign: 'center' }}>3</td>
                    <td style={{ fontWeight: '700', color: '#166534' }}>Hành khách thực tế lên xe</td>
                    <td style={{ textAlign: 'center' }}>Hành khách</td>
                    <td style={{ textAlign: 'center', fontWeight: '900', color: '#166534', fontSize: '0.88rem' }}>
                      {stats.totalBoarded}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '700', color: '#166534' }}>
                      {stats.occupancyRate}%
                    </td>
                    <td style={{ color: '#166534' }}>Đã quét QR / soát vé thực tế trên xe</td>
                  </tr>
                  <tr style={{ backgroundColor: stats.totalNoShow > 0 ? '#fffbeb' : '#ffffff' }}>
                    <td style={{ textAlign: 'center' }}>4</td>
                    <td style={{ color: stats.totalNoShow > 0 ? '#b45309' : '#334155' }}>
                      Hành khách vắng mặt (No-show)
                    </td>
                    <td style={{ textAlign: 'center' }}>Hành khách</td>
                    <td style={{ textAlign: 'center', fontWeight: '700', color: stats.totalNoShow > 0 ? '#b45309' : '#334155' }}>
                      {stats.totalNoShow}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {stats.totalBooked ? Math.round((stats.totalNoShow / stats.totalBooked) * 100) : 0}%
                    </td>
                    <td>Khách không có mặt trước giờ xuất bến</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 2: BẢNG KÊ CHI TIẾT HÀNH KHÁCH */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                2. BẢNG KÊ CHI TIẾT HÀNH KHÁCH THEO VỊ TRÍ GHẾ NGỒI ({passengers.length} khách)
              </div>
              <table className="report-custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '800' }}>
                    <th style={{ width: '35px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Vị trí ghế</th>
                    <th>Họ và tên hành khách</th>
                    <th style={{ width: '95px' }}>Số điện thoại</th>
                    <th style={{ width: '110px' }}>Số CCCD / ĐD</th>
                    <th>Điểm đón (Pickup)</th>
                    <th>Điểm trả (Dropoff)</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Giờ lên</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '1rem', fontStyle: 'italic', color: '#64748b' }}>
                        Chưa có dữ liệu hành khách đặt vé cho chuyến đi này
                      </td>
                    </tr>
                  ) : (
                    passengers.map((p, idx) => (
                      <tr key={idx} style={{ backgroundColor: p.boarded ? '#ffffff' : '#fffbeb' }}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'center', fontWeight: '800', color: p.boarded ? '#1e3a8a' : '#b45309' }}>
                          {p.seats?.join(', ') || '--'}
                        </td>
                        <td style={{ fontWeight: '700' }}>{p.customerName}</td>
                        <td>{p.customerPhone}</td>
                        <td style={{ fontSize: '0.72rem' }}>{p.customerCCCD || '--'}</td>
                        <td style={{ fontSize: '0.75rem' }}>{p.pickup}</td>
                        <td style={{ fontSize: '0.75rem' }}>{p.dropoff}</td>
                        <td style={{ textAlign: 'center', fontSize: '0.72rem' }}>
                          {p.boardedAt ? formatTimeOnly(p.boardedAt) : '--'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {p.boarded ? (
                            <span style={{ fontWeight: '700', color: '#15803d', fontSize: '0.72rem' }}>
                              Đã lên xe
                            </span>
                          ) : (
                            <span style={{ fontWeight: '700', color: '#b45309', fontSize: '0.72rem' }}>
                              Vắng mặt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SECTION 3: GHI CHÚ CỦA PHỤ XE */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                3. GHI CHÚ / Ý KIẾN CỦA NHÂN VIÊN PHỤ XE
              </div>
              <div style={{
                border: '1px solid #cbd5e1',
                padding: '0.65rem 0.85rem',
                minHeight: '45px',
                fontSize: '0.8rem',
                backgroundColor: '#ffffff',
                fontStyle: notes ? 'normal' : 'italic',
                color: notes ? '#0f172a' : '#64748b'
              }}>
                {notes || 'Không có ghi chú hay sự cố phát sinh trong suốt hành trình.'}
              </div>
            </div>

            {/* SECTION 4: CHỮ KÝ XÁC NHẬN & CHỨNG THỰC ĐIỆN TỬ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginTop: '1.5rem',
              pageBreakInside: 'avoid',
              alignItems: 'start'
            }}>
              {/* CỘT TRÁI: NHÂN VIÊN PHỤ XE */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '1.25rem' }}></div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase' }}>
                  NHÂN VIÊN PHỤ XE
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
                  (Ký, ghi rõ họ tên)
                </div>

                <div style={{
                  height: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                      fontSize: '2.5rem',
                      color: '#1d4ed8',
                      transform: 'rotate(-6deg)',
                      userSelect: 'none',
                      lineHeight: 1
                    }}>
                      {getSignatureName(routeInfo.assistantName) || 'Bảo'}
                    </div>
                    <svg width="105" height="12" viewBox="0 0 105 12" style={{ marginTop: '-4px' }}>
                      <path d="M 5 6 Q 52 1 100 6" stroke="#1d4ed8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  {routeInfo.assistantName || 'Phạm Quốc Bảo'}
                </div>
              </div>

              {/* CỘT PHẢI: QUẢN LÝ VẬN TẢI DUYỆT */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#334155', marginBottom: '2px' }}>
                  TP. Hồ Chí Minh, ngày {formatDateElements(submittedAt).day} tháng {formatDateElements(submittedAt).month} năm {formatDateElements(submittedAt).year}
                </div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', textTransform: 'uppercase' }}>
                  QUẢN LÝ VẬN TẢI
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
                  (Ký, ghi rõ họ tên)
                </div>

                {digitalSignature.isSigned ? (
                  <div style={{
                    height: '75px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {/* Chữ ký tay nét ký tên: Nghĩa */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 2
                    }}>
                      <div style={{
                        fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                        fontSize: '2.5rem',
                        color: '#1d4ed8',
                        transform: 'rotate(-6deg)',
                        userSelect: 'none',
                        lineHeight: 1
                      }}>
                        {getSignatureName(digitalSignature.signerName) || 'Nghĩa'}
                      </div>
                      <svg width="105" height="12" viewBox="0 0 105 12" style={{ marginTop: '-4px' }}>
                        <path d="M 5 6 Q 52 1 100 6" stroke="#1d4ed8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Dấu mộc tròn đỏ chứng thực điện tử đóng đè lên chữ ký */}
                    <svg width="86" height="86" viewBox="0 0 100 100" style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-62%, -50%) rotate(-12deg)',
                      pointerEvents: 'none',
                      opacity: 0.88,
                      zIndex: 1
                    }}>
                      <circle cx="50" cy="50" r="47" stroke="#dc2626" strokeWidth="2" fill="none" />
                      <circle cx="50" cy="50" r="43" stroke="#dc2626" strokeWidth="1" fill="none" />
                      <circle cx="50" cy="50" r="28" stroke="#dc2626" strokeWidth="1" strokeDasharray="2,2" fill="none" />
                      
                      <defs>
                        <path id="sealTopPath" d="M 12,50 A 38,38 0 0,1 88,50" />
                        <path id="sealBottomPath" d="M 88,50 A 38,38 0 0,1 12,50" />
                      </defs>
                      
                      <text fontSize="7" fontWeight="900" fill="#dc2626" letterSpacing="0.4">
                        <textPath href="#sealTopPath" startOffset="50%" textAnchor="middle">
                          CÔNG TY TNHH VẬN TẢI AN BÌNH
                        </textPath>
                      </text>
                      
                      <text fontSize="6.5" fontWeight="700" fill="#dc2626" letterSpacing="0.6">
                        <textPath href="#sealBottomPath" startOffset="50%" textAnchor="middle">
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
                  <div style={{
                    height: '75px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    fontSize: '0.8rem'
                  }}>
                    (Chưa ký duyệt)
                  </div>
                )}

                <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  {digitalSignature.signerName || 'Lê Trọng Nghĩa'}
                </div>
              </div>
            </div>

            {/* FOOTER NOTICE */}
            <div style={{
              borderTop: '1px solid #cbd5e1',
              marginTop: '2rem',
              paddingTop: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: '#64748b'
            }}>
              <div>Công ty TNHH Vận tải An Bình - Hotline: 1900 6067</div>
              <div>
                {digitalSignature.certificateCode && (
                  <span style={{ marginRight: '14px' }}>
                    Mã chứng thực số: <strong>{digitalSignature.certificateCode}</strong>
                  </span>
                )}
                Trang 1 / 1
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default TripReportModal;

