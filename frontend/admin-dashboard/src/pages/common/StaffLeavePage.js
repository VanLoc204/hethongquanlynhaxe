import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

const LEAVE_TYPES = [
  { id: 'annual', name: 'Nghỉ phép năm' },
  { id: 'sick', name: 'Nghỉ ốm đau' },
  { id: 'personal', name: 'Việc riêng' },
  { id: 'unpaid', name: 'Nghỉ không lương' },
  { id: 'special', name: 'Thai sản / Chế độ' }
];

const StaffLeavePage = () => {
  const { token, user } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ startDate: false, endDate: false, reason: false });
  const [selectOpen, setSelectOpen] = useState(false);
  const selectRef = useRef(null);

  // Dong dropdown khi bam ra ngoai
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const selectedTypeObj = useMemo(() => {
    return LEAVE_TYPES.find(t => t.id === leaveType) || LEAVE_TYPES[0];
  }, [leaveType]);

  // Ngày hôm nay theo định dạng YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Tính số ngày nghỉ dự kiến
  const leaveDaysCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return 0;
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 3600 * 24)) + 1;
  }, [startDate, endDate]);

  // Bắt lỗi nhập liệu trực tiếp (Client-side validation)
  const validationErrors = useMemo(() => {
    const errors = {};

    if (!startDate) {
      errors.startDate = 'Vui lòng chọn ngày bắt đầu nghỉ.';
    } else if (startDate < todayStr) {
      errors.startDate = 'Ngày bắt đầu nghỉ không được nằm trong quá khứ.';
    }

    if (!endDate) {
      errors.endDate = 'Vui lòng chọn ngày kết thúc nghỉ.';
    } else if (startDate && endDate < startDate) {
      errors.endDate = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.';
    }

    if (!reason || reason.trim() === '') {
      errors.reason = 'Vui lòng nêu rõ lý do xin nghỉ.';
    } else if (reason.trim().length < 10) {
      errors.reason = `Lý do còn quá ngắn (cần tối thiểu 10 ký tự, hiện tại: ${reason.trim().length}).`;
    }

    return errors;
  }, [startDate, endDate, reason, todayStr]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/users/leave', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
      } else {
        setError(data.message || 'Không thể tải danh sách đơn nghỉ.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi nạp danh sách đơn nghỉ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLeaves();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ startDate: true, endDate: true, reason: true });
    setError('');
    setSuccess('');

    if (!isFormValid) {
      setError('Vui lòng kiểm tra và sửa các lỗi nhập liệu bên dưới trước khi gửi.');
      return;
    }

    setSubmitting(true);
    const selectedTypeObj = LEAVE_TYPES.find(t => t.id === leaveType);
    const typeName = selectedTypeObj ? selectedTypeObj.name : 'Đơn xin nghỉ phép';

    try {
      const res = await fetch('http://localhost:8000/api/users/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate,
          endDate,
          reason: reason.trim(),
          typeName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Đã gửi đơn xin nghỉ phép thành công (${leaveDaysCount} ngày). Đơn đang được chuyển đến Quản lý xét duyệt!`);
        setStartDate('');
        setEndDate('');
        setReason('');
        setLeaveType('annual');
        setTouched({ startDate: false, endDate: false, reason: false });
        fetchLeaves();
      } else {
        setError(data.message || 'Không thể gửi đơn xin nghỉ phép.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi gửi đơn xin nghỉ.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--/--/----';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // Thống kê nhanh danh sách đơn
  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter(l => l.status === 'approved').length;
    const pending = leaves.filter(l => l.status === 'pending').length;
    const rejected = leaves.filter(l => l.status === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [leaves]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Từ chối
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#fffbeb',
            color: '#d97706',
            border: '1px solid #fde68a',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Chờ duyệt
          </span>
        );
    }
  };

  return (
    <div className="staff-leave-container" style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease' }}>
      
      {/* ── STYLE RESPONSIVE MOBILE & TABLET ────────────────────────────── */}
      <style>{`
        .staff-leave-container, .staff-leave-container * {
          box-sizing: border-box;
        }
        .staff-leave-grid {
          display: grid;
          grid-template-columns: minmax(360px, 450px) 1fr;
          gap: 20px;
          align-items: start;
          width: 100%;
        }
        @media (max-width: 900px) {
          .staff-leave-container {
            padding: 0 4px !important;
          }
          .staff-leave-header {
            padding: 12px 14px !important;
            margin-bottom: 12px !important;
            border-radius: 10px !important;
          }
          .staff-leave-header h1 {
            font-size: 1.15rem !important;
          }
          .staff-leave-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .staff-leave-card {
            padding: 14px !important;
            border-radius: 10px !important;
          }
          .staff-leave-dates {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .staff-leave-dates input {
            font-size: 0.775rem !important;
            padding: 6px 6px !important;
          }
          .staff-leave-table-desktop {
            display: none !important;
          }
          .staff-leave-cards-mobile {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            width: 100% !important;
          }
        }
        @media (min-width: 901px) {
          .staff-leave-cards-mobile {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Header Trang & Giới Thiệu Nghiệp Vụ */}
      <div className="staff-leave-header" style={{
        marginBottom: '16px',
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
          Quản Lý &amp; Tạo Đơn Xin Nghỉ Phép
        </h1>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
          Tạo đơn đề xuất nghỉ phép và theo dõi tiến độ xét duyệt trực tuyến.
        </p>
      </div>

      {/* Thông báo Thành công / Lỗi tổng quát */}
      {success && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          color: '#047857',
          fontSize: '0.85rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '0.85rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* 2. Bố cục 2 Cột: Form Tạo Đơn (Trái) & Lịch Sử (Phải) */}
      <div className="staff-leave-grid">
        
        {/* ================= CỘT TRÁI: FORM TẠO ĐƠN ================= */}
        <section className="staff-leave-card" style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Tạo Đơn Xin Nghỉ Phép
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Hệ thống tự động kiểm tra tính hợp lệ trước khi gửi
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Phân loại nghỉ phép - Custom Select Hiện Đại */}
            <div ref={selectRef} style={{ position: 'relative', width: '100%' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Loại nghỉ phép <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <button
                type="button"
                onClick={() => setSelectOpen(!selectOpen)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: selectOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  boxShadow: selectOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedTypeObj.name}
                </span>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  style={{
                    transform: selectOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {selectOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  padding: '4px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  {LEAVE_TYPES.map(t => {
                    const isSelected = t.id === leaveType;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setLeaveType(t.id);
                          setSelectOpen(false);
                        }}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'background-color 0.12s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: isSelected ? '700' : '500', color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                          {t.name}
                        </span>

                        {isSelected && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Khoảng ngày nghỉ */}
            <div className="staff-leave-dates" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Từ ngày */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Từ ngày <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, startDate: true }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: touched.startDate && validationErrors.startDate ? '1px solid #ef4444' : '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                {touched.startDate && validationErrors.startDate && (
                  <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px', fontWeight: '600' }}>
                    {validationErrors.startDate}
                  </div>
                )}
              </div>

              {/* Đến ngày */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Đến ngày (Hết ngày) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  min={startDate || todayStr}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, endDate: true }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: touched.endDate && validationErrors.endDate ? '1px solid #ef4444' : '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                {touched.endDate && validationErrors.endDate && (
                  <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px', fontWeight: '600' }}>
                    {validationErrors.endDate}
                  </div>
                )}
              </div>
            </div>

            {/* Thẻ xem trước thời lượng nghỉ tự động */}
            {startDate && endDate && leaveDaysCount > 0 && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.78rem', color: '#1e40af' }}>
                  Thời gian nghỉ đề xuất:
                  <div style={{ fontWeight: '700', marginTop: '2px' }}>
                    {formatDate(startDate)} ➔ {formatDate(endDate)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '800'
                  }}>
                    {leaveDaysCount} ngày
                  </span>
                </div>
              </div>
            )}

            {/* Lý do nghỉ phép */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                  Lý do xin nghỉ phép <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: reason.trim().length < 10 ? '#ef4444' : '#64748b' }}>
                  {reason.trim().length}/250 ký tự
                </span>
              </div>
              <textarea
                rows="4"
                maxLength="250"
                placeholder="Vui lòng nêu rõ lý do xin nghỉ (tối thiểu 10 ký tự, ví dụ: Nghỉ ốm đi khám bệnh viện Chợ Rẫy, Gia đình có việc cưới hỏi...)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, reason: true }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: touched.reason && validationErrors.reason ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  lineHeight: '1.4'
                }}
                required
              />
              {touched.reason && validationErrors.reason && (
                <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px', fontWeight: '600' }}>
                  {validationErrors.reason}
                </div>
              )}
            </div>

            {/* Nút gửi đơn */}
            <button
              type="submit"
              disabled={submitting || (touched.reason && !isFormValid)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !isFormValid && (touched.startDate || touched.reason) ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: !isFormValid && (touched.startDate || touched.reason) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                transition: 'background-color 0.15s ease'
              }}
            >
              {submitting ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                  </svg>
                  Đang gửi đơn...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Gửi Đơn Xin Nghỉ Phép
                </>
              )}
            </button>
          </form>
        </section>

        {/* ================= CỘT PHẢI: LỊCH SỬ ĐƠN NGHỈ PHÉP ================= */}
        <section className="staff-leave-card" style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          width: '100%'
        }}>
          {/* Header Cột Phải & Bộ Thống Kê Nhanh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Lịch Sử Đơn Xin Nghỉ Phép
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Theo dõi trạng thái xét duyệt từ cấp quản lý
              </span>
            </div>

            {/* Quick KPI stats */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#475569' }}>
                Tổng: <strong style={{ color: '#0f172a' }}>{stats.total}</strong>
              </div>
              <div style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.72rem', color: '#047857' }}>
                Đã duyệt: <strong>{stats.approved}</strong>
              </div>
              <div style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.72rem', color: '#b45309' }}>
                Chờ duyệt: <strong>{stats.pending}</strong>
              </div>
              {stats.rejected > 0 && (
                <div style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.72rem', color: '#b91c1c' }}>
                  Từ chối: <strong>{stats.rejected}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Nội dung danh sách đơn */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#2563eb', fontSize: '0.85rem', fontWeight: '600' }}>
              Đang tải danh sách đơn xin nghỉ...
            </div>
          ) : leaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#94a3b8' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Chưa có đơn xin nghỉ phép nào
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '380px', margin: '0 auto' }}>
                Khi cần nghỉ phép, hãy hoàn thiện biểu mẫu bên trái để gửi tới Quản lý xét duyệt trực tuyến.
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 901px) */}
              <div className="staff-leave-table-desktop" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', fontWeight: '700', width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700' }}>LOẠI ĐƠN &amp; THỜI GIAN</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '80px' }}>SỐ NGÀY</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700' }}>LÝ DO NGHỈ</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '120px' }}>TRẠNG THÁI</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '100px' }}>NGÀY GỬI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((item, idx) => {
                      const days = item.startDate && item.endDate
                        ? Math.floor((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 3600 * 24)) + 1
                        : 1;

                      return (
                        <tr
                          key={item._id || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* STT */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>
                            {idx + 1}
                          </td>

                          {/* Loại đơn & thời gian */}
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                              {item.typeName || 'Đơn xin nghỉ phép'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: '600' }}>
                              {formatDate(item.startDate)} ➔ {formatDate(item.endDate)}
                            </div>
                          </td>

                          {/* Số ngày */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span style={{
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.75rem'
                            }}>
                              {days} ngày
                            </span>
                          </td>

                          {/* Lý do */}
                          <td style={{ padding: '12px 10px', color: '#334155', maxWidth: '240px' }}>
                            <div
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={item.reason}
                            >
                              {item.reason}
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            {getStatusBadge(item.status)}
                          </td>

                          {/* Ngày gửi */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b', fontSize: '0.74rem' }}>
                            {formatDate(item.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (<= 900px) */}
              <div className="staff-leave-cards-mobile" style={{ width: '100%' }}>
                {leaves.map((item, idx) => {
                  const days = item.startDate && item.endDate
                    ? Math.floor((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 3600 * 24)) + 1
                    : 1;

                  return (
                    <div
                      key={item._id || idx}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Dòng 1: STT + Loại đơn + Badge Trạng thái */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', flexShrink: 0 }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', wordBreak: 'break-word' }}>
                            {item.typeName || 'Đơn xin nghỉ phép'}
                          </span>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      {/* Dòng 2: Thời gian nghỉ & Số ngày */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{formatDate(item.startDate)} ➔ {formatDate(item.endDate)}</span>
                        </div>
                        <span style={{
                          backgroundColor: '#e2e8f0',
                          color: '#334155',
                          padding: '1px 8px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          fontSize: '0.7rem'
                        }}>
                          {days} ngày
                        </span>
                      </div>

                      {/* Dòng 3: Lý do nghỉ */}
                      <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: '1.4', backgroundColor: '#fafafa', padding: '6px 8px', borderRadius: '6px' }}>
                        <strong style={{ color: '#64748b' }}>Lý do: </strong>
                        <span>{item.reason}</span>
                      </div>

                      {/* Dòng 4: Ngày nộp đơn */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#94a3b8' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Gửi ngày: {formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  );
};

export default StaffLeavePage;
