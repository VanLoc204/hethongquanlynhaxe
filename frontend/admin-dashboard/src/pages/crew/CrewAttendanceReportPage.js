import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

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
    case 'on_time':
    case 'closed':
      return {
        label: 'Đúng giờ',
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
        dot: '#10b981'
      };
    case 'late':
      return {
        label: 'Đi trễ',
        bg: '#fff7ed',
        color: '#c2410c',
        border: '#fed7aa',
        dot: '#f97316'
      };
    case 'active':
      return {
        label: 'Đang trong ca',
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
        label: 'Vắng mặt',
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

  // Thời gian mặc định: Mặc định 'all' để nạp toàn bộ chuyến xe thật từ database
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState('all'); // 'today' | '7days' | 'this-month' | 'last-month' | 'all' | 'custom'

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
    applyPreset('all');
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
      if (endDate) {
        params.append('toDate', endDate);
      } else {
        // Mac dinh lich su chi hien thi toi ngay hien tai
        const todayISO = formatDateToISO(new Date());
        params.append('toDate', todayISO);
      }
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (faceFilter !== 'all') params.append('faceVerified', faceFilter === 'verified' ? 'true' : 'false');

      const res = await fetch(`${API_BASE}/attendance/mine?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const hist = Array.isArray(data.history) ? data.history : [];
        setHistory(hist);
        if (data.summary) {
          const s = data.summary;
          setSummary({
            ...s,
            totalTrips: s.totalTrips ?? s.totalShifts ?? hist.length,
            onTimeTripsCount: s.onTimeTripsCount ?? hist.filter(h => h.status === 'on_time').length,
            lateTripsCount: s.lateTripsCount ?? hist.filter(h => h.status === 'late').length,
            absentTripsCount: s.absentTripsCount ?? s.absentShiftsCount ?? hist.filter(h => h.status === 'absent').length,
            activeTripsCount: s.activeTripsCount ?? s.activeShiftsCount ?? hist.filter(h => h.status === 'active').length,
            closedTripsCount: s.closedTripsCount ?? s.closedShiftsCount ?? hist.filter(h => h.status === 'closed' || h.status === 'on_time').length,
            totalWorkHours: s.totalWorkHours ?? 0,
            avgHoursPerTrip: s.avgHoursPerTrip ?? s.avgHoursPerShift ?? (hist.length > 0 ? +((s.totalWorkHours || 0) / hist.length).toFixed(1) : 0),
            faceVerifiedCount: s.faceVerifiedCount ?? hist.filter(h => h.faceVerified).length,
            faceRate: s.faceRate ?? 100,
            leaveDaysCount: s.leaveDaysCount ?? 0,
            attendanceRate: s.attendanceRate ?? 100
          });
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

  // Lọc dữ liệu client-side theo từ khóa tìm kiếm (Tuyến đường, Biển số xe, Địa điểm) và giới hạn tới ngày hiện tại
  const filteredHistory = useMemo(() => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const validHistory = history.filter(item => {
      const d = item.rawDate ? new Date(item.rawDate) : (item.scheduledDepartureTime ? new Date(item.scheduledDepartureTime) : null);
      if (d && d > todayEnd) return false;
      return true;
    });

    const q = searchQuery.toLowerCase().trim();
    if (!q) return validHistory;
    return validHistory.filter(item => {
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
    <div className="crew-report-container" style={{ animation: 'fadeIn 0.25s ease', width: '100%', maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem', boxSizing: 'border-box' }}>
      
      {/* ── STYLE CHO RESPONSIVE MOBILE & TABLET ────────────────────────────── */}
      <style>{`
        .crew-report-container, .crew-report-container * {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .crew-report-container {
            width: 100% !important;
            max-width: 100% !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
            overflow-x: hidden !important;
          }
          .crew-header-wrap {
            padding: 0.85rem !important;
            margin-bottom: 0.85rem !important;
            border-radius: 12px !important;
            width: 100% !important;
          }
          .crew-header-title {
            font-size: 1.15rem !important;
            line-height: 1.35 !important;
          }
          .crew-header-badge {
            font-size: 0.7rem !important;
            padding: 2px 8px !important;
          }
          .crew-kpi-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            margin-bottom: 0.85rem !important;
            width: 100% !important;
          }
          .crew-kpi-card {
            padding: 0.65rem 0.65rem !important;
            border-radius: 10px !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          .crew-kpi-title {
            font-size: 0.65rem !important;
            letter-spacing: -0.2px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .crew-kpi-val {
            font-size: 1.25rem !important;
            margin: 2px 0 !important;
          }
          .crew-kpi-sub {
            font-size: 0.68rem !important;
            line-height: 1.25 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .crew-filter-box {
            padding: 0.75rem !important;
            margin-bottom: 0.85rem !important;
            border-radius: 12px !important;
            width: 100% !important;
            overflow: hidden !important;
          }
          .crew-preset-scroll {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 5px !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 4px !important;
            scrollbar-width: none !important;
          }
          .crew-preset-scroll::-webkit-scrollbar {
            display: none !important;
          }
          .crew-filter-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .crew-filter-grid > div {
            min-width: 0 !important;
            width: 100% !important;
          }
          .crew-filter-grid input,
          .crew-filter-grid select {
            font-size: 0.75rem !important;
            padding: 6px 6px !important;
            height: 34px !important;
            width: 100% !important;
            min-width: 0 !important;
          }
          .crew-filter-full {
            grid-column: 1 / -1 !important;
          }
          .crew-desktop-table {
            display: none !important;
          }
          .crew-mobile-cards {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 8px !important;
            width: 100% !important;
          }
          .crew-mobile-card {
            width: 100% !important;
            padding: 10px 10px !important;
            border-radius: 10px !important;
          }
          .crew-pagination {
            flex-wrap: wrap !important;
            gap: 6px !important;
            justify-content: center !important;
            padding: 0.75rem !important;
          }
          .crew-modal-body {
            padding: 1rem !important;
          }
          .crew-modal-photos {
            gap: 8px !important;
          }
        }
        @media (min-width: 769px) {
          .crew-mobile-cards {
            display: none !important;
          }
        }
      `}</style>

      {/* ── HEADER & TIÊU ĐỀ TRANG ────────────────────────────────────────── */}
      <div className="crew-header-wrap" style={{
        marginBottom: '1.25rem',
        background: '#ffffff',
        padding: '1.15rem 1.25rem',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <h1 className="crew-header-title" style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            {isDriver ? 'Lịch Sử Chấm Công & Chuyến Xe' : 'Lịch Sử Chấm Công & Chuyến Xe'}
          </h1>
          <span className="crew-header-badge" style={{
            backgroundColor: isDriver ? '#eff6ff' : '#f5f3ff',
            color: isDriver ? '#1d4ed8' : '#6d28d9',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '800',
            border: `1px solid ${isDriver ? '#bfdbfe' : '#ddd6fe'}`,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {isDriver ? 'Tài Xế' : 'Phụ Xe'}
          </span>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.825rem', margin: '6px 0 0 0', lineHeight: 1.4 }}>
          Tra cứu đầy đủ nhật ký các lượt xuất bến, giờ nhận ca, tan ca, hình ảnh đối soát Face ID và thời gian làm việc thực tế.
        </p>
      </div>

      {/* ── 4 THẺ THỐNG KÊ KPI CHUYÊN CẦN ────────────────────────────────────── */}
      <div className="crew-kpi-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Card 1: Tổng chuyến xe */}
        <div className="crew-kpi-card" style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="crew-kpi-title" style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Tổng Chuyến Xe
            </span>
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex',
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="22" height="13" rx="2" />
                <path d="M16 8h2" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </span>
          </div>
          <div className="crew-kpi-val" style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.totalTrips ?? summary.totalShifts ?? filteredHistory.length}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
          </div>
          <div className="crew-kpi-sub" style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#059669', fontWeight: '700' }}>{summary.onTimeTripsCount ?? filteredHistory.filter(h => h.status === 'on_time').length} đúng</span>
            <span>•</span>
            <span style={{ color: '#c2410c', fontWeight: '700' }}>{summary.lateTripsCount ?? filteredHistory.filter(h => h.status === 'late').length} trễ</span>
            <span>•</span>
            <span style={{ color: '#b91c1c', fontWeight: '700' }}>{summary.absentTripsCount ?? filteredHistory.filter(h => h.status === 'absent').length} vắng</span>
          </div>
        </div>

        {/* Card 2: Tổng giờ làm việc */}
        <div className="crew-kpi-card" style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="crew-kpi-title" style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Giờ Lăn Bánh
            </span>
            <span style={{
              background: '#ecfdf5',
              color: '#059669',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex',
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
          <div className="crew-kpi-val" style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.totalWorkHours ?? 0}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>giờ</span>
          </div>
          <div className="crew-kpi-sub" style={{ fontSize: '0.75rem', color: '#64748b' }}>
            TB <strong>{summary.avgHoursPerTrip ?? summary.avgHoursPerShift ?? (filteredHistory.length > 0 ? +((summary.totalWorkHours || 0) / filteredHistory.length).toFixed(1) : 0)}h</strong> / chuyến
          </div>
        </div>

        {/* Card 3: Xác thực Face ID */}
        <div className="crew-kpi-card" style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="crew-kpi-title" style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Tỷ Lệ Face ID
            </span>
            <span style={{
              background: '#f5f3ff',
              color: '#7c3aed',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex',
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
          </div>
          <div className="crew-kpi-val" style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.faceRate ?? 100}%
          </div>
          <div className="crew-kpi-sub" style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {summary.faceVerifiedCount ?? filteredHistory.filter(h => h.faceVerified).length} / {summary.totalTrips ?? summary.totalShifts ?? filteredHistory.length} sinh trắc
          </div>
        </div>

        {/* Card 4: Tỷ lệ chuyên cần */}
        <div className="crew-kpi-card" style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="crew-kpi-title" style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Chuyên Cần
            </span>
            <span style={{
              background: '#fff7ed',
              color: '#c2410c',
              padding: '4px',
              borderRadius: '8px',
              display: 'inline-flex',
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
          </div>
          <div className="crew-kpi-val" style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {summary.attendanceRate ?? 100}%
          </div>
          <div className="crew-kpi-sub" style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Nghỉ phép: <strong>{summary.leaveDaysCount ?? 0} ngày</strong>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC THỜI GIAN & TÌM KIẾM ────────────────────────────────────────── */}
      <div className="crew-filter-box" style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Hàng 1: Preset thời gian nhanh - Cố định trên 1 dòng duy nhất */}
        <div style={{ marginBottom: '1rem', width: '100%', overflow: 'hidden' }}>
          <div className="crew-preset-scroll" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '4px',
            scrollbarWidth: 'none'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', marginRight: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
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
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.775rem',
                  fontWeight: activePreset === p.key ? '800' : '600',
                  border: `1px solid ${activePreset === p.key ? '#2563eb' : '#e2e8f0'}`,
                  backgroundColor: activePreset === p.key ? '#eff6ff' : '#ffffff',
                  color: activePreset === p.key ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hàng 2: Bộ chọn khoảng ngày, trạng thái và tìm kiếm */}
        <div className="crew-filter-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Từ ngày */}
          <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
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
                minWidth: 0,
                padding: '7px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Đến ngày */}
          <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
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
                minWidth: 0,
                padding: '7px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Trạng thái ca trực */}
          <div className="crew-filter-full" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
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
                minWidth: 0,
                padding: '7px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: '600',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="on_time">Đúng giờ</option>
              <option value="late">Đi trễ</option>
              <option value="absent">Vắng mặt</option>
              <option value="active">Đang trong ca trực</option>
              <option value="scheduled">Chờ xuất bến</option>
            </select>
          </div>

          {/* Xác thực Face ID */}
          <div className="crew-filter-full" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
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
                minWidth: 0,
                padding: '7px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
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
          <div className="crew-filter-full" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
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
                minWidth: 0,
                padding: '7px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
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
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Header bảng & Số lượng */}
        <div style={{
          padding: '0.85rem 1.15rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#1e293b' }}>
            Danh Sách Lượt Chấm Công{' '}
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
              ({filteredHistory.length} bản ghi)
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
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
          <>
            {/* Bảng dạng Table chuẩn cho Desktop & Tablet ngang */}
            <div className="crew-desktop-table" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', width: '45px', whiteSpace: 'nowrap' }}>STT</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>Ngày Chạy</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>Tuyến Đường & Xe</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>Giờ Check-in</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>Giờ Check-out</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>Thời Lượng</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>Face ID</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao Tác</th>
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
                          transition: 'background-color 0.12s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {/* STT */}
                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>

                        {/* Ngày chạy */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>{item.date}</div>
                          {item.scheduledDepartureTime && item.scheduledDepartureTime !== '--:--' && (
                            <div style={{ fontSize: '0.725rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                              Xuất bến: <strong>{item.scheduledDepartureTime}</strong>
                            </div>
                          )}
                        </td>

                        {/* Tuyến đường & Xe */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>
                            {item.tripRoute}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.busPlateNumber}
                            </span>
                            {item.location && (
                              <span style={{ fontSize: '0.725rem', color: '#64748b', whiteSpace: 'nowrap' }}>
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

            {/* Danh sách dạng Mobile Cards trực quan, gọn gàng */}
            <div className="crew-mobile-cards" style={{ width: '100%', boxSizing: 'border-box' }}>
              {paginatedHistory.map((item, index) => {
                const badge = getStatusBadge(item.status);
                const isRowActive = item.status === 'active';

                return (
                  <div
                    key={item.id || index}
                    className="crew-mobile-card"
                    style={{
                      backgroundColor: isRowActive ? '#f8faff' : '#ffffff',
                      border: `1px solid ${isRowActive ? '#bfdbfe' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      padding: '12px 12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      width: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0
                    }}
                  >
                    {/* Header Card: STT + Ngày + Giờ xuất bến & Badge trạng thái */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '0.725rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}>
                          #{(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                        <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {item.date}
                        </span>
                        {item.scheduledDepartureTime && item.scheduledDepartureTime !== '--:--' && (
                          <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            ({item.scheduledDepartureTime})
                          </span>
                        )}
                      </div>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.725rem',
                        fontWeight: '800',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: badge.dot }} />
                        {badge.label}
                      </span>
                    </div>

                    {/* Dòng Tuyến + Biển số xe */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #f1f5f9', paddingBottom: '8px', gap: '8px' }}>
                      <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.85rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.tripRoute}
                      </div>
                      <span style={{
                        backgroundColor: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.725rem',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}>
                        {item.busPlateNumber}
                      </span>
                    </div>

                    {/* Khối Giờ Check-in / Check-out / Thời lượng */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '4px',
                      backgroundColor: '#f8fafc',
                      padding: '8px 8px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#64748b', fontSize: '0.675rem', fontWeight: '700', whiteSpace: 'nowrap' }}>CHECK-IN</div>
                        <div style={{
                          fontWeight: '800',
                          color: item.checkInTime !== '--:--:--' ? '#047857' : '#94a3b8',
                          marginTop: '2px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.checkInTime}
                        </div>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#64748b', fontSize: '0.675rem', fontWeight: '700', whiteSpace: 'nowrap' }}>CHECK-OUT</div>
                        <div style={{
                          fontWeight: '800',
                          color: item.checkOutTime !== '--:--:--' ? '#1d4ed8' : '#94a3b8',
                          marginTop: '2px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.checkOutTime !== '--:--:--' ? item.checkOutTime : isRowActive ? 'Đang chạy' : '--:--:--'}
                        </div>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#64748b', fontSize: '0.675rem', fontWeight: '700', whiteSpace: 'nowrap' }}>THỜI LƯỢNG</div>
                        <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatHoursDuration(item.durationHours)}
                        </div>
                      </div>
                    </div>

                    {/* Footer Card: Face ID + Nút Chi tiết */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                      <div>
                        {item.faceVerified ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: '800',
                            border: '1px solid #a7f3d0',
                            whiteSpace: 'nowrap'
                          }}>
                            ✓ Face ID
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: '#f1f5f9',
                            color: '#94a3b8',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>
                            Chưa Face ID
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedRecord(item)}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.725rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        Chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Thanh phân trang */}
        {totalPages > 1 && (
          <div className="crew-pagination" style={{
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
            <div className="crew-modal-body" style={{ padding: '1.5rem' }}>
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

                <div className="crew-modal-photos" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                    {(selectedRecord.checkInPhoto || (selectedRecord.faceVerified ? selectedRecord.checkOutPhoto : null)) ? (
                      <img
                        src={selectedRecord.checkInPhoto || selectedRecord.checkOutPhoto}
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

