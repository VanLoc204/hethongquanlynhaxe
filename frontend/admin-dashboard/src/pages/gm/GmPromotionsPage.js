import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8000/api';

const GmPromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [stats, setStats] = useState({
    totalPromotions: 0,
    activePromotions: 0,
    totalUsages: 0,
    estimatedSavings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'fixed_amount',
    discountValue: '',
    maxDiscountAmount: '',
    minOrderValue: '',
    usageLimit: 100,
    startDate: '',
    endDate: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch Promotions from API
  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (typeFilter !== 'all') queryParams.append('discountType', typeFilter);

      const res = await fetch(`${API_BASE}/promotions?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPromotions(data.data || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setError(data.message || 'Không thể tải danh sách khuyến mãi.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  // Handle Toast Messages
  const showToast = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 3500);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 3500);
    }
  };

  // Open Modal for Creating
  const handleOpenCreateModal = () => {
    setEditingId(null);
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormData({
      code: '',
      title: '',
      description: '',
      discountType: 'fixed_amount',
      discountValue: '50000',
      maxDiscountAmount: '50000',
      minOrderValue: '200000',
      usageLimit: 100,
      startDate: today,
      endDate: nextMonth,
      status: 'active',
    });
    setShowModal(true);
  };

  // Open Modal for Editing
  const handleOpenEditModal = (promo) => {
    setEditingId(promo._id);
    setFormData({
      code: promo.code || '',
      title: promo.title || '',
      description: promo.description || '',
      discountType: promo.discountType || 'fixed_amount',
      discountValue: promo.discountValue ? String(promo.discountValue) : '',
      maxDiscountAmount: promo.maxDiscountAmount ? String(promo.maxDiscountAmount) : '',
      minOrderValue: promo.minOrderValue ? String(promo.minOrderValue) : '',
      usageLimit: promo.usageLimit || 100,
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '',
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '',
      status: promo.status || 'active',
    });
    setShowModal(true);
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (id, currentCode) => {
    try {
      const res = await fetch(`${API_BASE}/promotions/${id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã cập nhật trạng thái mã ${currentCode}`);
        fetchPromotions();
      } else {
        showToast(data.message || 'Lỗi khi đổi trạng thái', false);
      }
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, false);
    }
  };

  // Delete Promotion
  const handleDeletePromotion = async (id, code) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã khuyến mãi "${code}" không?`)) return;

    try {
      const res = await fetch(`${API_BASE}/promotions/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa thành công mã khuyến mãi ${code}`);
        fetchPromotions();
      } else {
        showToast(data.message || 'Không thể xóa mã khuyến mãi', false);
      }
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, false);
    }
  };

  // Submit Form (Create / Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.title || !formData.discountValue) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc (*)', false);
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId ? `${API_BASE}/promotions/${editingId}` : `${API_BASE}/promotions`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || (editingId ? 'Cập nhật mã thành công!' : 'Tạo mã khuyến mãi thành công!'));
        setShowModal(false);
        fetchPromotions();
      } else {
        showToast(data.message || 'Lỗi lưu thông tin', false);
      }
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatVND = (num) => {
    if (!num) return '0đ';
    return Number(num).toLocaleString('vi-VN') + 'đ';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
      {/* Toast Alerts */}
      {success && (
        <div style={{
          position: 'fixed', top: '70px', right: '20px', zIndex: 9999,
          backgroundColor: '#10b981', color: '#ffffff', padding: '10px 18px',
          borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div style={{
          position: 'fixed', top: '70px', right: '20px', zIndex: 9999,
          backgroundColor: '#ef4444', color: '#ffffff', padding: '10px 18px',
          borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            Quản lý khuyến mãi
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '3px 0 0 0', whiteSpace: 'nowrap' }}>
            Thiết lập mã giảm giá, voucher kích cầu và chiến dịch Marketing cho hệ thống nhà xe An Bỉnh Lines
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
            padding: '9px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Thêm mã khuyến mãi</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem', marginBottom: '1.25rem'
      }}>
        {/* Card 1 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              Tổng chương trình
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
            {stats.totalPromotions} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>mã</span>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              Đang hoạt động
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
            {stats.activePromotions} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>chiến dịch</span>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              Lượt đã sử dụng
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
            {stats.totalUsages.toLocaleString('vi-VN')} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>lượt</span>
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              Ngân sách trợ giá
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#9333ea', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
            {formatVND(stats.estimatedSavings)}
          </div>
        </div>
      </div>

      {/* Filter & Action Panel */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px 12px 0 0', padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm theo mã voucher hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '7px 12px 7px 36px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none',
                backgroundColor: '#f8fafc', color: '#1e293b'
              }}
            />
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
              fontSize: '0.82rem', backgroundColor: '#ffffff', color: '#1e293b', fontWeight: '600'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang chạy</option>
            <option value="inactive">Tạm dừng</option>
            <option value="expired">Hết hạn</option>
          </select>

          {/* Filter Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
              fontSize: '0.82rem', backgroundColor: '#ffffff', color: '#1e293b', fontWeight: '600'
            }}
          >
            <option value="all">Tất cả loại ưu đãi</option>
            <option value="fixed_amount">Giảm tiền cố định (VND)</option>
            <option value="percentage">Giảm theo %</option>
          </select>
        </div>

        <button
          onClick={fetchPromotions}
          style={{
            backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1',
            padding: '7px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span>Làm mới</span>
        </button>
      </div>

      {/* Main Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '0 0 12px 12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1rem', fontWeight: '600' }}>Đang tải danh sách mã khuyến mãi...</div>
          </div>
        ) : promotions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '8px' }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>Không tìm thấy mã khuyến mãi nào</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Thử thay đổi bộ lọc tìm kiếm hoặc thêm mã mới</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>MÃ VOUCHER</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>TÊN CHƯƠNG TRÌNH / MÔ TẢ</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>MỨC GIẢM GIÁ</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>ĐIỀU KIỆN ĐƠN</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>LƯỢT SỬ DỤNG</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>THỜI GIAN ÁP DỤNG</th>
                <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => {
                const isExpired = new Date() > new Date(promo.endDate) || promo.status === 'expired';
                const usagePct = promo.usageLimit > 0 ? Math.min(100, Math.round((promo.usedCount / promo.usageLimit) * 100)) : 0;

                return (
                  <tr key={promo._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'backgroundColor 0.15s ease' }}>
                    {/* Code Badge */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 10px',
                        borderRadius: '6px', fontFamily: 'monospace', fontWeight: '800',
                        fontSize: '0.85rem', letterSpacing: '0.5px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        {promo.code}
                      </span>
                    </td>

                    {/* Title & Description */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', minWidth: '220px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.84rem' }}>
                        {promo.title}
                      </div>
                      {promo.description && (
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.3' }}>
                          {promo.description}
                        </div>
                      )}
                    </td>

                    {/* Discount Value */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {promo.discountType === 'percentage' ? (
                        <div>
                          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                            Giảm {promo.discountValue}%
                          </span>
                          {promo.maxDiscountAmount > 0 && (
                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '3px' }}>
                              Tối đa {formatVND(promo.maxDiscountAmount)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                          Giảm {formatVND(promo.discountValue)}
                        </span>
                      )}
                    </td>

                    {/* Minimum Order Value */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '600', color: '#334155' }}>
                        {promo.minOrderValue > 0 ? `Tối thiểu ${formatVND(promo.minOrderValue)}` : 'Không giới hạn'}
                      </div>
                    </td>

                    {/* Usage Progress */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap', minWidth: '130px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                        <span>{promo.usedCount} / {promo.usageLimit}</span>
                        <span>{usagePct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${usagePct}%`, height: '100%',
                          backgroundColor: usagePct >= 90 ? '#ef4444' : usagePct >= 60 ? '#f59e0b' : '#3b82f6',
                          borderRadius: '3px', transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </td>

                    {/* Date Range */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ color: '#334155', fontWeight: '600', fontSize: '0.78rem' }}>
                        {formatDate(promo.startDate)}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                        đến {formatDate(promo.endDate)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {isExpired ? (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '3px 9px', borderRadius: '12px', fontWeight: '700', fontSize: '0.73rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></span>
                          Hết hạn
                        </span>
                      ) : promo.status === 'active' ? (
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '12px', fontWeight: '700', fontSize: '0.73rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                          Đang chạy
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 9px', borderRadius: '12px', fontWeight: '700', fontSize: '0.73rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                          Tạm dừng
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* Toggle Status Switch */}
                        <button
                          onClick={() => handleToggleStatus(promo._id, promo.code)}
                          title={promo.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                          style={{
                            padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1',
                            backgroundColor: promo.status === 'active' ? '#fff7ed' : '#f0fdf4',
                            color: promo.status === 'active' ? '#c2410c' : '#15803d',
                            fontWeight: '700', fontSize: '0.72rem', cursor: 'pointer'
                          }}
                        >
                          {promo.status === 'active' ? 'Tạm dừng' : 'Bật'}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(promo)}
                          title="Chỉnh sửa"
                          style={{
                            padding: '5px', borderRadius: '6px', border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff', color: '#2563eb', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeletePromotion(promo._id, promo.code)}
                          title="Xóa"
                          style={{
                            padding: '5px', borderRadius: '6px', border: '1px solid #fca5a5',
                            backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Create / Edit */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '580px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden', border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.1rem 1.4rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  {editingId ? 'Chỉnh sửa mã khuyến mãi' : 'Tạo mới mã khuyến mãi'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Nhập thông tin chi tiết chương trình ưu đãi bên dưới
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '1.2rem 1.4rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    MÃ VOUCHER *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: ANBINH2026"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.85rem', fontWeight: '800', fontFamily: 'monospace', color: '#2563eb', outline: 'none'
                    }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    TRẠNG THÁI
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', fontWeight: '600', color: '#1e293b'
                    }}
                  >
                    <option value="active">Đang chạy (Active)</option>
                    <option value="inactive">Tạm dừng (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  TÊN CHƯƠNG TRÌNH KHUYẾN MÃI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chào Xuân 2026 - Giảm 50.000đ trực tiếp"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.82rem', color: '#1e293b', outline: 'none'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  MÔ TẢ CHI TIẾT
                </label>
                <textarea
                  rows="2"
                  placeholder="Mô tả điều kiện và lợi ích của chương trình..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.82rem', color: '#1e293b', outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              {/* Discount Type & Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    LOẠI GIẢM GIÁ
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', fontWeight: '600', color: '#1e293b'
                    }}
                  >
                    <option value="fixed_amount">Giảm tiền cố định (VND)</option>
                    <option value="percentage">Giảm theo tỷ lệ (%)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    MỨC GIẢM * ({formData.discountType === 'percentage' ? '%' : 'VNĐ'})
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder={formData.discountType === 'percentage' ? 'VD: 15' : 'VD: 50000'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Conditions: Min Order & Max Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    ĐƠN HÀNG TỐI THIỂU (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 200000"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', color: '#1e293b', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    GIẢM TỐI ĐA (VNĐ, cho %)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 100000 (0: Không trần)"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    disabled={formData.discountType !== 'percentage'}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', color: '#1e293b', outline: 'none',
                      backgroundColor: formData.discountType !== 'percentage' ? '#f1f5f9' : '#ffffff'
                    }}
                  />
                </div>
              </div>

              {/* Usage Limit & Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    GIỚI HẠN LƯỢT DÙNG
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', color: '#1e293b', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    NGÀY BẮT ĐẦU *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', color: '#1e293b', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    NGÀY KẾT THÚC *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', color: '#1e293b', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.82rem',
                    cursor: submitting ? 'wait' : 'pointer', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  {submitting ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo mã mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GmPromotionsPage;
