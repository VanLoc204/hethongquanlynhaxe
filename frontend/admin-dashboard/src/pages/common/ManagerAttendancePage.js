import React, { useState } from 'react';

const ManagerAttendancePage = () => {
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Seed data representing employee attendance logs for today
  const attendanceLogs = [
    {
      id: 'att_1',
      name: 'Tài xế An Bình',
      role: 'driver',
      roleName: 'Tài xế',
      status: 'active', // active, closed, absent
      startTime: '05:30:22',
      endTime: '--:--:--',
      location: 'Bến Xe Đà Lạt',
      gps: '11.9404° N, 108.4578° E',
      verification: 'Hợp lệ (GPS)'
    },
    {
      id: 'att_2',
      name: 'Phạm Quốc Bảo',
      role: 'attendant',
      roleName: 'Phụ xe',
      status: 'active',
      startTime: '05:31:10',
      endTime: '--:--:--',
      location: 'Bến Xe Đà Lạt',
      gps: '11.9404° N, 108.4578° E',
      verification: 'Hợp lệ (GPS)'
    },
    {
      id: 'att_3',
      name: 'Trần Thị Quầy',
      role: 'ticket_agent',
      roleName: 'Nhân viên bán vé',
      status: 'active',
      startTime: '07:00:15',
      endTime: '--:--:--',
      location: 'Quầy Vé 01 - HCM',
      gps: '10.8204° N, 106.6378° E',
      verification: 'Hợp lệ (Wifi VP)'
    },
    {
      id: 'att_4',
      name: 'Lê Văn Tài',
      role: 'driver',
      roleName: 'Tài xế',
      status: 'closed',
      startTime: '04:00:00',
      endTime: '12:00:00',
      location: 'Bến Xe Cần Thơ',
      gps: '10.0354° N, 105.7828° E',
      verification: 'Hợp lệ (GPS)'
    },
    {
      id: 'att_5',
      name: 'Nguyễn Văn Phụ',
      role: 'attendant',
      roleName: 'Phụ xe',
      status: 'closed',
      startTime: '04:00:12',
      endTime: '12:00:30',
      location: 'Bến Xe Cần Thơ',
      gps: '10.0354° N, 105.7828° E',
      verification: 'Hợp lệ (GPS)'
    },
    {
      id: 'att_6',
      name: 'Đoàn Thị Vé',
      role: 'ticket_agent',
      roleName: 'Nhân viên bán vé',
      status: 'closed',
      startTime: '06:00:00',
      endTime: '14:00:00',
      location: 'Quầy Vé Đà Lạt',
      gps: '11.9404° N, 108.4578° E',
      verification: 'Hợp lệ (Wifi VP)'
    },
    {
      id: 'att_7',
      name: 'Vũ Đức Tài',
      role: 'driver',
      roleName: 'Tài xế',
      status: 'absent',
      startTime: '--:--:--',
      endTime: '--:--:--',
      location: 'Chưa điểm danh',
      gps: '--',
      verification: 'Chưa ghi nhận'
    },
    {
      id: 'att_8',
      name: 'Ngô Quốc Phụ',
      role: 'attendant',
      roleName: 'Phụ xe',
      status: 'absent',
      startTime: '--:--:--',
      endTime: '--:--:--',
      location: 'Chưa điểm danh',
      gps: '--',
      verification: 'Chưa ghi nhận'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.1)', 
            color: '#10b981', 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: '700', 
            whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
            Đang trực
          </span>
        );
      case 'closed':
        return (
          <span style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(100, 116, 139, 0.1)', 
            color: '#64748b', 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: '700', 
            whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b', display: 'inline-block' }}></span>
            Đã tan ca
          </span>
        );
      default:
        return (
          <span style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: '700', 
            whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
            Vắng mặt
          </span>
        );
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      driver: { bg: '#eff6ff', color: '#1e40af', text: 'Tài xế' },
      attendant: { bg: '#fff7ed', color: '#c2410c', text: 'Phụ xe' },
      ticket_agent: { bg: '#faf5ff', color: '#6b21a8', text: 'Bán vé' }
    };
    const b = badges[role] || { bg: '#f1f5f9', color: '#334155', text: role };
    return (
      <span style={{ 
        background: b.bg, 
        color: b.color, 
        border: `1px solid ${b.color}20`, 
        padding: '2px 8px', 
        borderRadius: '12px', 
        fontSize: '0.7rem', 
        fontWeight: '700', 
        whiteSpace: 'nowrap' 
      }}>
        {b.text}
      </span>
    );
  };

  // Helper to get initials and premium gradient avatar
  const getAvatar = (name, role) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const gradients = {
      driver: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      attendant: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
      ticket_agent: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)'
    };
    const background = gradients[role] || 'linear-gradient(135deg, #64748b 0%, #334155 100%)';
    return (
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '0.85rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        {initials}
      </div>
    );
  };

  // Aggregated data
  const totalCount = attendanceLogs.length;
  const activeCount = attendanceLogs.filter(l => l.status === 'active').length;
  const closedCount = attendanceLogs.filter(l => l.status === 'closed').length;
  const absentCount = attendanceLogs.filter(l => l.status === 'absent').length;

  const filteredLogs = attendanceLogs.filter(log => {
    const matchesRole = filterRole === 'all' || log.role === filterRole;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesSearch = log.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Premium KPI Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* Total Staff */}
        <div className="premium-kpi-card" style={{
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nhân sự hôm nay</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>{totalCount} nhân viên</div>
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600', display: 'block', marginTop: '6px' }}>Danh sách phân công trực</span>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: '#3b82f6' }}></div>
        </div>

        {/* On Duty */}
        <div className="premium-kpi-card" style={{
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Đang trong ca trực</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981', marginTop: '6px' }}>{activeCount} đang trực</div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', display: 'block', marginTop: '6px' }}>Thời gian thực tế GPS</span>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: '#10b981' }}></div>
        </div>

        {/* Completed */}
        <div className="premium-kpi-card" style={{
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Đã hoàn thành tan ca</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#64748b', marginTop: '6px' }}>{closedCount} nhân viên</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', display: 'block', marginTop: '6px' }}>Đã chốt tổng kết doanh thu ca</span>
          </div>
          <div style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: '#64748b' }}></div>
        </div>

        {/* Absent */}
        <div className="premium-kpi-card" style={{
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Vắng mặt hôm nay</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ef4444', marginTop: '6px' }}>{absentCount} vắng mặt</div>
            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600', display: 'block', marginTop: '6px' }}>Chưa ghi nhận ca bắt đầu</span>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: '#ef4444' }}></div>
        </div>

      </div>

      {/* Main Table Board panel */}
      <section className="panel" style={{ borderRadius: '16px', border: '1px solid var(--card-border)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', padding: '2rem' }}>
        
        {/* Table Filters Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)' }}>Bảng Theo Dõi Chấm Công Hôm Nay</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Giám sát chính xác thời gian hoạt động, tọa độ kiểm tra GPS của lái xe, phụ xe và giao dịch viên.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhân viên..."
                style={{
                  padding: '8px 12px 8px 36px',
                  fontSize: '0.85rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: 'var(--text-main)',
                  width: '200px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              <svg style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            {/* Filter Role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Bộ phận:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: 'var(--text-main)',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Tất cả bộ phận</option>
                <option value="driver">Tài xế</option>
                <option value="attendant">Phụ xe</option>
                <option value="ticket_agent">Nhân viên bán vé</option>
              </select>
            </div>

            {/* Filter Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Trạng thái:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: 'var(--text-main)',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang làm việc</option>
                <option value="closed">Đã tan ca</option>
                <option value="absent">Vắng mặt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clean Responsive Table */}
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Không tìm thấy dữ liệu chấm công phù hợp với tiêu chí lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)', color: '#475569', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Nhân viên</th>
                  <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Trạng thái ca</th>
                  <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Giờ vào ca</th>
                  <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Giờ tan ca</th>
                  <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Điểm check-in</th>
                  <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', textAlign: 'right' }}>Xác thực GPS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)', fontSize: '0.85rem', transition: 'background-color 0.2s' }} className="table-row-hover">
                    
                    {/* User Info */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {getAvatar(log.name, log.role)}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{log.name}</span>
                          <div>{getRoleBadge(log.role)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Clock In */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: '700', color: log.status === 'absent' ? 'var(--text-muted)' : 'var(--text-main)' }}>
                      {log.startTime}
                    </td>

                    {/* Clock Out */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: '700', color: log.status === 'closed' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {log.endTime}
                    </td>

                    {/* Checkin Location */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{log.location}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.gps}</span>
                      </div>
                    </td>

                    {/* GPS Verification Status */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: log.status === 'absent' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        color: log.status === 'absent' ? '#ef4444' : '#10b981',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'inline-block'
                      }}>
                        {log.verification}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ManagerAttendancePage;
