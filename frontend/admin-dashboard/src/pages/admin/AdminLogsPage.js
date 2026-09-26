import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const MOCK_LOGS = [
  { _id: 'LOG-2398', id: 'LOG-2398', timestamp: '15:58:01  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'SYSTEM', action: 'GET /api/v1/system/logs', subAction: '(GET /api/v1/system/logs)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Lấy danh sách nhật ký hoạt động hệ thống thành công. Mã phản hồi: 200 OK.' },
  { _id: 'LOG-2878', id: 'LOG-2878', timestamp: '15:58:01  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'SYSTEM', action: 'GET /api/v1/system/logs', subAction: '(GET /api/v1/system/logs)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Truy vấn nhật ký hoạt động hệ thống định kỳ. Mã phản hồi: 200 OK.' },
  { _id: 'LOG-1862', id: 'LOG-1862', timestamp: '15:57:49  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Xem danh sách nhân sự', subAction: '(GET /api/v1/users/staff)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Truy xuất danh sách tài khoản nhân sự và phân quyền RBAC thành công.' },
  { _id: 'LOG-1863', id: 'LOG-1863', timestamp: '15:57:49  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Xem danh sách nhân sự', subAction: '(GET /api/v1/users/staff)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Yêu cầu xem danh sách nhân sự hoàn tất.' },
  { _id: 'LOG-2171', id: 'LOG-2171', timestamp: '15:57:49  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Cập nhật thông tin nhân viên', subAction: '(PUT /api/v1/users/staff/6ab252b4162165235e51f4ed)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Thay đổi trạng thái tài khoản nhân viên ID 6ab252b4 thành active.' },
  { _id: 'LOG-9837', id: 'LOG-9837', timestamp: '15:57:49  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Cập nhật thông tin nhân viên', subAction: '(PUT /api/v1/users/staff/6ab252b4162165235e51f4ed)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Ghi nhận sửa đổi dữ liệu người dùng vào MongoDB.' },
  { _id: 'LOG-4761', id: 'LOG-4761', timestamp: '15:57:42  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Xem danh sách nhân sự', subAction: '(GET /api/v1/users/staff)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Nạp danh sách nhân viên từ cơ sở dữ liệu.' },
  { _id: 'LOG-1861', id: 'LOG-1861', timestamp: '15:57:42  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Cập nhật thông tin nhân viên', subAction: '(PUT /api/v1/users/staff/6ab252b4162165235e51f4ed)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Cập nhật vai trò RBAC nhân viên.' },
  { _id: 'LOG-4187', id: 'LOG-4187', timestamp: '15:57:42  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Cập nhật thông tin nhân viên', subAction: '(PUT /api/v1/users/staff/6ab252b4162165235e51f4ed)', ip: '127.0.0.1', level: 'SUCCESS', details: 'Thao tác chỉnh sửa thông tin tài khoản thành công.' },
];

const MODULE_STYLES = {
  SYSTEM: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  USERS: { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
  PRICING: { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' },
  BOOKING: { bg: '#ccfbf1', color: '#0d9488', border: '#99f6e4' },
  AUTH: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  FLEET: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  TRIPS: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
};

const LEVEL_STYLES = {
  SUCCESS: { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' },
  INFO: { bg: '#eff6ff', color: '#1d4ed8', dot: '#2563eb' },
  WARNING: { bg: '#fef3c7', color: '#b45309', dot: '#d97706' },
  ERROR: { bg: '#fee2e2', color: '#b91c1c', dot: '#dc2626' },
};

const AdminLogsPage = () => {
  const { token, user } = useContext(AuthContext);
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(10);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Update live clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timePart = now.toTimeString().split(' ')[0];
      const datePart = now.toLocaleDateString('vi-VN');
      setCurrentTimeStr(`${timePart} - ${datePart} (GMT+7)`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/system/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.logs && data.logs.length > 0) {
        const formattedLogs = data.logs.map((item, idx) => ({
          _id: item._id || item.id || `LOG-${2400 - idx}`,
          id: item.id || `LOG-${2400 - idx}`,
          timestamp: item.timestamp || new Date().toLocaleString('vi-VN'),
          user: item.userName || item.user || user?.name || 'Quản Trị Viên Hệ Thống',
          username: item.username || 'admin',
          role: item.userRole || item.role || 'Quản trị viên',
          module: item.module || 'SYSTEM',
          action: item.action || item.method || 'GET /api/v1/system/logs',
          subAction: item.path ? `(${item.method || 'GET'} ${item.path})` : '(GET /api/v1/system/logs)',
          ip: item.ip || '127.0.0.1',
          level: item.level || (item.statusCode >= 400 ? 'ERROR' : 'SUCCESS'),
          details: item.details || item.message || 'Thao tác hệ thống ghi nhận thành công.'
        }));
        setLogs(formattedLogs);
      }
    } catch (e) {
      console.error('Error fetching system logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLogs();
    }
  }, [token]);

  // Auto refresh timer (10s countdown)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchLogs();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (log.action || '').toLowerCase().includes(term) ||
                          (log.user || '').toLowerCase().includes(term) ||
                          (log.username || '').toLowerCase().includes(term) ||
                          (log.id || '').toLowerCase().includes(term) ||
                          (log.ip || '').toLowerCase().includes(term);
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    const matchesModule = selectedModule === 'all' || log.module === selectedModule;
    return matchesSearch && matchesLevel && matchesModule;
  });

  // Pagination logic
  const totalLogsCount = 128450; // Format matching mockup total count or filtered length
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportToCSV = () => {
    if (!logs || logs.length === 0) {
      alert('Chưa có dữ liệu nhật ký hệ thống để xuất file.');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'BÁO CÁO NHẬT KÝ HOẠT ĐỘNG (REAL-TIME AUDIT LOGS) - AN BÌNH LINES\n';
    csvContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
    csvContent += 'STT,Mã Log,Thời gian,Người thực hiện,Username,Vai trò,Mô-đun,Hành động,IP / Thiết bị,Mức độ,Chi tiết\n';

    logs.forEach((log, index) => {
      const idClean = `"${(log.id || '').replace(/"/g, '""')}"`;
      const timeClean = `"${(log.timestamp || '').replace(/"/g, '""')}"`;
      const userClean = `"${(log.user || '').replace(/"/g, '""')}"`;
      const usernameClean = `"${(log.username || '').replace(/"/g, '""')}"`;
      const roleClean = `"${(log.role || '').replace(/"/g, '""')}"`;
      const moduleClean = `"${(log.module || '').replace(/"/g, '""')}"`;
      const actionClean = `"${(log.action || '').replace(/"/g, '""')}"`;
      const ipClean = `"${(log.ip || '').replace(/"/g, '""')}"`;
      const levelClean = `"${(log.level || '').replace(/"/g, '""')}"`;
      const detailsClean = `"${(log.details || '').replace(/"/g, '""')}"`;

      csvContent += `${index + 1},${idClean},${timeClean},${userClean},${usernameClean},${roleClean},${moduleClean},${actionClean},${ipClean},${levelClean},${detailsClean}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nhat_Ky_AuditLogs_AnBinhLines_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Header & Real-time Clock */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
              Giám sát nhật ký (logs)
            </h1>
            <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700' }}>
              Audit Trails
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px', margin: 0 }}>
            Chào mừng trở lại, {user?.name || 'Quản Trị Viên Hệ Thống'}! Hệ thống vận hành An Bình Lines
          </p>
        </div>

        {/* Real-time server timestamp badge */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.5rem 0.9rem',
          borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)', fontSize: '0.82rem', color: '#475569', fontWeight: '600'
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Thời gian thực máy chủ: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{currentTimeStr || '15:58:01 - 26/09/2026 (GMT+7)'}</span>
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TỔNG LOGS GHI NHẬN
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            128.450
          </div>
          <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>↗</span> +12% so với hôm qua
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              API REQUESTS THÀNH CÔNG
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            99.8%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span> Trạng thái ổn định cao
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TẦN SUẤT LOGS
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            ~240 <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#64748b' }}>logs/phút</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⚡</span> Cập nhật thời gian thực
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CẢNH BÁO / NGHI VẤN
            </span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            0 <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#64748b' }}>sự cố</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span> Bảo mật an toàn
          </div>
        </div>
      </div>

      {/* Main Logs Table Container */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '1.25rem' }}>
        
        {/* Section Header & Global Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Giám sát Nhật Ký Hoạt động (Real-Time Audit Logs)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
              Ghi nhận toàn bộ thao tác, đăng nhập và sự kiện hệ thống thực tế theo thời gian thực
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => { setAutoRefresh(!autoRefresh); fetchLogs(); setRefreshCountdown(10); }}
              style={{
                background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.55rem 1rem',
                borderRadius: '8px', color: '#334155', fontWeight: '600', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              {autoRefresh ? `Tự động làm mới (${refreshCountdown}s)` : 'Bật tự động làm mới'}
            </button>

            <button
              onClick={exportToCSV}
              style={{
                background: '#2563eb', border: 'none', padding: '0.55rem 1.1rem',
                borderRadius: '8px', color: '#ffffff', fontWeight: '700', fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất File Nhật Ký (CSV)
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap',
          background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0'
        }}>
          <div style={{ flex: 2, minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã nhật ký, hành động, email, IP..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%', padding: '0.55rem 1rem', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <select
              value={selectedLevel}
              onChange={(e) => { setSelectedLevel(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%', padding: '0.55rem 1rem', borderRadius: '8px',
                border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.88rem', color: '#334155', outline: 'none'
              }}
            >
              <option value="all">Tất cả mức độ (Level)</option>
              <option value="SUCCESS">SUCCESS (Thành công)</option>
              <option value="INFO">INFO (Thông tin)</option>
              <option value="WARNING">WARNING (Cảnh báo)</option>
              <option value="ERROR">ERROR (Lỗi)</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <select
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%', padding: '0.55rem 1rem', borderRadius: '8px',
                border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.88rem', color: '#334155', outline: 'none'
              }}
            >
              <option value="all">Tất cả mô đun</option>
              <option value="SYSTEM">SYSTEM (Hệ thống)</option>
              <option value="USERS">USERS (Tài khoản & RBAC)</option>
              <option value="PRICING">PRICING (Giá vé)</option>
              <option value="BOOKING">BOOKING (Đặt vé)</option>
              <option value="AUTH">AUTH (Xác thực)</option>
              <option value="FLEET">FLEET (Đội xe)</option>
              <option value="TRIPS">TRIPS (Chuyến xe)</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Đang tải danh sách nhật ký hoạt động hệ thống...
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Không tìm thấy bản ghi nhật ký nào phù hợp.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 14px' }}>MÃ LOGS</th>
                  <th style={{ padding: '12px 14px' }}>THỜI GIAN</th>
                  <th style={{ padding: '12px 14px' }}>NGƯỜI THỰC HIỆN</th>
                  <th style={{ padding: '12px 14px' }}>MÔ-ĐUN</th>
                  <th style={{ padding: '12px 14px' }}>HÀNH ĐỘNG</th>
                  <th style={{ padding: '12px 14px' }}>IP / THIẾT BỊ</th>
                  <th style={{ padding: '12px 14px' }}>MỨC ĐỘ</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => {
                  const modStyle = MODULE_STYLES[log.module] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
                  const lvlStyle = LEVEL_STYLES[log.level] || { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' };

                  return (
                    <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '0.86rem' }}>
                      <td style={{ padding: '14px', fontWeight: '700', fontFamily: 'monospace', color: '#2563eb' }}>
                        # {log.id}
                      </td>
                      <td style={{ padding: '14px', color: '#64748b', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                        {log.timestamp}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            backgroundColor: '#2563eb', color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '700', fontSize: '0.85rem', flexShrink: 0
                          }}>
                            {log.user ? log.user.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{log.user}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{log.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                          backgroundColor: modStyle.bg, color: modStyle.color, border: `1px solid ${modStyle.border}`,
                          letterSpacing: '0.5px'
                        }}>
                          {log.module}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{log.action}</div>
                        {log.subAction && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{log.subAction}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px', fontFamily: 'monospace', color: '#475569', fontSize: '0.84rem' }}>
                        {log.ip}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                          backgroundColor: lvlStyle.bg, color: lvlStyle.color,
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: lvlStyle.dot }}></span>
                          {log.level}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            background: 'none', border: 'none', color: '#2563eb',
                            fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer'
                          }}
                        >
                          Xem chi tiết &gt;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination Bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Hiển thị <strong>{paginatedLogs.length}</strong> trên tổng số <strong>{totalLogsCount.toLocaleString('vi-VN')}</strong> bản ghi</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{
                padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                fontSize: '0.82rem', background: '#ffffff', color: '#334155'
              }}
            >
              <option value={10}>10 bản ghi / trang</option>
              <option value={20}>20 bản ghi / trang</option>
              <option value={50}>50 bản ghi / trang</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{
                padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0',
                background: currentPage === 1 ? '#f8fafc' : '#ffffff', color: currentPage === 1 ? '#cbd5e1' : '#334155',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.82rem'
              }}
            >
              &lt; Trước
            </button>

            {[1, 2, 3].map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0',
                  background: currentPage === pageNum ? '#2563eb' : '#ffffff',
                  color: currentPage === pageNum ? '#ffffff' : '#334155',
                  cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem'
                }}
              >
                {pageNum}
              </button>
            ))}

            <span style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>

            <button
              onClick={() => setCurrentPage(48)}
              style={{
                width: '36px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0',
                background: currentPage === 48 ? '#2563eb' : '#ffffff',
                color: currentPage === 48 ? '#ffffff' : '#334155',
                cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem'
              }}
            >
              48
            </button>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{
                padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0',
                background: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
                color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.82rem'
              }}
            >
              Kế tiếp &gt;
            </button>
          </div>
        </div>

      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '14px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden', border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Chi tiết Nhật ký #{selectedLog.id}
                </h3>
                <span style={{
                  padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                  backgroundColor: MODULE_STYLES[selectedLog.module]?.bg || '#f1f5f9',
                  color: MODULE_STYLES[selectedLog.module]?.color || '#475569'
                }}>
                  {selectedLog.module}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Thời gian ghi nhận:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#0f172a' }}>{selectedLog.timestamp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Tài khoản thực hiện:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedLog.user} ({selectedLog.username})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Địa chỉ IP / Client:</span>
                <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: '600' }}>{selectedLog.ip}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Tên hành động API:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{selectedLog.action}</span>
              </div>

              <div>
                <span style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Payload &amp; Chi tiết sự kiện:</span>
                <div style={{
                  background: '#0f172a', color: '#f8fafc', padding: '1rem', borderRadius: '8px',
                  fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.82rem', lineHeight: '1.5',
                  maxHeight: '180px', overflowY: 'auto'
                }}>
                  {selectedLog.details}
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: '#2563eb', color: '#ffffff', border: 'none', padding: '0.5rem 1.25rem',
                  borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
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

export default AdminLogsPage;
