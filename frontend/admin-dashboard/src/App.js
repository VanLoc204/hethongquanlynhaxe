import React, { useState, useContext, useEffect } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardOverviewPage from './pages/fleet/DashboardOverviewPage';
import FleetBusesPage from './pages/fleet/FleetBusesPage';
import FleetMaintenancePage from './pages/fleet/FleetMaintenancePage';
import FleetStatusPage from './pages/fleet/FleetStatusPage';
import FleetForecastPage from './pages/fleet/FleetForecastPage';
import FleetMonthlyExpenseReportPage from './pages/fleet/FleetMonthlyExpenseReportPage';

// Ops Pages
import OpsRoutesPage from './pages/ops/OpsRoutesPage';
import OpsTripsPage from './pages/ops/OpsTripsPage';
import OpsStaffPage from './pages/ops/OpsStaffPage';
import OpsFleetAccountsPage from './pages/ops/OpsFleetAccountsPage';
import OpsReportsPage from './pages/ops/OpsReportsPage';
import OpsTrackingPage from './pages/ops/OpsTrackingPage';
import OpsIncidentsPage from './pages/ops/OpsIncidentsPage';
import OpsTripReportsPage from './pages/ops/OpsTripReportsPage';

// GM Pages
import GmStaffPage from './pages/gm/GmStaffPage';
import GmPricingPage from './pages/gm/GmPricingPage';
import GmReportsPage from './pages/gm/GmReportsPage';
import GmTargetsPage from './pages/gm/GmTargetsPage';
import GmPromotionsPage from './pages/gm/GmPromotionsPage';
import GmAnalysisPage from './pages/gm/GmAnalysisPage';
import GmAttendancePage from './pages/gm/GmAttendancePage';
import GmFleetExpenseReviewPage from './pages/gm/GmFleetExpenseReviewPage';

// Shared Employee Pages
import StaffSchedulePage from './pages/common/StaffSchedulePage';
import StaffLeavePage from './pages/common/StaffLeavePage';
import ManagerApprovalsPage from './pages/common/ManagerApprovalsPage';
import ManagerAttendancePage from './pages/common/ManagerAttendancePage';
import ManagerLeavesPage from './pages/common/ManagerLeavesPage';
import StaffSalaryPage from './pages/common/StaffSalaryPage';
import StaffNotificationsPage from './pages/common/StaffNotificationsPage';
import StaffAttendancePage from './pages/common/StaffAttendancePage';
import StaffProfilePage from './pages/common/StaffProfilePage';

// Ticket Agent Pages
import AgentAttendancePage from './pages/agent/AgentAttendancePage';
import AgentAttendanceReportPage from './pages/agent/AgentAttendanceReportPage';
import AgentBookingPage from './pages/agent/AgentBookingPage';
import AgentTicketsPage from './pages/agent/AgentTicketsPage';
import AgentShiftSummaryPage from './pages/agent/AgentShiftSummaryPage';
import AgentTripsPage from './pages/agent/AgentTripsPage';
import AgentAIPage from './pages/agent/AgentAIPage';
import AgentDashboardPage from './pages/agent/AgentDashboardPage';
import AgentIncidentPage from './pages/agent/AgentIncidentPage';
import AgentMonthlyReportPage from './pages/agent/AgentMonthlyReportPage';

// Attendant Pages
import AttendantAttendancePage from './pages/attendant/AttendantAttendancePage';
import AttendantCheckinPage from './pages/attendant/AttendantCheckinPage';
import AttendantDashboardPage from './pages/attendant/AttendantDashboardPage';

// Driver Pages
import DriverDashboardPage from './pages/driver/DriverDashboardPage';
import DriverAttendancePage from './pages/driver/DriverAttendancePage';
import DriverStatusPage from './pages/driver/DriverStatusPage';
import DriverMapPage from './pages/driver/DriverMapPage';
import DriverIncidentPage from './pages/driver/DriverIncidentPage';
import CrewAttendanceReportPage from './pages/crew/CrewAttendanceReportPage';

// Admin Pages
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminErrorsPage from './pages/admin/AdminErrorsPage';

// Ticket Manager Pages
import TicketStaffAccountsPage from './pages/ticket/TicketStaffAccountsPage';
import TicketStaffLeavesPage from './pages/ticket/TicketStaffLeavesPage';
import TicketAttendanceMonitoringPage from './pages/ticket/TicketAttendanceMonitoringPage';
import TicketPricingProposalPage from './pages/ticket/TicketPricingProposalPage';
import TicketRevenueReportPage from './pages/ticket/TicketRevenueReportPage';
import TicketIncidentsPage from './pages/ticket/TicketIncidentsPage';
import TicketCustomerFeedbackPage from './pages/ticket/TicketCustomerFeedbackPage';
import TicketManagerOverview from './pages/ticket/TicketManagerOverview';
import TicketMonthlyReportsReviewPage from './pages/ticket/TicketMonthlyReportsReviewPage';

