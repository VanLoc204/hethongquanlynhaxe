import React, { useState, useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardOverviewPage from './pages/fleet/DashboardOverviewPage';
import FleetBusesPage from './pages/fleet/FleetBusesPage';
import FleetMaintenancePage from './pages/fleet/FleetMaintenancePage';
import FleetStatusPage from './pages/fleet/FleetStatusPage';
import FleetReportsPage from './pages/fleet/FleetReportsPage';
import FleetForecastPage from './pages/fleet/FleetForecastPage';

// Ops Pages
import OpsRoutesPage from './pages/ops/OpsRoutesPage';
import OpsTripsPage from './pages/ops/OpsTripsPage';
import OpsStaffPage from './pages/ops/OpsStaffPage';
import OpsFleetAccountsPage from './pages/ops/OpsFleetAccountsPage';
import OpsReportsPage from './pages/ops/OpsReportsPage';
import OpsTrackingPage from './pages/ops/OpsTrackingPage';

// GM Pages
import GmStaffPage from './pages/gm/GmStaffPage';
import GmPricingPage from './pages/gm/GmPricingPage';
import GmReportsPage from './pages/gm/GmReportsPage';
import GmTargetsPage from './pages/gm/GmTargetsPage';
import GmPromotionsPage from './pages/gm/GmPromotionsPage';
import GmAnalysisPage from './pages/gm/GmAnalysisPage';
import GmAttendancePage from './pages/gm/GmAttendancePage';

// Shared Employee Pages
import StaffSchedulePage from './pages/common/StaffSchedulePage';
import StaffLeavePage from './pages/common/StaffLeavePage';
import ManagerApprovalsPage from './pages/common/ManagerApprovalsPage';
import ManagerAttendancePage from './pages/common/ManagerAttendancePage';
import StaffSalaryPage from './pages/common/StaffSalaryPage';
import StaffNotificationsPage from './pages/common/StaffNotificationsPage';

// Ticket Agent Pages
import AgentAttendancePage from './pages/agent/AgentAttendancePage';
import AgentBookingPage from './pages/agent/AgentBookingPage';
import AgentTicketsPage from './pages/agent/AgentTicketsPage';
import AgentShiftSummaryPage from './pages/agent/AgentShiftSummaryPage';
import AgentTripsPage from './pages/agent/AgentTripsPage';
import AgentAIPage from './pages/agent/AgentAIPage';
import AgentDashboardPage from './pages/agent/AgentDashboardPage';

// Attendant Pages
import AttendantAttendancePage from './pages/attendant/AttendantAttendancePage';
import AttendantCheckinPage from './pages/attendant/AttendantCheckinPage';
import AttendantDashboardPage from './pages/attendant/AttendantDashboardPage';

// Driver Pages
import DriverDashboardPage from './pages/driver/DriverDashboardPage';
import DriverAttendancePage from './pages/driver/DriverAttendancePage';
import DriverStatusPage from './pages/driver/DriverStatusPage';
import DriverMapPage from './pages/driver/DriverMapPage';

// Admin Pages
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminErrorsPage from './pages/admin/AdminErrorsPage';

function DashboardLayout() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user?.role === 'ticket_agent') {
          return <AgentDashboardPage setActiveTab={setActiveTab} />;
        }
        if (user?.role === 'driver') {
          return <DriverDashboardPage setActiveTab={setActiveTab} />;
        }
        if (user?.role === 'attendant') {
          return <AttendantDashboardPage setActiveTab={setActiveTab} />;
        }
        return <DashboardOverviewPage setActiveTab={setActiveTab} />;
      case 'fleet-buses':
        return <FleetBusesPage />;
      case 'fleet-maintenance':
        return <FleetMaintenancePage />;
      case 'fleet-status':
        return <FleetStatusPage />;
      case 'fleet-reports':
        return <FleetReportsPage />;
      case 'fleet-forecast':
        return <FleetForecastPage />;

      // Ops views
      case 'ops-routes':
        return <OpsRoutesPage />;
      case 'ops-trips':
        return <OpsTripsPage />;
      case 'ops-staff':
        return <OpsStaffPage />;
      case 'ops-fleet-accounts':
        return <OpsFleetAccountsPage setActiveTab={setActiveTab} />;
      case 'ops-reports':
        return <OpsReportsPage />;
      case 'ops-tracking':
        return <OpsTrackingPage />;
      case 'manager-approvals':
        return <ManagerApprovalsPage />;
      case 'manager-attendance':
        return <ManagerAttendancePage />;

      // GM views
      case 'gm-reports':
        return <GmReportsPage />;
      case 'gm-attendance':
        return <GmAttendancePage />;
      case 'gm-staff':
        return <GmStaffPage />;
      case 'gm-pricing':
        return <GmPricingPage />;
      case 'gm-targets':
        return <GmTargetsPage />;
      case 'gm-promotions':
        return <GmPromotionsPage />;
      case 'gm-analysis':
        return <GmAnalysisPage />;

      // Admin views
      case 'admin-users':
        return <AdminUsersPage />;
      case 'admin-logs':
        return <AdminLogsPage />;
      case 'admin-errors':
        return <AdminErrorsPage />;

      // Shared Employee views
      case 'staff-schedule':
        return <StaffSchedulePage setActiveTab={setActiveTab} />;
      case 'staff-leave':
        return <StaffLeavePage />;
      case 'staff-salary':
        return <StaffSalaryPage />;
      case 'staff-notifications':
        return <StaffNotificationsPage />;

      // Ticket Agent views
      case 'agent-attendance':
        return <AgentAttendancePage />;
      case 'counter-booking':
      case 'agent-booking':
        return <AgentBookingPage />;
      case 'agent-tickets':
        return <AgentTicketsPage />;
      case 'agent-shift':
        return <AgentShiftSummaryPage />;
      case 'agent-trips':
        return <AgentTripsPage setActiveTab={setActiveTab} />;
      case 'agent-ai':
        return <AgentAIPage />;

      // Attendant views
      case 'attendant-attendance':
        return <AttendantAttendancePage />;
      case 'attendant-checkin':
        return <AttendantCheckinPage />;

      // Driver views
      case 'driver-attendance':
        return <DriverAttendancePage setActiveTab={setActiveTab} />;
      case 'driver-status':
        return <DriverStatusPage setActiveTab={setActiveTab} />;
      case 'driver-map':
        return <DriverMapPage setActiveTab={setActiveTab} />;


      default:
        // Generic fallback placeholder for other role views under development
        return (
          <section className="panel" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: '10px' }}>Chức năng đang phát triển</h2>
              <p style={{ color: 'var(--text-muted)' }}>Mã chức năng: <code>{activeTab}</code></p>
            </div>
          </section>
        );
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'admin-users':
        return 'Quản lý tài khoản người dùng';
      case 'admin-logs':
        return 'Giám sát nhật ký (logs)';
      case 'admin-errors':
        return 'Giám sát lỗi hệ thống';
      case 'fleet-buses':
        return 'Quản lý phương tiện';
      case 'fleet-maintenance':
        return 'Quản lý bảo trì';
      case 'fleet-status':
        return 'Cập nhật tình trạng xe';
      case 'fleet-reports':
        return 'Tạo báo cáo đội xe';
      case 'fleet-forecast':
        return 'Xem dự báo bảo trì';

      // Ops views
      case 'ops-routes':
        return 'Quản lý tuyến đường';
      case 'ops-trips':
        return 'Quản lý chuyến xe';
      case 'ops-staff':
        return 'Quản lý nhân sự chuyến';
      case 'ops-fleet-accounts':
        return 'Quản lý tài khoản đội xe (Tài xế & Phụ xe)';
      case 'ops-reports':
        return 'Xem báo cáo';
      case 'ops-tracking':
        return 'Định vị giám sát lộ trình';
      case 'manager-approvals':
        return 'Xem danh sách chờ duyệt';
      case 'manager-attendance':
        return user?.role === 'ops_manager' ? 'Quản lý chấm công tổ lái' : 'Quản lý chấm công nhân sự';

      // GM views
      case 'gm-reports':
        return 'Báo cáo doanh thu & vận hành';
      case 'gm-staff':
        return 'Quản lý nhân viên';
      case 'gm-pricing':
        return 'Quản lý giá vé';
      case 'gm-promotions':
        return 'Quản lý khuyến mãi';
      case 'gm-analysis':
        return 'Xem phân tích nhu cầu';

      // Shared Employee views
      case 'staff-schedule':
        return 'Lịch làm việc phân công';
      case 'staff-leave':
        return 'Đơn xin nghỉ phép';
      case 'staff-salary':
        return 'Xem bảng lương chi tiết';
      case 'staff-notifications':
        return 'Thông báo nội bộ';

      // Ticket Agent views
      case 'agent-attendance':
        return 'Chấm công ca trực quầy';
      case 'agent-booking':
        return 'Đặt vé xe tại quầy';
      case 'agent-tickets':
        return 'Tra cứu & Quản lý vé';
      case 'agent-shift':
        return 'Tổng kết ca làm việc';
      case 'agent-trips':
        return 'Tra cứu bảng giờ xe chạy';
      case 'agent-ai':
        return 'Trợ lý tư vấn dịch vụ AI';

      // Attendant views
      case 'attendant-attendance':
        return 'Chấm công số (Phụ xe)';
      case 'attendant-checkin':
        return 'Soát vé & Check-in hành khách';

      // Driver views
      case 'driver-attendance':
        return 'Chấm công số (Tài xế)';
      case 'driver-status':
        return 'Cập nhật lộ trình xe chạy';
      case 'driver-map':
        return 'Bản đồ di chuyển GPS';

      default:
        return 'Chức năng đang phát triển';
    }
  };

  const ROLE_LABEL = {
    fleet_manager: 'Quản lý Đội xe',
    ops_manager: 'Quản lý Vận tải',
    general_manager: 'Ban Giám đốc',
    admin: 'Quản trị viên',
    ticket_agent: 'Nhân viên bán vé',
    driver: 'Nhân viên Tài xế',
    attendant: 'Nhân viên Phụ xe',
  };

  return (
    <div className="dashboard-wrapper">
      {/* 1. Sidebar Full Chiều Cao Bên Trái */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
      />

      {/* Backdrop khi mở sidebar trên màn hình nhỏ */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Khung Nội Dung Chính Bên Phải (Top Header + Main Content) */}
      <div className="dashboard-main-area">
        {/* Top Header - Chỉ chứa Breadcrumb & Profile (Không trùng logo An Bình Lines) */}
        <header className="top-header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Nút 3 gạch mở Menu cho Mobile & Tablet (Tài xế & Phụ xe thao tác trên điện thoại) */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle-btn"
              title="Đóng / Mở Menu"
              aria-label="Toggle Navigation Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Breadcrumb Navigation - Tự co gọn trên mobile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span className="breadcrumb-prefix">Hệ thống</span>
              <span className="breadcrumb-prefix" style={{ color: '#cbd5e1' }}>&gt;</span>
              <span className="breadcrumb-prefix">{user?.role === 'ticket_agent' ? 'Nhân sự quầy vé' : ROLE_LABEL[user?.role] || 'Quản trị'}</span>
              <span className="breadcrumb-prefix" style={{ color: '#cbd5e1' }}>&gt;</span>
              <strong style={{ color: '#2563eb', fontWeight: '700' }}>{getHeaderTitle()}</strong>
            </div>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Bell Icon với chấm đỏ/xanh thông báo */}
            <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative', padding: '4px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', border: '1.5px solid #ffffff' }}></span>
            </button>
            <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </button>

            {/* Profile Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="header-user-text" style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  {ROLE_LABEL[user?.role] || user?.role}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {user?.email || 'admin@anbinhlines.vn'}
                </div>
              </div>
              <div className="user-profile">
                <span className="avatar" style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontWeight: '800',
                  fontSize: '0.8rem',
                  border: '1px solid #bfdbfe',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user?.role === 'driver' ? 'TX' : user?.role === 'attendant' ? 'PX' : 'AB'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content: Khi vào bản đồ GPS tài xế, tự động tràn viền 100% không đệm viền */}
        <main className={`main-content ${activeTab === 'driver-map' ? 'main-content-map-full' : ''}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function MainApp() {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <DashboardLayout />;
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
