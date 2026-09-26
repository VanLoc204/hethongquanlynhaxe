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
  const [stops, setStops] = useState([]);

  // Hover Tooltip State
  const [hoveredRoute, setHoveredRoute] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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
    setStops([
      { name: '', address: '', type: 'start' },
      { name: '', address: '', type: 'end' }
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (route) => {
    setEditingRoute(route);
    setStartPoint(route.startPoint);
    setEndPoint(route.endPoint);
    setDistance(route.distance);
    setDuration(route.duration);
    if (route.stops && route.stops.length > 0) {
      setStops(route.stops);
    } else {
      setStops([
        { name: route.startPoint, address: '', type: 'start' },
        { name: route.endPoint, address: '', type: 'end' }
      ]);
    }
    setShowModal(true);
  };

  const handleAddStop = () => {
    setStops([...stops, { name: '', address: '', type: 'waypoint' }]);
  };

  const handleRemoveStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleStopChange = (index, field, value) => {
    const updated = [...stops];
    updated[index][field] = value;
    setStops(updated);
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

    // Filter valid stops
    const validStops = stops.filter(s => s.name && s.name.trim() !== '');

    const payload = {
      startPoint: startPoint.trim(),
      endPoint: endPoint.trim(),
      distance: distance.trim(),
      duration: duration.trim(),
      stops: validStops
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

  const handleMouseEnterRow = (e, route) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + window.scrollX + 250,
      y: rect.top + window.scrollY - 10
    });
    setHoveredRoute(route);
  };

  const handleMouseLeaveRow = () => {
    setHoveredRoute(null);
  };

  return (
    <section className="panel" style={{ minHeight: '400px', position: 'relative' }}>
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

      {/* Hover Itinerary Tooltip */}
      {hoveredRoute && (
        <div
          style={{
            position: 'absolute',
            top: `${tooltipPos.y - 140}px`,
            left: `${tooltipPos.x}px`,
            zIndex: 9999,
            width: '360px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(37, 99, 235, 0.08)',
            border: '1px solid #cbd5e1',
            padding: '16px 20px',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          {/* Header Tooltip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', pb: '10px', marginBottom: '12px' }}>
            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>
              Lộ trình chi tiết: <span style={{ color: '#2563eb' }}>{hoveredRoute.startPoint} → {hoveredRoute.endPoint}</span>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px', display: 'flex', gap: '12px' }}>
            <span>Khoảng cách ước tính: <strong style={{ color: '#0f172a' }}>{hoveredRoute.distance}</strong></span>
            <span>Thời gian: <strong style={{ color: '#0f172a' }}>{hoveredRoute.duration}</strong></span>
          </div>

          {/* Waypoints Timeline List */}
          {hoveredRoute.stops && hoveredRoute.stops.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              {/* Timeline Line */}
              <div style={{
                position: 'absolute',
                top: '8px',
                bottom: '8px',
                left: '6px',
                width: '2px',
                backgroundColor: '#cbd5e1',
                borderRadius: '1px'
              }} />

              {hoveredRoute.stops.map((stop, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: idx === hoveredRoute.stops.length - 1 ? 0 : '10px' }}>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-18px',
                    top: '4px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: stop.type === 'start' ? '#10b981' : stop.type === 'end' ? '#ef4444' : '#2563eb',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 0 2px rgba(37,99,235,0.2)'
                  }} />

                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{stop.name}</span>
                    {stop.type === 'start' && <span style={{ fontSize: '0.7rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '4px' }}>Điểm đầu</span>}
                    {stop.type === 'end' && <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>Điểm đích</span>}
                  </div>
                  {stop.address && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      {stop.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '20px' }}>
              <div style={{
                position: 'absolute',
                top: '8px',
                bottom: '8px',
                left: '6px',
                width: '2px',
                backgroundColor: '#cbd5e1'
              }} />
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <div style={{ position: 'absolute', left: '-18px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>Điểm xuất phát: {hoveredRoute.startPoint}</div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-18px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>Điểm đích: {hoveredRoute.endPoint}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '700' }}>Quản lý tuyến đường</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {routes.length} tuyến đường đang khai thác (Rê chuột vào dòng tuyến đường để xem lộ trình trạm dừng)
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary" style={{ fontWeight: '600', borderRadius: '10px' }}>
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
                <th style={{ padding: '12px' }}>Khoảng cách ước tính</th>
                <th style={{ padding: '12px' }}>Thời gian đi</th>
                <th style={{ padding: '12px' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr
                  key={route._id}
                  onMouseEnter={(e) => handleMouseEnterRow(e, route)}
                  onMouseLeave={handleMouseLeaveRow}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    verticalAlign: 'middle',
                    transition: 'background-color 0.2s ease',
                    cursor: 'pointer'
                  }}
                  className="route-row-hover"
                >
                  <td style={{ padding: '14px 12px', fontWeight: '600', color: '#0f172a' }}>{route.startPoint}</td>
                  <td style={{ padding: '14px 12px', fontWeight: '600', color: '#0f172a' }}>{route.endPoint}</td>
                  <td style={{ padding: '14px 12px' }}>{route.distance}</td>
                  <td style={{ padding: '14px 12px' }}>{route.duration}</td>
                  <td style={{ padding: '14px 12px' }}>{getStatusBadge(route.status)}</td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(route); }}
                      className="btn btn-secondary"
                      style={{ marginRight: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(route); }}
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
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '650px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '20px', color: '#0f172a', fontWeight: '700' }}>
              {editingRoute ? 'Cập nhật tuyến đường & Các trạm ghé' : 'Thêm tuyến đường & Trạm ghé mới'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Điểm đi</label>
                  <input
                    type="text"
                    className="form-control"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    placeholder="Ví dụ: Hồ Chí Minh"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Điểm đến</label>
                  <input
                    type="text"
                    className="form-control"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    placeholder="Ví dụ: Đà Lạt"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Khoảng cách ước tính (km)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="Ví dụ: 305km"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Thời gian đi dự kiến</label>
                  <input
                    type="text"
                    className="form-control"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ví dụ: 7 giờ"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Waypoints Section */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>
                    🏣 Danh sách Các điểm & Trạm xe sẽ ghé qua:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStop}
                    style={{
                      backgroundColor: '#2563eb', color: 'white', border: 'none',
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem',
                      fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    + Thêm trạm ghé
                  </button>
                </div>

                {stops.map((stop, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                    <select
                      value={stop.type}
                      onChange={(e) => handleStopChange(idx, 'type', e.target.value)}
                      style={{ padding: '6px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                    >
                      <option value="start">Khởi hành</option>
                      <option value="waypoint">Ghé trạm</option>
                      <option value="end">Điểm đích</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Tên trạm (Ví dụ: Trạm dừng chân Bảo Lộc)"
                      value={stop.name}
                      onChange={(e) => handleStopChange(idx, 'name', e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />

                    <input
                      type="text"
                      placeholder="Địa chỉ chi tiết (Tùy chọn)"
                      value={stop.address}
                      onChange={(e) => handleStopChange(idx, 'address', e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />

                    {stops.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(idx)}
                        style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ borderRadius: '8px' }}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', fontWeight: '600' }}>
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
