import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const VIETNAMESE_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const SHORT_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const StaffSchedulePage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const [schedules, setSchedules] = useState([]);
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [weekOffset, setWeekOffset] = useState(0);

  // Tab chọn ngày trên màn hình điện thoại (mặc định là ngày hôm nay nếu nằm trong tuần hiện tại)
  const [selectedMobileDayIndex, setSelectedMobileDayIndex] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // 0=CN -> index 6, 1=T2 -> index 0
  });

  // Tải lịch làm việc cá nhân của tài xế / nhân viên
  const fetchMySchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users/my-schedule`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrips(data.trips || []);
        setSchedules(data.schedules || []);
      } else {
        setError(data.message || 'Không thể tải lịch làm việc cá nhân.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu lịch làm việc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMySchedule();
    }
  }, [token]);

  // Tiện ích tính toán 7 ngày trong tuần theo offset
  const getWeekDates = (offset = 0) => {
    const current = new Date();
    let day = current.getDay();
    let diff = current.getDate() - day + (day === 0 ? -6 : 1);

    const startOfWeek = new Date(current.setDate(diff + offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(startOfWeek);
      nextDay.setDate(startOfWeek.getDate() + i);
      weekDays.push(nextDay);
    }
    return weekDays;
  };

  const weekDates = getWeekDates(weekOffset);

  const formatWeekRange = (dates) => {
    const start = dates[0];
    const end = dates[6];
    const opt = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return `Tuần từ ${start.toLocaleDateString('vi-VN', opt)} đến ${end.toLocaleDateString('vi-VN', opt)}`;
  };

  const isToday = (dateObj) => {
    const today = new Date();
    return dateObj.getFullYear() === today.getFullYear() &&
           dateObj.getMonth() === today.getMonth() &&
           dateObj.getDate() === today.getDate();
  };

  // Lấy các ca hoặc chuyến xe trong ngày cụ thể của tài xế
  const getShiftsForDay = (dateObj) => {
    const dateStr = dateObj.toLocaleDateString('en-CA');
    const dayNum = dateObj.getDay();

    // 1. Nếu tài xế có chuyến xe được phân công trong ngày
    if (trips && trips.length > 0) {
      const dayTrips = trips.filter(t => {
        if (!t.departureTime) return false;
        const d = new Date(t.departureTime);
        return d.toLocaleDateString('en-CA') === dateStr;
      });

      if (dayTrips.length > 0) {
        return dayTrips.map(t => {
          const dep = new Date(t.departureTime);
          const arr = t.arrivalTime ? new Date(t.arrivalTime) : new Date(dep.getTime() + 5.5 * 3600 * 1000);
          return {
            _id: t._id,
            isTrip: true,
            title: t.routeId ? `${t.routeId.startPoint} ➔ ${t.routeId.endPoint}` : 'Chuyến xe',
            timeRange: `${dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${arr.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
            departureTime: t.departureTime,
            arrivalTime: t.arrivalTime,
            busPlate: t.busId?.plateNumber || '51B-029.29',
            busType: t.busId?.type || 'Xe Khách Cao Cấp',
            status: t.journeyStatus || 'scheduled',
            notes: 'Lịch chạy chuyến được phân công',
            salaryType: 'Lương cố định tháng',
            duration: '8 tiếng/ngày',
            tripData: t
          };
        });
      }
    }

    if (dayNum === 0) return []; // Chủ nhật nghỉ

    // 2. Nếu có ca làm việc hành chính từ bảng schedules
    const daySchedules = schedules.filter(s => {
      const d = new Date(s.date);
      return d.toLocaleDateString('en-CA') === dateStr;
    });

    if (daySchedules.length > 0) {
      const s = daySchedules[0];
      const shifts = [];
      shifts.push({
        _id: `${s._id}-am`,
        title: 'Ca Sáng Hành Chính',
        timeRange: '08:00 - 12:00',
        departureTime: new Date(dateObj).setHours(8, 0, 0, 0),
        status: s.status,
        notes: 'Cố định 8 tiếng/ngày (Sáng 08:00 - 12:00)',
        salaryType: s.salaryType || 'Lương cố định tháng',
        duration: '4 giờ'
      });

      if (dayNum !== 6) {
        shifts.push({
          _id: `${s._id}-pm`,
          title: 'Ca Chiều Hành Chính',
          timeRange: '13:00 - 17:00',
          departureTime: new Date(dateObj).setHours(13, 0, 0, 0),
          status: s.status,
          notes: 'Cố định 8 tiếng/ngày (Chiều 13:00 - 17:00)',
          salaryType: s.salaryType || 'Lương cố định tháng',
          duration: '4 giờ'
        });
      }
      return shifts;
    }

    // 3. Mặc định 8h/ngày cho nhân sự hành chính
    const defaultShifts = [
      {
        _id: `def-am-${dateObj.getTime()}`,
        title: 'Ca Sáng Hành Chính',
        timeRange: '08:00 - 12:00',
        departureTime: new Date(dateObj).setHours(8, 0, 0, 0),
        status: 'present',
        notes: 'Cố định 8 tiếng/ngày (Sáng 08:00 - 12:00)',
        salaryType: 'Lương cố định tháng',
        duration: '4 giờ'
      }
    ];

    if (dayNum !== 6) {
      defaultShifts.push({
        _id: `def-pm-${dateObj.getTime()}`,
        title: 'Ca Chiều Hành Chính',
        timeRange: '13:00 - 17:00',
        departureTime: new Date(dateObj).setHours(13, 0, 0, 0),
        status: 'present',
        notes: 'Cố định 8 tiếng/ngày (Chiều 13:00 - 17:00)',
        salaryType: 'Lương cố định tháng',
        duration: '4 giờ'
      });
    }

    return defaultShifts;
  };

  // Định dạng badge trạng thái
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'present':
        return { text: 'Đã làm việc', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'in_transit':
        return { text: 'Đang di chuyển', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'scheduled':
        return { text: 'Chờ xuất bến', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'late':
        return { text: 'Đi trễ', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
      case 'leave':
        return { text: 'Nghỉ phép', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
      case 'absent':
        return { text: 'Vắng mặt', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
      default:
        return { text: 'Lịch cố định', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  // Tính toán số liệu thống kê cho 4 Key Stat Cards
  const allShiftsThisWeek = weekDates.flatMap(d => getShiftsForDay(d));
  const todayShifts = getShiftsForDay(new Date());
  const completedShiftsCount = allShiftsThisWeek.filter(s => s.status === 'completed' || s.status === 'present').length;

  const nextUpcomingTrip = todayShifts.find(s => s.status === 'scheduled' || s.status === 'in_transit') ||
                           allShiftsThisWeek.find(s => s.status === 'scheduled' || s.status === 'in_transit') ||
                           todayShifts[0] || null;

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%' }}>
      {/* CSS Nhúng phục vụ Responsive đa thiết bị & Kanban Grid */}
      <style>{`
        .schedule-panel-box {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 0.85rem;
        }

        .schedule-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .schedule-panel-box {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 0.85rem;
        }

        .schedule-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .schedule-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .schedule-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .schedule-stat-card {
          background: #ffffff;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        /* Lưới 7 ngày Desktop: Co giãn hoàn hảo 7 cột */
        .kanban-desktop-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }

        .mobile-day-filter {
          display: none;
        }

        /* Tablet (768px - 1024px) */
        @media (max-width: 1024px) {
          .kanban-desktop-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .schedule-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Mobile (<= 768px): Tối ưu toàn diện trải nghiệm di động */
        @media (max-width: 768px) {
          .schedule-panel-box {
            padding: 0.85rem 0.75rem !important;
            border-radius: 12px !important;
            gap: 0.85rem !important;
            margin-bottom: 0.75rem !important;
          }

          .schedule-header-wrap {
            flex-direction: column;
            align-items: stretch !important;
            gap: 0.65rem !important;
          }

          /* Thanh điều hướng tuần trên mobile: Dàn hàng ngang đều 1 dòng */
          .schedule-header-actions {
            display: flex !important;
            width: 100% !important;
            gap: 5px !important;
            align-items: stretch !important;
          }
          .schedule-header-actions .week-nav-btn {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            padding: 0.45rem 0.2rem !important;
            font-size: 0.72rem !important;
            text-align: center !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .schedule-header-actions .refresh-btn {
            flex: 0 0 auto !important;
            padding: 0.45rem 0.65rem !important;
            font-size: 0.72rem !important;
          }

          /* 4 Thẻ thống kê: Giữ 2 cột (2x2) nhỏ gọn, tránh chiếm trọn màn hình */
          .schedule-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.45rem !important;
          }
          .schedule-stat-card {
            padding: 0.55rem 0.65rem !important;
            border-radius: 10px !important;
          }
          .schedule-stat-card .stat-icon {
            width: 26px !important;
            height: 26px !important;
          }
          .schedule-stat-card .stat-icon svg {
            width: 13px !important;
            height: 13px !important;
          }
          .schedule-stat-card .stat-title {
            font-size: 0.6rem !important;
            letter-spacing: 0.2px !important;
          }
          .schedule-stat-card .stat-val {
            font-size: 1.05rem !important;
          }
          .schedule-stat-card .stat-sub {
            font-size: 0.62rem !important;
          }

          /* Bộ chuyển đổi chế độ xem: 100% chiều rộng */
          .view-mode-container {
            width: 100% !important;
            margin-top: 4px !important;
          }
          .view-mode-container button {
            flex: 1 1 0 !important;
            text-align: center !important;
            justify-content: center !important;
            padding: 0.45rem 0.5rem !important;
          }

          /* Bộ chọn nhanh Thứ dạng Strip mượt mà, triệt tiêu thanh cuộn thô */
          .mobile-day-filter {
            display: flex !important;
            gap: 6px !important;
            overflow-x: auto !important;
            padding: 2px 2px 8px 2px !important;
            margin-bottom: 8px !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          .mobile-day-filter::-webkit-scrollbar {
            display: none !important;
          }

          /* Danh sách ngày: Hiển thị full width trên điện thoại */
          .kanban-desktop-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .kanban-day-column {
            min-height: auto !important;
            padding: 10px 8px !important;
          }
          .mobile-hidden-day {
            display: none !important;
          }
        }
      `}</style>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          marginBottom: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: '800', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* VÙNG 1: CARD TRẮNG HEADER TỔNG QUAN & 4 THẺ THỐNG KÊ (TOP) */}
      {/* ========================================================= */}
      <div className="schedule-panel-box">
        {/* Header Title & Week Navigation Actions */}
        <div className="schedule-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Lịch Làm Việc &amp; Phân Công Chuyến Xe
              </h1>
              <span style={{
                background: '#dbeafe',
                color: '#1d4ed8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Lương Cố Định Tháng
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                8 tiếng / ngày
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Xin chào <strong style={{ color: '#2563eb' }}>{user?.name || 'Tài xế'}</strong>! Đây là lịch chạy xe và ca làm việc phân công chính thức của bạn.
            </p>
          </div>

          {/* Quick Header Actions: Navigation Tuần & Tải lại */}
          <div className="schedule-header-actions">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="week-nav-btn"
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.42rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Xem tuần trước"
            >
              ← Tuần trước
            </button>

            <button
              onClick={() => setWeekOffset(0)}
              className="week-nav-btn"
              style={{
                backgroundColor: weekOffset === 0 ? '#eff6ff' : '#ffffff',
                border: `1px solid ${weekOffset === 0 ? '#93c5fd' : '#cbd5e1'}`,
                color: weekOffset === 0 ? '#1d4ed8' : '#334155',
                padding: '0.42rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Tuần hiện tại
            </button>

            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="week-nav-btn"
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.42rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Xem tuần sau"
            >
              Tuần sau →
            </button>

            <button
              onClick={fetchMySchedule}
              disabled={loading}
              className="refresh-btn"
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                padding: '0.42rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>{loading ? '...' : 'Tải lại'}</span>
            </button>
          </div>
        </div>

        {/* 4 Key Stat Cards (Tối ưu 2x2 trên mobile) */}
        <div className="schedule-stat-grid">
          {/* Card 1: Tổng lịch trình tuần */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LỊCH TRÌNH TUẦN
              </span>
              <div className="stat-icon" style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
            </div>
            <div className="stat-val" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {allShiftsThisWeek.length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>ca</span>
            </div>
            <div className="stat-sub" style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ✓ Đã hoàn thành: {completedShiftsCount}/{allShiftsThisWeek.length}
            </div>
          </div>

          {/* Card 2: Lịch trình hôm nay */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                HÔM NAY ({new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
              </span>
              <div className="stat-icon" style={{ width: '32px', height: '32px', borderRadius: '8px', background: todayShifts.length > 0 ? '#ecfdf5' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={todayShifts.length > 0 ? '#10b981' : '#64748b'} strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
            </div>
            <div className="stat-val" style={{
              fontSize: '1.15rem',
              fontWeight: '800',
              color: todayShifts.length > 0 ? '#059669' : '#64748b',
              marginBottom: '2px',
              lineHeight: '1.2'
            }}>
              {todayShifts.length > 0 ? `${todayShifts.length} chuyến` : 'Nghỉ ca'}
            </div>
            <div className="stat-sub" style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {todayShifts.length > 0 ? todayShifts[0].title : 'Không có ca'}
            </div>
          </div>

          {/* Card 3: Xuất bến gần nhất */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                XUẤT BẾN TỚI
              </span>
              <div className="stat-icon" style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/>
                  <circle cx="7" cy="17" r="2"/>
                  <path d="M9 17h6"/>
                  <circle cx="17" cy="17" r="2"/>
                </svg>
              </div>
            </div>
            <div className="stat-val" style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {nextUpcomingTrip ? (nextUpcomingTrip.timeRange.split('-')[0].trim()) : '--:--'}
            </div>
            <div className="stat-sub" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nextUpcomingTrip ? `Xe ${nextUpcomingTrip.busPlate}` : 'Chưa có chuyến'}
            </div>
          </div>

          {/* Card 4: Khoảng thời gian tuần */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TUẦN LÀM VIỆC
              </span>
              <div className="stat-icon" style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>
            <div className="stat-val" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatWeekRange(weekDates)}
            </div>
            <div className="stat-sub" style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>
              8h/ngày • Nghỉ CN
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: CARD TRẮNG LỊCH CHI TIẾT (KANBAN 7 NGÀY & TABLE)  */}
      {/* ========================================================= */}
      <div className="schedule-panel-box">
        {/* Header của Vùng 2: Tiêu đề & Bộ chuyển đổi View Mode */}
        <div className="schedule-header-wrap" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Chi Tiết Lịch Phân Công 7 Ngày Trong Tuần
              </h2>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                7 Ngày / Tuần
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
              Theo dõi lộ trình, ca chạy xe được điều động và trạng thái thực hiện trong tuần
            </p>
          </div>

          {/* Bộ chuyển đổi chế độ xem: Lịch Tuần (Kanban) vs Bảng Danh Sách */}
          <div className="view-mode-container" style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1'
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'kanban' ? '#ffffff' : 'transparent',
                color: viewMode === 'kanban' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Lịch Tuần (Kanban)
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Bảng Danh Sách
            </button>
          </div>
        </div>

        {/* Nội dung chính: Loading hoặc Dữ liệu */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}></div>
            <p style={{ color: '#64748b', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
              Đang tải thông tin lịch làm việc cá nhân...
            </p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* ========================================================= */
          /* CHẾ ĐỘ 1: KANBAN 7 NGÀY TRONG TUẦN (THỜI KHÓA BIỂU ĐẠI HỌC) */
          /* ========================================================= */
          <div>
            {/* Bộ chọn nhanh Thứ trên Mobile dạng Day Strip Native */}
            <div className="mobile-day-filter">
              {weekDates.map((d, idx) => {
                const todayActive = isToday(d);
                const isSelected = selectedMobileDayIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedMobileDayIndex(idx)}
                    style={{
                      flexShrink: 0,
                      padding: '5px 8px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? '#2563eb' : (todayActive ? '#93c5fd' : '#e2e8f0')}`,
                      background: isSelected ? '#2563eb' : (todayActive ? '#eff6ff' : '#ffffff'),
                      color: isSelected ? '#ffffff' : (todayActive ? '#1d4ed8' : '#334155'),
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '52px',
                      gap: '1px',
                      boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: '800' }}>{SHORT_DAYS[idx]}</span>
                    <span style={{ fontSize: '0.62rem', opacity: isSelected ? 0.95 : 0.75 }}>
                      {d.getDate()}/{d.getMonth() + 1}
                    </span>
                    {todayActive && (
                      <span style={{
                        fontSize: '0.52rem',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        background: isSelected ? '#ffffff' : '#2563eb',
                        color: isSelected ? '#2563eb' : '#ffffff',
                        fontWeight: '800',
                        marginTop: '1px',
                        lineHeight: '1.2'
                      }}>
                        Nay
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => setSelectedMobileDayIndex(-1)}
                style={{
                  flexShrink: 0,
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: `1.5px solid ${selectedMobileDayIndex === -1 ? '#2563eb' : '#e2e8f0'}`,
                  background: selectedMobileDayIndex === -1 ? '#2563eb' : '#ffffff',
                  color: selectedMobileDayIndex === -1 ? '#ffffff' : '#334155',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '54px',
                  gap: '1px',
                  boxShadow: selectedMobileDayIndex === -1 ? '0 2px 6px rgba(37,99,235,0.2)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.74rem', fontWeight: '800' }}>Tất cả</span>
                <span style={{ fontSize: '0.62rem', opacity: selectedMobileDayIndex === -1 ? 0.95 : 0.75 }}>7 ngày</span>
              </button>
            </div>

            {/* Lưới 7 Cột Lịch tuần */}
            <div className="kanban-desktop-grid">
              {weekDates.map((date, idx) => {
                const activeDay = isToday(date);
                const shifts = getShiftsForDay(date);

                // Trên mobile nếu đang lọc 1 ngày cụ thể mà không phải ngày này thì ẩn
                const isFilteredOut = selectedMobileDayIndex !== -1 && selectedMobileDayIndex !== idx;

                return (
                  <div
                    key={idx}
                    className={`kanban-day-column ${isFilteredOut ? 'mobile-hidden-day' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: activeDay ? '#f0f7ff' : '#f8fafc',
                      borderRadius: '8px',
                      padding: '8px 6px',
                      border: activeDay ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      boxShadow: activeDay ? '0 3px 10px rgba(37, 99, 235, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                      gap: '8px',
                      minHeight: '260px'
                    }}
                  >
                    {/* Header ngày trong tuần theo phong cách Thời khóa biểu */}
                    <div style={{
                      textAlign: 'center',
                      borderBottom: `1px solid ${activeDay ? '#bfdbfe' : '#e2e8f0'}`,
                      paddingBottom: '6px'
                    }}>
                      <div style={{
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        color: activeDay ? '#1d4ed8' : '#0369a1',
                        lineHeight: '1.2'
                      }}>
                        {VIETNAMESE_DAYS[idx]}
                      </div>
                      <div style={{
                        fontSize: '0.72rem',
                        color: activeDay ? '#2563eb' : '#0284c7',
                        fontWeight: '700',
                        marginTop: '2px'
                      }}>
                        {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      {activeDay && (
                        <div style={{ marginTop: '3px' }}>
                          <span style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            fontSize: '0.58rem',
                            fontWeight: '800',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            display: 'inline-block'
                          }}>
                            Hôm nay
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Danh sách ca / chuyến trong ngày */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      {shifts.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          color: '#64748b',
                          fontSize: '0.72rem',
                          margin: 'auto 0',
                          padding: '1.25rem 0.5rem',
                          background: '#ffffff',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Nghỉ ca</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Không có lịch chạy</div>
                        </div>
                      ) : (
                        shifts.map(shift => {
                          const badge = getStatusBadge(shift.status);

                          return (
                            <div
                              key={shift._id}
                              style={{
                                background: '#fefce8',
                                border: '1px solid #facc15',
                                borderRadius: '6px',
                                padding: '8px 7px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                textAlign: 'left'
                              }}
                            >
                              {/* Dòng 1: Tuyến xe (in đậm như Tên môn học) */}
                              <div style={{
                                fontWeight: '800',
                                fontSize: '0.76rem',
                                color: '#003865',
                                lineHeight: '1.25',
                                marginBottom: '2px',
                                wordBreak: 'break-word'
                              }}>
                                {shift.title}
                              </div>

                              {/* Dòng 2: Khung giờ chạy */}
                              <div style={{
                                fontSize: '0.72rem',
                                color: '#1e3a8a',
                                fontWeight: '700',
                                lineHeight: '1.2',
                                whiteSpace: 'nowrap'
                              }}>
                                Giờ: {shift.timeRange}
                              </div>

                              {/* Dòng 3: Biển số xe */}
                              {shift.busPlate && (
                                <div style={{
                                  fontSize: '0.7rem',
                                  color: '#1e293b',
                                  fontWeight: '600',
                                  lineHeight: '1.2'
                                }}>
                                  Xe: <span style={{ fontWeight: '700' }}>{shift.busPlate}</span>
                                </div>
                              )}

                              {/* Dòng 4: Loại phương tiện */}
                              {shift.busType && (
                                <div style={{
                                  fontSize: '0.67rem',
                                  color: '#475569',
                                  lineHeight: '1.2'
                                }}>
                                  Loại: {shift.busType.replace(/^Xe\s+/i, '')}
                                </div>
                              )}

                              {/* Dòng 5: Trạng thái */}
                              <div style={{ marginTop: '3px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.62rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: badge.bg,
                                  color: badge.color,
                                  fontWeight: '700',
                                  border: `1px solid ${badge.border}`
                                }}>
                                  {badge.text}
                                </span>
                              </div>

                              {/* Dòng 6: Nút hành động nhanh nếu là chuyến hôm nay */}
                              {activeDay && shift.isTrip && (
                                <button
                                  onClick={() => setActiveTab && setActiveTab('driver-status')}
                                  style={{
                                    marginTop: '5px',
                                    backgroundColor: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    padding: '5px 8px',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'center',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                                >
                                  Vào Chuyến Chạy →
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* CHẾ ĐỘ 2: BẢNG DANH SÁCH CHI TIẾT (TABLE / LIST VIEW)     */
          /* ========================================================= */
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Ngày</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Ca / Lộ Trình</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Phương Tiện</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Khung Giờ</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Thời Lượng</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>Chế Độ Lương</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {weekDates.flatMap((d, dayIndex) => {
                  const shifts = getShiftsForDay(d);
                  const isCurrentDay = isToday(d);

                  if (shifts.length === 0) {
                    return [{
                      _id: `off-${dayIndex}`,
                      date: d,
                      title: 'Nghỉ Chủ Nhật',
                      timeRange: '--:--',
                      busPlate: '--',
                      isOff: true,
                      isCurrentDay
                    }];
                  }

                  return shifts.map(s => ({
                    ...s,
                    date: d,
                    isCurrentDay
                  }));
                }).map((item, i) => {
                  const badge = item.isOff
                    ? { text: 'Nghỉ ngơi', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
                    : getStatusBadge(item.status);

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '0.8rem',
                        backgroundColor: item.isCurrentDay ? '#f0f9ff' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => { if (!item.isCurrentDay) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={e => { if (!item.isCurrentDay) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Ngày */}
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: item.isCurrentDay ? '#1d4ed8' : '#0f172a' }}>
                        <div>{item.date ? item.date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'N/A'}</div>
                        {item.isCurrentDay && <span style={{ fontSize: '0.62rem', background: '#2563eb', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>Hôm nay</span>}
                      </td>

                      {/* Ca / Lộ trình */}
                      <td style={{ padding: '12px 10px', fontWeight: '800', color: item.isOff ? '#94a3b8' : '#1e40af' }}>
                        {item.title}
                      </td>

                      {/* Phương tiện */}
                      <td style={{ padding: '12px 10px' }}>
                        {item.busPlate && item.busPlate !== '--' ? (
                          <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.75rem' }}>
                            {item.busPlate}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      {/* Khung giờ */}
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: '#334155' }}>
                        {item.timeRange}
                      </td>

                      {/* Thời lượng */}
                      <td style={{ padding: '12px 10px', color: '#64748b' }}>
                        {item.isOff ? '--' : '8 tiếng/ngày'}
                      </td>

                      {/* Chế độ lương */}
                      <td style={{ padding: '12px 10px', color: '#047857', fontWeight: '700' }}>
                        {item.isOff ? '--' : (item.salaryType || 'Lương cố định tháng')}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.text}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        {item.isTrip && item.isCurrentDay && (
                          <button
                            onClick={() => setActiveTab && setActiveTab('driver-status')}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Vào Chuyến ➔
                          </button>
                        )}
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
  );
};

export default StaffSchedulePage;
