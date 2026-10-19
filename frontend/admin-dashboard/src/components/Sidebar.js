import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ activeTab, onTabChange, isOpen }) => {
  const { user, logout } = useContext(AuthContext);

  const getNavSections = () => {
    switch (user?.role) {
      case 'ticket_agent':
        return [
          {
            title: 'TỔNG QUAN & ĐIỀU HÀNH',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { key: 'agent-attendance', label: 'Chấm công ca', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { key: 'agent-booking', label: 'Đặt vé tại quầy', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg> },
              { key: 'agent-tickets', label: 'Quản lý vé', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
              { key: 'agent-shift', label: 'Tổng kết ca làm việc', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          },
          {
            title: 'LỊCH TRÌNH & NHÂN SỰ',
            items: [
              { key: 'staff-schedule', label: 'Lịch làm việc', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { key: 'staff-leave', label: 'Đơn xin nghỉ', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg> },
              { key: 'staff-salary', label: 'Xem bảng lương', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          },
          {
            title: 'TIỆN ÍCH & HỖ TRỢ',
            items: [
              { key: 'staff-notifications', label: 'Thông báo & Tin tức', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, hasRedDot: true },
              { key: 'agent-trips', label: 'Tra cứu chuyến xe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
              { key: 'agent-ai', label: 'Trợ lý tư vấn AI', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L2.1 12a10 10 0 0 1 17.8-5.3z"/></svg>, textBadge: 'MỚI' }
            ]
          }
        ];

      case 'driver':
        return [
          {
            title: 'TỔNG QUAN & ĐIỀU HÀNH',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { key: 'driver-attendance', label: 'Chấm công số', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg> },
              { key: 'driver-status', label: 'Cập nhật hành trình', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> },
              { key: 'driver-map', label: 'Bản đồ di chuyển', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
            ]
          },
          {
            title: 'LỊCH TRÌNH & NHÂN SỰ',
            items: [
              { key: 'staff-schedule', label: 'Lịch chạy xe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { key: 'staff-leave', label: 'Đơn xin nghỉ', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg> },
              { key: 'staff-salary', label: 'Xem bảng lương', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          },
          {
            title: 'TIỆN ÍCH & HỖ TRỢ',
            items: [
              { key: 'staff-notifications', label: 'Thông báo & Tin tức', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, hasRedDot: true }
            ]
          }
        ];

      case 'attendant':
        return [
          {
            title: 'TỔNG QUAN & ĐIỀU HÀNH',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { key: 'attendant-attendance', label: 'Chấm công số', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg> },
              { key: 'attendant-checkin', label: 'Soát vé & Check-in', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
            ]
          },
          {
            title: 'LỊCH TRÌNH & NHÂN SỰ',
            items: [
              { key: 'staff-schedule', label: 'Lịch chạy xe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { key: 'staff-leave', label: 'Đơn xin nghỉ', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg> },
              { key: 'staff-salary', label: 'Xem bảng lương', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          },
          {
            title: 'TIỆN ÍCH & HỖ TRỢ',
            items: [
              { key: 'staff-notifications', label: 'Thông báo & Tin tức', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, hasRedDot: true }
            ]
          }
        ];

      case 'fleet_manager':
        return [
          {
            title: 'TỔNG QUAN & ĐIỀU HÀNH',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { key: 'fleet-buses', label: 'Quản lý phương tiện', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="13" rx="2"/><path d="M16 8h2"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
              { key: 'fleet-status', label: 'Cập nhật tình trạng xe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
              { key: 'fleet-maintenance', label: 'Quản lý bảo trì', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
              { key: 'fleet-forecast', label: 'Xem dự báo bảo trì', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> }
            ]
          },
          {
            title: 'LỊCH TRÌNH & NHÂN SỰ',
            items: [
              { key: 'manager-approvals', label: 'Xem danh sách chờ duyệt', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg> },
              { key: 'fleet-reports', label: 'Tạo báo cáo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
              { key: 'staff-schedule', label: 'Lịch làm việc', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { key: 'staff-leave', label: 'Đơn xin nghỉ', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg> },
              { key: 'staff-salary', label: 'Xem bảng lương', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          },
          {
            title: 'TIỆN ÍCH & HỖ TRỢ',
            items: [
              { key: 'staff-notifications', label: 'Thông báo & Tin tức', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, hasRedDot: true }
            ]
          }
        ];

      case 'ops_manager':
        return [
          {
            title: 'TỔNG QUAN & ĐIỀU HÀNH',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { key: 'ops-routes', label: 'Quản lý tuyến đường', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> },
              { key: 'ops-trips', label: 'Quản lý chuyến xe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { key: 'ops-staff', label: 'Quản lý nhân sự chuyến', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
              { key: 'ops-reports', label: 'Xem báo cáo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              { key: 'ops-tracking', label: 'Định vị giám sát lộ trình', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
            ]
          },
          {
            title: 'LỊCH TRÌNH & NHÂN SỰ',
            items: [
              { key: 'ops-fleet-accounts', label: 'Quản lý tài khoản đội xe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
              { key: 'staff-schedule', label: 'Lịch làm việc', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { key: 'manager-attendance', label: 'Quản lý chấm công tổ lái', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg> },
              { key: 'staff-leave', label: 'Đơn xin nghỉ', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg> },
              { key: 'staff-salary', label: 'Xem bảng lương', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          },
          {
            title: 'TIỆN ÍCH & HỖ TRỢ',
            items: [
              { key: 'staff-notifications', label: 'Thông báo & Tin tức', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, hasRedDot: true }
            ]
          }
        ];

      case 'general_manager':
        return [
          {
            title: 'TỔNG QUAN & ĐIỀU HÀNH',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { key: 'gm-reports', label: 'Xem báo cáo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              { key: 'gm-targets', label: 'Hoạch định chi tiêu', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
              { key: 'gm-analysis', label: 'Xem phân tích nhu cầu', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 11l3-3 3 3 4-4"/></svg> }
            ]
          },
          {
            title: 'QUẢN TRỊ & NHÂN SỰ',
            items: [
              { key: 'gm-staff', label: 'Quản lý nhân viên', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { key: 'gm-attendance', label: 'Báo cáo thống kê chấm công', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, textBadge: 'MỚI' },
              { key: 'manager-attendance', label: 'Giám sát chấm công ngày', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg> },
              { key: 'manager-approvals', label: 'Phê duyệt', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg> },
              { key: 'fleet-buses', label: 'Xem thông tin xe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><line x1="3" y1="5" x2="21" y2="5"/><polyline points="7 23 3 19 7 15"/><line x1="21" y1="19" x2="3" y2="19"/></svg> },
              { key: 'gm-pricing', label: 'Quản lý giá vé', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg> },
              { key: 'gm-promotions', label: 'Quản lý khuyến mãi', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
              { key: 'staff-salary', label: 'Xem bảng lương', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          }
        ];

      case 'admin':
        return [
          {
            title: 'TỔNG QUAN & HỆ THỐNG',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
              { key: 'admin-users', label: 'Quản lý tài khoản người dùng', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { key: 'admin-logs', label: 'Giám sát nhật ký (logs)', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
              { key: 'admin-errors', label: 'Giám sát lỗi hệ thống', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
              { key: 'staff-salary', label: 'Xem bảng lương', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
            ]
          }
        ];

      default:
        return [
          {
            title: 'TỔNG QUAN',
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
            ]
          }
        ];
    }
  };

  const sections = getNavSections();

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`} style={{
      width: '235px',
      backgroundColor: '#0d1527',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
      boxShadow: '2px 0 10px rgba(0,0,0,0.15)',
      userSelect: 'none'
    }}>
      {/* Sidebar Header Branding (Cao chuẩn 56px khớp với Top Header) */}
      <div style={{
        height: '56px',
        minHeight: '56px',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff', fontWeight: '900', fontSize: '0.9rem', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)', flexShrink: 0
        }}>
          AB
        </div>
        <span style={{
          color: '#ffffff', fontWeight: '800', fontSize: '1rem',
          letterSpacing: '-0.3px', whiteSpace: 'nowrap'
        }}>
          AN BÌNH LINES
        </span>
      </div>

      <nav className="nav-menu" style={{ padding: '0.75rem 0.5rem', flex: 1, overflowY: 'auto' }}>
        {sections.map((sec, secIdx) => (
          <div key={secIdx} style={{ marginBottom: '1.25rem' }}>
            {/* Section Header Title */}
            <div style={{
              fontSize: '0.65rem', fontWeight: '800', color: '#475569',
              padding: '0 0.5rem', marginBottom: '0.4rem', letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}>
              {sec.title}
            </div>

            {/* Section Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {sec.items.map(item => {
                const isActive = activeTab === item.key;
                return (
                  <a
                    key={item.key}
                    href={`#${item.key}`}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); onTabChange(item.key); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: '8px',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      backgroundColor: isActive ? '#2563eb' : 'transparent',
                      fontWeight: isActive ? '700' : '500',
                      boxShadow: isActive ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                      transition: 'all 0.15s ease', textDecoration: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      {item.icon && (
                        <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#ffffff' : '#64748b', flexShrink: 0 }}>
                          {item.icon}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.78rem', whiteSpace: 'nowrap', color: isActive ? '#ffffff' : '#cbd5e1'
                      }}>
                        {item.label}
                      </span>
                    </div>

                    {/* Red Notification Dot Badge */}
                    {item.hasRedDot && (
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444',
                        boxShadow: '0 0 6px #ef4444', flexShrink: 0, marginLeft: '4px'
                      }}></span>
                    )}

                    {/* MỚI Text Badge */}
                    {item.textBadge && (
                      <span style={{
                        backgroundColor: '#6b21a8', color: '#f3e8ff', border: '1px solid #a855f7',
                        fontSize: '0.625rem', fontWeight: '800', padding: '1px 5px', borderRadius: '4px',
                        flexShrink: 0, marginLeft: '4px', letterSpacing: '0.3px'
                      }}>
                        {item.textBadge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={logout}
          className="btn nav-logout-btn nav-item"
          style={{
            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
            marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '9px',
            padding: '8px 10px', borderRadius: '8px', color: '#ef4444', backgroundColor: 'transparent'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>Đăng xuất</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
