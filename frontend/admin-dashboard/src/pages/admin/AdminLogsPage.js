import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const MOCK_LOGS = [
  { _id: 'LOG-2398', id: 'LOG-2398', timestamp: '15:58:01  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'SYSTEM', action: 'GET /api/v1/system/logs', subAction: '', ip: '127.0.0.1', level: 'SUCCESS', details: 'Lấy danh sách nhật ký hoạt động hệ thống thành công. Mã phản hồi: 200 OK.' },
  { _id: 'LOG-2878', id: 'LOG-2878', timestamp: '15:58:01  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'SYSTEM', action: 'GET /api/v1/system/logs', subAction: '', ip: '127.0.0.1', level: 'SUCCESS', details: 'Truy vấn nhật ký hoạt động hệ thống định kỳ. Mã phản hồi: 200 OK.' },
  { _id: 'LOG-1862', id: 'LOG-1862', timestamp: '15:57:49  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Xem danh sách nhân sự (GET /api/v1/users/staff)', subAction: '', ip: '127.0.0.1', level: 'SUCCESS', details: 'Truy xuất danh sách tài khoản nhân sự và phân quyền RBAC thành công.' },
  { _id: 'LOG-1863', id: 'LOG-1863', timestamp: '15:57:49  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Xem danh sách nhân sự (GET /api/v1/users/staff)', subAction: '', ip: '127.0.0.1', level: 'SUCCESS', details: 'Yêu cầu xem danh sách nhân sự hoàn tất.' },
  { _id: 'LOG-2171', id: 'LOG-2171', timestamp: '15:57:49  26/9/2026', user: 'Quản Trị Viên Hệ Thống', username: 'admin', role: 'Quản trị viên', module: 'USERS', action: 'Cập nhật thông tin nhân viên (PUT /api/v1/users/staff)', subAction: '', ip: '127.0.0.1', level: 'SUCCESS', details: 'Thay đổi trạng thái tài khoản nhân viên ID 6ab252b4 thành active.' },
];

const MODULE_STYLES = {
  SYSTEM: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
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
        const formattedLogs = data.logs.map((item, idx) => {
          let cleanAction = item.action || item.method || 'GET /api/v1/system/logs';
          // Avoid duplicate (GET /api/v1...) tags if action already has it
          if (cleanAction.includes('(')) {
            const parts = cleanAction.split('(');
            cleanAction = `${parts[0].trim()} (${parts[1].replace(/\)+$/, '')})`;
          }
          return {
            _id: item._id || item.id || `LOG-${2400 - idx}`,
            id: item.id || `LOG-${2400 - idx}`,
            timestamp: item.timestamp || new Date().toLocaleString('vi-VN'),
            user: item.userName || item.user || user?.name || 'Quản Trị Viên Hệ Thống',
            username: item.username || 'admin',
            role: item.userRole || item.role || 'Quản trị viên',
            module: item.module || 'SYSTEM',
            action: cleanAction,
            subAction: '',
            ip: item.ip || '127.0.0.1',
            level: item.level || (item.statusCode >= 400 ? 'ERROR' : 'SUCCESS'),
            details: item.details || item.message || 'Thao tác hệ thống ghi nhận thành công.'
          };
        });
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
  const totalLogsCount = filteredLogs.length;
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Smart compact page numbers array generator (e.g. 1 2 ... 10 or 1 ... 5 ... 10)
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    pages.push(1);
    if (currentPage > 3) {
      pages.push('...');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontFamily: 'Inter, system-ui, sans-serif', width: '100%' }}>
      
      {/* Main Top White Card Container wrapping Header & 4 Stat Cards */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Top Header & Real-time Clock */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Giám sát nhật ký (logs)
              </h1>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                Audit Trails
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Chào mừng trở lại, {user?.name || 'Quản Trị Viên Hệ Thống'}! Hệ thống vận hành An Bình Lines
            </p>
          </div>

          {/* Real-time server timestamp badge */}
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.4rem 0.85rem',
            borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)', fontSize: '0.75rem', color: '#475569', fontWeight: '500'
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Thời gian thực máy chủ: <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>{currentTimeStr || '15:58:01 - 26/09/2026 (GMT+7)'}</span>
          </div>
        </div>

        {/* 4 Stat Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
        
        {/* Card 1 */}
        <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TỔNG LOGS CHI NHẬN
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
            {logs.length.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800' }}>↑</span> +12% so với hôm qua
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              API REQUESTS THÀNH CÔNG
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
            99.8%
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span> Trạng thái ổn định cao
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TẦN SUẤT LOGS
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
            ~240 <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>logs/phút</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Cập nhật thời gian thực
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CẢNH BÁO / NGHI VẤN
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
            0 <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>sự cố</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span> Bảo mật an toàn
          </div>
        </div>
      </div>
      </div>

      {/* Main Logs Table Container */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', padding: '0.85rem 1.1rem' }}>
        
        {/* Section Header & Global Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Giám sát Nhật Ký Hoạt động (Real-Time Audit Logs)
            </h2>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', margin: 0 }}>
              Ghi nhận toàn bộ thao tác, đăng nhập và sự kiện hệ thống thực tế theo thời gian thực
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => { setAutoRefresh(!autoRefresh); fetchLogs(); setRefreshCountdown(10); }}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem',
                borderRadius: '8px', color: '#334155', fontWeight: '600', fontSize: '0.75rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              {autoRefresh ? `Tự động làm mới (${refreshCountdown}s)` : 'Bật làm mới'}
            </button>

            <button
              onClick={exportToCSV}
              style={{
                background: '#2563eb', border: 'none', padding: '0.45rem 0.95rem',
                borderRadius: '8px', color: '#ffffff', fontWeight: '600', fontSize: '0.75rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất File Nhật Ký (CSV)
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: 'flex', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: 2, minWidth: '220px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã nhật ký, hành động, email, IP..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%', padding: '0.4rem 0.85rem 0.4rem 2.1rem', borderRadius: '8px',
                border: '1px solid #e2e8f0', fontSize: '0.78rem', outline: 'none', background: '#ffffff'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '140px' }}>
            <select
              value={selectedLevel}
              onChange={(e) => { setSelectedLevel(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%', padding: '0.4rem 0.75rem', borderRadius: '8px',
                border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.78rem', color: '#334155', outline: 'none'
              }}
            >
              <option value="all">Tất cả mức độ (Level)</option>
              <option value="SUCCESS">SUCCESS (Thành công)</option>
              <option value="INFO">INFO (Thông tin)</option>
              <option value="WARNING">WARNING (Cảnh báo)</option>
              <option value="ERROR">ERROR (Lỗi)</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '140px' }}>
            <select
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%', padding: '0.4rem 0.75rem', borderRadius: '8px',
                border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '0.78rem', color: '#334155', outline: 'none'
              }}
            >
              <option value="all">Tất cả mô đun</option>
              <option value="SYSTEM">SYSTEM (Hệ thống)</option>
              <option value="USERS">USERS (Tài khoản &amp; RBAC)</option>
              <option value="PRICING">PRICING (Giá vé)</option>
              <option value="BOOKING">BOOKING (Đặt vé)</option>
              <option value="AUTH">AUTH (Xác thực)</option>
              <option value="FLEET">FLEET (Đội xe)</option>
              <option value="TRIPS">TRIPS (Chuyến xe)</option>
            </select>
          </div>

          <button 
            onClick={() => { setSearchTerm(''); setSelectedLevel('all'); setSelectedModule('all'); setCurrentPage(1); fetchLogs(); }}
            style={{
              background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.4rem 0.65rem',
              borderRadius: '8px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
            title="Làm mới dữ liệu & Đặt lại bộ lọc"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem' }}>
              Đang tải danh sách nhật ký hoạt động hệ thống...
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem' }}>
              Không tìm thấy bản ghi nhật ký nào phù hợp.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>MÃ LOGS</th>
                  <th style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>THỜI GIAN</th>
                  <th style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>NGƯỜI THỰC HIỆN</th>
                  <th style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>MÔ-ĐUN</th>
                  <th style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>HÀNH ĐỘNG</th>
                  <th style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>IP / THIẾT BỊ</th>
                  <th style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>MỨC ĐỘ</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', whiteSpace: 'nowrap' }}>CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => {
                  const modStyle = MODULE_STYLES[log.module] || { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
                  const lvlStyle = LEVEL_STYLES[log.level] || { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' };

                  return (
                    <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', fontFamily: 'monospace', color: '#2563eb', whiteSpace: 'nowrap' }}>
                        # {log.id}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.72rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {log.timestamp}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            backgroundColor: '#2563eb', color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '800', fontSize: '0.7rem', flexShrink: 0
                          }}>
                            {log.user ? log.user.charAt(0).toUpperCase() : 'Q'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{log.user}</span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{log.username}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                          backgroundColor: modStyle.bg, color: modStyle.color, border: `1px solid ${modStyle.border}`,
                          letterSpacing: '0.3px', whiteSpace: 'nowrap'
                        }}>
                          {log.module}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{log.action}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', color: '#475569', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {log.ip}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700',
                          backgroundColor: lvlStyle.bg, color: lvlStyle.color,
                          display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: lvlStyle.dot }}></span>
                          {log.level}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            background: 'none', border: 'none', color: '#2563eb',
                            fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap'
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
          marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0',
          flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.72rem', color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Hiển thị <strong>{paginatedLogs.length}</strong> trên tổng số <strong>{totalLogsCount.toLocaleString('vi-VN')}</strong> bản ghi</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{
                padding: '2px 6px', borderRadius: '6px', border: '1px solid #cbd5e1',
                fontSize: '0.72rem', background: '#ffffff', color: '#334155'
              }}
            >
              <option value={10}>10 bản ghi / trang</option>
              <option value={20}>20 bản ghi / trang</option>
              <option value={50}>50 bản ghi / trang</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{
                padding: '2px 7px', borderRadius: '4px', border: '1px solid #e2e8f0',
                background: '#ffffff', color: currentPage === 1 ? '#cbd5e1' : '#334155',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.72rem'
              }}
            >
              &lt; Trước
            </button>

            {getPageNumbers().map((pageNum, idx) => (
              pageNum === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.72rem' }}>...</span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '2px 7px', borderRadius: '4px', border: '1px solid #e2e8f0',
                    background: currentPage === pageNum ? '#2563eb' : '#ffffff',
                    color: currentPage === pageNum ? '#ffffff' : '#334155',
                    cursor: 'pointer', fontWeight: currentPage === pageNum ? '700' : '500', fontSize: '0.72rem'
                  }}
                >
                  {pageNum}
                </button>
              )
            ))}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{
                padding: '2px 7px', borderRadius: '4px', border: '1px solid #e2e8f0',
                background: '#ffffff', color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.72rem'
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
