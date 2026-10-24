import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import GmDynamicPricingPage from './GmDynamicPricingPage';
import { getBranchName } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api/v1';
const DAYS_MAP = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const GmPricingPage = () => {
  const { token } = useContext(AuthContext);

  // Navigation tabs: 'rules', 'base-prices', or 'dynamic-suggestions'
  const [activeTab, setActiveTab] = useState('base-prices');

  // Rules states
  const [rules, setRules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Filters for Rules
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleTypeFilter, setRuleTypeFilter] = useState('all');
  const [ruleStatusFilter, setRuleStatusFilter] = useState('all');

  // Form states (Rules)
  const [name, setName] = useState('');
  const [routeId, setRouteId] = useState('all');
  const [busType, setBusType] = useState('all');
  const [dayOfWeek, setDayOfWeek] = useState([]);
  const [adjustmentType, setAdjustmentType] = useState('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Base Prices states
  const [basePrices, setBasePrices] = useState([]);
  const [loadingBasePrices, setLoadingBasePrices] = useState(false);
  const [showBasePriceModal, setShowBasePriceModal] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [newBasePrice, setNewBasePrice] = useState('');

  // Filters for Base Prices
  const [baseSearch, setBaseSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('all');
  const [selectedBusTypeFilter, setSelectedBusTypeFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

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
        setRules(data.rules || []);
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
      if (data.success) setRoutes(data.routes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBasePrices = async () => {
    setLoadingBasePrices(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/base-prices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBasePrices(data.basePrices || []);
      }
    } catch {
      showToast('Không thể tải danh sách giá vé cơ bản.', 'error');
    } finally {
      setLoadingBasePrices(false);
    }
  };

  // Pricing Proposals states
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/proposals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleApproveProposal = async (propId) => {
    if (!window.confirm('Bạn có chắc chắn muốn phê duyệt đề xuất giá vé này và tự động áp dụng vào hệ thống?')) return;
    try {
      const res = await fetch(`${API_BASE}/pricing/proposals/${propId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã phê duyệt đề xuất và tự động cập nhật giá vé thành công!');
        fetchProposals();
        fetchBasePrices();
        fetchRules();
      } else {
        showToast(data.message || 'Lỗi phê duyệt.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleRejectProposal = async (propId) => {
    const note = window.prompt('Nhập lý do từ chối đề xuất giá vé (tùy chọn):', 'Giá đề xuất chưa phù hợp với kế hoạch doanh thu.');
    if (note === null) return;
    try {
      const res = await fetch(`${API_BASE}/pricing/proposals/${propId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected', reviewNote: note })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã từ chối đề xuất giá vé.');
        fetchProposals();
      } else {
        showToast(data.message || 'Lỗi từ chối.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoutes();
      fetchRules();
      fetchBasePrices();
      fetchProposals();
    }
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, baseSearch, selectedRouteFilter, selectedBusTypeFilter, ruleSearch, ruleTypeFilter, ruleStatusFilter]);

  // Handle Rule toggle directly
  const handleToggleRuleActive = async (rule) => {
    try {
      const res = await fetch(`${API_BASE}/pricing/rules/${rule._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...rule,
          isActive: !rule.isActive
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã ${!rule.isActive ? 'kích hoạt' : 'tạm ngưng'} quy định "${rule.name}"`);
        fetchRules();
      }
    } catch {
      showToast('Lỗi cập nhật trạng thái quy định.', 'error');
    }
  };

  const handleOpenAddRule = () => {
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

  const handleOpenEditRule = (rule) => {
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

  const handleDeleteRule = (rule) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa quy định giá',
      message: `Bạn có chắc chắn muốn xóa quy định giá "${rule.name}"?`,
      onConfirm: async () => {
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
      }
    });
  };

  const handleToggleDay = (dayNum) => {
    if (dayOfWeek.includes(dayNum)) {
      setDayOfWeek(dayOfWeek.filter(d => d !== dayNum));
    } else {
      setDayOfWeek([...dayOfWeek, dayNum].sort());
    }
  };

  const handleSubmitRule = async (e) => {
    e.preventDefault();
    if (!name || adjustmentValue === '') {
      showToast('Vui lòng điền tên quy định và giá trị điều chỉnh.', 'error');
      return;
    }

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

  // Base Prices logic
  const handleOpenBasePriceEdit = (combo) => {
    setSelectedCombo(combo);
    setNewBasePrice(combo.price || combo.recommendedPrice || '');
    setShowBasePriceModal(true);
  };

  const handleBasePriceSubmit = async (e) => {
    e.preventDefault();
    if (newBasePrice === '' || Number(newBasePrice) < 0) {
      showToast('Vui lòng nhập giá vé cơ bản hợp lệ.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/pricing/base-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          routeId: selectedCombo.routeId,
          routeName: selectedCombo.routeName,
          busType: selectedCombo.busType,
          price: Number(newBasePrice)
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Thiết lập giá vé cơ bản thành công!');
        setShowBasePriceModal(false);
        fetchBasePrices();
      } else {
        showToast(data.message || 'Lỗi thiết lập giá vé.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  // Export to Excel trigger placeholder
  const handleExportExcel = () => {
    showToast('Đang kết xuất tệp bảng giá Excel thực tế từ MongoDB...', 'success');
  };

  // Calculated Stats
  const activeRulesCount = rules.filter(r => r.isActive).length;
  const setBasePricesList = basePrices.filter(bp => bp.isSet);
  const avgBasePrice = setBasePricesList.length > 0
    ? Math.round(setBasePricesList.reduce((acc, cur) => acc + (cur.price || 0), 0) / setBasePricesList.length)
    : 215000;

  // Filtered Base Prices
  const filteredBasePrices = basePrices.filter(bp => {
    const matchSearch =
      bp.routeName.toLowerCase().includes(baseSearch.toLowerCase()) ||
      bp.busType.toLowerCase().includes(baseSearch.toLowerCase()) ||
      (bp.startStation && bp.startStation.toLowerCase().includes(baseSearch.toLowerCase())) ||
      (bp.endStation && bp.endStation.toLowerCase().includes(baseSearch.toLowerCase()));

    const matchRoute = selectedRouteFilter === 'all' || bp.routeId === selectedRouteFilter;
    const matchBusType = selectedBusTypeFilter === 'all' || bp.busType === selectedBusTypeFilter;

    return matchSearch && matchRoute && matchBusType;
  });

  // Filtered Rules
  const filteredRules = rules.filter(r => {
    const matchSearch =
      r.name.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.routeName.toLowerCase().includes(ruleSearch.toLowerCase()) ||
      r.busType.toLowerCase().includes(ruleSearch.toLowerCase());

    const matchType = ruleTypeFilter === 'all' ||
      (ruleTypeFilter === 'percentage' && r.adjustmentType === 'percentage') ||
      (ruleTypeFilter === 'flat' && r.adjustmentType === 'flat');

    const matchStatus = ruleStatusFilter === 'all' ||
      (ruleStatusFilter === 'active' && r.isActive) ||
      (ruleStatusFilter === 'inactive' && !r.isActive);

    return matchSearch && matchType && matchStatus;
  });

  // Unique Bus Types for Dropdown
  const uniqueBusTypes = Array.from(new Set(basePrices.map(bp => bp.busType))).filter(Boolean);

  // Pagination for Base Prices
  const totalBaseItems = filteredBasePrices.length;
  const startBaseIndex = (currentPage - 1) * pageSize;
  const paginatedBasePrices = filteredBasePrices.slice(startBaseIndex, startBaseIndex + pageSize);

  // Pagination for Rules
  const totalRuleItems = filteredRules.length;
  const startRuleIndex = (currentPage - 1) * pageSize;
  const paginatedRules = filteredRules.slice(startRuleIndex, startRuleIndex + pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease' }}>

      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '700', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', fontSize: '0.875rem'
        }}>
          {toast.msg}
        </div>
      )}

      {/* 1. TOP HEADER & GLOBAL ACTION BUTTONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Quản lý giá vé
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
            Thiết lập giá vé cơ bản và điều chỉnh linh hoạt cho các loại chuyến xe của hệ thống An Bình Lines
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportExcel}
            style={{
              backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1',
              padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            Xuất bảng giá (Excel)
          </button>

          {activeTab === 'rules' ? (
            <button
              onClick={handleOpenAddRule}
              style={{
                backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              Thêm quy định giá mới
            </button>
          ) : (
            <button
              onClick={() => showToast('Chức năng thiết lập tuyến mới đã sẵn sàng!', 'info')}
              style={{
                backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              Thiết lập tuyến mới
            </button>
          )}

          <button
            onClick={() => { fetchBasePrices(); fetchRules(); showToast('Đã đồng bộ dữ liệu CSDL MongoDB mới nhất!'); }}
            style={{
              backgroundColor: '#059669', color: '#ffffff', border: 'none',
              padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
            Lưu thay đổi
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC 4 STAT CARDS BASED ON ACTIVE TAB */}
      {activeTab === 'base-prices' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG CẶP TUYẾN KHAI THÁC</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{routes.length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Tuyến đường</span></div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M12 12h.01" /><path d="M18 8c0 4-3 6-6 6s-6 2-6 5" /></svg>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG TỔ HỢP GIÁ VÉ</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{basePrices.length} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Cấu hình</span></div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GIÁ VÉ CƠ BẢN BÌNH QUÂN</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#2563eb', marginTop: '4px' }}>{avgBasePrice.toLocaleString('vi-VN')} đ</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CẬP NHẬT LẦN CUỐI</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>Hôm nay lúc 09:15</div>
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>Đã áp dụng toàn hệ thống</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#fff7ed', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUY ĐỊNH ĐANG ÁP DỤNG</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{String(activeRulesCount).padStart(2, '0')} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>chính sách</span></div>
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>Đồng bộ máy chủ toàn hệ thống</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PHỤ THU LỄ &amp; CAO ĐIỂM</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#2563eb', marginTop: '4px' }}>+15% ~ 40%</div>
              <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: '700', marginTop: '2px' }}>Tự động kích hoạt theo lịch</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#fff7ed', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ƯU ĐÃI ĐẶT SỚM / KHỨ HỒI</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#059669', marginTop: '4px' }}>5% ~ 12% <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Giảm</span></div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Áp dụng tất cả dòng xe Limousine</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DOANH THU TỐI ƯU TỪ PHỤ THU</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#7c3aed', marginTop: '4px' }}>+18.4%</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>↗ So với chu kỳ trước</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
            </div>
          </div>

        </div>
      )}

      {/* 3. NAVIGATION TABS WITH COUNTERS & BADGES */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginTop: '0.25rem' }}>

        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '10px 0', background: 'none', border: 'none',
            borderBottom: activeTab === 'rules' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'rules' ? '#2563eb' : '#64748b',
            fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Quy định điều chỉnh (Surcharges &amp; Discounts)
          <span style={{ backgroundColor: activeTab === 'rules' ? '#eff6ff' : '#f1f5f9', color: activeTab === 'rules' ? '#2563eb' : '#64748b', fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', fontWeight: '800' }}>
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('base-prices')}
          style={{
            padding: '10px 0', background: 'none', border: 'none',
            borderBottom: activeTab === 'base-prices' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'base-prices' ? '#2563eb' : '#64748b',
            fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer'
          }}
        >
          Giá vé cơ bản theo Tuyến &amp; Loại xe
        </button>

        <button
          onClick={() => setActiveTab('dynamic-suggestions')}
          style={{
            padding: '10px 0', background: 'none', border: 'none',
            borderBottom: activeTab === 'dynamic-suggestions' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'dynamic-suggestions' ? '#2563eb' : '#64748b',
            fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer'
          }}
        >
          Xem gợi ý điều chỉnh giá vé
        </button>

        <button
          onClick={() => setActiveTab('ticket-proposals')}
          style={{
            padding: '10px 0', background: 'none', border: 'none',
            borderBottom: activeTab === 'ticket-proposals' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'ticket-proposals' ? '#2563eb' : '#64748b',
            fontWeight: '800', fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Đề xuất từ Phòng vé
          <span style={{
            backgroundColor: proposals.filter(p => p.status === 'pending').length > 0 ? '#ef4444' : (activeTab === 'ticket-proposals' ? '#eff6ff' : '#f1f5f9'),
            color: proposals.filter(p => p.status === 'pending').length > 0 ? '#ffffff' : (activeTab === 'ticket-proposals' ? '#2563eb' : '#64748b'),
            fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', fontWeight: '800'
          }}>
            {proposals.length}
          </span>
        </button>

      </div>

      {/* 4. MAIN CONTENT PANEL */}
      <section className="panel" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>

        {/* TAB 1: RULES TABLE */}
        {activeTab === 'rules' && (
          <div>
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="Tìm theo tên quy định, mã chính sách, tuyến đường áp dụng..."
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.825rem',
                    border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: '#ffffff'
                  }}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <select
                  value={ruleTypeFilter}
                  onChange={(e) => setRuleTypeFilter(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: '600', outline: 'none' }}
                >
                  <option value="all">Tất cả loại quy định</option>
                  <option value="percentage">Phần trăm (%)</option>
                  <option value="flat">Giá trị tuyệt đối (đ)</option>
                </select>

                <select
                  value={ruleStatusFilter}
                  onChange={(e) => setRuleStatusFilter(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: '600', outline: 'none' }}
                >
                  <option value="all">Trạng thái: Tất cả</option>
                  <option value="active">Kích hoạt</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>

                <button
                  onClick={fetchRules}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Tải lại danh sách"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                </button>
              </div>
            </div>

            {/* Rules Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải quy định giá từ MongoDB...</div>
            ) : filteredRules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Không tìm thấy quy định điều chỉnh phù hợp.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.725rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>MÃ &amp; QUY ĐỊNH ĐIỀU CHỈNH</th>
                      <th style={{ padding: '0.85rem 1rem' }}>LOẠI ĐIỀU CHỈNH</th>
                      <th style={{ padding: '0.85rem 1rem' }}>MỨC ĐIỀU CHỈNH</th>
                      <th style={{ padding: '0.85rem 1rem' }}>PHẠM VI ÁP DỤNG</th>
                      <th style={{ padding: '0.85rem 1rem' }}>THỜI GIAN HIỆU LỰC</th>
                      <th style={{ padding: '0.85rem 1rem' }}>TRẠNG THÁI</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.85rem' }}>
                    {paginatedRules.map((rule) => {
                      const codeStr = `SUR-${rule._id ? rule._id.toString().slice(-6).toUpperCase() : 'RULE'}`;
                      const isDiscount = rule.adjustmentValue < 0;
                      const isPercentage = rule.adjustmentType === 'percentage';

                      let typeBadge = { label: 'Phụ thu cao điểm', bg: '#fffbe6', color: '#d97706' };
                      if (isDiscount) {
                        typeBadge = { label: '% Chiết khấu ưu đãi', bg: '#ecfdf5', color: '#059669' };
                      } else if (!isPercentage) {
                        typeBadge = { label: 'Phụ thu định kỳ', bg: '#fff7ed', color: '#c2410c' };
                      }

                      return (
                        <tr key={rule._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '800', color: '#0f172a' }}>{rule.name}</div>
                            <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>
                              CODE: <span style={{ fontFamily: 'monospace' }}>{codeStr}</span>
                            </div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{ backgroundColor: typeBadge.bg, color: typeBadge.color, fontSize: '0.725rem', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', display: 'inline-block' }}>
                              {typeBadge.label}
                            </span>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '900', color: isDiscount ? '#059669' : '#dc2626', fontSize: '0.95rem' }}>
                              {rule.adjustmentValue > 0 ? `+${rule.adjustmentValue}` : rule.adjustmentValue}
                              {isPercentage ? '%' : ' đ'}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '1px' }}>
                              {isPercentage ? 'Trên giá vé gốc' : 'Cố định / 1 vé'}
                            </div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px' }}>
                              {rule.routeName || 'Tất cả các tuyến'}
                            </span>
                          </td>

                          <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                              Liên tục cả năm 2026 - 2027
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                              {rule.dayOfWeek.length === 0 ? 'Áp dụng 7 ngày/tuần' : rule.dayOfWeek.map(d => DAYS_MAP[d]).join(', ')}
                            </div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              backgroundColor: rule.isActive ? '#ecfdf5' : '#f1f5f9',
                              color: rule.isActive ? '#047857' : '#64748b',
                              border: rule.isActive ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                              padding: '3px 10px', borderRadius: '20px', fontSize: '0.725rem', fontWeight: '800',
                              display: 'inline-flex', alignItems: 'center', gap: '5px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: rule.isActive ? '#10b981' : '#94a3b8' }}></span>
                              {rule.isActive ? 'Đang kích hoạt' : 'Tạm ngưng'}
                            </span>
                          </td>

                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              {/* Toggle Switch */}
                              <button
                                onClick={() => handleToggleRuleActive(rule)}
                                style={{
                                  width: '36px', height: '20px', borderRadius: '10px',
                                  backgroundColor: rule.isActive ? '#2563eb' : '#cbd5e1',
                                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s'
                                }}
                                title={rule.isActive ? 'Bấm để tạm ngưng' : 'Bấm để kích hoạt'}
                              >
                                <span style={{
                                  width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ffffff',
                                  position: 'absolute', top: '3px', left: rule.isActive ? '19px' : '3px', transition: 'left 0.2s'
                                }}></span>
                              </button>

                              <button
                                onClick={() => handleOpenEditRule(rule)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#2563eb' }}
                                title="Chỉnh sửa"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              </button>

                              <button
                                onClick={() => handleDeleteRule(rule)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                                title="Xóa"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              <div>
                Hiển thị {startRuleIndex + 1} - {Math.min(startRuleIndex + pageSize, totalRuleItems)} trong tổng số {totalRuleItems} quy định điều chỉnh
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                >
                  &lt; Trước
                </button>
                <button style={{ padding: '4px 10px', border: '1px solid #2563eb', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.75rem' }}>
                  {currentPage}
                </button>
                <button
                  disabled={startRuleIndex + pageSize >= totalRuleItems}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', cursor: (startRuleIndex + pageSize >= totalRuleItems) ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                >
                  Sau &gt;
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BASE PRICES TABLE */}
        {activeTab === 'base-prices' && (
          <div>
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="Tìm theo tên tuyến, bến đi, bến đến, hoặc loại xe..."
                  value={baseSearch}
                  onChange={(e) => setBaseSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.825rem',
                    border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: '#ffffff'
                  }}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>TUYẾN:</span>
                  <select
                    value={selectedRouteFilter}
                    onChange={(e) => setSelectedRouteFilter(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: '600', outline: 'none' }}
                  >
                    <option value="all">Tất cả tuyến đường ({routes.length})</option>
                    {routes.map(r => (
                      <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>LOẠI XE:</span>
                  <select
                    value={selectedBusTypeFilter}
                    onChange={(e) => setSelectedBusTypeFilter(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: '600', outline: 'none' }}
                  >
                    <option value="all">Tất cả loại xe ({uniqueBusTypes.length})</option>
                    {uniqueBusTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={fetchBasePrices}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Tải lại giá vé cơ bản"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                </button>
              </div>
            </div>

            {/* Base Prices Table */}
            {loadingBasePrices ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải giá vé cơ bản từ MongoDB...</div>
            ) : filteredBasePrices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Chưa có tổ hợp tuyến &amp; loại xe nào được tìm thấy.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.725rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>TUYẾN ĐƯỜNG</th>
                      <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>CỰ LY &amp; THỜI GIAN</th>
                      <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>LOẠI XE PHỤC VỤ</th>
                      <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>ĐƠN GIÁ CƠ SỞ</th>
                      <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>GIÁ VÉ CƠ BẢN HIỆN TẠI</th>
                      <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.85rem' }}>
                    {paginatedBasePrices.map((combo, idx) => {
                      const isLimo = combo.busType.toLowerCase().includes('limousine');
                      const isSleeper = combo.busType.toLowerCase().includes('giường nằm');

                      let busBadgeStyle = { bg: '#f1f5f9', color: '#334155' };
                      if (isLimo) busBadgeStyle = { bg: '#fffbe6', color: '#d97706', border: '1px solid #fef08a' };
                      else if (isSleeper) busBadgeStyle = { bg: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' };

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>{combo.routeName}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }} title={`${combo.startStation} ⇄ ${combo.endStation}`}>
                              {combo.startStation} ⇄ {combo.endStation}
                            </div>
                          </td>

                          <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '800', color: '#0f172a' }}>{combo.distance || '172 km'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>~ {combo.duration || '3 giờ'}</div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              backgroundColor: busBadgeStyle.bg, color: busBadgeStyle.color, border: busBadgeStyle.border || 'none',
                              fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '12px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center'
                            }}>
                              {combo.busType}
                            </span>
                          </td>

                          <td style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.8rem' }}>
                            {(combo.unitPricePerKm || 1000).toLocaleString('vi-VN')} đ/km
                          </td>

                          <td style={{ padding: '1rem' }}>
                            {combo.isSet ? (
                              <div>
                                <div style={{ fontWeight: '900', color: '#2563eb', fontSize: '0.95rem' }}>
                                  {combo.price.toLocaleString('vi-VN')} đ
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Đã gồm bảo hiểm</div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '0.8rem', fontStyle: 'italic' }}>Chưa thiết lập</div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Nên đặt: {combo.recommendedPrice.toLocaleString('vi-VN')} đ</div>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              backgroundColor: combo.isSet ? '#ecfdf5' : '#fff7ed',
                              color: combo.isSet ? '#047857' : '#c2410c',
                              border: combo.isSet ? '1px solid #a7f3d0' : '1px solid #fed7aa',
                              padding: '3px 10px', borderRadius: '20px', fontSize: '0.725rem', fontWeight: '800',
                              display: 'inline-flex', alignItems: 'center', gap: '5px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: combo.isSet ? '#10b981' : '#f97316' }}></span>
                              {combo.isSet ? 'Đang mở bán' : 'Chưa thiết lập'}
                            </span>
                          </td>

                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenBasePriceEdit(combo)}
                                style={{
                                  backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
                                  padding: '6px 14px', borderRadius: '6px', fontSize: '0.775rem', fontWeight: '700',
                                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)', whiteSpace: 'nowrap'
                                }}
                              >
                                {combo.isSet ? 'Cập nhật giá' : 'Thiết lập giá'}
                              </button>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: '0 4px' }}>
                                ⋮
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

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              <div>
                Đang hiển thị {startBaseIndex + 1} - {Math.min(startBaseIndex + pageSize, totalBaseItems)} trong tổng số {totalBaseItems} tổ hợp giá
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                >
                  &lt; Trước
                </button>
                <button style={{ padding: '4px 10px', border: '1px solid #2563eb', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.75rem' }}>
                  {currentPage}
                </button>
                <button
                  disabled={startBaseIndex + pageSize >= totalBaseItems}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', cursor: (startBaseIndex + pageSize >= totalBaseItems) ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                >
                  Sau &gt;
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: DYNAMIC AI SUGGESTIONS TAB */}
        {activeTab === 'dynamic-suggestions' && (
          <GmDynamicPricingPage />
        )}

        {/* TAB 4: TICKET PROPOSALS FROM BOOKING OFFICE */}
        {activeTab === 'ticket-proposals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Đề Xuất Điều Chỉnh Giá Vé Từ Phòng Vé
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Các phiếu đề xuất giá do Quản lý phòng vé gửi lên Ban Giám Đốc xem xét và phê duyệt
                </p>
              </div>
              <button
                onClick={fetchProposals}
                style={{ padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', color: '#334155' }}
              >
                Làm mới đề xuất
              </button>
            </div>

            {loadingProposals ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải danh sách đề xuất giá vé...</div>
            ) : proposals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chưa có đề xuất giá vé nào từ phòng vé.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>STT</th>
                      <th style={{ padding: '10px 12px' }}>Tiêu đề đề xuất</th>
                      <th style={{ padding: '10px 12px' }}>Tuyến đường</th>
                      <th style={{ padding: '10px 12px' }}>Loại xe</th>
                      <th style={{ padding: '10px 12px' }}>Giá cũ &rarr; Giá đề xuất</th>
                      <th style={{ padding: '10px 12px' }}>Thời hạn áp dụng</th>
                      <th style={{ padding: '10px 12px' }}>Lý do đề xuất</th>
                      <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác Giám đốc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((p, idx) => {
                      const isPending = p.status === 'pending';
                      const routeName = p.routeId?.name || (p.routeId ? `${p.routeId.startPoint} -> ${p.routeId.endPoint}` : 'N/A');

                      return (
                        <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                              {p.proposalCategory === 'base_price' ? (
                                <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '0.62rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>
                                  GIÁ CƠ SỞ NIÊM YẾT
                                </span>
                              ) : (
                                <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.62rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>
                                  ĐIỀU CHỈNH MÙA VỤ
                                </span>
                              )}
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>{p.title}</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>Người lập: {p.proposerName} ({new Date(p.createdAt).toLocaleDateString('vi-VN')})</span>
                              {p.branchId && (
                                <span style={{ background: '#eff6ff', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', fontSize: '0.65rem', border: '1px solid #bfdbfe' }}>
                                  {getBranchName(p.branchId)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#334155' }}>{routeName}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{p.busType === 'all' ? 'Tất cả loại xe' : p.busType}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.72rem' }}>
                              {(p.currentPrice || 0).toLocaleString('vi-VN')} đ
                            </div>
                            <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '0.85rem' }}>
                              {(p.proposedPrice || 0).toLocaleString('vi-VN')} đ
                              {p.adjustmentPercentage !== 0 && (
                                <span style={{ marginLeft: '4px', fontSize: '0.68rem', color: p.adjustmentPercentage > 0 ? '#16a34a' : '#dc2626' }}>
                                  ({p.adjustmentPercentage > 0 ? `+${p.adjustmentPercentage}%` : `${p.adjustmentPercentage}%`})
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#334155' }}>
                            {p.effectiveTo
                              ? `${new Date(p.effectiveFrom).toLocaleDateString('vi-VN')} → ${new Date(p.effectiveTo).toLocaleDateString('vi-VN')}`
                              : `Từ ${new Date(p.effectiveFrom).toLocaleDateString('vi-VN')} (Dài hạn)`}
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '240px', color: '#475569' }}>
                            {p.reason}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700',
                              background: p.status === 'approved' ? '#ecfdf5' : (p.status === 'rejected' ? '#fef2f2' : '#fef3c7'),
                              color: p.status === 'approved' ? '#047857' : (p.status === 'rejected' ? '#b91c1c' : '#b45309'),
                              border: `1px solid ${p.status === 'approved' ? '#a7f3d0' : (p.status === 'rejected' ? '#fecaca' : '#fde68a')}`
                            }}>
                              {p.status === 'approved' ? 'Đã áp dụng' : (p.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt')}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {isPending ? (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  onClick={() => handleApproveProposal(p._id)}
                                  style={{
                                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                                    border: 'none', background: '#10b981', color: '#ffffff', cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(16,185,129,0.3)'
                                  }}
                                >
                                  Phê duyệt &amp; Áp giá
                                </button>
                                <button
                                  onClick={() => handleRejectProposal(p._id)}
                                  style={{
                                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                                    border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer'
                                  }}
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString('vi-VN') : 'Đã xử lý'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </section>

      {/* MODAL: ADD / EDIT RULE */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '550px', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem', margin: 0 }}>
              {editingRule ? 'Cập nhật quy định điều chỉnh giá' : 'Thêm quy định giá mới'}
            </h3>

            <form onSubmit={handleSubmitRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Tên quy định *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Phụ thu cao điểm cuối tuần (Thứ 6, T7, CN)"
                  required
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Tuyến đường áp dụng</label>
                  <select
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: '#fff' }}
                  >
                    <option value="all">Tất cả các tuyến</option>
                    {routes.map(r => (
                      <option key={r._id} value={r._id}>{r.startPoint} → {r.endPoint}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Loại xe áp dụng</label>
                  <select
                    value={busType}
                    onChange={(e) => setBusType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: '#fff' }}
                  >
                    <option value="all">Tất cả các loại xe</option>
                    <option value="Giường nằm">Giường nằm</option>
                    <option value="Ghế ngồi">Ghế ngồi</option>
                    <option value="Limousine">Limousine</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Ngày áp dụng trong tuần (Để trống = Tất cả các ngày)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[1, 2, 3, 4, 5, 6, 0].map(dayNum => (
                    <label key={dayNum} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', color: '#334155', cursor: 'pointer' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Hình thức điều chỉnh *</label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.825rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: '#fff' }}
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="flat">Giá trị tuyệt đối (đ)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Giá trị tăng/giảm *</label>
                  <input
                    type="number"
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(e.target.value)}
                    placeholder={adjustmentType === 'percentage' ? 'Ví dụ: 15 (+15%) hoặc -10' : 'Ví dụ: 40000 hoặc -20000'}
                    required
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="activeCheck" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                  Kích hoạt quy định ngay sau khi lưu
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                  {editingRule ? 'Lưu thay đổi' : 'Tạo quy định mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BASE PRICE */}
      {showBasePriceModal && selectedCombo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '450px', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Thiết lập giá vé cơ bản
            </h3>

            <form onSubmit={handleBasePriceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Tuyến đường</label>
                <input
                  type="text"
                  value={selectedCombo.routeName}
                  disabled
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Loại xe</label>
                <input
                  type="text"
                  value={selectedCombo.busType}
                  disabled
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Giá vé cơ bản niêm yết (VNĐ) *</label>
                <input
                  type="number"
                  value={newBasePrice}
                  onChange={(e) => setNewBasePrice(e.target.value)}
                  placeholder="Ví dụ: 290000"
                  required
                  min="0"
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', fontSize: '1rem', fontWeight: '800', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#2563eb', outline: 'none' }}
                />
                <span style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Giá đề xuất tối ưu: {selectedCombo.recommendedPrice?.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowBasePriceModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Lưu giá vé vào CSDL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>{confirmModal.title}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px', marginBottom: '1.25rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                Hủy
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#ef4444', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GmPricingPage;
