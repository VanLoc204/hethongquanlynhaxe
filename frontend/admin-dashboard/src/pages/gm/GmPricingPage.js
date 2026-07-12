import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const DAYS_MAP = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const GmPricingPage = () => {
  const { token } = useContext(AuthContext);
  const [rules, setRules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // null = add new
  const [toast, setToast] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [routeId, setRouteId] = useState('all');
  const [busType, setBusType] = useState('all');
  const [dayOfWeek, setDayOfWeek] = useState([]); // Array of numbers
  const [adjustmentType, setAdjustmentType] = useState('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [isActive, setIsActive] = useState(true);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/rules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
      }
    } catch {
      showToast('Không thể tải danh sách quy định giá.', 'error');
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

  useEffect(() => {
    if (token) {
      fetchRules();
      fetchRoutes();
    }
  }, [token]);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setName('');
    setRouteId('all');
    setBusType('all');
    setDayOfWeek([]);
    setAdjustmentType('percentage');
    setAdjustmentValue('');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setName(rule.name || '');
    setRouteId(rule.routeId || 'all');
    setBusType(rule.busType || 'all');
    setDayOfWeek(rule.dayOfWeek || []);
    setAdjustmentType(rule.adjustmentType || 'percentage');
    setAdjustmentValue(rule.adjustmentValue || '');
    setIsActive(rule.isActive !== undefined ? rule.isActive : true);
    setShowModal(true);
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Xóa quy định giá "${rule.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/pricing/rules/${rule._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Xóa quy định giá thành công!');
        fetchRules();
      } else {
        showToast(data.message || 'Lỗi xóa quy định giá.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleToggleDay = (dayNum) => {
    if (dayOfWeek.includes(dayNum)) {
      setDayOfWeek(dayOfWeek.filter(d => d !== dayNum));
    } else {
      setDayOfWeek([...dayOfWeek, dayNum].sort());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || adjustmentValue === '') {
      showToast('Vui lòng điền tên quy định và giá trị điều chỉnh.', 'error');
      return;
    }

    // Find routeName if specific route selected
    let routeName = 'Tất cả các tuyến';
    if (routeId !== 'all') {
      const found = routes.find(r => r._id === routeId);
      if (found) {
        routeName = `${found.startPoint} → ${found.endPoint}`;
      }
    }

    const payload = {
      name,
      routeId,
      routeName,
      busType,
      dayOfWeek,
      adjustmentType,
      adjustmentValue: Number(adjustmentValue),
      isActive
    };

    try {
      const url = editingRule 
        ? `${API_BASE}/pricing/rules/${editingRule._id}`
        : `${API_BASE}/pricing/rules`;
      const method = editingRule ? 'PUT' : 'POST';

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
        showToast(editingRule ? 'Cập nhật quy định thành công!' : 'Tạo quy định mới thành công!');
        setShowModal(false);
        fetchRules();
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
          <h2>Quản lý giá vé</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Thiết lập điều chỉnh giá vé linh hoạt theo thời gian, loại xe và tuyến đường
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          + Thêm quy định giá mới
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải danh sách quy định giá...
        </div>
      ) : rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Chưa có quy định điều chỉnh giá nào. Nhấn nút để bắt đầu tạo.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <th style={{ padding: '12px' }}>Tên quy định</th>
                <th style={{ padding: '12px' }}>Tuyến áp dụng</th>
                <th style={{ padding: '12px' }}>Loại xe</th>
                <th style={{ padding: '12px' }}>Ngày áp dụng</th>
                <th style={{ padding: '12px' }}>Mức điều chỉnh</th>
                <th style={{ padding: '12px' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const daysLabel = rule.dayOfWeek.length === 0 
                  ? 'Tất cả các ngày' 
                  : rule.dayOfWeek.map(d => DAYS_MAP[d]).join(', ');

                const adjustLabel = rule.adjustmentType === 'percentage' 
                  ? `${rule.adjustmentValue > 0 ? '+' : ''}${rule.adjustmentValue}%`
                  : `${rule.adjustmentValue > 0 ? '+' : ''}${rule.adjustmentValue.toLocaleString('vi-VN')} đ`;

                return (
                  <tr key={rule._id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                    <td style={{ padding: '14px 12px', fontWeight: '700' }}>{rule.name}</td>
                    <td style={{ padding: '14px 12px' }}>{rule.routeName}</td>
                    <td style={{ padding: '14px 12px', fontWeight: '600' }}>
                      {rule.busType === 'all' ? 'Tất cả các xe' : rule.busType}
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {daysLabel}
                    </td>
                    <td style={{ 
                      padding: '14px 12px', 
                      fontWeight: '800', 
                      color: rule.adjustmentValue >= 0 ? '#10b981' : '#ef4444' 
                    }}>
                      {adjustLabel}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                        backgroundColor: rule.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                        color: rule.isActive ? '#10b981' : '#9ca3af'
                      }}>
                        {rule.isActive ? 'Kích hoạt' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleOpenEdit(rule)} 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => handleDelete(rule)} 
                          className="btn btn-secondary" 
                          style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '6px 12px', fontSize: '0.8rem' }}
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
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '550px', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>
              {editingRule ? 'Cập nhật quy định điều chỉnh giá' : 'Thêm quy định giá mới'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Tên quy định *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ví dụ: Phụ thu cuối tuần thứ Bảy & Chủ Nhật"
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Tuyến đường áp dụng</label>
                  <select 
                    className="form-control" 
                    value={routeId} 
                    onChange={(e) => setRouteId(e.target.value)}
                  >
                    <option value="all">Tất cả các tuyến</option>
                    {routes.map(r => (
                      <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Loại xe áp dụng</label>
                  <select 
                    className="form-control" 
                    value={busType} 
                    onChange={(e) => setBusType(e.target.value)}
                  >
                    <option value="all">Tất cả các loại xe</option>
                    <option value="Giường nằm">Giường nằm</option>
                    <option value="Ghế ngồi">Ghế ngồi</option>
                    <option value="Limousine">Limousine</option>
                  </select>
                </div>
              </div>

              {/* Day of Week checkbox grid */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                  Ngày áp dụng trong tuần (Để trống nếu áp dụng tất cả các ngày)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[1, 2, 3, 4, 5, 6, 0].map(dayNum => (
                    <label key={dayNum} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={dayOfWeek.includes(dayNum)} 
                        onChange={() => handleToggleDay(dayNum)} 
                      />
                      {DAYS_MAP[dayNum]}
                    </label>
                  ))}
                </div>
              </div>

              {/* Adjustments */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Hình thức điều chỉnh *</label>
                  <select 
                    className="form-control" 
                    value={adjustmentType} 
                    onChange={(e) => setAdjustmentType(e.target.value)}
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="flat">Giá trị tuyệt đối (đ)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Giá trị tăng/giảm *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={adjustmentValue} 
                    onChange={(e) => setAdjustmentValue(e.target.value)} 
                    placeholder={adjustmentType === 'percentage' ? 'Ví dụ: 10 (tức +10%) hoặc -5' : 'Ví dụ: 50000 hoặc -30000'}
                    required 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={(e) => setIsActive(e.target.checked)} 
                  />
                  Kích hoạt quy định ngay lập tức
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRule ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default GmPricingPage;
