import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ activeTab, onTabChange, isOpen }) => {
  const { user, logout } = useContext(AuthContext);

  const getNavItems = () => {
    switch (user?.role) {
      case 'fleet_manager':
        return [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'fleet-buses', label: 'Quản lý phương tiện' },
          { key: 'fleet-status', label: 'Cập nhật tình trạng xe' },
          { key: 'fleet-maintenance', label: 'Quản lý bảo trì' },
          { key: 'fleet-forecast', label: 'Xem dự báo bảo trì' },
          { key: 'manager-approvals', label: 'Xem danh sách chờ duyệt' },
          { key: 'fleet-reports', label: 'Tạo báo cáo' },
          { key: 'staff-schedule', label: 'Lịch làm việc' },
          { key: 'staff-leave', label: 'Đơn xin nghỉ' },
          { key: 'staff-salary', label: 'Xem bảng lương' },
          { key: 'staff-notifications', label: 'Thông báo & Tin tức' },
        ];
      case 'ops_manager':
        return [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'ops-routes', label: 'Quản lý tuyến đường' },
          { key: 'ops-trips', label: 'Quản lý chuyến xe' },
          { key: 'ops-staff', label: 'Quản lý nhân sự chuyến' },
          { key: 'ops-reports', label: 'Xem báo cáo' },
          { key: 'ops-tracking', label: 'Định vị giám sát lộ trình' },
          { key: 'staff-schedule', label: 'Lịch làm việc' },
          { key: 'staff-leave', label: 'Đơn xin nghỉ' },
          { key: 'staff-salary', label: 'Xem bảng lương' },
          { key: 'staff-notifications', label: 'Thông báo & Tin tức' },
        ];
      case 'general_manager':
        return [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'gm-reports', label: 'Xem báo cáo' },
          { key: 'gm-staff', label: 'Quản lý nhân viên' },
          { key: 'fleet-buses', label: 'Xem thông tin xe' },
          { key: 'manager-approvals', label: 'Phê duyệt' },
          { key: 'manager-attendance', label: 'Quản lý chấm công' },
          { key: 'gm-targets', label: 'Hoạch định chỉ tiêu vận hành' },
          { key: 'gm-pricing', label: 'Quản lý giá vé' },
          { key: 'gm-promotions', label: 'Quản lý khuyến mãi' },
          { key: 'gm-analysis', label: 'Xem phân tích nhu cầu' },
        ];
      case 'ticket_agent':
        return [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'agent-attendance', label: 'Chấm công ca' },
          { key: 'agent-booking', label: 'Đặt vé tại quầy' },
          { key: 'agent-tickets', label: 'Quản lý vé' },
          { key: 'agent-shift', label: 'Tổng kết ca làm việc' },
          { key: 'staff-schedule', label: 'Lịch làm việc' },
          { key: 'staff-leave', label: 'Đơn xin nghỉ' },
          { key: 'staff-salary', label: 'Xem bảng lương' },
          { key: 'staff-notifications', label: 'Thông báo & Tin tức' },
          { key: 'agent-trips', label: 'Tra cứu chuyến xe' },
          { key: 'agent-ai', label: 'Trợ lý tư vấn AI' },
        ];
      case 'driver':
        return [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'driver-attendance', label: 'Chấm công số' },
          { key: 'staff-schedule', label: 'Lịch chạy xe' },
          { key: 'driver-status', label: 'Cập nhật hành trình' },
          { key: 'driver-map', label: 'Bản đồ di chuyển' },
          { key: 'staff-leave', label: 'Đơn xin nghỉ' },
          { key: 'staff-salary', label: 'Xem bảng lương' },
          { key: 'staff-notifications', label: 'Thông báo & Tin tức' },
        ];
      case 'attendant':
        return [
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'attendant-attendance', label: 'Chấm công số' },
          { key: 'staff-schedule', label: 'Lịch chạy xe' },
          { key: 'attendant-checkin', label: 'Soát vé & Check-in' },
          { key: 'attendant-luggage', label: 'Thẻ hành lý ký gửi' },
          { key: 'staff-leave', label: 'Đơn xin nghỉ' },
          { key: 'staff-salary', label: 'Xem bảng lương' },
          { key: 'staff-notifications', label: 'Thông báo & Tin tức' },
        ];
      case 'admin':
        return [
          { 
            key: 'dashboard', 
            label: 'Dashboard', 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> 
          },
          { 
            key: 'admin-users', 
            label: 'Quản lý tài khoản người dùng', 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> 
          },
          { 
            key: 'admin-logs', 
            label: 'Giám sát nhật ký (logs)', 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> 
          },
          { 
            key: 'admin-errors', 
            label: 'Giám sát lỗi hệ thống', 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> 
          },
        ];
      default:
        return [
          { key: 'dashboard', label: 'Dashboard' },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Sidebar Header Branding */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#2563eb',
          color: '#ffffff', fontWeight: '900', fontSize: '1.1rem', display: 'flex',
          alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
        }}>
          AB
        </div>
        <div>
          <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '1rem', letterSpacing: '0.5px' }}>AN BÌNH LINES</div>
          <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: '500' }}>Hệ Thống Quản Trị Vận Tải</div>
        </div>
      </div>

      <nav className="nav-menu" style={{ paddingTop: '1rem' }}>
        {navItems.map(item => (
          <a
            key={item.key}
            href={`#${item.key}`}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onTabChange(item.key); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </a>
        ))}

        <button
          onClick={logout}
          className="btn nav-logout-btn nav-item"
          style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Đăng xuất</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
