import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const ManagerAttendancePage = () => {
  const { token, user } = useContext(AuthContext);
  const isOpsManager = user?.role === 'ops_manager';

  // State dữ liệu chấm công theo chuyến xe
  const [attendanceData, setAttendanceData] = useState([]);
  const [unassignedStaff, setUnassignedStaff] = useState([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalScheduled: 0,
    activeDirect: 0,
    closedShift: 0,
    absent: 0,
    scheduled: 0,
    unassignedCount: 0,
    totalStaff: 0,
    faceRegisteredCount: 0
  });

  // Mặc định chọn ngày hôm nay
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [activeTab, setActiveTab] = useState('duties'); // 'duties' | 'unassigned'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Bộ lọc & Tìm kiếm
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal xem ảnh chụp đối soát Face ID
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Tải dữ liệu chấm công thời gian thực theo Chuyến xe từ API Backend
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/attendance/today?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAttendanceData(data.attendance || []);
        setUnassignedStaff(data.unassignedStaff || []);
        setStats(
          data.stats || {
            totalTrips: 0,
            totalScheduled: 0,
            activeDirect: 0,
            closedShift: 0,
            absent: 0,
            scheduled: 0,
            unassignedCount: 0,
            totalStaff: 0,
            faceRegisteredCount: 0
          }
        );
      } else {
        setError(data.message || 'Không thể tải báo cáo chấm công.');
      }
    } catch (err) {
      console.error('[fetchAttendance Error]:', err);
      setError('Lỗi kết nối máy chủ khi tải bảng chấm công.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, token]);

  useEffect(() => {
    if (token) {
      fetchAttendance();
    }
  }, [token, fetchAttendance]);

  // 2. Lọc danh sách phân công nhiệm vụ
  const currentDataset = activeTab === 'duties' ? attendanceData : unassignedStaff;

  const filteredData = currentDataset.filter((item) => {
    const matchRole = filterRole === 'all' || item.role === filterRole;
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.phone?.includes(q) ||
      item.tripRoute?.toLowerCase().includes(q) ||
      item.busPlateNumber?.toLowerCase().includes(q);
    return matchRole && matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Xuất file báo cáo
  const exportExcel = () => {
    alert(`Đã xuất báo cáo giám sát chấm công ngày ${selectedDate} ra định dạng bảng tính!`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '1440px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      
      {/* Toast thông báo */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            backgroundColor: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: toast.type === 'success' ? '#047857' : '#b91c1c',
            border: `1.5px solid ${toast.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header & Bộ chọn ngày */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              {isOpsManager ? 'Giám Sát Chấm Công Tổ Lái Theo Chuyến' : 'Bảng Theo Dõi Chấm Công Tổ Lái'}
            </h1>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
              Dữ Liệu Thật Theo Chuyến Xe
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Giám sát thời gian check-in/out thực tế theo từng chuyến xe, phát hiện tức thì tổ lái quá giờ xuất bến chưa chấm công (Vắng không phép).
          </p>
        </div>

        {/* Nút tác vụ & Chọn ngày */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Ngày chạy:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{ border: 'none', outline: 'none', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={exportExcel}
            style={{
              backgroundColor: '#ffffff', color: '#334155', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Xuất Excel
          </button>

          <button
            onClick={fetchAttendance}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* 5 Thẻ Thống Kê KPI Thông Minh */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Tổng lượt phân công */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b' }}>TỔNG LƯỢT PHÂN CÔNG</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {stats.totalScheduled} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>lượt ca</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Trên tổng số <strong>{stats.totalTrips}</strong> chuyến xe trong ngày</span>
        </div>

        {/* Card 2: Đang trong ca */}
        <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '1.15rem', boxShadow: '0 2px 6px rgba(16,185,129,0.05)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#047857' }}>ĐANG TRONG CA TRỰC</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#059669', margin: '4px 0 2px 0' }}>
            {stats.activeDirect} <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>đang chạy</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#059669', fontWeight: '600' }}>Đã check-in khuôn mặt</span>
        </div>

        {/* Card 3: Đã hoàn thành ca */}
        <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.15rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#1d4ed8' }}>ĐÃ HOÀN THÀNH CHUYẾN</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#2563eb', margin: '4px 0 2px 0' }}>
            {stats.closedShift} <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: '600' }}>lượt xong</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#2563eb', fontWeight: '600' }}>Đã check-out chốt giờ</span>
        </div>

        {/* Card 4: VẮNG KHÔNG PHÉP (Nổi bật màu đỏ báo động) */}
        <div style={{ background: stats.absent > 0 ? '#fef2f2' : '#ffffff', border: `2px solid ${stats.absent > 0 ? '#ef4444' : '#fecdd3'}`, borderRadius: '12px', padding: '1.15rem', boxShadow: '0 2px 8px rgba(239,68,68,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: '900', color: '#b91c1c' }}>VẮNG KHÔNG PHÉP</span>
            {stats.absent > 0 && (
              <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.65rem', fontWeight: '800', padding: '1px 6px', borderRadius: '4px' }}>
                BÁO ĐỘNG
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626', margin: '4px 0 2px 0' }}>
            {stats.absent} <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: '700' }}>lượt bỏ ca</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#b91c1c', fontWeight: '700' }}>
            Quá giờ xe chạy chưa check-in
          </span>
        </div>

        {/* Card 5: Chờ xuất bến */}
        <div style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '12px', padding: '1.15rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#b45309' }}>CHỜ XUẤT BẾN</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#d97706', margin: '4px 0 2px 0' }}>
            {stats.scheduled} <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: '600' }}>lượt ca</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#b45309' }}>Chưa đến giờ lăn bánh</span>
        </div>

      </div>

      {/* Panel Bảng Dữ Liệu Chấm Công */}
      <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Tabs: Chuyến xe hôm nay vs Nhân sự không có lịch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setActiveTab('duties');
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '800',
                fontSize: '0.825rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'duties' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'duties' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              Phân Công Theo Chuyến Xe ({attendanceData.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('unassigned');
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '800',
                fontSize: '0.825rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'unassigned' ? '#0f172a' : '#f1f5f9',
                color: activeTab === 'unassigned' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              Nhân Sự Không Có Chuyến Hôm Nay ({unassignedStaff.length})
            </button>
          </div>

          {/* Bộ lọc Controls */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Ô tìm kiếm */}
            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="Tìm tên, SĐT, biển số, tuyến..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%', padding: '7px 12px 7px 32px', borderRadius: '8px',
                  border: '1px solid #cbd5e1', fontSize: '0.825rem', outline: 'none'
                }}
              />
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Lọc Role */}
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', fontWeight: '600', color: '#334155' }}
            >
              <option value="all">Tất cả chức danh</option>
              <option value="driver">Tài xế (Driver)</option>
              <option value="attendant">Phụ xe (Attendant)</option>
            </select>

            {/* Lọc Status (chỉ áp dụng cho tab duties) */}
            {activeTab === 'duties' && (
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', fontWeight: '600', color: '#334155' }}
              >
                <option value="all">Tất cả trạng thái ca</option>
                <option value="absent">Vắng không phép</option>
                <option value="active">Đang trong ca trực</option>
                <option value="closed">Đã hoàn thành chuyến</option>
                <option value="scheduled">Chờ xuất bến</option>
              </select>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Bảng Dữ Liệu */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#2563eb', fontWeight: '700' }}>
            Đang tải dữ liệu chấm công thời gian thực...
          </div>
        ) : paginatedData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            Không có dữ liệu nào phù hợp với bộ lọc đã chọn.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.725rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>NHÂN VIÊN</th>
                  <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>VAI TRÒ</th>
                  <th style={{ padding: '0.85rem 1rem' }}>CHUYẾN XE &amp; PHƯƠNG TIỆN</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>GIỜ XUẤT BẾN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>TRẠNG THÁI CA</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>GIỜ VÀO</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>GIỜ TAN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ĐỊA ĐIỂM &amp; TỌA ĐỘ GPS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>ĐỐI SOÁT FACE ID</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((duty) => (
                  <tr
                    key={duty.id || duty.dutyId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.825rem',
                      backgroundColor: duty.status === 'absent' ? '#fff5f5' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    
                    {/* 1. Tên & SĐT */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {duty.name}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '1px', fontFamily: 'monospace' }}>
                        {duty.phone}
                      </div>
                    </td>

                    {/* 2. Vai trò (Cột riêng biệt, 1 hàng không xuống dòng) */}
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: '800',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          backgroundColor: duty.role === 'driver' ? '#eff6ff' : '#f5f3ff',
                          color: duty.role === 'driver' ? '#1d4ed8' : '#6d28d9',
                          border: `1px solid ${duty.role === 'driver' ? '#bfdbfe' : '#ddd6fe'}`
                        }}
                      >
                        {duty.role === 'driver' ? 'Tài Xế' : 'Phụ Xe'}
                      </span>
                    </td>

                    {/* 3. Tuyến đường & Biển số xe */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{duty.tripRoute}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                          {duty.busPlateNumber}
                        </span>
                        {duty.tripId && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            Mã: #{duty.tripId.toString().slice(-5)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Giờ xuất bến dự kiến */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '0.925rem', color: '#0f172a' }}>
                        {duty.departureTimeStr}
                      </div>
                      {duty.isPastDeparture && duty.status === 'absent' && (
                        <span style={{ fontSize: '0.675rem', color: '#dc2626', fontWeight: '800', display: 'block', marginTop: '2px' }}>
                          Trễ {duty.overdueMinutes} phút
                        </span>
                      )}
                    </td>

                    {/* 5. Trạng thái ca (Nổi bật Vắng không phép - gọn gàng) */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {duty.status === 'absent' ? (
                        <div>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '900',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1.5px solid #ef4444',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' }}></span>
                            VẮNG KHÔNG PHÉP
                          </span>
                        </div>
                      ) : duty.status === 'active' ? (
                        <div>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '800',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                              border: '1px solid #a7f3d0'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                            Đang trực ca
                          </span>
                        </div>
                      ) : duty.status === 'closed' ? (
                        <div>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '800',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                            Đã hoàn thành
                          </span>
                        </div>
                      ) : duty.status === 'off' ? (
                        <div>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b'
                            }}
                          >
                            Không có chuyến
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '800',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                            Chờ xuất bến
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 5. Giờ vào */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: '800', color: duty.checkInTime !== '--:--:--' ? '#059669' : '#94a3b8' }}>
                      {duty.checkInTime}
                    </td>

                    {/* 6. Giờ tan */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: '800', color: duty.checkOutTime !== '--:--:--' ? '#0f172a' : '#94a3b8' }}>
                      {duty.checkOutTime}
                    </td>

                    {/* 7. Địa điểm & Tọa độ GPS */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ color: duty.status === 'absent' ? '#b91c1c' : '#0f172a', fontWeight: '600' }}>
                        {duty.location}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '2px' }}>
                        {duty.gps}
                      </div>
                    </td>

                    {/* 8. Đối soát Face ID & Xem ảnh thực tế */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {duty.faceVerified ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ color: '#059669', fontWeight: '800', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                            Hợp lệ {duty.isLiveVerified && <span title="Đạt chuẩn kiểm tra Liveness người thật" style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px' }}>LIVE</span>}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                            Sai số: {duty.faceDistance !== null ? duty.faceDistance : '--'}
                          </span>
                          {duty.checkInPhoto && (
                            <button
                              onClick={() => setSelectedPhotoModal(duty)}
                              style={{
                                marginTop: '2px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                              <span>Xem ảnh</span>
                            </button>
                          )}
                        </div>
                      ) : duty.status === 'absent' ? (
                        <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.725rem' }}>
                          Chưa chấm công
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Chờ điểm danh</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Hiển thị <strong>{paginatedData.length}</strong> trên tổng số <strong>{filteredData.length}</strong> nhiệm vụ ca chạy
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontSize: '0.8rem'
              }}
            >
              Trang trước
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0 8px' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontSize: '0.8rem'
              }}
            >
              Trang sau
            </button>
          </div>
        </div>

      </section>

      {/* Modal Xem Ảnh Đối Soát Check-in Thực Tế */}
      {selectedPhotoModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'scaleIn 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Ảnh Chụp Lúc Check-in Thực Tế
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {selectedPhotoModal.name} • {selectedPhotoModal.role === 'driver' ? 'Tài xế' : 'Phụ xe'} ({selectedPhotoModal.phone})
                </p>
              </div>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: '1.25rem', textAlign: 'center' }}>
              <img
                src={selectedPhotoModal.checkInPhoto}
                alt="Ảnh Check-in"
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#0f172a'
                }}
              />

              <div style={{ marginTop: '1rem', textAlign: 'left', background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Chuyến xe:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedPhotoModal.tripRoute}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Biển số xe:</span>
                  <strong style={{ color: '#2563eb' }}>{selectedPhotoModal.busPlateNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Thời gian vào ca:</span>
                  <strong style={{ color: '#059669', fontFamily: 'monospace' }}>{selectedPhotoModal.checkInTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Sai số nhận diện Face ID:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedPhotoModal.faceDistance} (Ngưỡng: 0.38)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Xác thực người thật:</span>
                  <strong style={{ color: selectedPhotoModal.isLiveVerified ? '#059669' : '#d97706' }}>
                    {selectedPhotoModal.isLiveVerified ? 'Đạt chuẩn Liveness (người thật)' : 'Chưa kiểm tra'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Vị trí GPS:</span>
                  <span style={{ color: '#334155', fontWeight: '600' }}>{selectedPhotoModal.gps}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPhotoModal(null)}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerAttendancePage;