function DashboardLayout() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileMenuRef = React.useRef(null);

  // Đóng dropdown tài khoản khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Tự động cuộn lên đầu mỗi khi chuyển tab / tính năng trên sidebar
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainEl = document.querySelector('.main-content');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeTab]);

  // Lắng nghe URL hash nếu người dùng truy cập trực tiếp bằng liên kết #/routes hoặc tương tự
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('routes')) {
      setActiveTab('ops-routes');
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user?.role === 'ticket_agent') {
          return <AgentDashboardPage setActiveTab={setActiveTab} />;
        }
        if (user?.role === 'ticket_manager') {
          return <TicketManagerOverview setActiveTab={setActiveTab} />;
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
        return <FleetStatusPage />;
      case 'fleet-status':
        return <FleetStatusPage />;
      case 'fleet-monthly-expenses':
        return <FleetMonthlyExpenseReportPage />;
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
      case 'ops-trip-reports':
        return <OpsTripReportsPage />;
      case 'ops-tracking':
        return <OpsTrackingPage />;
      case 'ops-incidents':
        return <OpsIncidentsPage setActiveTab={setActiveTab} />;
      case 'manager-approvals':
        return <ManagerApprovalsPage />;
      case 'manager-attendance':
        return <ManagerAttendancePage />;
      case 'manager-leaves':
        return <ManagerLeavesPage />;

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
        return <GmAnalysisPage setActiveTab={setActiveTab} />;
      case 'gm-fleet-expenses':
        return <GmFleetExpenseReviewPage />;

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
      case 'staff-attendance':
        return <StaffAttendancePage setActiveTab={setActiveTab} defaultView="checkin" />;
      case 'staff-attendance-report':
        return <StaffAttendancePage setActiveTab={setActiveTab} defaultView="history" />;
      case 'staff-leave':
        return <StaffLeavePage />;
      case 'staff-salary':
        return <StaffSalaryPage />;
      case 'staff-profile':
        return <StaffProfilePage setActiveTab={setActiveTab} />;

      // Ticket Agent views
      case 'agent-attendance':
        return <AgentAttendancePage setActiveTab={setActiveTab} />;
      case 'agent-attendance-report':
        return <AgentAttendanceReportPage setActiveTab={setActiveTab} />;
      case 'counter-booking':
      case 'agent-booking':
        return <AgentBookingPage setActiveTab={setActiveTab} />;
      case 'agent-tickets':
        return <AgentTicketsPage setActiveTab={setActiveTab} />;
      case 'agent-shift':
        return <AgentShiftSummaryPage setActiveTab={setActiveTab} />;
      case 'agent-monthly-report':
        return <AgentMonthlyReportPage />;
      case 'agent-trips':
        return <AgentTripsPage setActiveTab={setActiveTab} />;
      case 'agent-ai':
        return <AgentAIPage />;
      case 'agent-incidents':
        return <AgentIncidentPage />;

      // Attendant views
      case 'attendant-attendance':
        return <AttendantAttendancePage setActiveTab={setActiveTab} />;
      case 'attendant-checkin':
        return <AttendantCheckinPage />;
      case 'attendant-trip-reports':
        return <OpsTripReportsPage role="attendant" />;
      case 'attendant-attendance-report':
        return <CrewAttendanceReportPage role="attendant" setActiveTab={setActiveTab} />;

      // Driver views
      case 'driver-attendance':
        return <DriverAttendancePage setActiveTab={setActiveTab} />;
      case 'driver-status':
        return <DriverStatusPage setActiveTab={setActiveTab} />;
      case 'driver-map':
        return <DriverMapPage setActiveTab={setActiveTab} />;
      case 'driver-incidents':
        return <DriverIncidentPage setActiveTab={setActiveTab} />;
      case 'driver-attendance-report':
        return <CrewAttendanceReportPage role="driver" setActiveTab={setActiveTab} />;

      // Ticket Manager views
      case 'ticket-staff':
        return <TicketStaffAccountsPage />;
      case 'ticket-leaves':
        return <TicketStaffLeavesPage />;
      case 'ticket-attendance':
        return <TicketAttendanceMonitoringPage />;
      case 'ticket-proposals':
        return <TicketPricingProposalPage />;
      case 'ticket-reports':
        return <TicketRevenueReportPage />;
      case 'ticket-monthly-reports':
        return <TicketMonthlyReportsReviewPage />;
      case 'ticket-incidents':
        return <TicketIncidentsPage />;
      case 'ticket-feedbacks':
        return <TicketCustomerFeedbackPage />;

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
      case 'fleet-monthly-expenses':
        return 'Báo cáo chi tiêu & chi phí đội xe';
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
      case 'ops-trip-reports':
        return 'Báo cáo thống kê hành khách chuyến xe';
      case 'ops-tracking':
        return 'Định vị giám sát lộ trình';
      case 'ops-incidents':
        return 'Tiếp nhận & Xử lý sự cố trên tuyến';
      case 'manager-approvals':
        return 'Xem danh sách chờ duyệt';
      case 'manager-attendance':
        return user?.role === 'ops_manager' ? 'Quản lý chấm công tổ lái' : 'Quản lý chấm công nhân sự';
      case 'manager-leaves':
        return 'Phê duyệt đơn xin nghỉ phép';

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
      case 'gm-fleet-expenses':
        return 'Phê duyệt báo cáo chi tiêu đội xe';

      // Shared Employee views
      case 'staff-schedule':
        return 'Lịch làm việc phân công';
      case 'staff-attendance':
        return 'Chấm công ca trực nhân sự';
      case 'staff-attendance-report':
        return 'Lịch sử chấm công nhân sự';
      case 'staff-leave':
        return 'Đơn xin nghỉ phép';
      case 'staff-salary':
        return 'Xem bảng lương chi tiết';
      case 'staff-profile':
        return 'Hồ sơ thông tin cá nhân';

      // Ticket Agent views
      case 'agent-attendance':
        return 'Chấm công ca trực quầy';
      case 'agent-attendance-report':
        return 'Lịch sử chấm công nhân viên bán vé';
      case 'agent-booking':
        return 'Đặt vé xe tại quầy';
      case 'agent-tickets':
        return 'Tra cứu & Quản lý vé';
      case 'agent-shift':
        return 'Tổng kết ca làm việc';
      case 'agent-monthly-report':
        return 'Báo cáo doanh thu bán vé hàng tháng';
      case 'agent-trips':
        return 'Tra cứu bảng giờ xe chạy';
      case 'agent-ai':
        return 'Trợ lý tư vấn dịch vụ AI';
      case 'agent-incidents':
        return 'Báo cáo sự cố cho Quản lý phòng vé';

      // Attendant views
      case 'attendant-attendance':
        return 'Chấm công số (Phụ xe)';
      case 'attendant-checkin':
        return 'Soát vé & Check-in hành khách';
      case 'attendant-trip-reports':
        return 'Lịch sử báo cáo chuyến xe (Phụ xe)';
      case 'attendant-attendance-report':
        return 'Lịch sử chấm công phụ xe';

      // Driver views
      case 'driver-attendance':
        return 'Chấm công số (Tài xế)';
      case 'driver-status':
        return 'Cập nhật lộ trình xe chạy';
      case 'driver-map':
        return 'Bản đồ di chuyển GPS';
      case 'driver-incidents':
        return 'Báo cáo sự cố trên tuyến (Tài xế)';
      case 'driver-attendance-report':
        return 'Lịch sử chấm công tài xế';

      // Ticket Manager views
      case 'ticket-staff':
        return 'Quản lý tài khoản nhân viên bán vé';
      case 'ticket-leaves':
        return 'Duyệt đơn xin nghỉ nhân viên bán vé';
      case 'ticket-attendance':
        return 'Giám sát ca trực phòng vé';
      case 'ticket-proposals':
        return 'Đề xuất điều chỉnh giá vé';
      case 'ticket-reports':
        return 'Báo cáo khu vực';
      case 'ticket-monthly-reports':
        return 'Duyệt báo cáo doanh thu bán vé hàng tháng';
      case 'ticket-incidents':
        return 'Báo cáo & Giám sát sự cố phòng vé';
      case 'ticket-feedbacks':
        return 'Phản hồi & Khiếu nại khách hàng';

      default:
        return 'Chức năng đang phát triển';
    }
  };

  const ROLE_LABEL = {
    fleet_manager: 'Quản lý Xe',
    ops_manager: 'Quản lý Vận tải',
    general_manager: 'Ban Giám đốc',
    admin: 'Quản trị viên',
    ticket_manager: 'Quản lý Phòng vé',
    ticket_agent: 'Nhân viên bán vé',
    driver: 'Tài xế',
    attendant: 'Phụ xe',
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
            {/* Profile Section with Dropdown Menu */}
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: profileDropdownOpen ? '#f1f5f9' : 'transparent',
                  userSelect: 'none'
                }}
                title="Tài khoản cá nhân"
              >
                <div className="header-user-text" style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {user?.name || user?.fullName || ROLE_LABEL[user?.role] || 'Người dùng'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: '500' }}>
                    {ROLE_LABEL[user?.role] || 'Nhân sự'}
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
                    justifyContent: 'center',
                    boxShadow: profileDropdownOpen ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none'
                  }}>
                    {user?.name ? user.name.trim().split(' ').slice(-1)[0].substring(0, 2).toUpperCase() : (user?.role === 'driver' ? 'TX' : user?.role === 'attendant' ? 'PX' : 'AB')}
                  </span>
                </div>
              </div>

              {/* Popup Dropdown Menu - Chỉ Thông tin cá nhân & Đăng xuất */}
              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '230px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  padding: '8px',
                  zIndex: 9999
                }}>
                  <div style={{ padding: '8px 10px 10px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f172a' }}>
                      {user?.name || user?.fullName || 'Nhân sự'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      {ROLE_LABEL[user?.role] || 'Nhân sự'} {user?.phone ? `• ${user.phone}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 0' }}>
                    <button
                      onClick={() => {
                        setActiveTab('staff-profile');
                        setProfileDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'staff-profile' ? '#eff6ff' : 'transparent',
                        color: activeTab === 'staff-profile' ? '#2563eb' : '#334155',
                        fontWeight: activeTab === 'staff-profile' ? '700' : '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      Thông tin cá nhân
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
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
