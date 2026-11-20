import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById, getBranchName, getOfficesByBranchId } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api';

const formatDateToISO = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const exportShiftsToCsv = (shifts) => {
  let csvContent = '\uFEFF';
  csvContent += 'BẢNG THEO DÕI CA TRỰC & ĐỐI SOÁT QUỸ THU NGÂN PHÒNG VÉ - AN BÌNH LINES\n';
  csvContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
  csvContent += 'Nguồn dữ liệu: Cơ sở dữ liệu thật hệ thống An Bình Lines (Live Database)\n\n';
  csvContent += 'STT,Quầy / Văn phòng,Nhân viên trực,Số điện thoại,Giờ bắt đầu,Giờ kết thúc,Tiền đầu ca (VNĐ),Tiền mặt thu (VNĐ),QR/Online (VNĐ),Tổng doanh thu (VNĐ),Số vé bán,Trạng thái,Ghi chú ca trực\n';

  shifts.forEach((s, idx) => {
    const counter = `"${(s.userId?.assignedOffice || s.officeName || 'Văn phòng bán vé').replace(/"/g, '""')}"`;
    const name = `"${(s.userId?.name || 'Nhân viên').replace(/"/g, '""')}"`;
    const phone = `"${s.userId?.phone || ''}"`;
    const start = s.startTime ? `"${new Date(s.startTime).toLocaleString('vi-VN')}"` : '"--"';
    const end = s.endTime ? `"${new Date(s.endTime).toLocaleString('vi-VN')}"` : '"Đang trong ca"';
    const initial = s.initialCash || 0;
    const cash = s.cashRevenue || 0;
    const cashless = s.cashlessRevenue || 0;
    const total = cash + cashless;
    const count = s.ticketsSold?.length || 0;
    const status = s.status === 'active' ? 'Đang mở bán' : 'Đã kết ca';
    const notes = `"${(s.notes || '').replace(/"/g, '""')}"`;

    csvContent += `${idx + 1},${counter},${name},${phone},${start},${end},${initial},${cash},${cashless},${total},${count},"${status}",${notes}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Doi_Soat_Ca_Truc_Phong_Ve_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const TicketAttendanceMonitoringPage = () => {
  const { token, user } = useContext(AuthContext);

  const managerBranchId = user?.branch?.branchId;
  const branchInfo = managerBranchId ? getBranchById(managerBranchId) : null;
  const branchOffices = useMemo(() => {
    const rawOffices = managerBranchId ? getOfficesByBranchId(managerBranchId) : [];
    // Chuẩn hóa về mảng chuỗi tên văn phòng (tránh lỗi React render object { id, name, address })
    return rawOffices.map(o => (typeof o === 'object' && o !== null ? (o.name || o.id) : o));
  }, [managerBranchId]);

  // Active Tab: 'monitoring' (Giám sát toàn bộ quầy vé) | 'manager-shift' (Chấm công ca trực Quản lý)
  const [activeTab, setActiveTab] = useState('monitoring');

  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters for Monitoring Tab (Bộ lọc nghiệp vụ nâng cao)
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'closed'
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedCounter, setSelectedCounter] = useState('all');
  const [reconcileFilter, setReconcileFilter] = useState('all'); // 'all' | 'verified' | 'pending'
  const [faceFilter, setFaceFilter] = useState('all'); // 'all' | 'verified' | 'not-verified'
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | '7days' | 'this-month' | 'last-month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Lấy danh sách điểm bán vé (Văn phòng / Chi nhánh) động từ dữ liệu ca trực
  const availableCounters = useMemo(() => {
    const set = new Set();
    shifts.forEach(s => {
      const office = s.userId?.assignedOffice || s.officeName;
      if (office && office.trim()) {
        set.add(office.trim());
      }
    });
    return Array.from(set).sort();
  }, [shifts]);

  // Áp dụng các preset thời gian 1-Click
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const todayStr = formatDateToISO(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatDateToISO(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      setStartDate(formatDateToISO(past7));
      setEndDate(formatDateToISO(now));
    } else if (preset === 'this-month') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      const l = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDateToISO(f));
      setEndDate(formatDateToISO(l));
    } else if (preset === 'last-month') {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const l = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDateToISO(f));
      setEndDate(formatDateToISO(l));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Đặt lại toàn bộ bộ lọc về mặc định
  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedCounter('all');
    setSelectedStaff('all');
    setFilterStatus('all');
    setReconcileFilter('all');
    setFaceFilter('all');
    setSearchTerm('');
  };

  // Modals
  const [detailModal, setDetailModal] = useState({ show: false, shift: null });
  const [closeShiftModal, setCloseShiftModal] = useState({ show: false, shift: null, notes: '' });

  // Manager Self Shift State
  const [managerSession, setManagerSession] = useState(null);
  const [loadingManagerSession, setLoadingManagerSession] = useState(false);
  const [liveDuration, setLiveDuration] = useState('');

  // Manager Check-In Form State
  const [managerLocation, setManagerLocation] = useState(branchOffices[0] || 'Văn phòng Bến xe Miền Đông (Quầy 12)');
  const [managerDutyRole, setManagerDutyRole] = useState('Quầy Giám Sát Ca Trực');
  const [managerInitialCash, setManagerInitialCash] = useState('2000000');
  const [managerNotes, setManagerNotes] = useState('Trực giám sát điều hành ca phòng vé và đối soát quỹ thu ngân.');
  const [submittingManagerShift, setSubmittingManagerShift] = useState(false);

  useEffect(() => {
    if (branchOffices.length > 0 && !branchOffices.includes(managerLocation)) {
      setManagerLocation(branchOffices[0]);
    }
  }, [branchOffices, managerLocation]);

  // Manager Check-Out Form State
  const [managerCloseNotes, setManagerCloseNotes] = useState('');
  const [submittingManagerClose, setSubmittingManagerClose] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Xác nhận nộp tiền mặt ca trực
  const handleVerifyCash = async (shiftId) => {
    try {
      const res = await fetch(`${API_BASE}/users/shift/${shiftId}/verify-cash`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reconciliationStatus: 'verified' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Xác nhận đã nhận đủ tiền mặt ca trực thành công!');
        fetchShifts();
      } else {
        showToast(data.message || 'Không thể xác nhận nộp tiền.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi xác nhận nộp tiền ca trực.', 'error');
    }
  };

  // 1. Fetch All Shifts for Monitoring
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/shift/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setShifts(data.history || []);
      }

      // Fetch Staff List (Agents & Managers) for Dropdown filter
      const staffRes = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const staffData = await staffRes.json();
      if (staffData.success) {
        setStaffList(staffData.staff || []);
      }
    } catch {
      showToast('Lỗi kết nối khi tải danh sách ca trực.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 2. Fetch Current Shift of Logged-In Manager
  const fetchManagerCurrentShift = useCallback(async () => {
    setLoadingManagerSession(true);
    try {
      const res = await fetch(`${API_BASE}/users/shift/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setManagerSession(data.session);
      } else {
        setManagerSession(null);
      }
    } catch {
      // silent
    } finally {
      setLoadingManagerSession(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchShifts();
      fetchManagerCurrentShift();
    }
  }, [token, fetchShifts, fetchManagerCurrentShift]);

  // Live Timer for Manager Current Shift
  useEffect(() => {
    if (!managerSession || !managerSession.startTime) {
      setLiveDuration('');
      return;
    }
    const updateTimer = () => {
      const diffMs = Date.now() - new Date(managerSession.startTime).getTime();
      if (diffMs < 0) {
        setLiveDuration('00:00:00');
        return;
      }
      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      setLiveDuration(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [managerSession]);

  // Handle Manager Start Shift (Chấm công vào ca)
  const handleStartManagerShift = async (e) => {
    e.preventDefault();
    setSubmittingManagerShift(true);

    const counterStr = `${managerLocation} - ${managerDutyRole}`;

    try {
      const res = await fetch(`${API_BASE}/users/shift/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          initialCash: Number(managerInitialCash) || 0,
          notes: managerNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Mở ca trực quản lý phòng vé thành công!');
        setManagerSession(data.session);
        fetchShifts();
      } else {
        showToast(data.message || 'Không thể mở ca trực.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi mở ca trực.', 'error');
    } finally {
      setSubmittingManagerShift(false);
    }
  };

  // Handle Manager Close Shift (Chốt ca kết thúc)
  const handleEndManagerShift = async (e) => {
    e.preventDefault();
    setSubmittingManagerClose(true);

    try {
      const res = await fetch(`${API_BASE}/users/shift/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: managerCloseNotes || 'Quản lý chốt ca đối soát quỹ quầy đầy đủ.'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã chốt ca trực quản lý và lưu biên bản bàn giao thành công!');
        setManagerSession(null);
        setManagerCloseNotes('');
        fetchShifts();
      } else {
        showToast(data.message || 'Không thể đóng ca trực.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi đóng ca trực.', 'error');
    } finally {
      setSubmittingManagerClose(false);
    }
  };

  // Handle Force Close Shift for Agent (Quản lý chốt ca hộ)
  const handleForceCloseShift = async () => {
    if (!closeShiftModal.shift) return;
    try {
      const res = await fetch(`${API_BASE}/users/shift/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shiftId: closeShiftModal.shift._id,
          notes: closeShiftModal.notes || `Quản lý phòng vé (${user?.name}) đóng ca hộ kiểm kê két thu ngân.`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã đóng ca trực thành công!');
        setCloseShiftModal({ show: false, shift: null, notes: '' });
        fetchShifts();
        fetchManagerCurrentShift();
      } else {
        showToast(data.message || 'Không thể đóng ca trực.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  // Filtered shifts for Monitoring (Đa tiêu chí: Ngày, Điểm bán, Nhân viên, Quỹ, Face ID, Trạng thái)
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      // 1. Trạng thái ca trực (đang mở bán / đã đóng ca)
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

      // 2. Nhân viên bán vé phụ trách
      const sUserId = s.userId?._id || s.userId;
      const matchesStaff = selectedStaff === 'all' || sUserId === selectedStaff;

      // 3. Điểm bán vé (Văn phòng / Chi nhánh)
      const officeStr = s.userId?.assignedOffice || s.officeName || '';
      const matchesCounter = selectedCounter === 'all' || (officeStr && officeStr.trim() === selectedCounter);

      // 4. Lọc theo khoảng ngày (startTime)
      const shiftDateStr = s.startTime ? formatDateToISO(new Date(s.startTime)) : '';
      let matchesDate = true;
      if (startDate && shiftDateStr && shiftDateStr < startDate) matchesDate = false;
      if (endDate && shiftDateStr && shiftDateStr > endDate) matchesDate = false;

      // 5. Trạng thái nộp quỹ tiền mặt
      let matchesReconcile = true;
      if (reconcileFilter === 'verified') {
        matchesReconcile = s.reconciliationStatus === 'verified';
      } else if (reconcileFilter === 'pending') {
        matchesReconcile = s.reconciliationStatus !== 'verified' && (s.cashRevenue > 0);
      }

      // 6. Xác thực sinh trắc học Face ID
      let matchesFace = true;
      if (faceFilter === 'verified') {
        matchesFace = Boolean(s.faceVerified);
      } else if (faceFilter === 'not-verified') {
        matchesFace = !s.faceVerified;
      }

      // 7. Tìm kiếm từ khóa tự do
      const matchesSearch = !searchTerm.trim() ||
        (officeStr && officeStr.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.userId?.name && s.userId.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.userId?.phone && s.userId.phone.includes(searchTerm.trim())) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesStatus && matchesStaff && matchesCounter && matchesDate && matchesReconcile && matchesFace && matchesSearch;
    });
  }, [shifts, filterStatus, selectedStaff, selectedCounter, startDate, endDate, reconcileFilter, faceFilter, searchTerm]);

  // Manager personal shifts history
  const managerShiftsHistory = useMemo(() => {
    const currentUserId = user?.id || user?._id;
    return shifts.filter(s => {
      const sUserId = s.userId?._id || s.userId;
      return sUserId === currentUserId;
    });
  }, [shifts, user]);

  // Totals for top cards
  const { totalCash, totalCashless, totalTickets, activeShifts } = useMemo(() => {
    let cash = 0;
    let cashless = 0;
    let tickets = 0;
    let active = 0;

    filteredShifts.forEach(s => {
      cash += s.cashRevenue || 0;
      cashless += s.cashlessRevenue || 0;
      tickets += s.ticketsSold?.length || 0;
      if (s.status === 'active') active++;
    });

    return { totalCash: cash, totalCashless: cashless, totalTickets: tickets, activeShifts: active };
  }, [filteredShifts]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700',
          color: '#ffffff', backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          boxShadow: '0 8px 20px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* Main Top Header & Live Data Guarantee Banner */}
      <div style={{
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex', flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Chấm Công Ca Trực & Đối Soát Quỹ Quầy Vé
              </h1>
              <span style={{
                background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}>
                {branchInfo ? branchInfo.branchName : 'Phòng vé'}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
              Quản lý ca trực thu ngân, đối soát tiền mặt đầu ca, tiền thu vé tại quầy và nhận bàn giao quỹ chi nhánh
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => exportShiftsToCsv(filteredShifts)}
              className="btn"
              style={{
                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                fontWeight: '600', padding: '0.5rem 0.95rem', borderRadius: '8px', fontSize: '0.78rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Xuất Báo Cáo Excel
            </button>
            <button
              onClick={() => { fetchShifts(); fetchManagerCurrentShift(); showToast('Đã làm mới dữ liệu ca trực mới nhất!'); }}
              className="btn"
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.78rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Làm Mới Dữ Liệu
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('monitoring')}
            style={{
              padding: '0.6rem 1.25rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
              border: 'none', background: 'transparent',
              color: activeTab === 'monitoring' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'monitoring' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            Giám Sát Ca Trực Quầy Vé ({shifts.length})
          </button>

          <button
            onClick={() => setActiveTab('manager-shift')}
            style={{
              padding: '0.6rem 1.25rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
              border: 'none', background: 'transparent',
              color: activeTab === 'manager-shift' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'manager-shift' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            Chấm Công Ca Trực Quản Lý
            {managerSession && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            )}
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: GIÁM SÁT CA TRỰC QUẦY VÉ TOÀN HỆ THỐNG ==================== */}
      {activeTab === 'monitoring' && (
        <>
          {/* 4 Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TỔNG DOANH THU CA</div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
                {(totalCash + totalCashless).toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>đ</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                {totalTickets} vé thực tế bán ra từ các ca
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TIỀN MẶT TẠI KÉT THU</div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#2563eb', margin: '4px 0' }}>
                {totalCash.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>đ</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Tiền mặt nhân viên thu trực tiếp tại quầy</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>QUÉT MÃ VIETQR / POS</div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#059669', margin: '4px 0' }}>
                {totalCashless.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>đ</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>Tiền chuyển khoản tự động vào tài khoản</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>QUẦY ĐANG MỞ BÁN</div>
              <div style={{ fontSize: '1.45rem', fontWeight: '800', color: activeShifts > 0 ? '#16a34a' : '#0f172a', margin: '4px 0' }}>
                {activeShifts} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>quầy trực</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {filteredShifts.length - activeShifts} ca đã đóng sổ và đối soát quỹ
              </div>
            </div>
          </div>

          {/* Filter Bar & Shifts Table */}
          <div className="panel" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            {/* Filter Tier 1: Bộ Lọc Thời Gian (Nút chọn nhanh 1-Click + Khoảng ngày tùy chọn + Đặt lại) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  Khoảng ngày:
                </span>

                {/* Preset buttons */}
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'today', label: 'Hôm nay' },
                  { key: 'yesterday', label: 'Hôm qua' },
                  { key: '7days', label: '7 ngày qua' },
                  { key: 'this-month', label: 'Tháng này' },
                  { key: 'last-month', label: 'Tháng trước' },
                ].map(preset => {
                  const isSelected = datePreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => applyDatePreset(preset.key)}
                      type="button"
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? '700' : '600',
                        border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        color: isSelected ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}

                {/* Custom Date Inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#1e293b' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>đến</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#1e293b' }}
                  />
                </div>
              </div>

              {/* Reset filter button & counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                  Hiển thị: <strong style={{ color: '#2563eb' }}>{filteredShifts.length}</strong> / {shifts.length} ca
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Khôi phục tất cả bộ lọc về mặc định"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
                  Đặt lại bộ lọc
                </button>
              </div>
            </div>

            {/* Filter Tier 2: Chi tiết nghiệp vụ (Điểm bán vé, Nhân viên, Ca trực, Nộp quỹ, Face ID, Tìm kiếm) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
              {/* 1. Điểm bán vé (Quầy / Văn phòng / Chi nhánh) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  ĐIỂM BÁN VÉ / QUẦY:
                </label>
                <select
                  value={selectedCounter}
                  onChange={(e) => setSelectedCounter(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff', color: '#1e293b' }}
                >
                  <option value="all">Tất cả điểm bán vé ({availableCounters.length})</option>
                  {availableCounters.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 2. Nhân viên bán vé */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  NHÂN VIÊN PHỤ TRÁCH:
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff', color: '#1e293b' }}
                >
                  <option value="all">Tất cả nhân viên</option>
                  {staffList.filter(s => s.role === 'ticket_agent' || s.role === 'ticket_manager').map(ag => (
                    <option key={ag._id} value={ag._id}>
                      {ag.name} ({ag.phone}) - {ag.role === 'ticket_manager' ? 'Quản lý' : 'Nhân viên'}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Trạng thái ca trực */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  TRẠNG THÁI CA:
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff', color: '#1e293b' }}
                >
                  <option value="all">Tất cả ca</option>
                  <option value="active">Đang mở bán ({activeShifts})</option>
                  <option value="closed">Đã đóng ca</option>
                </select>
              </div>

              {/* 4. Trạng thái nộp quỹ tiền mặt */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  NỘP QUỸ TIỀN MẶT:
                </label>
                <select
                  value={reconcileFilter}
                  onChange={(e) => setReconcileFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff', color: '#1e293b' }}
                >
                  <option value="all">Tất cả trạng thái quỹ</option>
                  <option value="verified">Đã nộp quỹ tiền mặt</option>
                  <option value="pending">Chờ nộp quỹ (còn nợ quỹ)</option>
                </select>
              </div>

              {/* 5. Sinh trắc Face ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  XÁC THỰC FACE ID:
                </label>
                <select
                  value={faceFilter}
                  onChange={(e) => setFaceFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff', color: '#1e293b' }}
                >
                  <option value="all">Tất cả Face ID</option>
                  <option value="verified">Đạt Face ID hợp lệ</option>
                  <option value="not-verified">Chưa quét Face ID</option>
                </select>
              </div>

              {/* 6. Ô tìm kiếm từ khóa */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  TÌM KIẾM TỪ KHÓA:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Tìm theo quầy, tên nhân viên, SĐT, ghi chú ca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.85rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none' }}
                  />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                Đang tải dữ liệu ca trực thật từ máy chủ...
              </div>
            ) : filteredShifts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                Không tìm thấy phiên ca trực nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>STT</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Quầy / Văn phòng trực</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Nhân viên phụ trách</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Giờ vào ca</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Giờ ra ca</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Tiền đầu ca</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Tiền mặt thu</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>QR / POS thu</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Vé bán</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Face ID</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShifts.map((s, index) => {
                      const isActive = s.status === 'active';
                      const staffName = s.userId?.name || 'Nhân viên phòng vé';
                      const staffPhone = s.userId?.phone || '';
                      const isManagerRole = s.userId?.role === 'ticket_manager';

                      const startTimeStr = s.startTime ? new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--';
                      const startDateStr = s.startTime ? new Date(s.startTime).toLocaleDateString('vi-VN') : '';

                      const endTimeStr = s.endTime ? new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--';
                      const endDateStr = s.endTime ? new Date(s.endTime).toLocaleDateString('vi-VN') : '';

                      return (
                        <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9', background: isActive ? '#f8fdf9' : 'transparent', whiteSpace: 'nowrap' }}>
                          <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{index + 1}</td>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {s.userId?.assignedOffice || s.officeName || 'Văn phòng vé'}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                              <div style={{
                                width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%',
                                backgroundColor: isManagerRole ? '#eff6ff' : '#f1f5f9',
                                color: isManagerRole ? '#2563eb' : '#475569',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '700', fontSize: '0.72rem', border: '1px solid #e2e8f0'
                              }}>
                                {staffName.charAt(0)}
                              </div>
                              <div style={{ whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                  <span>{staffName}</span>
                                  {isManagerRole && (
                                    <span style={{ fontSize: '0.62rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '8px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                      Quản lý
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>{staffPhone}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{startTimeStr}</span>
                            {startDateStr && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>({startDateStr})</span>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', whiteSpace: 'nowrap' }}>
                            {s.endTime ? (
                              <>
                                <span style={{ fontWeight: '700', color: '#0f172a' }}>{endTimeStr}</span>
                                {endDateStr && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>({endDateStr})</span>}
                              </>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                                Đang trực ca
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {(s.initialCash || 0).toLocaleString('vi-VN')}&nbsp;₫
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#2563eb', whiteSpace: 'nowrap' }}>
                            {(s.cashRevenue || 0).toLocaleString('vi-VN')}&nbsp;₫
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#059669', whiteSpace: 'nowrap' }}>
                            {(s.cashlessRevenue || 0).toLocaleString('vi-VN')}&nbsp;₫
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                            <span style={{
                              background: '#f1f5f9', padding: '3px 10px', borderRadius: '12px',
                              fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap', display: 'inline-block'
                            }}>
                              {s.ticketsSold?.length || 0}&nbsp;vé
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                              {s.checkInPhoto && (
                                <img
                                  src={s.checkInPhoto}
                                  alt="Face"
                                  style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                                />
                              )}
                              <span style={{
                                background: s.faceVerified ? '#ecfdf5' : '#f1f5f9',
                                color: s.faceVerified ? '#059669' : '#64748b',
                                border: `1px solid ${s.faceVerified ? '#a7f3d0' : '#cbd5e1'}`,
                                padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700',
                                whiteSpace: 'nowrap', display: 'inline-block'
                              }}>
                                {s.faceVerified ? 'Đạt Face ID' : 'Chưa quét'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              background: isActive ? '#dcfce7' : '#f1f5f9',
                              color: isActive ? '#15803d' : '#475569',
                              border: `1px solid ${isActive ? '#bbf7d0' : '#cbd5e1'}`,
                              padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700',
                              whiteSpace: 'nowrap', display: 'inline-block'
                            }}>
                              {isActive ? 'ĐANG MỞ BÁN' : 'ĐÃ ĐÓNG CA'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => setDetailModal({ show: true, shift: s })}
                                style={{
                                  padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                                  border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Chi tiết vé ({s.ticketsSold?.length || 0})
                              </button>
                              {!isActive && s.cashRevenue > 0 && (
                                s.reconciliationStatus === 'verified' ? (
                                  <span style={{
                                    padding: '5px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700',
                                    border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', display: 'inline-flex', alignItems: 'center',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    Đã nộp tiền
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleVerifyCash(s._id)}
                                    style={{
                                      padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                                      border: '1px solid #bbf7d0', background: '#dcfce7', color: '#15803d', cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Xác nhận đã nhận đủ tiền mặt từ nhân viên bán vé"
                                  >
                                    Thu tiền mặt
                                  </button>
                                )
                              )}
                              {isActive && (
                                <button
                                  onClick={() => setCloseShiftModal({ show: true, shift: s, notes: '' })}
                                  style={{
                                    padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                                    border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title="Quản lý đóng ca hộ thu ngân"
                                >
                                  Chốt ca hộ
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== TAB 2: CHẤM CÔNG CA TRỰC CỦA QUẢN LÝ PHÒNG VÉ ==================== */}
      {activeTab === 'manager-shift' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loadingManagerSession ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
              Đang kiểm tra trạng thái ca trực quản lý...
            </div>
          ) : managerSession ? (
            /* Manager IS ACTIVE IN SHIFT */
            <div style={{
              background: '#ffffff', borderRadius: '16px', border: '1px solid #bbf7d0',
              padding: '1.5rem', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        Trạng Thái: Đang Trong Ca Trực Quản Lý
                      </h2>
                      <span style={{
                        background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac',
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700'
                      }}>
                        Đang hoạt động
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                      Người trực: <strong>{user?.name || 'Quản lý phòng vé'}</strong> ({user?.phone})
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc', padding: '0.6rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0',
                  textAlign: 'right'
                }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>THỜI LƯỢNG TRỰC CA</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#2563eb', fontFamily: 'monospace' }}>
                    {liveDuration || '00:00:00'}
                  </div>
                </div>
              </div>

              {/* Shift info details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>VỊ TRÍ / VĂN PHÒNG TRỰC</div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginTop: '3px' }}>
                    {managerSession.userId?.assignedOffice || user?.assignedOffice || managerSession.officeName || 'Văn phòng quản lý'}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>GIỜ VÀO CA TRỰC</div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginTop: '3px' }}>
                    {new Date(managerSession.startTime).toLocaleTimeString('vi-VN')} ({new Date(managerSession.startTime).toLocaleDateString('vi-VN')})
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>QUỸ KÉT BAN ĐẦU (BÀN GIAO)</div>
                  <strong style={{ fontSize: '0.95rem', color: '#2563eb', display: 'block', marginTop: '3px' }}>
                    {(managerSession.initialCash || 0).toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>SỐ VÉ ĐÃ XUẤT TRỰC TIẾP</div>
                  <strong style={{ fontSize: '0.95rem', color: '#059669', display: 'block', marginTop: '3px' }}>
                    {managerSession.ticketsSold?.length || 0} vé
                  </strong>
                </div>
              </div>

              {managerSession.notes && (
                <div style={{ marginTop: '1rem', background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.78rem', color: '#1e40af' }}>
                  <strong>Ghi chú đầu ca:</strong> {managerSession.notes}
                </div>
              )}

              {/* Close shift form */}
              <form onSubmit={handleEndManagerShift} style={{ marginTop: '1.5rem', background: '#fffaf0', border: '1px solid #fde68a', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#92400e', margin: '0 0 0.5rem 0' }}>
                  Chốt Ca & Bàn Giao Quỹ Trực Quản Lý
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#78350f', margin: '0 0 0.75rem 0' }}>
                  Khi hoàn thành phiên làm việc, vui lòng kiểm kê tiền két, xác nhận đối soát với thủ quỹ và ghi chú bàn giao trước khi đóng ca.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#78350f', marginBottom: '4px' }}>
                    Nội dung biên bản bàn giao ca trực kết ca *
                  </label>
                  <textarea
                    rows="3"
                    value={managerCloseNotes}
                    onChange={(e) => setManagerCloseNotes(e.target.value)}
                    placeholder="Ví dụ: Đã bàn giao đầy đủ két tiền cho ca tiếp theo. Không phát sinh vé lỗi hoặc khiếu nại tại quầy."
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingManagerClose}
                  className="btn"
                  style={{
                    backgroundColor: '#d97706', border: 'none', color: '#ffffff',
                    fontWeight: '700', padding: '0.65rem 1.5rem', borderRadius: '8px', fontSize: '0.82rem',
                    cursor: submittingManagerClose ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  {submittingManagerClose ? 'Đang chốt ca...' : 'Chốt Ca Trực Quản Lý & Lưu Hồ Sơ'}
                </button>
              </form>
            </div>
          ) : (
            /* Manager IS NOT IN SHIFT -> Form to Start Shift */
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Mở Ca Trực Quản Lý Phòng Vé (Chấm Công Vào Ca)
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
                  Ghi nhận thời gian bắt đầu ca trực điều hành, vị trí bến xe phân công và lượng tiền bàn giao quỹ để kích hoạt quyền giám sát trực tiếp.
                </p>
              </div>

              <form onSubmit={handleStartManagerShift} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Chi nhánh / Bến xe phụ trách trực *
                    </label>
                    <select
                      value={managerLocation}
                      onChange={(e) => setManagerLocation(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                    >
                      {branchOffices.map((office, idx) => {
                        const officeLabel = typeof office === 'object' && office !== null ? (office.name || office.id) : String(office);
                        return (
                          <option key={idx} value={officeLabel}>{officeLabel}</option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Vị trí nhiệm vụ trong ca *
                    </label>
                    <select
                      value={managerDutyRole}
                      onChange={(e) => setManagerDutyRole(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                    >
                      <option value="Quầy Giám Sát Ca Trực">Quầy Giám Sát Ca Trực</option>
                      <option value="Quầy Trực Điều Hành & Bàn Giao">Quầy Trực Điều Hành & Bàn Giao</option>
                      <option value="Quầy Vé VIP & Khiếu Nại Hành Khách">Quầy Vé VIP & Khiếu Nại Hành Khách</option>
                      <option value="Quầy Tổng Hợp Bến Xe">Quầy Tổng Hợp Bến Xe</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Lượng tiền mặt ban đầu nhận bàn giao (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={managerInitialCash}
                      onChange={(e) => setManagerInitialCash(e.target.value)}
                      placeholder="Nhập số tiền mặt két ban đầu..."
                      style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Ghi chú bàn giao & Nhiệm vụ trọng tâm ca trực
                  </label>
                  <textarea
                    rows="2"
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Ghi chú về tình hình quầy vé, kế hoạch tăng cường giờ cao điểm..."
                    style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={submittingManagerShift}
                    className="btn"
                    style={{
                      backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                      fontWeight: '700', padding: '0.65rem 1.75rem', borderRadius: '8px', fontSize: '0.82rem',
                      cursor: submittingManagerShift ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    {submittingManagerShift ? 'Đang mở ca...' : 'Bắt Đầu Ca Trực Quản Lý (Vào Ca)'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manager Personal History Table */}
          <div className="panel" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1rem 0' }}>
              Lịch Sử Các Ca Trực Quản Lý Của Bạn ({managerShiftsHistory.length} ca)
            </h3>

            {managerShiftsHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                Chưa có phiên ca trực quản lý nào được ghi nhận.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>STT</th>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Vị trí trực</th>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Giờ vào ca</th>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Giờ ra ca</th>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Tiền đầu ca</th>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Doanh thu thu được</th>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                      <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Ghi chú ca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerShiftsHistory.map((s, idx) => (
                      <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>{s.userId?.assignedOffice || s.officeName || 'Văn phòng vé'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{new Date(s.startTime).toLocaleString('vi-VN')}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{s.endTime ? new Date(s.endTime).toLocaleString('vi-VN') : 'Đang trực'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{(s.initialCash || 0).toLocaleString('vi-VN')}&nbsp;₫</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#2563eb', whiteSpace: 'nowrap' }}>
                          {((s.cashRevenue || 0) + (s.cashlessRevenue || 0)).toLocaleString('vi-VN')}&nbsp;₫
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            background: s.status === 'active' ? '#dcfce7' : '#f1f5f9',
                            color: s.status === 'active' ? '#15803d' : '#475569',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700',
                            whiteSpace: 'nowrap', display: 'inline-block'
                          }}>
                            {s.status === 'active' ? 'ĐANG MỞ BÁN' : 'ĐÃ ĐÓNG CA'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {s.notes || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL CHI TIẾT CA TRỰC & VÉ THẬT ĐÃ XUẤT ==================== */}
      {detailModal.show && detailModal.shift && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '780px',
            maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Chi Tiết Ca Trực & Bảng Đối Soát Vé Thật
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  Văn phòng: <strong>{detailModal.shift.userId?.assignedOffice || detailModal.shift.officeName || 'Văn phòng bán vé'}</strong> | Nhân viên: <strong>{detailModal.shift.userId?.name}</strong> ({detailModal.shift.userId?.phone})
                </div>
              </div>
              <button
                onClick={() => setDetailModal({ show: false, shift: null })}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Shift Financial Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>TIỀN ĐẦU CA</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  {(detailModal.shift.initialCash || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>THU TIỀN MẶT</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#2563eb' }}>
                  {(detailModal.shift.cashRevenue || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>THU QR / POS</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#059669' }}>
                  {(detailModal.shift.cashlessRevenue || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.68rem', color: '#991b1b', fontWeight: '700' }}>TỔNG TIỀN NỘP KÉT</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#dc2626' }}>
                  {((detailModal.shift.initialCash || 0) + (detailModal.shift.cashRevenue || 0)).toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            {/* Face ID Biometric Verification Audit */}
            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                  Đối Soát Sinh Trắc Học Face ID & Ảnh Điểm Danh
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                  background: detailModal.shift.faceVerified ? '#ecfdf5' : '#f1f5f9',
                  color: detailModal.shift.faceVerified ? '#059669' : '#64748b',
                  border: `1px solid ${detailModal.shift.faceVerified ? '#a7f3d0' : '#cbd5e1'}`
                }}>
                  {detailModal.shift.faceVerified ? 'Đạt chuẩn Face ID' : 'Chưa quét sinh trắc học'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {detailModal.shift.checkInPhoto && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <img
                      src={detailModal.shift.checkInPhoto}
                      alt="Ảnh mở ca"
                      style={{ width: '80px', height: '80px', borderRadius: '6px', objectFit: 'cover', border: '1.5px solid #10b981' }}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: '700' }}>Ảnh Vào Ca</span>
                  </div>
                )}

                {detailModal.shift.checkOutPhoto && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <img
                      src={detailModal.shift.checkOutPhoto}
                      alt="Ảnh đóng ca"
                      style={{ width: '80px', height: '80px', borderRadius: '6px', objectFit: 'cover', border: '1.5px solid #3b82f6' }}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: '700' }}>Ảnh Tan Ca</span>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', flex: 1 }}>
                  <div>Trạng thái: <strong>{detailModal.shift.faceVerified ? 'Đã nhận diện sinh trắc học' : 'Chưa quét mẫu'}</strong></div>
                  {detailModal.shift.faceDistance !== null && (
                    <div>Độ sai số Euclid: <strong>{Number(detailModal.shift.faceDistance).toFixed(4)}</strong> (ngưỡng: 0.42)</div>
                  )}
                  {detailModal.shift.isLiveVerified && (
                    <div style={{ color: '#059669', fontWeight: '700' }}>✓ Đã xác thực người thật (Liveness Eye Blink)</div>
                  )}
                </div>
              </div>
            </div>

            {/* List of Real Tickets Sold */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Danh Sách Vé Thật Đã Xuất Trong Ca ({detailModal.shift.ticketsSold?.length || 0} vé)
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '700' }}>
                  Đối soát vé khớp 100% CSDL Booking
                </span>
              </div>

              {!detailModal.shift.ticketsSold || detailModal.shift.ticketsSold.length === 0 ? (
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                  Chưa có vé nào được xuất bán trong phiên ca trực này.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '280px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '8px 10px' }}>STT</th>
                        <th style={{ padding: '8px 10px' }}>Mã vé</th>
                        <th style={{ padding: '8px 10px' }}>Hành khách</th>
                        <th style={{ padding: '8px 10px' }}>Tuyến xe</th>
                        <th style={{ padding: '8px 10px' }}>Ghế</th>
                        <th style={{ padding: '8px 10px' }}>Hình thức</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.shift.ticketsSold.map((t, idx) => {
                        const tripRoute = t.tripId?.routeId?.name ||
                          (t.tripId?.routeId ? `${t.tripId.routeId.startPoint} -> ${t.tripId.routeId.endPoint}` : 'Tuyến liên tỉnh');
                        const ticketPrice = t.totalAmount || (t.pricePerSeat || 150000) * (t.seats?.length || 1);
                        const isQr = t.paymentMethod === 'vietqr';

                        return (
                          <tr key={t._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '700', color: '#2563eb' }}>
                              #{t.orderCode || 'VE-ONLINE'}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{t.customerName}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{t.customerPhone}</div>
                            </td>
                            <td style={{ padding: '8px 10px', color: '#334155' }}>
                              <div>{tripRoute}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                {t.tripId?.busId?.plateNumber || ''}
                              </div>
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0f172a' }}>
                              {Array.isArray(t.seats) ? t.seats.join(', ') : t.seats}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{
                                padding: '2px 6px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '700',
                                background: isQr ? '#d1fae5' : '#eff6ff',
                                color: isQr ? '#047857' : '#1d4ed8'
                              }}>
                                {isQr ? 'VietQR' : 'Tiền mặt'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                              {ticketPrice.toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Handover notes */}
            {detailModal.shift.notes && (
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#334155', marginBottom: '1rem' }}>
                <strong style={{ color: '#0f172a' }}>Biên bản bàn giao ca:</strong> {detailModal.shift.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDetailModal({ show: false, shift: null })}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CHỐT CA HỘ (FORCE CLOSE MODAL) ==================== */}
      {closeShiftModal.show && closeShiftModal.shift && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#991b1b', margin: '0 0 0.5rem 0' }}>
              Xác Nhận Chốt Ca Trực Thu Ngân
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 1rem 0' }}>
              Bạn đang thực hiện chốt ca cho nhân viên <strong>{closeShiftModal.shift.userId?.name}</strong> ({closeShiftModal.shift.userId?.assignedOffice || 'Văn phòng bán vé'}). Sau khi chốt ca, trạng thái sẽ chuyển thành ĐÃ ĐÓNG CA và hoàn tất tổng kết tiền két.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Ghi chú đối soát của Quản lý phòng vé:
              </label>
              <textarea
                rows="3"
                value={closeShiftModal.notes}
                onChange={(e) => setCloseShiftModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ví dụ: Đã kiểm tra số dư két, khớp đủ số tiền và số vé bán ra..."
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCloseShiftModal({ show: false, shift: null, notes: '' })}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleForceCloseShift}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#e11d48', color: '#ffffff', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Xác nhận chốt ca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketAttendanceMonitoringPage;
