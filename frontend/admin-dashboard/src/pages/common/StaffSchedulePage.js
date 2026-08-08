import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StaffSchedulePage = () => {
  const { token, user } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  // Custom states for Kanban layout
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/users/my-schedule', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setTrips(data.trips);
        } else {
          setError(data.message || 'Không thể tải lịch làm việc.');
        }
      } catch (err) {
        setError('Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [token]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper logic to find week dates based on weekOffset
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

  const getTripsForDay = (dateObj) => {
    return trips.filter(trip => {
      const tripDate = new Date(trip.departureTime);
      return tripDate.getFullYear() === dateObj.getFullYear() &&
             tripDate.getMonth() === dateObj.getMonth() &&
             tripDate.getDate() === dateObj.getDate();
    });
  };

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

  const renderTripCard = (trip) => {
    let borderLeftColor = '#6366f1'; 
    let statusText = 'Lên kế hoạch';
    if (trip.status === 'running') {
      borderLeftColor = '#3b82f6';
      statusText = 'Đang chạy';
    } else if (trip.status === 'completed') {
      borderLeftColor = '#10b981';
      statusText = 'Hoàn tất';
    }
    
    return (
      <div 
        key={trip._id}
        onClick={() => setSelectedTrip(trip)}
        style={{
          background: 'white',
          borderLeft: `4px solid ${borderLeftColor}`,
          borderRadius: '6px',
          padding: '0.6rem 0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease',
          border: '1px solid #e2e8f0',
          borderLeftWidth: '5px',
          marginBottom: '0.4rem'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.85rem' }}>
            {formatTime(trip.departureTime)}
          </span>
          <span style={{ 
            fontSize: '0.65rem', 
            padding: '2px 5px', 
            borderRadius: '3px',
            background: trip.status === 'completed' ? '#ecfdf5' : '#f5f3ff',
            color: trip.status === 'completed' ? '#047857' : '#4f46e5',
            fontWeight: '700'
          }}>
            {statusText}
          </span>
        </div>
        
        <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#334155', marginBottom: '0.3rem' }}>
          {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
          <span>{trip.busId?.plateNumber || 'N/A'}</span>
          <span>{trip.bookedSeats?.length || 0}/{trip.busId?.totalSeats || 36} ghế</span>
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="spinner-loader" style={{
          border: '3px solid rgba(0, 48, 135, 0.1)',
          borderLeftColor: 'var(--primary)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  const VIETNAMESE_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Lịch Trình Chạy Xe</h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Lịch làm việc phân công chi tiết của tổ lái phục vụ hành khách.
          </p>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <button 
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: viewMode === 'kanban' ? 'white' : 'transparent',
              color: viewMode === 'kanban' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Kanban Tuần
          </button>
          <button 
            onClick={() => setViewMode('table')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: viewMode === 'table' ? 'white' : 'transparent',
              color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Bảng Danh Sách
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Date navigations for Kanban Mode */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setWeekOffset(prev => prev - 1)}>
              ← Tuần trước
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
              Tuần hiện tại
            </button>
          </div>
          <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.9rem' }}>
            {formatWeekRange(weekDates)}
          </span>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setWeekOffset(prev => prev + 1)}>
            Tuần sau →
          </button>
        </div>
      )}

      {/* RENDER KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="kanban-grid-wrapper" style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(180px, 1fr))', columnGap: '0.75rem', rowGap: '0', minWidth: '1200px' }}>
            {/* Row 1: Headers */}
            {weekDates.map((date, idx) => {
              const activeDay = isToday(date);
              const borderColor = activeDay ? '#8b5cf6' : '#cbd5e1';
              const borderWidth = activeDay ? '2px' : '1px';
              return (
                <div 
                  key={`header-${idx}`} 
                  style={{ 
                    textAlign: 'center', 
                    background: activeDay ? '#8b5cf6' : '#64748b',
                    color: 'white',
                    borderRadius: '8px 8px 0 0',
                    padding: '0.5rem 0',
                    border: `${borderWidth} solid ${borderColor}`,
                    borderBottom: 'none',
                    boxShadow: activeDay ? '0 -2px 6px rgba(139, 92, 246, 0.15)' : 'none'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.85rem' }}>{VIETNAMESE_DAYS[idx]}</strong>
                  <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                </div>
              );
            })}

            {/* Row 2: AM Blocks */}
            {weekDates.map((date, idx) => {
              const dayTrips = getTripsForDay(date);
              const amTrips = dayTrips.filter(trip => new Date(trip.departureTime).getHours() < 12);
              const activeDay = isToday(date);
              const borderColor = activeDay ? '#8b5cf6' : '#cbd5e1';
              const borderWidth = activeDay ? '2px' : '1px';
              return (
                <div 
                  key={`am-${idx}`} 
                  style={{
                    background: activeDay ? '#f5f3ff' : '#f8fafc',
                    borderLeft: `${borderWidth} solid ${borderColor}`,
                    borderRight: `${borderWidth} solid ${borderColor}`,
                    borderBottom: `1px dashed ${activeDay ? '#d8b4fe' : '#cbd5e1'}`,
                    padding: '0.6rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontSize: '0.65rem', 
                    fontWeight: '700', 
                    color: '#0369a1',
                    background: '#e0f2fe',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    width: 'fit-content',
                    marginBottom: '0.2rem'
                  }}>
                    Sáng (AM)
                  </div>
                  {amTrips.length === 0 ? (
                    <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.7rem', minHeight: '60px' }}>
                      Trống lịch
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {amTrips.map(trip => renderTripCard(trip))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Row 3: PM Blocks */}
            {weekDates.map((date, idx) => {
              const dayTrips = getTripsForDay(date);
              const pmTrips = dayTrips.filter(trip => new Date(trip.departureTime).getHours() >= 12);
              const activeDay = isToday(date);
              const borderColor = activeDay ? '#8b5cf6' : '#cbd5e1';
              const borderWidth = activeDay ? '2px' : '1px';
              return (
                <div 
                  key={`pm-${idx}`} 
                  style={{
                    background: activeDay ? '#f5f3ff' : '#f8fafc',
                    borderLeft: `${borderWidth} solid ${borderColor}`,
                    borderRight: `${borderWidth} solid ${borderColor}`,
                    borderBottom: `${borderWidth} solid ${borderColor}`,
                    borderRadius: '0 0 8px 8px',
                    padding: '0.6rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    boxShadow: activeDay ? '0 4px 6px rgba(139, 92, 246, 0.15)' : 'none'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontSize: '0.65rem', 
                    fontWeight: '700', 
                    color: '#b45309',
                    background: '#fef3c7',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    width: 'fit-content',
                    marginBottom: '0.2rem'
                  }}>
                    Chiều/Tối (PM)
                  </div>
                  {pmTrips.length === 0 ? (
                    <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.7rem', minHeight: '60px' }}>
                      Trống lịch
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {pmTrips.map(trip => renderTripCard(trip))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER TABLE VIEW (FALLBACK/TOGGLED) */}
      {viewMode === 'table' && (
        <>
          {trips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <p>Không có chuyến đi nào được phân công cho bạn trong thời gian này.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                    <th style={{ padding: '1rem' }}>Tuyến đường</th>
                    <th style={{ padding: '1rem' }}>Thời gian đi</th>
                    <th style={{ padding: '1rem' }}>Phương tiện</th>
                    <th style={{ padding: '1rem' }}>Trạng thái</th>
                    <th style={{ padding: '1rem' }}>Số ghế đã đặt</th>
                    <th style={{ padding: '1rem' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip._id} style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>
                        {trip.routeId ? `${trip.routeId.startPoint} ⇄ ${trip.routeId.endPoint}` : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '500' }}>{formatTime(trip.departureTime)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(trip.departureTime)}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '500' }}>{trip.busId?.plateNumber || 'N/A'}</div>
                        <span className="bus-type-badge">{trip.busId?.type || 'Standard'}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px',
                          background: trip.status === 'completed' ? '#e6f7ff' : '#f9f0ff',
                          color: trip.status === 'completed' ? '#1890ff' : '#722ed1',
                          fontWeight: '600'
                        }}>
                          {trip.status === 'completed' ? 'Hoàn tất' : trip.status === 'running' ? 'Đang chạy' : 'Mở bán'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong>{trip.bookedSeats?.length || 0}</strong> / {trip.busId?.totalSeats || 36} ghế
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => setSelectedTrip(trip)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* SELECTED TRIP DETAILS MODAL */}
      {selectedTrip && (
        <div className="modal-backdrop" onClick={() => setSelectedTrip(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
            background: 'white', padding: '1.5rem', borderRadius: '8px', width: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Chi Tiết Chuyến Xe Phân Công</h2>
              <button className="modal-close" onClick={() => setSelectedTrip(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Tuyến xe chạy</label>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)' }}>
                  {selectedTrip.routeId ? `${selectedTrip.routeId.startPoint} ⇄ ${selectedTrip.routeId.endPoint}` : 'N/A'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Thời gian khởi hành</label>
                  <strong>{formatTime(selectedTrip.departureTime)}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{formatDate(selectedTrip.departureTime)}</div>
                </div>
                <div>
                  <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Thời gian đến dự kiến</label>
                  <strong>{formatTime(selectedTrip.arrivalTime)}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{formatDate(selectedTrip.arrivalTime)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Xe khách phân phối</label>
                  <strong>{selectedTrip.busId?.plateNumber || 'N/A'}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Loại xe: {selectedTrip.busId?.type || 'Giường nằm'}</div>
                </div>
                <div>
                  <label style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Số lượng ghế đã bán</label>
                  <strong>{selectedTrip.bookedSeats?.length || 0}</strong> / {selectedTrip.busId?.totalSeats || 36} ghế
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: '700', color: '#475569', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Tổ nhân viên phục vụ:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <div><strong>Tài xế:</strong> {selectedTrip.driver?.name || 'Không xác định'} ({selectedTrip.driver?.phone || 'N/A'})</div>
                  <div><strong>Phụ xe:</strong> {selectedTrip.assistant?.name || 'Không xác định'} ({selectedTrip.assistant?.phone || 'N/A'})</div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedTrip(null)}>Đóng chi tiết</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default StaffSchedulePage;
