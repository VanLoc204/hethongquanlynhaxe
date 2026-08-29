import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const StaffSchedulePage = () => {
  const { token, user } = useContext(AuthContext);
  const [schedules, setSchedules] = useState([]);
  const [trips, setTrips] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [weekOffset, setWeekOffset] = useState(0);

  // Fetch strictly the logged-in user's personal schedule
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

  // Date Utilities
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

  // Get shifts or trips strictly for the logged-in user on a specific day
  const getShiftsForDay = (dateObj) => {
    const dateStr = dateObj.toLocaleDateString('en-CA');
    const dayNum = dateObj.getDay();
    if (dayNum === 0) return []; // Sunday OFF

    // If logged-in user has assigned trips (Driver / Attendant)
    if (trips.length > 0) {
      return trips.filter(t => {
        const d = new Date(t.departureTime);
        return d.toLocaleDateString('en-CA') === dateStr;
      }).map(t => {
        const dep = new Date(t.departureTime);
        const arr = new Date(t.arrivalTime);
        return {
          _id: t._id,
          isTrip: true,
          title: t.routeId ? `${t.routeId.startPoint} → ${t.routeId.endPoint}` : 'Chuyến xe',
          timeRange: `${dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${arr.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          busPlate: t.busId?.plateNumber || 'Chưa gán xe',
          status: 'present',
          notes: 'Lịch chạy chuyến được điều động'
        };
      });
    }

    // Filter personal DB schedules for the logged-in user
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
        salaryType: s.salaryType || 'Lương cố định tháng'
      });

      if (dayNum !== 6) { // Saturday afternoon OFF
        shifts.push({
          _id: `${s._id}-pm`,
          title: 'Ca Chiều Hành Chính',
          timeRange: '13:00 - 17:00',
          departureTime: new Date(dateObj).setHours(13, 0, 0, 0),
          status: s.status,
          notes: 'Cố định 8 tiếng/ngày (Chiều 13:00 - 17:00)',
          salaryType: s.salaryType || 'Lương cố định tháng'
        });
      }
      return shifts;
    }

    // Default 8h personal shifts for office/ops staff
    const defaultShifts = [
      {
        _id: `def-am-${dateObj.getTime()}`,
        title: 'Ca Sáng Hành Chính',
        timeRange: '08:00 - 12:00',
        departureTime: new Date(dateObj).setHours(8, 0, 0, 0),
        status: 'present',
        notes: 'Cố định 8 tiếng/ngày (Sáng 08:00 - 12:00)',
        salaryType: 'Lương cố định tháng'
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
        salaryType: 'Lương cố định tháng'
      });
    }

    return defaultShifts;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return { text: 'Đã làm việc', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'late':
        return { text: 'Đi trễ', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
      case 'leave':
        return { text: 'Nghỉ phép', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
      case 'absent':
        return { text: 'Vắng mặt', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
      default:
        return { text: 'Lịch cố định', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    }
  };

  const VIETNAMESE_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.3s ease', minHeight: '500px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Lịch Làm Việc Cá Nhân</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Xin chào <strong style={{ color: 'var(--primary)' }}>{user?.name || 'Nhân viên'}</strong>! Đây là lịch làm việc 8 tiếng/ngày (lương cố định tháng) của bạn.
          </p>
        </div>

        {/* View switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <button 
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', border: 'none', borderRadius: '4px',
              cursor: 'pointer', background: viewMode === 'kanban' ? 'white' : 'transparent',
              color: viewMode === 'kanban' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Lịch tuần (Kanban)
          </button>
          <button 
            onClick={() => setViewMode('table')}
            style={{
              padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', border: 'none', borderRadius: '4px',
              cursor: 'pointer', background: viewMode === 'table' ? 'white' : 'transparent',
              color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Bảng Danh Sách
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Week Navigator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setWeekOffset(prev => prev - 1)}>
            ← Tuần trước
          </button>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setWeekOffset(0)}>
            Tuần hiện tại
          </button>
        </div>
        <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.95rem' }}>
          {formatWeekRange(weekDates)}
        </span>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setWeekOffset(prev => prev + 1)}>
          Tuần sau →
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải thông tin lịch làm việc cá nhân...
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN VIEW */
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '1rem' }}>
          {weekDates.map((date, idx) => {
            const activeDay = isToday(date);
            const shifts = getShiftsForDay(date);
            
            return (
              <div 
                key={idx} 
                style={{
                  flex: 1, 
                  minWidth: '200px', 
                  background: activeDay ? 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)' : '#f8fafc',
                  borderRadius: '12px', 
                  padding: '12px 10px', 
                  border: activeDay ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  boxShadow: activeDay ? '0 4px 14px rgba(37, 99, 235, 0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Day Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: activeDay ? '#1e40af' : '#475569' }}>
                    {VIETNAMESE_DAYS[idx]}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                    {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>

                {/* Shift Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {shifts.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '2rem' }}>
                      Nghỉ Chủ Nhật
                    </div>
                  ) : (
                    shifts.map(shift => {
                      const badge = getStatusBadge(shift.status);

                      return (
                        <div 
                          key={shift._id}
                          style={{
                            background: '#ffffff',
                            border: `1px solid ${badge.border}`,
                            borderLeft: `4px solid ${badge.color}`,
                            borderRadius: '8px',
                            padding: '10px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#1e293b' }}>
                              {shift.timeRange}
                            </span>
                            <span style={{ 
                              fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                              backgroundColor: badge.bg, color: badge.color, fontWeight: '700',
                              border: `1px solid ${badge.border}`
                            }}>
                              {badge.text}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                            {shift.title}
                          </div>

                          {shift.busPlate && (
                            <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                              <strong>Xe:</strong> {shift.busPlate}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                            <span>8 tiếng/ngày</span>
                            <span style={{ fontWeight: '600', color: '#047857' }}>{shift.salaryType || 'Lương cố định tháng'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th style={{ padding: '10px' }}>Ngày</th>
                <th style={{ padding: '10px' }}>Ca làm việc</th>
                <th style={{ padding: '10px' }}>Khung giờ</th>
                <th style={{ padding: '10px' }}>Thời lượng</th>
                <th style={{ padding: '10px' }}>Chế độ lương</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {weekDates.flatMap(d => getShiftsForDay(d)).map((shift, i) => {
                const badge = getStatusBadge(shift.status);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                      {shift.departureTime ? new Date(shift.departureTime).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: '600', color: 'var(--primary)' }}>
                      {shift.title}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>{shift.timeRange}</td>
                    <td style={{ padding: '12px 10px' }}>8 tiếng/ngày</td>
                    <td style={{ padding: '12px 10px', color: '#047857', fontWeight: '600' }}>{shift.salaryType || 'Lương cố định tháng'}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700',
                        backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                      }}>
                        {badge.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default StaffSchedulePage;
