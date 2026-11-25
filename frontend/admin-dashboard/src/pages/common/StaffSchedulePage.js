import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const VIETNAMESE_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const SHORT_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const StaffSchedulePage = ({ setActiveTab }) => {
  const { token, user } = useContext(AuthContext);
  const [schedules, setSchedules] = useState([]);
  const [trips, setTrips] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [agentInfo, setAgentInfo] = useState({
    office: 'Văn phòng Bến xe Miền Đông',
    branchName: 'Chi nhánh TP. Hồ Chí Minh',
    shiftType: 'morning',
    shiftName: 'Ca Sáng (06:30 - 14:30)'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [weekOffset, setWeekOffset] = useState(0);

  // Tab chọn ngày trên màn hình điện thoại (mặc định là ngày hôm nay nếu nằm trong tuần hiện tại)
  const [selectedMobileDayIndex, setSelectedMobileDayIndex] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // 0=CN -> index 6, 1=T2 -> index 0
  });

  const isDriverOrAttendant = user?.role === 'driver' || user?.role === 'attendant';
  const isTicketAgent = user?.role === 'ticket_agent';

  // Tải lịch làm việc cá nhân
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
        setAttendances(data.attendances || []);
        setLeaves(data.leaves || []);
        setActiveShift(data.activeShift || null);
        if (data.agentProfile) {
          setAgentInfo(data.agentProfile);
        }
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
    const opt = { day: '2-digit', month: '2-digit' };
    return `${start.toLocaleDateString('vi-VN', opt)} - ${end.toLocaleDateString('vi-VN', opt)}/${end.getFullYear()}`;
  };

  const isToday = (dateObj) => {
    const today = new Date();
    return dateObj.getFullYear() === today.getFullYear() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getDate() === today.getDate();
  };

  // Chuẩn hóa tên ca và thời gian nghỉ (tinh gọn, không lặp lại giờ trong tiêu đề)
  const getShiftDetails = (shiftType, startTime, endTime) => {
    let title = 'Ca Sáng';
    let breakTime = '10:30 - 11:00 (Nghỉ giữa ca)';

    if (shiftType === 'evening') {
      title = 'Ca Chiều';
      breakTime = '18:00 - 18:30 (Nghỉ giữa ca)';
    } else if (shiftType === 'morning') {
      title = 'Ca Sáng';
      breakTime = '10:30 - 11:00 (Nghỉ giữa ca)';
    } else if (shiftType === 'full_day') {
      title = 'Ca Hành Chính';
      breakTime = '12:00 - 13:00 (Nghỉ trưa)';
    } else if (shiftType === 'night') {
      title = 'Ca Đêm';
      breakTime = '02:00 - 02:30 (Nghỉ giữa ca)';
    } else {
      title = 'Ca Trực Quầy';
      breakTime = 'Nghỉ giữa ca 30 phút';
    }

    return { title, breakTime };
  };

  // Setup điều kiện chuẩn xác cho trạng thái mỗi ngày dựa trên CSDL thực tế
  const calculateScheduleStatus = (dateObj, shiftStartTime = '06:30') => {
    const dateStr = dateObj.toLocaleDateString('en-CA');
    const dayNum = dateObj.getDay();

    // 1. Kiểm tra đơn xin nghỉ phép đã được phê duyệt (LeaveRequest)
    const isApprovedLeave = leaves.some(l => {
      if (l.status !== 'approved') return false;
      const start = new Date(l.startDate).toLocaleDateString('en-CA');
      const end = new Date(l.endDate).toLocaleDateString('en-CA');
      return dateStr >= start && dateStr <= end;
    });
    if (isApprovedLeave) return 'leave';

    // 2. Ngày nghỉ hàng tuần (Chủ Nhật)
    if (dayNum === 0) return 'off';

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');

    // 3. Tìm bản ghi chấm công thực tế của ngày này (Attendance)
    const dayAtt = attendances.find(a => {
      const dStr = new Date(a.date).toLocaleDateString('en-CA');
      const inStr = a.checkInTime ? new Date(a.checkInTime).toLocaleDateString('en-CA') : null;
      return dStr === dateStr || inStr === dateStr;
    });

    // 4. NẾU LÀ NGÀY HÔM NAY (TODAY)
    if (dateStr === todayStr) {
      if (dayAtt?.status === 'active') return 'in_shift';
      if (dayAtt?.status === 'closed') {
        if (dayAtt.checkInTime) {
          const inD = new Date(dayAtt.checkInTime);
          const inMinutes = inD.getHours() * 60 + inD.getMinutes();
          const [sH, sM] = shiftStartTime.split(':').map(Number);
          if (inMinutes > (sH * 60 + (sM || 0) + 15)) return 'late';
        }
        return 'completed';
      }
      const [sH, sM] = shiftStartTime.split(':').map(Number);
      const shiftStartMinutes = sH * 60 + (sM || 0);
      const curMinutes = now.getHours() * 60 + now.getMinutes();

      // Giờ kết thúc ca:
      // Ca sáng (06:30): kết thúc 14:30
      // Ca chiều (14:00): kết thúc 22:00
      // Ca hành chính: kết thúc 17:00
      let shiftEndMinutes = shiftStartMinutes + 8 * 60;
      if (shiftStartTime.startsWith('06')) shiftEndMinutes = 14 * 60 + 30;
      else if (shiftStartTime.startsWith('14')) shiftEndMinutes = 22 * 60;
      else if (shiftStartTime.startsWith('08') || shiftStartTime.startsWith('07')) shiftEndMinutes = 17 * 60;

      // Nếu đã quá giờ kết thúc ca mà không chấm công -> VẮNG MẶT (BỎ CA)
      if (curMinutes > shiftEndMinutes) return 'absent';
      if (curMinutes > shiftStartMinutes + 15) return 'late';
      return 'scheduled';
    }

    // 5. NẾU LÀ NGÀY TRONG QUÁ KHỨ (< today)
    if (dateStr < todayStr) {
      if (dayAtt && (dayAtt.status === 'closed' || dayAtt.checkInTime)) {
        if (dayAtt.checkInTime) {
          const inD = new Date(dayAtt.checkInTime);
          const inMinutes = inD.getHours() * 60 + inD.getMinutes();
          const [sH, sM] = shiftStartTime.split(':').map(Number);
          if (inMinutes > (sH * 60 + (sM || 0) + 15)) return 'late';
        }
        return 'completed';
      }
      // Quá khứ không có chấm công và không có đơn xin nghỉ phép -> VẮNG MẶT
      return 'absent';
    }

    // 6. NẾU LÀ NGÀY TRONG TƯƠNG LAI (> today)
    return 'scheduled';
  };

  // Lấy các ca hoặc chuyến xe trong ngày cụ thể (phân quyền chuẩn theo vai trò)
  const getShiftsForDay = (dateObj) => {
    const dateStr = dateObj.toLocaleDateString('en-CA');
    const dayNum = dateObj.getDay();

    // 1. Nếu là TÀI XẾ hoặc PHỤ XE: Lịch làm việc phân công theo CHUYẾN XE (Trips)
    if (isDriverOrAttendant) {
      const dayTrips = (trips || []).filter(t => {
        if (!t.departureTime) return false;
        return new Date(t.departureTime).toLocaleDateString('en-CA') === dateStr;
      });

      if (dayTrips.length === 0) {
        const isLeave = leaves.some(l => {
          if (l.status !== 'approved') return false;
          const start = new Date(l.startDate).toLocaleDateString('en-CA');
          const end = new Date(l.endDate).toLocaleDateString('en-CA');
          return dateStr >= start && dateStr <= end;
        });

        return [{
          _id: `crew-off-${dateStr}`,
          isOff: !isLeave,
          isLeave,
          title: isLeave ? 'Nghỉ Phép' : 'Nghỉ Ca',
          timeRange: isLeave ? 'Theo đơn phê duyệt' : 'Không có chuyến xe',
          busPlate: '--',
          busType: '--',
          status: isLeave ? 'leave' : 'off'
        }];
      }

      return dayTrips.map(t => {
        const dep = new Date(t.departureTime);
        const arr = t.arrivalTime ? new Date(t.arrivalTime) : new Date(dep.getTime() + 5.5 * 3600 * 1000);
        let status = t.journeyStatus || 'scheduled';
        const now = new Date();
        const isPast = dep < now;
        if (status === 'completed') status = 'completed';
        else if (status === 'running') status = 'in_transit';
        else if (status === 'cancelled') status = 'cancelled';
        else if (isPast && (now.getTime() - dep.getTime()) > 30 * 60000) status = 'late';
        else status = 'scheduled';

        return {
          _id: t._id,
          isTrip: true,
          title: t.routeId?.name || (t.routeId ? `${t.routeId.startPoint} ➔ ${t.routeId.endPoint}` : 'Chuyến xe'),
          timeRange: `${dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${arr.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
          busPlate: t.busId?.plateNumber || '51B-029.29',
          busType: t.busId?.type || 'Xe Khách Cao Cấp',
          roleInTrip: user?.role === 'driver' ? 'Tài chính' : 'Phụ xe',
          status,
          duration: 'Theo chuyến xe',
          salaryType: 'Lương cố định tháng',
          tripData: t
        };
      });
    }

    // 2. NHÂN VIÊN BÁN VÉ / HÀNH CHÍNH / QUẢN LÝ (Chủ Nhật nghỉ hàng tuần theo quy định)
    if (dayNum === 0) {
      return [{
        _id: `off-sun-${dateStr}`,
        isOff: true,
        title: 'Nghỉ Chủ Nhật',
        timeRange: 'Nghỉ theo quy định',
        breakTime: '',
        workLocation: agentInfo?.office || 'Văn phòng Bến xe Miền Đông',
        workHours: 0,
        duration: 'Nghỉ',
        salaryType: 'Lương cố định tháng',
        status: 'off'
      }];
    }

    // Tự động phân ca chuẩn mực:
    // Với ticket_agent: lấy từ agentProfile?.shiftType ('morning' | 'evening')
    // Với office / quản lý: Ca Hành Chính 8h (08:00 - 17:00)
    const shiftType = isTicketAgent ? (agentInfo?.shiftType || 'morning') : 'full_day';
    const startTime = isTicketAgent ? (shiftType === 'evening' ? '14:00' : '06:30') : '08:00';
    const endTime = isTicketAgent ? (shiftType === 'evening' ? '22:00' : '14:30') : '17:00';
    const details = getShiftDetails(shiftType, startTime, endTime);
    const computedStatus = calculateScheduleStatus(dateObj, startTime);

    return [{
      _id: `shift-${dateStr}`,
      isOffice: !isTicketAgent,
      isTicketAgent,
      title: details.title,
      timeRange: `${startTime} - ${endTime}`,
      breakTime: details.breakTime,
      workLocation: agentInfo?.office || 'Văn phòng Bến xe Miền Đông',
      duration: '8 tiếng / ngày',
      salaryType: 'Lương cố định tháng',
      status: computedStatus
    }];
  };

  // Định dạng badge trạng thái chuẩn mực (Không dùng emoji icon)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_shift':
        return { text: 'Đang trực ca', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'in_transit':
        return { text: 'Đang di chuyển', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'completed':
      case 'present':
        return { text: 'Đã hoàn thành', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'scheduled':
        return { text: 'Lịch phân công', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'late':
        return { text: 'Đi trễ', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
      case 'leave':
        return { text: 'Nghỉ phép', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
      case 'absent':
        return { text: 'Vắng mặt', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
      case 'off':
        return { text: 'Nghỉ tuần', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
      case 'cancelled':
        return { text: 'Chuyến hủy', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
      default:
        return { text: 'Lịch phân công', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  // Thống kê tuần
  const allShiftsThisWeek = weekDates.flatMap(d => getShiftsForDay(d));
  const activeShiftsThisWeek = allShiftsThisWeek.filter(s => !s.isOff);
  const todayShifts = getShiftsForDay(new Date());
  const todayActiveShift = todayShifts.find(s => !s.isOff) || null;
  const completedShiftsCount = activeShiftsThisWeek.filter(s => s.status === 'completed' || s.status === 'present').length;

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%' }}>
      {/* CSS Nhúng phục vụ Responsive đa thiết bị & Kanban Grid */}
      <style>{`
        .schedule-panel-box {
          background: #ffffff;
          border-radius: 14px;
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
          padding: 0.85rem 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        /* Lưới 7 ngày Desktop */
        .kanban-desktop-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }

        .mobile-day-filter {
          display: none;
        }

        .mobile-table-card-list {
          display: none;
        }

        .desktop-table-container {
          display: block;
          overflow-x: auto;
          width: 100%;
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

        /* Mobile (<= 768px) */
        @media (max-width: 768px) {
          .desktop-table-container {
            display: none !important;
          }
          .mobile-table-card-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }

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
            padding: 0.45rem 0.55rem !important;
            font-size: 0.72rem !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .refresh-text {
            display: none !important;
          }

          .schedule-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.45rem !important;
          }
          .schedule-stat-card {
            padding: 0.65rem !important;
            border-radius: 10px !important;
          }
          .schedule-stat-card .stat-title {
            font-size: 0.62rem !important;
            letter-spacing: 0.2px !important;
          }
          .schedule-stat-card .stat-val {
            font-size: 1.05rem !important;
          }
          .schedule-stat-card .stat-sub {
            font-size: 0.62rem !important;
          }

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
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: '800', cursor: 'pointer' }}>Đóng</button>
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
                {isDriverOrAttendant ? 'Lịch Làm Việc & Phân Công Chuyến Xe' : 'Lịch Làm Việc & Phân Công Ca Trực'}
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
              {isDriverOrAttendant
                ? `Xin chào ${user?.name || 'Tài xế'}! Đây là lịch chạy xe và ca làm việc phân công chính thức của bạn.`
                : `Xin chào ${user?.name || 'Nhân viên bán vé'}! Đây là lịch trực quầy vé và ca làm việc hành chính chính thức của bạn.`}
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
              ‹ Trước
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
              Tuần này
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
              Sau ›
            </button>

            <button
              onClick={fetchMySchedule}
              disabled={loading}
              className="refresh-btn"
              title="Tải lại dữ liệu"
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                padding: '0.42rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span className="refresh-text">{loading ? '...' : 'Tải lại'}</span>
            </button>
          </div>
        </div>

        {/* 4 Key Stat Cards (Tối ưu giao diện điều hành chuẩn) */}
        <div className="schedule-stat-grid">
          {/* Card 1: Tổng lịch trình tuần */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isDriverOrAttendant ? 'LỊCH TRÌNH TUẦN' : 'LỊCH TRỰC TUẦN'}
              </span>
              <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
                Tuần
              </span>
            </div>
            <div className="stat-val" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {isDriverOrAttendant
                ? `${allShiftsThisWeek.length} ca`
                : `${activeShiftsThisWeek.length} ca (${activeShiftsThisWeek.length * 8}h)`}
            </div>
            <div className="stat-sub" style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Đã hoàn thành: {completedShiftsCount}/{activeShiftsThisWeek.length}
            </div>
          </div>

          {/* Card 2: Lịch trình hôm nay */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                HÔM NAY ({new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                background: todayActiveShift ? '#ecfdf5' : '#f8fafc',
                color: todayActiveShift ? '#059669' : '#64748b',
                borderRadius: '4px',
                fontWeight: '700'
              }}>
                Hôm nay
              </span>
            </div>
            <div className="stat-val" style={{
              fontSize: '1.15rem',
              fontWeight: '800',
              color: todayActiveShift ? '#059669' : '#64748b',
              marginBottom: '2px',
              lineHeight: '1.2'
            }}>
              {isDriverOrAttendant
                ? (todayShifts.length > 0 ? `${todayShifts.length} chuyến` : 'Nghỉ ca')
                : (todayActiveShift ? (todayActiveShift.title || 'Ca Trực Phân Công') : 'Nghỉ tuần')}
            </div>
            <div className="stat-sub" style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isDriverOrAttendant
                ? (todayShifts.length > 0 && !todayShifts[0].isOff ? todayShifts[0].title : 'Không có ca chạy hôm nay')
                : (todayActiveShift ? `Giờ: ${todayActiveShift.timeRange}` : 'Nghỉ Chủ Nhật theo quy định')}
            </div>
          </div>

          {/* Card 3: Nơi làm việc hoặc Phương tiện */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isDriverOrAttendant ? 'PHƯƠNG TIỆN PHÂN CÔNG' : 'ĐỊA ĐIỂM LÀM VIỆC'}
              </span>
              <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
                {isDriverOrAttendant ? 'Phương tiện' : 'Địa điểm'}
              </span>
            </div>
            <div className="stat-val" style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {isDriverOrAttendant
                ? (todayShifts[0]?.busPlate && todayShifts[0]?.busPlate !== '--' ? `Xe ${todayShifts[0].busPlate}` : 'Chưa có chuyến')
                : (agentInfo?.office || 'Văn phòng Bến xe Miền Đông')}
            </div>
            <div className="stat-sub" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isDriverOrAttendant
                ? (todayShifts[0]?.busType || 'Tổ lái An Bình Lines')
                : (activeShift ? `Đang trực ca tại: ${activeShift.userId?.assignedOffice || user?.assignedOffice || 'Văn phòng vé'}` : (agentInfo?.branchName || 'Chi nhánh TP. Hồ Chí Minh'))}
            </div>
          </div>

          {/* Card 4: Khoảng thời gian tuần */}
          <div className="schedule-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="stat-title" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TUẦN LÀM VIỆC
              </span>
              <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#ecfdf5', color: '#059669', borderRadius: '4px', fontWeight: '700' }}>
                Quy chuẩn
              </span>
            </div>
            <div className="stat-val" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatWeekRange(weekDates)}
            </div>
            <div className="stat-sub" style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>
              8h / ngày • Nghỉ Chủ Nhật
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
                {isDriverOrAttendant ? 'Chi Tiết Lịch Phân Công 7 Ngày Trong Tuần' : 'Chi Tiết Phân Công Ca Trực 7 Ngày Trong Tuần'}
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
              {isDriverOrAttendant
                ? 'Theo dõi lộ trình, ca chạy xe được điều động và trạng thái thực hiện trong tuần'
                : 'Theo dõi ca làm việc hành chính, ca trực quầy vé và trạng thái chấm công trong tuần'}
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
          <div style={{ textAlign: 'center', padding: '3.5rem 0' }}>
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
          /* CHẾ ĐỘ 1: KANBAN 7 NGÀY TRONG TUẦN                         */
          /* ========================================================= */
          <div>
            {/* Bộ chọn nhanh Thứ trên Mobile dạng Day Strip */}
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
                      borderRadius: '10px',
                      padding: '8px 7px',
                      border: activeDay ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      boxShadow: activeDay ? '0 3px 10px rgba(37, 99, 235, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                      gap: '8px',
                      minHeight: '260px'
                    }}
                  >
                    {/* Header ngày trong tuần */}
                    <div style={{
                      textAlign: 'center',
                      paddingBottom: '6px',
                      borderBottom: activeDay ? '2px solid #bfdbfe' : '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        fontWeight: '800',
                        fontSize: '0.8rem',
                        color: activeDay ? '#1d4ed8' : '#334155',
                        lineHeight: '1.2'
                      }}>
                        {VIETNAMESE_DAYS[idx]}
                      </div>
                      <div style={{
                        fontSize: '0.68rem',
                        color: activeDay ? '#2563eb' : '#64748b',
                        fontWeight: '600'
                      }}>
                        {date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}
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
                          borderRadius: '8px'
                        }}>
                          <div style={{ fontWeight: '700', color: '#475569', marginBottom: '2px' }}>Nghỉ ca</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Không có lịch phân công</div>
                        </div>
                      ) : (
                        shifts.map(shift => {
                          const badge = shift.isOff
                            ? { text: 'Nghỉ tuần', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
                            : getStatusBadge(shift.status);

                          if (shift.isOff) {
                            return (
                              <div
                                key={shift._id}
                                style={{
                                  background: '#ffffff',
                                  border: '1px dashed #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '10px 8px',
                                  textAlign: 'center',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  margin: 'auto 0'
                                }}
                              >
                                <div style={{ fontWeight: '800', fontSize: '0.76rem', color: '#64748b' }}>
                                  {shift.title}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                  Nghỉ hàng tuần
                                </div>
                                <div>
                                  <span style={{
                                    fontSize: '0.62rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`,
                                    fontWeight: '700'
                                  }}>
                                    {badge.text}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          // Trường hợp nhân viên bán vé
                          if (isTicketAgent) {
                            return (
                              <div
                                key={shift._id}
                                style={{
                                  background: '#ffffff',
                                  border: activeDay ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '9px 8px',
                                  boxShadow: activeDay ? '0 2px 6px rgba(59,130,246,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  textAlign: 'left'
                                }}
                              >
                                {/* Tiêu đề ca */}
                                <div style={{
                                  fontWeight: '800',
                                  fontSize: '0.82rem',
                                  color: '#0f172a',
                                  lineHeight: '1.25'
                                }}>
                                  {shift.title}
                                </div>

                                {/* Giờ làm việc */}
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: '#1d4ed8',
                                  fontWeight: '700',
                                  lineHeight: '1.2'
                                }}>
                                  Giờ: {shift.timeRange}
                                </div>

                                {/* Giờ nghỉ giữa ca */}
                                {shift.breakTime && (
                                  <div style={{
                                    fontSize: '0.65rem',
                                    color: '#64748b',
                                    lineHeight: '1.2'
                                  }}>
                                    {shift.breakTime}
                                  </div>
                                )}

                                {/* Địa điểm làm việc */}
                                <div style={{
                                  fontSize: '0.68rem',
                                  color: '#334155',
                                  fontWeight: '600',
                                  lineHeight: '1.25',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {shift.workLocation || agentInfo?.office || 'Văn phòng Bến xe Miền Đông'}
                                </div>
                                {activeDay && activeShift && (
                                  <div style={{
                                    fontSize: '0.65rem',
                                    color: '#059669',
                                    fontWeight: '700',
                                    lineHeight: '1.2'
                                  }}>
                                    Đang trực tại: {activeShift.userId?.assignedOffice || user?.assignedOffice || 'Văn phòng vé'}
                                  </div>
                                )}

                                {/* Trạng thái */}
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

                                {/* Nút thao tác nhanh hôm nay */}
                                {activeDay && (
                                  <button
                                    onClick={() => setActiveTab && setActiveTab('agent-booking')}
                                    style={{
                                      marginTop: '4px',
                                      backgroundColor: '#2563eb',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '5px 8px',
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      width: '100%',
                                      textAlign: 'center'
                                    }}
                                  >
                                    Đến Quầy Bán Vé
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // Trường hợp Cán bộ Quản lý / Văn phòng
                          if (!isTicketAgent && !isDriverOrAttendant) {
                            return (
                              <div
                                key={shift._id}
                                style={{
                                  background: '#ffffff',
                                  border: activeDay ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '9px 8px',
                                  boxShadow: activeDay ? '0 2px 6px rgba(59,130,246,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  textAlign: 'left'
                                }}
                              >
                                <div style={{
                                  fontWeight: '800',
                                  fontSize: '0.82rem',
                                  color: '#0f172a',
                                  lineHeight: '1.25'
                                }}>
                                  {shift.title}
                                </div>
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: '#1d4ed8',
                                  fontWeight: '700',
                                  lineHeight: '1.2'
                                }}>
                                  Giờ: {shift.timeRange}
                                </div>
                                {shift.breakTime && (
                                  <div style={{
                                    fontSize: '0.65rem',
                                    color: '#64748b',
                                    lineHeight: '1.2'
                                  }}>
                                    {shift.breakTime}
                                  </div>
                                )}
                                <div style={{
                                  fontSize: '0.7rem',
                                  color: '#334155',
                                  fontWeight: '600',
                                  lineHeight: '1.2',
                                  marginTop: '2px'
                                }}>
                                  Nơi làm việc: <strong style={{ color: '#0f172a' }}>{shift.workLocation || agentInfo?.office || 'Văn phòng Bến xe Miền Đông'}</strong>
                                </div>
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
                              </div>
                            );
                          }

                          // Trường hợp tài xế / phụ xe
                          return (
                            <div
                              key={shift._id}
                              style={{
                                background: '#ffffff',
                                border: activeDay ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px 7px',
                                boxShadow: activeDay ? '0 2px 6px rgba(59,130,246,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{
                                fontWeight: '800',
                                fontSize: '0.78rem',
                                color: '#1e40af',
                                lineHeight: '1.25',
                                marginBottom: '2px',
                                wordBreak: 'break-word'
                              }}>
                                {shift.title}
                              </div>

                              <div style={{
                                fontSize: '0.72rem',
                                color: '#0f172a',
                                fontWeight: '700',
                                lineHeight: '1.2',
                                whiteSpace: 'nowrap'
                              }}>
                                Xuất bến: {shift.timeRange}
                              </div>

                              {shift.busPlate && shift.busPlate !== '--' && (
                                <div style={{
                                  fontSize: '0.7rem',
                                  color: '#1e293b',
                                  fontWeight: '600',
                                  lineHeight: '1.2'
                                }}>
                                  Xe: <span style={{ fontWeight: '700', color: '#0f172a' }}>{shift.busPlate}</span> ({shift.busType ? shift.busType.replace(/^Xe\s+/i, '') : 'Giường nằm'})
                                </div>
                              )}

                              <div style={{
                                fontSize: '0.68rem',
                                color: '#64748b',
                                lineHeight: '1.2'
                              }}>
                                Vai trò: <strong style={{ color: '#2563eb' }}>{shift.roleInTrip || (user?.role === 'driver' ? 'Tài chính' : 'Phụ xe')}</strong>
                              </div>

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

                              {activeDay && shift.isTrip && (
                                <button
                                  onClick={() => setActiveTab && setActiveTab('driver-status')}
                                  style={{
                                    marginTop: '4px',
                                    backgroundColor: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    padding: '5px 8px',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'center'
                                  }}
                                >
                                  Vào Chuyến Chạy
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
          <div>
            {/* Desktop Table View */}
            <div className="desktop-table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '10px 12px', fontWeight: '800' }}>Ngày</th>
                    <th style={{ padding: '10px 12px', fontWeight: '800' }}>
                      {isDriverOrAttendant ? 'Ca / Lộ Trình' : 'Ca Làm Việc'}
                    </th>
                    <th style={{ padding: '10px 12px', fontWeight: '800' }}>
                      {isDriverOrAttendant ? 'Phương Tiện' : 'Địa Điểm / Quầy'}
                    </th>
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
                        workLocation: '--',
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
                      ? { text: 'Nghỉ tuần', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
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

                        {/* Vị trí / Phương tiện */}
                        <td style={{ padding: '12px 10px' }}>
                          {isDriverOrAttendant ? (
                            item.busPlate && item.busPlate !== '--' ? (
                              <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.75rem' }}>
                                {item.busPlate}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>--</span>
                            )
                          ) : isTicketAgent ? (
                            <span style={{ color: item.isOff ? '#94a3b8' : '#334155', fontWeight: '600' }}>
                              {item.isOff ? '--' : (item.workLocation || agentInfo?.office || 'Văn phòng Bến xe Miền Đông')}
                            </span>
                          ) : (
                            <span style={{ color: item.isOff ? '#94a3b8' : '#334155', fontWeight: '600' }}>
                              {item.isOff ? '--' : (item.workLocation || 'Văn phòng Bến xe Miền Đông')}
                            </span>
                          )}
                        </td>

                        {/* Khung giờ */}
                        <td style={{ padding: '12px 10px', fontWeight: '700', color: '#334155' }}>
                          {item.timeRange}
                        </td>

                        {/* Thời lượng */}
                        <td style={{ padding: '12px 10px', color: '#64748b' }}>
                          {item.isOff ? '--' : (item.duration || '8 tiếng/ngày')}
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
                          {item.isCurrentDay && !item.isOff && (
                            isDriverOrAttendant ? (
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
                                Vào Chuyến
                              </button>
                            ) : (
                              <button
                                onClick={() => setActiveTab && setActiveTab('agent-booking')}
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
                                Đến Quầy Vé
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Tối ưu riêng cho màn hình điện thoại) */}
            <div className="mobile-table-card-list">
              {weekDates.flatMap((d, dayIndex) => {
                const shifts = getShiftsForDay(d);
                const isCurrentDay = isToday(d);

                if (shifts.length === 0) {
                  return [{
                    _id: `off-${dayIndex}`,
                    date: d,
                    title: 'Nghỉ Chủ Nhật',
                    timeRange: 'Nghỉ theo quy định',
                    workLocation: '--',
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
                  ? { text: 'Nghỉ tuần', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
                  : getStatusBadge(item.status);

                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: item.isCurrentDay ? '#f0f9ff' : '#ffffff',
                      border: item.isCurrentDay ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      boxShadow: item.isCurrentDay ? '0 2px 8px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px'
                    }}
                  >
                    {/* Hàng 1: Thứ, Ngày & Badge Trạng Thái */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.8rem', color: item.isCurrentDay ? '#1d4ed8' : '#0f172a' }}>
                          {item.date ? item.date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'N/A'}
                        </span>
                        {item.isCurrentDay && (
                          <span style={{ fontSize: '0.62rem', background: '#2563eb', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                            Hôm nay
                          </span>
                        )}
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.66rem',
                        fontWeight: '700',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.text}
                      </span>
                    </div>

                    {/* Hàng 2: Tên Lộ trình / Ca làm việc */}
                    <div style={{ fontWeight: '800', fontSize: '0.82rem', color: item.isOff ? '#94a3b8' : '#1e40af' }}>
                      {item.title}
                    </div>

                    {/* Hàng 3: Khung giờ & Xe / Địa điểm */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#475569' }}>
                      <div>
                        Xuất bến: <strong style={{ color: '#0f172a' }}>{item.timeRange}</strong>
                      </div>
                      {item.busPlate && item.busPlate !== '--' && (
                        <div>
                          Xe: <strong style={{ color: '#2563eb' }}>{item.busPlate}</strong>
                        </div>
                      )}
                    </div>

                    {/* Hàng 4: Nút Vào Chuyến Chạy (hôm nay) */}
                    {item.isCurrentDay && !item.isOff && (
                      <div style={{ marginTop: '2px' }}>
                        {isDriverOrAttendant ? (
                          <button
                            onClick={() => setActiveTab && setActiveTab('driver-status')}
                            style={{
                              width: '100%',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                          >
                            Vào Chuyến Chạy
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveTab && setActiveTab('agent-booking')}
                            style={{
                              width: '100%',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                          >
                            Đến Quầy Bán Vé
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffSchedulePage;
