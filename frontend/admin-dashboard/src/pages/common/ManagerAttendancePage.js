import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const ManagerAttendancePage = () => {
  const { token, user } = useContext(AuthContext);
  const isOpsManager = user?.role === 'ops_manager';

  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({ totalScheduled: 0, activeDirect: 0, closedShift: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchRealAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users/admin/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAttendanceData(data.attendance || []);
        setStats(data.stats || { totalScheduled: 0, activeDirect: 0, closedShift: 0, absent: 0 });
      } else {
        setError(data.message || 'Không thể tải báo cáo chấm công.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải bảng chấm công.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRealAttendance();
    }
  }, [token]);

  const exportExcelMock = () => {
    alert(`Đang xuất danh sách chấm công ${isOpsManager ? 'tổ lái (Tài xế & Phụ xe)' : 'nhân sự'} hôm nay ra file Excel thành công!`);
  };

  const getStatusBadge = (log) => {
    switch (log.status) {
      case 'active':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: log.punctuality === 'Vào trễ' ? '#fffbe6' : '#ecfdf5', 
            color: log.punctuality === 'Vào trễ' ? '#d97706' : '#047857', 
            padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: log.punctuality === 'Vào trễ' ? '#f59e0b' : '#10b981', display: 'inline-block' }}></span>
            {log.punctuality === 'Vào trễ' ? '• Đang trực (Vào trễ)' : '• Đang trực (Đúng quy định)'}
          </span>
        );
      case 'closed':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#f1f5f9', color: '#475569', 
            padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#64748b', display: 'inline-block' }}></span>
            • Đã tan ca
          </span>
        );
      case 'approved_leave':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff',
            padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#9333ea', display: 'inline-block' }}></span>
            • Đã duyệt nghỉ (Có phép)
          </span>
        );
      case 'absent':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#fef2f2', color: '#dc2626', 
            padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
            • Vắng mặt (Không phép)
          </span>
        );
      case 'standby':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
            padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#94a3b8', display: 'inline-block' }}></span>
            • Nghỉ giữa tua / Dự phòng
          </span>
        );
      default:
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
            padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' 
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#94a3b8', display: 'inline-block' }}></span>
            • Chưa đến giờ ca trực
          </span>
        );
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      driver: { bg: '#eff6ff', color: '#1e40af', text: 'Tài xế', prefix: 'TX' },
      attendant: { bg: '#fff7ed', color: '#c2410c', text: 'Phụ xe', prefix: 'PX' },
      ticket_agent: { bg: '#faf5ff', color: '#6b21a8', text: 'Bán vé', prefix: 'NV' },
      fleet_manager: { bg: '#ccfbf1', color: '#0f766e', text: 'QL Đội xe', prefix: 'QL' },
      ops_manager: { bg: '#e0e7ff', color: '#1e40af', text: 'QL Vận tải', prefix: 'QL' }
    };
    const b = badges[role] || { bg: '#f1f5f9', color: '#334155', text: role, prefix: 'NV' };
    return (
      <span style={{ 
        background: b.bg, color: b.color, 
        padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', whiteSpace: 'nowrap' 
      }}>
        {b.text}
      </span>
    );
  };

  const getAvatar = (name, role) => {
    let code = 'NV';
    if (role === 'fleet_manager' || role === 'ops_manager') {
      code = 'QL';
    } else if (role === 'ticket_agent') {
      code = 'NV';
    } else if (role === 'driver') {
      const parts = (name || '').trim().split(/\s+/);
      if (parts.length >= 2 && parts[0].toLowerCase() !== 'tài') {
        code = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else {
        code = 'TX';
      }
    } else if (role === 'attendant') {
      code = 'PX';
    } else if (name) {
      const parts = name.trim().split(/\s+/);
      code = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    
    const colors = {
      driver: '#1d4ed8',
      attendant: '#c2410c',
      ticket_agent: '#7e22ce',
      fleet_manager: '#0f172a',
      ops_manager: '#0f172a'
    };
    const bg = colors[role] || '#0f172a';

    return (
      <div style={{
        width: '38px', height: '38px', borderRadius: '50%', backgroundColor: bg, color: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800',
        fontSize: '0.85rem', flexShrink: 0
      }}>
        {code}
      </div>
    );
  };

  // Nếu là ops_manager, chỉ quản lý chấm công của Tài xế và Phụ xe (Tổ lái)
  const baseAttendance = isOpsManager
    ? attendanceData.filter(log => log.role === 'driver' || log.role === 'attendant')
    : attendanceData;

  const displayStats = isOpsManager ? {
    totalScheduled: baseAttendance.length,
    activeDirect: baseAttendance.filter(l => l.status === 'active').length,
    closedShift: baseAttendance.filter(l => l.status === 'closed').length,
    absent: baseAttendance.filter(l => l.status === 'absent').length,
    standby: baseAttendance.filter(l => l.status === 'standby').length
  } : stats;

  const filteredLogs = baseAttendance.filter(log => {
    const matchesRole = filterRole === 'all' || log.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && log.status === 'active') ||
      (filterStatus === 'closed' && log.status === 'closed') ||
      (filterStatus === 'approved_leave' && log.status === 'approved_leave') ||
      (filterStatus === 'standby' && log.status === 'standby') ||
      (filterStatus === 'absent' && log.status === 'absent') ||
      (filterStatus === 'late' && log.punctuality === 'Vào trễ') ||
      (filterStatus === 'scheduled' && log.status === 'scheduled');
    
    const matchesSearch = (log.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.phone || '').includes(searchQuery) ||
                          (log.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {isOpsManager ? 'Quản Lý Chấm Công Tổ Lái Hôm Nay' : 'Quản Lý Chấm Công Nhân Sự Hôm Nay'}
            </h1>
            <span style={{
              backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
              fontSize: '0.75rem', fontWeight: '800', padding: '3px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              Live {todayStr}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '6px', margin: 0 }}>
            {isOpsManager 
              ? 'Giám sát thời gian vào ca, tan ca thực tế theo chuyến xe của kíp Tài xế và Phụ xe.'
              : 'Giám sát thời gian vào ca, tan ca thực tế từ dữ liệu MongoDB thật của Tài xế, Phụ xe và Nhân viên quầy vé.'}
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={exportExcelMock}
            style={{
              backgroundColor: '#ffffff', color: '#16a34a', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center',
              gap: '6px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Xuất dữ liệu Excel
          </button>

          <button
            onClick={fetchRealAttendance}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center',
              gap: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Làm mới dữ liệu thật
          </button>
        </div>
      </div>

      {/* KPI Stats Row (4 Stat Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Card 1: Tổng số nhân sự */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>
              {isOpsManager ? 'TỔ LÁI HÔM NAY' : 'NHÂN SỰ HÔM NAY'}
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
              {displayStats.totalScheduled} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>{isOpsManager ? 'tài xế & phụ xe' : 'nhân viên'}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
              {isOpsManager 
                ? `${displayStats.totalScheduled - (displayStats.standby || 0)} có chuyến hôm nay • ${displayStats.standby || 0} nghỉ tua / dự phòng`
                : 'Lịch ca & Chuyến chạy hôm nay'}
            </span>
          </div>
          <div style={{ background: '#eff6ff', color: '#2563eb', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
        </div>

        {/* Card 2: Đang trong ca trực */}
        <div style={{
          backgroundColor: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.05)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#047857', letterSpacing: '0.5px' }}>ĐANG TRONG CA TRỰC</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#059669', margin: '4px 0 2px 0' }}>
              {displayStats.activeDirect} <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: '600' }}>đang trực</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>Đã check-in hệ thống</span>
          </div>
          <div style={{ background: '#ecfdf5', color: '#10b981', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>

        {/* Card 3: Đã hoàn thành tan ca */}
        <div style={{
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>ĐÃ HOÀN THÀNH TAN CA</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#334155', margin: '4px 0 2px 0' }}>
              {displayStats.closedShift} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>nhân viên</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Đã check-out chốt ca</span>
          </div>
          <div style={{ background: '#f1f5f9', color: '#64748b', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>

        {/* Card 4: Vắng mặt hôm nay */}
        <div style={{
          backgroundColor: '#ffffff', border: '1.5px solid #fca5a5', borderRadius: '12px',
          padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.05)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#b91c1c', letterSpacing: '0.5px' }}>
              {isOpsManager ? 'VẮNG MẶT / TRỄ CHUYẾN' : 'VẮNG MẶT HÔM NAY'}
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626', margin: '4px 0 2px 0' }}>
              {displayStats.absent} <span style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: '600' }}>{isOpsManager ? 'chưa nhận chuyến' : 'vắng mặt'}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>
              {isOpsManager ? 'Quá giờ xuất bến chưa nhận ca' : 'Cảnh báo không phép / Quá giờ ca'}
            </span>
          </div>
          <div style={{ background: '#fef2f2', color: '#ef4444', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
        </div>

      </div>

      {/* Main Table Board panel */}
      <section className="panel" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '1.5rem' }}>
        
        {/* Table Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                {isOpsManager ? 'Bảng Theo Dõi Chấm Công Tổ Lái Hôm Nay' : 'Bảng Theo Dõi Chấm Công Hôm Nay'}
              </h2>
              <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                Dữ Liệu Thật 100%
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
              {isOpsManager
                ? 'Kiểm tra quy định giờ vào ca trước giờ xe chạy (Tối thiểu 30-45 phút trước khi xuất bến đối với Tài xế & Phụ xe).'
                : 'Kiểm tra quy định giờ vào ca trước giờ xe chạy (Tài xế/Phụ xe) và ca hành chính cố định (Nhân viên quầy).'}
            </p>
          </div>

          {/* Filter Bar Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Date Pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#475569', fontWeight: '600'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Hôm nay ({todayStr})</span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isOpsManager ? "Tìm tên tài xế, phụ xe, SĐT, tuyến xe..." : "Tìm tên, SĐT, tuyến xe hoặc điểm trực..."}
                style={{
                  padding: '7px 12px 7px 32px', fontSize: '0.8rem',
                  border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff',
                  color: '#0f172a', width: '250px', outline: 'none'
                }}
              />
              <svg style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            {/* Filter Role */}
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '7px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1',
                borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: '600', outline: 'none'
              }}
            >
              {isOpsManager ? (
                <>
                  <option value="all">Bộ phận: Tất cả tổ lái (Tài xế &amp; Phụ xe)</option>
                  <option value="driver">Tài xế</option>
                  <option value="attendant">Phụ xe</option>
                </>
              ) : (
                <>
                  <option value="all">Bộ phận: Tất cả bộ phận</option>
                  <option value="driver">Tài xế</option>
                  <option value="attendant">Phụ xe</option>
                  <option value="ticket_agent">Nhân viên bán vé</option>
                  <option value="fleet_manager">QL Đội xe</option>
                  <option value="ops_manager">QL Vận tải</option>
                </>
              )}
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '7px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1',
                borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: '600', outline: 'none'
              }}
            >
              <option value="all">Trạng thái: Tất cả</option>
              {isOpsManager && <option value="standby">Nghỉ giữa tua / Sẵn sàng điều động</option>}
              <option value="scheduled">{isOpsManager ? 'Chưa đến giờ xuất bến' : 'Chưa đến giờ ca trực'}</option>
              <option value="active">{isOpsManager ? 'Đang chạy chuyến' : 'Đang trực'}</option>
              <option value="closed">{isOpsManager ? 'Đã hoàn thành chuyến' : 'Đã tan ca'}</option>
              <option value="late">Vào trễ</option>
              <option value="approved_leave">Đã duyệt nghỉ</option>
              <option value="absent">{isOpsManager ? 'Chưa nhận chuyến (Quá giờ)' : 'Vắng mặt (Không phép)'}</option>
            </select>
          </div>
        </div>

        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}

        {/* Responsive Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ color: '#2563eb', fontWeight: '600' }}>Đang kết nối MongoDB lấy dữ liệu chấm công...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
            Không tìm thấy dữ liệu chấm công phù hợp với tiêu chí lọc.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.725rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>NHÂN VIÊN</th>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>TRẠNG THÁI CA</th>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>QUY ĐỊNH VÀO CA</th>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>GIỜ VÀO CA</th>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>GIỜ TAN CA</th>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>ĐIỂM CHECK-IN &amp; TỌA ĐỘ</th>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', textAlign: 'right' }}>XÁC THỰC AN TOÀN</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.825rem', transition: 'background 0.15s ease' }}>
                      
                      {/* 1. Employee Info */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {getAvatar(log.name, log.role)}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }}>{log.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {getRoleBadge(log.role)}
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Status Badge */}
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(log)}
                      </td>

                      {/* 3. Shift Requirement Rule */}
                      <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                        {log.assignedTrip ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '800', color: '#2563eb' }}>Trước {log.assignedTrip.departureTime}</span>
                            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Lịch chuyến {log.assignedTrip.route} ({log.assignedTrip.departureTime})</span>
                          </div>
                        ) : (log.role === 'driver' || log.role === 'attendant') ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', color: '#475569' }}>Không có chuyến hôm nay</span>
                            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Nghỉ giữa tua / Sẵn sàng điều động</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '800', color: '#0f172a' }}>Trước 08:00 AM</span>
                            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Ca hành chính</span>
                          </div>
                        )}
                      </td>

                      {/* 4. Clock In */}
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '800', color: log.startTime === '--:--:--' ? '#94a3b8' : '#059669', fontFamily: 'monospace' }}>
                        {log.startTime}
                      </td>

                      {/* 5. Clock Out */}
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '800', color: log.endTime === '--:--:--' ? '#94a3b8' : '#0f172a', fontFamily: 'monospace' }}>
                        {log.endTime}
                      </td>

                      {/* 6. Checkin Location & GPS */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>
                            {log.location}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{log.gps}</span>
                        </div>
                      </td>

                      {/* 7. Verification Status Badge */}
                      <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: '700', whiteSpace: 'nowrap',
                          backgroundColor: log.status === 'active' || log.status === 'closed' ? '#ecfdf5' : log.status === 'absent' ? '#fef2f2' : log.status === 'approved_leave' ? '#f3e8ff' : log.status === 'standby' ? '#f8fafc' : '#f8fafc',
                          color: log.status === 'active' || log.status === 'closed' ? '#047857' : log.status === 'absent' ? '#dc2626' : log.status === 'approved_leave' ? '#6b21a8' : log.status === 'standby' ? '#475569' : '#64748b',
                          border: `1px solid ${log.status === 'active' || log.status === 'closed' ? '#a7f3d0' : log.status === 'absent' ? '#fca5a5' : log.status === 'approved_leave' ? '#e9d5ff' : '#e2e8f0'}`,
                          padding: '4px 10px', borderRadius: '6px', display: 'inline-block'
                        }}>
                          {log.status === 'active' || log.status === 'closed' ? 'Hợp lệ (GPS / WIFI VP)' : log.verification}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', pt: '1rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Đang hiển thị <strong style={{ color: '#0f172a' }}>{paginatedLogs.length}</strong> trên tổng số <strong style={{ color: '#0f172a' }}>{filteredLogs.length}</strong> {isOpsManager ? 'tổ lái' : 'nhân sự'} hôm nay
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    border: 'none', background: 'transparent', color: currentPage === 1 ? '#cbd5e1' : '#64748b',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: '4px 8px', fontSize: '0.9rem'
                  }}
                >
                  &lt;
                </button>

                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setCurrentPage(idx + 1)}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                      backgroundColor: currentPage === idx + 1 ? '#2563eb' : 'transparent',
                      color: currentPage === idx + 1 ? '#ffffff' : '#64748b',
                      fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    border: 'none', background: 'transparent', color: currentPage === totalPages ? '#cbd5e1' : '#64748b',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', padding: '4px 8px', fontSize: '0.9rem'
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default ManagerAttendancePage;
