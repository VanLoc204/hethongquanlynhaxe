import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import BusModal from '../../components/BusModal';

const DEFAULT_SLEEPER_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';
const DEFAULT_VAN_IMAGE = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80';
const API_BASE = 'http://localhost:8000/api/v1';
const ITEMS_PER_PAGE = 10;

const FleetBusesPage = () => {
  const { token, user } = useContext(AuthContext);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalBus, setModalBus] = useState(undefined); // undefined=closed, null=add new, object=edit
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBuses(data.buses || []);
      }
    } catch (err) {
      showToast('Không thể tải danh sách phương tiện từ CSDL.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const handleDelete = (bus) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa phương tiện',
      message: `Bạn có chắc chắn muốn xóa phương tiện biển số ${bus.plateNumber}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/trips/fleet/buses/${bus._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Đã xóa phương tiện thành công.');
            fetchBuses();
          } else {
            showToast(data.message || 'Lỗi xóa phương tiện.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  const handleSaved = () => {
    setModalBus(undefined);
    showToast(modalBus ? 'Cập nhật thông tin xe thành công!' : 'Thêm xe mới vào CSDL thành công!');
    fetchBuses();
  };

  // Filter calculations
  const filteredBuses = buses.filter(b => {
    const matchesSearch = !searchTerm || 
      (b.plateNumber && b.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.type && b.type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || b.type === selectedType;
    
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'approved' && (b.status === 'approved' || !b.status)) ||
      (selectedStatus === 'maintenance' && (b.status === 'maintenance' || b.isMaintenance)) ||
      (selectedStatus === 'pending' && b.status === 'pending');

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate 100% Real DB Statistics
  const totalCount = buses.length;
  const activeCount = buses.filter(b => (b.status === 'approved' || !b.status) && !b.isMaintenance).length;
  const maintenanceCount = buses.filter(b => b.status === 'maintenance' || b.isMaintenance).length;
  const readinessRate = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : '100.0';

  // Get list of unique bus types dynamically from CSDL
  const uniqueBusTypes = Array.from(new Set(buses.map(b => b.type).filter(Boolean)));

  // Pagination logic
  const totalPages = Math.ceil(filteredBuses.length / ITEMS_PER_PAGE) || 1;
  const paginatedBuses = filteredBuses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '70px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '10px 18px', borderRadius: '8px',
          fontWeight: '600', fontSize: '0.82rem', boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Main Top Header & Action Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            Quản lý phương tiện
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '3px', margin: 0 }}>
            Chào mừng trở lại, {user?.name || 'Giám Đốc An Bình'}! Hệ thống vận hành An Bình Lines
          </p>
        </div>

        <button
          onClick={() => setModalBus(null)}
          className="btn"
          style={{
            background: '#2563eb', border: 'none', color: '#ffffff',
            fontWeight: '700', padding: '0.55rem 1.1rem', borderRadius: '10px',
            fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            boxShadow: '0 3px 6px rgba(37,99,235,0.2)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Thêm xe mới
        </button>
      </div>

      {/* 4 Stat KPI Cards Grid (100% Real DB Data) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.95rem' }}>
        {/* Card 1: Tổng phương tiện */}
        <div style={{ background: '#ffffff', padding: '0.85rem 1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG PHƯƠNG TIỆN</div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.2', marginTop: '2px' }}>
                {totalCount} <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>xe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Đang hoạt động */}
        <div style={{ background: '#ffffff', padding: '0.85rem 1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐANG HOẠT ĐỘNG</div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#059669', lineHeight: '1.2', marginTop: '2px' }}>
                {activeCount} <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>xe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Đang bảo dưỡng */}
        <div style={{ background: '#ffffff', padding: '0.85rem 1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐANG BẢO DƯỠNG</div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#d97706', lineHeight: '1.2', marginTop: '2px' }}>
                {maintenanceCount} <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>xe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Tỷ lệ sẵn sàng */}
        <div style={{ background: '#ffffff', padding: '0.85rem 1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỶ LỆ SẴN SÀNG</div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#7e22ce', lineHeight: '1.2', marginTop: '2px' }}>
                {readinessRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0',
        padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.85rem', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Tìm theo biển số, dòng xe, tài xế..."
              style={{
                width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: '0.8rem',
                borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', outline: 'none'
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.45rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px',
              border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '500', outline: 'none'
            }}
          >
            <option value="all">Tất cả loại xe</option>
            {uniqueBusTypes.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.45rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px',
              border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '500', outline: 'none'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="approved">Đã duyệt (Đang hoạt động)</option>
            <option value="maintenance">Đang bảo dưỡng</option>
            <option value="pending">Chờ duyệt</option>
          </select>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => { setSearchTerm(''); setSelectedType('all'); setSelectedStatus('all'); fetchBuses(); }}
          title="Làm mới danh sách phương tiện"
          style={{
            padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1',
            background: '#ffffff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      </div>

      {/* Section Header */}
      <div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          Danh sách xe buýt đang quản lý
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', margin: 0 }}>
          {filteredBuses.length} phương tiện trong hệ thống vận hành
        </p>
      </div>

      {/* Bus Cards List View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#2563eb', fontWeight: '700' }}>
          Đang tải danh sách phương tiện từ cơ sở dữ liệu...
        </div>
      ) : filteredBuses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Chưa có phương tiện nào khớp với tìm kiếm. Nhấn "Thêm xe mới" để tạo xe mới.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {paginatedBuses.map((bus) => {
            const isVan = bus.type && bus.type.toLowerCase().includes('limousine');
            const defaultImg = isVan ? DEFAULT_VAN_IMAGE : DEFAULT_SLEEPER_IMAGE;
            const imageSrc = bus.images && bus.images.length > 0 ? bus.images[0] : defaultImg;

            return (
              <div
                key={bus._id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Left Image Section with GPS Online overlay badge */}
                <div style={{ position: 'relative', width: '280px', flexShrink: 0, minHeight: '170px' }}>
                  <img
                    src={imageSrc}
                    alt={bus.plateNumber}
                    onError={(e) => { e.target.src = defaultImg; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* GPS Online Badge */}
                  <div style={{
                    position: 'absolute', top: '12px', left: '12px',
                    background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)',
                    color: '#ffffff', fontSize: '0.68rem', fontWeight: '700',
                    padding: '3px 9px', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                    GPS Online
                  </div>
                </div>

                {/* Right Details Content */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* Header Row: Plate Number Box + Bus Type Pill + Approval Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Plate Box */}
                      <div style={{
                        border: '2px solid #0f172a', borderRadius: '8px',
                        padding: '3px 12px', fontWeight: '800', fontSize: '1.1rem',
                        color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.5px', background: '#ffffff'
                      }}>
                        {bus.plateNumber}
                      </div>

                      {/* Bus Type Pill */}
                      <span style={{
                        background: '#eff6ff', color: '#2563eb', padding: '4px 12px',
                        borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700'
                      }}>
                        {bus.type || 'Xe Khách'}
                      </span>

                      {/* Status Badge */}
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700',
                        backgroundColor: bus.status === 'approved' || !bus.status ? '#dcfce7' : bus.status === 'maintenance' || bus.isMaintenance ? '#fff7ed' : '#fee2e2',
                        color: bus.status === 'approved' || !bus.status ? '#15803d' : bus.status === 'maintenance' || bus.isMaintenance ? '#c2410c' : '#b91c1c',
                        border: bus.status === 'approved' || !bus.status ? '1px solid #bbf7d0' : bus.status === 'maintenance' || bus.isMaintenance ? '1px solid #fed7aa' : '1px solid #fca5a5'
                      }}>
                        • {bus.status === 'approved' || !bus.status ? 'ĐÃ DUYỆT' : bus.status === 'maintenance' || bus.isMaintenance ? 'ĐANG BẢO DƯỠNG' : 'CHỜ DUYỆT'}
                      </span>
                    </div>

                    {/* Sub-info: Seats & Amenities Count */}
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>👥 <strong>{bus.totalSeats} chỗ ngồi</strong></span>
                      <span>•</span>
                      <span>🔌 <strong>{bus.amenities?.length || 0} tiện ích</strong></span>
                    </div>

                    {/* Amenities Tags list with icons */}
                    {bus.amenities && bus.amenities.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                        {bus.amenities.slice(0, 8).map((am, idx) => {
                          const getAmenityIcon = (name = '') => {
                            const str = name.toLowerCase();
                            if (str.includes('wifi')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
                            if (str.includes('nước')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>;
                            if (str.includes('điều hòa')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg>;
                            if (str.includes('khăn')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>;
                            if (str.includes('chăn') || str.includes('gối')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>;
                            if (str.includes('sạc')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
                            if (str.includes('tivi')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><rect x="2" y="7" width="20" height="13" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>;
                            if (str.includes('wc') || str.includes('vệ sinh')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M18 8l4 4-4 4"/></svg>;
                            if (str.includes('đèn') || str.includes('đọc')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2"><path d="M9 18h6M10 22h4M12 2v1a7 7 0 0 0 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-1.26C6.19 14.47 5 12.38 5 10a7 7 0 0 1 7-7z"/></svg>;
                            if (str.includes('rèm')) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>;
                            return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>;
                          };

                          return (
                            <span
                              key={idx}
                              style={{
                                background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155',
                                fontSize: '0.72rem', fontWeight: '600', padding: '3px 8px', borderRadius: '6px',
                                display: 'inline-flex', alignItems: 'center', gap: '5px'
                              }}
                            >
                              {getAmenityIcon(am)}
                              {am}
                            </span>
                          );
                        })}
                        {bus.amenities.length > 8 && (
                          <span style={{ background: '#f8fafc', color: '#94a3b8', fontSize: '0.72rem', fontWeight: '600', padding: '3px 6px', borderRadius: '6px' }}>
                            +{bus.amenities.length - 8} khác
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Right Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                    <button
                      onClick={() => setModalBus(bus)}
                      className="btn"
                      style={{
                        background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                        fontWeight: '700', padding: '0.4rem 0.9rem', borderRadius: '8px',
                        fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(bus)}
                      className="btn"
                      style={{
                        background: '#ef4444', border: 'none', color: '#ffffff',
                        fontWeight: '700', padding: '0.4rem 0.9rem', borderRadius: '8px',
                        fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(239,68,68,0.2)'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredBuses.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0',
          fontSize: '0.78rem', color: '#64748b'
        }}>
          <div>
            Hiển thị <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> - <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredBuses.length)}</strong> trên tổng số <strong>{filteredBuses.length}</strong> phương tiện
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                color: currentPage === 1 ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Trước
            </button>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>Trang {currentPage} / {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#0f172a', fontWeight: '600', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Bus Add/Edit Modal Component */}
      {modalBus !== undefined && (
        <BusModal
          bus={modalBus}
          token={token}
          onClose={() => setModalBus(undefined)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
            width: '100%', maxWidth: '420px', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              {confirmModal.title}
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetBusesPage;
