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
      default:
        return 'Chức năng đang phát triển';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <div>
            <h1>{getHeaderTitle()}</h1>
            <p className="subtitle">
              Chào mừng trở lại, {user?.name}! Hệ thống vận hành Á Đông SmartBus
            </p>
          </div>
          <div className="user-profile">
            <span className="avatar">AD</span>
            <span className="user-name">{user?.name}</span>
          </div>
        </header>

        {renderContent()}
      </main>
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
