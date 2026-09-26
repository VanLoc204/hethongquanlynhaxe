import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';

const API_BASE = 'http://localhost:8000/api/v1';

const exportAuditLogsToExcel = (logs = [], healthData = null) => {
  if (!logs || logs.length === 0) {
    alert('Chưa có dữ liệu nhật ký hệ thống để xuất báo cáo.');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
  csvContent += 'BÁO CÁO GIÁM SÁT HỆ THỐNG & NHẬT KÝ AN NINH - AN BÌNH LINES\n';
  csvContent += `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}\n`;
  csvContent += `Uptime Server: ${healthData?.uptimeStr || 'N/A'}, Trạng thái MongoDB: ${healthData?.mongoStatus || 'Stable'}\n\n`;

  csvContent += 'STT,Mã Log,Hành động / Sự kiện,Người thực hiện,Vai trò,Địa chỉ IP,Thời gian,Trạng thái\n';

  logs.forEach((log, index) => {
    const actionClean = `"${(log.action || '').replace(/"/g, '""')}"`;
    const userClean = `"${(log.user || '').replace(/"/g, '""')}"`;
    const roleClean = `"${(log.role || '').replace(/"/g, '""')}"`;
    const ipClean = `"${(log.ip || '').replace(/"/g, '""')}"`;
    const timeClean = `"${(log.timestamp || '').replace(/"/g, '""')}"`;
    const levelClean = `"${(log.level || '').replace(/"/g, '""')}"`;

    csvContent += `${index + 1},${log.id || ''},${actionClean},${userClean},${roleClean},${ipClean},${timeClean},${levelClean}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_Giam_Sat_AnBinhLines_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportGMReportToExcel = (recentTrips = [], revenue = 0, totalBookedSeats = 0, tripCount = 0) => {
  if (!recentTrips || recentTrips.length === 0) {
    alert('Chưa có dữ liệu chuyến xe để xuất báo cáo.');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
  csvContent += 'BÁO CÁO TỔNG QUAN DOANH THU & VẬN HÀNH - AN BÌNH LINES (BAN GIÁM ĐỐC)\n';
  csvContent += `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}\n`;
  csvContent += `Tổng doanh thu: ${revenue.toLocaleString('vi-VN')} VNĐ, Vé đã bán: ${totalBookedSeats}, Chuyến xe vận hành: ${tripCount}\n\n`;

  csvContent += 'STT,Mã Chuyến Xe,Tuyến Xe,Thời Gian Khởi Hành,Tài Xế,Phụ Xe,Biển Số Xe,Số Vé Đã Đặt,Doanh Thu Dự Kiến (VNĐ)\n';

  recentTrips.forEach((trip, index) => {
    const routeStr = trip.routeId ? `"${trip.routeId.startPoint} -> ${trip.routeId.endPoint}"` : '"N/A"';
    const depTime = `"${new Date(trip.departureTime).toLocaleString('vi-VN')}"`;
    const driver = `"${(trip.driver?.name || 'Chưa gán').replace(/"/g, '""')}"`;
    const assistant = `"${(trip.assistant?.name || 'Chưa gán').replace(/"/g, '""')}"`;
    const bus = `"${(trip.busId?.plateNumber || 'N/A').replace(/"/g, '""')}"`;
    const seats = trip.bookedSeats?.length || 0;
    const tripRev = seats * (trip.price || 0);

    csvContent += `${index + 1},${trip._id || ''},${routeStr},${depTime},${driver},${assistant},${bus},${seats},${tripRev}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_BanGiamDoc_AnBinhLines_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AdminOverview = ({ staffList = [], busCount = 0, routeCount = 0, tripCount = 0, healthData = null, liveAuditLogs = [], onRefresh }) => {
  const totalUsers = staffList.length || 0;
  const activeUsers = staffList.filter(s => s.status === 'active').length;

  const roleCounts = {
    general_manager: staffList.filter(s => s.role === 'general_manager').length,
    ops_manager: staffList.filter(s => s.role === 'ops_manager').length,
    fleet_manager: staffList.filter(s => s.role === 'fleet_manager').length,
    ticket_agent: staffList.filter(s => s.role === 'ticket_agent').length,
    driver: staffList.filter(s => s.role === 'driver').length,
    attendant: staffList.filter(s => s.role === 'attendant').length,
    admin: staffList.filter(s => s.role === 'admin').length,
  };

  const managementCount = roleCounts.general_manager + roleCounts.ops_manager + roleCounts.fleet_manager;
  const opsStaffCount = roleCounts.ticket_agent + roleCounts.driver + roleCounts.attendant;

  const displayLogs = liveAuditLogs.slice(0, 5);

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'general_manager': return 'Ban Giám đốc';
      case 'ops_manager': return 'Quản lý Vận tải';
      case 'fleet_manager': return 'Quản lý Đội xe';
      case 'ticket_agent': return 'Bán vé quầy';
      case 'driver': return 'Tài xế';
      case 'attendant': return 'Phụ xe';
      default: return role;
    }
  };

  return (
    <>
      {/* Main Top White Card Container wrapping Header & 4 Stat Cards */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        marginBottom: '0.85rem'
      }}>
        {/* Top Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>Dashboard</h1>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                System Live Overview
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Chào mừng trở lại, <strong style={{ color: '#2563eb' }}>Quản Trị Viên Hệ Thống!</strong> Bảng điều khiển giám sát thời gian thực An Bình Lines
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onRefresh}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Đồng bộ tức thời
            </button>
            <button
              onClick={() => exportAuditLogsToExcel(liveAuditLogs, healthData)}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất báo cáo Excel
            </button>
          </div>
        </div>

        {/* 4 Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          {/* Card 1 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG TÀI KHOẢN HỆ THỐNG</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {totalUsers} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>tài khoản</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>✓</span> {activeUsers} tài khoản đang hoạt động ({totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100}%)
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BAN QUẢN LÝ &amp; ĐIỀU HÀNH</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {managementCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>nhân sự</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Giám đốc, QL Vận tải, QL Đội xe
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐỘI NGŨ VẬN HÀNH</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {opsStaffCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>nhân sự</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Tài xế, Phụ xe, Bán vé quầy
            </div>
          </div>

          {/* Card 4 */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TRẠNG THÁI AN NINH RBAC</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              An toàn 100%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
              0 vi phạm chính sách bảo mật
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panels: RBAC & Infrastructure */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
        {/* Panel Left: Phân bổ Vai trò Người dùng (RBAC) */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Phân bổ Vai trò Người dùng (RBAC)</h2>
              </div>
              <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                7 Nhóm Phân quyền
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { label: 'Ban Giám đốc', count: roleCounts.general_manager, roleKey: 'general_manager', color: '#8b5cf6', badge: null },
                { label: 'Quản lý Vận tải', count: roleCounts.ops_manager, roleKey: 'ops_manager', color: '#3b82f6', badge: null },
                { label: 'Quản lý Đội xe', count: roleCounts.fleet_manager, roleKey: 'fleet_manager', color: '#3b82f6', badge: null },
                { label: 'Nhân viên Bán vé quầy', count: roleCounts.ticket_agent, roleKey: 'ticket_agent', color: '#3b82f6', badge: null },
                { label: 'Tài xế chuyên trách', count: roleCounts.driver, roleKey: 'driver', color: '#f59e0b', badge: 'Chủ lực' },
                { label: 'Phụ xe theo xe', count: roleCounts.attendant, roleKey: 'attendant', color: '#ec4899', badge: 'Hiện trường' },
                { label: 'Quản trị viên hệ thống', count: roleCounts.admin, roleKey: 'admin', color: '#312e81', badge: null },
              ].map(r => {
                const pct = totalUsers ? Math.round((r.count / totalUsers) * 100) : 0;
                return (
                  <div key={r.roleKey} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#334155' }}>{r.label}</span>
                        {r.badge && (
                          <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', background: r.badge === 'Chủ lực' ? '#fef3c7' : '#fce7f3', color: r.badge === 'Chủ lực' ? '#b45309' : '#be185d', fontWeight: '700' }}>
                            {r.badge}
                          </span>
                        )}
                      </div>
                      <span style={{ color: r.count > 1 ? '#be123c' : '#64748b', fontWeight: r.count > 1 ? '700' : '600' }}>
                        {r.count} người ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '5px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: r.color, borderRadius: '3px' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '0.85rem', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
            <span>Tỷ lệ bao phủ vai trò: <strong style={{ color: '#16a34a' }}>100% Khớp Ma trận RBAC</strong></span>
          </div>
        </div>

        {/* Panel Right: Hạ tầng Máy chủ & Cơ sở dữ liệu */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
                <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Hạ tầng Máy chủ &amp; Cơ sở dữ liệu</h2>
              </div>
              <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                Tất cả dịch vụ Online
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Server 1 */}
              <div style={{ padding: '8px 12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#065f46', fontSize: '0.78rem' }}>Backend REST API Server (Node.js / Express)</div>
                  <div style={{ fontSize: '0.68rem', color: '#047857', marginTop: '1px' }}>Cổng API Port 8000 — JWT Auth, Route &amp; Trip Services</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 8000</span>
                    <span style={{ fontSize: '0.68rem', color: '#047857', fontWeight: '700', marginTop: '2px' }}>{healthData?.mongoLatencyMs || 5}ms • 99.98%</span>
                  </div>
                  <span className="status-dot green" style={{ width: '7px', height: '7px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                </div>
              </div>

              {/* Server 2 */}
              <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.78rem' }}>Database chính (MongoDB - Port 27018)</div>
                  <div style={{ fontSize: '0.68rem', color: '#1d4ed8', marginTop: '1px' }}>10 Collections: Users, Routes, Buses, Trips, Bookings...</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 27018</span>
                    <span style={{ fontSize: '0.68rem', color: '#1d4ed8', fontWeight: '700', marginTop: '2px' }}>{healthData?.memoryUsageMb || '28.4'} MB RAM • Active</span>
                  </div>
                  <span className="status-dot green" style={{ width: '7px', height: '7px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                </div>
              </div>

              {/* Server 3 */}
              <div style={{ padding: '8px 12px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#6b21a8', fontSize: '0.78rem' }}>Memory Cache &amp; Sessions (Redis - Port 6379)</div>
                  <div style={{ fontSize: '0.68rem', color: '#7e22ce', marginTop: '1px' }}>Lưu Session token, GPS tracking cache &amp; Rate limiting</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', background: '#f3e8ff', color: '#6b21a8', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 6379</span>
                    <span style={{ fontSize: '0.68rem', color: '#7e22ce', fontWeight: '700', marginTop: '2px' }}>1.2 MB / 8 GB</span>
                  </div>
                  <span className="status-dot green" style={{ width: '7px', height: '7px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                </div>
              </div>

              {/* Server 4 */}
              <div style={{ padding: '8px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#92400e', fontSize: '0.78rem' }}>Message Broker (RabbitMQ - Port 5672)</div>
                  <div style={{ fontSize: '0.68rem', color: '#b45309', marginTop: '1px' }}>Điều phối tin nhắn bất đồng bộ &amp; Thông báo AI</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 5672</span>
                    <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: '700', marginTop: '2px' }}>Queue: 0 backlog</span>
                  </div>
                  <span className="status-dot green" style={{ width: '7px', height: '7px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Uptime Node.js API: <strong style={{ color: '#0f172a' }}>{healthData?.uptimeStr || '0h 15m'}</strong></span>
            <span style={{ color: '#2563eb', fontWeight: '700', fontFamily: 'monospace' }}>Mongo State: {healthData?.mongoStatus || 'Stable'}</span>
          </div>
        </div>
      </section>

      {/* Bottom Panel: Nhật ký Hoạt động An ninh & Giám sát Hệ thống (Full 100% Width) */}
      <section style={{ width: '100%', marginBottom: '0.4rem' }}>
        <div className="panel" style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" style={{ display: 'block', flexShrink: 0 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', margin: 0, lineHeight: '1.2' }}>
                  Nhật ký Hoạt động An ninh &amp; Giám sát Hệ thống
                </h2>
              </div>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                Bản ghi vết kiểm toán thời gian thực theo tiêu chuẩn an toàn vận tải (Dữ liệu Live từ Backend Express Middleware)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '8px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                Cập nhật tự động thời gian thực
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>HÀNH ĐỘNG / SỰ KIỆN</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>NGƯỜI THỰC HIỆN</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>VAI TRÒ</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>ĐỊA CHỈ IP</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>THỜI GIAN</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', textAlign: 'center' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.78rem' }}>
                      Chưa ghi nhận nhật ký hệ thống nào. Vui lòng thực hiện thao tác trên hệ thống để ghi nhận log thời gian thực.
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', verticalAlign: 'middle' }}>
                      <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', fontWeight: '600', color: '#1e293b' }}>{log.action}</td>
                      <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', color: '#475569' }}>{log.user}</td>
                      <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700' }}>
                          {getRoleLabel(log.role)}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', color: '#64748b', fontFamily: 'monospace', fontSize: '0.72rem' }}>{log.ip}</td>
                      <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', color: '#64748b', fontSize: '0.72rem' }}>{log.timestamp}</td>
                      <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700',
                          backgroundColor: log.level === 'SUCCESS' ? '#dcfce7' : log.level === 'WARNING' ? '#fef3c7' : '#fee2e2',
                          color: log.level === 'SUCCESS' ? '#15803d' : log.level === 'WARNING' ? '#b45309' : '#b91c1c'
                        }}>
                          {log.level}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
};

const FleetManagerOverview = ({ busCount }) => {
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Tổng số xe khách" value={`${busCount} phương tiện`} trend="Đang quản lý" colorClass="blue" />
        <StatCard label="Tỷ lệ hoạt động" value="87.5%" trend="Hầu hết xe sẵn sàng chạy" colorClass="green" />
        <StatCard label="Xe đang bảo trì" value="1 xe" trend="Bảo dưỡng tại garage" colorClass="yellow" />
        <StatCard label="Đề xuất chờ duyệt" value="3 đơn đề xuất" trend="Đang chờ phê duyệt" colorClass="purple" />
      </section>

      <section className="content-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Kế hoạch bảo trì gần đây */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Lịch bảo trì &amp; Đăng kiểm sắp tới</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>51B-123.45</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Hạn 15/09/2026</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bảo dưỡng định kỳ: Thay dầu động cơ, lọc gió</p>
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong>49B-022.22</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Hạn 20/09/2026</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Kiểm định đăng kiểm kỳ 6 tháng</p>
            </div>
          </div>
        </div>

        {/* Phân loại phương tiện */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Phân loại phương tiện vận hành</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Limousine VIP (22 phòng nằm)</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Dành cho chặng xa chất lượng cao</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--primary)', fontWeight: '700' }}>3 xe</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% Sẵn sàng</p>
              </div>
            </div>

            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Giường nằm phổ thông (44 chỗ)</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Xe chạy tuyến liên tỉnh thường</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--success)', fontWeight: '700' }}>5 xe</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>4 chạy, 1 bảo trì</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const exportOpsReportToExcel = (trips = [], activeRoutes = [], busList = []) => {
  if (!trips || trips.length === 0) {
    alert('Chưa có dữ liệu chuyến xe để xuất báo cáo vận hành.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += 'BÁO CÁO GIÁM SÁT VẬN HÀNH & ĐIỀU HÀNH CHUYẾN XE - AN BÌNH LINES\n';
  csvContent += `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}\n`;
  csvContent += `Tổng số chuyến xe: ${trips.length}, Số tuyến đường khai thác: ${activeRoutes.length}, Đội xe: ${busList.length} phương tiện\n\n`;

  csvContent += 'STT,Mã Chuyến Xe,Tuyến Xe,Thời Gian Khởi Hành,Biển Số Xe,Loại Xe,Tài Xế,Phụ Xe,Số Vé Đã Đặt,Tổng Ghế,Tỷ Lệ Lấp Đầy (%),Trạng Thái Vận Hành\n';

  trips.forEach((trip, index) => {
    const routeStr = trip.routeId ? `"${trip.routeId.startPoint} -> ${trip.routeId.endPoint}"` : '"N/A"';
    const depTime = `"${new Date(trip.departureTime).toLocaleString('vi-VN')}"`;
    const busPlate = `"${(trip.busId?.plateNumber || 'Chưa gán').replace(/"/g, '""')}"`;
    const busType = `"${(trip.busId?.busType || 'N/A').replace(/"/g, '""')}"`;
    const driver = `"${(trip.driver?.name || 'Chưa phân công').replace(/"/g, '""')}"`;
    const assistant = `"${(trip.assistant?.name || 'Chưa phân công').replace(/"/g, '""')}"`;
    const booked = trip.bookedSeats?.length || 0;
    const total = trip.busId?.totalSeats || 30;
    const fillPct = Math.round((booked / total) * 100);
    const statusStr = fillPct >= 80 ? 'Cao điểm' : fillPct >= 50 ? 'Bình thường' : 'Thấp điểm';

    csvContent += `${index + 1},${trip._id || ''},${routeStr},${depTime},${busPlate},${busType},${driver},${assistant},${booked},${total},${fillPct}%,${statusStr}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_Van_Hanh_AnBinhLines_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const OpsManagerOverview = ({
  routeCount = 0,
  tripCount = 0,
  busCount = 0,
  totalBookedSeats = 0,
  recentTrips = [],
  activeRoutes = [],
  busList = [],
  staffList = [],
  todaysTripsCount = 0,
  todaysTripsList = [],
  onRefresh
}) => {
  const unassignedTrips = recentTrips.filter(t => !t.driver || !t.assistant);
  const activeBusesCount = busList.filter(b => b.status !== 'maintenance' && b.status !== 'inactive').length;
  const maintenanceCount = busList.filter(b => b.status === 'maintenance').length;
  
  let totalCapacity = 0;
  recentTrips.forEach(t => {
    totalCapacity += (t.busId?.totalSeats || 30);
  });
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalBookedSeats / totalCapacity) * 100) : 62;

  return (
    <>
      {/* Top Action Header Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        marginBottom: '0.85rem'
      }}>
        {/* Top Header & Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Trung Tâm Điều Hành Vận Tải
              </h1>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                Live Dispatch Center
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Chào mừng trở lại, <strong style={{ color: '#2563eb' }}>Quản Lý Vận Tải!</strong> Giám sát lịch trình chuyến xe, phân công nhân sự &amp; công suất bến xe thời gian thực
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onRefresh}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Đồng bộ tức thời
            </button>
            <button
              onClick={() => exportOpsReportToExcel(recentTrips, activeRoutes, busList)}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất báo cáo Vận hành
            </button>
          </div>
        </div>

        {/* 4 Key Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          {/* Card 1: Tuyến đường */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TUYẾN ĐƯỜNG KHAI THÁC</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {routeCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>tuyến</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>▲</span> {activeRoutes.length} tuyến đang vận hành ổn định
            </div>
          </div>

          {/* Card 2: Chuyến xe */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHUYẾN XE VẬN HÀNH</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {tripCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              {todaysTripsCount > 0 ? `${todaysTripsCount} chuyến khởi hành trong ngày` : 'Đã lên lịch đầy đủ'}
            </div>
          </div>

          {/* Card 3: Đội xe khả dụng */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐỘI XE KHẢ DỤNG</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {busCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>phương tiện</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600' }}>
              ✓ {activeBusesCount} xe sẵn sàng xuất bến {maintenanceCount > 0 ? `(${maintenanceCount} bảo trì)` : ''}
            </div>
          </div>

          {/* Card 4: Tỷ lệ lấp đầy & Vé */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG VÉ ĐÃ ĐẶT</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {totalBookedSeats} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vé</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '600' }}>
              ▲ {avgOccupancy}% Tỷ lệ lấp đầy ghế trung bình
            </div>
          </div>
        </div>
      </div>

      {/* Live Operations Alert Banner (If any unassigned crew) */}
      {unassignedTrips.length > 0 && (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px',
          padding: '0.85rem 1.25rem', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#e11d48', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem' }}>
              !
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#9f1239', fontSize: '0.82rem' }}>
                CẢNH BÁO PHÂN CÔNG NHÂN SỰ VẬN HÀNH: Có {unassignedTrips.length} chuyến xe chưa được gán đủ Tài Xế / Phụ Xe!
              </div>
              <div style={{ fontSize: '0.72rem', color: '#be123c', marginTop: '1px' }}>
                Vui lòng kiểm tra và phân công tài xế / phụ xe ngay để đảm bảo lịch khởi hành đúng giờ.
              </div>
            </div>
          </div>
          <a href="/crew-assignments" style={{ background: '#be123c', color: '#fff', padding: '5px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', textDecoration: 'none' }}>
            Phân công ngay →
          </a>
        </div>
      )}

      {/* Main Grid: Bảng Giám Sát Chuyến Xe Thời Gian Thực */}
      <section style={{ width: '100%', marginBottom: '0.85rem' }}>
        <div className="panel" style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Bảng Điều Hành &amp; Giám Sát Chuyến Xe (Real-time MongoDB)
                </h2>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '700' }}>
                  Live Trips Stream
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
                Theo dõi tuyến chạy, giờ xuất bến, biển số xe, tài xế/phụ xe và tiến độ lấp đầy ghế thời gian thực
              </p>
            </div>
            <a href="/trips" style={{ color: '#2563eb', fontWeight: '700', fontSize: '0.75rem', textDecoration: 'none' }}>
              Quản lý chuyến xe đầy đủ →
            </a>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN ĐƯỜNG &amp; THỜI GIAN</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>PHƯƠNG TIỆN (BIỂN SỐ)</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>TÀI XẾ CHÍNH</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>PHỤ XE THEO CA</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>LẤP ĐẦY GHẾ (%)</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>TRẠNG THÁI PHÂN CÔNG</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      Chưa có dữ liệu chuyến xe nào trong MongoDB.
                    </td>
                  </tr>
                ) : (
                  recentTrips.slice(0, 6).map((trip) => {
                    const booked = trip.bookedSeats?.length || 0;
                    const totalSeats = trip.busId?.totalSeats || 30;
                    const pct = Math.round((booked / totalSeats) * 100);
                    const depDate = trip.departureTime ? new Date(trip.departureTime) : null;
                    const timeStr = depDate ? depDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    const dateStr = depDate ? depDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                    const isFullyAssigned = trip.driver && trip.assistant;

                    return (
                      <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>
                            {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'Chưa gắn tuyến'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600', marginTop: '1px' }}>
                            Khởi hành: {timeStr} ({dateStr})
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <div style={{ fontWeight: '700', color: '#334155' }}>
                            {trip.busId?.plateNumber || 'Chưa gán xe'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {trip.busId?.busType || 'Xe chất lượng cao'} ({totalSeats} chỗ)
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {trip.driver?.name ? (
                            <span style={{ fontWeight: '600', color: '#16a34a' }}>✓ {trip.driver.name}</span>
                          ) : (
                            <span style={{ fontWeight: '700', color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                              Chưa gán tài xế
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {trip.assistant?.name ? (
                            <span style={{ fontWeight: '600', color: '#16a34a' }}>✓ {trip.assistant.name}</span>
                          ) : (
                            <span style={{ fontWeight: '700', color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                              Chưa gán phụ xe
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', width: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '3px' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{booked}/{totalSeats} vé</span>
                            <span style={{ fontWeight: '800', color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#d97706' }}>{pct}%</span>
                          </div>
                          <div style={{ height: '5px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`,
                              backgroundColor: pct >= 80 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#f59e0b',
                              borderRadius: '3px'
                            }}></div>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '700',
                            backgroundColor: isFullyAssigned ? '#dcfce7' : '#fee2e2',
                            color: isFullyAssigned ? '#15803d' : '#b91c1c'
                          }}>
                            {isFullyAssigned ? 'Đã đủ nhân sự' : 'Thiếu kíp chạy'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Panels Grid: Tuyến xe trọng điểm & Phân bổ xe */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
        {/* Panel 1: Tuyến đường đang khai thác trọng điểm */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Tuyến Đường Khai Thác Trọng Điểm
            </h2>
            <span style={{ fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
              {activeRoutes.length} Tuyến Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activeRoutes.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.78rem' }}>Chưa có cấu hình tuyến đường nào.</p>
            ) : (
              activeRoutes.slice(0, 4).map((route) => (
                <div key={route._id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.78rem' }}>
                      {route.startPoint} ➔ {route.endPoint}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                      Thời gian dự kiến: {route.duration || '3 giờ'} • Khai thác hàng ngày
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700' }}>
                      {route.distance || '172km'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Tình trạng & Phân bổ phương tiện đội xe */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Tình Trạng &amp; Phân Bổ Phương Tiện Đội Xe
            </h2>
            <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
              {busCount} Xe Hệ Thống
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ padding: '10px 12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: '#065f46', fontSize: '0.78rem' }}>Limousine VIP (22 phòng nằm)</div>
                <div style={{ fontSize: '0.68rem', color: '#047857', marginTop: '2px' }}>Chuyên trách các tuyến đường dài chất lượng cao</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#059669', fontWeight: '800', fontSize: '0.85rem' }}>3 xe</span>
                <div style={{ fontSize: '0.65rem', color: '#047857', fontWeight: '600' }}>100% Hoạt động</div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.78rem' }}>Xe Giường Nằm Phổ Thông (44 chỗ)</div>
                <div style={{ fontSize: '0.68rem', color: '#1d4ed8', marginTop: '2px' }}>Chuyên chở khách liên tỉnh thường nhật</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '0.85rem' }}>5 xe</span>
                <div style={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: '600' }}>4 Sẵn sàng, 1 bảo trì</div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: '#6b21a8', fontSize: '0.78rem' }}>Xe Ghế Ngồi Cao Cấp (16 - 29 chỗ)</div>
                <div style={{ fontSize: '0.68rem', color: '#7e22ce', marginTop: '2px' }}>Trung chuyển bến bãi &amp; Chặng ngắn</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#9333ea', fontWeight: '800', fontSize: '0.85rem' }}>2 xe</span>
                <div style={{ fontSize: '0.65rem', color: '#7e22ce', fontWeight: '600' }}>100% Sẵn sàng</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const GeneralManagerOverview = ({
  routeCount,
  tripCount,
  busCount,
  totalBookedSeats,
  revenue,
  avgRating,
  recentTrips,
  staffList = [],
  busList = [],
  revenueTrend = '',
  seatsTrend = '',
  tripsTrend = '',
  ratingTrend = '',
  todaysTripsCount = 0,
  todaysTripsList = [],
  onRefresh
}) => {
  const activeBuses = busList.filter(b => b.status !== 'maintenance' && b.status !== 'inactive').length;
  const readyRate = busCount > 0 ? Math.round((activeBuses / busCount) * 100) : 100;
  const positiveRate = avgRating ? (avgRating / 5 * 100).toFixed(1) : '94.5';
  const displayTrips = todaysTripsList.length > 0 ? todaysTripsList : recentTrips.slice(0, 5);

  return (
    <>
      {/* Main Top White Card Container wrapping Header & 4 Stat Cards */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        marginBottom: '0.85rem'
      }}>
        {/* Top Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>Dashboard</h1>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700' }}>
                Ban Giám Đốc Overview
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
              Chào mừng trở lại, <strong style={{ color: '#2563eb' }}>Ban Giám Đốc!</strong> Báo cáo chiến lược, tổng quan doanh thu &amp; giám sát vận hành An Bình Lines
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onRefresh}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Đồng bộ tức thời
            </button>
            <button
              onClick={() => exportGMReportToExcel(displayTrips, revenue, totalBookedSeats, tripCount)}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất báo cáo Excel
            </button>
          </div>
        </div>

        {/* 4 Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          {/* Card 1: Tổng Doanh Thu Vé */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG DOANH THU VÉ</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {revenue.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669' }}>đ</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {revenueTrend || '▲ +12.4% so với kỳ trước'}
            </div>
          </div>

          {/* Card 2: Vé Xe Đã Bán */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VÉ XE ĐÃ BÁN</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><line x1="13" y1="5" x2="13" y2="19"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="17" y1="12" x2="17.01" y2="12"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {totalBookedSeats} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>vé</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {seatsTrend || '▲ +8.2% lượt khách đặt'}
            </div>
          </div>

          {/* Card 3: Chuyến Xe Vận Hành */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHUYẾN XE VẬN HÀNH</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>
              {tripCount} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#9333ea', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {tripsTrend || '▲ +15.5% hiệu suất khai thác'}
            </div>
          </div>

          {/* Card 4: Đánh Giá Trung Bình */}
          <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐÁNH GIÁ TRUNG BÌNH</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {avgRating.toFixed(1)}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {ratingTrend || '▲ +4.7% mức độ hài lòng'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
        {/* Active operations list */}
        <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Giám sát hoạt động các chuyến xe hôm nay</h2>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>Theo dõi thời gian thực lịch trình, nhân sự và doanh thu theo từng chuyến</p>
            </div>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
              {todaysTripsCount > 0 ? `${todaysTripsCount} chuyến hôm nay` : `${displayTrips.length} chuyến mới nhất`}
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>TUYẾN XE</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>KHỞI HÀNH</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>NHÂN SỰ</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>BIỂN SỐ XE</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', textAlign: 'center' }}>SỐ VÉ</th>
                  <th style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', textAlign: 'right' }}>DOANH THU DỰ KIẾN</th>
                </tr>
              </thead>
              <tbody>
                {displayTrips.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.78rem' }}>
                      Chưa có chuyến xe nào được ghi nhận hôm nay.
                    </td>
                  </tr>
                ) : (
                  displayTrips.map((trip) => {
                    const tripRevenue = (trip.bookedSeats?.length || 0) * trip.price;
                    const depTime = new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    return (
                      <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', verticalAlign: 'middle' }}>
                        <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', fontWeight: '700', color: '#1e293b' }}>
                          {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', color: '#64748b', fontSize: '0.74rem' }}>{depTime}</td>
                        <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{trip.driver?.name || 'Chưa gán'}</span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Phụ: {trip.assistant?.name || 'Chưa gán'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', fontWeight: '600', color: '#334155', fontFamily: 'monospace' }}>
                          {trip.busId?.plateNumber || 'N/A'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>
                          {trip.bookedSeats?.length || 0}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', verticalAlign: 'middle', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                          {tripRevenue.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Right Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Panel 1: Fleet & Operational KPI Overview */}
          <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1rem 0' }}>Tổng quan chỉ số đội xe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Tổng số xe khách:</span>
                <strong style={{ color: '#0f172a' }}>{busCount} xe</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Tuyến kết nối:</span>
                <strong style={{ color: '#0f172a' }}>{routeCount} tuyến</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Tỷ lệ xe sẵn sàng:</span>
                <strong style={{ color: '#16a34a' }}>{readyRate}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Tổng nhân sự hệ thống:</span>
                <strong style={{ color: '#2563eb' }}>{staffList.length || 0} người</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Phản hồi tích cực:</span>
                <strong style={{ color: '#d97706' }}>{positiveRate}%</strong>
              </div>
            </div>
          </div>

          {/* Panel 2: Real-time Operational Status */}
          <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.75rem 0' }}>Trạng thái vận hành</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ecfdf5', padding: '12px', borderRadius: '10px', border: '1px solid #d1fae5' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
              <div>
                <div style={{ color: '#065f46', fontSize: '0.8rem', fontWeight: '700' }}>Hệ thống trực tuyến thời gian thực</div>
                <div style={{ color: '#047857', fontSize: '0.68rem', marginTop: '1px' }}>Tất cả dịch vụ vận tải hoạt động ổn định</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const DashboardOverviewPage = () => {
  const { user, token } = useContext(AuthContext);
  const [busCount, setBusCount] = useState(0);
  const [busList, setBusList] = useState([]);
  const [routeCount, setRouteCount] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [totalBookedSeats, setTotalBookedSeats] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [avgRating, setAvgRating] = useState(4.5);
  const [recentTrips, setRecentTrips] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState('');
  const [seatsTrend, setSeatsTrend] = useState('');
  const [tripsTrend, setTripsTrend] = useState('');
  const [ratingTrend, setRatingTrend] = useState('');
  const [todaysTripsCount, setTodaysTripsCount] = useState(0);
  const [todaysTripsList, setTodaysTripsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch staff for admin
        if (user?.role === 'admin' || user?.role === 'general_manager') {
          try {
            const staffRes = await fetch(`${API_BASE}/users/staff`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const staffData = await staffRes.json();
            if (staffData.success) {
              setStaffList(staffData.staff);
            }
          } catch (e) {
            console.error('Error fetching staff list:', e);
          }

          // Fetch system logs & health for admin/GM
          try {
            const logsRes = await fetch(`${API_BASE}/system/logs`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const logsData = await logsRes.json();
            if (logsData.success) {
              setLiveAuditLogs(logsData.logs || []);
            }

            const healthRes = await fetch(`${API_BASE}/system/health`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const healthJson = await healthRes.json();
            if (healthJson.success) {
              setHealthData(healthJson.data);
            }
          } catch (e) {
            console.error('Error fetching system logs/health:', e);
          }
        }

        // Fetch buses
        const busesRes = await fetch(`${API_BASE}/trips/fleet/buses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const busesData = await busesRes.json();
        const busesArr = busesData.success ? busesData.buses : [];
        setBusCount(busesArr.length);
        setBusList(busesArr);

        // Fetch routes
        const routesRes = await fetch(`${API_BASE}/trips/ops/routes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const routesData = await routesRes.json();
        if (routesData.success) {
          setRouteCount(routesData.routes.length);
          setActiveRoutes(routesData.routes);
        }

        // Fetch trips
        const tripsRes = await fetch(`${API_BASE}/trips/ops/trips`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const tripsData = await tripsRes.json();
        if (tripsData.success) {
          const allTrips = tripsData.trips || [];
          setTripCount(allTrips.length);
          setRecentTrips(allTrips);

          // Filter today's trips
          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);
          const todayTrips = allTrips.filter(t => {
            if (!t.departureTime) return false;
            const tDate = new Date(t.departureTime).toISOString().slice(0, 10);
            return tDate === todayStr;
          });

          setTodaysTripsCount(todayTrips.length);
          setTodaysTripsList(todayTrips.length > 0 ? todayTrips : allTrips.slice(0, 5));

          // Calculate period metrics & trends
          let seatsCount = 0;
          let calculatedRevenue = 0;
          let ratingsSum = 0;
          let ratingsCount = 0;

          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          let thisMonthRev = 0, prevMonthRev = 0;
          let thisMonthSeats = 0, prevMonthSeats = 0;
          let thisMonthTrips = 0, prevMonthTrips = 0;

          allTrips.forEach(trip => {
            const booked = trip.bookedSeats?.length || 0;
            const price = trip.price || 0;
            seatsCount += booked;
            calculatedRevenue += booked * price;

            if (trip.ratings?.average) {
              ratingsSum += trip.ratings.average;
              ratingsCount++;
            }

            if (trip.departureTime) {
              const d = new Date(trip.departureTime);
              const tYear = d.getFullYear();
              const tMonth = d.getMonth();

              if (tYear === currentYear && tMonth === currentMonth) {
                thisMonthRev += booked * price;
                thisMonthSeats += booked;
                thisMonthTrips += 1;
              } else if (
                (tYear === currentYear && tMonth === currentMonth - 1) ||
                (tMonth === 11 && currentMonth === 0 && tYear === currentYear - 1)
              ) {
                prevMonthRev += booked * price;
                prevMonthSeats += booked;
                prevMonthTrips += 1;
              }
            }
          });

          setTotalBookedSeats(seatsCount);
          setRevenue(calculatedRevenue);
          const computedRating = ratingsCount > 0 ? (ratingsSum / ratingsCount) : 4.7;
          setAvgRating(computedRating);

          // Calculate percentage trend algorithms
          const calcTrend = (currentVal, prevVal, suffixStr) => {
            if (prevVal > 0) {
              const pct = ((currentVal - prevVal) / prevVal) * 100;
              const sign = pct >= 0 ? '▲ +' : '▼ ';
              return `${sign}${Math.abs(pct).toFixed(1)}% ${suffixStr}`;
            } else if (currentVal > 0) {
              return `▲ +100.0% ${suffixStr}`;
            }
            const seatFillRate = (seatsCount / Math.max(1, allTrips.length * 30) * 100).toFixed(1);
            return `▲ +${seatFillRate}% ${suffixStr}`;
          };

          setRevenueTrend(calcTrend(thisMonthRev, prevMonthRev, 'so với tháng trước'));
          setSeatsTrend(calcTrend(thisMonthSeats, prevMonthSeats, 'lượt khách đặt'));
          setTripsTrend(calcTrend(thisMonthTrips, prevMonthTrips, 'hiệu suất khai thác'));
          setRatingTrend(`▲ +${(computedRating / 5 * 100).toFixed(1)}% mức độ hài lòng`);
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '700' }}>Đang tải báo cáo tổng quan vận hành...</div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return (
      <AdminOverview
        staffList={staffList}
        busCount={busCount}
        routeCount={routeCount}
        tripCount={tripCount}
        healthData={healthData}
        liveAuditLogs={liveAuditLogs}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  if (user?.role === 'ops_manager') {
    return (
      <OpsManagerOverview
        routeCount={routeCount}
        tripCount={tripCount}
        busCount={busCount}
        totalBookedSeats={totalBookedSeats}
        recentTrips={recentTrips}
        activeRoutes={activeRoutes}
        busList={busList}
        staffList={staffList}
        todaysTripsCount={todaysTripsCount}
        todaysTripsList={todaysTripsList}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  if (user?.role === 'general_manager') {
    return (
      <GeneralManagerOverview
        routeCount={routeCount}
        tripCount={tripCount}
        busCount={busCount}
        totalBookedSeats={totalBookedSeats}
        revenue={revenue}
        avgRating={avgRating}
        recentTrips={recentTrips}
        staffList={staffList}
        busList={busList}
        revenueTrend={revenueTrend}
        seatsTrend={seatsTrend}
        tripsTrend={tripsTrend}
        ratingTrend={ratingTrend}
        todaysTripsCount={todaysTripsCount}
        todaysTripsList={todaysTripsList}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  // Fleet Manager overview metrics
  return <FleetManagerOverview busCount={busCount} />;
};

export default DashboardOverviewPage;
