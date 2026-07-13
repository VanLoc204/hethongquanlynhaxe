import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const OpsTripsPage = () => {
  const { token } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null); // null = add new, object = edit
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Form states
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState('');
  
  // Pickup / Dropoff subforms
  const [pickupPoints, setPickupPoints] = useState([
    { time: '08:00', location: 'Văn Phòng Tân Bình', address: '266 Đồng Đen, Phường 10, Tân Bình, Hồ Chí Minh' }
  ]);
  const [dropoffPoints, setDropoffPoints] = useState([
    { time: '15:30', location: 'Văn Phòng Đà Lạt', address: 'Văn phòng Đà Lạt, Lâm Đồng' }
  ]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/ops/trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips);
      }
    } catch {
      showToast('Không thể tải danh sách chuyến xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/ops/routes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setRoutes(data.routes);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBuses = async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBuses(data.buses);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrips();
      fetchRoutes();
      fetchBuses();
    }
  }, [token]);

  // Auto-fetch price when routeId or busId changes
  useEffect(() => {
    const fetchBasePrice = async () => {
      if (!routeId || !busId) return;
      try {
        const res = await fetch(`${API_BASE}/pricing/base-prices/lookup?routeId=${routeId}&busId=${busId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.price !== null) {
          setPrice(data.price);
        } else {
          setPrice('');
        }
      } catch (err) {
        console.error('Lỗi tải giá vé cơ bản:', err);
      }
    };
    fetchBasePrice();
  }, [routeId, busId, token]);

  // Helper to format ISO datetime to local string suitable for input
  const formatDatetimeForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzoffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleOpenAdd = () => {
    setEditingTrip(null);
    setRouteId(routes[0]?._id || '');
    setBusId(buses[0]?._id || '');
    setDepartureTime('');
    setArrivalTime('');
    setPrice('');
    setPickupPoints([
      { time: '08:00', location: 'Trạm Đi', address: 'Địa chỉ xuất phát' }
    ]);
    setDropoffPoints([
      { time: '15:00', location: 'Trạm Đến', address: 'Địa chỉ kết thúc' }
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (trip) => {
    setEditingTrip(trip);
    setRouteId(trip.routeId?._id || '');
    setBusId(trip.busId?._id || '');
    setDepartureTime(formatDatetimeForInput(trip.departureTime));
    setArrivalTime(formatDatetimeForInput(trip.arrivalTime));
    setPrice(trip.price);
    setPickupPoints(trip.pickupPoints || []);
    setDropoffPoints(trip.dropoffPoints || []);
    setShowModal(true);
  };

  const handleDelete = (trip) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa chuyến xe',
      message: `Bạn có chắc chắn muốn xóa chuyến xe ngày ${new Date(trip.departureTime).toLocaleDateString('vi-VN')}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/trips/ops/trips/${trip._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Xóa chuyến xe thành công!');
            fetchTrips();
          } else {
            showToast(data.message || 'Lỗi xóa chuyến xe.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  const handleAddPickupPoint = () => {
    setPickupPoints([...pickupPoints, { time: '', location: '', address: '' }]);
  };

  const handleRemovePickupPoint = (idx) => {
    setPickupPoints(pickupPoints.filter((_, i) => i !== idx));
  };

  const handlePickupChange = (idx, field, val) => {
    const updated = [...pickupPoints];
    updated[idx][field] = val;
    setPickupPoints(updated);
  };

  const handleAddDropoffPoint = () => {
    setDropoffPoints([...dropoffPoints, { time: '', location: '', address: '' }]);
  };

  const handleRemoveDropoffPoint = (idx) => {
    setDropoffPoints(dropoffPoints.filter((_, i) => i !== idx));
  };

  const handleDropoffChange = (idx, field, val) => {
    const updated = [...dropoffPoints];
    updated[idx][field] = val;
    setDropoffPoints(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!routeId || !busId || !departureTime || !arrivalTime || !price) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    const payload = {
      routeId,
      busId,
      departureTime,
      arrivalTime,
      price: Number(price),
      pickupPoints,
      dropoffPoints
    };

    try {
      const url = editingTrip 
        ? `${API_BASE}/trips/ops/trips/${editingTrip._id}`
        : `${API_BASE}/trips/ops/trips`;
      const method = editingTrip ? 'PUT' : 'POST';

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
        showToast(editingTrip ? 'Cập nhật chuyến xe thành công!' : 'Tạo chuyến xe mới thành công!');
        setShowModal(false);
        fetchTrips();
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
          <h2>Quản lý chuyến xe</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {trips.length} chuyến xe hoạt động
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          + Tạo chuyến xe mới
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải danh sách chuyến xe...
        </div>
      ) : trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Chưa có chuyến xe nào. Nhấn "Tạo chuyến xe mới" để bắt đầu.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {trips.map((trip) => {
            const departureDate = new Date(trip.departureTime);
            const arrivalDate = new Date(trip.arrivalTime);
            const totalSeats = trip.busId?.totalSeats || 0;
            const bookedSeatsCount = trip.bookedSeats?.length || 0;
            
            return (
              <div 
                key={trip._id} 
                className="panel" 
                style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px 20px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                {/* Left info: Route & DateTime */}
                <div style={{ minWidth: '220px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '6px' }}>
                    {trip.routeId ? `${trip.routeId.startPoint} → ${trip.routeId.endPoint}` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
                    Khởi hành: {departureDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Dự kiến đến: {arrivalDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                {/* Middle info: Bus Details */}
                <div style={{ minWidth: '180px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>
                    Xe: {trip.busId?.plateNumber || 'Chưa gán'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Loại: {trip.busId?.type || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '600' }}>
                    Đã đặt: {bookedSeatsCount}/{totalSeats} ghế (Còn {totalSeats - bookedSeatsCount} trống)
                  </div>
                </div>

                {/* Right info: Price & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '200px', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent)' }}>
                      {trip.price?.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleOpenEdit(trip)} 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={() => handleDelete(trip)} 
                      className="btn btn-secondary" 
                      style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '8px 14px', fontSize: '0.85rem' }}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <div 
            className="panel" 
            style={{ 
              width: '100%', 
              maxWidth: '650px', 
              padding: '24px', 
              margin: '40px auto', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              position: 'relative' 
            }}
          >
            <h3 style={{ marginBottom: '20px' }}>
              {editingTrip ? 'Cập nhật chuyến xe' : 'Tạo chuyến xe mới'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              {/* Route & Bus dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tuyến đường *</label>
                  <select 
                    className="form-control" 
                    value={routeId} 
                    onChange={(e) => setRouteId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn tuyến --</option>
                    {routes.map(r => (
                      <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Phương tiện (Xe) *</label>
                  <select 
                    className="form-control" 
                    value={busId} 
                    onChange={(e) => setBusId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn xe --</option>
                    {buses.map(b => (
                      <option key={b._id} value={b._id}>{b.plateNumber} ({b.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Times & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Giờ khởi hành *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={departureTime} 
                    onChange={(e) => setDepartureTime(e.target.value)} 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Giờ đến dự kiến *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={arrivalTime} 
                    onChange={(e) => setArrivalTime(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Giá vé (VNĐ) *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder={price === '' ? "Chưa thiết lập giá vé cho Tuyến & Loại xe này" : "Giá vé"}
                  disabled
                  required
                />
                <small style={{ color: price === '' ? '#ef4444' : '#10b981', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                  {price === '' 
                    ? "⚠️ Tuyến đường & loại xe này chưa được thiết lập giá vé bởi quản lý!" 
                    : "✓ Giá vé tự động áp dụng theo quy định của quản lý nhà xe."
                  }
                </small>
              </div>

              {/* Pickup points builder */}
              <div style={{ marginBottom: '20px', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>Điểm đón khách</h4>
                  <button type="button" onClick={handleAddPickupPoint} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                    + Thêm điểm đón
                  </button>
                </div>
                {pickupPoints.map((pt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Giờ (VD: 08:00)" 
                      value={pt.time} 
                      onChange={(e) => handlePickupChange(idx, 'time', e.target.value)}
                      style={{ width: '120px' }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Tên điểm đón" 
                      value={pt.location} 
                      onChange={(e) => handlePickupChange(idx, 'location', e.target.value)}
                      style={{ flex: 1 }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Địa chỉ chi tiết" 
                      value={pt.address} 
                      onChange={(e) => handlePickupChange(idx, 'address', e.target.value)}
                      style={{ flex: 1.5 }}
                      className="form-control"
                      required
                    />
                    {pickupPoints.length > 1 && (
                      <button type="button" onClick={() => handleRemovePickupPoint(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Dropoff points builder */}
              <div style={{ marginBottom: '24px', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>Điểm trả khách</h4>
                  <button type="button" onClick={handleAddDropoffPoint} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                    + Thêm điểm trả
                  </button>
                </div>
                {dropoffPoints.map((pt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Giờ (VD: 15:00)" 
                      value={pt.time} 
                      onChange={(e) => handleDropoffChange(idx, 'time', e.target.value)}
                      style={{ width: '120px' }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Tên điểm trả" 
                      value={pt.location} 
                      onChange={(e) => handleDropoffChange(idx, 'location', e.target.value)}
                      style={{ flex: 1 }}
                      className="form-control"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Địa chỉ chi tiết" 
                      value={pt.address} 
                      onChange={(e) => handleDropoffChange(idx, 'address', e.target.value)}
                      style={{ flex: 1.5 }}
                      className="form-control"
                      required
                    />
                    {dropoffPoints.length > 1 && (
                      <button type="button" onClick={() => handleRemoveDropoffPoint(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTrip ? 'Lưu thay đổi' : 'Tạo mới'}
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

export default OpsTripsPage;
