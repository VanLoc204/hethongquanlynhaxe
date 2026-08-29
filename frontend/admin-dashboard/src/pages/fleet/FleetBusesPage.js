import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import BusModal from '../../components/BusModal';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';
const API_BASE = 'http://localhost:8000/api/v1';

const FleetBusesPage = () => {
  const { token } = useContext(AuthContext);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalBus, setModalBus] = useState(undefined); // undefined=closed, null=add new, object=edit
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

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
      if (data.success) setBuses(data.buses);
    } catch (err) {
      showToast('Không thể tải danh sách xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBuses(); }, []);

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
    showToast(modalBus ? 'Cập nhật xe thành công!' : 'Thêm xe mới thành công!');
    fetchBuses();
  };

  return (
    <section className="panel" style={{ minHeight: '400px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bus-management-header">
        <div>
          <h2>Danh sách xe buýt đang quản lý</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {buses.length} phương tiện trong hệ thống
          </p>
        </div>
        <button onClick={() => setModalBus(null)} className="btn btn-primary">
          + Thêm xe mới
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải thông tin đội xe...
        </div>
      ) : buses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Chưa có phương tiện nào. Nhấn "Thêm xe mới" để bắt đầu.
        </div>
      ) : (
        <div className="bus-list-view">
          {buses.map((bus) => (
            <div key={bus._id} className="bus-row-card">
              <img
                src={bus.images?.[0] || DEFAULT_IMAGE}
                alt={bus.plateNumber}
                className="bus-row-image"
                onError={e => { e.target.src = DEFAULT_IMAGE; }}
              />
              <div className="bus-row-content">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                  <div className="bus-card-title" style={{ justifyContent: 'flex-start', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>{bus.plateNumber}</h3>
                    <span className="bus-type-badge">{bus.type}</span>
                    {bus.status && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        backgroundColor: bus.status === 'approved' ? '#ecfdf5' : bus.status === 'rejected' ? '#fee2e2' : '#fff7ed',
                        color: bus.status === 'approved' ? '#047857' : bus.status === 'rejected' ? '#b91c1c' : '#c2410c',
                        border: bus.status === 'approved' ? '1px solid #a7f3d0' : bus.status === 'rejected' ? '1px solid #fca5a5' : '1px solid #fed7aa'
                      }}>
                        {bus.status === 'approved' && 'Đã duyệt'}
                        {bus.status === 'rejected' && 'Từ chối'}
                        {bus.status === 'pending' && 'Chờ duyệt'}
                      </span>
                    )}
                  </div>

                  <div className="bus-stats-row">
                    <span><strong>{bus.totalSeats}</strong> chỗ ngồi</span>
                    <span>•</span>
                    <span>{bus.amenities?.length || 0} tiện ích</span>
                  </div>

                  {bus.amenities?.length > 0 && (
                    <div className="bus-amenities-list">
                      {bus.amenities.slice(0, 8).map((am, i) => (
                        <span key={i} className="amenity-tag">{am}</span>
                      ))}
                      {bus.amenities.length > 8 && (
                        <span className="amenity-tag">+{bus.amenities.length - 8} khác</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    onClick={() => setModalBus(bus)}
                    className="btn btn-secondary"
                    style={{ minWidth: '80px', padding: '0.5rem 1rem' }}
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(bus)}
                    className="btn btn-danger"
                    style={{ minWidth: '80px', padding: '0.5rem 1rem' }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalBus !== undefined && (
        <BusModal
          bus={modalBus}
          token={token}
          onClose={() => setModalBus(undefined)}
          onSaved={handleSaved}
        />
      )}

      {confirmModal.show && (
        <div className="confirm-backdrop">
          <div className="confirm-card">
            <div className="confirm-header">{confirmModal.title}</div>
            <div className="confirm-body">{confirmModal.message}</div>
            <div className="confirm-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FleetBusesPage;
