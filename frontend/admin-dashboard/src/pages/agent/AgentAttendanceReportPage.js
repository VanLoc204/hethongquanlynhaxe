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

const AgentAttendanceReportPage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);

  // Thời gian mặc định
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Bộ lọc thời gian (Mặc định 'all' để nạp toàn bộ ca trực thật từ database)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState('all'); // 'today' | '7days' | 'this-month' | 'last-month' | 'all' | 'custom'

  // Các tiêu chí lọc nghiệp vụ đầy đủ
  const [shiftTypeFilter, setShiftTypeFilter] = useState('all'); // all | morning | afternoon
  const [counterFilter, setCounterFilter] = useState('all'); // all | Quầy 01 | Quầy 02 | Quầy 03
  const [reconciliationFilter, setReconciliationFilter] = useState('all'); // all | verified | discrepancy | pending
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | closed
  const [faceFilter, setFaceFilter] = useState('all'); // all | verified | not-verified
  const [searchKeyword, setSearchKeyword] = useState('');

  // Trạng thái thu gọn / mở rộng bộ lọc nâng cao
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Dữ liệu từ Backend
  const [loading, setLoading] = useState(true);
  const [rawHistory, setRawHistory] = useState([]);
  const [approvedLeaveCount, setApprovedLeaveCount] = useState(0);

  // Modal xem chi tiết ca
  const [selectedShift, setSelectedShift] = useState(null);

  // 1. Áp dụng các Preset ngày nhanh 1-Click
  const applyDatePreset = (presetKey) => {
    setActiveDatePreset(presetKey);
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
  };

  // 2. Đặt lại toàn bộ bộ lọc về mặc định
  const handleResetFilters = () => {
    applyDatePreset('all');
    setShiftTypeFilter('all');
    setCounterFilter('all');
    setReconciliationFilter('all');
    setStatusFilter('all');
    setFaceFilter('all');
    setSearchKeyword('');
  };

  // 3. Nạp dữ liệu từ Backend API
  const fetchMyAttendanceReport = async () => {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();
      queryParams.append('limit', '200');

      if (startDate) queryParams.append('fromDate', startDate);
      if (endDate) queryParams.append('toDate', endDate);

      const res = await fetch(`${API_BASE}/attendance/mine?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRawHistory(Array.isArray(data.history) ? data.history : []);
        setApprovedLeaveCount(data.summary?.leaveDaysCount || 0);
      }
    } catch (err) {
      console.error('[fetchMyAttendanceReport Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyAttendanceReport();
    }
  }, [token, startDate, endDate]);

  // Danh sách các quầy vé có trong dữ liệu thực tế
  const availableCounters = useMemo(() => {
    const list = rawHistory.map(s => s.counterNumber).filter(Boolean);
    return [...new Set(list)].sort();
  }, [rawHistory]);

  // 4. Lọc dữ liệu đa chiều theo tất cả tiêu chí
  const filteredHistory = useMemo(() => {
    return rawHistory.filter((shift) => {
      // a. Lọc theo trạng thái ca
      if (statusFilter !== 'all' && shift.status !== statusFilter) {
        return false;
      }

      // b. Lọc theo Quầy vé trực
      if (counterFilter !== 'all' && shift.counterNumber !== counterFilter) {
        return false;
      }

      // c. Lọc theo Khung ca trực (Ca sáng / Ca chiều)
      if (shiftTypeFilter !== 'all') {
        const startHour = shift.startTime ? new Date(shift.startTime).getHours() : 7;
        const isMorning = startHour < 12;
        if (shiftTypeFilter === 'morning' && !isMorning) return false;
        if (shiftTypeFilter === 'afternoon' && isMorning) return false;
      }

      // d. Lọc theo Đối soát quỹ két
      if (reconciliationFilter !== 'all' && shift.reconciliationStatus !== reconciliationFilter) {
        return false;
      }

      // e. Lọc theo Face ID
      if (faceFilter === 'verified' && !shift.faceVerified) return false;
      if (faceFilter === 'not-verified' && shift.faceVerified) return false;

      // f. Lọc theo Từ khóa tìm kiếm tự do
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchCounter = (shift.counterNumber || '').toLowerCase().includes(kw);
        const matchOffice = (shift.officeName || '').toLowerCase().includes(kw);
        const matchDate = (shift.date || '').toLowerCase().includes(kw);
        const matchNotes = (shift.notes || '').toLowerCase().includes(kw);
        if (!matchCounter && !matchOffice && !matchDate && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [rawHistory, statusFilter, counterFilter, shiftTypeFilter, reconciliationFilter, faceFilter, searchKeyword]);

  // 5. Tự động tính toán lại 4 thẻ KPI dựa trên đúng danh sách đang được lọc
  const dynamicKPI = useMemo(() => {
    let totalShifts = filteredHistory.length;
    let closedShiftsCount = 0;
    let totalWorkHours = 0;
    let totalCashRevenue = 0;
    let totalCashlessRevenue = 0;
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let faceVerifiedCount = 0;

    filteredHistory.forEach(s => {
      if (s.status === 'closed') closedShiftsCount += 1;
      totalWorkHours += Number(s.durationHours || 0);
      totalCashRevenue += Number(s.cashRevenue || 0);
      totalCashlessRevenue += Number(s.cashlessRevenue || 0);
      totalRevenue += Number(s.totalRevenue || 0);
      totalTicketsSold += Number(s.ticketsCount || 0);
      if (s.faceVerified) faceVerifiedCount += 1;
    });

    const avgHours = totalShifts > 0 ? +(totalWorkHours / totalShifts).toFixed(1) : 0;
    const faceRate = totalShifts > 0 ? Math.round((faceVerifiedCount / totalShifts) * 100) : 100;
    const attendanceRate = totalShifts >= 16 ? 95 : Math.round((totalShifts / 26) * 100);

    return {
      totalShifts,
      closedShiftsCount,
      totalWorkHours: +totalWorkHours.toFixed(1),
      avgHoursPerShift: avgHours,
      totalCashRevenue,
      totalCashlessRevenue,
      totalRevenue,
      totalTicketsSold,
      faceVerifiedCount,
      faceRate,
      leaveDaysCount: approvedLeaveCount,
      attendanceRate
    };
  }, [filteredHistory, approvedLeaveCount]);

  // 6. Xuất file CSV bảng chấm công cá nhân theo đúng kết quả đang lọc
  const handleExportCSV = () => {
    if (!filteredHistory.length) {
      alert('Không có dữ liệu ca trực để xuất báo cáo.');
      return;
    }

    const headers = [
      'STT',
      'Ngày làm việc',
      'Quầy bán vé',
      'Văn phòng / Chi nhánh',
      'Giờ vào ca',
      'Giờ tan ca',
      'Số giờ làm (h)',
      'Xác thực Face ID',
      'Số vé bán ra',
      'Doanh thu tiền mặt (đ)',
      'Doanh thu chuyển khoản (đ)',
      'Tổng doanh thu ca (đ)',
      'Đối soát quỹ két',
      'Trạng thái ca',
      'Ghi chú'
    ];

    const rows = filteredHistory.map((s, idx) => [
      idx + 1,
      `"${s.date || ''}"`,
      `"${s.counterNumber || ''}"`,
      `"${s.officeName || ''}"`,
      `"${s.checkInTime || ''}"`,
      `"${s.checkOutTime || ''}"`,
      s.durationHours || 0,
      s.faceVerified ? 'Đã xác thực Face ID' : 'Chưa xác thực',
      s.ticketsCount || 0,
      s.cashRevenue || 0,
      s.cashlessRevenue || 0,
      s.totalRevenue || 0,
      s.reconciliationStatus === 'verified' ? 'Khớp quỹ' : s.reconciliationStatus === 'discrepancy' ? 'Lệch quỹ' : 'Chờ đối soát',
      s.status === 'open' ? 'Đang mở' : 'Đã đóng ca',
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    rows.push([]);
    rows.push([
      'TỔNG KẾT BỘ LỌC',
      '',
      '',
      '',
      '',
      '',
      dynamicKPI.totalWorkHours,
      `${dynamicKPI.faceRate}%`,
      dynamicKPI.totalTicketsSold,
      dynamicKPI.totalCashRevenue,
      dynamicKPI.totalCashlessRevenue,
      dynamicKPI.totalRevenue,
      '',
      `${dynamicKPI.totalShifts} ca`,
      ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Cham_Cong_${user?.name ? user.name.replace(/\s+/g, '_') : 'NhanVien'}_${startDate || 'ALL'}_${endDate || 'ALL'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      maxWidth: '100%',
      boxSizing: 'border-box',
      color: '#1e293b'
    }}>
      
      {/* ================= PHẦN 1 (Ở TRÊN): TIÊU ĐỀ THEO MẪU ================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1.15rem 1.5rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        gap: '1rem',
        boxSizing: 'border-box'
      }}>
        {/* Bên trái: Tiêu đề + Badge + Dòng mô tả (không icon) */}
        <div style={{ minWidth: 0, flex: '1 1 auto', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
            <h1 style={{
              margin: 0,
              fontSize: '1.3rem',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap'
            }}>
              Lịch Sử Chấm Công Nhân Viên Bán Vé
            </h1>
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              whiteSpace: 'nowrap'
            }}>
              Nhân Viên Bán Vé
            </span>
          </div>
          <p style={{
            margin: 0,
            color: '#475569',
            fontSize: '0.82rem',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            Tra cứu chi tiết toàn bộ lịch sử ca trực quầy, giờ vào ca, tan ca, xác thực Face ID và đối soát doanh số bán vé.
          </p>
        </div>

        {/* Bên phải: Các nút chức năng (không icon, chữ 1 hàng) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('agent-attendance')}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '6px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              Chấm Công Ca
            </button>
          )}

          <button
            onClick={fetchMyAttendanceReport}
            disabled={loading}
            style={{
              background: '#2563eb',
              border: '1px solid #1d4ed8',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
              transition: 'background-color 0.15s'
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2563eb'; }}
          >
            {loading ? 'Đang Nạp...' : 'Làm Mới'}
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              background: '#10b981',
              border: '1px solid #059669',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(16,185,129,0.2)',
              transition: 'background-color 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            Xuất Bảng Công (CSV)
          </button>
        </div>
      </div>

      {/* ================= PHẦN 2 (Ở DƯỚI): KHU VỰC CHỨC NĂNG ================= */}
      
      {/* 2.1. HỆ THỐNG BỘ LỌC CHẤM CÔNG TOÀN DIỆN */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        boxSizing: 'border-box'
      }}>
        {/* DÒNG 1: BỘ LỌC KHOẢNG NGÀY (Từ ngày -> Đến ngày) & NÚT GẠT NHANH 1-CLICK */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '12px',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {/* Chọn Khoảng Ngày Từ ... Đến ... */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', whiteSpace: 'nowrap' }}>
              Khoảng ngày:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                outline: 'none',
                fontWeight: '600'
              }}
            />
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                outline: 'none',
                fontWeight: '600'
              }}
            />
          </div>

          {/* Nhóm Nút Lọc Nhanh 1-Click (Presets) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: '7days', label: '7 ngày qua' },
              { key: 'this-month', label: 'Tháng này' },
              { key: 'last-month', label: 'Tháng trước' },
              { key: 'all', label: 'Tất cả' }
            ].map(p => (
              <button
                key={p.key}
                onClick={() => applyDatePreset(p.key)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: activeDatePreset === p.key ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: activeDatePreset === p.key ? '#eff6ff' : '#ffffff',
                  color: activeDatePreset === p.key ? '#2563eb' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {p.label}
              </button>
            ))}

            {/* Nút bật tắt Bộ Lọc Nâng Cao */}
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              style={{
                marginLeft: '8px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: isAdvancedOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: isAdvancedOpen ? '#2563eb' : '#f8fafc',
                color: isAdvancedOpen ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {isAdvancedOpen ? 'Thu gọn bộ lọc' : 'Lọc nâng cao'}
            </button>
          </div>
        </div>

        {/* DÒNG 2: BỘ LỌC CƠ BẢN (Quầy vé, Trạng thái ca, Ô tìm kiếm) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '12px',
          paddingTop: '0.85rem'
        }}>
          {/* Lọc Quầy vé & Khung ca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>
              Quầy vé:
            </span>
            <select
              value={counterFilter}
              onChange={(e) => setCounterFilter(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              <option value="all">Tất cả quầy</option>
              {availableCounters.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginLeft: '6px', whiteSpace: 'nowrap' }}>
              Ca trực:
            </span>
            <select
              value={shiftTypeFilter}
              onChange={(e) => setShiftTypeFilter(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              <option value="all">Tất cả ca</option>
              <option value="morning">Ca sáng (07h - 15h)</option>
              <option value="afternoon">Ca chiều (13h - 21h)</option>
            </select>
          </div>

          {/* Ô Tìm Kiếm Nhanh */}
          <div style={{ flex: '1 1 auto', maxWidth: '320px', minWidth: '160px' }}>
            <input
              type="text"
              placeholder="Tìm theo quầy, ngày, ghi chú..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                outline: 'none',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap'
              }}
            />
          </div>

          {/* Lọc Trạng Thái Ca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Trạng thái:
            </span>
            {['all', 'open', 'closed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  border: statusFilter === st ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: statusFilter === st ? '#2563eb' : '#ffffff',
                  color: statusFilter === st ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {st === 'all' ? 'Tất cả' : st === 'open' ? 'Đang trực' : 'Đã đóng ca'}
              </button>
            ))}

            <button
              onClick={handleResetFilters}
              style={{
                marginLeft: '6px',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              title="Đặt lại toàn bộ tiêu chí lọc về mặc định"
            >
              Đặt lại
            </button>

            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '4px', whiteSpace: 'nowrap' }}>
              ({filteredHistory.length} ca)
            </span>
          </div>
        </div>

        {/* DÒNG 3: BỘ LỌC NÂNG CAO (Mở rộng khi click "Lọc nâng cao") */}
        {isAdvancedOpen && (
          <div style={{
            marginTop: '0.85rem',
            paddingTop: '0.85rem',
            borderTop: '1px dashed #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'nowrap',
            backgroundColor: '#f8fafc',
            padding: '8px 12px',
            borderRadius: '8px'
          }}>
            {/* Lọc Quỹ két */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Quỹ két:</span>
              <select
                value={reconciliationFilter}
                onChange={(e) => setReconciliationFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                <option value="all">Tất cả quỹ</option>
                <option value="verified">Khớp quỹ (100%)</option>
                <option value="discrepancy">Lệch quỹ (Thừa / Thiếu tiền)</option>
                <option value="pending">Chờ đối soát</option>
              </select>
            </div>

            {/* Lọc Sinh trắc học Face ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Xác thực Face ID:</span>
              <select
                value={faceFilter}
                onChange={(e) => setFaceFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                <option value="all">Tất cả</option>
                <option value="verified">Đã nhận diện Face ID</option>
                <option value="not-verified">Chưa nhận diện</option>
              </select>
            </div>

            {/* Tóm tắt điều kiện lọc đang bật */}
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              Đang áp dụng: <b>{filteredHistory.length}</b> kết quả phù hợp
            </div>
          </div>
        )}
      </div>

      {/* 2.2. BỐN THẺ CHỈ SỐ KPI TỰ ĐỘNG CẬP NHẬT THEO BỘ LỌC */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem',
        boxSizing: 'border-box'
      }}>
        {/* Card 1: Tổng ca & Ngày công */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Tổng Ca Trực Đã Đi
              </span>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                {dynamicKPI.attendanceRate}% Chuyên cần
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
              {dynamicKPI.totalShifts} <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748b' }}>ca</span>
            </div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            Đã hoàn thành: <b style={{ color: '#0f172a' }}>{dynamicKPI.closedShiftsCount}</b> ca • Phép: <b style={{ color: '#0f172a' }}>{dynamicKPI.leaveDaysCount}</b> ngày
          </div>
        </div>

        {/* Card 2: Tổng giờ công tích lũy */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Tổng Giờ Công Tích Lũy
              </span>
              <span style={{
                background: '#f0fdf4',
                color: '#16a34a',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                TB: {dynamicKPI.avgHoursPerShift}h / ca
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
              {dynamicKPI.totalWorkHours} <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748b' }}>giờ</span>
            </div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            Định mức: <b>8.0h/ca</b> • Giờ công thực tế
          </div>
        </div>

        {/* Card 3: Chất lượng chấm công Face ID */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Xác Thực Sinh Trắc Học
              </span>
              <span style={{
                background: '#faf5ff',
                color: '#9333ea',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                Face ID
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#9333ea', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
              {dynamicKPI.faceRate}% <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748b' }}>hợp lệ</span>
            </div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            Đạt: <b style={{ color: '#0f172a' }}>{dynamicKPI.faceVerifiedCount}/{dynamicKPI.totalShifts}</b> ca • Chuẩn Face ID
          </div>
        </div>

        {/* Card 4: Hiệu suất bán vé & Doanh số ca */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Doanh Số Bán Vé Tại Quầy
              </span>
              <span style={{
                background: '#fff7ed',
                color: '#ea580c',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                {dynamicKPI.totalTicketsSold} vé
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ea580c', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
              {(dynamicKPI.totalRevenue || 0).toLocaleString('vi-VN')} <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748b' }}>đ</span>
            </div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            TM: <b>{(dynamicKPI.totalCashRevenue || 0).toLocaleString('vi-VN')}đ</b> • CK: <b>{(dynamicKPI.totalCashlessRevenue || 0).toLocaleString('vi-VN')}đ</b>
          </div>
        </div>
      </div>

      {/* 2.3. BẢNG DANH SÁCH LỊCH SỬ CHẤM CÔNG CHI TIẾT */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflowX: 'auto',
        maxWidth: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        boxSizing: 'border-box'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', whiteSpace: 'nowrap' }}>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'center', width: '40px', whiteSpace: 'nowrap' }}>#</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>Ngày làm việc</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>Quầy vé</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>Văn phòng / Chi nhánh</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>Giờ vào ca</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', whiteSpace: 'nowrap' }}>Giờ tan ca</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Số giờ làm</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Face ID</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Số lượng vé</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }}>Doanh số vé</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Quỹ két</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái ca</th>
              <th style={{ padding: '11px 14px', fontWeight: '700', textAlign: 'center', width: '65px', whiteSpace: 'nowrap' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>
                  Đang tải bảng chấm công của bạn...
                </td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>
                  Không tìm thấy bản ghi chấm công nào phù hợp với bộ lọc đã chọn.
                </td>
              </tr>
            ) : (
              filteredHistory.map((shift, idx) => {
                const isOpen = shift.status === 'open';
                return (
                  <tr
                    key={shift.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setSelectedShift(shift)}
                  >
                    {/* STT */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {idx + 1}
                    </td>

                    {/* Ngày làm việc */}
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {shift.date}
                    </td>

                    {/* Quầy vé */}
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {shift.counterNumber || 'Quầy 01'}
                    </td>

                    {/* Văn phòng / Chi nhánh */}
                    <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {shift.officeName || 'Văn phòng Sài Gòn (BXMT)'}
                    </td>

                    {/* Giờ vào ca */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: '700', color: '#16a34a', whiteSpace: 'nowrap' }}>
                        {shift.checkInTime}
                      </span>
                    </td>

                    {/* Giờ tan ca */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: '700', color: isOpen ? '#ca8a04' : '#0f172a', whiteSpace: 'nowrap' }}>
                        {isOpen ? 'Đang mở' : shift.checkOutTime}
                      </span>
                    </td>

                    {/* Số giờ làm */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#0f172a',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap'
                      }}>
                        {shift.durationHours}h
                      </span>
                    </td>

                    {/* Xác thực Face ID */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {shift.faceVerified ? (
                        <span style={{
                          background: '#f0fdf4',
                          color: '#15803d',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          whiteSpace: 'nowrap'
                        }}>
                          Face ID
                        </span>
                      ) : (
                        <span style={{
                          background: '#fef2f2',
                          color: '#b91c1c',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          whiteSpace: 'nowrap'
                        }}>
                          Chưa nhận diện
                        </span>
                      )}
                    </td>

                    {/* Số lượng vé */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {shift.ticketsCount || 0} vé
                    </td>

                    {/* Doanh số vé */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {(shift.totalRevenue || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </td>

                    {/* Đối soát quỹ két */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {shift.reconciliationStatus === 'verified' ? (
                        <span style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          Khớp quỹ
                        </span>
                      ) : shift.reconciliationStatus === 'discrepancy' ? (
                        <span style={{
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          Lệch quỹ
                        </span>
                      ) : (
                        <span style={{
                          background: '#f8fafc',
                          color: '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          Chờ đối soát
                        </span>
                      )}
                    </td>

                    {/* Trạng thái ca */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {isOpen ? (
                        <span style={{
                          background: '#fef9c3',
                          color: '#854d0e',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          whiteSpace: 'nowrap'
                        }}>
                          Đang trực
                        </span>
                      ) : (
                        <span style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          whiteSpace: 'nowrap'
                        }}>
                          Đã đóng ca
                        </span>
                      )}
                    </td>

                    {/* Thao tác Xem chi tiết */}
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShift(shift);
                        }}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '4px',
                          padding: '3px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: '#2563eb',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL CHI TIẾT CA TRỰC ================= */}
      {selectedShift && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
        onClick={() => setSelectedShift(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              borderRadius: '14px 14px 0 0'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                  Chi Tiết Ca Trực: {selectedShift.counterNumber}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Ngày: <b>{selectedShift.date}</b> • {selectedShift.officeName}
                </div>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                &times;
              </button>
            </div>

            {/* Nội dung modal */}
            <div style={{ padding: '1.5rem' }}>
              {/* Ảnh đối soát Check-in & Check-out Face ID */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                  Đối Soát Ảnh Sinh Trắc Học Face ID
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Check-in Photo */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', marginBottom: '6px' }}>
                      Ảnh Check-in ({selectedShift.checkInTime})
                    </div>
                    {selectedShift.checkInPhoto ? (
                      <img
                        src={selectedShift.checkInPhoto}
                        alt="Face Check-in"
                        style={{
                          width: '100%',
                          height: '160px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1'
                        }}
                      />
                    ) : (
                      <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '6px', color: '#94a3b8' }}>
                        Không có ảnh lưu
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                      {selectedShift.faceVerified ? 'Đã nhận diện khuôn mặt' : 'Chưa nhận diện'}
                    </div>
                  </div>

                  {/* Check-out Photo */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: selectedShift.status === 'open' ? '#ca8a04' : '#2563eb', marginBottom: '6px' }}>
                      Ảnh Check-out ({selectedShift.checkOutTime || 'Chưa tan ca'})
                    </div>
                    {selectedShift.checkOutPhoto ? (
                      <img
                        src={selectedShift.checkOutPhoto}
                        alt="Face Check-out"
                        style={{
                          width: '100%',
                          height: '160px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1'
                        }}
                      />
                    ) : (
                      <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '6px', color: '#94a3b8' }}>
                        {selectedShift.status === 'open' ? 'Ca đang diễn ra' : 'Không có ảnh lưu'}
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                      {selectedShift.status === 'open' ? 'Chưa kết thúc ca' : 'Hoàn thành ca trực'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin dòng tiền & Đối soát quỹ */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                  Bảng Kê Doanh Thu & Đối Soát Quỹ Két
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Tiền mặt nhận đầu ca:</span>
                    <b style={{ marginLeft: '6px', color: '#0f172a' }}>{(selectedShift.initialCash || 0).toLocaleString('vi-VN')} đ</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Số vé đã xuất bán:</span>
                    <b style={{ marginLeft: '6px', color: '#0f172a' }}>{selectedShift.ticketsCount || 0} vé</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Tiền mặt thu tại quầy:</span>
                    <b style={{ marginLeft: '6px', color: '#16a34a' }}>{(selectedShift.cashRevenue || 0).toLocaleString('vi-VN')} đ</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Chuyển khoản / Quẹt thẻ:</span>
                    <b style={{ marginLeft: '6px', color: '#2563eb' }}>{(selectedShift.cashlessRevenue || 0).toLocaleString('vi-VN')} đ</b>
                  </div>
                  <div style={{ gridColumn: 'span 2', paddingTop: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>Tổng doanh số bán vé ca trực:</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ea580c' }}>
                      {(selectedShift.totalRevenue || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Ghi chú ca */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Ghi Chú Ca Trực Của Bạn:
                </label>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontStyle: selectedShift.notes ? 'normal' : 'italic'
                }}>
                  {selectedShift.notes || 'Không có ghi chú nào được thêm cho ca trực này.'}
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc',
              borderRadius: '0 0 14px 14px'
            }}>
              <button
                onClick={() => setSelectedShift(null)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.85rem',
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

export default AgentAttendanceReportPage;
