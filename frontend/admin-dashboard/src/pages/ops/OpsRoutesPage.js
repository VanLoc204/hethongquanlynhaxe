import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const OpsRoutesPage = () => {
  const { token } = useContext(AuthContext);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null); // null = add new, object = edit
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Form states
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');

  const getStatusBadge = (status) => {
    switch (status || 'approved') {
      case 'approved':
        return <span style={{ background: '#ecfdf5', color: '#047857', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>Đã duyệt</span>;
      case 'rejected':
        return <span style={{ background: '#fef2f2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>Từ chối</span>;
      default:
        return <span style={{ background: '#fff7ed', color: '#c2410c', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>Chờ duyệt</span>;
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/ops/routes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRoutes(data.routes);
      } else {
        showToast(data.message || 'Lỗi tải danh sách tuyến đường.', 'error');
      }
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoutes();
    }
  }, [token]);

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setStartPoint('');
    setEndPoint('');
    setDistance('');
    setDuration('');
    setShowModal(true);
  };

  const handleOpenEdit = (route) => {
    setEditingRoute(route);
    setStartPoint(route.startPoint);
    setEndPoint(route.endPoint);
    setDistance(route.distance);
    setDuration(route.duration);
    setShowModal(true);
  };

  const handleDelete = (route) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa tuyến đường',
      message: `Bạn có chắc chắn muốn xóa tuyến đường ${route.startPoint} - ${route.endPoint}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/trips/ops/routes/${route._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Xóa tuyến đường thành công!');
            fetchRoutes();
          } else {
            showToast(data.message || 'Lỗi xóa tuyến đường.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startPoint.trim() || !endPoint.trim() || !distance.trim() || !duration.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin.', 'error');
      return;
    }

    const payload = {
      startPoint: startPoint.trim(),
      endPoint: endPoint.trim(),
      distance: distance.trim(),
      duration: duration.trim()
    };

    try {
      const url = editingRoute 
        ? `${API_BASE}/trips/ops/routes/${editingRoute._id}`
        : `${API_BASE}/trips/ops/routes`;
      const method = editingRoute ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingRoute ? 'Cập nhật tuyến đường thành công!' : 'Tạo tuyến đường mới thành công!');
        setShowModal(false);
        fetchRoutes();
      } else {
        showToast(data.message || 'Lỗi xử lý yêu cầu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Quản lý tuyến đường</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {routes.length} tuyến đường đang khai thác
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          + Thêm tuyến đường
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải danh sách tuyến đường...
        </div>
      ) : routes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Chưa có tuyến đường nào. Nhấn "Thêm tuyến đường" để bắt đầu.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <th style={{ padding: '12px' }}>Điểm đi</th>
            <th style={{ padding: '12px' }}>Điểm đến</th>
            <th style={{ padding: '12px' }}>Khoảng cách</th>
            <th style={{ padding: '12px' }}>Thời gian đi</th>
            <th style={{ padding: '12px' }}>Trạng thái</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr key={route._id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
              <td style={{ padding: '14px 12px', fontWeight: '600' }}>{route.startPoint}</td>
              <td style={{ padding: '14px 12px', fontWeight: '600' }}>{route.endPoint}</td>
              <td style={{ padding: '14px 12px' }}>{route.distance}</td>
              <td style={{ padding: '14px 12px' }}>{route.duration}</td>
              <td style={{ padding: '14px 12px' }}>{getStatusBadge(route.status)}</td>
              <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                <button 
                  onClick={() => handleOpenEdit(route)} 
                  className="btn btn-secondary" 
                  style={{ marginRight: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Sửa
                </button>
                <button 
                  onClick={() => handleDelete(route)} 
                  className="btn btn-secondary" 
                  style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }}>
            <h3 style={{ marginBottom: '20px' }}>
              {editingRoute ? 'Cập nhật tuyến đường' : 'Thêm tuyến đường mới'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Điểm đi</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={startPoint} 
                  onChange={(e) => setStartPoint(e.target.value)} 
                  placeholder="Ví dụ: Hồ Chí Minh"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Điểm đến</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={endPoint} 
                  onChange={(e) => setEndPoint(e.target.value)} 
                  placeholder="Ví dụ: Đà Lạt"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Khoảng cách (km)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={distance} 
                  onChange={(e) => setDistance(e.target.value)} 
                  placeholder="Ví dụ: 305km"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Thời gian đi dự kiến</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={duration} 
                  onChange={(e) => setDuration(e.target.value)} 
                  placeholder="Ví dụ: 7 giờ"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRoute ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
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

export default OpsRoutesPage;
