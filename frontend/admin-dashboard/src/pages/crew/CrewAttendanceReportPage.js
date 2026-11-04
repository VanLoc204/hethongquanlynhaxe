import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

// Helper định dạng ngày YYYY-MM-DD
const formatDateToISO = (d) => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper format thời gian từ giờ thập phân ra H giờ M phút
const formatHoursDuration = (decimalHours) => {
  if (!decimalHours || decimalHours <= 0) return '0h';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

// Helper badge trạng thái
const getStatusBadge = (status) => {
  switch (status) {
    case 'closed':
      return {
        label: 'Đã hoàn thành',
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
        dot: '#10b981'
      };
    case 'active':
      return {
        label: 'Đang chạy chuyến',
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
        dot: '#3b82f6'
      };
    case 'scheduled':
      return {
        label: 'Chờ xuất bến',
        bg: '#fffbeb',
        color: '#b45309',
        border: '#fde68a',
        dot: '#f59e0b'
      };
    case 'absent':
      return {
        label: 'Vắng / Quá giờ',
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fca5a5',
        dot: '#ef4444'
      };
    default:
      return {
        label: status || 'Không rõ',
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1',
        dot: '#94a3b8'
      };
  }
};

const CrewAttendanceReportPage = ({ role = 'driver', setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const isDriver = role === 'driver' || user?.role === 'driver';

  // Thời gian mặc định: Đầu tháng đến Cuối tháng hiện tại
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(formatDateToISO(firstDayOfMonth));
  const [endDate, setEndDate] = useState(formatDateToISO(lastDayOfMonth));
  const [activePreset, setActivePreset] = useState('this-month'); // 'today' | '7days' | 'this-month' | 'last-month' | 'all' | 'custom'

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState('all'); // all | closed | active | scheduled | absent
  const [faceFilter, setFaceFilter] = useState('all'); // all | verified | not-verified
  const [searchQuery, setSearchQuery] = useState('');

  // Dữ liệu từ API
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({
    totalTrips: 0,
    activeTripsCount: 0,
    closedTripsCount: 0,
    absentTripsCount: 0,
    totalWorkHours: 0,
    avgHoursPerTrip: 0,
    faceVerifiedCount: 0,
    faceRate: 100,
    leaveDaysCount: 0,
    attendanceRate: 100
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal chi tiết lượt chấm công
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Áp dụng Preset thời gian nhanh
  const applyPreset = (presetKey) => {
    setActivePreset(presetKey);
    const currentDate = new Date();

    if (presetKey === 'today') {
      const todayISO = formatDateToISO(currentDate);
      setStartDate(todayISO);
      setEndDate(todayISO);
    } else if (presetKey === '7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      setStartDate(formatDateToISO(past7));
      setEndDate(formatDateToISO(currentDate));
    } else if (presetKey === 'this-month') {
      const f = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const l = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      setStartDate(formatDateToISO(f));
      setEndDate(formatDateToISO(l));
    } else if (presetKey === 'last-month') {
      const f = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const l = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      setStartDate(formatDateToISO(f));
      setEndDate(formatDateToISO(l));
    } else if (presetKey === 'all') {
      setStartDate('');
      setEndDate('');
    }
    setCurrentPage(1);
  };

  // Đặt lại toàn bộ bộ lọc
  const handleResetFilters = () => {
    applyPreset('this-month');
    setStatusFilter('all');
    setFaceFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Tải dữ liệu lịch sử chấm công từ Backend API
  const fetchCrewAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('limit', '300');
      if (startDate) params.append('fromDate', startDate);
      if (endDate) params.append('toDate', endDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (faceFilter !== 'all') params.append('faceVerified', faceFilter === 'verified' ? 'true' : 'false');

      const res = await fetch(`${API_BASE}/attendance/mine?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setHistory(Array.isArray(data.history) ? data.history : []);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        setError(data.message || 'Không thể tải lịch sử chấm công.');
      }
    } catch (err) {
      console.error('[fetchCrewAttendance Error]:', err);
      setError('Lỗi kết nối máy chủ khi nạp lịch sử chấm công.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCrewAttendance();
    }
  }, [token, startDate, endDate, statusFilter, faceFilter]);

  // Lọc dữ liệu client-side theo từ khóa tìm kiếm (Tuyến đường, Biển số xe, Địa điểm)
  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return history;
    return history.filter(item => {
      return (
        item.tripRoute?.toLowerCase().includes(q) ||
        item.busPlateNumber?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.note?.toLowerCase().includes(q)
      );
    });
  }, [history, searchQuery]);

  // Phân trang
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  // Xuất file CSV (UTF-8 có BOM để tương thích hoàn hảo với Microsoft Excel)
  const exportToCSV = () => {
    if (filteredHistory.length === 0) {
      alert('Không có dữ liệu để xuất file.');
      return;
    }

    const headers = [
      'STT',
      'Ngày',
      'Tuyến Đường',
      'Biển Số Xe',
      'Giờ Xuất Bến',
      'Giờ Check-in',
      'Giờ Check-out',
      'Thời Lượng (giờ)',
      'Trạng Thái',
      'Xác Thực Face ID',
      'Địa Điểm / Bến Xe',
      'Ghi Chú'
    ];

    const rows = filteredHistory.map((item, index) => [
      index + 1,
      `"${item.date || ''}"`,
      `"${(item.tripRoute || '').replace(/"/g, '""')}"`,
      `"${item.busPlateNumber || ''}"`,
      `"${item.scheduledDepartureTime || ''}"`,
      `"${item.checkInTime || ''}"`,
      `"${item.checkOutTime || ''}"`,
      item.durationHours || 0,
      `"${getStatusBadge(item.status).label}"`,
      item.faceVerified ? 'Đạt chuẩn Face ID' : 'Chưa nhận diện',
      `"${(item.location || '').replace(/"/g, '""')}"`,
      `"${(item.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Lich_Su_Cham_Cong_${isDriver ? 'Tai_Xe' : 'Phu_Xe'}_${startDate || 'tat_ca'}_${endDate || ''}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── HEADER & THANH ĐIỀU HƯỚNG ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              {isDriver ? 'Lịch Sử Chấm Công & Chuyến Xe Tài Xế' : 'Lịch Sử Chấm Công & Chuyến Xe Phụ Xe'}
            </h1>
            <span style={{
              backgroundColor: isDriver ? '#eff6ff' : '#f5f3ff',
              color: isDriver ? '#1d4ed8' : '#6d28d9',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '800',
              border: `1px solid ${isDriver ? '#bfdbfe' : '#ddd6fe'}`
            }}>
              {isDriver ? 'Tài Xế Trực Tiếp Vận Hành' : 'Tiếp Viên / Phụ Xe Phục Vụ'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '6px 0 0 0' }}>
            Tra cứu đầy đủ nhật ký các lượt xuất bến, giờ nhận ca, tan ca, hình ảnh đối soát Face ID và thời gian làm việc thực tế.
          </p>
        </div>

        {/* Nút hành động nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab(isDriver ? 'driver-attendance' : 'attendant-attendance')}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.825rem',
                padding: '9px 16px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Vào Trang Chấm Công Face ID
            </button>
          )}

          <button
            onClick={exportToCSV}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              fontWeight: '700',
              fontSize: '0.825rem',
              padding: '9px 14px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Xuất Bảng Tính
          </button>

          <button
            onClick={fetchCrewAttendance}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              fontWeight: '700',
              fontSize: '0.825rem',
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Tải lại dữ liệu"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 4 THẺ THỐNG KÊ KPI CHUYÊN CẦN ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: Tổng chuyến xe */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Chuyến Xe
            </span>
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="22" height="13" rx="2" />
                <path d="M16 8h2" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.totalTrips}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '8px' }}>
            <span style={{ color: '#059669', fontWeight: '700' }}>✓ {summary.closedTripsCount} hoàn thành</span>
            <span>•</span>
            <span style={{ color: '#2563eb', fontWeight: '700' }}>{summary.activeTripsCount} đang chạy</span>
          </div>
        </div>

        {/* Card 2: Tổng giờ làm việc */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Giờ Lăn Bánh
            </span>
            <span style={{
              background: '#ecfdf5',
              color: '#059669',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.totalWorkHours}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>giờ</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Trung bình <strong>{summary.avgHoursPerTrip}h</strong> / chuyến lộ trình
          </div>
        </div>

        {/* Card 3: Xác thực Face ID */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Tỷ Lệ Quét Face ID
            </span>
            <span style={{
              background: '#f5f3ff',
              color: '#7c3aed',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.faceRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {summary.faceVerifiedCount} / {summary.totalTrips} chuyến xác thực sinh trắc học
          </div>
        </div>

        {/* Card 4: Tỷ lệ chuyên cần */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Tỷ Lệ Chuyên Cần
            </span>
            <span style={{
              background: '#fff7ed',
              color: '#c2410c',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.attendanceRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Nghỉ phép hưởng lương: <strong>{summary.leaveDaysCount} ngày</strong>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC THỜI GIAN & TÌM KIẾM ────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Hàng 1: Preset thời gian nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', marginRight: '6px' }}>
              Xem nhanh:
            </span>
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: '7days', label: '7 ngày qua' },
              { key: 'this-month', label: 'Tháng này' },
              { key: 'last-month', label: 'Tháng trước' },
              { key: 'all', label: 'Toàn bộ' }
            ].map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.775rem',
                  fontWeight: activePreset === p.key ? '800' : '600',
                  border: `1px solid ${activePreset === p.key ? '#2563eb' : '#e2e8f0'}`,
                  backgroundColor: activePreset === p.key ? '#eff6ff' : '#ffffff',
                  color: activePreset === p.key ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleResetFilters}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.775rem',
              fontWeight: '700',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            ↺ Đặt lại bộ lọc
          </button>
        </div>

        {/* Hàng 2: Bộ chọn khoảng ngày, trạng thái và tìm kiếm */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Từ ngày */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
              Từ ngày
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset('custom');
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Đến ngày */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
              Đến ngày
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset('custom');
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Trạng thái ca trực */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
              Trạng thái chuyến
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                fontWeight: '600',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="closed">Đã hoàn thành</option>
              <option value="active">Đang trong chuyến</option>
              <option value="scheduled">Chờ xuất bến</option>
              <option value="absent">Vắng / Quá giờ</option>
            </select>
          </div>

          {/* Xác thực Face ID */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
              Xác thực Face ID
            </label>
            <select
              value={faceFilter}
              onChange={(e) => {
                setFaceFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                fontWeight: '600',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">Tất cả</option>
              <option value="verified">Đã quét Face ID</option>
              <option value="not-verified">Chưa quét Face ID</option>
            </select>
          </div>

          {/* Ô tìm kiếm từ khóa */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
              Tìm kiếm tuyến / xe
            </label>
            <input
              type="text"
              placeholder="Nhập tên tuyến, biển số..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH CHI TIẾT ────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Header bảng & Số lượng */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>
            Danh Sách Lượt Chấm Công{' '}
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
              ({filteredHistory.length} bản ghi)
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Trang {currentPage} / {totalPages}
          </div>
        </div>

        {/* Nội dung bảng */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '10px' }} />
            <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>Đang nạp dữ liệu chấm công...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#ef4444' }}>
            <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '6px' }}>Đã xảy ra lỗi</div>
            <div style={{ fontSize: '0.85rem' }}>{error}</div>
            <button
              onClick={fetchCrewAttendance}
              style={{ marginTop: '12px', padding: '6px 14px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
            >
              Thử lại
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem', marginBottom: '4px' }}>
              Không tìm thấy bản ghi chấm công nào
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
              Thử nới rộng khoảng thời gian hoặc điều chỉnh lại các tiêu chí bộ lọc ở trên.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', width: '45px' }}>STT</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1' }}>Ngày Chạy</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1' }}>Tuyến Đường & Xe</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1' }}>Giờ Check-in</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1' }}>Giờ Check-out</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1' }}>Thời Lượng</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1' }}>Trạng Thái</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1' }}>Face ID</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((item, index) => {
                  const badge = getStatusBadge(item.status);
                  const isRowActive = item.status === 'active';

                  return (
                    <tr
                      key={item.id || index}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isRowActive ? '#f8faff' : 'transparent',
                        transition: 'background-color 0.12s ease'
                      }}
                    >
                      {/* STT */}
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: '700' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* Ngày chạy */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>{item.date}</div>
                        {item.scheduledDepartureTime && item.scheduledDepartureTime !== '--:--' && (
                          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                            Xuất bến: <strong>{item.scheduledDepartureTime}</strong>
                          </div>
                        )}
                      </td>

                      {/* Tuyến đường & Xe */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#1e293b' }}>
                          {item.tripRoute}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.725rem',
                            fontWeight: '700',
                            fontFamily: 'monospace'
                          }}>
                            {item.busPlateNumber}
                          </span>
                          {item.location && (
                            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                              • {item.location}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Check-in */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{
                          fontWeight: '800',
                          color: item.checkInTime !== '--:--:--' ? '#047857' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {item.checkInTime !== '--:--:--' && (
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                          )}
                          {item.checkInTime}
                        </div>
                      </td>

                      {/* Check-out */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{
                          fontWeight: '800',
                          color: item.checkOutTime !== '--:--:--' ? '#1d4ed8' : '#94a3b8'
                        }}>
                          {item.checkOutTime !== '--:--:--' ? item.checkOutTime : isRowActive ? 'Đang phục vụ...' : '--:--:--'}
                        </div>
                      </td>

                      {/* Thời lượng */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontWeight: '800',
                          color: '#0f172a',
                          backgroundColor: '#f8fafc',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {formatHoursDuration(item.durationHours)}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '3px 10px',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: '800'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: badge.dot }} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Face ID */}
                      <td style={{ padding: '14px 16px' }}>
                        {item.faceVerified ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: '800',
                            border: '1px solid #a7f3d0'
                          }}>
                            ✓ Face ID
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#f8fafc',
                            color: '#94a3b8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: '600'
                          }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedRecord(item)}
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Thanh phân trang */}
        {totalPages > 1 && (
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage === 1 ? '#94a3b8' : '#334155',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Trang trước
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Hiển thị một số trang gần trang hiện tại
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  Math.abs(pageNum - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${pageNum === currentPage ? '#2563eb' : '#e2e8f0'}`,
                        backgroundColor: pageNum === currentPage ? '#eff6ff' : '#ffffff',
                        color: pageNum === currentPage ? '#1d4ed8' : '#475569',
                        fontWeight: pageNum === currentPage ? '900' : '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} style={{ padding: '6px 4px', color: '#94a3b8' }}>...</span>;
                }
                return null;
              })}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage === totalPages ? '#94a3b8' : '#334155',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Trang sau →
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL CHI TIẾT LƯỢT CHẤM CÔNG & ẢNH ĐỐI SOÁT FACE ID ─────────────── */}
      {selectedRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #cbd5e1',
            animation: 'modalSlideUp 0.2s ease'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>
                  Chi Tiết Lượt Chấm Công Chuyến Đi
                </h3>
                <span style={{ fontSize: '0.775rem', color: '#64748b' }}>
                  Ngày: <strong>{selectedRecord.date}</strong> • Tuyến: <strong>{selectedRecord.tripRoute}</strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Thân Modal */}
            <div style={{ padding: '1.5rem' }}>
              {/* Thông tin chuyến xe */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>BIỂN SỐ XE</span>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
                    {selectedRecord.busPlateNumber}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>GIỜ VÀO CA (IN)</span>
                  <div style={{ fontWeight: '800', color: '#047857', fontSize: '0.95rem' }}>
                    {selectedRecord.checkInTime}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>GIỜ TAN CA (OUT)</span>
                  <div style={{ fontWeight: '800', color: '#1d4ed8', fontSize: '0.95rem' }}>
                    {selectedRecord.checkOutTime}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: '700' }}>THỜI LƯỢNG</span>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
                    {formatHoursDuration(selectedRecord.durationHours)}
                  </div>
                </div>
              </div>

              {/* Bằng chứng nhận diện Face ID & Ảnh đối soát */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.875rem', fontWeight: '800', color: '#334155' }}>
                  Bằng Chứng Nhận Diện Khuôn Mặt (Face ID Audit)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Ảnh Check-in */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#047857', marginBottom: '8px' }}>
                      ẢNH CHECK-IN (BẮT ĐẦU CA)
                    </div>
                    {selectedRecord.checkInPhoto ? (
                      <img
                        src={selectedRecord.checkInPhoto}
                        alt="Check-in Face"
                        style={{
                          width: '100%',
                          maxHeight: '190px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1'
                        }}
                      />
                    ) : (
                      <div style={{
                        height: '140px',
                        background: '#f1f5f9',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: '#94a3b8',
                        fontSize: '0.775rem'
                      }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '6px' }}>
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        Không lưu ảnh chụp
                      </div>
                    )}
                    <div style={{ marginTop: '8px', fontSize: '0.725rem', color: '#64748b' }}>
                      {selectedRecord.faceVerified ? '✓ Xác thực Face ID thành công' : 'Chưa xác thực khuôn mặt'}
                      {selectedRecord.isLiveVerified && ' • Liveness OK'}
                    </div>
                  </div>

                  {/* Ảnh Check-out */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1d4ed8', marginBottom: '8px' }}>
                      ẢNH CHECK-OUT (TAN CA)
                    </div>
                    {selectedRecord.checkOutPhoto ? (
                      <img
                        src={selectedRecord.checkOutPhoto}
                        alt="Check-out Face"
                        style={{
                          width: '100%',
                          maxHeight: '190px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1'
                        }}
                      />
                    ) : (
                      <div style={{
                        height: '140px',
                        background: '#f1f5f9',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: '#94a3b8',
                        fontSize: '0.775rem'
                      }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '6px' }}>
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        {selectedRecord.status === 'active' ? 'Đang trong chuyến đi...' : 'Không lưu ảnh chụp'}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', fontSize: '0.725rem', color: '#64748b' }}>
                      {selectedRecord.status === 'closed' ? 'Đã tan ca an toàn' : 'Chưa thực hiện tan ca'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Địa điểm & Ghi chú */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.775rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  VỊ TRÍ / BẾN XE XÁC NHẬN:
                </div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '600' }}>
                  📍 {selectedRecord.location || 'Bến xe điều hành trung tâm'}
                </div>

                {selectedRecord.note && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#64748b' }}>
                    <strong>Ghi chú:</strong> {selectedRecord.note}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.825rem',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CrewAttendanceReportPage;

