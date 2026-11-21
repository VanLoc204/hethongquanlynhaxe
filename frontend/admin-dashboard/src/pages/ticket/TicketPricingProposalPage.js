import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api';

// Enterprise Status Mapping
const STATUS_CONFIG = {
  pending: {
    label: 'Chờ phê duyệt',
    badgeClass: 'badge-pending',
    bg: '#fefce8',
    color: '#854d0e',
    border: '#fef08a'
  },
  approved: {
    label: 'Đã phê duyệt & Áp dụng',
    badgeClass: 'badge-approved',
    bg: '#f0fdf4',
    color: '#166534',
    border: '#bbf7d0'
  },
  rejected: {
    label: 'Từ chối phê duyệt',
    badgeClass: 'badge-rejected',
    bg: '#fef2f2',
    color: '#991b1b',
    border: '#fecaca'
  }
};

const TicketPricingProposalPage = () => {
  const { token, user } = useContext(AuthContext);

  // Branch Scope
  const branchId = user?.branch?.branchId;
  const isTicketManager = user?.role === 'ticket_manager';
  const branchInfo = branchId ? getBranchById(branchId) : null;

  // Core Data
  const [proposals, setProposals] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [basePrices, setBasePrices] = useState([]);
  const [busTypes, setBusTypes] = useState([
    'Xe Giường Nằm 44 Chỗ',
    'Limousine Ghế Ngồi 9 Chỗ',
    'Xe Ghế Ngồi 45 Chỗ',
    'Xe Ghế Ngồi 29 Chỗ',
    'Xe Ghế Ngồi 16 Chỗ'
  ]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all'); // all | adjustment | base_price
  const [filterRoute, setFilterRoute] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Dropdown Button
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Proposal Category: 'adjustment' (Điều chỉnh theo đợt / phụ thu) | 'base_price' (Thay đổi giá vé cơ sở niêm yết)
  const [proposalCategory, setProposalCategory] = useState('adjustment');

  // Form states
  const [title, setTitle] = useState('');
  const [routeId, setRouteId] = useState('');
  const [busType, setBusType] = useState('all');
  const [proposalType, setProposalType] = useState('percentage'); // percentage | fixed_price
  const [adjustmentPercentage, setAdjustmentPercentage] = useState(10);
  const [currentPrice, setCurrentPrice] = useState(250000);
  const [proposedPrice, setProposedPrice] = useState(275000);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  // Clear single field error helper
  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Notification Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch Routes
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/ops/routes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.routes) {
        setRoutes(data.routes);
        if (data.routes.length > 0 && !routeId) {
          setRouteId(data.routes[0]._id);
        }
      }
    } catch (err) {
      console.error('Lỗi truy xuất danh mục tuyến đường:', err);
    }
  }, [token, routeId]);

  // Fetch Base Prices
  const fetchBasePrices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pricing/base-prices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.basePrices) {
        setBasePrices(data.basePrices);
      }
    } catch (err) {
      console.error('Lỗi truy xuất biểu giá cơ sở:', err);
    }
  }, [token]);

  // Fetch Fleet / Bus Types
  const fetchBuses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/trips/fleet/buses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.buses) {
        const types = [...new Set(data.buses.map((b) => b.type).filter(Boolean))];
        if (types.length > 0) {
          setBusTypes(types);
        }
      }
    } catch (err) {
      console.error('Lỗi truy xuất danh mục phương tiện:', err);
    }
  }, [token]);

  // Fetch Proposals List
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/proposals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.proposals) {
        setProposals(data.proposals);
      } else {
        showToast(data.message || 'Không thể tải danh sách phiếu đề xuất giá.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi truy xuất danh sách đề xuất giá.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchRoutes();
      fetchBasePrices();
      fetchBuses();
      fetchProposals();
    }
  }, [token, fetchRoutes, fetchBasePrices, fetchBuses, fetchProposals]);

  // Helper: Find official current base price
  const getRouteBasePrice = useCallback(
    (targetRouteId, targetBusType) => {
      if (!targetRouteId) return 250000;

      if (targetBusType && targetBusType !== 'all') {
        const exact = basePrices.find(
          (bp) =>
            (bp.routeId?._id === targetRouteId || bp.routeId === targetRouteId) &&
            bp.busType === targetBusType &&
            bp.price
        );
        if (exact && exact.price) return exact.price;
      }

      const anyMatch = basePrices.find(
        (bp) =>
          (bp.routeId?._id === targetRouteId || bp.routeId === targetRouteId) &&
          bp.price
      );
      if (anyMatch && anyMatch.price) return anyMatch.price;

      const rObj = routes.find((r) => r._id === targetRouteId);
      return rObj?.basePrice || 250000;
    },
    [basePrices, routes]
  );

  // Filter routes departing from manager's branch
  const selectableRoutes = useMemo(() => {
    if (!isTicketManager || !branchId || !branchInfo || !Array.isArray(branchInfo.keywords)) return routes;
    const filtered = routes.filter((r) => {
      const start = (r.startPoint || '').toLowerCase();
      return branchInfo.keywords.some((kw) => start.includes(kw.toLowerCase()));
    });
    return filtered.length > 0 ? filtered : routes;
  }, [routes, isTicketManager, branchId, branchInfo]);

  // Recalculate price on route change
  const handleRouteChange = (rId) => {
    clearError('routeId');
    clearError('proposedPrice');
    clearError('adjustmentPercentage');
    setRouteId(rId);
    const base = getRouteBasePrice(rId, busType);
    setCurrentPrice(base);

    if (proposalCategory === 'adjustment') {
      if (proposalType === 'percentage') {
        const pct = adjustmentPercentage !== '' ? Number(adjustmentPercentage) : 10;
        setProposedPrice(Math.round(base * (1 + pct / 100)));
      }
    } else {
      setProposedPrice(base);
    }
  };

  // Recalculate price on bus type change
  const handleBusTypeChange = (bType) => {
    clearError('proposedPrice');
    clearError('adjustmentPercentage');
    setBusType(bType);
    const base = getRouteBasePrice(routeId, bType);
    setCurrentPrice(base);

    if (proposalCategory === 'adjustment') {
      if (proposalType === 'percentage') {
        const pct = adjustmentPercentage !== '' ? Number(adjustmentPercentage) : 10;
        setProposedPrice(Math.round(base * (1 + pct / 100)));
      }
    } else {
      setProposedPrice(base);
    }
  };

  // Percentage change handler
  const handlePercentageChange = (pct) => {
    clearError('adjustmentPercentage');
    clearError('proposedPrice');
    if (pct === '') {
      setAdjustmentPercentage('');
      return;
    }
    const num = Number(pct);
    setAdjustmentPercentage(num);
    if (currentPrice > 0 && !isNaN(num)) {
      setProposedPrice(Math.round(currentPrice * (1 + num / 100)));
    }
  };

  // Proposed price direct input handler
  const handleProposedPriceChange = (val) => {
    clearError('proposedPrice');
    clearError('adjustmentPercentage');
    if (val === '') {
      setProposedPrice('');
      return;
    }
    const num = Number(val);
    setProposedPrice(num);
    if (currentPrice > 0 && !isNaN(num)) {
      const pct = Math.round(((num - currentPrice) / currentPrice) * 100);
      setAdjustmentPercentage(pct);
    }
  };

  // Open modal with preselected category
  const handleOpenCreateModal = (cat = 'adjustment') => {
    setShowDropdown(false);
    setErrors({});
    setProposalCategory(cat);

    const initialRoutes = selectableRoutes.length > 0 ? selectableRoutes : routes;
    const rId = initialRoutes.length > 0 ? initialRoutes[0]._id : '';
    setRouteId(rId);

    const defaultBus = cat === 'base_price' && busTypes.length > 0 ? busTypes[0] : 'all';
    setBusType(defaultBus);

    const base = getRouteBasePrice(rId, defaultBus);
    setCurrentPrice(base);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    setEffectiveFrom(tomorrow.toISOString().slice(0, 10));

    if (cat === 'adjustment') {
      setTitle('');
      setProposalType('percentage');
      setAdjustmentPercentage(10);
      setProposedPrice(Math.round(base * 1.1));
      setEffectiveTo(nextWeek.toISOString().slice(0, 10));
      setReason('');
    } else {
      setTitle('');
      setProposalType('fixed_price');
      setAdjustmentPercentage(0);
      setProposedPrice(base);
      setEffectiveTo('');
      setReason('');
    }

    setShowModal(true);
  };

  // Switch category inside modal
  const handleSwitchCategoryTab = (newCat) => {
    setErrors({});
    setProposalCategory(newCat);
    const defaultBus = newCat === 'base_price' && busTypes.length > 0 ? busTypes[0] : 'all';
    setBusType(defaultBus);
    const base = getRouteBasePrice(routeId, defaultBus);
    setCurrentPrice(base);

    if (newCat === 'adjustment') {
      setProposalType('percentage');
      setAdjustmentPercentage(10);
      setProposedPrice(Math.round(base * 1.1));
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      if (!effectiveTo) setEffectiveTo(nextWeek.toISOString().slice(0, 10));
    } else {
      setProposalType('fixed_price');
      setProposedPrice(base);
      setAdjustmentPercentage(0);
      setEffectiveTo('');
    }
  };

  // Validate proposal form inputs
  const validateForm = () => {
    const newErrors = {};

    // 1. Tiêu đề đề xuất
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) {
      newErrors.title = 'Vui lòng nhập tiêu đề hồ sơ đề xuất.';
    } else if (trimmedTitle.length < 6) {
      newErrors.title = 'Tiêu đề đề xuất quá ngắn, tối thiểu từ 6 ký tự.';
    } else if (trimmedTitle.length > 200) {
      newErrors.title = 'Tiêu đề đề xuất quá dài, không vượt quá 200 ký tự.';
    }

    // 2. Tuyến đường áp dụng
    if (!routeId) {
      newErrors.routeId = 'Vui lòng chọn tuyến đường áp dụng đề xuất.';
    }

    // 3. Tỷ lệ điều chỉnh (trong tab adjustment và loại percentage)
    if (proposalCategory === 'adjustment' && proposalType === 'percentage') {
      const pct = Number(adjustmentPercentage);
      if (adjustmentPercentage === '' || isNaN(pct) || pct === 0) {
        newErrors.adjustmentPercentage = 'Tỷ lệ điều chỉnh không thể bằng 0%. Vui lòng nhập số dương để phụ thu hoặc số âm để giảm giá.';
      } else if (pct < -50) {
        newErrors.adjustmentPercentage = 'Mức giảm giá mùa vụ tối đa không vượt quá -50%.';
      } else if (pct > 100) {
        newErrors.adjustmentPercentage = 'Mức phụ thu mùa vụ tối đa không vượt quá +100%.';
      }
    }

    // 4. Mức giá đề xuất
    const priceNum = Number(proposedPrice);
    if (proposedPrice === '' || proposedPrice === undefined || proposedPrice === null || isNaN(priceNum) || priceNum <= 0) {
      newErrors.proposedPrice = 'Vui lòng nhập mức giá vé hợp lệ lớn hơn 0.';
    } else if (priceNum < 10000) {
      newErrors.proposedPrice = 'Mức giá vé tối thiểu theo quy định là 10.000 đ.';
    } else if (priceNum > 5000000) {
      newErrors.proposedPrice = 'Mức giá vé không được vượt quá 5.000.000 đ.';
    } else if (proposalCategory === 'base_price' && priceNum === Number(currentPrice)) {
      newErrors.proposedPrice = 'Mức giá cơ sở mới đang trùng với giá niêm yết hiện hành (chưa có sự điều chỉnh giá).';
    } else if (proposalCategory === 'adjustment' && priceNum === Number(currentPrice)) {
      newErrors.proposedPrice = 'Giá vé sau điều chỉnh đang trùng với giá niêm yết hiện hành (chưa có sự điều chỉnh giá).';
    }

    // 5. Ngày bắt đầu hiệu lực
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (!effectiveFrom) {
      newErrors.effectiveFrom = 'Vui lòng chọn ngày bắt đầu hiệu lực.';
    } else if (effectiveFrom < todayStr) {
      newErrors.effectiveFrom = 'Ngày bắt đầu hiệu lực không được nằm trong quá khứ.';
    }

    // 6. Ngày kết thúc hiệu lực
    if (proposalCategory === 'adjustment') {
      if (!effectiveTo) {
        newErrors.effectiveTo = 'Đề xuất giá mùa vụ / phụ thu bắt buộc phải có ngày kết thúc hiệu lực.';
      } else if (effectiveFrom && effectiveTo < effectiveFrom) {
        newErrors.effectiveTo = 'Ngày kết thúc không được trước ngày bắt đầu hiệu lực.';
      }
    } else {
      if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) {
        newErrors.effectiveTo = 'Ngày kết thúc không được trước ngày bắt đầu hiệu lực.';
      }
    }

    // 7. Căn cứ & giải trình
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      newErrors.reason = 'Vui lòng nhập căn cứ & giải trình thực tế để Ban Giám Đốc xem xét phê duyệt.';
    } else if (trimmedReason.length < 10) {
      newErrors.reason = 'Nội dung giải trình quá ngắn (tối thiểu 10 ký tự) để thể hiện rõ căn cứ thay đổi.';
    } else if (trimmedReason.length > 1000) {
      newErrors.reason = 'Nội dung giải trình quá dài, vui lòng tóm lược dưới 1000 ký tự.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit proposal
  const handleSubmitProposal = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Vui lòng kiểm tra và điều chỉnh các trường dữ liệu chưa hợp lệ.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          proposalCategory,
          routeId,
          busType,
          proposalType: proposalCategory === 'base_price' ? 'fixed_price' : proposalType,
          adjustmentPercentage: Number(adjustmentPercentage) || 0,
          currentPrice: Number(currentPrice) || 0,
          proposedPrice: Number(proposedPrice),
          effectiveFrom,
          effectiveTo: effectiveTo || null,
          reason: reason.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          proposalCategory === 'base_price'
            ? 'Đã gửi hồ sơ đề xuất thay đổi giá vé cơ sở lên Ban Giám Đốc thành công.'
            : 'Đã gửi hồ sơ đề xuất điều chỉnh giá vé mùa vụ lên Ban Giám Đốc thành công.'
        );
        setShowModal(false);
        setErrors({});
        fetchProposals();
      } else {
        showToast(data.message || 'Không thể khởi tạo phiếu đề xuất.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ trong quá trình gửi hồ sơ đề xuất.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel / Delete pending proposal
  const handleDeleteProposal = async (id) => {
    if (!window.confirm('Xác nhận thu hồi và xóa phiếu đề xuất giá vé này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`${API_BASE}/pricing/proposals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã thu hồi phiếu đề xuất giá thành công.');
        fetchProposals();
      } else {
        showToast(data.message || 'Không thể thu hồi phiếu đề xuất.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ khi xử lý thu hồi đề xuất.', 'error');
    }
  };

  // Open Proposal Details
  const handleOpenDetailModal = (proposal) => {
    setSelectedProposal(proposal);
    setShowDetailModal(true);
  };

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesCategory =
        filterCategory === 'all' ||
        (filterCategory === 'base_price'
          ? p.proposalCategory === 'base_price'
          : p.proposalCategory !== 'base_price');
      const matchesRoute = filterRoute === 'all' || p.routeId?._id === filterRoute;
      const matchesSearch =
        !searchTerm.trim() ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.proposerId?.name || p.proposerName)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p._id.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesCategory && matchesRoute && matchesSearch;
    });
  }, [proposals, filterStatus, filterCategory, filterRoute, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage) || 1;
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProposals.slice(start, start + itemsPerPage);
  }, [filteredProposals, currentPage, itemsPerPage]);

  // Statistics
  const pendingCount = proposals.filter((p) => p.status === 'pending').length;
  const approvedCount = proposals.filter((p) => p.status === 'approved').length;
  const rejectedCount = proposals.filter((p) => p.status === 'rejected').length;
  const adjustmentCount = proposals.filter((p) => p.proposalCategory !== 'base_price').length;
  const basePriceCount = proposals.filter((p) => p.proposalCategory === 'base_price').length;

  // Selected route object for label
  const selectedRouteObj = routes.find((r) => r._id === routeId);
  const selectedRouteName = selectedRouteObj
    ? selectedRouteObj.name || `${selectedRouteObj.startPoint} ➔ ${selectedRouteObj.endPoint}`
    : 'Chọn tuyến đường áp dụng';

  // Duration in days calculation
  const durationDays = useMemo(() => {
    if (!effectiveFrom || !effectiveTo) return null;
    const from = new Date(effectiveFrom);
    const to = new Date(effectiveTo);
    const diff = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  }, [effectiveFrom, effectiveTo]);

  const priceDiff = Number(proposedPrice || 0) - Number(currentPrice || 0);

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: '600',
            color: '#ffffff',
            backgroundColor: toast.type === 'error' ? '#b91c1c' : '#15803d',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {toast.type === 'error' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                Đề Xuất Biểu Giá Vé
              </h1>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Quy trình Maker - Checker
              </span>
              {branchInfo && (
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    letterSpacing: '0.02em'
                  }}
                >
                  {branchInfo.branchName || branchInfo.name}
                </span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0' }}>
              Hệ thống khởi tạo và quản lý hồ sơ đề xuất điều chỉnh giá vé phòng vé trình Tổng Giám Đốc phê duyệt thi hành
            </p>
          </div>

          {/* Action Split Button */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div style={{ display: 'inline-flex', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <button
                type="button"
                onClick={() => handleOpenCreateModal('adjustment')}
                style={{
                  backgroundColor: '#1e40af',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '600',
                  padding: '0.55rem 1rem',
                  borderTopLeftRadius: '8px',
                  borderBottomLeftRadius: '8px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tạo đề xuất giá mới
              </button>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  backgroundColor: '#1e3a8a',
                  border: 'none',
                  borderLeft: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  padding: '0.55rem 0.65rem',
                  borderTopRightRadius: '8px',
                  borderBottomRightRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Tùy chọn nghiệp vụ đề xuất"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '105%',
                  right: 0,
                  zIndex: 100,
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                  minWidth: '310px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '0.66rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CHỌN PHÂN LOẠI NGHIỆP VỤ
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('adjustment')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <div
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="20" x2="12" y2="10" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>
                      Điều chỉnh giá vé mùa vụ &amp; phụ thu
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                      Phụ thu hoặc giảm giá theo % hoặc mức cố định có thời hạn (Lễ, Tết, cao điểm)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('base_price')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <div
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>
                      Thay đổi giá vé cơ sở niêm yết
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                      Cập nhật lại biểu giá chuẩn (Base Tariff) áp dụng dài hạn cho các chuyến xe
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
          <div style={{ background: '#f8fafc', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TỔNG ĐỀ XUẤT ĐÃ LẬP
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', margin: '3px 0' }}>{proposals.length}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {adjustmentCount} phụ thu/mùa vụ &bull; {basePriceCount} giá cơ sở
            </div>
          </div>

          <div style={{ background: '#fefce8', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid #fef08a' }}>
            <div style={{ fontSize: '0.67rem', color: '#854d0e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CHỜ PHÊ DUYỆT (PENDING)
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#854d0e', margin: '3px 0' }}>{pendingCount}</div>
            <div style={{ fontSize: '0.68rem', color: '#a16207' }}>
              {pendingCount > 0 ? 'Đang chờ Ban Giám Đốc thẩm định' : 'Hồ sơ đã được xử lý hoàn tất'}
            </div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.67rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ĐÃ PHÊ DUYỆT &amp; ÁP GIÁ
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#166534', margin: '3px 0' }}>{approvedCount}</div>
            <div style={{ fontSize: '0.68rem', color: '#15803d' }}>Tự động cập nhật vào các chuyến xe</div>
          </div>

          <div style={{ background: '#fef2f2', padding: '0.9rem 1.1rem', borderRadius: '10px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.67rem', color: '#991b1b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TỪ CHỐI DUYỆT (REJECTED)
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#991b1b', margin: '3px 0' }}>{rejectedCount}</div>
            <div style={{ fontSize: '0.68rem', color: '#b91c1c' }}>Kèm biên bản giải trình của Giám Đốc</div>
          </div>
        </div>
      </div>

      {/* Main Data Panel */}
      <div
        className="panel"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Filter Category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Phân loại:</label>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.76rem',
                  background: '#ffffff',
                  fontWeight: '600',
                  color: '#1e293b'
                }}
              >
                <option value="all">Tất cả phân loại ({proposals.length})</option>
                <option value="adjustment">Điều chỉnh mùa vụ &amp; phụ thu ({adjustmentCount})</option>
                <option value="base_price">Giá vé cơ sở niêm yết ({basePriceCount})</option>
              </select>
            </div>

            {/* Filter Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Trạng thái:</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.76rem',
                  background: '#ffffff',
                  color: '#1e293b'
                }}
              >
                <option value="all">Tất cả ({proposals.length})</option>
                <option value="pending">Chờ duyệt ({pendingCount})</option>
                <option value="approved">Đã phê duyệt ({approvedCount})</option>
                <option value="rejected">Bị từ chối ({rejectedCount})</option>
              </select>
            </div>

            {/* Filter Route */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Tuyến đường:</label>
              <select
                value={filterRoute}
                onChange={(e) => {
                  setFilterRoute(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.76rem',
                  background: '#ffffff',
                  maxWidth: '220px',
                  color: '#1e293b'
                }}
              >
                <option value="all">Tất cả các tuyến</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name || `${r.startPoint} ➔ ${r.endPoint}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '230px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tiêu đề, căn cứ..."
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.76rem',
                color: '#0f172a'
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Data Grid Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b', fontSize: '0.82rem' }}>
            Đang tải dữ liệu hồ sơ đề xuất giá vé...
          </div>
        ) : filteredProposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>
            {proposals.length === 0 ? (
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#334155', fontWeight: '700' }}>
                  Chưa có phiếu đề xuất giá nào được khởi tạo
                </p>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.78rem' }}>
                  Bấm nút "Tạo đề xuất giá mới" ở góc trên bên phải để lập biên bản đề xuất điều chỉnh phụ thu hoặc giá vé cơ sở.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('adjustment')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#1e40af',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Khởi tạo phiếu đầu tiên
                </button>
              </div>
            ) : (
              'Không tìm thấy bản ghi đề xuất giá nào thỏa mãn điều kiện lọc.'
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Mã phiếu</th>
                  <th style={{ padding: '10px 12px' }}>Phân loại nghiệp vụ</th>
                  <th style={{ padding: '10px 12px' }}>Tiêu đề &amp; Căn cứ</th>
                  <th style={{ padding: '10px 12px' }}>Tuyến đường</th>
                  <th style={{ padding: '10px 12px' }}>Hạng xe</th>
                  <th style={{ padding: '10px 12px' }}>Biến động giá</th>
                  <th style={{ padding: '10px 12px' }}>Thời hạn hiệu lực</th>
                  <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProposals.map((p) => {
                  const statusConf = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                  const isPending = p.status === 'pending';
                  const isBasePrice = p.proposalCategory === 'base_price';
                  const routeName = p.routeId?.name || (p.routeId ? `${p.routeId.startPoint} ➔ ${p.routeId.endPoint}` : 'N/A');
                  const diff = (p.proposedPrice || 0) - (p.currentPrice || 0);
                  const code = `PRP-${p._id.slice(-6).toUpperCase()}`;

                  return (
                    <tr
                      key={p._id}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      onClick={() => handleOpenDetailModal(p)}
                    >
                      {/* Proposal Code */}
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', fontWeight: '700', color: '#1e40af' }}>
                        {code}
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: '12px 12px' }}>
                        {isBasePrice ? (
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1e40af',
                              border: '1px solid #bfdbfe',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.67rem',
                              fontWeight: '700',
                              letterSpacing: '0.02em',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Giá vé cơ sở
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.67rem',
                              fontWeight: '700',
                              letterSpacing: '0.02em',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Điều chỉnh mùa vụ
                          </span>
                        )}
                      </td>

                      {/* Title & Proposer */}
                      <td style={{ padding: '12px 12px', maxWidth: '240px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', lineHeight: 1.35 }}>{p.title}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
                          Lập bởi: {p.proposerId?.name || p.proposerName} &bull; {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Route */}
                      <td style={{ padding: '12px 12px', fontWeight: '600', color: '#334155' }}>{routeName}</td>

                      {/* Bus Type */}
                      <td style={{ padding: '12px 12px', color: '#475569' }}>
                        {p.busType === 'all' ? (
                          <span style={{ color: '#64748b', fontStyle: 'italic' }}>Tất cả hạng xe</span>
                        ) : (
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>{p.busType}</span>
                        )}
                      </td>

                      {/* Pricing Variance */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.72rem' }}>
                            {(p.currentPrice || 0).toLocaleString('vi-VN')} đ
                          </span>
                          <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.84rem' }}>
                            {(p.proposedPrice || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        {diff !== 0 && (
                          <div
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              color: diff > 0 ? '#15803d' : '#b91c1c',
                              marginTop: '2px'
                            }}
                          >
                            {diff > 0 ? `+${diff.toLocaleString('vi-VN')} đ` : `${diff.toLocaleString('vi-VN')} đ`}{' '}
                            {p.adjustmentPercentage !== 0 && (
                              <span>({p.adjustmentPercentage > 0 ? `+${p.adjustmentPercentage}%` : `${p.adjustmentPercentage}%`})</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Effective Window */}
                      <td style={{ padding: '12px 12px' }}>
                        {p.effectiveTo ? (
                          <div>
                            <div style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: '600' }}>
                              {new Date(p.effectiveFrom).toLocaleDateString('vi-VN')} &rarr; {new Date(p.effectiveTo).toLocaleDateString('vi-VN')}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Có thời hạn</div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: '600' }}>
                              Từ {new Date(p.effectiveFrom).toLocaleDateString('vi-VN')}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '600' }}>Áp dụng dài hạn</div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 12px' }}>
                        <span
                          style={{
                            background: statusConf.bg,
                            color: statusConf.color,
                            border: `1px solid ${statusConf.border}`,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 12px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(p)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            Chi tiết
                          </button>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProposal(p._id)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                cursor: 'pointer'
                              }}
                            >
                              Thu hồi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}
              >
                <div>
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredProposals.length)} trên tổng số {filteredProposals.length} bản ghi
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                      color: currentPage === 1 ? '#94a3b8' : '#334155',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.74rem'
                    }}
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: currentPage === i + 1 ? '#1e40af' : '#cbd5e1',
                        background: currentPage === i + 1 ? '#1e40af' : '#ffffff',
                        color: currentPage === i + 1 ? '#ffffff' : '#334155',
                        fontWeight: currentPage === i + 1 ? '700' : 'normal',
                        cursor: 'pointer',
                        fontSize: '0.74rem'
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                      color: currentPage === totalPages ? '#94a3b8' : '#334155',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '0.74rem'
                    }}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAIL DRAWER / MODAL */}
      {showDetailModal && selectedProposal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#1e40af', fontWeight: '700' }}>
                    PRP-{selectedProposal._id.slice(-6).toUpperCase()}
                  </span>
                  <span
                    style={{
                      background: selectedProposal.proposalCategory === 'base_price' ? '#eff6ff' : '#f8fafc',
                      color: selectedProposal.proposalCategory === 'base_price' ? '#1e40af' : '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.66rem',
                      fontWeight: '700'
                    }}
                  >
                    {selectedProposal.proposalCategory === 'base_price' ? 'Biểu giá cơ sở niêm yết' : 'Điều chỉnh giá mùa vụ'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
                  {selectedProposal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Đóng
              </button>
            </div>

            {/* Spec grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Tuyến vận tải áp dụng:</div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                  {selectedProposal.routeId?.name || (selectedProposal.routeId ? `${selectedProposal.routeId.startPoint} ➔ ${selectedProposal.routeId.endPoint}` : 'N/A')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Loại phương tiện:</div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                  {selectedProposal.busType === 'all' ? 'Tất cả các hạng xe' : selectedProposal.busType}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Giá niêm yết hiện hành:</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>
                  {(selectedProposal.currentPrice || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Giá đề xuất mới:</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e40af' }}>
                  {(selectedProposal.proposedPrice || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Thời điểm hiệu lực:</div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#0f172a' }}>
                  {new Date(selectedProposal.effectiveFrom).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Thời điểm hết hiệu lực:</div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#0f172a' }}>
                  {selectedProposal.effectiveTo ? new Date(selectedProposal.effectiveTo).toLocaleDateString('vi-VN') : 'Áp dụng dài hạn (Vô thời hạn)'}
                </div>
              </div>
            </div>

            {/* Justification / Reason */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Căn cứ &amp; Giải trình của Quản lý phòng vé:
              </div>
              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}>
                {selectedProposal.reason}
              </div>
            </div>

            {/* Review Note from GM */}
            {selectedProposal.reviewNote && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: selectedProposal.status === 'approved' ? '#166534' : '#991b1b', marginBottom: '4px' }}>
                  Ý kiến phê duyệt của Ban Giám Đốc:
                </div>
                <div
                  style={{
                    background: selectedProposal.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: `1px solid ${selectedProposal.status === 'approved' ? '#bbf7d0' : '#fecaca'}`,
                    fontSize: '0.78rem',
                    color: selectedProposal.status === 'approved' ? '#14532d' : '#7f1d1d',
                    lineHeight: 1.45
                  }}
                >
                  {selectedProposal.reviewNote}
                  <div style={{ fontSize: '0.68rem', marginTop: '4px', opacity: 0.8 }}>
                    Xử lý ngày: {selectedProposal.reviewedAt ? new Date(selectedProposal.reviewedAt).toLocaleString('vi-VN') : 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TẠO ĐỀ XUẤT GIÁ MỚI */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '580px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Khởi Tạo Hồ Sơ Đề Xuất Giá Vé
                </h2>
                <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '3px 0 0 0' }}>
                  Lập tờ trình biểu giá vé mới chuyển tiếp lên Tổng Giám Đốc xem xét phê duyệt
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setErrors({});
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR (2 Options) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '8px'
              }}
            >
              <button
                type="button"
                onClick={() => handleSwitchCategoryTab('adjustment')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: proposalCategory === 'adjustment' ? '#ffffff' : 'transparent',
                  color: proposalCategory === 'adjustment' ? '#1e40af' : '#64748b',
                  boxShadow: proposalCategory === 'adjustment' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
                Điều chỉnh giá mùa vụ &amp; phụ thu
              </button>

              <button
                type="button"
                onClick={() => handleSwitchCategoryTab('base_price')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: proposalCategory === 'base_price' ? '#ffffff' : 'transparent',
                  color: proposalCategory === 'base_price' ? '#1e40af' : '#64748b',
                  boxShadow: proposalCategory === 'base_price' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                Thay đổi giá vé cơ sở niêm yết
              </button>
            </div>

            {/* Informational Guideline Banner */}
            {proposalCategory === 'adjustment' ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.72rem',
                  color: '#334155',
                  lineHeight: 1.45
                }}
              >
                <strong>Nghiệp vụ Điều chỉnh mùa vụ:</strong> Áp dụng phụ thu hoặc giảm giá theo tỷ lệ % hoặc mức giá ấn định trong khung thời gian có hạn (dịp Lễ, Tết, cuối tuần, kích cầu...). Sau khi Ban Giám Đốc phê duyệt, hệ thống sẽ tự động kích hoạt quy định phụ thu tương ứng.
              </div>
            ) : (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.72rem',
                  color: '#1e40af',
                  lineHeight: 1.45
                }}
              >
                <strong>Nghiệp vụ Thay đổi giá cơ sở:</strong> Thiết lập lại mức giá vé niêm yết chuẩn (Base Tariff) cho tuyến xe. Sau khi Ban Giám Đốc phê duyệt, hệ thống sẽ cập nhật bảng giá cơ sở và tự động áp giá mới cho toàn bộ các chuyến xe chưa xuất phát kể từ ngày bắt đầu hiệu lực.
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmitProposal} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Error Summary Banner if any errors */}
              {Object.keys(errors).length > 0 && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.72rem',
                    color: '#b91c1c',
                    lineHeight: 1.45
                  }}
                >
                  Dữ liệu nhập chưa hợp lệ ({Object.keys(errors).length} mục cần điều chỉnh). Vui lòng kiểm tra các trường được đánh dấu viền đỏ bên dưới trước khi trình Ban Giám Đốc.
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  Tiêu đề đề xuất *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) clearError('title');
                  }}
                  placeholder={
                    proposalCategory === 'adjustment'
                      ? 'Nhập tiêu đề biên bản (VD: Đề xuất phụ thu 15% dịp Lễ 30/4 tuyến TP.HCM - Đà Lạt)'
                      : 'Nhập tiêu đề biên bản (VD: Điều chỉnh giá vé niêm yết tuyến TP.HCM - Cần Thơ do biến động chi phí vận tải)'
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: errors.title ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    backgroundColor: errors.title ? '#fef2f2' : '#ffffff',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.title && (
                  <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '3px', fontWeight: '500' }}>
                    {errors.title}
                  </div>
                )}
              </div>

              {/* Route & Bus Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Tuyến đường áp dụng *
                  </label>
                  <select
                    value={routeId}
                    onChange={(e) => handleRouteChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: errors.routeId ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: errors.routeId ? '#fef2f2' : '#ffffff',
                      fontSize: '0.78rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {selectableRoutes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name || `${r.startPoint} ➔ ${r.endPoint}`}
                      </option>
                    ))}
                  </select>
                  {errors.routeId && (
                    <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '3px', fontWeight: '500' }}>
                      {errors.routeId}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Loại phương tiện áp dụng
                  </label>
                  <select
                    value={busType}
                    onChange={(e) => handleBusTypeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      background: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="all">Tất cả các hạng xe</option>
                    {busTypes.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Calculation Specification Box */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  border: (errors.proposedPrice || errors.adjustmentPercentage) ? '1.5px solid #fca5a5' : '1px solid #e2e8f0'
                }}
              >
                {/* Current Price Readout */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #e2e8f0',
                    marginBottom: '10px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Giá vé niêm yết hiện hành:</span>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {selectedRouteName} ({busType === 'all' ? 'Toàn bộ hạng xe' : busType})
                    </div>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                    {currentPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Specific Adjustment Options */}
                {proposalCategory === 'adjustment' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                          Phương thức tính toán
                        </label>
                        <select
                          value={proposalType}
                          onChange={(e) => {
                            clearError('adjustmentPercentage');
                            clearError('proposedPrice');
                            setProposalType(e.target.value);
                            if (e.target.value === 'percentage') {
                              handlePercentageChange(adjustmentPercentage || 10);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.75rem',
                            background: '#ffffff',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="percentage">Theo tỷ lệ phần trăm (%)</option>
                          <option value="fixed_price">Ấn định mức giá sau điều chỉnh</option>
                        </select>
                      </div>

                      {proposalType === 'percentage' ? (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                            Tỷ lệ điều chỉnh (+/- %) *
                          </label>
                          <input
                            type="number"
                            value={adjustmentPercentage}
                            onChange={(e) => handlePercentageChange(e.target.value)}
                            placeholder="15"
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              border: errors.adjustmentPercentage ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                              backgroundColor: errors.adjustmentPercentage ? '#fef2f2' : '#ffffff',
                              fontSize: '0.76rem',
                              fontWeight: '700',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          {errors.adjustmentPercentage && (
                            <div style={{ color: '#ef4444', fontSize: '0.68rem', marginTop: '3px', fontWeight: '500' }}>
                              {errors.adjustmentPercentage}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>
                            Biến động tương ứng
                          </label>
                          <div
                            style={{
                              padding: '0.45rem 0.6rem',
                              background: '#ffffff',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              color: adjustmentPercentage >= 0 ? '#15803d' : '#b91c1c'
                            }}
                          >
                            {adjustmentPercentage > 0 ? `+${adjustmentPercentage}%` : `${adjustmentPercentage}%`}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preset Badges */}
                    {proposalType === 'percentage' && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {[5, 10, 15, 20, -10, -15].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handlePercentageChange(pct)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.68rem',
                              fontWeight: '600',
                              borderRadius: '4px',
                              border: `1px solid ${pct > 0 ? '#bbf7d0' : '#fecaca'}`,
                              background: adjustmentPercentage === pct ? (pct > 0 ? '#166534' : '#991b1b') : '#ffffff',
                              color: adjustmentPercentage === pct ? '#ffffff' : (pct > 0 ? '#15803d' : '#b91c1c'),
                              cursor: 'pointer'
                            }}
                          >
                            {pct > 0 ? `+${pct}%` : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Specific Base Price Options */}
                {proposalCategory === 'base_price' && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>Điều chỉnh nhanh:</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        Chênh lệch: <strong>{priceDiff > 0 ? `+${priceDiff.toLocaleString('vi-VN')} đ` : `${priceDiff.toLocaleString('vi-VN')} đ`}</strong> ({adjustmentPercentage > 0 ? `+${adjustmentPercentage}%` : `${adjustmentPercentage}%`})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[10000, 20000, 30000, 50000, -10000, -20000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleProposedPriceChange(currentPrice + amt)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.68rem',
                            fontWeight: '600',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: amt > 0 ? '#1e40af' : '#b91c1c',
                            cursor: 'pointer'
                          }}
                        >
                          {amt > 0 ? `+${amt.toLocaleString('vi-VN')} đ` : `${amt.toLocaleString('vi-VN')} đ`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposed Price Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                    {proposalCategory === 'base_price' ? 'Mức giá vé cơ sở đề xuất mới (VNĐ) *' : 'Giá vé sau điều chỉnh (VNĐ) *'}
                  </label>
                  <input
                    type="number"
                    value={proposedPrice}
                    onChange={(e) => handleProposedPriceChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: errors.proposedPrice ? '1.5px solid #ef4444' : '1.5px solid #1e40af',
                      backgroundColor: errors.proposedPrice ? '#fef2f2' : '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      color: errors.proposedPrice ? '#dc2626' : '#1e40af',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {errors.proposedPrice && (
                    <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '4px', fontWeight: '500' }}>
                      {errors.proposedPrice}
                    </div>
                  )}
                </div>
              </div>

              {/* Effective Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Thời điểm bắt đầu hiệu lực *
                  </label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => {
                      setEffectiveFrom(e.target.value);
                      if (errors.effectiveFrom) clearError('effectiveFrom');
                      if (errors.effectiveTo) clearError('effectiveTo');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: errors.effectiveFrom ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: errors.effectiveFrom ? '#fef2f2' : '#ffffff',
                      fontSize: '0.76rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {errors.effectiveFrom && (
                    <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '3px', fontWeight: '500' }}>
                      {errors.effectiveFrom}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {proposalCategory === 'base_price' ? 'Thời điểm kết thúc (Tùy chọn)' : 'Thời điểm kết thúc *'}
                  </label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => {
                      setEffectiveTo(e.target.value);
                      if (errors.effectiveTo) clearError('effectiveTo');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: errors.effectiveTo ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      backgroundColor: errors.effectiveTo ? '#fef2f2' : '#ffffff',
                      fontSize: '0.76rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {errors.effectiveTo ? (
                    <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '3px', fontWeight: '500' }}>
                      {errors.effectiveTo}
                    </div>
                  ) : (
                    <>
                      {proposalCategory === 'base_price' && !effectiveTo && (
                        <div style={{ fontSize: '0.65rem', color: '#15803d', marginTop: '3px', fontWeight: '600' }}>
                          Để trống = Áp dụng dài hạn cho đến khi có quyết định sửa đổi mới
                        </div>
                      )}
                      {proposalCategory === 'adjustment' && durationDays && (
                        <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '3px', fontWeight: '600' }}>
                          Tổng thời gian áp dụng: {durationDays} ngày
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Reason / Justification */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  Căn cứ &amp; Giải trình thực tế đề xuất *
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (errors.reason) clearError('reason');
                  }}
                  placeholder={
                    proposalCategory === 'adjustment'
                      ? 'Nêu rõ căn cứ thực tế (Lưu lượng khách đặt tại phòng vé tăng cao dịp Lễ, chi phí quay đầu xe rỗng, khảo sát mặt bằng thị trường...)'
                      : 'Nêu rõ căn cứ biến động chi phí vận hành (Giá nhiên liệu, chi phí bến bãi, phí bảo trì phương tiện hoặc nâng cấp chất lượng dịch vụ...)'
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: errors.reason ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    backgroundColor: errors.reason ? '#fef2f2' : '#ffffff',
                    fontSize: '0.78rem',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.reason && (
                  <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '3px', fontWeight: '500' }}>
                    {errors.reason}
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setErrors({});
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.76rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.5rem 1.35rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1e40af',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  {submitting ? 'Đang gửi hồ sơ...' : 'Trình Ban Giám Đốc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketPricingProposalPage;
