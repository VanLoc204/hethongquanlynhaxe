import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import BusModal from '../../components/BusModal';

const DEFAULT_SLEEPER_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';
const DEFAULT_VAN_IMAGE = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80';
const API_BASE = 'http://localhost:8000/api';
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
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'

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
      message: `Bạn có chắc chắn muốn xóa phương tiện biển số ${bus.plateNumber} khỏi hệ thống vận hành?`,
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
    showToast(modalBus ? 'Cập nhật thông tin xe thành công!' : 'Thêm xe mới vào cơ sở dữ liệu thành công!');
    fetchBuses();
  };

  // Filter calculations
  const filteredBuses = buses.filter(b => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term ||
      (b.plateNumber && b.plateNumber.toLowerCase().includes(term)) ||
      (b.type && b.type.toLowerCase().includes(term)) ||
      (b.amenities && b.amenities.some(a => a.toLowerCase().includes(term)));

    const matchesType = selectedType === 'all' || b.type === selectedType;

    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'approved' && (b.status === 'approved' || !b.status) && (b.activeStatus === 'ready' || b.activeStatus === 'active' || !b.activeStatus)) ||
      (selectedStatus === 'maintenance' && (b.activeStatus === 'maintenance' || b.activeStatus === 'repairing' || b.isMaintenance)) ||
      (selectedStatus === 'pending' && b.status === 'pending');

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate 100% Real DB Statistics
  const totalCount = buses.length;
  const activeCount = buses.filter(b => (b.status === 'approved' || !b.status) && b.activeStatus !== 'maintenance' && b.activeStatus !== 'repairing').length;
  const maintenanceCount = buses.filter(b => b.activeStatus === 'maintenance' || b.activeStatus === 'repairing' || b.isMaintenance).length;
  const readinessRate = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : '100.0';

  // Get list of unique bus types dynamically from CSDL
  const uniqueBusTypes = Array.from(new Set(buses.map(b => b.type).filter(Boolean)));

  // Pagination logic
  const totalPages = Math.ceil(filteredBuses.length / ITEMS_PER_PAGE) || 1;
  const paginatedBuses = filteredBuses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
      <style>{`
        .fleet-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .fleet-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .fleet-kpi-card {
          background: #ffffff;
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .fleet-table-row:hover {
          background-color: #f8fafc;
        }

        .amenity-chip {
          background: #f1f5f9;
          color: #334155;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          display: inline-block;
          white-space: nowrap;
        }

        .plate-box {
          display: inline-block;
          background: #ffffff;
          border: 2px solid #0f172a;
          border-radius: 6px;
          padding: 2px 8px;
          font-family: monospace;
          font-weight: 800;
          font-size: 0.88rem;
          color: #0f172a;
          letter-spacing: 0.5px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        @media (max-width: 1024px) {
          .fleet-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .fleet-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '70px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color: 'white', padding: '10px 18px', borderRadius: '8px',
          fontWeight: '700', fontSize: '0.8rem', boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* ========================================================= */}
      {/* VÙNG 1: HEADER QUẢN TRỊ ĐỘI XE                            */}
      {/* ========================================================= */}
      <div className="fleet-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Hồ Sơ &amp; Quản Lý Phương Tiện
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                An Bình Fleet 2.0
              </span>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Đã Duyệt {totalCount} Xe
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                {user?.name || 'Quản Lý Đội Xe'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Giám sát hồ sơ xe, thông số kỹ thuật, cấu hình sơ đồ ghế và danh mục tiện nghi phục vụ hành khách.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={fetchBuses}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setModalBus(null)}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              Thêm phương tiện mới
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 THẺ THỐNG KÊ KPI ĐỘI XE                                 */}
      {/* ========================================================= */}
      <div className="fleet-kpi-grid">
        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TỔNG PHƯƠNG TIỆN
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontWeight: '700' }}>
              Quản lý
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {totalCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>phương tiện</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Đã đăng ký đầy đủ trong hệ thống vận hành
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              ĐANG HOẠT ĐỘNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#ecfdf5', color: '#059669', borderRadius: '4px', fontWeight: '700' }}>
              100% Sẵn sàng
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginBottom: '2px' }}>
            {activeCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>xe hoạt động</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '700' }}>
            Sẵn sàng đáp ứng toàn bộ chuyến xe xuất bến
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              ĐANG BẢO DƯỠNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#f8fafc', color: '#64748b', borderRadius: '4px', fontWeight: '700' }}>
              Garage
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
            {maintenanceCount} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>xe nằm xưởng</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {maintenanceCount > 0 ? 'Đang thực hiện sửa chữa kỹ thuật' : 'Đội xe vận hành ổn định, không có sự cố'}
          </div>
        </div>

        <div className="fleet-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              TỶ LỆ KHẢ DỤNG
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#f1f5f9', color: '#334155', borderRadius: '4px', fontWeight: '700' }}>
              Chỉ số KPI
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb', marginBottom: '2px' }}>
            {readinessRate}%
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Tối ưu hóa công suất vận chuyển hành khách
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: THANH TÌM KIẾM, BỘ LỌC & CHUYỂN ĐỔI CHẾ ĐỘ XEM    */}
      {/* ========================================================= */}
      <div className="fleet-box" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1 }}>
            {/* Ô tìm kiếm */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Tìm theo biển số, dòng xe, tiện ích..."
              style={{
                minWidth: '240px',
                flex: 1,
                padding: '0.45rem 0.75rem',
                fontSize: '0.78rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none'
              }}
            />

            {/* Lọc theo loại xe */}
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.78rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: '600',
                outline: 'none'
              }}
            >
              <option value="all">Tất cả phân khúc xe</option>
              {uniqueBusTypes.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>

            {/* Lọc theo trạng thái */}
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.78rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: '600',
                outline: 'none'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="approved">Sẵn sàng hoạt động</option>
              <option value="maintenance">Đang bảo dưỡng tại xưởng</option>
              <option value="pending">Chờ phê duyệt</option>
            </select>
          </div>

          {/* Toggle Chế độ xem & Đặt lại */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: viewMode === 'table' ? '#2563eb' : '#cbd5e1',
                backgroundColor: viewMode === 'table' ? '#eff6ff' : '#ffffff',
                color: viewMode === 'table' ? '#1d4ed8' : '#64748b'
              }}
            >
              Dạng bảng
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: viewMode === 'card' ? '#2563eb' : '#cbd5e1',
                backgroundColor: viewMode === 'card' ? '#eff6ff' : '#ffffff',
                color: viewMode === 'card' ? '#1d4ed8' : '#64748b'
              }}
            >
              Dạng thẻ
            </button>
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedType('all'); setSelectedStatus('all'); fetchBuses(); }}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 3: DANH SÁCH PHƯƠNG TIỆN (DẠNG BẢNG HOẶC THẺ)        */}
      {/* ========================================================= */}
      {loading ? (
        <div className="fleet-box" style={{ textAlign: 'center', padding: '3rem', color: '#2563eb', fontWeight: '700', fontSize: '0.85rem' }}>
          Đang tải danh sách phương tiện từ cơ sở dữ liệu...
        </div>
      ) : filteredBuses.length === 0 ? (
        <div className="fleet-box" style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.82rem' }}>
          Không tìm thấy phương tiện nào phù hợp với điều kiện lọc. Vui lòng bấm "Đặt lại" hoặc "Thêm phương tiện mới".
        </div>
      ) : viewMode === 'table' ? (
        /* CHẾ ĐỘ XEM: DẠNG BẢNG TỔNG HỢP (COMPACT & EXECUTIVE) */
        <div className="fleet-box" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff'
          }}>
            <div>
              <h2 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Danh Sách Hồ Sơ Phương Tiện Vận Tải
              </h2>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Hiển thị {filteredBuses.length} phương tiện đã kiểm định và phân bổ lịch trình
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid #a7f3d0' }}>
              GPS Trực tuyến
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '800' }}>Biển Số &amp; Phương Tiện</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800' }}>Phân Khúc &amp; Sức Chứa</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800' }}>Tiện Nghi Phục Vụ</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800', textAlign: 'center' }}>Trạng Thái Kỹ Thuật</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBuses.map((bus) => {
                  const isVan = bus.type && bus.type.toLowerCase().includes('limousine');
                  const defaultImg = isVan ? DEFAULT_VAN_IMAGE : DEFAULT_SLEEPER_IMAGE;
                  const imageSrc = bus.images && bus.images.length > 0 ? bus.images[0] : defaultImg;
                  const isMaint = bus.activeStatus === 'maintenance' || bus.activeStatus === 'repairing' || bus.isMaintenance;

                  return (
                    <tr key={bus._id} className="fleet-table-row" style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                      {/* Cột 1: Biển số & Thumbnail */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={imageSrc}
                            alt={bus.plateNumber}
                            onError={(e) => { e.target.src = defaultImg; }}
                            style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                          />
                          <div>
                            <div className="plate-box">
                              {bus.plateNumber}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                              Mã: #{bus._id.slice(-6).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Phân khúc & Sức chứa */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: '700', color: '#1d4ed8', fontSize: '0.82rem' }}>
                          {bus.type || 'Xe Khách Tuyến'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '1px' }}>
                          Sức chứa: <strong>{bus.totalSeats} chỗ ngồi/nằm</strong>
                        </div>
                      </td>

                      {/* Cột 3: Tiện nghi phục vụ */}
                      <td style={{ padding: '10px 14px', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {bus.amenities && bus.amenities.length > 0 ? (
                            bus.amenities.slice(0, 6).map((am, idx) => (
                              <span key={idx} className="amenity-chip">
                                {am}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tiêu chuẩn</span>
                          )}
                          {bus.amenities && bus.amenities.length > 6 && (
                            <span className="amenity-chip" style={{ background: '#e2e8f0', color: '#475569' }}>
                              +{bus.amenities.length - 6} khác
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 4: Trạng thái kỹ thuật */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          backgroundColor: isMaint ? '#fff7ed' : '#ecfdf5',
                          color: isMaint ? '#c2410c' : '#047857',
                          border: `1px solid ${isMaint ? '#fed7aa' : '#a7f3d0'}`
                        }}>
                          {isMaint ? 'Bảo dưỡng tại xưởng' : 'Sẵn sàng hoạt động'}
                        </span>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px' }}>
                          Đã phê duyệt
                        </div>
                      </td>

                      {/* Cột 5: Thao tác */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setModalBus(bus)}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(bus)}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ XEM: DẠNG THẺ TRỰC QUAN TINH GỌN (COMPACT CARDS) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '10px' }}>
          {paginatedBuses.map((bus) => {
            const isVan = bus.type && bus.type.toLowerCase().includes('limousine');
            const defaultImg = isVan ? DEFAULT_VAN_IMAGE : DEFAULT_SLEEPER_IMAGE;
            const imageSrc = bus.images && bus.images.length > 0 ? bus.images[0] : defaultImg;
            const isMaint = bus.activeStatus === 'maintenance' || bus.activeStatus === 'repairing' || bus.isMaintenance;

            return (
              <div
                key={bus._id}
                className="fleet-box"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ position: 'relative', height: '110px', width: '100%', overflow: 'hidden' }}>
                  <img
                    src={imageSrc}
                    alt={bus.plateNumber}
                    onError={(e) => { e.target.src = defaultImg; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: 'rgba(15, 23, 42, 0.85)', color: '#ffffff',
                    fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px'
                  }}>
                    GPS Trực tuyến
                  </div>
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: isMaint ? '#c2410c' : '#059669', color: '#ffffff',
                    fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px'
                  }}>
                    {isMaint ? 'Đang bảo dưỡng' : 'Sẵn sàng'}
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="plate-box">
                      {bus.plateNumber}
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#1d4ed8', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                      {bus.totalSeats} chỗ
                    </span>
                  </div>

                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.82rem' }}>
                    {bus.type}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '2px 0' }}>
                    {bus.amenities && bus.amenities.slice(0, 4).map((am, idx) => (
                      <span key={idx} className="amenity-chip">
                        {am}
                      </span>
                    ))}
                    {bus.amenities && bus.amenities.length > 4 && (
                      <span className="amenity-chip" style={{ background: '#e2e8f0', color: '#475569' }}>
                        +{bus.amenities.length - 4}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      onClick={() => setModalBus(bus)}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bus)}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VÙNG 4: PHÂN TRANG & TỔNG KẾT                             */}
      {/* ========================================================= */}
      {filteredBuses.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#ffffff', padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0',
          fontSize: '0.75rem', color: '#64748b'
        }}>
          <div>
            Hiển thị <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> - <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredBuses.length)}</strong> trên tổng số <strong>{filteredBuses.length}</strong> phương tiện
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                color: currentPage === 1 ? '#94a3b8' : '#0f172a', fontWeight: '700',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Trang trước
            </button>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#0f172a', fontWeight: '700',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Trang sau
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
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0',
            width: '100%', maxWidth: '400px', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
              {confirmModal.title}
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.78rem', color: '#64748b' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}
                style={{
                  padding: '0.45rem 0.95rem', borderRadius: '8px', border: 'none',
                  background: '#dc2626', color: '#ffffff', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetBusesPage;
