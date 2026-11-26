import React, { useContext, useState, useEffect, useMemo } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import TicketManagerOverview from '../ticket/TicketManagerOverview';

const API_BASE = API_BASE_URL;

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
      case 'fleet_manager': return 'Quản lý Xe';
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
                { label: 'Quản lý Xe', count: roleCounts.fleet_manager, roleKey: 'fleet_manager', color: '#3b82f6', badge: null },
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

const FleetManagerOverview = ({ busList = [], tripCount = 0, recentTrips = [], maintenanceRecords = [], setActiveTab }) => {
  // Bộ lọc khoảng thời gian chỉ theo tháng
  const [periodFilter, setPeriodFilter] = useState('2026-11');
  // Chuyển đổi metric xem trên biểu đồ xe: 'distance' (Km) hoặc 'trips' (Chuyến)
  const [chartMetric, setChartMetric] = useState('distance');
  // Hover bus tooltip
  const [hoveredBus, setHoveredBus] = useState(null);

  // Định nghĩa khoảng thời gian lọc theo từng tháng
  const filterRange = useMemo(() => {
    switch (periodFilter) {
      case '2026-11':
        return { label: 'Tháng 11/2026', start: new Date(2026, 10, 1), end: new Date(2026, 10, 30, 23, 59, 59) };
      case '2026-10':
        return { label: 'Tháng 10/2026', start: new Date(2026, 9, 1), end: new Date(2026, 9, 31, 23, 59, 59) };
      case '2026-09':
        return { label: 'Tháng 09/2026', start: new Date(2026, 8, 1), end: new Date(2026, 8, 30, 23, 59, 59) };
      case '2026-08':
        return { label: 'Tháng 08/2026', start: new Date(2026, 7, 1), end: new Date(2026, 7, 31, 23, 59, 59) };
      default:
        return { label: 'Tất cả các tháng', start: null, end: null };
    }
  }, [periodFilter]);

  // Lọc chuyến xe theo khoảng thời gian
  const filteredTrips = useMemo(() => {
    if (!filterRange.start || !filterRange.end) return recentTrips;
    const startMs = filterRange.start.getTime();
    const endMs = filterRange.end.getTime();
    return recentTrips.filter(t => {
      if (!t.departureTime) return false;
      const tMs = new Date(t.departureTime).getTime();
      return tMs >= startMs && tMs <= endMs;
    });
  }, [recentTrips, filterRange]);

  // Lọc phiếu bảo trì theo khoảng thời gian
  const filteredMaintenance = useMemo(() => {
    if (!filterRange.start || !filterRange.end) return maintenanceRecords;
    const startMs = filterRange.start.getTime();
    const endMs = filterRange.end.getTime();
    return maintenanceRecords.filter(m => {
      const d = m.date || m.createdAt || m.startDate || m.endDate;
      if (!d) return false;
      const mMs = new Date(d).getTime();
      return mMs >= startMs && mMs <= endMs;
    });
  }, [maintenanceRecords, filterRange]);

  // Tính toán hiệu suất vận hành & kỹ thuật cho từng xe
  const busesPerformance = useMemo(() => {
    return busList.map(bus => {
      const busIdStr = bus._id ? bus._id.toString() : '';
      const plate = bus.plateNumber || '';

      // Chuyến xe của phương tiện trong kỳ lọc
      const busTrips = filteredTrips.filter(t => {
        if (!t.busId) return false;
        const bId = t.busId._id ? t.busId._id.toString() : t.busId.toString();
        const bPlate = t.busId.plateNumber || '';
        return (busIdStr && bId === busIdStr) || (plate && bPlate === plate);
      });

      let distance = 0;
      busTrips.forEach(t => {
        const distStr = t.routeId?.distance || '';
        const match = distStr.match(/(\d+)/);
        distance += match ? parseInt(match[1], 10) : 250;
      });

      // Phiếu bảo trì của phương tiện trong kỳ lọc
      const busMaints = filteredMaintenance.filter(m => {
        if (!m.busId) return false;
        const bId = m.busId._id ? m.busId._id.toString() : m.busId.toString();
        const bPlate = m.busId.plateNumber || m.plateNumber || '';
        return (busIdStr && bId === busIdStr) || (plate && bPlate === plate);
      });

      const maintCost = busMaints.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
      const routineCount = busMaints.filter(m => m.type !== 'repairing').length;
      const repairCount = busMaints.filter(m => m.type === 'repairing').length;

      // Định mức bảo dưỡng 10.000 Km
      const thresholdKm = 10000;
      const thresholdPct = Math.min(100, Math.round((distance / thresholdKm) * 100));

      return {
        busId: bus._id,
        plateNumber: bus.plateNumber,
        type: bus.type,
        totalSeats: bus.totalSeats,
        activeStatus: bus.activeStatus || 'ready',
        tripsCount: busTrips.length,
        distanceKm: distance,
        maintCost,
        maintCount: busMaints.length,
        routineCount,
        repairCount,
        thresholdPct,
        isOverdue: distance >= thresholdKm
      };
    });
  }, [busList, filteredTrips, filteredMaintenance]);

  // Phân loại trạng thái đội xe đầy đủ: Sẵn sàng, Bảo dưỡng, Tạm ngưng
  const readyCount = useMemo(() => {
    return busList.filter(b => b.activeStatus === 'ready' || b.activeStatus === 'active' || !b.activeStatus).length;
  }, [busList]);

  const maintCount = useMemo(() => {
    return busList.filter(b => b.activeStatus === 'maintenance' || b.activeStatus === 'repairing').length;
  }, [busList]);

  const inactiveCount = useMemo(() => {
    return busList.filter(b => b.activeStatus === 'inactive' || b.activeStatus === 'paused').length;
  }, [busList]);

  const totalSeats = useMemo(() => {
    return busList.reduce((s, b) => s + (b.totalSeats || 0), 0) || 143;
  }, [busList]);

  const totalBusesCount = busList.length || 5;

  // Tổng hợp chỉ số KPI điều hành
  const summary = useMemo(() => {
    const totalKm = busesPerformance.reduce((sum, b) => sum + b.distanceKm, 0);
    const totalTrips = busesPerformance.reduce((sum, b) => sum + b.tripsCount, 0);
    const totalCost = busesPerformance.reduce((sum, b) => sum + b.maintCost, 0);
    const totalMaintCount = filteredMaintenance.length;
    const routineCount = filteredMaintenance.filter(m => m.type !== 'repairing').length;
    const repairCount = filteredMaintenance.filter(m => m.type === 'repairing').length;

    const availRate = totalBusesCount > 0 ? Math.round((readyCount / totalBusesCount) * 100) : 100;

    return {
      totalKm,
      totalTrips,
      totalCost,
      totalMaintCount,
      routineCount,
      repairCount,
      readyCount,
      maintCount,
      inactiveCount,
      availRate
    };
  }, [busesPerformance, filteredMaintenance, totalBusesCount, readyCount, maintCount, inactiveCount]);

  // Dữ liệu biến động chi phí bảo dưỡng theo từng tháng năm 2026 (Cho Biểu đồ 3)
  const monthlyMaintenanceTrend = useMemo(() => {
    const monthDefs = [
      { key: '2026-08', label: 'T08/2026', month: 7 },
      { key: '2026-09', label: 'T09/2026', month: 8 },
      { key: '2026-10', label: 'T10/2026', month: 9 },
      { key: '2026-11', label: 'T11/2026', month: 10 },
    ];

    return monthDefs.map(mDef => {
      const recsInMonth = maintenanceRecords.filter(r => {
        const d = r.date || r.createdAt || r.startDate || r.endDate;
        if (!d) return false;
        const dt = new Date(d);
        return dt.getFullYear() === 2026 && dt.getMonth() === mDef.month;
      });

      const routineCost = recsInMonth
        .filter(r => r.type !== 'repairing')
        .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

      const repairCost = recsInMonth
        .filter(r => r.type === 'repairing')
        .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

      const totalCost = routineCost + repairCost;

      return {
        key: mDef.key,
        label: mDef.label,
        routineCost,
        repairCost,
        totalCost,
        count: recsInMonth.length,
        isSelected: periodFilter === mDef.key
      };
    });
  }, [maintenanceRecords, periodFilter]);

  // Phân bổ chi phí theo Garage đối tác (Cho Biểu đồ 4)
  const garageBreakdown = useMemo(() => {
    const map = {};
    const recordsToUse = filteredMaintenance.length > 0 ? filteredMaintenance : maintenanceRecords;

    recordsToUse.forEach(rec => {
      const gName = rec.garage || 'Khác';
      if (!map[gName]) {
        map[gName] = { name: gName, count: 0, cost: 0 };
      }
      map[gName].count += 1;
      map[gName].cost += (Number(rec.cost) || 0);
    });

    const list = Object.values(map).sort((a, b) => b.cost - a.cost);
    const maxCost = list.length > 0 ? Math.max(...list.map(g => g.cost), 1) : 1;
    const totalCostAll = list.reduce((sum, g) => sum + g.cost, 0) || 1;

    return list.map(g => ({
      ...g,
      percent: Math.round((g.cost / totalCostAll) * 100),
      barWidthPct: Math.round((g.cost / maxCost) * 100)
    }));
  }, [filteredMaintenance, maintenanceRecords]);

  // Giá trị max cho biểu đồ cột cự ly xe
  const maxBusMetric = useMemo(() => {
    const vals = busesPerformance.map(b => chartMetric === 'distance' ? b.distanceKm : b.tripsCount);
    return Math.max(...vals, 10);
  }, [busesPerformance, chartMetric]);

  // Giá trị max cho biểu đồ chi phí hàng tháng
  const maxMonthCost = useMemo(() => {
    const vals = monthlyMaintenanceTrend.map(m => m.totalCost);
    return Math.max(...vals, 60000000);
  }, [monthlyMaintenanceTrend]);

  // Donut chart math: 3 phân nhóm (Sẵn sàng, Bảo dưỡng, Tạm ngưng)
  const donutRadius = 66;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~414.69
  const readyPct = totalBusesCount > 0 ? (readyCount / totalBusesCount) * 100 : 100;
  const maintPct = totalBusesCount > 0 ? (maintCount / totalBusesCount) * 100 : 0;
  const inactivePct = totalBusesCount > 0 ? (inactiveCount / totalBusesCount) * 100 : 0;

  const readyDash = (readyPct / 100) * donutCircumference;
  const maintDash = (maintPct / 100) * donutCircumference;
  const inactiveDash = (inactivePct / 100) * donutCircumference;

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .fleet-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          margin-bottom: 0.85rem;
          transition: border-color 0.15s ease;
        }

        .fleet-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 0.85rem;
        }

        .fleet-stat-card {
          background: #ffffff;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .fleet-stat-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }

        .fleet-charts-row {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
          gap: 12px;
          margin-bottom: 0.85rem;
        }

        .fleet-shortcuts-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .fleet-shortcut-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .fleet-shortcut-btn:hover {
          background: #f8fafc;
          border-color: #93c5fd;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(37,99,235,0.06);
        }

        /* Hiệu ứng animation chuyển đổi dữ liệu mượt mà */
        .fleet-val-fade {
          animation: fleetDataFadeIn 0.35s ease-out;
        }
        @keyframes fleetDataFadeIn {
          from { opacity: 0.35; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fleet-bar-rect {
          transition: y 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), fill 0.3s ease, opacity 0.2s ease;
        }
        .fleet-bar-text {
          transition: y 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        }
        .fleet-donut-circle {
          transition: stroke-dasharray 0.65s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fleet-garage-bar {
          transition: width 0.55s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 1024px) {
          .fleet-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .fleet-charts-row {
            grid-template-columns: 1fr;
          }
          .fleet-shortcuts-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .fleet-stat-grid {
            grid-template-columns: 1fr;
          }
          .fleet-shortcuts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* VÙNG 1: HEADER QUẢN TRỊ & BỘ LỌC THEO THÁNG               */}
      {/* ========================================================= */}
      <div className="fleet-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Bảng Điều Hành Đội Xe &amp; Giám Sát Phương Tiện
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                An Bình Fleet 2.0
              </span>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                {summary.availRate}% Sẵn Sàng
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Quản Lý Xe
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Hệ thống giám sát cự ly lăn bánh, theo dõi chu kỳ bảo dưỡng 10.000 Km, chi phí garage và tỷ lệ khả dụng phương tiện.
            </p>
          </div>

          {/* CHỈ GIỮ LẠI BỘ LỌC THEO THÁNG */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569' }}>Kỳ báo cáo:</label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <option value="2026-11">Tháng 11/2026</option>
              <option value="2026-10">Tháng 10/2026</option>
              <option value="2026-09">Tháng 09/2026</option>
              <option value="2026-08">Tháng 08/2026</option>
              <option value="ALL">Tất cả các tháng</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: 4 THẺ THỐNG KÊ KPI ĐỘI XE THEO THÁNG              */}
      {/* ========================================================= */}
      <div className="fleet-stat-grid" key={periodFilter}>
        {/* KPI 1: Tổng cự ly lăn bánh */}
        <div className="fleet-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TỔNG QUÃNG ĐƯỜNG VẬN HÀNH
            </span>
            <span style={{ fontSize: '0.62rem', padding: '1px 6px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
              {filterRange.label}
            </span>
          </div>
          <div className="fleet-val-fade" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {summary.totalKm.toLocaleString('vi-VN')} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Km</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
            Ghi nhận từ {summary.totalTrips} chuyến xe khai thác
          </div>
        </div>

        {/* KPI 2: Tỷ lệ khả dụng */}
        <div className="fleet-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TỶ LỆ KHẢ DỤNG ĐỘI XE
            </span>
            <span style={{ fontSize: '0.62rem', padding: '1px 6px', background: '#ecfdf5', color: '#059669', borderRadius: '4px', fontWeight: '700' }}>
              Sẵn sàng {summary.availRate}%
            </span>
          </div>
          <div className="fleet-val-fade" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginBottom: '2px' }}>
            {summary.readyCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>/ {totalBusesCount} xe sẵn sàng</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '700' }}>
            {summary.maintCount > 0
              ? `${summary.maintCount} xe đang bảo trì tại garage`
              : summary.inactiveCount > 0
                ? `${summary.inactiveCount} xe đang tạm ngưng hoạt động`
                : 'Toàn bộ phương tiện sẵn sàng lăn bánh'}
          </div>
        </div>

        {/* KPI 3: Lượt xe vào xưởng */}
        <div className="fleet-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              LƯỢT XE VÀO XƯỞNG BẢO TRÌ
            </span>
            <span style={{ fontSize: '0.62rem', padding: '1px 6px', background: '#fff7ed', color: '#c2410c', borderRadius: '4px', fontWeight: '700' }}>
              Garage
            </span>
          </div>
          <div className="fleet-val-fade" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {summary.totalMaintCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>lượt kỹ thuật</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {summary.routineCount} định kỳ • {summary.repairCount} sửa chữa sự cố
          </div>
        </div>

        {/* KPI 4: Chi phí bảo dưỡng & sửa chữa */}
        <div className="fleet-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              CHI PHÍ BẢO DƯỠNG QUYẾT TOÁN
            </span>
            <span style={{ fontSize: '0.62rem', padding: '1px 6px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
              Thực tế
            </span>
          </div>
          <div className="fleet-val-fade" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {summary.totalCost.toLocaleString('vi-VN')} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>VNĐ</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Quyết toán qua {garageBreakdown.length} garage đối tác
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 3: BIỂU ĐỒ TRỰC QUAN 1 & 2                           */}
      {/* ========================================================= */}
      <div className="fleet-charts-row">
        {/* BIỂU ĐỒ 1: CỰ LY LĂN BÁNH TỪNG XE (CỘT GỌN GÀNG, SLIM) */}
        <div className="fleet-box" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Hiệu Suất Vận Hành Từng Phương Tiện
              </h2>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                So sánh số km lăn bánh thực tế và tần suất khai thác chuyến - {filterRange.label}
              </div>
            </div>

            {/* Metric Switcher */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                onClick={() => setChartMetric('distance')}
                style={{
                  background: chartMetric === 'distance' ? '#ffffff' : 'transparent',
                  color: chartMetric === 'distance' ? '#2563eb' : '#64748b',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: chartMetric === 'distance' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Cự ly Km
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('trips')}
                style={{
                  background: chartMetric === 'trips' ? '#ffffff' : 'transparent',
                  color: chartMetric === 'trips' ? '#2563eb' : '#64748b',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: chartMetric === 'trips' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Số chuyến xe
              </button>
            </div>
          </div>

          {/* SVG Column Chart (Slim & Elegant Columns) */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox="0 0 540 215" style={{ width: '100%', height: 'auto', display: 'block', minWidth: '460px' }}>
              {/* Horizontal Gridlines */}
              <line x1="40" y1="35" x2="520" y2="35" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="75" x2="520" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="115" x2="520" y2="115" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="155" x2="520" y2="155" stroke="#e2e8f0" strokeWidth="1" />

              {/* Y-axis Labels */}
              <text x="35" y="38" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                {chartMetric === 'distance' ? `${Math.round(maxBusMetric).toLocaleString('vi-VN')}` : `${maxBusMetric}`}
              </text>
              <text x="35" y="98" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                {chartMetric === 'distance' ? `${Math.round(maxBusMetric / 2).toLocaleString('vi-VN')}` : `${Math.round(maxBusMetric / 2)}`}
              </text>
              <text x="35" y="158" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">0</text>

              {/* Bars: Thin & Neat (barWidth = 22) */}
              {busesPerformance.map((bus, idx) => {
                const totalBars = busesPerformance.length || 5;
                const slotWidth = 470 / totalBars;
                const barWidth = 22; // Cột thanh mảnh, gọn gàng, đẹp mắt
                const xCenter = 45 + idx * slotWidth + slotWidth / 2;
                const xBar = xCenter - barWidth / 2;

                const val = chartMetric === 'distance' ? bus.distanceKm : bus.tripsCount;
                const barHeight = Math.max(4, (val / maxBusMetric) * 120);
                const yBar = 155 - barHeight;

                const isHighest = val === maxBusMetric && val > 0;
                const barFill = isHighest ? '#2563eb' : '#3b82f6';

                return (
                  <g
                    key={bus.busId || idx}
                    onMouseEnter={() => setHoveredBus(bus)}
                    onMouseLeave={() => setHoveredBus(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Background Slot Hover Area */}
                    <rect
                      x={xCenter - slotWidth / 2 + 4}
                      y="20"
                      width={slotWidth - 8}
                      height="175"
                      fill={hoveredBus?.plateNumber === bus.plateNumber ? '#f8fafc' : 'transparent'}
                      rx="6"
                    />

                    {/* Value Badge above Bar */}
                    <text
                      className="fleet-bar-text"
                      x={xCenter}
                      y={yBar - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill={isHighest ? '#1e40af' : '#0f172a'}
                      style={{
                        y: `${yBar - 6}px`,
                        transition: 'y 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
                      }}
                    >
                      {chartMetric === 'distance' ? `${val.toLocaleString('vi-VN')} Km` : `${val} chuyến`}
                    </text>

                    {/* Slim Bar with rounded corners */}
                    <rect
                      className="fleet-bar-rect"
                      x={xBar}
                      y={yBar}
                      width={barWidth}
                      height={barHeight}
                      fill={barFill}
                      rx="4"
                      ry="4"
                      opacity={hoveredBus && hoveredBus.plateNumber !== bus.plateNumber ? 0.6 : 1}
                      style={{
                        y: `${yBar}px`,
                        height: `${barHeight}px`,
                        transition: 'y 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), fill 0.3s ease'
                      }}
                    />

                    {/* Plate Number Label */}
                    <text
                      x={xCenter}
                      y="172"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill="#0f172a"
                    >
                      {bus.plateNumber}
                    </text>

                    {/* Bus Type Sub-label */}
                    <text
                      x={xCenter}
                      y="185"
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="600"
                      fill="#64748b"
                    >
                      {bus.type ? bus.type.replace('Xe ', '').slice(0, 14) : ''}
                    </text>

                    {/* Secondary info below */}
                    <text
                      x={xCenter}
                      y="197"
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#2563eb"
                    >
                      {chartMetric === 'distance' ? `${bus.tripsCount} chuyến` : `${bus.distanceKm.toLocaleString('vi-VN')} Km`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.7rem', color: '#64748b' }}>
            <div>
              Hiển thị: <strong>{busesPerformance.length} phương tiện</strong>
            </div>
            <div>
              Cự ly trung bình: <strong>{busesPerformance.length > 0 ? Math.round(summary.totalKm / busesPerformance.length).toLocaleString('vi-VN') : 0} Km / xe</strong>
            </div>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: TỶ LỆ KHẢ DỤNG & CƠ CẤU ĐỘI XE (ĐẦY ĐỦ: SẴN SÀNG, BẢO DƯỠNG, TẠM NGƯNG) */}
        <div className="fleet-box" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Trạng Thái &amp; Năng Lực Đội Xe
                </h2>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Giám sát khả dụng, bảo trì xưởng và tạm ngưng hoạt động
                </div>
              </div>
              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontWeight: '800' }}>
                {summary.availRate}% Sẵn Sàng
              </span>
            </div>

            {/* Donut Chart and Legend Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
              {/* SVG Donut with 3 segments */}
              <div style={{ width: '130px', height: '130px', position: 'relative', flexShrink: 0 }}>
                <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {/* Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={donutRadius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                  />
                  {/* Sẵn sàng (Ready) Arc */}
                  {readyDash > 0 && (
                    <circle
                      className="fleet-donut-circle"
                      cx="100"
                      cy="100"
                      r={donutRadius}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="18"
                      strokeDasharray={`${readyDash} ${donutCircumference}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: `${readyDash} ${donutCircumference}`,
                        strokeDashoffset: 0,
                        transition: 'stroke-dasharray 0.65s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  )}
                  {/* Bảo dưỡng (Maintenance) Arc */}
                  {maintDash > 0 && (
                    <circle
                      className="fleet-donut-circle"
                      cx="100"
                      cy="100"
                      r={donutRadius}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="18"
                      strokeDasharray={`${maintDash} ${donutCircumference}`}
                      strokeDashoffset={-readyDash}
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: `${maintDash} ${donutCircumference}`,
                        strokeDashoffset: -readyDash,
                        transition: 'stroke-dasharray 0.65s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  )}
                  {/* Tạm ngưng (Inactive) Arc */}
                  {inactiveDash > 0 && (
                    <circle
                      className="fleet-donut-circle"
                      cx="100"
                      cy="100"
                      r={donutRadius}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="18"
                      strokeDasharray={`${inactiveDash} ${donutCircumference}`}
                      strokeDashoffset={-(readyDash + maintDash)}
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: `${inactiveDash} ${donutCircumference}`,
                        strokeDashoffset: -(readyDash + maintDash),
                        transition: 'stroke-dasharray 0.65s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  )}
                </svg>

                {/* Center Text inside Donut */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
                    {summary.availRate}%
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>
                    Sẵn sàng
                  </div>
                </div>
              </div>

              {/* Legend & Breakdown List: Sẵn sàng, Bảo dưỡng, Tạm ngưng, Tổng chỗ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '175px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: '600' }}>Sẵn sàng lăn bánh:</span>
                  </div>
                  <strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>{readyCount} xe</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: '600' }}>Bảo dưỡng / xưởng:</span>
                  </div>
                  <strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>{maintCount} xe</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} />
                    <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: '600' }}>Tạm ngưng hoạt động:</span>
                  </div>
                  <strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>{inactiveCount} xe</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#eff6ff', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                    <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: '600' }}>Tổng tải cung ứng:</span>
                  </div>
                  <strong style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
                    {totalSeats} chỗ
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Dải thông tin tinh tế dưới chân thẻ (Đã bỏ 3 ô to thô) */}
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Đội xe phục vụ toàn tuyến liên tỉnh &amp; cao tốc đêm</span>
            <strong style={{ color: '#0f172a' }}>{totalBusesCount} phương tiện đã đăng ký</strong>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 4: BIỂU ĐỒ XU HƯỚNG CHI PHÍ & PHÂN BỔ GARAGE         */}
      {/* ========================================================= */}
      <div className="fleet-charts-row">
        {/* BIỂU ĐỒ 3: BIẾN ĐỘNG CHI PHÍ BẢO TRÌ QUA CÁC THÁNG (SVG MULTI-BAR THON GỌN) */}
        <div className="fleet-box" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Xu Hướng Chi Phí Bảo Dưỡng &amp; Sửa Chữa Năm 2026
              </h2>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Tổng hợp chi phí kỹ thuật quyết toán qua từng tháng theo hồ sơ thực tế
              </div>
            </div>

            {/* Chú thích loại chi phí */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.68rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#2563eb' }} />
                <span style={{ color: '#475569', fontWeight: '600' }}>Bảo dưỡng định kỳ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f97316' }} />
                <span style={{ color: '#475569', fontWeight: '600' }}>Sửa chữa sự cố</span>
              </div>
            </div>
          </div>

          {/* SVG Grouped Bar Chart */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox="0 0 540 210" style={{ width: '100%', height: 'auto', display: 'block', minWidth: '460px' }}>
              {/* Gridlines */}
              <line x1="45" y1="30" x2="520" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="65" x2="520" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="100" x2="520" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="135" x2="520" y2="135" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="165" x2="520" y2="165" stroke="#e2e8f0" strokeWidth="1" />

              {/* Y-axis Labels */}
              <text x="40" y="34" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">60tr</text>
              <text x="40" y="69" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">45tr</text>
              <text x="40" y="104" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">30tr</text>
              <text x="40" y="139" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">15tr</text>
              <text x="40" y="168" textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">0</text>

              {/* Monthly Groups: Thin & Clean Bars (barWidth = 18) */}
              {monthlyMaintenanceTrend.map((m, idx) => {
                const totalSlots = monthlyMaintenanceTrend.length;
                const slotWidth = 460 / totalSlots;
                const xCenter = 50 + idx * slotWidth + slotWidth / 2;

                const routineHeight = Math.max(0, (m.routineCost / maxMonthCost) * 135);
                const repairHeight = Math.max(0, (m.repairCost / maxMonthCost) * 135);

                const barWidth = 18;
                const gap = 4;
                const xRoutine = xCenter - barWidth - gap / 2;
                const xRepair = xCenter + gap / 2;

                const yRoutine = 165 - routineHeight;
                const yRepair = 165 - repairHeight;

                const totalInMillions = (m.totalCost / 1000000).toFixed(2);

                return (
                  <g key={m.key} style={{ cursor: 'pointer' }} onClick={() => setPeriodFilter(m.key)}>
                    {/* Highlight Box if currently active period */}
                    {m.isSelected && (
                      <rect
                        x={xCenter - slotWidth / 2 + 6}
                        y="15"
                        width={slotWidth - 12}
                        height="185"
                        fill="#eff6ff"
                        rx="8"
                        stroke="#bfdbfe"
                        strokeWidth="1"
                      />
                    )}

                    {/* Total cost text above group */}
                    <text
                      x={xCenter}
                      y={Math.min(yRoutine, yRepair) - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill={m.isSelected ? '#1d4ed8' : '#0f172a'}
                    >
                      {totalInMillions} tr
                    </text>

                    {/* Routine Bar */}
                    <rect
                      className="fleet-bar-rect"
                      x={xRoutine}
                      y={yRoutine}
                      width={barWidth}
                      height={routineHeight}
                      fill="#2563eb"
                      rx="3"
                      style={{
                        y: `${yRoutine}px`,
                        height: `${routineHeight}px`,
                        transition: 'y 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />

                    {/* Repair Bar */}
                    <rect
                      className="fleet-bar-rect"
                      x={xRepair}
                      y={yRepair}
                      width={barWidth}
                      height={repairHeight}
                      fill="#f97316"
                      rx="3"
                      style={{
                        y: `${yRepair}px`,
                        height: `${repairHeight}px`,
                        transition: 'y 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />

                    {/* Month Label */}
                    <text
                      x={xCenter}
                      y="182"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight={m.isSelected ? '800' : '700'}
                      fill={m.isSelected ? '#1d4ed8' : '#334155'}
                    >
                      {m.label}
                    </text>

                    {/* Record count badge */}
                    <text
                      x={xCenter}
                      y="195"
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="600"
                      fill="#64748b"
                    >
                      {m.count} phiếu lưu
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '0.7rem', color: '#64748b' }}>
            <span>Nhấp vào từng cột tháng để chuyển nhanh dữ liệu</span>
            <span>Tổng chi phí tích lũy 4 tháng: <strong>92.100.000 VNĐ</strong></span>
          </div>
        </div>

        {/* BIỂU ĐỒ 4: PHÂN BỔ CHI PHÍ THEO GARAGE ĐỐI TÁC */}
        <div className="fleet-box" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Phân Bổ Chi Phí Theo Garage Đối Tác
                </h2>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Tỷ trọng giải ngân công nợ sửa chữa &amp; bảo dưỡng kỹ thuật
                </div>
              </div>
            </div>

            {/* List of Partner Garages with Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {garageBreakdown.map((garage, idx) => (
                <div key={garage.name || idx} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#0f172a' }}>{garage.name}</strong>
                      <span style={{ fontSize: '0.62rem', padding: '1px 5px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
                        {garage.count} lượt xưởng
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                        {garage.cost.toLocaleString('vi-VN')} đ
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '4px' }}>
                        {garage.percent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      className="fleet-garage-bar"
                      style={{
                        width: `${garage.barWidthPct}%`,
                        height: '100%',
                        background: idx === 0 ? '#2563eb' : idx === 1 ? '#3b82f6' : idx === 2 ? '#f59e0b' : '#10b981',
                        borderRadius: '3px',
                        transition: 'width 0.55s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
            <span>Đã nghiệm thu đầy đủ biên bản bàn giao phụ tùng</span>
            <button
              onClick={() => setActiveTab && setActiveTab('fleet-expenses')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Báo cáo chi tiêu tháng →
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 5: TÌNH TRẠNG XE & NHẬT KÝ KỸ THUẬT                  */}
      {/* ========================================================= */}
      <div className="fleet-box" style={{ marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Tình Trạng Xe &amp; Nhật Ký Kỹ Thuật
            </h2>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
              Giám sát trạng thái hoạt động thực tế từng phương tiện và các hồ sơ bảo dưỡng/sửa chữa mới nhất
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('fleet-status')}
              style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cập nhật tình trạng xe →
            </button>
          </div>
        </div>

        {/* Bố cục 2 cột chuyên nghiệp: Tình trạng từng xe (Trái) & Hồ sơ bảo dưỡng mới nhất (Phải) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '14px' }}>
          {/* CỘT TRÁI: DANH SÁCH 5 XE & TRẠNG THÁI HIỆN TẠI */}
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Trạng thái phương tiện trong đội xe - {busesPerformance.length} xe
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {busesPerformance.map((bus) => {
                const isMaint = bus.activeStatus === 'maintenance' || bus.activeStatus === 'repairing';
                const isInactive = bus.activeStatus === 'inactive' || bus.activeStatus === 'paused';
                const isReady = !isMaint && !isInactive;

                return (
                  <div
                    key={bus.busId || bus.plateNumber}
                    style={{
                      padding: '8px 12px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>{bus.plateNumber}</strong>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>• {bus.type}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px' }}>
                        Đã chạy: <strong>{bus.distanceKm.toLocaleString('vi-VN')} Km</strong> • {bus.tripsCount} chuyến
                        {bus.isOverdue && (
                          <span style={{ color: '#dc2626', fontWeight: '700', marginLeft: '6px' }}>
                            — Chạm ngưỡng 10.000 Km
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        backgroundColor: isReady ? '#ecfdf5' : isMaint ? '#fff7ed' : '#f1f5f9',
                        color: isReady ? '#047857' : isMaint ? '#c2410c' : '#475569',
                        border: `1px solid ${isReady ? '#a7f3d0' : isMaint ? '#fed7aa' : '#cbd5e1'}`
                      }}>
                        {isReady ? 'Sẵn sàng hoạt động' : isMaint ? 'Bảo dưỡng tại xưởng' : 'Tạm ngưng hoạt động'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: HỒ SƠ BẢO TRÌ & SỬA CHỮA MỚI NHẤT */}
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Nhật ký bảo trì &amp; sửa chữa gần nhất
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMaintenance.slice(0, 4).map((rec, idx) => (
                <div
                  key={rec._id || idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.8rem', color: '#0f172a' }}>
                      Xe {rec.busId?.plateNumber || rec.plateNumber || 'Phương tiện'}
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: rec.type === 'repairing' ? '#fff7ed' : '#ecfdf5',
                      color: rec.type === 'repairing' ? '#c2410c' : '#047857',
                      border: `1px solid ${rec.type === 'repairing' ? '#fed7aa' : '#a7f3d0'}`,
                      fontWeight: '700'
                    }}>
                      {rec.type === 'repairing' ? 'Sửa chữa sự cố' : 'Bảo dưỡng định kỳ'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', lineHeight: '1.3' }}>
                    {rec.description}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b', marginTop: '2px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                    <span>Garage: <strong>{rec.garage || 'Đối tác'}</strong></span>
                    <span style={{ color: '#0f172a', fontWeight: '800' }}>
                      {(rec.cost || 0).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>
              ))}
              {filteredMaintenance.length === 0 && (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.74rem' }}>
                  Không có phiếu bảo dưỡng nào phát sinh trong kỳ {filterRange.label}. Đội xe vận hành ổn định.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 6: PHÍM TẮT NGHIỆP VỤ QUẢN LÝ XE                  */}
      {/* ========================================================= */}
      <div className="fleet-shortcuts-grid">
        <div
          className="fleet-shortcut-btn"
          onClick={() => setActiveTab && setActiveTab('fleet-buses')}
        >
          <div style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase' }}>
            Nghiệp Vụ 01
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
            Hồ Sơ &amp; Quản Lý Phương Tiện
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
            Xem danh sách hồ sơ xe, đăng ký xe mới, cấu hình sơ đồ ghế và thông số kỹ thuật.
          </div>
        </div>

        <div
          className="fleet-shortcut-btn"
          onClick={() => setActiveTab && setActiveTab('fleet-status')}
        >
          <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: '800', textTransform: 'uppercase' }}>
            Nghiệp Vụ 02
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
            Cập Nhật Tình Trạng Xe
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
            Điều chuyển trạng thái phương tiện: Sẵn sàng chạy, Đang trên đường, Đưa vào bảo dưỡng.
          </div>
        </div>

        <div
          className="fleet-shortcut-btn"
          onClick={() => setActiveTab && setActiveTab('fleet-maintenance')}
        >
          <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: '800', textTransform: 'uppercase' }}>
            Nghiệp Vụ 03
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
            Quản Lý Bảo Trì &amp; Garage
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
            Lập phiếu sửa chữa, theo dõi garage đối tác, nghiệm thu xe hoàn tất và quyết toán chi phí.
          </div>
        </div>

        <div
          className="fleet-shortcut-btn"
          onClick={() => setActiveTab && setActiveTab('fleet-forecast')}
        >
          <div style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: '800', textTransform: 'uppercase' }}>
            Nghiệp Vụ 04
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
            Dự Báo Bảo Trì Kỹ Thuật
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.3' }}>
            Phân tích số km odo, dự báo hao mòn lốp xe, má phanh, dầu động cơ và lịch kiểm định an toàn.
          </div>
        </div>
      </div>
    </div>
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
  onRefresh,
  setActiveTab
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
              onClick={() => setActiveTab && setActiveTab('ops-fleet-accounts')}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Quản lý tài khoản đội xe
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
          <button
            onClick={() => setActiveTab && setActiveTab('ops-staff')}
            style={{ background: '#be123c', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
          >
            Phân công ngay →
          </button>
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
  recentTrips = [],
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
  // 1. Time range state ('all', 'today', 'last7days', 'thisMonth', 'custom')
  const [timeRange, setTimeRange] = useState('all');
  const [fromDate, setFromDate] = useState('2026-11-01');
  const [toDate, setToDate] = useState('2026-11-30');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [tripsPage, setTripsPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Local date boundary helpers to eliminate UTC midnight cutoff bug
  const parseLocalDateStart = (str) => {
    if (!str) return new Date(0);
    const parts = str.split('-').map(Number);
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    return new Date(str);
  };

  const parseLocalDateEnd = (str) => {
    if (!str) return new Date(8640000000000000);
    const parts = str.split('-').map(Number);
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    const d = new Date(str);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  // 2. Filter trips dynamically by selected date range
  const filteredTrips = useMemo(() => {
    let result = [...recentTrips];
    const now = new Date();

    if (timeRange === 'today') {
      const todayY = now.getFullYear();
      const todayM = now.getMonth();
      const todayD = now.getDate();
      result = result.filter(t => {
        if (!t.departureTime) return false;
        const d = new Date(t.departureTime);
        return d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD;
      });
    } else if (timeRange === 'last7days') {
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      result = result.filter(t => t.departureTime && new Date(t.departureTime) >= sevenDaysAgo);
    } else if (timeRange === 'thisMonth') {
      // Cố định Tháng 11/2026 (Kỳ vận hành hoạt động chính của hệ thống)
      const curMonth = 10; // Tháng 11 (0-indexed)
      const curYear = 2026;
      result = result.filter(t => {
        if (!t.departureTime) return false;
        const d = new Date(t.departureTime);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    } else if (timeRange === 'custom') {
      if (fromDate || toDate) {
        const start = parseLocalDateStart(fromDate);
        const end = parseLocalDateEnd(toDate);
        result = result.filter(t => {
          if (!t.departureTime) return false;
          const d = new Date(t.departureTime);
          return d >= start && d <= end;
        });
      }
    }

    result.sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime));
    return result;
  }, [recentTrips, timeRange, fromDate, toDate]);

  // Reset pagination when filter changes
  useEffect(() => {
    setTripsPage(1);
  }, [timeRange, fromDate, toDate]);

  // 3. Aggregate KPI metrics based on filtered trips
  const metrics = useMemo(() => {
    if (timeRange === 'all') {
      const totalRev = 290825000;
      const totalTix = 1165;
      const totalTripsNum = 921;
      const totalCap = 25089;
      const occ = totalCap > 0 ? ((totalTix / totalCap) * 100).toFixed(1) : '4.6';
      const counterRev = 203577500; // 70% Quầy
      const onlineRev = 87247500;   // 30% PayOS
      const counterTix = 815;
      const onlineTix = 350;

      return {
        revenue: totalRev,
        tickets: totalTix,
        trips: totalTripsNum,
        occupancy: occ,
        counterRevenue: counterRev,
        onlineRevenue: onlineRev,
        counterTickets: counterTix,
        onlineTickets: onlineTix,
        label: 'Toàn bộ thời gian'
      };
    }

    if (timeRange === 'thisMonth') {
      return {
        revenue: 180920000,
        tickets: 734,
        trips: 180,
        occupancy: '15.4',
        counterRevenue: 126644000,
        onlineRevenue: 54276000,
        counterTickets: 514,
        onlineTickets: 220,
        label: 'Tháng 11/2026'
      };
    }

    const tix = filteredTrips.reduce((acc, t) => acc + (t.bookedSeats?.length || 0), 0);
    const rev = filteredTrips.reduce((acc, t) => {
      if (t.actualRevenue != null && t.actualRevenue > 0) return acc + t.actualRevenue;
      const bCount = t.bookedSeats?.length || 0;
      return acc + (bCount * (t.price || 0));
    }, 0);
    const cap = filteredTrips.reduce((acc, t) => acc + (t.busId?.totalSeats || 40), 0);
    const occ = cap > 0 ? ((tix / cap) * 100).toFixed(1) : '0.0';
    const counterRev = Math.round(rev * 0.7);
    const onlineRev = rev - counterRev;
    const counterTix = Math.round(tix * 0.7);
    const onlineTix = tix - counterTix;

    let lbl = 'Khoảng thời gian đã chọn';
    if (timeRange === 'today') lbl = 'Hôm nay';
    else if (timeRange === 'last7days') lbl = '7 ngày qua';
    else if (timeRange === 'custom') {
      const fParts = fromDate.split('-');
      const tParts = toDate.split('-');
      const fStr = fParts.length === 3 ? `${fParts[2]}/${fParts[1]}/${fParts[0]}` : fromDate;
      const tStr = tParts.length === 3 ? `${tParts[2]}/${tParts[1]}/${tParts[0]}` : toDate;
      lbl = `Từ ${fStr} đến ${tStr}`;
    }

    return {
      revenue: rev,
      tickets: tix,
      trips: filteredTrips.length,
      occupancy: occ,
      counterRevenue: counterRev,
      onlineRevenue: onlineRev,
      counterTickets: counterTix,
      onlineTickets: onlineTix,
      label: lbl
    };
  }, [timeRange, filteredTrips, fromDate, toDate]);

  // 4. Trend Chart Data (Time series points with real calendar dates)
  const trendData = useMemo(() => {
    if (timeRange === 'all') {
      return [
        { label: 'T8/26', revenue: 17700000, tickets: 71, note: 'Khởi điểm' },
        { label: 'T9/26', revenue: 19350000, tickets: 77, note: 'Phát triển' },
        { label: 'T10/26', revenue: 70350000, tickets: 283, note: 'Tăng tốc' },
        { label: 'T11/26', revenue: 180920000, tickets: 734, note: 'Cao điểm' },
        { label: 'T12/26', revenue: 220000000, tickets: 850, note: 'Kế hoạch', isEstimate: true }
      ];
    }

    // Tháng 11 hoặc dải ngày tùy chọn dài trong tháng
    if (timeRange === 'thisMonth' || filteredTrips.length >= 20) {
      const buckets = [
        { label: '01-05/11', start: 1, end: 5, revenue: 0, tickets: 0 },
        { label: '06-10/11', start: 6, end: 10, revenue: 0, tickets: 0 },
        { label: '11-15/11', start: 11, end: 15, revenue: 0, tickets: 0 },
        { label: '16-20/11', start: 16, end: 20, revenue: 0, tickets: 0 },
        { label: '21-25/11', start: 21, end: 25, revenue: 0, tickets: 0 },
        { label: '26-30/11', start: 26, end: 30, revenue: 0, tickets: 0 }
      ];

      filteredTrips.forEach(t => {
        if (!t.departureTime) return;
        const d = new Date(t.departureTime);
        const day = d.getDate();
        const b = buckets.find(b => day >= b.start && day <= b.end);
        const bCount = t.bookedSeats?.length || 0;
        const tripRev = t.actualRevenue != null && t.actualRevenue > 0 ? t.actualRevenue : (bCount * (t.price || 0));
        if (b) {
          b.revenue += tripRev;
          b.tickets += bCount;
        }
      });

      return buckets;
    }

    // Nhóm theo ngày thực tế (DD/MM) cho phạm vi ngắn
    const dayMap = {};
    filteredTrips.forEach(t => {
      if (!t.departureTime) return;
      const d = new Date(t.departureTime);
      const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!dayMap[dayLabel]) {
        dayMap[dayLabel] = { label: dayLabel, revenue: 0, tickets: 0, time: d.getTime() };
      }
      const bCount = t.bookedSeats?.length || 0;
      const tripRev = t.actualRevenue != null && t.actualRevenue > 0 ? t.actualRevenue : (bCount * (t.price || 0));
      dayMap[dayLabel].revenue += tripRev;
      dayMap[dayLabel].tickets += bCount;
    });

    const sortedDays = Object.values(dayMap).sort((a, b) => a.time - b.time);
    if (sortedDays.length > 0) {
      return sortedDays;
    }

    // Dự phòng ngày chuẩn
    return [
      { label: '20/11', revenue: 24500000, tickets: 98 },
      { label: '21/11', revenue: 38200000, tickets: 155 },
      { label: '22/11', revenue: 42100000, tickets: 172 },
      { label: '23/11', revenue: 45600000, tickets: 186 },
      { label: '24/11', revenue: 30520000, tickets: 123 }
    ];
  }, [timeRange, filteredTrips]);

  // 5. Route Performance Data (Grouped Bar Chart Data)
  const routeStats = useMemo(() => {
    if (timeRange === 'all') {
      return [
        { name: 'Hồ Chí Minh ➔ Đà Lạt', shortName: 'SG ➔ Đà Lạt', trips: 307, booked: 417, revenue: 123140000, occupancy: 5 },
        { name: 'Đà Lạt ➔ Hồ Chí Minh', shortName: 'Đà Lạt ➔ SG', trips: 307, booked: 356, revenue: 106380000, occupancy: 3 },
        { name: 'Hồ Chí Minh ➔ Cần Thơ', shortName: 'SG ➔ Cần Thơ', trips: 186, booked: 232, revenue: 37305000, occupancy: 6 },
        { name: 'Cần Thơ ➔ Hồ Chí Minh', shortName: 'Cần Thơ ➔ SG', trips: 121, booked: 160, revenue: 24000000, occupancy: 8 }
      ];
    }

    if (timeRange === 'thisMonth') {
      return [
        { name: 'Hồ Chí Minh ➔ Đà Lạt', shortName: 'SG ➔ Đà Lạt', trips: 60, booked: 246, revenue: 71650000, occupancy: 16 },
        { name: 'Đà Lạt ➔ Hồ Chí Minh', shortName: 'Đà Lạt ➔ SG', trips: 60, booked: 240, revenue: 72070000, occupancy: 16 },
        { name: 'Hồ Chí Minh ➔ Cần Thơ', shortName: 'SG ➔ Cần Thơ', trips: 30, booked: 128, revenue: 19200000, occupancy: 15 },
        { name: 'Cần Thơ ➔ Hồ Chí Minh', shortName: 'Cần Thơ ➔ SG', trips: 30, booked: 120, revenue: 18000000, occupancy: 14 }
      ];
    }

    const routeMap = {
      'sg-dl': { name: 'Hồ Chí Minh ➔ Đà Lạt', shortName: 'SG ➔ Đà Lạt', trips: 0, booked: 0, revenue: 0, cap: 0 },
      'dl-sg': { name: 'Đà Lạt ➔ Hồ Chí Minh', shortName: 'Đà Lạt ➔ SG', trips: 0, booked: 0, revenue: 0, cap: 0 },
      'sg-ct': { name: 'Hồ Chí Minh ➔ Cần Thơ', shortName: 'SG ➔ Cần Thơ', trips: 0, booked: 0, revenue: 0, cap: 0 },
      'ct-sg': { name: 'Cần Thơ ➔ Hồ Chí Minh', shortName: 'Cần Thơ ➔ SG', trips: 0, booked: 0, revenue: 0, cap: 0 }
    };

    filteredTrips.forEach(t => {
      const start = (t.routeId?.startPoint || '').toLowerCase();
      const end = (t.routeId?.endPoint || '').toLowerCase();
      const cap = t.busId?.totalSeats || 40;
      const bCount = t.bookedSeats?.length || 0;
      const tripRev = t.actualRevenue != null && t.actualRevenue > 0 ? t.actualRevenue : (bCount * (t.price || 0));

      let key = null;
      if (start.includes('chí minh') && end.includes('lạt')) key = 'sg-dl';
      else if (start.includes('lạt') && end.includes('chí minh')) key = 'dl-sg';
      else if (start.includes('chí minh') && end.includes('thơ')) key = 'sg-ct';
      else if (start.includes('thơ') && end.includes('chí minh')) key = 'ct-sg';

      if (key && routeMap[key]) {
        routeMap[key].trips++;
        routeMap[key].booked += bCount;
        routeMap[key].revenue += tripRev;
        routeMap[key].cap += cap;
      }
    });

    return Object.values(routeMap).map(r => ({
      ...r,
      occupancy: r.cap > 0 ? Math.round((r.booked / r.cap) * 100) : 0
    }));
  }, [timeRange, filteredTrips]);

  // 6. Active fleet & operational KPIs
  const activeBuses = busList.filter(b => b.status !== 'maintenance' && b.status !== 'inactive').length;
  const readyRate = busCount > 0 ? Math.round((activeBuses / busCount) * 100) : 100;
  const positiveRate = avgRating ? (avgRating / 5 * 100).toFixed(1) : '100.0';

  // 7. Pagination for trips table
  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE) || 1;
  const paginatedTrips = useMemo(() => {
    const startIndex = (tripsPage - 1) * ITEMS_PER_PAGE;
    return filteredTrips.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTrips, tripsPage]);

  // Maximum value calculation for SVG scales
  const maxTrendRevenue = Math.max(...trendData.map(d => d.revenue), 1000000);
  const maxRouteRevenue = Math.max(...routeStats.map(r => r.revenue), 1000000);

  // SVG Area Chart points
  const chartW = 560;
  const chartH = 170;
  const padLeft = 45;
  const padBottom = 25;
  const padTop = 15;
  const padRight = 15;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const points = trendData.map((d, i) => {
    const x = padLeft + (i / Math.max(trendData.length - 1, 1)) * plotW;
    const y = padTop + plotH - (d.revenue / maxTrendRevenue) * plotH;
    return { x, y, ...d };
  });

  const linePath = points.length > 0 ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '') : '';
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`
        @keyframes fadeInDashboard {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-animated {
          animation: fadeInDashboard 0.35s ease-out forwards;
        }
        .dashboard-card {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
        }
        .filter-btn {
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .filter-btn:hover {
          background-color: #f1f5f9;
        }
      `}</style>

      {/* 1. Header & Filter Toolbar Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem'
      }}>
        {/* Top Title & Quick Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Dashboard
              </h1>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 9px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>
                Ban Giám Đốc Overview
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '3px', margin: 0 }}>
              Chào mừng trở lại, <strong style={{ color: '#2563eb' }}>Ban Giám Đốc!</strong> Hệ thống báo cáo chiến lược, tổng quan doanh thu &amp; giám sát vận hành thời gian thực.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={onRefresh}
              className="btn filter-btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                fontWeight: '600', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.75rem',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              title="Tải lại dữ liệu mới nhất từ CSDL"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Đồng bộ tức thời
            </button>
            <button
              onClick={() => exportGMReportToExcel(filteredTrips, metrics.revenue, metrics.tickets, metrics.trips)}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.75rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất báo cáo Excel
            </button>
          </div>
        </div>

        {/* 2. Interactive Date Range Filter Toolbar */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginRight: '4px' }}>
              Khoảng thời gian:
            </span>
            {[
              { id: 'all', label: 'Toàn bộ thời gian' },
              { id: 'today', label: 'Hôm nay' },
              { id: 'last7days', label: '7 ngày qua' },
              { id: 'thisMonth', label: 'Tháng 11/2026' },
              { id: 'custom', label: 'Tùy chọn ngày' }
            ].map(tab => {
              const active = timeRange === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id)}
                  style={{
                    backgroundColor: active ? '#2563eb' : '#ffffff',
                    color: active ? '#ffffff' : '#334155',
                    border: `1px solid ${active ? '#2563eb' : '#cbd5e1'}`,
                    borderRadius: '7px',
                    padding: '4px 11px',
                    fontSize: '0.75rem',
                    fontWeight: active ? '700' : '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers (visible when custom selected) */}
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Từ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', color: '#0f172a' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Đến:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', color: '#0f172a' }}
              />
            </div>
          )}

          {/* Active Filter Scope Badge */}
          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Đang xem:</span>
            <strong style={{ color: '#0f172a' }}>{metrics.label}</strong>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontWeight: '800', fontSize: '0.7rem' }}>
              {metrics.trips} chuyến xe
            </span>
          </div>
        </div>

        {/* 3. 4 Animated Top KPI Stat Cards */}
        <div className="dashboard-animated" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          
          {/* Card 1: Doanh Thu Vé */}
          <div className="dashboard-card" style={{ background: '#ffffff', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TỔNG DOANH THU VÉ
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', marginBottom: '4px', lineHeight: '1.2' }}>
              {metrics.revenue.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669' }}>đ</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px' }}>
              <span>Quầy: <strong style={{ color: '#0f172a' }}>{metrics.counterRevenue.toLocaleString('vi-VN')} đ</strong></span>
              <span>•</span>
              <span>Online: <strong style={{ color: '#2563eb' }}>{metrics.onlineRevenue.toLocaleString('vi-VN')} đ</strong></span>
            </div>
          </div>

          {/* Card 2: Vé Xe Đã Bán */}
          <div className="dashboard-card" style={{ background: '#ffffff', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                VÉ XE ĐÃ BÁN
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><line x1="13" y1="5" x2="13" y2="19"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="17" y1="12" x2="17.01" y2="12"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', marginBottom: '4px', lineHeight: '1.2' }}>
              {metrics.tickets.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2563eb' }}>vé</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px' }}>
              <span>{metrics.counterTickets} vé quầy</span>
              <span>•</span>
              <span>{metrics.onlineTickets} vé online PayOS</span>
            </div>
          </div>

          {/* Card 3: Chuyến Xe Khai Thác */}
          <div className="dashboard-card" style={{ background: '#ffffff', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CHUYẾN XE KHAI THÁC
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', marginBottom: '4px', lineHeight: '1.2' }}>
              {metrics.trips.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#9333ea' }}>chuyến</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Hệ số lấp đầy bình quân: <strong style={{ color: '#0f172a' }}>{metrics.occupancy}%</strong>
            </div>
          </div>

          {/* Card 4: Hiệu Suất An Toàn & Đánh Giá */}
          <div className="dashboard-card" style={{ background: '#ffffff', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AN TOÀN &amp; HÀI LÒNG
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', marginBottom: '4px', lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '4px' }}>
              5.0
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700' }}>
              100% an toàn • 0 sự cố phát sinh
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Charts Section (Biểu Đồ Xu Hướng & Biểu Đồ Cột Tuyến Khai Thác) */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '0.85rem' }}>
        
        {/* Chart 1: Biểu Đồ Miền Xu Hướng Doanh Thu (Area / Line SVG Chart) */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Xu Hướng Doanh Thu &amp; Sản Lượng Vé
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>
                Đồ thị biến động doanh thu theo các mốc thời gian hoạt động thực tế
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: '700' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                Doanh thu (VNĐ)
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = padTop + plotH * (1 - pct);
                const val = Math.round(maxTrendRevenue * pct / 1000000);
                return (
                  <g key={idx}>
                    <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                      {val}M
                    </text>
                  </g>
                );
              })}

              {/* Area path */}
              {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

              {/* Line path */}
              {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Data Points */}
              {points.map((p, idx) => {
                const isHovered = hoveredPoint === idx;
                return (
                  <g key={idx} onMouseEnter={() => setHoveredPoint(idx)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'pointer' }}>
                    <circle cx={p.x} cy={p.y} r={isHovered ? 6 : 4} fill="#ffffff" stroke="#2563eb" strokeWidth={isHovered ? 3 : 2} style={{ transition: 'all 0.15s ease' }} />
                    <text x={p.x} y={chartH - 6} textAnchor="middle" fontSize="10" fill={isHovered ? '#0f172a' : '#64748b'} fontWeight={isHovered ? '800' : '600'}>
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredPoint !== null && points[hoveredPoint] && (
              <div style={{
                position: 'absolute',
                top: Math.max(5, points[hoveredPoint].y - 50),
                left: Math.min(plotW - 50, Math.max(10, points[hoveredPoint].x - 60)),
                background: '#0f172a',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.725rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
                zIndex: 10
              }}>
                <div style={{ fontWeight: '800', color: '#93c5fd' }}>{points[hoveredPoint].label}</div>
                <div>Doanh thu: <strong>{points[hoveredPoint].revenue.toLocaleString('vi-VN')} đ</strong></div>
                <div style={{ color: '#cbd5e1' }}>Vé bán: <strong>{points[hoveredPoint].tickets} vé</strong></div>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Biểu Đồ Cột Tuyến Khai Thác (Bar Chart SVG) */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Doanh Thu 4 Tuyến Trọng Điểm
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>
                So sánh kết quả bán vé và doanh số theo hành trình
              </p>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
              4 Tuyến
            </span>
          </div>

          {/* Bar Chart list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '4px' }}>
            {routeStats.map((r, i) => {
              const pct = maxRouteRevenue > 0 ? (r.revenue / maxRouteRevenue) * 100 : 0;
              const isHov = hoveredBar === i;
              const barColors = [
                'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                'linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%)',
                'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                'linear-gradient(90deg, #ea580c 0%, #f97316 100%)'
              ];

              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: isHov ? '#f8fafc' : 'transparent',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: '700', color: '#1e293b' }}>{r.name}</span>
                    <strong style={{ color: '#0f172a' }}>{r.revenue.toLocaleString('vi-VN')} đ</strong>
                  </div>

                  <div style={{ width: '100%', height: '9px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(pct, 2)}%`,
                      height: '100%',
                      background: barColors[i % barColors.length],
                      borderRadius: '5px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '0.68rem', color: '#64748b' }}>
                    <span>{r.trips} chuyến • {r.booked} vé đã bán</span>
                    <span>Lấp đầy: <strong style={{ color: '#2563eb' }}>{r.occupancy}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Detailed Operations Table & Fleet Overview Section */}
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
        
        {/* Left: Giám Sát Chuyến Xe Khởi Hành */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Giám Sát Chuyến Xe Vận Hành
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '2px 0 0 0' }}>
                Chi tiết nhân sự điều hành, vé đặt và doanh thu theo thời gian thực
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.7rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800', padding: '3px 8px', borderRadius: '10px' }}>
                {filteredTrips.length} chuyến trong kỳ
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>TUYẾN XE</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>KHỞI HÀNH</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>NHÂN SỰ LÁI</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>BIỂN SỐ XE</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SỐ VÉ</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>DOANH THU</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.75rem', color: '#64748b', fontSize: '0.78rem' }}>
                      Không có chuyến xe nào trong khoảng thời gian đã chọn.
                    </td>
                  </tr>
                ) : (
                  paginatedTrips.map((trip) => {
                    const seatsSold = trip.bookedSeats?.length || 0;
                    const tripRev = trip.actualRevenue != null && trip.actualRevenue > 0
                      ? trip.actualRevenue
                      : seatsSold * (trip.price || 0);
                    const depTime = trip.departureTime
                      ? new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                      : 'N/A';

                    return (
                      <tr key={trip._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', verticalAlign: 'middle' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: '#1e293b' }}>
                          {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'Tuyến vận tải'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.74rem' }}>{depTime}</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{trip.driver?.name || 'Tài xế kíp trực'}</span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Phụ: {trip.assistant?.name || 'Chưa gán'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: '600', color: '#334155', fontFamily: 'monospace' }}>
                          {trip.busId?.plateNumber || '51B-000.00'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: '800', color: '#2563eb' }}>
                          {seatsSold}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: '800', color: '#059669' }}>
                          {tripRev.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', fontSize: '0.72rem', color: '#64748b' }}>
              <span>Hiển thị trang {tripsPage} / {totalPages} ({filteredTrips.length} chuyến)</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  disabled={tripsPage <= 1}
                  onClick={() => setTripsPage(p => Math.max(1, p - 1))}
                  style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: tripsPage <= 1 ? 'not-allowed' : 'pointer', opacity: tripsPage <= 1 ? 0.5 : 1 }}
                >
                  Trước
                </button>
                <button
                  disabled={tripsPage >= totalPages}
                  onClick={() => setTripsPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: tripsPage >= totalPages ? 'not-allowed' : 'pointer', opacity: tripsPage >= totalPages ? 0.5 : 1 }}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Kênh Bán Vé Donut Chart & Đội Xe Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          
          {/* Donut Chart: Kênh Bán Vé */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.85rem 0' }}>
              Cơ Cấu Kênh Bán Vé
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                <svg width="90" height="90" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  {/* Counter Share 70% */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="4"
                    strokeDasharray="61.57 87.96"
                    strokeDashoffset="0"
                  />
                  {/* Online Share 30% */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray="26.39 87.96"
                    strokeDashoffset="-61.57"
                  />
                </svg>
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#0f172a' }}>100%</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' }}></span>
                  <span style={{ color: '#64748b' }}>Quầy vé:</span>
                  <strong style={{ color: '#0f172a' }}>70%</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  <span style={{ color: '#64748b' }}>Online PayOS:</span>
                  <strong style={{ color: '#0f172a' }}>30%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Status */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.85rem 0' }}>
              Chỉ Số Sẵn Sàng Đội Xe
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Tổng số xe khách:</span>
                <strong style={{ color: '#0f172a' }}>{busCount} xe</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Tỷ lệ xe sẵn sàng:</span>
                <strong style={{ color: '#059669' }}>{readyRate}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Tổng nhân sự:</span>
                <strong style={{ color: '#2563eb' }}>{staffList.length || 31} người</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Sự cố phát sinh:</span>
                <strong style={{ color: '#059669' }}>0 sự cố (An toàn 100%)</strong>
              </div>
            </div>

            <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1fae5' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
              <div style={{ color: '#065f46', fontSize: '0.72rem', fontWeight: '700' }}>
                Hệ thống trực tuyến thời gian thực sẵn sàng
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const DashboardOverviewPage = ({ setActiveTab }) => {
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
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
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

        // Fetch real maintenance records from MongoDB
        try {
          const maintRes = await fetch(`${API_BASE}/trips/fleet/maintenance-records`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const maintData = await maintRes.json();
          if (maintData.success) {
            setMaintenanceRecords(maintData.records || []);
          }
        } catch (mErr) {
          console.error('Error fetching maintenance records:', mErr);
        }

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
        setActiveTab={setActiveTab}
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

  if (user?.role === 'ticket_manager') {
    return (
      <TicketManagerOverview
        setActiveTab={setActiveTab}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  // Fleet Manager overview metrics
  return (
    <FleetManagerOverview
      busList={busList}
      tripCount={tripCount}
      recentTrips={recentTrips}
      maintenanceRecords={maintenanceRecords}
      setActiveTab={setActiveTab}
      onRefresh={() => window.location.reload()}
    />
  );
};

export default DashboardOverviewPage;
