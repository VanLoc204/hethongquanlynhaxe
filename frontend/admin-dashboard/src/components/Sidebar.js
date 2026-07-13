import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ROLE_LABEL = {
  fleet_manager: 'Quản lý Đội xe',
  ops_manager: 'Quản lý Vận tải',
  general_manager: 'Giám đốc',
  admin: 'Quản trị viên',
  ticket_agent: 'Nhân viên bán vé',
};

const Sidebar = ({ activeTab, onTabChange }) => {
  const { user, logout } = useContext(AuthContext);

  const getNavItems = () => {
    switch (user?.role) {
      case 'fleet_manager':
        return [
          { key: 'dashboard', label: 'Tổng quan' },
          { key: 'fleet-buses', label: 'Quản lý phương tiện' },
          { key: 'fleet-maintenance', label: 'Quản lý bảo trì' },
          { key: 'fleet-status', label: 'Cập nhật tình trạng xe' },
          { key: 'fleet-inventory', label: 'Quản lý kho và phụ tùng' },
          { key: 'fleet-forecast', label: 'Xem dự báo bảo trì' },
        ];
      case 'ops_manager':
        return [
          { key: 'dashboard', label: 'Tổng quan' },
          { key: 'ops-routes', label: 'Quản lý tuyến đường' },
          { key: 'ops-trips', label: 'Quản lý chuyến xe' },
          { key: 'ops-staff', label: 'Quản lý nhân sự chuyến' },
          { key: 'ops-reports', label: 'Xem báo cáo' },
          { key: 'ops-tracking', label: 'Định vị giám sát lộ trình' },
        ];
      case 'general_manager':
        return [
          { key: 'dashboard', label: 'Tổng quan' },
          { key: 'gm-reports', label: 'Xem báo cáo' },
          { key: 'gm-staff', label: 'Quản lý nhân viên' },
          { key: 'gm-targets', label: 'Hoạch định chỉ tiêu vận hành' },
          { key: 'gm-dashboard', label: 'Xem Dashboard' },
          { key: 'gm-pricing', label: 'Quản lý giá vé' },
          { key: 'gm-dynamic-pricing', label: 'Xem gợi ý giá vé' },
          { key: 'gm-promotions', label: 'Quản lý khuyến mãi' },
          { key: 'gm-analysis', label: 'Xem phân tích nhu cầu' },
        ];
      case 'ticket_agent':
        return [
          { key: 'dashboard', label: 'Tổng quan' },
          { key: 'agent-attendance', label: 'Chấm công' },
          { key: 'agent-booking', label: 'Đặt vé' },
          { key: 'agent-tickets', label: 'Quản lý vé' },
          { key: 'agent-shift', label: 'Tổng kết ca làm việc' },
          { key: 'agent-trips', label: 'Tra cứu chuyến xe' },
          { key: 'agent-ai', label: 'Tra hỏi tư vấn AI' },
        ];
      case 'admin':
        return [
          { key: 'dashboard', label: 'Tổng quan' },
          { key: 'admin-users', label: 'Quản lý tài khoản người dùng' },
          { key: 'admin-logs', label: 'Giám sát nhật ký (logs)' },
          { key: 'admin-errors', label: 'Giám sát lỗi hệ thống' },
        ];
      default:
        return [
          { key: 'dashboard', label: 'Tổng quan' },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="sidebar">

      <nav className="nav-menu">
        {navItems.map(item => (
          <a
            key={item.key}
            href={`#${item.key}`}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onTabChange(item.key); }}
          >
            {item.label}
          </a>
        ))}

        <button
          onClick={logout}
          className="btn nav-logout-btn nav-item"
          style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', marginTop: 'auto' }}
        >
          Đăng xuất
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
