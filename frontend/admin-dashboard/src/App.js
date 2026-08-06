import React, { useState, useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardOverviewPage from './pages/fleet/DashboardOverviewPage';
import FleetBusesPage from './pages/fleet/FleetBusesPage';
import FleetMaintenancePage from './pages/fleet/FleetMaintenancePage';
import FleetStatusPage from './pages/fleet/FleetStatusPage';
import FleetInventoryPage from './pages/fleet/FleetInventoryPage';
import FleetForecastPage from './pages/fleet/FleetForecastPage';

// Ops Pages
import OpsRoutesPage from './pages/ops/OpsRoutesPage';
import OpsTripsPage from './pages/ops/OpsTripsPage';
import OpsStaffPage from './pages/ops/OpsStaffPage';
import OpsReportsPage from './pages/ops/OpsReportsPage';
import OpsTrackingPage from './pages/ops/OpsTrackingPage';

// GM Pages
import GmStaffPage from './pages/gm/GmStaffPage';
import GmPricingPage from './pages/gm/GmPricingPage';

// Shared Employee Pages
import StaffSchedulePage from './pages/common/StaffSchedulePage';
import StaffLeavePage from './pages/common/StaffLeavePage';
import StaffSalaryPage from './pages/common/StaffSalaryPage';
import StaffNotificationsPage from './pages/common/StaffNotificationsPage';

// Ticket Agent Pages
import AgentAttendancePage from './pages/agent/AgentAttendancePage';
import AgentBookingPage from './pages/agent/AgentBookingPage';
import AgentTicketsPage from './pages/agent/AgentTicketsPage';
import AgentShiftSummaryPage from './pages/agent/AgentShiftSummaryPage';
import AgentTripsPage from './pages/agent/AgentTripsPage';
import AgentAIPage from './pages/agent/AgentAIPage';

// Attendant Pages
import AttendantAttendancePage from './pages/attendant/AttendantAttendancePage';
import AttendantCheckinPage from './pages/attendant/AttendantCheckinPage';
import AttendantLuggagePage from './pages/attendant/AttendantLuggagePage';

function DashboardLayout() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverviewPage />;
      case 'fleet-buses':
        return <FleetBusesPage />;
      case 'fleet-maintenance':
        return <FleetMaintenancePage />;
      case 'fleet-status':
        return <FleetStatusPage />;
      case 'fleet-inventory':
        return <FleetInventoryPage />;
      case 'fleet-forecast':
        return <FleetForecastPage />;
      
      // Ops views
      case 'ops-routes':
        return <OpsRoutesPage />;
      case 'ops-trips':
        return <OpsTripsPage />;
      case 'ops-staff':
        return <OpsStaffPage />;
      case 'ops-reports':
        return <OpsReportsPage />;
      case 'ops-tracking':
        return <OpsTrackingPage />;
      
      // GM views
      case 'gm-staff':
        return <GmStaffPage />;
      case 'gm-pricing':
        return <GmPricingPage />;

      // Shared Employee views
      case 'staff-schedule':
        return <StaffSchedulePage />;
      case 'staff-leave':
        return <StaffLeavePage />;
      case 'staff-salary':
        return <StaffSalaryPage />;
      case 'staff-notifications':
        return <StaffNotificationsPage />;

      // Ticket Agent views
      case 'agent-attendance':
        return <AgentAttendancePage />;
      case 'agent-booking':
        return <AgentBookingPage />;
      case 'agent-tickets':
        return <AgentTicketsPage />;
      case 'agent-shift':
        return <AgentShiftSummaryPage />;
      case 'agent-trips':
        return <AgentTripsPage />;
      case 'agent-ai':
        return <AgentAIPage />;

      // Attendant views
      case 'attendant-attendance':
        return <AttendantAttendancePage />;
      case 'attendant-checkin':
        return <AttendantCheckinPage />;
      case 'attendant-luggage':
        return <AttendantLuggagePage />;


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
        return 'Dashboard Tổng quan';
      case 'fleet-buses':
        return 'Quản lý phương tiện';
      case 'fleet-maintenance':
        return 'Quản lý bảo trì';
      case 'fleet-status':
        return 'Cập nhật tình trạng xe';
      case 'fleet-inventory':
        return 'Quản lý kho và phụ tùng';
      case 'fleet-forecast':
        return 'Xem dự báo bảo trì';
      
      // Ops views
      case 'ops-routes':
        return 'Quản lý tuyến đường';
      case 'ops-trips':
        return 'Quản lý chuyến xe';
      case 'ops-staff':
        return 'Quản lý nhân sự chuyến';
      case 'ops-reports':
        return 'Xem báo cáo';
      case 'ops-tracking':
        return 'Định vị giám sát lộ trình';

      // GM views
      case 'gm-staff':
        return 'Quản lý nhân viên';
      case 'gm-pricing':
        return 'Quản lý giá vé';

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
      case 'attendant-luggage':
        return 'Ghi nhận thẻ hành lý ký gửi';

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
      {/* Top Header */}
      <header className="top-header">
        <div className="logo-block">
          <span className="logo-concept">Á ĐÔNG TRAVEL</span>
        </div>
        <div className="header-right">
          <div className="role-indicator-header" style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
            {ROLE_LABEL[user?.role] || user?.role}
          </div>
          <div className="user-profile">
            <span className="avatar">AD</span>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="main-content">
          <div className="content-header">
            <h1>{getHeaderTitle()}</h1>
            <p className="subtitle">
              Chào mừng trở lại, {user?.name}! Hệ thống vận hành Á Đông Travel
            </p>
          </div>
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
