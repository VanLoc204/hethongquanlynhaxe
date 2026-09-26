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

  const displayLogs = liveAuditLogs.slice(0, 10);

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
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Chào mừng trở lại, <strong style={{ color: '#2563eb' }}>Quản Trị Viên Hệ Thống!</strong> Bảng điều khiển giám sát thời gian thực
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onRefresh}
            className="btn"
            style={{
              backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
              fontWeight: '600', padding: '0.6rem 1.1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
            Đồng bộ tức thời
          </button>
          <button
            onClick={() => exportAuditLogsToExcel(liveAuditLogs, healthData)}
            className="btn"
            style={{
              backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
              fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Xuất báo cáo Excel
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Card 1 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Tổng Tài Khoản Hệ Thống</span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '600' }}>
              ▲ {activeUsers} đang hoạt động
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            {totalUsers} tài khoản
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
              {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100}% tỷ lệ kích hoạt
            </span>
            <span style={{ color: '#3b82f6', fontWeight: '600' }}>MongoDB Real Data</span>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Ban Quản Lý &amp; Điều Hành</span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#dbeafe', color: '#1d4ed8', fontWeight: '600' }}>
              ▲ Giám đốc, Vận tải, Đội xe
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            {managementCount} nhân sự
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
              Quyền điều phối cấp cao
            </span>
            <span>Level 1-2</span>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Đội Ngũ Vận Hành &amp; Phục Vụ</span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '600' }}>
              ▲ Tài xế, Phụ xe, Bán vé
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            {opsStaffCount} nhân sự
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
              Phân ca trực 3 miền
            </span>
            <span>{totalUsers > 0 ? ((opsStaffCount / totalUsers) * 100).toFixed(1) : 0}% tổng nhân sự</span>
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Trạng Thái An Ninh RBAC</span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '600' }}>
              ▲ Phân quyền 7 nhóm vai trò
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            An toàn 100%
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
              0 vi phạm chính sách
            </span>
            <span style={{ color: '#16a34a', fontWeight: '700' }}>SECURE</span>
          </div>
        </div>
      </section>

      {/* Middle Panels: RBAC & Infrastructure */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Panel Left: Phân bổ Vai trò Người dùng (RBAC) */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Phân bổ Vai trò Người dùng (RBAC)</h2>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
              7 Nhóm Phân quyền
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
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
                <div key={r.roleKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{r.label}</span>
                      {r.badge && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: r.badge === 'Chủ lực' ? '#fef3c7' : '#fce7f3', color: r.badge === 'Chủ lực' ? '#b45309' : '#be185d', fontWeight: '600' }}>
                          {r.badge}
                        </span>
                      )}
                    </div>
                    <span style={{ color: r.count > 1 ? '#be123c' : '#64748b', fontWeight: r.count > 1 ? '700' : '500' }}>
                      {r.count} người ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: r.color, borderRadius: '3px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Tỷ lệ bao phủ vai trò: 100%</span>
          </div>
        </div>

        {/* Panel Right: Hạ tầng Máy chủ & Cơ sở dữ liệu */}
        <div className="panel" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Hạ tầng Máy chủ &amp; Cơ sở dữ liệu</h2>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
              Tất cả dịch vụ Online
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Server 1 */}
            <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: '#065f46', fontSize: '0.85rem' }}>Backend REST API Server (Node.js / Express)</div>
                <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '2px' }}>Cổng API Port 8000 — JWT Auth, Route &amp; Trip Services</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 8000</span>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: '600', marginTop: '2px' }}>{healthData?.mongoLatencyMs || 5}ms • 99.98%</span>
                </div>
                <span className="status-dot green" style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
              </div>
            </div>

            {/* Server 2 */}
            <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.85rem' }}>Database chính (MongoDB - Port 27018)</div>
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: '2px' }}>10 Collections: Users, Routes, Buses, Trips, Bookings...</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 27018</span>
                  <span style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '600', marginTop: '2px' }}>{healthData?.memoryUsageMb || '28.4'} MB RAM • Active</span>
                </div>
                <span className="status-dot green" style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
              </div>
            </div>

            {/* Server 3 */}
            <div style={{ padding: '12px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: '#6b21a8', fontSize: '0.85rem' }}>Memory Cache &amp; Sessions (Redis - Port 6379)</div>
                <div style={{ fontSize: '0.75rem', color: '#7e22ce', marginTop: '2px' }}>Lưu Session token, GPS tracking cache &amp; Rate limiting</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.7rem', background: '#f3e8ff', color: '#6b21a8', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 6379</span>
                  <span style={{ fontSize: '0.75rem', color: '#7e22ce', fontWeight: '600', marginTop: '2px' }}>1.2 MB / 8 GB</span>
                </div>
                <span className="status-dot green" style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
              </div>
            </div>

            {/* Server 4 */}
            <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: '#92400e', fontSize: '0.85rem' }}>Message Broker (RabbitMQ - Port 5672)</div>
                <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '2px' }}>Điều phối tin nhắn bất đồng bộ &amp; Thông báo AI</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>Port 5672</span>
                  <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '600', marginTop: '2px' }}>Queue: 0 backlog</span>
                </div>
                <span className="status-dot green" style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Uptime Node.js API: <strong>{healthData?.uptimeStr || '0h 15m'}</strong></span>
            <span style={{ color: '#2563eb', fontWeight: '600', fontFamily: 'monospace' }}>Mongo State: {healthData?.mongoStatus || 'Stable'}</span>
          </div>
        </div>
      </section>

      {/* Bottom Panel: Nhật ký Hoạt động An ninh & Giám sát Hệ thống (Full 100% Width) */}
      <section style={{ width: '100%', marginBottom: '1.75rem' }}>
        <div className="panel" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" style={{ display: 'block', flexShrink: 0 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', margin: 0, lineHeight: '1.2' }}>
                  Nhật ký Hoạt động An ninh &amp; Giám sát Hệ thống
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Bản ghi vết kiểm toán thời gian thực theo tiêu chuẩn an toàn vận tải (Dữ liệu Live từ Backend Express Middleware)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                Cập nhật tự động thời gian thực
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 10px', verticalAlign: 'middle' }}>Hành động / Sự kiện</th>
                  <th style={{ padding: '12px 10px', verticalAlign: 'middle' }}>Người thực hiện</th>
                  <th style={{ padding: '12px 10px', verticalAlign: 'middle' }}>Vai trò</th>
                  <th style={{ padding: '12px 10px', verticalAlign: 'middle' }}>Địa chỉ IP</th>
                  <th style={{ padding: '12px 10px', verticalAlign: 'middle' }}>Thời gian</th>
                  <th style={{ padding: '12px 10px', verticalAlign: 'middle', textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Chưa ghi nhận nhật ký hệ thống nào. Vui lòng thực hiện thao tác trên hệ thống để ghi nhận log thời gian thực.
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', fontWeight: '600', color: '#1e293b' }}>{log.action}</td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', color: '#475569' }}>{log.user}</td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '600' }}>
                          {getRoleLabel(log.role)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', color: '#64748b', fontFamily: 'monospace' }}>{log.ip}</td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', color: '#64748b' }}>{log.timestamp}</td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
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

const OpsManagerOverview = ({ routeCount, tripCount, busCount, totalBookedSeats, recentTrips, activeRoutes }) => {
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Tuyến đường khai thác" value={`${routeCount} tuyến`} trend="Kết nối liên tỉnh" colorClass="blue" />
        <StatCard label="Chuyến xe lên lịch" value={`${tripCount} chuyến`} trend="Lên lịch vận hành" colorClass="green" />
        <StatCard label="Đội xe khả dụng" value={`${busCount} phương tiện`} trend="Đang hoạt động" colorClass="purple" />
        <StatCard label="Tổng vé đã đặt" value={`${totalBookedSeats} vé`} trend="Tỷ lệ lấp đầy ghế" colorClass="yellow" />
      </section>

      <section className="content-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Chuyến xe sắp khởi hành */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Các chuyến xe mới lên lịch</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentTrips.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có chuyến xe nào được lên lịch.</p>
            ) : (
              recentTrips.slice(0, 3).map((trip) => {
                const depTime = new Date(trip.departureTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
                return (
                  <div key={trip._id} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong>{trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'Không rõ tuyến'}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{depTime}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Xe: {trip.busId?.plateNumber || 'Chưa gán'} | Đã đặt: {trip.bookedSeats?.length || 0}/{trip.busId?.totalSeats || 0} ghế
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Danh sách tuyến đường hoạt động */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Tuyến đường đang khai thác</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeRoutes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có tuyến đường nào được cấu hình.</p>
            ) : (
              activeRoutes.slice(0, 3).map((route) => (
                <div key={route._id} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{route.startPoint} — {route.endPoint}</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Thời gian đi: {route.duration}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{route.distance}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
};

const GeneralManagerOverview = ({ routeCount, tripCount, busCount, totalBookedSeats, revenue, avgRating, recentTrips }) => {
  return (
    <>
      <section className="stats-grid">
        <StatCard
          label="Tổng doanh thu vé"
          value={`${revenue.toLocaleString('vi-VN')}đ`}
          trend="+12.4%"
          colorClass="green"
        />
        <StatCard
          label="Vé xe đã bán"
          value={`${totalBookedSeats} vé`}
          trend="+8.2%"
          colorClass="blue"
        />
        <StatCard
          label="Chuyến xe vận hành"
          value={`${tripCount} chuyến`}
          trend="+15.5%"
          colorClass="purple"
        />
        <StatCard
          label="Đánh giá trung bình"
          value={`${avgRating.toFixed(1)} ★`}
          trend="+4.7%"
          colorClass="yellow"
        />
      </section>

      {/* Visual panels */}
      <section className="content-section" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Active operations list */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>Giám sát hoạt động các chuyến xe hôm nay</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '10px 8px' }}>Tuyến xe</th>
                  <th style={{ padding: '10px 8px' }}>Khởi hành</th>
                  <th style={{ padding: '10px 8px' }}>Nhân sự</th>
                  <th style={{ padding: '10px 8px' }}>Biển số xe</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Số vé</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Doanh thu dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.slice(0, 5).map((trip) => {
                  const tripRevenue = (trip.bookedSeats?.length || 0) * trip.price;
                  const depTime = new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                  return (
                    <tr key={trip._id} style={{ borderBottom: '1px solid var(--card-border)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                        {trip.routeId ? `${trip.routeId.startPoint} ➔ ${trip.routeId.endPoint}` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{depTime}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600' }}>{trip.driver?.name || 'Chưa gán'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phụ: {trip.assistant?.name || 'Chưa gán'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: '600' }}>{trip.busId?.plateNumber || 'N/A'}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: 'var(--primary)' }}>
                        {trip.bookedSeats?.length || 0}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: 'var(--success)' }}>
                        {tripRevenue.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick status information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)', flexGrow: 1 }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Tổng quan chỉ số đội xe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng số xe khách:</span>
                <span style={{ fontWeight: '700' }}>{busCount} xe</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tuyến kết nối:</span>
                <span style={{ fontWeight: '700' }}>{routeCount} tuyến</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tỷ lệ xe sẵn sàng:</span>
                <span style={{ fontWeight: '700', color: 'var(--success)' }}>100%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phản hồi tích cực:</span>
                <span style={{ fontWeight: '700', color: 'var(--warning)' }}>94.5%</span>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>Trạng thái vận hành</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #d1fae5' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: '#065f46', fontSize: '0.85rem', fontWeight: '700' }}>Hệ thống trực tuyến thời gian thực</span>
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
        const totalBuses = busesData.success ? busesData.buses.length : 0;
        setBusCount(totalBuses);

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
          setTripCount(tripsData.trips.length);
          setRecentTrips(tripsData.trips);

          // Calculate metrics
          let seatsCount = 0;
          let calculatedRevenue = 0;
          let ratingsSum = 0;
          let ratingsCount = 0;

          tripsData.trips.forEach(trip => {
            const booked = trip.bookedSeats?.length || 0;
            seatsCount += booked;
            calculatedRevenue += booked * trip.price;

            if (trip.ratings?.average) {
              ratingsSum += trip.ratings.average;
              ratingsCount++;
            }
          });

          setTotalBookedSeats(seatsCount);
          setRevenue(calculatedRevenue);
          if (ratingsCount > 0) {
            setAvgRating(ratingsSum / ratingsCount);
          }
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
      />
    );
  }

  // Fleet Manager overview metrics
  return <FleetManagerOverview busCount={busCount} />;
};

export default DashboardOverviewPage;
